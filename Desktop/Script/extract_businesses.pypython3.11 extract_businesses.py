#!/usr/bin/env python3
import pytesseract
from PIL import Image
import pandas as pd
import re
import os
from datetime import datetime

# Your folder setup
base_folder = "/Users/Jon/Desktop/indiana communication"
folder1 = os.path.join(base_folder, "data 1")
folder2 = os.path.join(base_folder, "data 2")

print("🚀 Indigenious Business Extractor - M4 Pro Edition")
print("=" * 60)
print(f"📁 Base folder: {base_folder}")
print(f"📂 Scanning: data 1 and data 2")

# Check if folders exist
if not os.path.exists(base_folder):
    print(f"\n❌ ERROR: Can't find: {base_folder}")
    print("Make sure the folder 'indiana communication' is on your Desktop")
    exit()

all_businesses = []
start_time = datetime.now()

# Get PNG files from BOTH folders
png_files = []
for folder, folder_name in [(folder1, "data 1"), (folder2, "data 2")]:
    if os.path.exists(folder):
        files = [f for f in os.listdir(folder) if f.lower().endswith('.png')]
        print(f"✅ Found {len(files)} PNG files in {folder_name}")
        png_files.extend([(folder, f) for f in files])

print(f"📊 Total PNG files to process: {len(png_files)}")
print(f"⚡ Starting extraction...\n")

# Process each PNG
successful = 0
for i, (folder, png_file) in enumerate(png_files):
    if i % 20 == 0:
        print(f"📄 Processing: {i}/{len(png_files)} files...")
    
    try:
        img_path = os.path.join(folder, png_file)
        img = Image.open(img_path)
        text = pytesseract.image_to_string(img, lang='fra+eng')
        
        # Find phone numbers and extract business info
        phone_pattern = r'([^\n]+?)\s*\((\d{3})\)\s*(\d{3})-(\d{4})'
        matches = re.finditer(phone_pattern, text)
        
        for match in matches:
            full_line = match.group(1).strip()
            phone = f"({match.group(2)}) {match.group(3)}-{match.group(4)}"
            
            # Extract postal code
            postal_match = re.search(r'[A-Z]\d[A-Z]\s*\d[A-Z]\d', full_line)
            postal_code = postal_match.group(0) if postal_match else ""
            
            # Split name and address
            address_match = re.search(r'(\d+|rue|boul|avenue)', full_line, re.I)
            if address_match:
                business_name = full_line[:address_match.start()].strip(' ,_-')
                address = full_line[address_match.start():].strip()
            else:
                business_name = full_line.strip(' ,_-')
                address = ""
            
            if business_name and len(business_name) > 3:
                all_businesses.append({
                    'business_name': business_name,
                    'address': address,
                    'postal_code': postal_code,
                    'phone': phone,
                    'source_folder': 'data 1' if 'data 1' in folder else 'data 2',
                    'source_file': png_file
                })
                successful += 1
                
    except Exception as e:
        print(f"⚠️  Error with {png_file}: {e}")

# Create DataFrame
print(f"\n🔍 Total entries found: {len(all_businesses)}")
df = pd.DataFrame(all_businesses)
df = df.drop_duplicates(subset=['business_name', 'phone'])
print(f"✨ Unique businesses: {len(df)}")

# Save to Excel
timestamp = datetime.now().strftime("%Y%m%d_%H%M")
output_file = f"/Users/Jon/Desktop/Indigenous_Businesses_{timestamp}.xlsx"
df.to_excel(output_file, index=False)

# Final report
print("\n" + "=" * 60)
print("📊 EXTRACTION COMPLETE!")
print("=" * 60)
print(f"✅ Extracted: {len(df):,} unique businesses")
print(f"📍 With postal codes: {df['postal_code'].notna().sum():,}")
print(f"⏱️  Time: {datetime.now() - start_time}")
print(f"\n💾 Saved to: {output_file}")
print("\n🎉 Open the file in Excel!")

