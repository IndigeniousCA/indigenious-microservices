import pandas as pd
from datetime import datetime

print("Indigenous Business Verification Scanner")
print("="*50)

# Load your Excel file
try:
    df = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx')
    print(f"✓ Loaded {len(df)} businesses from Excel")
    
    # Show categories
    print("\nBusiness categories found:")
    print(df['Category'].value_counts())
    
    # Find high-risk businesses
    high_risk = df[df['Category'].isin(['Construction', 'Consulting', 'Business Development'])]
    print(f"\n⚠️  Found {len(high_risk)} HIGH-RISK businesses to investigate")
    
    # Find businesses without addresses
    no_address = df[df['Has Address'] == 'No']
    print(f"⚠️  Found {len(no_address)} businesses WITHOUT ADDRESSES (suspicious)")
    
    # Combine priority targets
    priority = pd.concat([high_risk, no_address]).drop_duplicates()
    print(f"\n🎯 Total priority businesses to investigate: {len(priority)}")
    
    # Save priority list
    priority.to_excel('PRIORITY_BUSINESSES_TO_SCRAPE.xlsx', index=False)
    print("\n✓ Saved priority list to: PRIORITY_BUSINESSES_TO_SCRAPE.xlsx")
    
    # Show sample
    print("\nSample high-risk businesses:")
    for idx, row in high_risk.head(10).iterrows():
        print(f"  - {row['Business Name']} ({row['Category']})")
    
except Exception as e:
    print(f"Error: {e}")
