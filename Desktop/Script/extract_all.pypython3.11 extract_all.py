import pytesseract
from PIL import Image
import pandas as pd
import re
import os
from datetime import datetime

# Your folders (with the space!)
base_folder = "/Users/Jon/Desktop/indiana communication "
folder1 = os.path.join(base_folder, "Data 1")
folder2 = os.path.join(base_folder, "Data2")

print("🚀 INDIGENIOUS BUSINESS EXTRACTOR - M4 Pro Edition")
print("=" * 60)
print(f"📁 Found 351 PNGs in Data 1")
print(f"📁 Found 396 PNGs in Data2")
print(f"📊 Total: 747 PNG files to process")
print("⚡ Your M4 Pro will crush these in ~5 minutes!\n")

# Collect all businesses
all_businesses = []
start_time = datetime.now()

# Get all PNG files
all_png_files = []
for folder, folder_name in [(folder1, "Data 1"), (folder2, "Data2")]:
    files = [f for f in os.listdir(folder) if f.lower().endswith('.png')]
    all_png_files.extend([(folder, f, folder_name) for f in files])

# Process each PNG
processed = 0
errors = 0

for folder, png_file, folder_name in all_png_files:
    processed += 1
    
    if processed % 50 == 0:
        print(f"⏳ Progress: {processed}/747 files processed...")
    
    try:
        # Read image
        img_path = os.path.join(folder, png_file)
        img = Image.open(img_path)
        
        # Extract text (French + English)
        text = pytesseract.image_to_string(img, lang='fra+eng')
        
        # Find all phone numbers and associated businesses
        phone_pattern = r'([^\n]+?)\s*\((\d{3})\)\s*(\d{3})-(\d{4})'
        matches = re.finditer(phone_pattern, text)
        
        for match in matches:
            full_line = match.group(1).strip()
            phone = f"({match.group(2)}) {match.group(3)}-{match.group(4)}"
            
            # Extract postal code if present
            postal_match = re.search(r'[A-Z]\d[A-Z]\s*\d[A-Z]\d', full_line)
            postal_code = postal_match.group(0) if postal_match else ""
            
            # Smart name/address splitting
            address_indicators = r'(\d+|rue|boul|avenue|route|chemin|CP|C\.P\.|av\.|blvd)'
            address_match = re.search(address_indicators, full_line, re.I)
            
            if address_match:
                business_name = full_line[:address_match.start()].strip(' ,._-')
nano extract_all.py

nano extract_all.py
nano    









































     extract_all.py




import pytesseract
from PIL import Image
import pandas as pd
import re
import os
from datetime import datetime

# Your folders (with the space!)
base_folder = "/Users/Jon/Desktop/indiana communication "
folder1 = os.path.join(base_folder, "Data 1")
folder2 = os.path.join(base_folder, "Data2")

print("🚀 STARTING EXTRACTION...")
print(f"📁 Processing 747 PNG files")

all_businesses = []
all_png_files = []

# Get all files
for folder, name in [(folder1, "Data 1"), (folder2, "Data2")]:
    files = [f for f in os.listdir(folder) if f.lower().endswith('.png')]
    all_png_files.extend([(folder, f, name) for f in files])

# Process each file
for i, (folder, png_file, folder_name) in enumerate(all_png_files):
    if i % 50 == 0:
        print(f"Progress: {i}/747...")
    
    try:
        img_path = os.path.join(folder, png_file)
        img = Image.open(img_path)
        text = pytesseract.image_to_string(img, lang='fra+eng')
        
        # Find phone numbers
        phone_pattern = r'([^\n]+?)\s*\((\d{3})\)\s*(\d{3})-(\d{4})'
        matches = re.finditer(phone_pattern, text)
        
        for match in matches:
            line = match.group(1).strip()
            phone = f"({match.group(2)}) {match.group(3)}-{match.group(4)}"
            
            if line and len(line) > 3:
                all_businesses.append({
                    'name': line,
                    'phone': phone,
                    'folder': folder_name
                })
    except:
        pass

# Save results
df = pd.DataFrame(all_businesses)
df = df.drop_duplicates(subset=['name', 'phone'])
output = f"/Users/Jon/Desktop/Indigenous_Businesses_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
df.to_excel(output, index=False)

print(f"\n✅ DONE! Extracted {len(df)} businesses")
print(f"💾 Saved to: {output}")

