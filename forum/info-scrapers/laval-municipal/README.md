# Laval Municipal Councilor Scraper

This scraper extracts contact information for all municipal councilors from the City of Laval website.

## Data Source

- **Main Listing**: `https://www.laval.ca/vie-democratique/hotel-de-ville-personnes-elues/membres-conseil-municipal/`
- **Profile Pages**: Individual councilor pages linked from the main listing

## Fields Collected

The scraper collects the following information for each councilor:

- `organization`: "Ville de Laval"
- `name`: Full name of the councilor
- `district`: Electoral district (e.g., "Saint-François") or "Laval" for the mayor
- `primary_role_en`: "Mayor of Laval" or "Councillor"
- `primary_role_fr`: "Maire de Laval" or "Conseiller"
- `email`: Official email address
- `phone`: Phone number
- `address`: Office address (from Hôtel de ville section)
- `photo_url`: URL to official photo
- `source_url`: Link to councilor's profile page

## Usage

### Prerequisites

Install required packages:

```bash
pip install requests beautifulsoup4
```

### Running the Scraper

```bash
python laval-municipal.py
```

The scraper will:
1. Fetch the main listing page with all councilors
2. Parse basic information (name, district, role, email, phone, photo)
3. Visit each councilor's profile page to extract the office address
4. Generate a CSV file: `laval_municipal_councilors.csv`

### Configuration

Environment variables (optional):

- `LAVAL_SSL_VERIFY`: Set to 'false' to disable SSL verification (default: 'true')
- `LAVAL_CA_BUNDLE`: Path to custom CA bundle
- `LAVAL_SSL_FALLBACK`: Set to 'true' to retry with SSL disabled on failure (default: 'false')

## Output

The scraper generates a CSV file with all collected data.

## Rate Limiting

The scraper includes a 1-second delay between requests to be respectful to the server.

## Notes

- The first entry in the listing is always the mayor
- District names are extracted from the format "District XX – DistrictName"
- The address is extracted from the "Hôtel de ville" section on each profile page
