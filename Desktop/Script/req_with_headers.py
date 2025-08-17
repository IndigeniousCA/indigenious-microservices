import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings()

# Try with browser-like headers
session = requests.Session()
session.verify = False
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
})

url = "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx"

print("Trying with browser headers...")
try:
    response = session.get(url)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success! Can access REQ")
    else:
        print(f"Still blocked: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")
