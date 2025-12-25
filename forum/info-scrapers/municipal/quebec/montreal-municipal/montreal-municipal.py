import requests
from bs4 import BeautifulSoup
import csv
import time
from urllib.parse import urljoin
import unicodedata

BASE_URL = "https://montreal.ca"
LISTING_URL_EN = f"{BASE_URL}/en/elected-officials"
LISTING_URL_FR = f"{BASE_URL}/elus"
DELAY_BETWEEN_REQUESTS = 1  # Be respectful to the server

def get_soup(url):
    """Fetch and parse HTML from URL"""
    print(f"Fetching: {url}")
    response = requests.get(url)
    response.raise_for_status()
    time.sleep(DELAY_BETWEEN_REQUESTS)
    return BeautifulSoup(response.content, 'html.parser')

def get_all_official_urls():
    """Scrape all pages to get URLs of all elected officials"""
    official_urls = []
    page = 0
    max_pages = 12  # safety cap
    
    while page < max_pages:
        # First page has no page parameter
        url = LISTING_URL_EN if page == 0 else f"{LISTING_URL_EN}?page={page}"
        
        try:
            soup = get_soup(url)
            
            # Find all links to elected officials
            # Look for links in the listing that go to /en/elected-officials/[name-id]
            links = soup.find_all('a', href=True)
            page_officials = []
            page_officials_total = 0
            
            for link in links:
                href = link['href']
                # Filter for elected official profile pages
                norm = None
                if href.startswith('/en/elected-officials/') and href != '/en/elected-officials':
                    norm = href
                elif href.startswith('/elus/') and href != '/elus':
                    # Normalize French profile URLs to English to keep downstream extraction logic
                    norm = href.replace('/elus/', '/en/elected-officials/')

                if norm:
                    page_officials_total += 1
                    full_url = urljoin(BASE_URL, norm)
                    if full_url not in official_urls:
                        page_officials.append(full_url)
            
            if page_officials_total == 0:
                # This page has no profile links at all; we've reached the end
                break
                
            official_urls.extend(page_officials)
            print(f"Page {page}: {page_officials_total} links, {len(page_officials)} new (Total: {len(official_urls)})")
            
            page += 1
            
        except Exception as e:
            print(f"Error on page {page}: {e}")
            break
    
    return official_urls

def extract_official_data(url_en):
    """Extract data from both English and French versions of an official's page"""
    
    # Get French URL by replacing /en/ with /fr/
    url_fr = url_en.replace('/en/elected-officials/', '/elus/')
    
    data = {
        'source_url': url_en,
        'name': '',
        'party': '',
        'district': '',
        'organization': 'Conseil municipal de Montréal',
        'primary_role_en': '',
        'primary_role_fr': '',
        'phone': '',
        'email': '',
        'address': '',
        'photo_url': ''
    }
    
    borough = ''  # Track borough separately for fallback
    
    try:
        # Scrape English page
        soup_en = get_soup(url_en)
        
        # Extract name (from h1)
        h1 = soup_en.find('h1', class_='mb-2')
        if h1:
            data['name'] = h1.get_text(strip=True)
        
        # Extract primary role (English)
        role_div = soup_en.find('div', class_='font-size-lg text-dark mb-4')
        if role_div:
            role_text = role_div.find('div')
            if role_text:
                data['primary_role_en'] = role_text.get_text(strip=True)
        
        # Extract party, borough, district from list items
        list_items = soup_en.find_all('div', class_='list-item list-item-description')
        for item in list_items:
            label_div = item.find('div', class_='list-item-label')
            # Find all list-item-content divs and get the last one (the actual value)
            content_divs = item.find_all('div', class_='list-item-content')
            
            if label_div and content_divs:
                label = label_div.get_text(strip=True)
                # The last list-item-content div contains the actual value
                content = content_divs[-1].get_text(strip=True)
                
                if label == 'Party':
                    data['party'] = content
                elif label == 'Borough':
                    borough = content
                elif label == 'District':
                    data['district'] = content
        
        # If no district, use borough as fallback
        if not data['district'] and borough:
            data['district'] = borough
        
        # Extract photo URL
        img = soup_en.find('img', class_='img-fluid rounded-circle')
        if img and img.get('src'):
            data['photo_url'] = img['src']
        
        # Extract email - Try global search for mailto link first as it's most reliable
        mailto_link = soup_en.find('a', href=lambda x: x and x.startswith('mailto:'))
        if mailto_link:
            mailto = mailto_link['href']
            data['email'] = mailto.replace('mailto:', '').split('?')[0]
        
        # Fallback: Construct email from name if not found
        if not data['email'] and data['name']:
            # Pattern: firstname.lastname@montreal.ca
            # Rules: Lowercase, remove accents, First token and Last token (ignoring middle names)
            try:
                def normalize_text(text):
                    return ''.join(c for c in unicodedata.normalize('NFD', text)
                                 if unicodedata.category(c) != 'Mn').lower()
                
                name_parts = data['name'].split()
                if len(name_parts) >= 2:
                    first = normalize_text(name_parts[0])
                    last = normalize_text(name_parts[-1])
                    data['email'] = f"{first}.{last}@montreal.ca"
                    print(f"  ⚠ Generated fallback email: {data['email']}")
            except Exception as e:
                print(f"  ✗ Error generating fallback email: {e}")

        # Extract contact information
        # Find the section with "Contact" in the title, or fallback to first sb-block
        contact_section = None
        sb_blocks = soup_en.find_all('section', class_='sb-block')
        
        for section in sb_blocks:
            title = section.find(['h2', 'div'], class_='sidebar-title')
            if title and 'Contact' in title.get_text():
                contact_section = section
                break
        
        # Fallback to first block if no Contact section found (legacy behavior)
        if not contact_section and sb_blocks:
            contact_section = sb_blocks[0]

        if contact_section:
            list_items_contact = contact_section.find_all('div', class_='list-item-icon')
            
            for item in list_items_contact:
                # Check for phone
                phone_icon = item.find('span', class_='icon-phone')
                if phone_icon:
                    phone_content = item.find('div', class_='list-item-icon-content')
                    if phone_content:
                        phone_label = phone_content.find('div', class_='list-item-icon-label')
                        if phone_label:
                            data['phone'] = phone_label.get_text(strip=True)
                
                # Check for address (location icon)
                location_icon = item.find('span', class_='icon-location')
                if location_icon:
                    addr_content = item.find('div', class_='list-item-icon-content')
                    if addr_content:
                        # Get the inner div with address
                        addr_div = addr_content.find('div')
                        if addr_div:
                            # Clean up the address (remove extra whitespace/newlines)
                            address_text = addr_div.get_text(separator=' ', strip=True)
                            data['address'] = address_text
        
        # Scrape French page for primary_role_fr
        soup_fr = get_soup(url_fr)
        role_div_fr = soup_fr.find('div', class_='font-size-lg text-dark mb-4')
        if role_div_fr:
            role_text_fr = role_div_fr.find('div')
            if role_text_fr:
                data['primary_role_fr'] = role_text_fr.get_text(strip=True)
        
        print(f"✓ Extracted: {data['name']}")
        
    except Exception as e:
        print(f"✗ Error extracting data from {url_en}: {e}")
    
    return data

def main():
    print("Starting Montreal Elected Officials Scraper")
    print("=" * 50)
    
    # Step 1: Get all official URLs
    print("\nStep 1: Collecting all elected official URLs...")
    official_urls = get_all_official_urls()
    print(f"\nFound {len(official_urls)} elected officials")
    
    # Step 2: Extract data from each official
    print("\nStep 2: Extracting data from each official...")
    all_data = []
    
    for i, url in enumerate(official_urls, 1):
        print(f"\n[{i}/{len(official_urls)}] Processing: {url}")
        data = extract_official_data(url)
        all_data.append(data)
    
    # Step 3: Write to CSV
    print("\nStep 3: Writing data to CSV...")
    output_file = 'montreal_elected_officials.csv'
    
    fieldnames = [
        'party',
        'district',
        'organization',
        'name',
        'primary_role_en',
        'primary_role_fr',
        'phone',
        'email',
        'address',
        'photo_url',
        'source_url'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_data)
    
    print(f"\n✓ Successfully wrote {len(all_data)} officials to {output_file}")
    print("=" * 50)
    print("Scraping complete!")

if __name__ == "__main__":
    main()
