import pandas as pd

print("Checking Excel File Structure")
print("="*50)

# Load the file
df = pd.read_excel('INDIGENOUS_BUSINESSES_FINAL_VERIFIED.xlsx')

print(f"\n✓ Loaded {len(df)} rows")
print(f"\nColumns found in your file:")
for i, col in enumerate(df.columns):
    print(f"  {i+1}. {col}")

print("\nFirst 5 rows preview:")
print(df.head())

print("\nData types:")
print(df.dtypes)

# Check for any null columns
null_counts = df.isnull().sum()
print("\nMissing data per column:")
for col, count in null_counts.items():
    if count > 0:
        print(f"  {col}: {count} missing values")
