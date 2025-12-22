# Quebec Provincial MNA Scraper

This scraper collects information about Members of the National Assembly (MNAs) of Quebec from the official website.

## Source

- Main listing: https://www.assnat.qc.ca/en/deputes/index.html
- Individual profiles: https://www.assnat.qc.ca/en/deputes/[name-id]/coordonnees.html

## Data Collected

- Organization (Political affiliation)
- Name
- Electoral division (District)
- Email
- Primary role (English and French)
- Address
- Phone number
- Photo URL
- Source URL

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python quebec-provincial.py
```

This will create a CSV file named `quebec_provincial_mnas.csv` with all the MNA data.

## Output Format

The CSV will contain the following columns:
- organization
- name
- district
- email
- primary_role_en
- primary_role_fr
- address
- phone
- photo_url
- source_url
