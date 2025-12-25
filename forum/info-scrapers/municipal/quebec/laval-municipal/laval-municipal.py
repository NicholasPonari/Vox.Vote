import requests
from bs4 import BeautifulSoup
import csv
import time
from urllib.parse import urljoin
import re
import os
import unicodedata
from requests.packages.urllib3.exceptions import InsecureRequestWarning

BASE_URL = "https://www.laval.ca"
LISTING_URL = f"{BASE_URL}/vie-democratique/hotel-de-ville-personnes-elues/membres-conseil-municipal/"
DELAY_BETWEEN_REQUESTS = 1  # Be respectful to the server
SSL_VERIFY = os.environ.get('LAVAL_SSL_VERIFY', 'true').lower() not in ('0', 'false', 'no')
CA_BUNDLE = os.environ.get('LAVAL_CA_BUNDLE')
SSL_FALLBACK = os.environ.get('LAVAL_SSL_FALLBACK', 'false').lower() in ('1', 'true', 'yes')
VERIFY_PARAM = CA_BUNDLE if CA_BUNDLE else SSL_VERIFY

if not (CA_BUNDLE or SSL_VERIFY):
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

def get_soup(url):
    """Fetch and parse HTML from URL"""
    print(f"Fetching: {url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 VoxVoteScraper/1.0'
    }
    try:
        response = requests.get(url, headers=headers, verify=VERIFY_PARAM, timeout=30)
        response.raise_for_status()
    except requests.exceptions.SSLError as e:
        if SSL_FALLBACK:
            requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
            print("Warning: SSL verification failed; retrying with verify=False due to LAVAL_SSL_FALLBACK.")
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
        else:
            raise
    time.sleep(DELAY_BETWEEN_REQUESTS)
    return BeautifulSoup(response.content, 'html.parser')

def strip_accents(text: str) -> str:
    """Remove accents/diacritics and normalize to ASCII-compatible lowercase."""
    if not text:
        return ''
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    return text

def infer_email_local_part(full_name: str) -> str:
    """Infer Laval email local part from a full name using heuristics.

    Rules based on provided examples:
    - Given names: use first letter of first given name; if a second given name exists, also use its first letter (e.g., Flavia Alexandra -> 'fa').
    - Last name: start with the last token, but include preceding particles of length <= 3 (e.g., 'De Cotis' -> 'decotis').
    - Normalize by lowercasing, removing accents, apostrophes, hyphens, and spaces.
    """
    if not full_name:
        return ''
    # Tokenize by whitespace
    tokens = [t for t in full_name.strip().split() if t]
    if not tokens:
        return ''

    # Identify last name tokens: always include last token; prepend short particles (<=3) before it
    ln_tokens = [tokens[-1]]
    i = len(tokens) - 2
    while i >= 0 and len(strip_accents(tokens[i]).replace("'", '').replace('-', '')) <= 3:
        ln_tokens.insert(0, tokens[i])
        i -= 1
    # Given name tokens are the rest at the start
    gn_tokens = tokens[:i+1] if i >= 0 else []
    # If no given names detected (edge case), fallback to treat first token as given name
    if not gn_tokens and len(tokens) >= 2:
        gn_tokens = [tokens[0]]

    # Initials: first letter of first given name; if a second given name exists, add its first letter
    initials = ''
    if gn_tokens:
        initials += strip_accents(gn_tokens[0])[0:1].lower()
        if len(gn_tokens) >= 2:
            initials += strip_accents(gn_tokens[1])[0:1].lower()

    # Normalize last name: join tokens, remove spaces/hyphens/apostrophes, strip accents, lower
    last_name_joined = ''.join(ln_tokens)
    last_name_norm = strip_accents(last_name_joined)
    last_name_norm = last_name_norm.replace(' ', '').replace('-', '').replace("'", '').lower()

    return f"{initials}.{last_name_norm}" if initials and last_name_norm else ''

def get_all_councilor_data():
    """Scrape the main listing to get basic councilor information"""
    councilor_list = []
    
    try:
        soup = get_soup(LISTING_URL)
        
        # Find the listing container
        listing_container = soup.find('div', class_='listing--municipal-councilor')
        if not listing_container:
            print("Error: Could not find div with class='listing--municipal-councilor'")
            return councilor_list
        
        # Find all councilor articles
        articles = listing_container.find_all('article', class_='municipal-councilor-item')
        
        for idx, article in enumerate(articles):
            councilor_data = {}
            
            # Extract name and district from title
            title_elem = article.find('h3', class_='municipal-councilor-item__title')
            if not title_elem:
                continue
            
            title_text = title_elem.get_text(strip=True)
            
            # Parse the title: "Name, District/Role"
            if ',' in title_text:
                parts = title_text.split(',', 1)
                councilor_data['name'] = parts[0].strip()
                role_district = parts[1].strip() if len(parts) > 1 else ''
                
                # First entry is the mayor
                if idx == 0:
                    councilor_data['district'] = 'Laval'
                    councilor_data['primary_role_en'] = 'Mayor of Laval'
                    councilor_data['primary_role_fr'] = 'Maire de Laval'
                else:
                    # Extract district: "District 01 – Saint-François" -> "Saint-François"
                    district_match = re.search(r'District\s+\d+\s+[–-]\s+(.+)', role_district)
                    if district_match:
                        councilor_data['district'] = district_match.group(1).strip()
                    else:
                        councilor_data['district'] = role_district
                    
                    councilor_data['primary_role_en'] = 'Councillor'
                    councilor_data['primary_role_fr'] = 'Conseiller'
            else:
                councilor_data['name'] = title_text
                councilor_data['district'] = ''
                councilor_data['primary_role_en'] = 'Councillor'
                councilor_data['primary_role_fr'] = 'Conseiller'
            
            # Extract email
            email_elem = article.find('a', class_='municipal-councilor-item__email')
            if email_elem and email_elem.get('href', '').startswith('mailto:'):
                councilor_data['email'] = email_elem['href'].replace('mailto:', '')
            else:
                # Cloudflare often obfuscates; capture text or decode if present
                text_email = email_elem.get_text(strip=True) if email_elem else ''
                if text_email and '@' in text_email:
                    councilor_data['email'] = text_email
                else:
                    councilor_data['email'] = ''
            
            # Extract phone
            phone_elem = article.find('span', class_='municipal-councilor-item__phone')
            if phone_elem:
                councilor_data['phone'] = phone_elem.get_text(strip=True)
            else:
                councilor_data['phone'] = ''
            
            # Extract photo URL (check data-src, data-lazy-src, or srcset for lazy-loaded images)
            img_elem = article.find('img')
            if img_elem:
                # Try different attributes for lazy-loaded images
                photo_url = (img_elem.get('data-src') or 
                           img_elem.get('data-lazy-src') or 
                           img_elem.get('data-srcset', '').split(',')[0].strip().split()[0] or
                           img_elem.get('src'))
                
                # Only use if it's a real URL (not a placeholder SVG)
                if photo_url and not photo_url.startswith('data:image/svg'):
                    councilor_data['photo_url'] = photo_url
                else:
                    councilor_data['photo_url'] = ''
            else:
                councilor_data['photo_url'] = ''
            
            # Extract profile link (source_url)
            link_elem = article.find('a', class_='municipal-councilor-item__link')
            if link_elem and link_elem.get('href'):
                councilor_data['profile_url'] = link_elem['href']
                councilor_data['source_url'] = link_elem['href']
            else:
                councilor_data['profile_url'] = ''
                councilor_data['source_url'] = ''
            
            # Set organization
            councilor_data['organization'] = 'Conseil Municipal de Laval'
            
            councilor_list.append(councilor_data)
        
        print(f"Found {len(councilor_list)} councilors in the listing")
        
    except Exception as e:
        print(f"Error scraping main listing: {e}")
    
    return councilor_list

def extract_profile_details(councilor_data):
    """Extract address, email, and photo from the profile page; apply inference fallbacks."""
    if not councilor_data.get('profile_url'):
        councilor_data['address'] = ''
        return
    
    try:
        soup = get_soup(councilor_data['profile_url'])
        
        # Extract email if not already found
        if not councilor_data.get('email'):
            email_link = soup.find('a', class_='municipal-councilor-item__email')
            if email_link and email_link.get('href', '').startswith('mailto:'):
                councilor_data['email'] = email_link['href'].replace('mailto:', '')
            else:
                # Try to decode Cloudflare-protected emails
                cf_span = soup.find('span', attrs={'data-cfemail': True})
                if cf_span and cf_span.get('data-cfemail'):
                    # Minimal runtime decoder for Cloudflare emails
                    enc = cf_span['data-cfemail']
                    try:
                        r = int(enc[:2], 16)
                        email_bytes = bytes(int(enc[i:i+2], 16) ^ r for i in range(2, len(enc), 2))
                        decoded = email_bytes.decode('utf-8', errors='ignore')
                        if '@' in decoded:
                            councilor_data['email'] = decoded
                    except Exception:
                        pass
                else:
                    # Infer email based on initials and last name with particle handling
                    inferred = infer_email_local_part(councilor_data.get('name', ''))
                    if inferred:
                        councilor_data['email'] = inferred + '@laval.ca'
        
        # Extract photo if not already found or if it's a placeholder
        if not councilor_data.get('photo_url'):
            img_elem = soup.find('img', class_=['attachment-medium-large', 'wp-post-image'])
            if img_elem:
                photo_url = (img_elem.get('data-src') or 
                           img_elem.get('data-lazy-src') or 
                           img_elem.get('src'))
                if photo_url and not photo_url.startswith('data:image/svg'):
                    councilor_data['photo_url'] = photo_url
        
        # Look for the address section
        # Find the paragraph containing "Hôtel de ville"
        address_found = False
        
        # Search for strong tag with "Hôtel de ville" text
        strong_tags = soup.find_all('strong')
        for strong in strong_tags:
            if 'Hôtel de ville' in strong.get_text():
                # Get the parent paragraph
                parent_p = strong.find_parent('p')
                if parent_p:
                    # Extract the address from the Google Maps link and subsequent text
                    address_parts = []
                    
                    # Get the link text (street address)
                    link = parent_p.find('a', href=lambda h: h and 'maps' in h)
                    if link:
                        address_parts.append(link.get_text(strip=True))
                    
                    # Get all text content after the link
                    # Parse all br-separated content
                    text_content = parent_p.get_text(separator='|', strip=True)
                    
                    # Split by separator and filter
                    lines = [line.strip() for line in text_content.split('|') if line.strip()]
                    
                    # Remove "Hôtel de ville" and collect address lines
                    for line in lines:
                        if 'Hôtel de ville' in line:
                            continue
                        # Only add lines that look like address components
                        if line and not line.startswith('http'):
                            address_parts.append(line)
                    
                    # Join the address parts
                    councilor_data['address'] = ', '.join(address_parts)
                    address_found = True
                    break
        
        if not address_found:
            # Fallback to the known Hôtel de ville address (single-line)
            councilor_data['address'] = (
                '3131, boulevard Saint-Martin Ouest, Case postale 422, '
                'Succursale Saint-Martin, Laval (Québec) H7V 3Z4'
            )
        
        print(f"✓ Extracted profile details: {councilor_data['name']}")
        
    except Exception as e:
        print(f"✗ Error extracting profile details for {councilor_data['name']}: {e}")
        councilor_data['address'] = ''

def main():
    print("Starting Laval Municipal Councilor Scraper")
    print("=" * 50)
    
    # Step 1: Get all councilor data from main listing
    print("\nStep 1: Scraping main councilor listing...")
    councilor_list = get_all_councilor_data()
    print(f"\nFound {len(councilor_list)} councilors")
    
    # Step 2: Extract additional details from each councilor's profile page
    print("\nStep 2: Extracting profile details from each councilor...")
    
    for i, councilor_data in enumerate(councilor_list, 1):
        print(f"\n[{i}/{len(councilor_list)}] Processing: {councilor_data['name']}")
        extract_profile_details(councilor_data)

        # If email still missing, infer it
        if not councilor_data.get('email'):
            inferred = infer_email_local_part(councilor_data.get('name', ''))
            if inferred:
                councilor_data['email'] = inferred + '@laval.ca'
    
    # Step 3: Write to CSV
    print("\nStep 3: Writing data to CSV...")
    output_file = 'laval_municipal_councilors.csv'
    
    fieldnames = [
        'organization',
        'name',
        'district',
        'primary_role_en',
        'primary_role_fr',
        'email',
        'phone',
        'address',
        'photo_url',
        'source_url'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(councilor_list)
    
    print(f"\n✓ Successfully wrote {len(councilor_list)} councilors to {output_file}")
    print("=" * 50)
    print("Scraping complete!")

if __name__ == "__main__":
    main()
