import pandas as pd
import cloudscraper
from bs4 import BeautifulSoup
import time
from datetime import datetime
import json

class REQVerifier:
    def __init__(self):
        self.session = cloudscraper.create_scraper()
        self.base_url = "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx"
        self.results = []
        
    def verify_business(self, business_name):
        """Search and verify a business in REQ"""
        result = {
            'business_name': business_name,
            'timestamp': datetime.now().isoformat(),
            'found_in_req': False,
            'req_name': None,
            'neq': None,
            'status': None,
            'incorporation_date': None,
            'fraud_indicators': []
        }
        
        try:
            # Get search page
            response = self.session.get(self.base_url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Get form tokens
            viewstate = soup.find('input', {'name': '__VIEWSTATE'})
            if not viewstate:
                result['error'] = 'Could not load REQ form'
                return result
                
            # Prepare search
            form_data = {
                '__VIEWSTATE': viewstate.get('value', ''),
                '__EVENTVALIDATION': soup.find('input', {'name': '__EVENTVALIDATION'}).get('value', '') if soup.find('input', {'name': '__EVENTVALIDATION'}) else '',
                'ctl00$CPH_K1ZoneContenu1$Ligne1$txtNomEntreprise': business_name,
                'ctl00$CPH_K1ZoneContenu1$Ligne1$btnRechercher': 'Rechercher'
            }
            
            # Submit search
            search_response = self.session.post(self.base_url, data=form_data)
            search_soup = BeautifulSoup(search_response.text, 'html.parser')
            
            # Check for results
            results_table = search_soup.find('table', {'class': 'Grille'})
            if results_table:
                rows = results_table.find_all('tr')[1:]  # Skip header
                if rows:
                    # Get first result
                    cols = rows[0].find_all('td')
                    if len(cols) >= 3:
                        result['found_in_req'] = True
                        result['neq'] = cols[0].text.strip()
                        result['req_name'] = cols[1].text.strip()
                        result['status'] = cols[2].text.strip()
                        
                        # Check for fraud indicators
                        if result['req_name'].lower() != business_name.lower():
                            result['fraud_indicators'].append('Name mismatch')
                        if 'radiée' in result['status'].lower():
                            result['fraud_indicators'].append('Deregistered company')
            else:
                result['fraud_indicators'].append('Not found in REQ')
                
        except Exception as e:
            result['error'] = str(e)[:100]
            
        self.results.append(result)
        return result
    
    def verify_batch(self, businesses_df, max_count=20):
        """Verify a batch of businesses"""
        print(f"\n🔍 Starting REQ verification of {min(max_count, len(businesses_df))} businesses...")
        print("-" * 80)
        
        verified_count = 0
        suspicious_count = 0
        
        for idx, row in businesses_df.head(max_count).iterrows():
            business_name = row['Business Name']
            print(f"\n[{verified_count + 1}/{max_count}] Verifying: {business_name}")
            
            result = self.verify_business(business_name)
            
            if result['found_in_req']:
                print(f"  ✓ Found in REQ as: {result['req_name']} (NEQ: {result['neq']})")
                if result['fraud_indicators']:
                    print(f"  ⚠️  SUSPICIOUS: {', '.join(result['fraud_indicators'])}")
                    suspicious_count += 1
            else:
                print(f"  ❌ NOT FOUND in REQ - Potential phantom business!")
                suspicious_count += 1
                
            verified_count += 1
            time.sleep(1.5)  # Respectful delay
            
        # Save results
        results_df = pd.DataFrame(self.results)
        results_df.to_excel(f'REQ_VERIFICATION_RESULTS_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx', index=False)
        
        print(f"\n" + "="*80)
        print(f"VERIFICATION COMPLETE:")
        print(f"  Total verified: {verified_count}")
        print(f"  Suspicious/Not found: {suspicious_count} ({suspicious_count/verified_count*100:.1f}%)")
        print(f"  Results saved to: REQ_VERIFICATION_RESULTS_*.xlsx")
        
        return results_df

# Main execution
if __name__ == "__main__":
    print("REQ Business Verification System")
    print("="*50)
    
    # Load priority businesses
    try:
        df = pd.read_excel('PRIORITY_REQ_VERIFICATION.xlsx')
        print(f"✓ Loaded {len(df)} priority businesses")
    except:
        # Fallback to high value targets
        df = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx', sheet_name='High Value Targets')
        print(f"✓ Loaded {len(df)} high-value targets")
    
    # Initialize verifier
    verifier = REQVerifier()
    
    # Test with first 20 businesses
    results = verifier.verify_batch(df, max_count=20)
    
    # Show summary of suspicious findings
    if len(results) > 0:
        suspicious = results[results['fraud_indicators'].apply(lambda x: len(x) > 0)]
        if len(suspicious) > 0:
            print(f"\n🚨 SUSPICIOUS BUSINESSES FOUND:")
            for idx, row in suspicious.iterrows():
                print(f"\n{row['business_name']}:")
                print(f"  Issues: {', '.join(row['fraud_indicators'])}")
