from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
from PIL import Image
import requests
from io import BytesIO
import logging
import os
import gc
import base64
import json
from geocodio import Geocodio
from openai import OpenAI

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max request size

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GEOCODIO_API_KEY = os.environ.get('GEOCODIO_API_KEY')
geocodio_client = Geocodio(GEOCODIO_API_KEY) if GEOCODIO_API_KEY else None
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Log configuration status at startup
logger.info(f"Geocodio configured: {geocodio_client is not None}")
logger.info(f"OpenAI configured: {openai_client is not None}")


def geocode_address(address):
    """Geocode an address to lat/lng coordinates."""
    try:
        if not address:
            logger.warning("Geocoding skipped: no address provided")
            return None
        if geocodio_client is None:
            logger.warning("Geocoding skipped: GEOCODIO_API_KEY not configured")
            return None
        res = geocodio_client.geocode(address)
        logger.info(f"Geocodio raw response type: {type(res)}")
        logger.info(f"Geocodio raw response: {res}")
        if not res:
            logger.warning("Geocodio returned empty response")
            return None
        
        # Handle dict response (direct API response)
        if isinstance(res, dict):
            results = res.get('results', [])
        else:
            # Handle object response from pygeocodio
            results = getattr(res, 'results', None)
            if results is None and hasattr(res, 'get'):
                results = res.get('results', [])
        
        logger.info(f"Parsed results: {results}")
        if not results or len(results) == 0:
            logger.warning("Geocodio returned no results")
            return None
        
        first_result = results[0]
        logger.info(f"First result type: {type(first_result)}, value: {first_result}")
        
        # Extract location from first result
        if isinstance(first_result, dict):
            loc = first_result.get('location', {})
        elif hasattr(first_result, 'location'):
            loc = first_result.location
        else:
            logger.warning(f"Cannot extract location from result: {first_result}")
            return None
        
        logger.info(f"Location: {loc}")
        
        # Extract lat/lng from location
        if isinstance(loc, dict):
            lat, lng = loc.get('lat'), loc.get('lng')
        elif hasattr(loc, 'lat'):
            lat, lng = loc.lat, loc.lng
        else:
            logger.warning(f"Cannot extract lat/lng from location: {loc}")
            return None
        
        if lat is None or lng is None:
            logger.warning(f"Lat or lng is None: lat={lat}, lng={lng}")
            return None
        return {'lat': float(lat), 'lng': float(lng)}
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return None


def download_image(url, max_dimension=2048):
    """Download image from URL, resize if needed, and convert to numpy array."""
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        
        if max(image.size) > max_dimension:
            ratio = max_dimension / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Resized image to {new_size}")
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return np.array(image)
    except Exception as e:
        logger.error(f"Error downloading image from {url}: {e}")
        return None


def match_faces(selfie, id_photo, high_accuracy=True):
    """Compare faces in selfie and ID photo using face_recognition library."""
    try:
        model = 'large' if high_accuracy else 'small'
        num_jitters = 5 if high_accuracy else 1
        
        logger.info(f"Face encoding with model={model}, num_jitters={num_jitters}")
        
        selfie_locations = face_recognition.face_locations(selfie, model='hog')
        id_locations = face_recognition.face_locations(id_photo, model='hog')
        
        if len(selfie_locations) == 0:
            return {'success': False, 'reason': 'No face detected in selfie'}
        
        if len(id_locations) == 0:
            return {'success': False, 'reason': 'No face detected in ID photo'}
        
        if len(selfie_locations) > 1:
            return {'success': False, 'reason': 'Multiple faces detected in selfie'}
        
        selfie_encodings = face_recognition.face_encodings(
            selfie, 
            known_face_locations=selfie_locations,
            num_jitters=num_jitters,
            model=model
        )
        id_encodings = face_recognition.face_encodings(
            id_photo, 
            known_face_locations=id_locations,
            num_jitters=num_jitters,
            model=model
        )
        
        if len(selfie_encodings) == 0 or len(id_encodings) == 0:
            return {'success': False, 'reason': 'Failed to encode detected faces'}
        
        face_distance = face_recognition.face_distance(id_encodings, selfie_encodings[0])
        match_score = 1.0 - float(face_distance[0])
        
        return {
            'success': True,
            'match_score': round(match_score, 3),
            'reason': 'Faces compared successfully',
            'accuracy_mode': 'high' if high_accuracy else 'standard'
        }
        
    except Exception as e:
        logger.error(f"Face matching error: {e}")
        return {'success': False, 'reason': f'Face matching error: {str(e)}'}


def extract_id_info_with_openai(id_image, id_type='drivers_license'):
    """Extract ID information using OpenAI Vision API.
    
    This handles all ID types (driver's license, passport, medical card) reliably
    using GPT-4 Vision instead of traditional OCR.
    """
    if not openai_client:
        logger.error("OpenAI client not initialized - missing API key")
        return {
            'success': False,
            'first_name': None,
            'last_name': None,
            'address': None,
            'confidence': 0.0,
            'error': 'OpenAI API key not configured'
        }
    
    try:
        # Convert numpy array to PIL Image if needed
        if isinstance(id_image, np.ndarray):
            pil_image = Image.fromarray(id_image)
        else:
            pil_image = id_image
        
        # Convert image to base64
        buffered = BytesIO()
        pil_image.save(buffered, format="JPEG", quality=95)
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Build prompt based on ID type
        if id_type == 'medical_card':
            prompt = """Analyze this Quebec Health Insurance Card (RAMQ card) image.
Extract the following information and return it as JSON:
{
    "first_name": "the person's first name (prénom)",
    "last_name": "the person's last name (nom de famille)",
    "birth_date": "date of birth in YYYY-MM-DD format if visible",
    "sex": "M or F if visible",
    "expiration": "expiration date in YYYY-MM format if visible",
    "nam": "the health insurance number (XXXX 0000 0000 format) if visible"
}
The name appears below "PRÉNOM ET NOM À LA NAISSANCE" on the card.
Return ONLY the JSON object, no other text."""

        elif id_type == 'passport':
            prompt = """Analyze this Canadian Passport image.
Extract the following information and return it as JSON:
{
    "first_name": "the person's first/given name",
    "last_name": "the person's surname/family name",
    "birth_date": "date of birth in YYYY-MM-DD format if visible",
    "sex": "M or F if visible",
    "expiration": "expiration date in YYYY-MM-DD format if visible",
    "passport_number": "passport number if visible"
}
Return ONLY the JSON object, no other text."""

        else:  # drivers_license
            prompt = """Analyze this Quebec Driver's License image.
Extract the following information and return it as JSON:
{
    "first_name": "the person's first name (prénom)",
    "last_name": "the person's last name (nom de famille)",
    "birth_date": "date of birth in YYYY-MM-DD format if visible",
    "sex": "M or F if visible",
    "address_line1": "street address if visible",
    "address_city": "city if visible",
    "address_postal": "postal code if visible",
    "license_number": "license number if visible"
}
Return ONLY the JSON object, no other text."""

        logger.info(f"Calling OpenAI Vision API for {id_type}")
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        # Parse the response
        response_text = response.choices[0].message.content.strip()
        logger.info(f"OpenAI response: {response_text}")
        
        # Clean up response - remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        # Parse JSON
        extracted_data = json.loads(response_text)
        
        first_name = extracted_data.get('first_name')
        last_name = extracted_data.get('last_name')
        
        # Normalize names to uppercase
        if first_name:
            first_name = first_name.upper()
        if last_name:
            last_name = last_name.upper()
        
        # Build full address for driver's license
        full_address = None
        if id_type == 'drivers_license':
            address_parts = []
            if extracted_data.get('address_line1'):
                address_parts.append(extracted_data['address_line1'])
            if extracted_data.get('address_city'):
                address_parts.append(extracted_data['address_city'])
            if extracted_data.get('address_postal'):
                address_parts.append(extracted_data['address_postal'])
            if address_parts:
                full_address = ', '.join(address_parts)
        
        return {
            'success': bool(first_name and last_name),
            'first_name': first_name,
            'last_name': last_name,
            'birth_date': extracted_data.get('birth_date'),
            'sex': extracted_data.get('sex'),
            'expiration': extracted_data.get('expiration'),
            'address': full_address,
            'address_line1': extracted_data.get('address_line1'),
            'address_city': extracted_data.get('address_city'),
            'address_postal': extracted_data.get('address_postal'),
            'nam': extracted_data.get('nam'),
            'confidence': 0.95 if (first_name and last_name) else 0.5,
            'id_type': id_type
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response as JSON: {e}")
        return {
            'success': False,
            'first_name': None,
            'last_name': None,
            'address': None,
            'confidence': 0.0,
            'error': f'Failed to parse response: {str(e)}',
            'id_type': id_type
        }
    except Exception as e:
        logger.error(f"OpenAI Vision extraction error: {e}")
        return {
            'success': False,
            'first_name': None,
            'last_name': None,
            'address': None,
            'confidence': 0.0,
            'error': str(e),
            'id_type': id_type
        }


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy'}), 200


@app.route('/verify', methods=['POST'])
def verify():
    """Main verification endpoint."""
    try:
        try:
            data = request.get_json(force=True, silent=False)
        except Exception as json_err:
            logger.error(f"JSON parsing error: {json_err}")
            return jsonify({'error': f'Invalid JSON: {str(json_err)}'}), 400
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        selfie_url = data.get('selfie_url')
        id_photo_url = data.get('id_photo_url')
        id_type = data.get('id_type', 'drivers_license')
        manual_address = data.get('manual_address')
        
        if not selfie_url or not id_photo_url:
            return jsonify({'error': 'Missing required image URLs'}), 400
        
        valid_id_types = ['passport', 'drivers_license', 'medical_card']
        if id_type not in valid_id_types:
            return jsonify({'error': f'Invalid id_type. Must be one of: {valid_id_types}'}), 400
        
        logger.info(f"Processing verification for id_type: {id_type}")
        
        # Download images
        selfie_image = download_image(selfie_url)
        id_image = download_image(id_photo_url)
        
        if selfie_image is None or id_image is None:
            return jsonify({
                'verified': False,
                'reason': 'Failed to download images',
                'face_match_score': 0.0
            }), 400
        
        # Perform face matching
        face_match_result = match_faces(selfie_image, id_image)
        
        # Extract ID info using OpenAI Vision
        ocr_result = extract_id_info_with_openai(id_image, id_type)
        
        # Handle manual address for geocoding
        if manual_address:
            manual_full_address = f"{manual_address.get('street')}, {manual_address.get('city')}, QC {manual_address.get('postalCode')}, Canada"
            logger.info(f"Geocoding manual address: {manual_full_address}")
            address_coord = geocode_address(manual_full_address)
            logger.info(f"Geocoding result for manual address: {address_coord}")
            ocr_result['address'] = manual_full_address
            ocr_result['address_line1'] = manual_address.get('street')
            ocr_result['address_city'] = manual_address.get('city')
            ocr_result['address_postal'] = manual_address.get('postalCode')
            ocr_result['address_source'] = 'manual'
        else:
            # For driver's license, append Canada to ensure Canadian geocoding
            dl_address = ocr_result.get('address')
            if dl_address and 'Canada' not in dl_address:
                dl_address = f"{dl_address}, Canada"
            address_coord = geocode_address(dl_address)
            ocr_result['address_source'] = 'openai_vision'

        # Clean up
        del selfie_image
        del id_image
        gc.collect()
        
        if not face_match_result['success']:
            return jsonify({
                'verified': False,
                'reason': face_match_result['reason'],
                'face_match_score': 0.0,
                'ocr_data': {
                    'detected': ocr_result.get('success', False),
                    'confidence': ocr_result.get('confidence', 0),
                    'id_type': id_type,
                    'first_name': ocr_result.get('first_name'),
                    'last_name': ocr_result.get('last_name'),
                    'address': ocr_result.get('address'),
                    'address_coord': address_coord,
                    'note': 'Face matching failed'
                }
            }), 200
        
        is_verified = face_match_result['match_score'] >= 0.4
        
        logger.info(f"Verification result: {is_verified}, score: {face_match_result['match_score']}")
        logger.info(f"Extracted: First={ocr_result.get('first_name')}, Last={ocr_result.get('last_name')}")
        
        return jsonify({
            'verified': is_verified,
            'face_match_score': face_match_result['match_score'],
            'ocr_data': {
                'detected': ocr_result.get('success', False),
                'confidence': ocr_result.get('confidence', 0),
                'id_type': id_type,
                'first_name': ocr_result.get('first_name'),
                'last_name': ocr_result.get('last_name'),
                'address': ocr_result.get('address'),
                'address_line1': ocr_result.get('address_line1'),
                'address_city': ocr_result.get('address_city'),
                'address_postal': ocr_result.get('address_postal'),
                'address_coord': address_coord,
                'note': ocr_result.get('note')
            },
            'reason': 'Face match successful' if is_verified else 'Face match score too low'
        }), 200
        
    except Exception as e:
        logger.error(f"Internal error: {e}")
        return jsonify({'error': f'Internal error: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
