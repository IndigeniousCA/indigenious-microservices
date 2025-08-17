import pandas as pd
import re

# Load the original data
df = pd.read_excel("/Users/Jon/Desktop/Indigenous_Businesses_20250616_1449.xlsx")
print(f"Starting with {len(df)} raw entries...")

# First, let's see what we're dealing with
print("\n🔍 ANALYZING DATA QUALITY...")

clean_businesses = []

for _, row in df.iterrows():
    full_text = str(row['name']).strip()
    phone = str(row['phone']).strip()
    
    # Skip obvious junk entries
    junk_patterns = [
        r'^(phone|fax|tel|fox|tél|téléc|suite|tel\.|fax\.|fox\.)[\s:]*$',
        r'^[A-Z]{2,}[\s]*$',  # Just caps like "COMMUNICATION"
        r'^\W+$',  # Just symbols
        r'^[\d\s\-\(\)]+$',  # Just numbers
        r'^\.+$',  # Just dots
        r'^\s*$'  # Empty
    ]
    
    if any(re.match(pattern, full_text, re.I) for pattern in junk_patterns):
        continue
    
    # Skip if too short
    if len(full_text) < 5:
        continue
    
    # Skip if it's clearly a fragment
    if full_text.startswith('\\') or full_text.startswith("'") or full_text.endswith("_"):
        full_text = full_text.strip("\\'_")
    
    # Extract postal code first
    postal_match = re.search(r'[A-Z]\d[A-Z]\s*\d[A-Z]\d', full_text)
    postal_code = postal_match.group(0) if postal_match else ""
    
    # Look for address patterns
    address_patterns = r'(\d+[\s,]+(?:rue|boul|avenue|road|drive|street|chemin)|P\.?O\.?\s*Box|General Delivery|Suite\s+\d+)'
    address_match = re.search(address_patterns, full_text, re.I)
    
    if address_match:
        # Everything before the address is the business name
        business_name = full_text[:address_match.start()].strip(' ,.-_')
        address = full_text[address_match.start():].strip()
    else:
        # Check if there's a comma that might separate name from location
        if ',' in full_text:
            parts = full_text.split(',', 1)
            business_name = parts[0].strip()
            address = parts[1].strip() if len(parts) > 1 else ""
        else:
            business_name = full_text
            address = ""
    
    # Clean up business name
    business_name = re.sub(r'[\s,\._-]+$', '', business_name).strip()
    
    # Final quality checks
    if len(business_name) < 3:
        continue
    
    # Skip if business name is just numbers or single words that look like labels
    if business_name.lower() in ['suite', 'phone', 'fax', 'tel', 'general', 'delivery']:
        continue
    
    # Skip if it contains obvious OCR errors
    if '__' in business_name or business_name.count('(') != business_name.count(')'):
        continue
    
    clean_businesses.append({
        'business_name': business_name,
        'address': address,
        'postal_code': postal_code,
        'phone': phone,
        'source': row['folder']
    })

# Create clean dataframe
clean_df = pd.DataFrame(clean_businesses)

# Remove duplicates based on name AND phone
clean_df = clean_df.drop_duplicates(subset=['business_name', 'phone'])

# Sort by business name
clean_df = clean_df.sort_values('business_name')

# Save the REALLY clean version
output = "/Users/Jon/Desktop/Indigenous_Businesses_FINAL_CLEAN.xlsx"

# Create Excel with multiple sheets
with pd.ExcelWriter(output, engine='openpyxl') as writer:
    # All clean businesses
    clean_df.to_excel(writer, sheet_name='All Businesses', index=False)
    
    # Summary stats
    summary = pd.DataFrame({
        'Metric': [
            'Raw entries extracted',
            'After removing junk',
            'Final unique businesses',
            'With complete addresses',
            'With postal codes',
            'Avg name length',
            'From Data 1',
            'From Data 2'
        ],
        'Value': [
            len(df),
            len(clean_businesses),
            len(clean_df),
            clean_df['address'].str.len().gt(5).sum(),
            clean_df['postal_code'].notna().sum(),
            round(clean_df['business_name'].str.len().mean(), 1),
            len(clean_df[clean_df['source'] == 'Data 1']),
            len(clean_df[clean_df['source'] == 'Data2'])
        ]
    })
    summary.to_excel(writer, sheet_name='Summary', index=False)
    
    # Top 50 preview
    clean_df.head(50).to_excel(writer, sheet_name='Preview', index=False)

print("\n✅ DEEP CLEANING COMPLETE!")
print(f"📊 Started with: {len(df):,} raw entries")
print(f"🧹 Cleaned to: {len(clean_df):,} real businesses")
print(f"📍 With addresses: {clean_df['address'].str.len().gt(5).sum():,}")
print(f"📮 With postal codes: {clean_df['postal_code'].notna().sum():,}")
print(f"\n💾 Saved to: {output}")

print("\n📋 Sample of CLEAN businesses:")
print("-" * 80)
# Show some good examples
good_samples = clean_df[clean_df['address'].str.len() > 10].head(10)
for _, row in good_samples.iterrows():
    print(f"✓ {row['business_name']}")
    if row['address']:
        print(f"  📍 {row['address']}")
    print(f"  📞 {row['phone']}")
    print()
