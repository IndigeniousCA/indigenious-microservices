import pandas as pd
from datetime import datetime

print("Indigenous Business Fraud Risk Analysis")
print("="*50)

# Load all businesses
all_businesses = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx', sheet_name='All Verified Businesses')
high_value = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx', sheet_name='High Value Targets')

print(f"\n📊 OVERVIEW:")
print(f"Total businesses: {len(all_businesses):,}")
print(f"High-value targets: {len(high_value)}")

# Category analysis
print(f"\n📈 CATEGORIES BREAKDOWN:")
category_counts = all_businesses['Category'].value_counts()
for category, count in category_counts.head(10).items():
    print(f"  {category}: {count:,}")

# High-risk categories
high_risk_categories = ['Construction', 'Transportation', 'Consulting', 'Business Development']
high_risk = all_businesses[all_businesses['Category'].isin(high_risk_categories)]
print(f"\n⚠️  HIGH-RISK BUSINESSES: {len(high_risk)}")
for cat in high_risk_categories:
    count = len(all_businesses[all_businesses['Category'] == cat])
    print(f"  {cat}: {count}")

# Missing addresses
no_address_all = all_businesses[all_businesses['Has Address'] == 'No']
no_address_high = high_value[high_value['Has Address'] == 'No']
print(f"\n🚨 MISSING ADDRESSES (Red Flag):")
print(f"  All businesses: {len(no_address_all)} ({len(no_address_all)/len(all_businesses)*100:.1f}%)")
print(f"  High-value targets: {len(no_address_high)} ({len(no_address_high)/len(high_value)*100:.1f}%)")

# Duplicate phone analysis
phone_counts = all_businesses['Phone'].value_counts()
duplicate_phones = phone_counts[phone_counts > 1]
print(f"\n📞 DUPLICATE PHONE NUMBERS: {len(duplicate_phones)}")
if len(duplicate_phones) > 0:
    for phone, count in duplicate_phones.head(5).items():
        businesses = all_businesses[all_businesses['Phone'] == phone]['Business Name'].tolist()
        print(f"  {phone} used by {count} businesses:")
        for biz in businesses[:3]:
            print(f"    - {biz}")

# Address clustering
address_counts = all_businesses[all_businesses['Has Address'] == 'Yes']['Address'].value_counts()
multiple_biz_addresses = address_counts[address_counts > 2]
print(f"\n🏢 ADDRESS CLUSTERING: {len(multiple_biz_addresses)} addresses with 3+ businesses")
if len(multiple_biz_addresses) > 0:
    for addr, count in multiple_biz_addresses.head(3).items():
        print(f"  {count} businesses at: {addr[:60]}...")

# Priority list for REQ verification
priority = pd.concat([
    high_value,  # All high-value targets
    no_address_all.head(50),  # Top 50 with no address
    high_risk[high_risk['Category'] == 'Construction'].head(50)  # Top 50 construction
]).drop_duplicates()

priority.to_excel('PRIORITY_REQ_VERIFICATION.xlsx', index=False)

print(f"\n" + "="*50)
print(f"💰 FRAUD EXPOSURE ESTIMATE:")
print(f"Priority businesses to verify: {len(priority)}")
print(f"Estimated fraud (30% @ $300K each): ${len(priority) * 0.3 * 300000:,.0f}")
print(f"\n✅ Saved {len(priority)} priority businesses to PRIORITY_REQ_VERIFICATION.xlsx")

# Show sample suspicious businesses
print(f"\n🎯 TOP SUSPICIOUS BUSINESSES TO INVESTIGATE:")
suspicious = priority[priority['Has Address'] == 'No'].head(10)
for idx, row in suspicious.iterrows():
    print(f"  - {row['Business Name']} ({row['Category']}) - NO ADDRESS")
