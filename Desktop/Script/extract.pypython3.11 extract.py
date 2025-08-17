#!/usr/bin/env python3
import pytesseract
from PIL import Image
import pandas as pd
import re
import os
from datetime import datetime

# CORRECTED folder names!
base_folder = "/Users/Jon/Desktop/indiana communication"
folder1 = os.path.join(base_folder, "Data 1")  # Capital D, with space
folder2 = os.path.join(base_folder, "Data2")   # Capital D, NO space

print("🚀 Indigenious Business Extractor - M4 Pro Edition")
print("=" * 60)

# Get PNG files
all_png_files = []

# Check Data 1
if os.path.exists(folder1):
    files1 = [f for f in os.listdir(folder1) if f.lower().endswith('.png')]
    print(f"✅ Found {len(files1)} PNGs in Data 1")
    all_png_files.extend([(folder1, f) for f in files1])

# Check Data2  
if os.path.exists(folder2):
    files2 = [f for f in os.listdir(folder2) if f.lower().endswith('.png')]
    print(f"✅ Found {len(files2)} PNGs in Data2")
    all_png_files.extend([(folder2, f) for f in files2])

print(f"📊 Total PNGs to process: {len(all_png_files)}")
print("⚡ Starting extraction...\n")

# Extract businesses
all_businesses = []
start_time = datetime.now()

for i, (folder, png_file) in enumerate(all_png_files):
    if i % 20 == 0:
        print(f"Processing {i}/{len(all_png_files)}...")
    
    try:
        img_path = os.path.join(folder, png_file)
        img = Image.open(img_path)
        text = pytesseract.image_to_string(img, lang='fra+eng')
        
        # Find phone patterns
        phone_pattern = r'([^\n]+?)\s*\((\d{3})\)\s*(\d{3})-(\d{4})'
        matches = re.finditer(phone_pattern, text)
        
        for match in matches:
            line = match.group(1).strip()
            phone = f"({match.group(2)}) {match.group(3)}-{match.group(4)}"
            
            # Extract business name
            business_name = re.sub(r'\s+', ' ', line).strip()
            business_name = re.sub(r'[,_-]+$', '', business_name)
            
            if business_name and len(business_name) > 3:
                all_businesses.append({
                    'name': business_name,
                    'phone': phone,
                    'source': png_file
                })
    except Exception as e:
        print(f"Skip {png_file}: {str(e)[:30]}...")

# Save results
df = pd.DataFrame(all_businesses)
df = df.drop_duplicates(subset=['name', 'phone'])

output = f"/Users/Jon/Desktop/Indigenous_Businesses_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
df.to_excel(output, index=False)

print(f"\n✅ DONE! Extracted {len(df)} unique businesses")
print(f"💾 Saved to: {output}")
print("\n🎉 Check your Desktop for the Excel file!")

