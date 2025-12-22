# Federal House of Commons MP Scraper

This scraper extracts contact information for all current Members of Parliament (MPs) from the Canadian House of Commons website.

## Data Source

- **XML Feed**: `https://www.ourcommons.ca/Members/en/search/XML`
- **Profile Pages**: `https://www.ourcommons.ca/Members/en/{first-name-last-name}({PersonID})#contact`

## Fields Collected

The scraper collects the following information for each MP:

- `organization`: "House of Commons (Federal)"
- `party`: Political party affiliation (e.g., "Conservative", "Liberal")
- `district`: Electoral district/constituency name
- `name`: Full name of the MP
- `primary_role_en`: "Member of Parliament"
- `primary_role_fr`: "Député"
- `address`: Constituency office address
- `phone`: Constituency office phone number
- `email`: Official parliamentary email
- `photo_url`: URL to official MP photo
- `source_url`: Link to MP's profile page
- `website`: Personal/constituency website

## Usage

### Prerequisites

Install required packages:

```bash
pip install requests beautifulsoup4
```

### Running the Scraper

```bash
python federal-house-commons.py
```

The scraper will:
1. Fetch the XML feed with all active MPs
2. Parse basic information (name, district, party)
3. Visit each MP's profile page to extract contact details
4. Generate a CSV file: `federal_house_commons_mps.csv`

### Configuration

Environment variables (optional):

- `OURCOMMONS_SSL_VERIFY`: Set to 'false' to disable SSL verification (default: 'true')
- `OURCOMMONS_CA_BUNDLE`: Path to custom CA bundle
- `OURCOMMONS_SSL_FALLBACK`: Set to 'true' to retry with SSL disabled on failure (default: 'false')

## Output

The scraper generates a CSV file with all collected data. Only currently active MPs (those with no end date in their term) are included.

## Rate Limiting

The scraper includes a 1-second delay between requests to be respectful to the server.

## Notes

- The scraper filters out former MPs by checking for active status (ToDateTime is nil in XML)
- Constituency office information is prioritized over Hill office for phone and address
- The French term for "Member of Parliament" is "Député" (gender-neutral form used)
