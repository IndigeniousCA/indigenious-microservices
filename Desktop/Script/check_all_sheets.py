import pandas as pd

print("Checking All Sheets in Excel File")
print("="*50)

# Load Excel file to see all sheets
excel_file = pd.ExcelFile('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx')

print(f"\nSheets found in the file:")
for i, sheet in enumerate(excel_file.sheet_names):
    print(f"  {i+1}. {sheet}")

# Load each sheet and show info
for sheet_name in excel_file.sheet_names:
    print(f"\n{'='*50}")
    print(f"Sheet: {sheet_name}")
    print('-'*50)
    
    df = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx', sheet_name=sheet_name)
    print(f"Rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    
    if len(df) > 0:
        print(f"\nFirst 3 rows:")
        print(df.head(3))
