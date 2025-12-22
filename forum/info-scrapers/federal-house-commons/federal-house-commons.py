import requests
from bs4 import BeautifulSoup
import csv
import time
import xml.etree.ElementTree as ET
import re
import os
from requests.packages.urllib3.exceptions import InsecureRequestWarning

BASE_URL = "https://www.ourcommons.ca"
XML_URL = f"{BASE_URL}/Members/en/search/XML"
DELAY_BETWEEN_REQUESTS = 1  # Be respectful to the server
SSL_VERIFY = os.environ.get('OURCOMMONS_SSL_VERIFY', 'true').lower() not in ('0', 'false', 'no')
CA_BUNDLE = os.environ.get('OURCOMMONS_CA_BUNDLE')
SSL_FALLBACK = os.environ.get('OURCOMMONS_SSL_FALLBACK', 'false').lower() in ('1', 'true', 'yes')
VERIFY_PARAM = CA_BUNDLE if CA_BUNDLE else SSL_VERIFY

if not (CA_BUNDLE or SSL_VERIFY):
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

def get_xml_data(url):
    """Fetch and parse XML from URL"""
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 VoxVoteScraper/1.0'
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
    return name.lower().replace(' ', '-')

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
            if person_id is not None:
                mp_data['person_id'] = person_id.text
            else:
                continue  # Skip if no person ID
            
            # Extract first and last name
            first_name = member.find('PersonOfficialFirstName')
            last_name = member.find('PersonOfficialLastName')
            
            if first_name is not None and last_name is not None:
                mp_data['first_name'] = first_name.text if first_name.text else ''
                mp_data['last_name'] = last_name.text if last_name.text else ''
                mp_data['name'] = f"{mp_data['first_name']} {mp_data['last_name']}"
            else:
                continue  # Skip if no name
            
            # Extract district (constituency)
            constituency = member.find('ConstituencyName')
            mp_data['district'] = constituency.text if constituency is not None and constituency.text else ''
            
            # Extract party (caucus)
            caucus = member.find('CaucusShortName')
            mp_data['party'] = caucus.text if caucus is not None and caucus.text else ''
            
            # Check if member is currently active (ToDateTime is nil)
            to_date = member.find('ToDateTime')
            if to_date is not None and to_date.get('{http://www.w3.org/2001/XMLSchema-instance}nil') != 'true':
                # Member is not currently serving, skip
                continue
            
            # Set organization and roles
            mp_data['organization'] = 'House of Commons (Federal)'
            mp_data['primary_role_en'] = 'Member of Parliament'
            mp_data['primary_role_fr'] = 'Député'
            
            # Construct profile URL: first_name-last_name(personID)#contact
            url_name = normalize_name_for_url(mp_data['name'])
            mp_data['profile_url'] = f"{BASE_URL}/Members/en/{url_name}({mp_data['person_id']})#contact"
            mp_data['source_url'] = f"{BASE_URL}/Members/en/{url_name}({mp_data['person_id']})"
            
            mp_list.append(mp_data)
        
        print(f"Found {len(mp_list)} active MPs in the XML")
        
    except Exception as e:
        print(f"Error parsing XML: {e}")
    
    return mp_list

def extract_contact_details(mp_data):
    """Extract address, phone, email, website, and photo from the profile page"""
    try:
        soup = get_soup(mp_data['profile_url'])
        
        # Extract photo URL using regex (more reliable than DOM parsing for this page)
        photo_match = re.search(r'/Content/Parliamentarians/Images/OfficialMPPhotos/\d+/[^"\']+\.jpg', str(soup))
        if photo_match:
            mp_data['photo_url'] = BASE_URL + photo_match.group(0)
        else:
            mp_data['photo_url'] = ''
        
        # Find the contact tab
        contact_div = soup.find('div', id='contact')
        if not contact_div:
            print(f"Warning: Could not find contact div for {mp_data['name']}")
            mp_data['email'] = ''
            mp_data['website'] = ''
            mp_data['phone'] = ''
            mp_data['address'] = ''
            return
        
        # Extract email
        email_section = contact_div.find('h4', string='Email')
        if email_section:
            email_p = email_section.find_next('p')
            if email_p:
                email_link = email_p.find('a', href=True)
                if email_link and email_link['href'].startswith('mailto:'):
                    mp_data['email'] = email_link['href'].replace('mailto:', '')
                else:
                    mp_data['email'] = ''
            else:
                mp_data['email'] = ''
        else:
            mp_data['email'] = ''
        
        # Extract website
        website_section = contact_div.find('h4', string='Website')
        if website_section:
            website_p = website_section.find_next('p')
            if website_p:
                website_link = website_p.find('a', href=True)
                if website_link:
                    mp_data['website'] = website_link['href'].strip()
                else:
                    mp_data['website'] = website_p.get_text(strip=True)
            else:
                mp_data['website'] = ''
        else:
            mp_data['website'] = ''
        
        # Extract constituency office phone and address
        constituency_header = contact_div.find('h4', string='Constituency Office')
        if constituency_header:
            # Find the office container
            office_container = constituency_header.find_next('div', class_='ce-mip-contact-constituency-office-container')
            if office_container:
                office_div = office_container.find('div', class_='ce-mip-contact-constituency-office')
                if office_div:
                    # Get all text content
                    office_text = office_div.get_text(separator='|', strip=True)
                    
                    # Extract phone number (look for "Telephone:" followed by number)
                    phone_match = re.search(r'Telephone:\s*([0-9\s\-()]+)', office_text)
                    if phone_match:
                        mp_data['phone'] = phone_match.group(1).strip()
                    else:
                        mp_data['phone'] = ''
                    
                    # Extract address - get the first paragraph (contains office name and address)
                    first_p = office_div.find('p')
                    if first_p:
                        # Get text and clean it up
                        address_text = first_p.get_text(separator=', ', strip=True)
                        # Remove "Main office -" prefix if present
                        address_text = re.sub(r'^Main office\s*-\s*', '', address_text, flags=re.IGNORECASE)
                        mp_data['address'] = address_text
                    else:
                        mp_data['address'] = ''
                else:
                    mp_data['phone'] = ''
                    mp_data['address'] = ''
            else:
                mp_data['phone'] = ''
                mp_data['address'] = ''
        else:
            mp_data['phone'] = ''
            mp_data['address'] = ''
        
        print(f"✓ Extracted contact details: {mp_data['name']}")
        
    except Exception as e:
        print(f"✗ Error extracting contact details for {mp_data['name']}: {e}")
        mp_data['email'] = ''
        mp_data['website'] = ''
        mp_data['phone'] = ''
        mp_data['address'] = ''
        mp_data['photo_url'] = ''

def main():
    print("Starting Federal House of Commons MP Scraper")
    print("=" * 50)
    
    # Step 1: Get all MP data from XML
    print("\nStep 1: Parsing MP data from XML...")
    mp_list = get_all_mp_data()
    print(f"\nFound {len(mp_list)} active MPs")
    
    # Step 2: Extract contact details from each MP's profile page
    print("\nStep 2: Extracting contact details from each MP profile...")
    
    for i, mp_data in enumerate(mp_list, 1):
        print(f"\n[{i}/{len(mp_list)}] Processing: {mp_data['name']}")
        extract_contact_details(mp_data)
    
    # Step 3: Write to CSV
    print("\nStep 3: Writing data to CSV...")
    output_file = 'federal_house_commons_mps.csv'
    
    fieldnames = [
        'organization',
        'party',
        'district',
        'name',
        'primary_role_en',
        'primary_role_fr',
        'address',
        'phone',
        'email',
        'photo_url',
        'source_url',
        'website'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(mp_list)
    
    print(f"\n✓ Successfully wrote {len(mp_list)} MPs to {output_file}")
    print("=" * 50)
    print("Scraping complete!")

if __name__ == "__main__":
    main()
