import pandas as pd
import re

# Load your FULL clean database!
df = pd.read_excel('/Users/Jon/Desktop/Indigenous_Businesses_FINAL_CLEAN.xlsx')

print("💰 WORKING WITH YOUR FULL DATABASE!")
print("=" * 60)
print(f"Total businesses: {len(df):,}")

# Clean up the data
clean_data = []

for _, row in df.iterrows():
    name = str(row.get('business_name', '')).strip()
    address = str(row.get('address', '')).strip()
    phone = str(row.get('phone', '')).strip()
    postal = str(row.get('postal_code', '')).strip()
    
    # Skip if name is too short or weird
    if len(name) < 4 or name == 'nan':
        continue
        
    # Extract postal from address if needed
    if postal == 'nan' or not postal:
        postal_match = re.search(r'([A-Z]\d[A-Z]\s*\d[A-Z]\d)', address)
        if postal_match:
            postal = postal_match.group(1)
            address = address.replace(postal, '').strip()
    
    # Categorize businesses
    name_lower = name.lower()
    if any(word in name_lower for word in ['construction', 'builder', 'contractor']):
        category = 'Construction'
    elif any(word in name_lower for word in ['transport', 'trucking', 'freight']):
        category = 'Transportation'
    elif any(word in name_lower for word in ['conseil', 'council', 'development', 'corporation']):
        category = 'Economic Development'
    elif any(word in name_lower for word in ['service', 'consulting', 'professional']):
        category = 'Professional Services'
    elif any(word in name_lower for word in ['hotel', 'motel', 'inn', 'lodge']):
        category = 'Tourism'
    elif any(word in name_lower for word in ['store', 'mart', 'market', 'dépanneur']):
        category = 'Retail'
    elif 'centre' in name_lower or 'center' in name_lower:
        category = 'Community Services'
    else:
        category = 'Other'
    
    clean_data.append({
        'Business Name': name,
        'Category': category,
        'Address': address,
        'Postal Code': postal if postal != 'nan' else '',
        'Phone': phone if phone != 'nan' else ''
    })

# Create DataFrame
final_df = pd.DataFrame(clean_data)

# Remove obvious non-businesses
non_business_patterns = [
    r'^CBC\s*/\s*Radio',
    r'^Radio-Canada',
    r'^École primaire',
    r'^École secondaire'
]

for pattern in non_business_patterns:
    mask = ~final_df['Business Name'].str.contains(pattern, na=False, regex=True)
    final_df = final_df[mask]

print(f"\n✅ After cleaning: {len(final_df):,} businesses")

# Save the FULL database
output = '/Users/Jon/Desktop/INDIGENOUS_BUSINESSES_FULL_DATABASE.xlsx'

with pd.ExcelWriter(output, engine='openpyxl') as writer:
    # Executive Summary
    summary = pd.DataFrame({
        'KEY FINDING': [
            'Total Indigenous Businesses Found',
            'Government Database Has',
            'Missing Businesses (Gap)',
            'Percentage Missing',
            'High-Value Sectors',
            'Geographic Coverage'
        ],
        'YOUR DATA': [
            f'{len(final_df):,}',
            '2,900',
            f'{len(final_df) - 2900:,}',
            f'{((len(final_df) - 2900) / 2900 * 100):.0f}%',
            f"{len(final_df[final_df['Category'].isin(['Construction', 'Professional Services', 'Economic Development'])]):,}",
            'Quebec, New Brunswick, Ontario, Nova Scotia'
        ]
    })
    summary.to_excel(writer, sheet_name='Executive Summary', index=False)
    
    # Category breakdown
    category_summary = final_df['Category'].value_counts().reset_index()
    category_summary.columns = ['Category', 'Count']
    category_summary['Percentage'] = (category_summary['Count'] / len(final_df) * 100).round(1).astype(str) + '%'
    category_summary.to_excel(writer, sheet_name='By Category', index=False)
    
    # Top 500 showcase
    showcase = final_df.head(500)
    showcase.to_excel(writer, sheet_name='Top 500 Showcase', index=False)
    
    # High-value targets
    high_value = final_df[final_df['Category'].isin(['Construction', 'Transportation', 'Professional Services', 'Economic Development'])]
    high_value.head(200).to_excel(writer, sheet_name='High Value Targets', index=False)
    
    # All businesses (if needed for reference)
    final_df.to_excel(writer, sheet_name='Full Database', index=False)

print(f"\n📊 CATEGORY BREAKDOWN:")
for cat, count in final_df['Category'].value_counts().items():
    print(f"   {cat}: {count:,}")

print(f"\n🎯 GOVERNMENT PITCH NUMBERS:")
print(f"   You found: {len(final_df):,} businesses")
print(f"   They have: 2,900 businesses")
print(f"   THE GAP: {len(final_df) - 2900:,} businesses ({((len(final_df) - 2900) / 2900 * 100):.0f}% more!)")

print(f"\n💾 Saved to: {output}")
print("\n🚀 THIS IS YOUR FULL POWER! Show the government what they're missing!")
