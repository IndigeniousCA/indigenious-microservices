import pandas as pd
import re

# Load your file
df = pd.read_excel('/Users/Jon/Desktop/INDIGENOUS_BUSINESSES_FINAL_GOVERNMENT.xlsx', sheet_name='Clean Data')

print("🎯 SMART FILTERING - KEEPING REAL BUSINESSES")
print("=" * 60)
print(f"Starting with {len(df)} entries")

# ONLY remove very specific non-businesses
remove_exact = [
    # CBC entries (clearly not Indigenous businesses)
    'CBC / Radio Canada',
    'Radio-Canada',
    
    # Duplicate school board entries
    'Bureau administratif',
    
    # Government authorities
    'Cree Regional Authority'
]

# Create a mask for exact matches
remove_mask = df['Business Name'].isin(remove_exact)

# Also remove entries that START with these (more precise)
remove_patterns = [
    r'^CBC\s*/\s*Radio Canada',  # CBC entries
    r'^École primaire',  # Elementary schools only
    r'^École secondaire',  # High schools only
    r'^Bureau administratif',  # Admin offices
]

for pattern in remove_patterns:
    pattern_mask = df['Business Name'].str.contains(pattern, na=False, regex=True)
    remove_mask = remove_mask | pattern_mask

# Keep everything else!
clean_df = df[~remove_mask].copy()

# Show what we're removing
removed_df = df[remove_mask]
if len(removed_df) > 0:
    print("\n❌ REMOVING ONLY THESE:")
    for name in removed_df['Business Name'].unique():
        print(f"   - {name}")

print(f"\n✅ KEEPING {len(clean_df)} businesses (removed only {len(removed_df)})")

# Better categorization
def smart_category(row):
    name = row['Business Name'].lower()
    
    # High-value categories
    if any(word in name for word in ['construction', 'builder', 'contractor']):
        return 'Construction & Infrastructure'
    elif any(word in name for word in ['transport', 'trucking', 'logistics']):
        return 'Transportation & Logistics'
    elif any(word in name for word in ['development', 'développement', 'corporation']):
        return 'Economic Development'
    elif any(word in name for word in ['consulting', 'professional', 'services']):
        return 'Professional Services'
    elif any(word in name for word in ['hotel', 'motel', 'lodge', 'tourism']):
        return 'Tourism & Hospitality'
    elif any(word in name for word in ['centre', 'center']) and 'health' not in name:
        return 'Community Services'  # Keep community centers as they can get contracts
    else:
        return 'Other Business'

clean_df['Category'] = clean_df.apply(smart_category, axis=1)

# Save the carefully filtered list
output = '/Users/Jon/Desktop/INDIGENOUS_BUSINESSES_SMART_FILTERED.xlsx'

with pd.ExcelWriter(output, engine='openpyxl') as writer:
    # Summary
    summary = pd.DataFrame({
        'Metric': [
            'Total Indigenous Businesses',
            'High-Value Categories',
            'Construction & Infrastructure',
            'Economic Development',
            'Professional Services',
            'Community Services',
            'Removed (non-commercial)'
        ],
        'Count': [
            len(clean_df),
            len(clean_df[clean_df['Category'].isin(['Construction & Infrastructure', 'Economic Development', 'Professional Services'])]),
            len(clean_df[clean_df['Category'] == 'Construction & Infrastructure']),
            len(clean_df[clean_df['Category'] == 'Economic Development']),
            len(clean_df[clean_df['Category'] == 'Professional Services']),
            len(clean_df[clean_df['Category'] == 'Community Services']),
            len(removed_df)
        ]
    })
    summary.to_excel(writer, sheet_name='Summary', index=False)
    
    # All businesses
    clean_df.to_excel(writer, sheet_name='All Businesses', index=False)
    
    # High-value only
    high_value = clean_df[clean_df['Category'].isin([
        'Construction & Infrastructure', 
        'Economic Development', 
        'Professional Services',
        'Transportation & Logistics'
    ])]
    high_value.to_excel(writer, sheet_name='High Value Targets', index=False)

print(f"\n📊 CATEGORY BREAKDOWN:")
for cat, count in clean_df['Category'].value_counts().items():
    print(f"   {cat}: {count}")

print(f"\n💾 Saved to: {output}")
print(f"\n✅ You now have {len(clean_df)} Indigenous businesses ready for government!")

# Quick check - show some businesses we're KEEPING
print(f"\n✅ EXAMPLES OF BUSINESSES WE'RE KEEPING:")
examples = clean_df.sample(min(10, len(clean_df)))
for _, biz in examples.iterrows():
    print(f"   • {biz['Business Name']} ({biz['Category']})")
