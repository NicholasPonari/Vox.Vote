import requests
from bs4 import BeautifulSoup
import time
import xml.etree.ElementTree as ET
import re
import os
import json
import sys
from dotenv import find_dotenv, load_dotenv
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from supabase import create_client, Client
import uuid

BASE_URL = "https://www.ourcommons.ca"
XML_URL = f"{BASE_URL}/Members/en/search/XML"
DELAY_BETWEEN_REQUESTS = 1  # Be respectful to the server

SSL_VERIFY = os.environ.get('OURCOMMONS_SSL_VERIFY', 'true').lower() not in ('0', 'false', 'no')
CA_BUNDLE = os.environ.get('OURCOMMONS_CA_BUNDLE')
SSL_FALLBACK = os.environ.get('OURCOMMONS_SSL_FALLBACK', 'false').lower() in ('1', 'true', 'yes')

VERIFY_PARAM = CA_BUNDLE if CA_BUNDLE else SSL_VERIFY

if not (CA_BUNDLE or SSL_VERIFY):
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

load_dotenv(find_dotenv())

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception as e:
        print(f"✗ Failed to create Supabase client: {e}")
        supabase = None
else:
    supabase = None


def get_xml_data(url):
    """Fetch XML from URL"""
    print(f"Fetching: {url}")
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/124.0 Safari/537.36 VoxVoteScraper/1.0'
        )
    }

    try:
        response = requests.get(url, headers=headers, verify=VERIFY_PARAM, timeout=30)
        response.raise_for_status()
    except requests.exceptions.SSLError as e:
        if SSL_FALLBACK:
            requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
            print("Warning: SSL verification failed; retrying with verify=False due to OURCOMMONS_SSL_FALLBACK.")
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
        else:
            raise

    time.sleep(DELAY_BETWEEN_REQUESTS)
    return response.content


def get_soup(url):
    """Fetch and parse HTML from URL"""
    print(f"Fetching: {url}")
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/124.0 Safari/537.36 VoxVoteScraper/1.0'
        )
    }

    try:
        response = requests.get(url, headers=headers, verify=VERIFY_PARAM, timeout=30)
        response.raise_for_status()
    except requests.exceptions.SSLError as e:
        if SSL_FALLBACK:
            requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
            print("Warning: SSL verification failed; retrying with verify=False due to OURCOMMONS_SSL_FALLBACK.")
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
        else:
            raise

    time.sleep(DELAY_BETWEEN_REQUESTS)
    return BeautifulSoup(response.content, 'html.parser')


def normalize_name_for_url(name):
    """Convert name to URL-friendly format (e.g., 'Ziad Aboultaif' -> 'ziad-aboultaif')"""
    # Slightly safer than a simple replace
    return re.sub(r"\s+", "-", name.strip().lower())


def get_all_mp_data():
    """Parse XML to get basic MP information"""
    mp_list = []
    try:
        xml_content = get_xml_data(XML_URL)
        root = ET.fromstring(xml_content)

        # Iterate through each MemberOfParliament element
        for member in root.findall('MemberOfParliament'):
            mp_data = {}

            # Extract PersonId
            person_id = member.find('PersonId')
            if person_id is not None and person_id.text:
                mp_data['person_id'] = person_id.text.strip()
            else:
                continue  # Skip if no person ID

            # Extract first and last name
            first_name = member.find('PersonOfficialFirstName')
            last_name = member.find('PersonOfficialLastName')
            if first_name is not None and last_name is not None:
                mp_data['first_name'] = (first_name.text or '').strip()
                mp_data['last_name'] = (last_name.text or '').strip()
                if not mp_data['first_name'] or not mp_data['last_name']:
                    continue
                mp_data['name'] = f"{mp_data['first_name']} {mp_data['last_name']}"
            else:
                continue  # Skip if no name

            # Extract district (constituency)
            constituency = member.find('ConstituencyName')
            mp_data['district'] = (constituency.text or '').strip() if constituency is not None else ''

            # Extract party (caucus)
            caucus = member.find('CaucusShortName')
            mp_data['party'] = (caucus.text or '').strip() if caucus is not None else ''

            # Check if member is currently active (ToDateTime is nil)
            to_date = member.find('ToDateTime')
            if to_date is not None and to_date.get('{http://www.w3.org/2001/XMLSchema-instance}nil') != 'true':
                # Member is not currently serving, skip
                continue

            # Set organization and roles
            mp_data['organization'] = 'House of Commons (Federal)'
            mp_data['primary_role_en'] = 'Member of Parliament'
            mp_data['primary_role_fr'] = 'Député'

            # New fields: default values
            mp_data['office1_type'] = ''
            mp_data['office1_address'] = ''
            mp_data['office1_phone'] = ''
            mp_data['office2_type'] = ''
            mp_data['office2_address'] = ''
            mp_data['office2_phone'] = ''
            mp_data['secondary_roles'] = json.dumps({"current": []}, ensure_ascii=False)

            # Construct profile URL: first_name-last_name(personID)#contact
            url_name = normalize_name_for_url(mp_data['name'])
            mp_data['profile_url'] = f"{BASE_URL}/Members/en/{url_name}({mp_data['person_id']})#contact"
            mp_data['source_url'] = f"{BASE_URL}/Members/en/{url_name}({mp_data['person_id']})"

            mp_list.append(mp_data)

        print(f"Found {len(mp_list)} active MPs in the XML")
    except Exception as e:
        print(f"Error parsing XML: {e}")

    return mp_list


PHOTO_REGEX = re.compile(
    r'/Content/Parliamentarians/Images/OfficialMPPhotos/\d+/[^"\']+\.jpg',
    re.IGNORECASE,
)


def extract_offices_from_contact(contact_div):
    """
    Extract up to 2 offices from the contact tab.
    office1 = Hill (if present)
    office2 = Constituency main office (if present)
    """
    office1_type = ''
    office1_address = ''
    office1_phone = ''
    office2_type = ''
    office2_address = ''
    office2_phone = ''

    # Hill office
    hill_header = contact_div.find('h4', string=re.compile(r'Hill Office', re.IGNORECASE))
    if hill_header:
        hill_container = hill_header.find_next('div')
        if hill_container:
            # Address is usually first <p>
            first_p = hill_container.find('p')
            if first_p:
                office1_address = first_p.get_text(separator=', ', strip=True)
            # Phone
            text = hill_container.get_text(separator='|', strip=True)
            phone_match = re.search(r'Telephone:\s*([0-9\s\-\(\)]+)', text, re.IGNORECASE)
            if phone_match:
                office1_phone = phone_match.group(1).strip()
            office1_type = 'Hill'

    # Constituency office (take main one)
    constituency_header = contact_div.find('h4', string=re.compile(r'Constituency Office', re.IGNORECASE))
    if constituency_header:
        office_container = constituency_header.find_next('div', class_='ce-mip-contact-constituency-office-container')
        if office_container:
            office_div = office_container.find('div', class_='ce-mip-contact-constituency-office')
            if office_div:
                first_p = office_div.find('p')
                if first_p:
                    address_text = first_p.get_text(separator=', ', strip=True)
                    address_text = re.sub(r'^Main office\s*-\s*', '', address_text, flags=re.IGNORECASE)
                    office2_address = address_text
                office_text = office_div.get_text(separator='|', strip=True)
                phone_match = re.search(r'Telephone:\s*([0-9\s\-\(\)]+)', office_text, re.IGNORECASE)
                if phone_match:
                    office2_phone = phone_match.group(1).strip()
                office2_type = 'Constituency'

    return office1_type, office1_address, office1_phone, office2_type, office2_address, office2_phone


def extract_secondary_roles(person_id, primary_role_en):
    """
    Fetch roles XML for member and return JSON string of current secondary roles.
    Primary MP role is filtered out so it stays in primary_role_en/fr. [web:46][web:48]
    """
    try:
        roles_url = f"{BASE_URL}/Members/en/{person_id}/roles/xml"  # pattern may need adjustment after inspection
        xml_content = get_xml_data(roles_url)
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"Warning: could not fetch roles for PersonId={person_id}: {e}")
        return json.dumps({"current": []}, ensure_ascii=False)

    current_roles = []
    for role in root.findall('.//Role'):
        title_en_el = role.find('Title')
        from_date_el = role.find('FromDateTime')
        to_date_el = role.find('ToDateTime')

        title_en = (title_en_el.text or '').strip() if title_en_el is not None else ''
        if not title_en:
            continue

        # Skip the base MP role so it remains primary_role_en
        if title_en.lower() == primary_role_en.lower():
            continue

        # Only keep current roles (to_date nil or empty)
        is_current = True
        if to_date_el is not None and to_date_el.text:
            is_current = False

        if not is_current:
            continue

        current_roles.append(
            {
                "title_en": title_en,
                # Extend here with title_fr, category, etc. if needed
                "from": (from_date_el.text or '').strip() if from_date_el is not None else None,
            }
        )

    return json.dumps({"current": current_roles}, ensure_ascii=False)


def extract_contact_details(mp_data):
    """Extract email, website, photo, and office1/office2 from the profile page"""
    # defaults
    mp_data['email'] = ''
    mp_data['website'] = ''
    mp_data['photo_url'] = ''
    mp_data['office1_type'] = mp_data.get('office1_type', '')
    mp_data['office1_address'] = mp_data.get('office1_address', '')
    mp_data['office1_phone'] = mp_data.get('office1_phone', '')
    mp_data['office2_type'] = mp_data.get('office2_type', '')
    mp_data['office2_address'] = mp_data.get('office2_address', '')
    mp_data['office2_phone'] = mp_data.get('office2_phone', '')

    try:
        soup = get_soup(mp_data['profile_url'])

        # Extract photo URL
        photo_match = PHOTO_REGEX.search(str(soup))
        if photo_match:
            mp_data['photo_url'] = BASE_URL + photo_match.group(0)

        # Find the contact tab
        contact_div = soup.find('div', id='contact')
        if not contact_div:
            print(f"Warning: Could not find contact div for {mp_data['name']}")
            return

        # Email
        email_section = contact_div.find('h4', string=re.compile(r'Email', re.IGNORECASE))
        if email_section:
            email_p = email_section.find_next('p')
            if email_p:
                email_link = email_p.find('a', href=True)
                if email_link and email_link['href'].startswith('mailto:'):
                    mp_data['email'] = email_link['href'].replace('mailto:', '').strip()

        # Website
        website_section = contact_div.find('h4', string=re.compile(r'Website', re.IGNORECASE))
        if website_section:
            website_p = website_section.find_next('p')
            if website_p:
                website_link = website_p.find('a', href=True)
                if website_link:
                    mp_data['website'] = website_link['href'].strip()
                else:
                    mp_data['website'] = website_p.get_text(strip=True)

        # Offices
        (
            mp_data['office1_type'],
            mp_data['office1_address'],
            mp_data['office1_phone'],
            mp_data['office2_type'],
            mp_data['office2_address'],
            mp_data['office2_phone'],
        ) = extract_offices_from_contact(contact_div)

        print(f"✓ Extracted contact details: {mp_data['name']}")
    except Exception as e:
        print(f"✗ Error extracting contact details for {mp_data['name']}: {e}")


def upload_to_supabase(mp_list):
    """Upload MP data directly to Supabase politicians table"""
    if not supabase:
        print("✗ Supabase credentials not configured. Skipping upload.")
        return False

    try:
        print("\nStep 3: Cleaning existing House of Commons data...")
        supabase.table('politicians').delete().eq('organization', 'House of Commons (Federal)').execute()
        print("✓ Deleted existing House of Commons records")
        
        print(f"\nStep 4: Uploading {len(mp_list)} MPs to Supabase...")
        
        for i, mp_data in enumerate(mp_list, 1):
            mp_record = {
                'id': str(uuid.uuid4()),
                'organization': mp_data.get('organization', ''),
                'party': mp_data.get('party', ''),
                'district': mp_data.get('district', ''),
                'name': mp_data.get('name', ''),
                'primary_role_en': mp_data.get('primary_role_en', ''),
                'primary_role_fr': mp_data.get('primary_role_fr', ''),
                'office1_type': mp_data.get('office1_type', ''),
                'office1_address': mp_data.get('office1_address', ''),
                'office1_phone': mp_data.get('office1_phone', ''),
                'office2_type': mp_data.get('office2_type', ''),
                'office2_address': mp_data.get('office2_address', ''),
                'office2_phone': mp_data.get('office2_phone', ''),
                'email': mp_data.get('email', ''),
                'photo_url': mp_data.get('photo_url', ''),
                'source_url': mp_data.get('source_url', ''),
                'website': mp_data.get('website', ''),
                'secondary_roles': mp_data.get('secondary_roles', json.dumps({"current": []}, ensure_ascii=False)),
            }
            
            response = supabase.table('politicians').insert(mp_record).execute()
            print(f"[{i}/{len(mp_list)}] ✓ Uploaded: {mp_data['name']}")
        
        print(f"\n✓ Successfully uploaded {len(mp_list)} MPs to Supabase")
        return True
    except Exception as e:
        print(f"✗ Error uploading to Supabase: {e}")
        return False


def main():
    print("Starting Federal House of Commons MP Scraper")
    print("=" * 50)

    if not supabase:
        print("✗ Supabase client not available. Terminating.")
        sys.exit(1)

    # Step 1: Get all MP data from XML
    print("\nStep 1: Parsing MP data from XML...")
    mp_list = get_all_mp_data()
    print(f"\nFound {len(mp_list)} active MPs")

    # Step 2: Extract contact details and roles from each MP's profile page
    print("\nStep 2: Extracting contact details and roles from each MP profile...")
    for i, mp_data in enumerate(mp_list, 1):
        print(f"\n[{i}/{len(mp_list)}] Processing: {mp_data['name']}")
        extract_contact_details(mp_data)
        # Secondary roles as JSON
        mp_data['secondary_roles'] = extract_secondary_roles(
            mp_data['person_id'],
            mp_data['primary_role_en']
        )

    upload_to_supabase(mp_list)
    print("=" * 50)
    print("Scraping complete!")


if __name__ == "__main__":
    main()
