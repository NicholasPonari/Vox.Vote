import requests
from bs4 import BeautifulSoup
import csv
import time
from urllib.parse import urljoin
import re
import os
from requests.packages.urllib3.exceptions import InsecureRequestWarning

BASE_URL = "https://www.assnat.qc.ca"
LISTING_URL = f"{BASE_URL}/en/deputes/index.html"
DELAY_BETWEEN_REQUESTS = 1  # Be respectful to the server
SSL_VERIFY = os.environ.get('ASSNAT_SSL_VERIFY', 'true').lower() not in ('0', 'false', 'no')
CA_BUNDLE = os.environ.get('ASSNAT_CA_BUNDLE')
SSL_FALLBACK = os.environ.get('ASSNAT_SSL_FALLBACK', 'false').lower() in ('1', 'true', 'yes')
VERIFY_PARAM = CA_BUNDLE if CA_BUNDLE else SSL_VERIFY

# TODO:
# organization is Assemblée nationale du Québec
# instead of organization, the header is "party"
# address is being taken from parliament and not electoral division
#multiple jobs being thrown into address field

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
            print("Warning: SSL verification failed; retrying with verify=False due to ASSNAT_SSL_FALLBACK.")
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
        else:
            raise
    time.sleep(DELAY_BETWEEN_REQUESTS)
    return BeautifulSoup(response.content, 'html.parser')

def get_all_mna_data():
    """Scrape the main table to get basic MNA information"""
    mna_list = []
    
    try:
        soup = get_soup(LISTING_URL)
        
        # Find the table with id="ListeDeputes"
        table = soup.find('table', id='ListeDeputes')
        if not table:
            print("Error: Could not find table with id='ListeDeputes'")
            return mna_list
        
        tbody = table.find('tbody')
        if not tbody:
            print("Error: Could not find tbody in table")
            return mna_list
        
        # Iterate through each row
        rows = tbody.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 4:
                continue
            
            mna_data = {}
            
            # Extract name and profile link from first cell
            name_cell = cells[0]
            name_link = name_cell.find('a', href=True)
            if name_link:
                # Clean name: "Dufour, Pierre " -> "Pierre Dufour"
                name_text = name_link.get_text(strip=True)
                # Handle format "LastName, FirstName"
                if ',' in name_text:
                    parts = [p.strip() for p in name_text.split(',')]
                    if len(parts) == 2:
                        mna_data['name'] = f"{parts[1]} {parts[0]}"
                    else:
                        mna_data['name'] = name_text
                else:
                    mna_data['name'] = name_text
                
                # Get the profile URL and construct coordonnees URL
                profile_path = name_link['href']
                mna_data['profile_url'] = urljoin(BASE_URL, profile_path)
                
                # Construct coordonnees URL by adding /coordonnees.html
                # Remove index.html if present
                coordonnees_path = profile_path.replace('index.html', 'coordonnees.html')
                if not coordonnees_path.endswith('coordonnees.html'):
                    coordonnees_path = coordonnees_path.rstrip('/') + '/coordonnees.html'
                mna_data['coordonnees_url'] = urljoin(BASE_URL, coordonnees_path)
                
                # Source URL is the profile URL without coordonnees
                mna_data['source_url'] = mna_data['profile_url'].replace('index.html', '').rstrip('/')
            
            # Extract electoral division (district) from second cell
            district_cell = cells[1]
            mna_data['district'] = district_cell.get_text(strip=True)
            
            # Extract political affiliation (organization) from third cell
            affiliation_cell = cells[2]
            mna_data['organization'] = affiliation_cell.get_text(strip=True)
            
            # Extract email from fourth cell
            email_cell = cells[3]
            email_link = email_cell.find('a', href=True)
            if email_link and email_link['href'].startswith('mailto:'):
                mna_data['email'] = email_link['href'].replace('mailto:', '')
            else:
                mna_data['email'] = ''
            
            # Set default primary roles
            mna_data['primary_role_en'] = 'Member of National Assembly'
            mna_data['primary_role_fr'] = "Membre de l'Assemblée nationale"
            
            mna_list.append(mna_data)
        
        print(f"Found {len(mna_list)} MNAs in the table")
        
    except Exception as e:
        print(f"Error scraping main table: {e}")
    
    return mna_list

def extract_contact_details(mna_data):
    """Extract address, phone, and photo from the coordonnees page"""
    try:
        soup = get_soup(mna_data['coordonnees_url'])
        
        # Extract photo URL
        photo_img = soup.find('img', class_='photoDepute')
        if photo_img and photo_img.get('src'):
            mna_data['photo_url'] = photo_img['src']
        else:
            mna_data['photo_url'] = ''
        
        # Extract address and phone from blockAdresseDepute
        address_block = soup.find('div', class_='blockAdresseDepute')
        if address_block:
            address_elem = address_block.find('address', class_='blockAdresseDepute')
            if address_elem:
                # Get all text content
                address_text = address_elem.get_text(separator='|', strip=True)
                
                # Extract phone number
                phone_match = re.search(r'Telephone:\s*([^|]+)', address_text)
                if phone_match:
                    mna_data['phone'] = phone_match.group(1).strip()
                else:
                    mna_data['phone'] = ''
                
                # Extract address (everything before "Telephone:")
                # Remove email links and clean up
                address_parts = []
                for part in address_text.split('|'):
                    part = part.strip()
                    # Skip phone line, email line, and empty parts
                    if part.startswith('Telephone:') or '@' in part or not part:
                        continue
                    address_parts.append(part)
                
                mna_data['address'] = ', '.join(address_parts)
            else:
                mna_data['phone'] = ''
                mna_data['address'] = ''
        else:
            mna_data['phone'] = ''
            mna_data['address'] = ''
        
        print(f"✓ Extracted contact details: {mna_data['name']}")
        
    except Exception as e:
        print(f"✗ Error extracting contact details for {mna_data['name']}: {e}")
        mna_data['phone'] = ''
        mna_data['address'] = ''
        mna_data['photo_url'] = ''

def main():
    print("Starting Quebec Provincial MNA Scraper")
    print("=" * 50)
    
    # Step 1: Get all MNA data from main table
    print("\nStep 1: Scraping main MNA table...")
    mna_list = get_all_mna_data()
    print(f"\nFound {len(mna_list)} MNAs")
    
    # Step 2: Extract contact details from each MNA's coordonnees page
    print("\nStep 2: Extracting contact details from each MNA...")
    
    for i, mna_data in enumerate(mna_list, 1):
        print(f"\n[{i}/{len(mna_list)}] Processing: {mna_data['name']}")
        extract_contact_details(mna_data)
    
    # Step 3: Write to CSV
    print("\nStep 3: Writing data to CSV...")
    output_file = 'quebec_provincial_mnas.csv'
    
    fieldnames = [
        'organization',
        'name',
        'district',
        'email',
        'primary_role_en',
        'primary_role_fr',
        'address',
        'phone',
        'photo_url',
        'source_url'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(mna_list)
    
    print(f"\n✓ Successfully wrote {len(mna_list)} MNAs to {output_file}")
    print("=" * 50)
    print("Scraping complete!")

if __name__ == "__main__":
    main()
