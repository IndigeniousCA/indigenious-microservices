import pandas as pd
import re

# Load your clean data
df = pd.read_excel('/Users/Jon/Desktop/Indigenous_Business_Intelligence_System.xlsx')

print("🎯 FINDING THE 200 BEST BUSINESSES FOR GOVERNMENT")
print("=" * 60)

# Score each business for "impressiveness"
df['pitch_score'] = 0

# High-value business types
high_value_types = {
    'Construction': 30,
    'Services': 25,
    'Healthcare': 25,
    'Education': 20,
    'Transportation': 20,
    'Tourism': 15,
    'Retail': 10,
    'Media': 15,
    'Government': 20
}

for btype, points in high_value_types.items():
    df.loc[df['business_type'] == btype, 'pitch_score'] += points

# Quality indicators
df.loc[df['address'].str.len() > 30, 'pitch_score'] += 20  # Complete address
df.loc[df['postal_code'].notna(), 'pitch_score'] += 15  # Has postal
df.loc[df['business_name'].str.len() > 15, 'pitch_score'] += 10  # Substantial name
df.loc[df['community'].notna(), 'pitch_score'] += 10  # Known community

# Bonus for "impressive" keywords
impressive_keywords = [
    'Corporation', 'Enterprises', 'Group', 'Solutions', 'International',
    'Professional', 'Technologies', 'Development', 'Consulting', 'Engineering',
    'Infrastructure', 'Environmental', 'Centre', 'Institute', 'Authority'
]

for keyword in impressive_keywords:
    df.loc[df['business_name'].str.contains(keyword, case=False, na=False), 'pitch_score'] += 5

# Remove any sketchy entries
df = df[
    (~df['business_name'].str.contains(r'^\W+|^\.', na=False)) &  # No weird starts
    (df['business_name'].str.len() > 5) &  # Not too short
    (~df['verification_flags'].str.contains('Numbers in name', na=False))  # No weird numbers
]

# Get top 200 by score
top_200 = df.nlargest(200, 'pitch_score').sort_values('business_name')

# Create strategic categories for presentation
categories = {
    'Infrastructure & Construction': top_200[top_200['business_type'] == 'Construction'],
    'Professional Services': top_200[top_200['business_type'].isin(['Services', 'Healthcare'])],
    'Education & Training': top_200[top_200['business_type'] == 'Education'],
    'Economic Development': top_200[top_200['business_type'].isin(['Government', 'Tourism'])],
    'Community Services': top_200[~top_200['business_type'].isin(['Construction', 'Services', 'Healthcare', 'Education', 'Government', 'Tourism'])]
}

# Create the PERFECT presentation file
with pd.ExcelWriter('/Users/Jon/Desktop/Indigenous_200_SHOWCASE.xlsx', engine='openpyxl') as writer:
    
    # Overview sheet
    overview = pd.DataFrame({
        'Category': list(categories.keys()),
        'Number of Businesses': [len(cat_df) for cat_df in categories.values()],
        'Example Business': [cat_df.iloc[0]['business_name'] if len(cat_df) > 0 else 'N/A' for cat_df in categories.values()]
    })
    overview.to_excel(writer, sheet_name='Overview', index=False)
    
    # All 200 businesses
    showcase_cols = ['business_name', 'business_type', 'community', 'address', 'phone']
    top_200[showcase_cols].to_excel(writer, sheet_name='All 200 Businesses', index=False)
    
    # Category sheets
    for category, cat_df in categories.items():
        if len(cat_df) > 0:
            cat_df[showcase_cols].to_excel(writer, sheet_name=category[:30], index=False)
    
    # Geographic distribution
    geo_dist = top_200.groupby('province').size().reset_index(name='count')
    geo_dist.to_excel(writer, sheet_name='Geographic Distribution', index=False)

# Find some "WOW" examples
print("\n🌟 SHOWCASE BUSINESSES (Perfect for your pitch):\n")

# Construction companies (big contracts!)
construction = top_200[top_200['business_type'] == 'Construction'].head(5)
if len(construction) > 0:
    print("💪 CONSTRUCTION (Infrastructure opportunities):")
    for _, biz in construction.iterrows():
        print(f"   • {biz['business_name']}")
        print(f"     {biz['community']}, {biz['province']}")

# Professional services
services = top_200[top_200['business_type'] == 'Services'].head(5)
if len(services) > 0:
    print("\n💼 PROFESSIONAL SERVICES (Consulting contracts):")
    for _, biz in services.iterrows():
        print(f"   • {biz['business_name']}")

# Find businesses with "Corporation" or "Enterprises" (look professional)
professional_names = top_200[
    top_200['business_name'].str.contains('Corporation|Enterprises|Group|Inc', case=False, na=False)
].head(10)

print(f"\n🏢 PROFESSIONAL ENTITIES:")
for _, biz in professional_names.iterrows():
    print(f"   • {biz['business_name']}")

print(f"\n📊 FINAL STATS FOR YOUR PITCH:")
print(f"   Total showcased: {len(top_200)} businesses")
print(f"   Average quality score: {top_200['pitch_score'].mean():.1f}/100")
print(f"   With complete addresses: {top_200['address'].notna().sum()}")
print(f"   Business types: {top_200['business_type'].value_counts().to_dict()}")
print(f"\n💾 Saved to: /Users/Jon/Desktop/Indigenous_200_SHOWCASE.xlsx")
print("\n🎯 USE THIS FILE FOR YOUR GOVERNMENT MEETING!")
