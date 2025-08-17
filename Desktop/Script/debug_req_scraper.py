import pandas as pd
import cloudscraper
from bs4 import BeautifulSoup
import time

print("DEBUG: REQ Scraper Test")
print("="*50)

# Test businesses we KNOW exist
known_businesses = [
    "Desjardins",  # We know this exists
    "Hydro-Québec",  # Definitely exists
    "Metro",  # Grocery chain
    "Couche-Tard"  # Convenience store chain
]

session = cloudscraper.create_scraper()
base_url = "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx"

print("Testing connection to REQ...")
try:
    response = session.get(base_url)
    print(f"✓ Connected! Status code: {response.status_code}")
    print(f"✓ Page length: {len(response.text)} characters")
    
    # Check if we're being blocked
    if "cloudflare" in response.text.lower():
        print("⚠️  Cloudflare detected")
    if "captcha" in response.text.lower():
        print("⚠️  CAPTCHA detected")
    if "blocked" in response.text.lower() or "denied" in response.text.lower():
        print("⚠️  Possible blocking detected")
        
    # Try to find the search form
    soup = BeautifulSoup(response.text, 'html.parser')
    search_box = soup.find('input', {'id': lambda x: x and 'txtNomEntreprise' in x})
    if search_box:
        print("✓ Found search box!")
    else:
        print("❌ Cannot find search box - form might have changed")
        
    # Look for form elements
    viewstate = soup.find('input', {'name': '__VIEWSTATE'})
    if viewstate:
        print(f"✓ Found ViewState (length: {len(viewstate.get('value', ''))})")
    else:
        print("❌ No ViewState found - form might be different")
        
except Exception as e:
    print(f"❌ Error connecting: {e}")

print("\n" + "-"*50)
print("Let's check the page manually...")
print("Go to: https://www.registreentreprises.gouv.qc.ca")
print("Try searching for 'Desjardins' manually")
print("Does it work in your browser?")
