"""
Ottawa City Council Scraper
Scrapes councillor and mayor information from ottawa.ca
"""

import csv
import re
import time
import requests
from bs4 import BeautifulSoup

# To do: remove the wards in front of the district

BASE_URL = "https://ottawa.ca"
COUNCIL_LIST_URL = "https://ottawa.ca/en/city-hall/mayor-and-city-councillors"
OUTPUT_FILE = "ottawa_council.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0"
}


def get_soup(url: str) -> BeautifulSoup:
    """Fetch a URL and return a BeautifulSoup object."""
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def extract_photo_url(card: BeautifulSoup) -> str:
    """Extract the best quality photo URL from a card."""
    # Try to get the largest image from picture source
    picture = card.find("picture")
    if picture:
        # Get the first source (usually largest)
        source = picture.find("source")
        if source and source.get("srcset"):
            srcset = source["srcset"]
            # Take the first URL (1x version)
            url = srcset.split()[0]
            if url.startswith("/"):
                return BASE_URL + url
            return url
        
        # Fallback to img tag
        img = picture.find("img")
        if img and img.get("src"):
            src = img["src"]
            if src.startswith("/"):
                return BASE_URL + src
            return src
    
    return ""


def extract_address(soup: BeautifulSoup) -> str:
    """Extract address from an individual member's page."""
    address_field = soup.find("div", class_="field--name-field-address")
    if not address_field:
        return ""
    
    address_parts = []
    
    # Get structured address parts
    line1 = address_field.find("span", class_="address-line1")
    line2 = address_field.find("span", class_="address-line2")
    locality = address_field.find("span", class_="locality")
    admin_area = address_field.find("span", class_="administrative-area")
    postal = address_field.find("span", class_="postal-code")
    
    if line1:
        address_parts.append(line1.get_text(strip=True))
    if line2:
        address_parts.append(line2.get_text(strip=True))
    
    # Combine city, province, postal
    city_line = []
    if locality:
        city_line.append(locality.get_text(strip=True))
    if admin_area:
        city_line.append(admin_area.get_text(strip=True))
    if postal:
        city_line.append(postal.get_text(strip=True))
    
    if city_line:
        address_parts.append(" ".join(city_line))
    
    return ", ".join(address_parts)


def scrape_council_list() -> list[dict]:
    """Scrape the main council listing page for basic info."""
    soup = get_soup(COUNCIL_LIST_URL)
    members = []
    
    # Find all member cards - they're in views-row divs within view-content
    cards = soup.find_all("div", class_="views-row")
    
    for card in cards:
        member = {}
        
        # Name and source URL from card-title link
        title_h3 = card.find("h3", class_="card-title")
        if not title_h3:
            continue
            
        link = title_h3.find("a")
        if link:
            member["name"] = link.get_text(strip=True)
            href = link.get("href", "")
            if href.startswith("/"):
                member["source_url"] = BASE_URL + href
            else:
                member["source_url"] = href
        else:
            member["name"] = title_h3.get_text(strip=True)
            member["source_url"] = ""
        
        # Role from card-subtitle-title
        role_h4 = card.find("h4", class_="card-subtitle-title")
        if role_h4:
            role_text = role_h4.get_text(strip=True)
            if role_text.lower() == "mayor":
                member["primary_role_en"] = "Mayor of Ottawa"
                member["district"] = "Ottawa"
            else:
                member["primary_role_en"] = "City Councillor"
                member["district"] = ""
        else:
            member["primary_role_en"] = "City Councillor"
            member["district"] = ""
        
        # Ward/district from mb-2 div (for councillors)
        if member["primary_role_en"] == "City Councillor":
            ward_div = card.find("div", class_="mb-2")
            if ward_div:
                # Get direct text, not nested content
                ward_text = ward_div.get_text(strip=True)
                if ward_text:
                    member["district"] = ward_text
        
        # Phone from tel: link
        phone_link = card.find("a", href=re.compile(r"^tel:"))
        if phone_link:
            member["phone"] = phone_link.get_text(strip=True)
        else:
            member["phone"] = ""
        
        # Email from mailto: link
        email_link = card.find("a", href=re.compile(r"^mailto:"))
        if email_link:
            member["email"] = email_link.get_text(strip=True)
        else:
            member["email"] = ""
        
        # Photo URL
        member["photo_url"] = extract_photo_url(card)
        
        # Organization is always the same
        member["organization"] = "Ottawa City Council"
        
        # Address will be fetched from individual page
        member["address"] = ""
        
        members.append(member)
    
    return members


def fetch_address_for_member(member: dict) -> str:
    """Fetch the address from a member's individual page."""
    if not member.get("source_url"):
        return ""
    
    try:
        soup = get_soup(member["source_url"])
        return extract_address(soup)
    except Exception as e:
        print(f"    Warning: Could not fetch address from {member['source_url']}: {e}")
        return ""


def main():
    """Main function to run the scraper."""
    print("Starting Ottawa City Council scraper...")
    
    # Get all members from listing page
    print(f"\nFetching council list from {COUNCIL_LIST_URL}...")
    members = scrape_council_list()
    print(f"Found {len(members)} members")
    
    # Fetch addresses from individual pages
    print("\nFetching addresses from individual pages...")
    for i, member in enumerate(members, 1):
        address = fetch_address_for_member(member)
        member["address"] = address
        print(f"  {i}/{len(members)} ✓ {member['name']} ({member['district'] or member['primary_role_en']})")
        time.sleep(0.5)  # Be polite to the server
    
    # Write to CSV
    print(f"\nWriting {len(members)} records to {OUTPUT_FILE}...")
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
        writer.writerows(members)
    
    print("Done!")


if __name__ == "__main__":
    main()
