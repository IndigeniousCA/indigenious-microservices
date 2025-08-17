from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import time
import logging
from datetime import datetime
import json

class REQSeleniumScraper:
    def __init__(self):
        self.setup_logging()
        self.setup_driver()
        self.results = []
        
    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_driver(self):
        """Setup Chrome driver"""
        options = webdriver.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        self.wait = WebDriverWait(self.driver, 20)
        
    def search_business(self, business_name):
        """Search for a business on REQ"""
        try:
            # Navigate to REQ main page
            self.logger.info(f"Searching for: {business_name}")
            self.driver.get("https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx")
            
            # Wait a bit for page to stabilize
            time.sleep(2)
            
            # Check if we're on the landing page with the blue button
            try:
                # Look for the blue "Accéder au service" button
                access_button = self.driver.find_element(By.XPATH, "//a[contains(text(), 'Accéder au service')]")
                if access_button:
                    self.logger.info("Found access button, clicking it")
                    access_button.click()
                    time.sleep(3)
            except:
                # We might already be on the search page
                pass
            
            # Now try to find the search box - wait for it to be clickable
            try:
                search_box = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//input[contains(@id, 'txtNomEntreprise')]"))
                )
                
                # Scroll to element
                self.driver.execute_script("arguments[0].scrollIntoView(true);", search_box)
                time.sleep(1)
                
                # Clear and type
                search_box.clear()
                search_box.send_keys(business_name)
                self.logger.info("Entered business name")
                
                # Look for and check the terms of service checkbox
                try:
                    # Try different selectors for the checkbox
                    checkbox_selectors = [
                        "//input[@type='checkbox']",
                        "//input[contains(@id, 'chk') and @type='checkbox']",
                        "//input[contains(@id, 'conditions') and @type='checkbox']",
                        "//input[contains(@name, 'conditions')]"
                    ]
                    
                    checkbox = None
                    for selector in checkbox_selectors:
                        try:
                            checkbox = self.driver.find_element(By.XPATH, selector)
                            if checkbox:
                                break
                        except:
                            continue
                    
                    if checkbox and not checkbox.is_selected():
                        self.logger.info("Found TOS checkbox, clicking it")
                        # Scroll to checkbox
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", checkbox)
                        time.sleep(0.5)
                        # Click it
                        self.driver.execute_script("arguments[0].click();", checkbox)
                        time.sleep(0.5)
                except Exception as e:
                    self.logger.warning(f"Could not find/click TOS checkbox: {e}")
                
                # Find and click search button
                search_button_selectors = [
                    "//input[@value='Rechercher']",
                    "//input[contains(@id, 'btnRechercher')]",
                    "//button[contains(text(), 'Rechercher')]",
                    "//input[@type='submit']"
                ]
                
                search_button = None
                for selector in search_button_selectors:
                    try:
                        search_button = self.driver.find_element(By.XPATH, selector)
                        if search_button:
                            break
                    except:
                        continue
                
                if search_button:
                    self.logger.info("Clicking search button")
                    self.driver.execute_script("arguments[0].click();", search_button)
                else:
                    self.logger.error("Could not find search button")
                    return {'found': False, 'error': 'Search button not found'}
                
                # Wait for results
                time.sleep(5)
                
                # Check results
                page_source = self.driver.page_source
                
                if "aucun résultat" in page_source.lower() or "aucune entreprise" in page_source.lower():
                    self.logger.info(f"No results found for: {business_name}")
                    return {'found': False, 'reason': 'No results in REQ'}
                
                # Try to extract results
                try:
                    # Wait for results table
                    results_table = self.wait.until(
                        EC.presence_of_element_located((By.CLASS_NAME, "Grille"))
                    )
                    
                    rows = results_table.find_elements(By.TAG_NAME, "tr")
                    if len(rows) > 1:
                        first_row = rows[1]
                        cells = first_row.find_elements(By.TAG_NAME, "td")
                        if len(cells) >= 3:
                            result = {
                                'found': True,
                                'neq': cells[0].text.strip(),
                                'legal_name': cells[1].text.strip(),
                                'status': cells[2].text.strip()
                            }
                            self.logger.info(f"Found: {result['legal_name']} (NEQ: {result['neq']})")
                            return result
                except:
                    self.logger.info("Could not parse results table")
                    # Take screenshot to see what we got
                    self.driver.save_screenshot(f"results_{business_name.replace(' ', '_')}.png")
                    
                return {'found': True, 'reason': 'Results found but could not parse'}
                
            except Exception as e:
                self.logger.error(f"Error during search: {str(e)}")
                # Take screenshot for debugging
                self.driver.save_screenshot(f"error_{business_name.replace(' ', '_')}.png")
                return {'found': False, 'error': str(e)}
                
        except Exception as e:
            self.logger.error(f"Navigation error: {str(e)}")
            return {'found': False, 'error': str(e)}
    
    def test_single_business(self, business_name):
        """Test with a single business"""
        self.logger.info(f"Testing single business: {business_name}")
        result = self.search_business(business_name)
        print(f"\nResult: {result}")
        return result
    
    def process_businesses(self, excel_file, sheet_name='High Value Targets', limit=None):
        """Process businesses from Excel file"""
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        if limit:
            df = df.head(limit)
            
        self.logger.info(f"Processing {len(df)} businesses")
        
        for idx, row in df.iterrows():
            self.logger.info(f"\n[{idx+1}/{len(df)}] Processing: {row['Business Name']}")
            
            result = {
                'original_name': row['Business Name'],
                'category': row['Category'],
                'has_address': row['Has Address'],
                'search_time': datetime.now().isoformat()
            }
            
            search_result = self.search_business(row['Business Name'])
            result.update(search_result)
            
            self.results.append(result)
            
            # Respectful delay
            time.sleep(3)
        
        # Save results
        self.save_results()
        
        # Print summary
        self.print_summary()
        
    def save_results(self):
        """Save results to files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON
        with open(f'req_results_{timestamp}.json', 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        # Save Excel
        df = pd.DataFrame(self.results)
        df.to_excel(f'req_results_{timestamp}.xlsx', index=False)
        
        self.logger.info(f"Results saved to req_results_{timestamp}.json and .xlsx")
        
    def print_summary(self):
        """Print summary of results"""
        found = len([r for r in self.results if r.get('found', False)])
        not_found = len(self.results) - found
        
        print(f"\n{'='*60}")
        print(f"SUMMARY:")
        print(f"Total processed: {len(self.results)}")
        print(f"Found in REQ: {found}")
        print(f"Not found: {not_found}")
        
        if not_found > 0:
            print(f"\nBusinesses NOT found in REQ:")
            for r in self.results:
                if not r.get('found', False):
                    print(f"  - {r['original_name']} ({r['category']})")
        
        print(f"{'='*60}")
        
    def __del__(self):
        """Clean up"""
        if hasattr(self, 'driver'):
            self.driver.quit()

# Test with just one business first
if __name__ == "__main__":
    scraper = REQSeleniumScraper()
    
    # Test with a single business first
    print("Testing with single business...")
    scraper.test_single_business("Blackned Construction 2015 inc. 9 Pontax")
    
    # If that works, uncomment below to process more:
    # scraper.process_businesses(
    #     'INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx',
    #     sheet_name='High Value Targets',
    #     limit=5
    # )
