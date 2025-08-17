import pandas as pd

print("🔍 INVESTIGATING YOUR DATA FILES")
print("=" * 60)

# Check all your Excel files
files_to_check = [
    'Indigenous_200_SHOWCASE.xlsx',
    'INDIGENOUS_BUSINESSES_GOVERNMENT_READY.xlsx', 
    'INDIGENOUS_BUSINESSES_FINAL_GOVERNMENT.xlsx',
    'INDIGENOUS_BUSINESSES_SMART_FILTERED.xlsx'
]

for filename in files_to_check:
    try:
        # Try to read the file
        full_path = f'/Users/Jon/Desktop/{filename}'
        
        # Check if file has multiple sheets
        xl_file = pd.ExcelFile(full_path)
        print(f"\n📁 {filename}")
        print(f"   Sheets: {xl_file.sheet_names}")
        
        # Count rows in each sheet
        for sheet in xl_file.sheet_names:
            df = pd.read_excel(full_path, sheet_name=sheet)
            print(f"   - {sheet}: {len(df)} rows")
            
    except Exception as e:
        print(f"\n❌ {filename} - Not found or error")

# Now let's check your ORIGINAL clean file
print("\n" + "="*60)
print("🎯 CHECKING YOUR ORIGINAL CLEAN DATA:")

try:
    original = pd.read_excel('/Users/Jon/Desktop/Indigenous_Businesses_FINAL_CLEAN.xlsx')
    print(f"Original clean file: {len(original)} businesses")
    
    # Check for quality
    print(f"With addresses: {original['address'].notna().sum()}")
    print(f"With postal codes: {original['postal_code'].notna().sum()}")
    
except:
    print("Original file not found")

# Let's see what you ACTUALLY have in the filtered file
print("\n" + "="*60)
print("🔍 ANALYZING YOUR FILTERED FILE:")

try:
    filtered = pd.read_excel('/Users/Jon/Desktop/INDIGENOUS_BUSINESSES_SMART_FILTERED.xlsx', sheet_name='All Businesses')
    
    print(f"Total businesses: {len(filtered)}")
    print(f"\nBusiness categories:")
    print(filtered['Category'].value_counts())
    
    # Check for any weird entries
    print(f"\nShortest business names (might be junk):")
    filtered_sorted = filtered.sort_values('Business Name', key=lambda x: x.str.len())
    for _, biz in filtered_sorted.head(5).iterrows():
        print(f"   '{biz['Business Name']}' (length: {len(biz['Business Name'])})")
        
except Exception as e:
    print(f"Error: {e}")
