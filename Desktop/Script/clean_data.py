import pandas as pd
import re

# Load your data
df = pd.read_excel("/Users/Jon/Desktop/Indigenous_Businesses_20250616_1449.xlsx")

print(f"🔍 Analyzing your {len(df)} businesses...")
print("\nSample of raw data:")
print("-" * 80)
for i in range(5):
    print(f"{df.iloc[i]['name']}")
    print(f"Phone: {df.iloc[i]['phone']}\n")

# Let's separate business names from addresses
new_data = []

for _, row in df.iterrows():
    full_text = row['name']
    phone = row['phone']
    
    # Look for address patterns
    address_match = re.search(r'(\d+[\s,]|rue|boul|avenue|route|chemin|CP|C\.P\.|av\.|blvd)', full_text, re.I)
    
    if address_match:
        # Split at the first address indicator
        business_name = full_text[:address_match.start()].strip(' ,.-_')
        address = full_text[address_match.start():].strip()
    else:
        # No address found, it's all business name
        business_name = full_text.strip(' ,.-_')
        address = ""
    
    # Extract postal code from address
    postal_match = re.search(r'[A-Z]\d[A-Z]\s*\d[A-Z]\d', address if address else full_text)
    postal_code = postal_match.group(0) if postal_match else ""
    
    new_data.append({
        'business_name': business_name,
        'address': address,
        'postal_code': postal_code,
        'phone': phone,
        'original_text': full_text,
        'source': row['folder']
    })

# Create new clean dataframe
clean_df = pd.DataFrame(new_data)

# Remove any empty business names
clean_df = clean_df[clean_df['business_name'].str.len() > 3]

# Save cleaned version
output = "/Users/Jon/Desktop/Indigenous_Businesses_CLEAN_20250616.xlsx"
clean_df.to_excel(output, index=False)

print("\n✅ CLEANED DATA SAVED!")
print(f"📊 Total clean businesses: {len(clean_df)}")
print(f"🏢 With addresses: {clean_df['address'].notna().sum()}")
print(f"📮 With postal codes: {clean_df['postal_code'].notna().sum()}")
print(f"\n💾 Saved to: {output}")

print("\n📋 Sample of cleaned data:")
print("-" * 80)
for i in range(5):
    print(f"Business: {clean_df.iloc[i]['business_name']}")
    if clean_df.iloc[i]['address']:
        print(f"Address: {clean_df.iloc[i]['address']}")
    if clean_df.iloc[i]['postal_code']:
        print(f"Postal: {clean_df.iloc[i]['postal_code']}")
    print(f"Phone: {clean_df.iloc[i]['phone']}\n")
