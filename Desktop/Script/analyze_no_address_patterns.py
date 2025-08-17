import pandas as pd
import re

df = pd.read_excel('MANUAL_CHECK_LIST.xlsx')

print("PATTERN ANALYSIS - No Address Businesses")
print("="*60)

# Businesses with addresses in their names
print("\n1. ADDRESSES IN BUSINESS NAMES (but marked 'No Address'):")
for idx, row in df.iterrows():
    name = row['Business Name']
    # Look for street patterns
    if re.search(r'\d+\s+\w+\s+(Street|Drive|Boulevard|Street|Qu bec)', name):
        print(f"   - {name}")

# Registration numbers in names  
print("\n\n2. REGISTRATION/REQ NUMBERS IN NAMES:")
for idx, row in df.iterrows():
    name = row['Business Name']
    if 'req' in name.lower() or 'Reg\'d' in name:
        print(f"   - {name}")

# Category distribution
print("\n\n3. CATEGORY BREAKDOWN:")
print(df['Category'].value_counts())

# Suspicious patterns
print("\n\n4. SUSPICIOUS PATTERNS:")
suspicious_count = 0
for idx, row in df.iterrows():
    name = row['Business Name']
    if any([
        '.' in name and name[0].isdigit(),  # Numbered like "4.Coon"
        'req\'d' in name.lower(),
        len(name) > 50,  # Unusually long names
    ]):
        suspicious_count += 1
        
print(f"Businesses with suspicious name patterns: {suspicious_count}/{len(df)}")

# Financial exposure
print(f"\n\n5. POTENTIAL FRAUD EXPOSURE:")
print(f"If 50% are phantom: {len(df) * 0.5 * 300000:,.0f}")
print(f"If 100% are phantom: ${len(df) * 300000:,.0f}")
