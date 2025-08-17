import pandas as pd

# Load high value targets
df = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx', sheet_name='High Value Targets')

print("HIGH VALUE BUSINESS ANALYSIS")
print("="*60)
print(f"Total high-value businesses: {len(df)}")

# Category breakdown
print("\nBy Category:")
print(df['Category'].value_counts())

# Address analysis
no_address = df[df['Has Address'] == 'No']
print(f"\nNO ADDRESS: {len(no_address)} businesses ({len(no_address)/len(df)*100:.1f}%)")

# Show some examples
print("\nExamples of high-value businesses with NO ADDRESS:")
for idx, row in no_address.head(10).iterrows():
    print(f"- {row['Business Name']} ({row['Category']})")

# Save for manual verification
no_address.to_excel('HIGH_VALUE_NO_ADDRESS.xlsx', index=False)
print(f"\nSaved {len(no_address)} businesses with no address to: HIGH_VALUE_NO_ADDRESS.xlsx")
