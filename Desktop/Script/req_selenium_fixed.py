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
    def __init__(self, save_to_file=True):
        self.save_to_file = save_to_file
        self.setup_logging()
        self.setup_driver()
        self.results = []
        
    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('req_scraper.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_driver(self):
        """Setup Chrome driver with options"""
        options = webdriver.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        self.driver.implicitly_wait(10)  # Add implicit wait
        
    def search_business(self, business_name):
        """Search for a business on REQ"""
        try:
            # Navigate to REQ search page
            self.logger.info(f"Navigating to REQ for: {business_name}")
            self.driver.get("https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx")
            
            # Wait for page to fully load
            time.sleep(3)
            
            # Try to find search box with multiple strategies
            search_box = None
            search_selectors = [
                (By.ID, "CPH_K1ZoneContenu1_Ligne1_txtNomEntreprise"),
                (By.XPATH, "//input[contains(@id, 'txtNomEntreprise')]"),
                (By.XPATH, "//input[@type='text'][1]")
            ]
            
            for by, selector in search_selectors:
                try:
                    search_box = self.driver.find_element(by, selector)
                    if search_box:
                        self.logger.info(f"Found search box using {by}: {selector}")
                        break
                except:
                    continue
                    
            if not search_box:
                self.logger.error("Could not find search box")
                return None
            
            # Clear and enter business name
            search_box.clear()
            search_box.send_keys(business_name)
            time.sleep(1)
            
            # Find and click search button
            search_button = None
            button_selectors = [
                (By.ID, "CPH_K1ZoneContenu1_Ligne1_btnRechercher"),
                (By.XPATH, "//input[@value='Rechercher']"),
                (By.XPATH, "//input[@type='submit']")
            ]
            
            for by, selector in button_selectors:
                try:
                    search_button = self.driver.find_element(by, selector)
                    if search_button:
                        break
                except:
                    continue
                    
            if search_button:
                search_button.click()
            else:
                # Try submitting the form
                search_box.submit()
            
            # Wait for results
            time.sleep(3)
            
            # Check if we have results
            page_source = self.driver.page_source
            
            if "aucun résultat" in page_source.lower():
                self.logger.info(f"No results found for: {business_name}")
                return {'found': False, 'reason': 'No results in REQ'}
            
            # Try to extract basic info from results page
            business_info = {
                'found': True,
                'search_name': business_name,
                'page_title': self.driver.title
            }
            
            # Look for results table
            try:
                results_table = self.driver.find_element(By.CLASS_NAME, "Grille")
                rows = results_table.find_elements(By.TAG_NAME, "tr")
                if len(rows) > 1:  # Has results
                    first_row = rows[1]
                    cells = first_row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 3:
                        business_info['neq'] = cells[0].text.strip()
                        business_info['legal_name'] = cells[1].text.strip()
                        business_info['status'] = cells[2].text.strip()
                        self.logger.info(f"Found: {business_info['legal_name']} (NEQ: {business_info['neq']})")
            except:
                self.logger.info("Could not parse results table, but page loaded")
                
            return business_info
                
        except Exception as e:
            self.logger.error(f"Error searching for {business_name}: {str(e)}")
            return {'found': False, 'error': str(e)}
    
    def save_results_to_file(self):
        """Save results to JSON and Excel"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save as JSON
        with open(f'req_results_{timestamp}.json', 'w') as f:
            json.dump(self.results, f, indent=2)
            
        # Save as Excel
        df = pd.DataFrame(self.results)
        df.to_excel(f'req_results_{timestamp}.xlsx', index=False)
        
        self.logger.info(f"Results saved to req_results_{timestamp}.json and .xlsx")
        
    def process_businesses(self, excel_file, sheet_name='High Value Targets', limit=None):
        """Process businesses from Excel file"""
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        if limit:
            df = df.head(limit)
            
        self.logger.info(f"Processing {len(df)} businesses")
        
        for idx, row in df.iterrows():
            self.logger.info(f"\nProcessing {idx+1}/{len(df)}: {row['Business Name']}")
            
            result = {
                'original_name': row['Business Name'],
                'category': row['Category'],
                'has_address': row['Has Address'],
                'search_time': datetime.now().isoformat()
            }
            
            search_result = self.search_business(row['Business Name'])
            if search_result:
                result.update(search_result)
            else:
                result['found'] = False
                result['error'] = 'Search failed'
                
            self.results.append(result)
            
            # Respectful delay
            time.sleep(2)
            
        self.driver.quit()
        self.logger.info("\nProcessing complete")
        
        # Save results
        self.save_results_to_file()
        
        # Print summary
        found = len([r for r in self.results if r.get('found', False)])
        not_found = len(self.results) - found
        
        print(f"\n{'='*60}")
        print(f"SUMMARY:")
        print(f"Total processed: {len(self.results)}")
        print(f"Found in REQ: {found}")
        print(f"Not found: {not_found}")
        print(f"{'='*60}")

# Usage
if __name__ == "__main__":
    # Don't need PostgreSQL for now - save to files
    scraper = REQSeleniumScraper(save_to_file=True)
    
    # Test with first 5 businesses
    scraper.process_businesses(
        'INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx',
        sheet_name='High Value Targets',
        limit=5
    )
