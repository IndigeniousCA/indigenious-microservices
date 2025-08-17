import pandas as pd
import re

# Load the government-ready file
df = pd.read_excel('/Users/Jon/Desktop/INDIGENOUS_BUSINESSES_GOVERNMENT_READY.xlsx', sheet_name='All Businesses')

print("🔧 ULTRA CLEANING - FIXING POSTAL CODES")
print("=" * 60)

def extract_postal_code(address_text):
    """Extract ANY postal code pattern from text"""
    # Look for postal code at END of address
    patterns = [
        r'([A-Z]\d[A-Z]\s*\d[A-Z]\d)\s*$',  # At end
        r'\)\s*([A-Z]\d[A-Z]\s*\d[A-Z]\d)',  # After province
        r',\s*([A-Z]\d[A-Z]\s*\d[A-Z]\d)',   # After comma
    ]
    
    for pattern in patterns:
        match = re.search(pattern, str(address_text))
        if match:
            return match.group(1).replace(' ', '')  # Remove spaces in postal
    return ''

def clean_address(address, postal):
    """Remove postal code from address"""
    if not postal:
        return address
    
    # Remove the postal code
    clean = str(address).replace(postal, '')
    # Remove with spaces
    clean = clean.replace(postal[:3] + ' ' + postal[3:], '')
    # Clean up trailing punctuation
    clean = re.sub(r'[,\s\)]+$', '', clean)
    # Fix double spaces
    clean = re.sub(r'\s+', ' ', clean)
    # Fix space before comma/parenthesis
    clean = clean.replace(' ,', ',').replace(' )', ')')
    
    return clean.strip()

# Process each row
cleaned_data = []
for _, row in df.iterrows():
    address = str(row.get('Address', ''))
    existing_postal = str(row.get('Postal Code', ''))
    
    # Try to extract postal from address
    found_postal = extract_postal_code(address)
    
    # Use found postal if we don't have one, or if address contains one
    if found_postal:
        final_postal = found_postal
        clean_addr = clean_address(address, found_postal)
    else:
        final_postal = existing_postal if existing_postal != 'nan' else ''
        clean_addr = address
    
    cleaned_data.append({
        'Business Name': row['Business Name'],
        'Address': clean_addr,
        'Postal Code': final_postal,
        'Phone': row['Phone'],
        'Province': row.get('Province', 'Unknown'),
        'Category': row.get('Category', 'Other')
    })

# Create final dataframe
final_df = pd.DataFrame(cleaned_data)

# Create FINAL file
output = '/Users/Jon/Desktop/INDIGENOUS_BUSINESSES_FINAL_GOVERNMENT.xlsx'

with pd.ExcelWriter(output, engine='openpyxl') as writer:
    # Clean data
    final_df.to_excel(writer, sheet_name='Clean Data', index=False)
    
    # High-value targets (Construction & Development)
    high_value = final_df[
        final_df['Category'].str.contains('Construction|Development', na=False)
    ].head(50)
    high_value.to_excel(writer, sheet_name='High Value Targets', index=False)
    
    # Summary stats
    summary = pd.DataFrame({
        'Metric': [
            'Total Businesses',
            'With Postal Codes',
            'Construction Companies',
            'Development Companies',
            'Provinces Covered'
        ],
        'Count': [
            len(final_df),
            len(final_df[final_df['Postal Code'].str.len() > 0]),
            len(final_df[final_df['Category'].str.contains('Construction', na=False)]),
            len(final_df[final_df['Category'].str.contains('Development', na=False)]),
            final_df['Province'].nunique()
        ]
    })
    summary.to_excel(writer, sheet_name='Summary', index=False)

print("✅ ULTRA CLEAN COMPLETE!")
print(f"\n📊 FINAL STATS:")
print(f"Total: {len(final_df)} businesses")
print(f"With postal codes: {len(final_df[final_df['Postal Code'].str.len() > 0])}")

print(f"\n🏗️ HIGH-VALUE PREVIEW (Construction/Development):")
for i, (_, biz) in enumerate(high_value.head(5).iterrows(), 1):
    print(f"\n{i}. {biz['Business Name']}")
    print(f"   📍 {biz['Address']}")
    print(f"   📮 {biz['Postal Code']}")
    print(f"   📞 {biz['Phone']}")

print(f"\n💾 FINAL FILE: {output}")
print("\n🎯 THIS IS YOUR GOVERNMENT PRESENTATION FILE!")
