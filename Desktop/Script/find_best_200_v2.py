import pandas as pd
import re

# Load your FINAL clean data
df = pd.read_excel('/Users/Jon/Desktop/Indigenous_Businesses_FINAL_CLEAN.xlsx')

print("🎯 FINDING THE 200 BEST BUSINESSES FOR GOVERNMENT")
print("=" * 60)
print(f"Starting with {len(df)} businesses from your clean file")

# First, let's see what columns we have
print("\nColumns in your data:")
print(df.columns.tolist())

# Basic analysis
print(f"\nBasic stats:")
print(f"Total businesses: {len(df)}")
print(f"With addresses: {df['address'].notna().sum()}")
print(f"With postal codes: {df['postal_code'].notna().sum()}")

# Let's find the best businesses based on what we have
# Score each business
df['quality_score'] = 0

# Points for having complete information
df.loc[df['address'].str.len() > 20, 'quality_score'] += 30
df.loc[df['postal_code'].notna(), 'quality_score'] += 20
df.loc[df['business_name'].str.len() > 15, 'quality_score'] += 20
df.loc[df['phone'].notna(), 'quality_score'] += 10

# Extra points for professional-sounding names
professional_words = ['Corporation', 'Enterprises', 'Group', 'Services', 'Solutions', 
                     'Consulting', 'Construction', 'Development', 'Centre', 'Professional']
for word in professional_words:
    df.loc[df['business_name'].str.contains(word, case=False, na=False), 'quality_score'] += 10

# Get top 200
top_200 = df.nlargest(200, 'quality_score').sort_values('business_name')

# Save showcase file
output_file = '/Users/Jon/Desktop/Indigenous_200_SHOWCASE.xlsx'
with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
    # Main sheet with all 200
    top_200.to_excel(writer, sheet_name='Top 200 Businesses', index=False)
    
    # Summary stats
    summary = pd.DataFrame({
        'Metric': ['Total Businesses', 'With Full Address', 'With Postal Code', 'Average Quality Score'],
        'Value': [len(top_200), 
                 top_200['address'].notna().sum(),
                 top_200['postal_code'].notna().sum(),
                 f"{top_200['quality_score'].mean():.1f}"]
    })
    summary.to_excel(writer, sheet_name='Summary', index=False)

print(f"\n🌟 TOP 10 SHOWCASE BUSINESSES:")
print("-" * 60)
for i, (_, biz) in enumerate(top_200.head(10).iterrows(), 1):
    print(f"{i}. {biz['business_name']}")
    if pd.notna(biz['address']) and len(biz['address']) > 5:
        print(f"   📍 {biz['address']}")
    print(f"   📞 {biz['phone']}")
    print()

print(f"\n✅ Created showcase file with {len(top_200)} best businesses")
print(f"💾 Saved to: {output_file}")
print("\n🎯 This is your GOVERNMENT PITCH FILE!")
