import pandas as pd
import requests
from bs4 import BeautifulSoup
import urllib3
import ssl

# Disable SSL warnings (temporary fix)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

print("REQ Scraper with SSL Fix")
print("="*50)

# Create session with SSL workaround
session = requests.Session()
session.verify = False  # Temporary workaround

base_url = "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx"

print("Testing connection...")
try:
    response = session.get(base_url, verify=False)
    print(f"✓ Connected! Status code: {response.status_code}")
    
    soup = BeautifulSoup(response.text, 'html.parser')
    title = soup.find('title')
    if title:
        print(f"✓ Page title: {title.text.strip()}")
    
    # Check if search form exists
    if 'txtNomEntreprise' in response.text:
        print("✓ Search form found!")
    else:
        print("⚠️  Search form not found - page might have changed")
        
except Exception as e:
    print(f"Error: {e}")

print("\nNow let's test searching...")

# Test businesses from your list
test_businesses = [
    "Chalets Shipek",
    "Transport",
    "Construction"
]

for business in test_businesses[:1]:  # Test just one
    print(f"\n🔍 Searching for: {business}")
    
    try:
        # Get form page first
        form_response = session.get(base_url, verify=False)
        form_soup = BeautifulSoup(form_response.text, 'html.parser')
        
        # Extract form tokens
        viewstate = form_soup.find('input', {'name': '__VIEWSTATE'})
        eventvalidation = form_soup.find('input', {'name': '__EVENTVALIDATION'})
        
        if viewstate:
            print("✓ Found form tokens")
            
            # Prepare search
            search_data = {
                '__VIEWSTATE': viewstate.get('value', ''),
                '__EVENTVALIDATION': eventvalidation.get('value', '') if eventvalidation else '',
                'ctl00$CPH_K1ZoneContenu1$Ligne1$txtNomEntreprise': business,
                'ctl00$CPH_K1ZoneContenu1$Ligne1$btnRechercher': 'Rechercher'
            }
            
            # Submit search
            search_response = session.post(base_url, data=search_data, verify=False)
            search_soup = BeautifulSoup(search_response.text, 'html.parser')
            
            # Check for results
            if 'aucun résultat' in search_response.text.lower():
                print("❌ No results found")
            elif 'class="Grille"' in search_response.text:
                print("✓ Found results!")
                # Try to extract some data
                results_table = search_soup.find('table', {'class': 'Grille'})
                if results_table:
                    rows = results_table.find_all('tr')[1:3]  # First 2 results
                    for row in rows:
                        cols = row.find_all('td')
                        if len(cols) >= 2:
                            print(f"  - NEQ: {cols[0].text.strip()}, Name: {cols[1].text.strip()}")
            else:
                print("? Unclear if found results")
                
    except Exception as e:
        print(f"Search error: {str(e)[:100]}")
