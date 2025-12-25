import requests
from bs4 import BeautifulSoup
import csv
import time
from urllib.parse import urljoin
import re
import os
import uuid
import json
from dotenv import find_dotenv, load_dotenv
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from supabase import create_client, Client

BASE_URL = "https://www.assnat.qc.ca"
LISTING_URL = f"{BASE_URL}/en/deputes/index.html"

DELAY_BETWEEN_REQUESTS = 1  # Be respectful to the server

SSL_VERIFY = os.environ.get('ASSNAT_SSL_VERIFY', 'true').lower() not in ('0', 'false', 'no')
CA_BUNDLE = os.environ.get('ASSNAT_CA_BUNDLE')
SSL_FALLBACK = os.environ.get('ASSNAT_SSL_FALLBACK', 'false').lower() in ('1', 'true', 'yes')
VERIFY_PARAM = CA_BUNDLE if CA_BUNDLE else SSL_VERIFY

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

ORGANIZATION_NAME = "Assemblée nationale du Québec"

# Secondary roles of interest (present/active roles) on coordonnees page
# These are in English on the EN pages; adjust if you ever switch to FR.
PRIMARY_ROLE_EN = "Member of National Assembly"
PRIMARY_ROLE_FR = "Membre de l'Assemblée nationale"

# Any roles that appear as bullet points directly under the name (on coordonnees page)
# other than "Member for <district>" and the party line should be treated as secondary roles.
# Example lines for François Legault: "Premier", "Responsible for the Abitibi-Témiscamingue Region". [page:1]


if not (CA_BUNDLE or SSL_VERIFY):
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)


def get_soup(url: str) -> BeautifulSoup:
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
    except requests.exceptions.SSLError:
        if SSL_FALLBACK:
            requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
            print("Warning: SSL verification failed; retrying with verify=False due to ASSNAT_SSL_FALLBACK.")
            response = requests.get(url, headers=headers, verify=False, timeout=30)
            response.raise_for_status()
        else:
            raise

    time.sleep(DELAY_BETWEEN_REQUESTS)
    return BeautifulSoup(response.content, 'html.parser')


def get_all_mna_rows():
    """
    Scrape the main EN Members listing to get base data for each MNA.
    This provides: name, party, district, email, profile URL, coordonnees URL, source URL. [web:16]
    """
    mna_list = []

    try:
        soup = get_soup(LISTING_URL)
        table = soup.find('table', id='ListeDeputes')
        if not table:
            print("Error: Could not find table with id='ListeDeputes'")
            return mna_list

        tbody = table.find('tbody')
        if not tbody:
            print("Error: Could not find tbody in table")
            return mna_list

        rows = tbody.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 4:
                continue

            mna = {}

            # Name and profile link
            name_cell = cells[0]
            name_link = name_cell.find('a', href=True)
            if not name_link:
                continue

            name_text = name_link.get_text(strip=True)
            # "Last, First" → "First Last"
            if ',' in name_text:
                parts = [p.strip() for p in name_text.split(',')]
                if len(parts) == 2:
                    mna['name'] = f"{parts[1]} {parts[0]}"
                else:
                    mna['name'] = name_text
            else:
                mna['name'] = name_text

            profile_path = name_link['href']
            mna['profile_url'] = urljoin(BASE_URL, profile_path)

            coordonnees_path = profile_path.replace('index.html', 'coordonnees.html')
            if not coordonnees_path.endswith('coordonnees.html'):
                coordonnees_path = coordonnees_path.rstrip('/') + '/coordonnees.html'
            mna['coordonnees_url'] = urljoin(BASE_URL, coordonnees_path)

            # Source URL is profile URL without index.html or coordonnees.html
            # Example: https://www.assnat.qc.ca/en/deputes/legault-francois-4131 [web:16]
            mna['source_url'] = mna['profile_url'].replace('index.html', '').rstrip('/')

            # District
            district_cell = cells[1]
            mna['district'] = district_cell.get_text(strip=True)

            # Party (third column in EN listing)
            affiliation_cell = cells[2]
            party = affiliation_cell.get_text(strip=True)
            mna['party'] = party

            # Email
            email_cell = cells[3]
            email_link = email_cell.find('a', href=True)
            if email_link and email_link['href'].startswith('mailto:'):
                mna['email'] = email_link['href'].replace('mailto:', '').strip()
            else:
                mna['email'] = ''

            # Static organization and primary roles
            mna['organization'] = ORGANIZATION_NAME
            mna['primary_role_en'] = PRIMARY_ROLE_EN
            mna['primary_role_fr'] = PRIMARY_ROLE_FR

            # Defaults for contact + socials
            mna['address'] = ''
            mna['phone'] = ''
            mna['photo_url'] = ''
            mna['website'] = None
            mna['facebook'] = None
            mna['instagram'] = None
            mna['twitter'] = None
            mna['linkedin'] = None
            mna['youtube'] = None

            # Secondary roles (JSON string with "current": [])
            mna['secondary_roles'] = '{"current": []}'

            # Placeholders for up to two specific office fields in the new schema
            mna['office1_type'] = None
            mna['office1_address'] = None
            mna['office1_phone'] = None
            mna['office2_type'] = None
            mna['office2_address'] = None
            mna['office2_phone'] = None

            # UUID for this record
            mna['id'] = str(uuid.uuid4())

            mna_list.append(mna)

        print(f"Found {len(mna_list)} MNAs in the table")
    except Exception as e:
        print(f"Error scraping main table: {e}")

    return mna_list


def parse_secondary_roles_and_photo(soup: BeautifulSoup, mna: dict):
    """
    From coordonnees page, extract:
    - photo_url
    - secondary roles (current present roles, e.g. Premier, regional responsibility)
    """
    # Photo
    photo_img = soup.find('img', class_='photoDepute')
    if photo_img and photo_img.get('src'):
        mna['photo_url'] = urljoin(BASE_URL, photo_img['src'])
    else:
        mna['photo_url'] = ''

    # Roles just under the name
    # Structure: name, then a ul-like list of bullet items:
    #   * Member for L’Assomption
    #   * Coalition avenir Québec
    #   * Premier
    #   * Responsible for the Abitibi-Témiscamingue Region [page:1]
    #
    # Filter to keep only true *roles*, not the "Member for" or party line.
    role_lines = []

    # Find the header containing the name, then following list items
    name_h1 = soup.find('h1')
    if name_h1:
        # The bullets are usually in the next ul/li after the name block
        possible_list = name_h1.find_next('ul')
        if possible_list:
            for li in possible_list.find_all('li'):
                text = li.get_text(strip=True)
                if not text:
                    continue
                # Skip the standard membership and party lines
                if text.startswith("Member for "):
                    continue
                if text == mna.get('party'):
                    continue
                # Everything else is treated as a secondary role
                role_lines.append(text)

    # Only keep "current" roles; on this page everything displayed is current.
    # Represent as JSON string: {"current": ["Premier", "Responsible for the Abitibi-Témiscamingue Region"]}
    if role_lines:
        # Basic JSON string building without importing json just for this
        escaped = [r.replace('"', '\\"') for r in role_lines]
        joined = '", "'.join(escaped)
        mna['secondary_roles'] = f'{{"current": ["{joined}"]}}'
    else:
        mna['secondary_roles'] = '{"current": []}'


def extract_electoral_office_block(soup: BeautifulSoup):
    """
    Return the main electoral division office block (<address> or similar) and its text.
    The page typically has separate sections:
    - "Department"
    - "Electoral division"
    Only the "Electoral division" section is needed for our address/phone. [page:1]
    """
    # Find the heading for "Electoral division" and then the following address block
    heading = None
    for h_tag in soup.find_all(['h2', 'h3']):
        if h_tag.get_text(strip=True).lower().startswith('electoral division'):
            heading = h_tag
            break

    if not heading:
        return None, ""

    # The content is usually directly under this heading, often as <p> lines with <br> or as text nodes.
    # On the current site, the address is a sequence of <br>-separated lines and "Telephone:". [page:1]
    container = heading.find_next()
    if not container:
        return None, ""

    # Extract text including "Telephone:" line.
    text = container.get_text(separator='|', strip=True)
    return container, text


def parse_electoral_office_contact(soup: BeautifulSoup, mna: dict):
    """
    From coordonnees page, extract:
    - address: full postal address for the electoral division office (single string)
    - phone: main telephone number for that office
    Rules:
    - Only use the Electoral division office (ignore Department offices).
    - Treat this as the main/"top" office.
    """
    block, text = extract_electoral_office_block(soup)
    if not block or not text:
        mna['address'] = ''
        mna['phone'] = ''
        return

    # Example structure for Legault: [page:1]
    # 831, boulevard de l'Ange-Gardien Nord
    # Bureau 208
    # L'Assomption (Quebec)  J5W 1P5
    # Telephone: 450-589-0226
    # Fax: ...
    # Email line etc.

    phone_match = re.search(r'Telephone:\s*([^|]+)', text)
    phone = phone_match.group(1).strip() if phone_match else ''
    mna['phone'] = phone

    address_parts = []
    for part in text.split('|'):
        part = part.strip()
        if not part:
            continue
        if part.startswith('Telephone:'):
            continue
        if part.startswith('Fax:'):
            continue
        if '@' in part:
            continue
        # Skip the accessibility/extra notes
        if part.startswith("Accessible") or part.startswith("Questions about accessibility"):
            continue
        address_parts.append(part)

    mna['address'] = "\r\n".join(address_parts) if address_parts else ''


def extract_website_link(soup: BeautifulSoup, mna: dict):
    """
    On coordonnees pages, there may be a 'Website:' link for the Premier or ministers. [page:1]
    Example for Legault: https://www.quebec.ca/premier-ministre/premier-ministre/joindre-le-premier-ministre
    """
    website_link = None
    # Look for 'Website:' label then an <a> following it.
    for strong in soup.find_all(['strong', 'b']):
        label = strong.get_text(strip=True)
        if label.lower().startswith('website'):
            a = strong.find_next('a', href=True)
            if a:
                website_link = a['href']
                break

    mna['website'] = website_link if website_link else None


def extract_contact_details(mna: dict):
    """
    Extract:
    - photo_url
    - secondary_roles (current)
    - main electoral division office address + phone
    - website (if present)
    """
    try:
        soup = get_soup(mna['coordonnees_url'])

        parse_secondary_roles_and_photo(soup, mna)
        parse_electoral_office_contact(soup, mna)
        extract_website_link(soup, mna)

        print(f"✓ Extracted contact details: {mna['name']}")
    except Exception as e:
        print(f"✗ Error extracting contact details for {mna.get('name', '?')}: {e}")
        # Fail-safe defaults
        mna.setdefault('photo_url', '')
        mna.setdefault('address', '')
        mna.setdefault('phone', '')
        mna.setdefault('secondary_roles', '{"current": []}')
        mna.setdefault('website', None)


def upload_to_supabase(mna_list):
    """Upload MNA data directly to Supabase politicians table"""
    if not supabase:
        print("✗ Supabase credentials not configured. Skipping upload.")
        return False

    try:
        print("\nStep 3: Cleaning existing Quebec MNA data...")
        supabase.table('politicians').delete().eq('organization', 'Assemblée nationale du Québec').execute()
        print("✓ Deleted existing Quebec MNA records")

        print(f"\nStep 4: Uploading {len(mna_list)} MNAs to Supabase...")

        for i, mna in enumerate(mna_list, 1):
            mna_record = {
                'id': mna.get('id', str(uuid.uuid4())),
                'organization': mna.get('organization', ''),
                'party': mna.get('party', ''),
                'district': mna.get('district', ''),
                'name': mna.get('name', ''),
                'primary_role_en': mna.get('primary_role_en', ''),
                'primary_role_fr': mna.get('primary_role_fr', ''),
                'office1_type': mna.get('office1_type'),
                'office1_address': mna.get('office1_address'),
                'office1_phone': mna.get('office1_phone'),
                'office2_type': mna.get('office2_type'),
                'office2_address': mna.get('office2_address'),
                'office2_phone': mna.get('office2_phone'),
                'email': mna.get('email', ''),
                'photo_url': mna.get('photo_url', ''),
                'source_url': mna.get('source_url', ''),
                'website': mna.get('website'),
                'facebook': mna.get('facebook'),
                'instagram': mna.get('instagram'),
                'twitter': mna.get('twitter'),
                'linkedin': mna.get('linkedin'),
                'youtube': mna.get('youtube'),
                'address': mna.get('address', ''),
                'phone': mna.get('phone', ''),
                'secondary_roles': mna.get('secondary_roles', json.dumps({"current": []}, ensure_ascii=False)),
            }

            response = supabase.table('politicians').insert(mna_record).execute()
            print(f"[{i}/{len(mna_list)}] ✓ Uploaded: {mna['name']}")

        print(f"\n✓ Successfully uploaded {len(mna_list)} MNAs to Supabase")
        return True
    except Exception as e:
        print(f"✗ Error uploading to Supabase: {e}")
        return False


def main():
    print("Starting Quebec Provincial MNA Scraper")
    print("=" * 50)

    # Step 1: Get all MNA base data
    print("\nStep 1: Scraping main MNA table...")
    mna_list = get_all_mna_rows()
    print(f"\nFound {len(mna_list)} MNAs")

    # Step 2: Enrich each MNA from coordonnees page
    print("\nStep 2: Extracting contact details from each MNA...")
    for i, mna in enumerate(mna_list, 1):
        print(f"\n[{i}/{len(mna_list)}] Processing: {mna['name']}")
        extract_contact_details(mna)

    upload_to_supabase(mna_list)
    print("=" * 50)
    print("Scraping complete!")


if __name__ == "__main__":
    main()
