import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class REQVerifier:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False  # Bypass SSL
        self.base_url = "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx"
        self.results = []
        
    def search_business(self, business_name):
        """Search for a business in REQ"""
        try:
            # Get search form
            response = self.session.get(self.base_url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract form tokens
            viewstate = soup.find('input', {'name': '__VIEWSTATE'})
            eventvalidation = soup.find('input', {'name': '__EVENTVALIDATION'})
            
            if not viewstate:
                return {'found': False, 'error': 'Form not loaded'}
            
            # Submit search
            search_data = {
                '__VIEWSTATE': viewstate.get('value', ''),
                '__EVENTVALIDATION': eventvalidation.get('value', '') if eventvalidation else '',
                'ctl00$CPH_K1ZoneContenu1$Ligne1$txtNomEntreprise': business_name,
                'ctl00$CPH_K1ZoneContenu1$Ligne1$btnRechercher': 'Rechercher'
            }
            
            search_response = self.session.post(self.base_url, data=search_data)
            search_soup = BeautifulSoup(search_response.text, 'html.parser')
            
            # Check results
            if 'aucun résultat' in search_response.text.lower():
                return {'found': False, 'reason': 'No results in REQ'}
            
            results_table = search_soup.find('table', {'class': 'Grille'})
            if results_table:
                rows = results_table.find_all('tr')[1:]  # Skip header
                if rows:
                    first_row = rows[0].find_all('td')
                    if len(first_row) >= 3:
                        return {
                            'found': True,
                            'neq': first_row[0].text.strip(),
                            'name': first_row[1].text.strip(),
                            'status': first_row[2].text.strip()
                        }
            
            return {'found': False, 'reason': 'No clear results'}
            
        except Exception as e:
            return {'found': False, 'error': str(e)[:100]}

print("REQ Business Verification System")
print("="*50)

# Load businesses
df = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx', sheet_name='High Value Targets')
print(f"Loaded {len(df)} high-value businesses")

# Test with first 20
verifier = REQVerifier()
results = []

print(f"\nVerifying businesses...")
print("-"*80)

for idx, row in df.head(20).iterrows():
    business_name = row['Business Name']
    print(f"\n[{idx+1}/20] Checking: {business_name}")
    
    result = verifier.search_business(business_name)
    
    if result['found']:
        print(f"  ✓ FOUND: {result['name']} (NEQ: {result['neq']})")
        status = 'FOUND'
    else:
        print(f"  ❌ NOT FOUND: {result.get('reason', result.get('error', 'Unknown'))}")
        status = 'NOT FOUND - SUSPICIOUS'
    
    results.append({
        'Business Name': business_name,
        'Category': row['Category'],
        'Status': status,
        'REQ Found': result['found'],
        'NEQ': result.get('neq', ''),
        'REQ Name': result.get('name', ''),
        'Details': result.get('reason', result.get('error', ''))
    })
    
    time.sleep(1.5)  # Respectful delay

# Save results
results_df = pd.DataFrame(results)
results_df.to_excel('REQ_VERIFICATION_ACTUAL_RESULTS.xlsx', index=False)

# Analysis
found = len([r for r in results if r['REQ Found']])
not_found = len(results) - found

print(f"\n" + "="*80)
print(f"VERIFICATION COMPLETE:")
print(f"  Total checked: {len(results)}")
print(f"  Found in REQ: {found} ({found/len(results)*100:.0f}%)")
print(f"  NOT FOUND: {not_found} ({not_found/len(results)*100:.0f}%)")

if not_found > 0:
    print(f"\n🚨 SUSPICIOUS BUSINESSES NOT IN REQ:")
    for r in results:
        if not r['REQ Found']:
            print(f"  - {r['Business Name']} ({r['Category']})")

print(f"\n💰 FRAUD EXPOSURE ESTIMATE:")
print(f"  {not_found} phantom businesses x $300K average = ${not_found * 300000:,.0f}")

print(f"\n✅ Full results saved to: REQ_VERIFICATION_ACTUAL_RESULTS.xlsx")
