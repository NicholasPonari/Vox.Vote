"""
Toronto City Council Scraper
Scrapes councillor and mayor information from toronto.ca
"""

import csv
import re
import time
import requests
from bs4 import BeautifulSoup

COUNCILLORS_LIST_URL = "https://www.toronto.ca/city-government/council/members-of-council/"
MAYOR_CONTACT_URL = "https://www.toronto.ca/city-government/council/office-of-the-mayor/"
MAYOR_ABOUT_URL = "https://www.toronto.ca/city-government/council/office-of-the-mayor/about-mayor/"

OUTPUT_FILE = "toronto_council.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def get_soup(url: str) -> BeautifulSoup:
    """Fetch a URL and return a BeautifulSoup object."""
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def get_councillor_links() -> list[dict]:
    """Get all councillor page URLs from the main listing page."""
    soup = get_soup(COUNCILLORS_LIST_URL)
    
    councillors = []
    seen_urls = set()
    
    # First try the table structure
    table = soup.find("table", id="js_map--data")
    if table:
        tbody = table.find("tbody")
        if tbody:
            rows = tbody.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if len(cells) >= 2:
                    link_tag = cells[1].find("a")
                    if link_tag and link_tag.get("href"):
                        url = link_tag["href"]
                        if url not in seen_urls:
                            seen_urls.add(url)
                            councillors.append({
                                "url": url,
                                "ward_name": cells[0].get_text(strip=True)
                            })
    
    # Fallback: find all links matching councillor-ward pattern
    if not councillors:
        councillor_links = soup.find_all("a", href=re.compile(r"councillor-ward-\d+"))
        for link in councillor_links:
            url = link["href"]
            if url not in seen_urls:
                seen_urls.add(url)
                # Extract ward number from URL for sorting
                councillors.append({
                    "url": url,
                    "ward_name": ""  # Will be fetched from individual page
                })
        
        # Sort by ward number
        councillors.sort(key=lambda x: int(re.search(r"ward-(\d+)", x["url"]).group(1)))
    
    return councillors


def scrape_councillor(url: str, ward_name: str) -> dict:
    """Scrape individual councillor page for details."""
    soup = get_soup(url)
    
    # Name from h1#page-header--title
    name = ""
    h1 = soup.find("h1", id="page-header--title")
    if h1:
        name = h1.get_text(strip=True)
        # Remove "Councillor " prefix if present
        name = re.sub(r"^Councillor\s+", "", name)
    
    # District from #page-content h2
    district = ward_name  # fallback to ward_name from table
    page_content = soup.find("div", id="page-content")
    if page_content:
        h2 = page_content.find("h2")
        if h2:
            district = h2.get_text(strip=True)
    
    # Photo URL from #page-content img
    photo_url = ""
    if page_content:
        img = page_content.find("img")
        if img and img.get("src"):
            photo_url = img["src"]
    
    # Contact info is in a separate sidebar URL
    address = ""
    phone = ""
    email = ""
    
    # Fetch the sidebar page for contact info
    sidebar_url = url.rstrip("/") + "/sidebar/"
    try:
        sidebar_soup = get_soup(sidebar_url)
        contact_paragraphs = sidebar_soup.find_all("p", class_="contact-information")
        
        # Look for constituency office (preferred) or use first contact block
        constituency_p = None
        city_hall_p = None
        
        for p in contact_paragraphs:
            text = p.get_text()
            if "Constituency Office" in text:
                constituency_p = p
            elif "Toronto City Hall" in text or "City Hall" in text:
                city_hall_p = p
        
        # Use constituency office if available, otherwise city hall
        contact_p = constituency_p or city_hall_p or (contact_paragraphs[0] if contact_paragraphs else None)
        
        if contact_p:
            text = contact_p.get_text()
            html_content = str(contact_p)
            
            # Extract address - get lines after the office name
            # Pattern: OfficeName</strong><br/>Address Line 1<br>Address Line 2<br/>
            address_lines = []
            
            # Find all text between <br> tags after </strong>
            strong_end = html_content.find("</strong>")
            if strong_end != -1:
                after_strong = html_content[strong_end:]
                # Split by <br> variations and clean up
                parts = re.split(r"<br\s*/?>", after_strong)
                for part in parts[1:]:  # Skip the </strong> part
                    clean = BeautifulSoup(part, "html.parser").get_text(strip=True)
                    # Stop at known non-address fields
                    if any(x in clean.lower() for x in ["telephone:", "email:", "hours of operation", "fax:"]):
                        break
                    if clean and not clean.startswith("<"):
                        address_lines.append(clean)
            
            if address_lines:
                address = ", ".join(address_lines[:2])  # Take first 2 lines (street + city)
            
            # Extract phone from the contact paragraph
            phone_link = contact_p.find("a", class_="phonelink")
            if phone_link:
                phone = phone_link.get_text(strip=True)
            else:
                phone_match = re.search(r"Telephone:.*?([\d\-\(\)\s]+)", text)
                if phone_match:
                    phone = phone_match.group(1).strip()
        
        # Email - get from any contact paragraph (usually in city hall block)
        for p in contact_paragraphs:
            email_link = p.find("a", href=re.compile(r"^mailto:"))
            if email_link:
                email = email_link.get_text(strip=True)
                break
                
    except Exception as e:
        print(f"    Warning: Could not fetch sidebar: {e}")
    
    return {
        "organization": "Toronto City Council",
        "district": district,
        "name": name,
        "primary_role_en": "City Councillor",
        "address": address,
        "phone": phone,
        "email": email,
        "photo_url": photo_url,
        "source_url": url
    }


def scrape_mayor() -> dict:
    """Scrape mayor information from their pages."""
    address = ""
    phone = ""
    email = ""
    
    # Get contact info from sidebar URL
    sidebar_url = MAYOR_CONTACT_URL.rstrip("/") + "/sidebar/"
    try:
        sidebar_soup = get_soup(sidebar_url)
        contact_paragraphs = sidebar_soup.find_all("p", class_="contact-information")
        
        for p in contact_paragraphs:
            text = p.get_text()
            html_content = str(p)
            
            # Look for Office of the Mayor section for address and phone
            if "Office of the Mayor" in text:
                # Extract address lines
                address_lines = []
                strong_end = html_content.find("</strong>")
                if strong_end != -1:
                    after_strong = html_content[strong_end:]
                    parts = re.split(r"<br\s*/?>", after_strong)
                    for part in parts[1:]:
                        clean = BeautifulSoup(part, "html.parser").get_text(strip=True)
                        if any(x in clean.lower() for x in ["telephone:", "email:", "fax:"]):
                            break
                        if clean and not clean.startswith("<"):
                            address_lines.append(clean)
                
                if address_lines:
                    address = ", ".join(address_lines[:3])  # Take first 3 lines
                
                # Extract phone
                phone_link = p.find("a", class_="phonelink")
                if phone_link:
                    phone = phone_link.get_text(strip=True)
            
            # Extract email from any paragraph
            email_link = p.find("a", href=re.compile(r"^mailto:"))
            if email_link and not email:
                email = email_link.get_text(strip=True)
                
    except Exception as e:
        print(f"    Warning: Could not fetch mayor sidebar: {e}")
    
    # Get name and photo from about page
    soup_about = get_soup(MAYOR_ABOUT_URL)
    
    name = ""
    photo_url = ""
    
    # Name from h3 containing "Mayor of Toronto"
    h3_tags = soup_about.find_all("h3")
    for h3 in h3_tags:
        text = h3.get_text(strip=True)
        if "Mayor of Toronto" in text:
            # Extract just the name (before the comma)
            name_match = re.match(r"^([^,]+)", text)
            if name_match:
                name = name_match.group(1).strip()
            break
    
    # Photo - find img with "Mayor" or "Olivia" in alt text
    imgs = soup_about.find_all("img")
    for img in imgs:
        alt = img.get("alt", "")
        if "Olivia" in alt or "Mayor" in alt:
            photo_url = img.get("src", "")
            break
    
    return {
        "organization": "Toronto City Council",
        "district": "Toronto",
        "name": name,
        "primary_role_en": "Mayor of Toronto",
        "address": address,
        "phone": phone,
        "email": email,
        "photo_url": photo_url,
        "source_url": MAYOR_CONTACT_URL
    }


def main():
    """Main function to run the scraper."""
    print("Starting Toronto City Council scraper...")
    
    all_members = []
    
    # Scrape mayor first
    print("Scraping mayor information...")
    try:
        mayor = scrape_mayor()
        all_members.append(mayor)
        print(f"  ✓ {mayor['name']}")
    except Exception as e:
        print(f"  ✗ Error scraping mayor: {e}")
    
    # Get councillor links
    print("\nGetting councillor list...")
    councillor_links = get_councillor_links()
    print(f"Found {len(councillor_links)} councillors")
    
    # Scrape each councillor
    print("\nScraping councillor pages...")
    for i, councillor_info in enumerate(councillor_links, 1):
        url = councillor_info["url"]
        ward = councillor_info["ward_name"]
        try:
            data = scrape_councillor(url, ward)
            all_members.append(data)
            print(f"  {i}/{len(councillor_links)} ✓ {data['name']} ({data['district']})")
            time.sleep(0.5)  # Be polite to the server
        except Exception as e:
            print(f"  {i}/{len(councillor_links)} ✗ Error scraping {url}: {e}")
    
    # Write to CSV
    print(f"\nWriting {len(all_members)} records to {OUTPUT_FILE}...")
    fieldnames = [
        "organization",
        "district",
        "name",
        "primary_role_en",
        "address",
        "phone",
        "email",
        "photo_url",
        "source_url"
    ]
    
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_members)
    
    print("Done!")


if __name__ == "__main__":
    main()
