import pytesseract
from PIL import Image
import pandas as pd
import re
import os
from datetime import datetime

print("🚀 INDIGENOUS BUSINESS EXTRACTOR STARTING...")
print("=" * 60)

# Your folders
base = "/Users/Jon/Desktop/indiana communication "
folder1 = os.path.join(base, "Data 1")
folder2 = os.path.join(base, "Data2")

all_businesses = []
total_processed = 0

# Process both folders
for folder_path, folder_name in [(folder1, "Data 1"), (folder2, "Data2")]:
    files = [f for f in os.listdir(folder_path) if f.lower().endswith('.png')]
    print(f"\n📁 Processing {len(files)} files from {folder_name}...")
    
    for i, png_file in enumerate(files):
        if i % 25 == 0:
            print(f"   Progress: {i}/{len(files)} files...")
        
        try:
            img = Image.open(os.path.join(folder_path, png_file))
            text = pytesseract.image_to_string(img, lang='fra+eng')
            
            # Find phone numbers
            phones = re.findall(r'([^\n]+?)\s*\((\d{3})\)\s*(\d{3})-(\d{4})', text)
            
            for match in phones:
                line = match[0].strip()
                phone = f"({match[1]}) {match[2]}-{match[3]}"
                
                if line and len(line) > 3:
                    all_businesses.append({
                        'name': line,
                        'phone': phone,
                        'folder': folder_name
                    })
        except:
            pass
        
        total_processed += 1

# Save results
df = pd.DataFrame(all_businesses)
df = df.drop_duplicates(subset=['name', 'phone'])

timestamp = datetime.now().strftime("%Y%m%d_%H%M")
output = f"/Users/Jon/Desktop/Indigenous_Businesses_{timestamp}.xlsx"
df.to_excel(output, index=False)

print(f"\n✅ EXTRACTION COMPLETE!")
print(f"📊 Processed: {total_processed} PNG files")
print(f"🏢 Found: {len(all_businesses)} total entries")
print(f"✨ Unique: {len(df)} businesses (after removing duplicates)")
print(f"💾 Saved to: {output}")
print(f"\n🎉 Check your Desktop for the Excel file!")
