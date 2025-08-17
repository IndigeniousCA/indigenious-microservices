import pandas as pd

# Get 20 businesses to manually verify
df = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx', sheet_name='High Value Targets')

# Prioritize: no address + construction/transport
priority = df[
    (df['Has Address'] == 'No') & 
    (df['Category'].isin(['Construction', 'Transportation', 'Consulting']))
].head(20)

print("MANUAL VERIFICATION LIST")
print("="*60)
print("Check these 20 businesses on REQ website manually:\n")

for idx, row in priority.iterrows():
    print(f"{idx+1}. {row['Business Name']}")
    print(f"   Category: {row['Category']}")
    print(f"   Has Address: {row['Has Address']}")
    print()

priority.to_excel('MANUAL_CHECK_LIST.xlsx', index=False)
print("Saved to: MANUAL_CHECK_LIST.xlsx")
