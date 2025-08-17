import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import urllib3

# Disable SSL warnings
urllib3.disable_warnings()

def test_req_search(business_name):
    """Simple REQ search test"""
    session = requests.Session()
    session.verify = False
    
    base_url = "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx"
    
    try:
        # Get the search page
        print(f"Loading REQ search page...")
        response = session.get(base_url, timeout=10)
        print(f"Status code: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Check if we got the form
        viewstate = soup.find('input', {'name': '__VIEWSTATE'})
        if not viewstate:
            print("ERROR: Cannot find form fields")
            return None
            
        print("Form loaded successfully")
        
        # Prepare search
        form_data = {
            '__VIEWSTATE': viewstate.get('value', ''),
            '__EVENTVALIDATION': soup.find('input', {'name': '__EVENTVALIDATION'}).get('value', '') if soup.find('input', {'name': '__EVENTVALIDATION'}) else '',
            '__EVENTTARGET': '',
            '__EVENTARGUMENT': '',
            'ctl00$CPH_K1ZoneContenu1$Ligne1$txtNomEntreprise': business_name,
            'ctl00$CPH_K1ZoneContenu1$Ligne1$btnRechercher': 'Rechercher'
        }
        
        print(f"Searching for: {business_name}")
        search_response = session.post(base_url, data=form_data, timeout=10)
        print(f"Search response status: {search_response.status_code}")
        
        # Return the response text for analysis
        return search_response.text
        
    except Exception as e:
        print(f"ERROR: {e}")
        return None

# Test with one business
print("="*60)
print("REQ ACCESS TEST")
print("="*60)

# Test with first business from your list
test_business = "Blackned Construction 2015 inc. 9 Pontax"
result = test_req_search(test_business)

if result:
    print(f"\nResponse length: {len(result)} characters")
    
    # Check what we got back
    if 'aucun résultat' in result.lower():
        print("Result: NO RESULTS FOUND")
    elif 'class="Grille"' in result:
        print("Result: FOUND RESULTS TABLE")
        # Try to extract first result
        soup = BeautifulSoup(result, 'html.parser')
        table = soup.find('table', {'class': 'Grille'})
        if table:
            rows = table.find_all('tr')[1:2]  # First result only
            for row in rows:
                cols = row.find_all('td')
                if cols:
                    print(f"NEQ: {cols[0].text.strip()}")
                    print(f"Name: {cols[1].text.strip()}")
    else:
        print("Result: UNCLEAR - saving response for inspection")
        with open('req_response.html', 'w') as f:
            f.write(result)
        print("Saved to req_response.html")
