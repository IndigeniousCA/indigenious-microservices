from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import re

class RBQScraper:
    def __init__(self):
        self.driver = webdriver.Chrome()
        self.base_url = "https://www.rbq.gouv.qc.ca/licence/"
        
    def search_rbq(self, company_name, rbq_number=None):
        """Search RBQ database"""
        self.driver.get(self.base_url)
        
        # Search by RBQ number if available (from business name)
        if not rbq_number:
            # Extract RBQ from name if present
            rbq_match = re.search(r'RBQ\s*([\d-]+)', company_name)
            if rbq_match:
                rbq_number = rbq_match.group(1)
                
        if rbq_number:
            # Search by license number
            search_field = self.driver.find_element(By.ID, "numeroLicence")
            search_field.send_keys(rbq_number)
        else:
            # Search by company name
            search_field = self.driver.find_element(By.ID, "nomEntreprise")
            search_field.send_keys(company_name)
            
        # Submit search
        search_button = self.driver.find_element(By.CLASS_NAME, "btn-rechercher")
        search_button.click()
        
        # Extract results
        return self.extract_rbq_details()
