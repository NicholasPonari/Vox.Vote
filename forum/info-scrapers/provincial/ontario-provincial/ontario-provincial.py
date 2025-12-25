import requests
from bs4 import BeautifulSoup
import csv
import time
from urllib.parse import urljoin
import re
import os
from requests.packages.urllib3.exceptions import InsecureRequestWarning

BASE_URL = "https://www.ola.org"
LISTING_URL = f"{BASE_URL}/en/members/current"
DELAY_BETWEEN_REQUESTS = 1  # Be respectful to the server
SSL_VERIFY = os.environ.get('OLA_SSL_VERIFY', 'true').lower() not in ('0', 'false', 'no')
CA_BUNDLE = os.environ.get('OLA_CA_BUNDLE')
SSL_FALLBACK = os.environ.get('OLA_SSL_FALLBACK', 'false').lower() in ('1', 'true', 'yes')
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
            print("Warning: SSL verification failed; retrying with verify=False due to OLA_SSL_FALLBACK.")
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
        else:
            raise
    time.sleep(DELAY_BETWEEN_REQUESTS)
    return BeautifulSoup(response.content, 'html.parser')

def get_all_mpp_data():
    """Scrape the main listing page to get basic MPP information"""
    mpp_list = []
    
    try:
        soup = get_soup(LISTING_URL)
        
        # Find all member cards
        member_cards = soup.find_all('div', class_='member-list-row')
        
        for card in member_cards:
            mpp_data = {}
            
            # Find the link to the member's profile
            link = card.find('a', class_='mpp-card-link')
            if not link:
                continue
            
            profile_path = link.get('href', '')
            mpp_data['source_url'] = urljoin(BASE_URL, profile_path)
            
            # Find the grid view div (contains all the info)
            grid_view = card.find('div', class_='memberGridView')
            if not grid_view:
                continue
            
            # Extract photo URL
            img = grid_view.find('img')
            if img and img.get('src'):
                photo_src = img['src']
                # Make absolute URL if needed
                if photo_src.startswith('/'):
                    photo_src = urljoin(BASE_URL, photo_src)
                mpp_data['photo_url'] = photo_src
            else:
                mpp_data['photo_url'] = ''
            
            # Extract name
            name_elem = grid_view.find('h3')
            if name_elem:
                mpp_data['name'] = name_elem.get_text(strip=True)
            else:
                mpp_data['name'] = ''
            
            # Extract party
            party_elem = grid_view.find('p', class_='current-members-party')
            if party_elem:
                mpp_data['party'] = party_elem.get_text(strip=True)
            else:
                mpp_data['party'] = ''
            
            # Extract district (riding)
            riding_elem = grid_view.find('p', class_='current-members-riding')
            if riding_elem:
                mpp_data['district'] = riding_elem.get_text(strip=True)
            else:
                mpp_data['district'] = ''
            
            # Set organization
            mpp_data['organization'] = 'Legislative Assembly of Ontario'
            
            # Default role (will be updated if Premier is detected)
            mpp_data['primary_role_en'] = 'Member of Provincial Parliament'
            
            mpp_list.append(mpp_data)
        
        print(f"Found {len(mpp_list)} MPPs on the listing page")
        
    except Exception as e:
        print(f"Error scraping main listing: {e}")
    
    return mpp_list

def extract_contact_details(mpp_data):
    """Extract email, phone, address, and check for Premier role from profile page"""
    try:
        soup = get_soup(mpp_data['source_url'])
        
        # Check for Premier role - search all list items on the page
        all_list_items = soup.find_all('li')
        for item in all_list_items:
            role_text = item.get_text(strip=True)
            # Check if this item contains exactly "Premier" (not "Parliamentary Assistant to the Premier")
            if role_text == 'Premier' or role_text == 'PremierPremier':
                mpp_data['primary_role_en'] = 'Premier of Ontario'
                break
        
        # Find the contact section
        # Look for email
        email_link = soup.find('a', href=lambda x: x and x.startswith('mailto:'))
        if email_link:
            mpp_data['email'] = email_link['href'].replace('mailto:', '')
        else:
            mpp_data['email'] = ''
        
        # Initialize defaults
        mpp_data['phone'] = ''
        mpp_data['address'] = ''
        
        # Find constituency office section - look for the div containing constituency info
        # The structure is: h3 "Constituency office" followed by div.views-field-nothing with address/phone
        constituency_header = soup.find('h3', string='Constituency office')
        if constituency_header:
            # Find the next views-field-nothing div which contains address info
            address_div = constituency_header.find_next('div', class_='views-field-nothing')
            if address_div:
                content_span = address_div.find('span', class_='field-content')
                if content_span:
                    # Get the HTML content to parse phone
                    html_content = str(content_span)
                    
                    # Extract phone number - look for Tel.: followed by number
                    phone_match = re.search(r'Tel\.?:</strong>\s*([0-9\-]+)', html_content)
                    if phone_match:
                        mpp_data['phone'] = phone_match.group(1).strip()
                    
                    # Build address from text before phone/fax
                    # Split on <br> tags first, then clean up
                    address_parts = []
                    text_content = content_span.get_text(separator='|', strip=True)
                    for part in text_content.split('|'):
                        part = part.strip()
                        # Stop when we hit phone or fax
                        if part.startswith('Tel') or part.startswith('Fax'):
                            break
                        # Skip emails and empty parts
                        if '@' in part or not part:
                            continue
                        address_parts.append(part)
                    
                    if address_parts:
                        mpp_data['address'] = ', '.join(address_parts)
        
        print(f"✓ Extracted contact details: {mpp_data['name']}")
        
    except Exception as e:
        print(f"✗ Error extracting contact details for {mpp_data['name']}: {e}")
        mpp_data['email'] = ''
        mpp_data['phone'] = ''
        mpp_data['address'] = ''

def main():
    print("Starting Ontario Provincial MPP Scraper")
    print("=" * 50)
    
    # Step 1: Get all MPP data from main listing
    print("\nStep 1: Scraping main MPP listing...")
    mpp_list = get_all_mpp_data()
    print(f"\nFound {len(mpp_list)} MPPs")
    
    # Step 2: Extract contact details from each MPP's profile page
    print("\nStep 2: Extracting contact details from each MPP profile...")
    
    for i, mpp_data in enumerate(mpp_list, 1):
        print(f"\n[{i}/{len(mpp_list)}] Processing: {mpp_data['name']}")
        extract_contact_details(mpp_data)
    
    # Step 3: Write to CSV
    print("\nStep 3: Writing data to CSV...")
    output_file = 'ontario_provincial_mpps.csv'
    
    fieldnames = [
        'organization',
        'party',
        'district',
        'name',
        'primary_role_en',
        'address',
        'phone',
        'email',
        'photo_url',
        'source_url'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(mpp_list)
    
    print(f"\n✓ Successfully wrote {len(mpp_list)} MPPs to {output_file}")
    print("=" * 50)
    print("Scraping complete!")

if __name__ == "__main__":
    main()
