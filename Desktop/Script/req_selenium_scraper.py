from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import psycopg2
from datetime import datetime
import time
import logging

class REQSeleniumScraper:
    def __init__(self, db_config):
        self.db_config = db_config
        self.setup_logging()
        self.setup_driver()
        
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
        
        # Add French language preference
        prefs = {'intl.accept_languages': 'fr-CA,fr,en'}
        options.add_experimental_option("prefs", prefs)
        
        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        
    def search_business(self, business_name):
        """Search for a business on REQ"""
        try:
            # Navigate to REQ search page
            self.driver.get("https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx")
            
            # Wait for page to load
            wait = WebDriverWait(self.driver, 10)
            
            # Find search box
            search_box = wait.until(
                EC.presence_of_element_located((By.ID, "CPH_K1ZoneContenu1_Ligne1_txtNomEntreprise"))
            )
            
            # Clear and enter business name
            search_box.clear()
            search_box.send_keys(business_name)
            
            # Find and click search button
            search_button = self.driver.find_element(By.ID, "CPH_K1ZoneContenu1_Ligne1_btnRechercher")
            search_button.click()
            
            # Wait for results
            time.sleep(2)
            
            # Check if we have results
            if "aucun résultat" in self.driver.page_source.lower():
                self.logger.info(f"No results found for: {business_name}")
                return None
                
            # Try to find results table
            try:
                results_table = self.driver.find_element(By.CLASS_NAME, "Grille")
                rows = results_table.find_elements(By.TAG_NAME, "tr")[1:]  # Skip header
                
                if rows:
                    # Click on first result
                    first_link = rows[0].find_element(By.TAG_NAME, "a")
                    first_link.click()
                    
                    # Extract business details
                    return self.extract_business_details()
                    
            except Exception as e:
                self.logger.error(f"Error parsing results for {business_name}: {e}")
                
        except Exception as e:
            self.logger.error(f"Error searching for {business_name}: {e}")
            return None
            
    def extract_business_details(self):
        """Extract all business details from detail page"""
        details = {}
        
        try:
            # Wait for detail page to load
            time.sleep(2)
            
            # Extract NEQ
            neq_element = self.driver.find_element(By.XPATH, "//span[contains(@id, 'lblNEQ')]")
            details['neq'] = neq_element.text.strip()
            
            # Extract business name
            name_element = self.driver.find_element(By.XPATH, "//span[contains(@id, 'lblNom')]")
            details['legal_name'] = name_element.text.strip()
            
            # Extract status
            status_element = self.driver.find_element(By.XPATH, "//span[contains(@id, 'lblEtatEntr')]")
            details['status'] = status_element.text.strip()
            
            # Extract dates
            try:
                creation_element = self.driver.find_element(By.XPATH, "//span[contains(@id, 'lblDateConst')]")
                details['creation_date'] = creation_element.text.strip()
            except:
                details['creation_date'] = None
                
            # Extract legal form
            try:
                form_element = self.driver.find_element(By.XPATH, "//span[contains(@id, 'lblFormeJuridique')]")
                details['legal_form'] = form_element.text.strip()
            except:
                details['legal_form'] = None
                
            # Extract address
            try:
                address_elements = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'divAdresseSiege')]//span[@class='Valeur']")
                details['headquarters_address'] = ' '.join([elem.text.strip() for elem in address_elements])
            except:
                details['headquarters_address'] = None
                
            # Extract directors
            details['directors'] = self.extract_directors()
            
            # Extract other names
            details['other_names'] = self.extract_other_names()
            
            return details
            
        except Exception as e:
            self.logger.error(f"Error extracting business details: {e}")
            return details
            
    def extract_directors(self):
        """Extract all directors/officers"""
        directors = []
        
        try:
            # Find directors section
            director_elements = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'divAdministrateurs')]//div[@class='Ligne']")
            
            current_director = {}
            for element in director_elements:
                label = element.find_element(By.CLASS_NAME, "Label").text.strip()
                value = element.find_element(By.CLASS_NAME, "Valeur").text.strip()
                
                if "Nom" in label:
                    if current_director:
                        directors.append(current_director)
                    current_director = {'name': value}
                elif "Fonction" in label:
                    current_director['role'] = value
                elif "Date" in label:
                    current_director['start_date'] = value
                    
            if current_director:
                directors.append(current_director)
                
        except Exception as e:
            self.logger.error(f"Error extracting directors: {e}")
            
        return directors
        
    def extract_other_names(self):
        """Extract other business names"""
        other_names = []
        
        try:
            name_elements = self.driver.find_elements(By.XPATH, "//div[contains(@id, 'divAutresNoms')]//span[@class='Valeur']")
            other_names = [elem.text.strip() for elem in name_elements]
        except:
            pass
            
        return other_names
        
    def save_to_database(self, business_data, original_data):
        """Save business data to PostgreSQL"""
        conn = psycopg2.connect(**self.db_config)
        cur = conn.cursor()
        
        try:
            # Insert or update business
            cur.execute("""
                INSERT INTO businesses (
                    business_name, category, phone, address, has_address,
                    neq, legal_name, status, creation_date, legal_form,
                    headquarters_address, other_names, req_last_checked
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (neq) DO UPDATE SET
                    legal_name = EXCLUDED.legal_name,
                    status = EXCLUDED.status,
                    headquarters_address = EXCLUDED.headquarters_address,
                    req_last_checked = EXCLUDED.req_last_checked,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
            """, (
                original_data['Business Name'],
                original_data['Category'],
                original_data['Phone'],
                original_data['Address'],
                original_data['Has Address'] == 'Yes',
                business_data.get('neq'),
                business_data.get('legal_name'),
                business_data.get('status'),
                business_data.get('creation_date'),
                business_data.get('legal_form'),
                business_data.get('headquarters_address'),
                business_data.get('other_names', []),
                datetime.now()
            ))
            
            business_id = cur.fetchone()[0]
            
            # Insert directors
            for director in business_data.get('directors', []):
                cur.execute("""
                    INSERT INTO directors (business_id, name, role, start_date)
                    VALUES (%s, %s, %s, %s)
                """, (
                    business_id,
                    director.get('name'),
                    director.get('role'),
                    director.get('start_date')
                ))
                
            conn.commit()
            self.logger.info(f"Saved business: {original_data['Business Name']}")
            
        except Exception as e:
            conn.rollback()
            self.logger.error(f"Database error: {e}")
        finally:
            cur.close()
            conn.close()
            
    def process_businesses(self, excel_file, sheet_name='High Value Targets', limit=None):
        """Process businesses from Excel file"""
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        if limit:
            df = df.head(limit)
            
        self.logger.info(f"Processing {len(df)} businesses")
        
        for idx, row in df.iterrows():
            self.logger.info(f"Processing {idx+1}/{len(df)}: {row['Business Name']}")
            
            business_data = self.search_business(row['Business Name'])
            
            if business_data:
                self.save_to_database(business_data, row.to_dict())
            else:
                # Save with no REQ data
                self.save_to_database({}, row.to_dict())
                
            # Respectful delay
            time.sleep(3)
            
        self.driver.quit()
        self.logger.info("Processing complete")

# Usage
if __name__ == "__main__":
    db_config = {
        'host': 'localhost',
        'database': 'indigenous_businesses',
        'user': 'your_username',
        'password': 'your_password'
    }
    
    scraper = REQSeleniumScraper(db_config)
    
    # Test with first 5 businesses
    scraper.process_businesses(
        'INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx',
        sheet_name='High Value Targets',
        limit=5
    )
