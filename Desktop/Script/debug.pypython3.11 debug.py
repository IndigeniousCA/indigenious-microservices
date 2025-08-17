import os

base = "/Users/Jon/Desktop/indiana communication "  # SPACE BEFORE THE QUOTE!
data1 = os.path.join(base, "Data 1")
data2 = os.path.join(base, "Data2")

print(f"Checking folders...")
print(f"Base exists: {os.path.exists(base)}")
print(f"Data 1 exists: {os.path.exists(data1)}")
print(f"Data2 exists: {os.path.exists(data2)}")

# Check what's in each folder
for folder_name, folder_path in [("Data 1", data1), ("Data2", data2)]:
    if os.path.exists(folder_path):
        all_files = os.listdir(folder_path)
        png_files = [f for f in all_files if f.lower().endswith('.png')]
        print(f"\n{folder_name}:")
        print(f"  Total files: {len(all_files)}")
        print(f"  PNG files: {len(png_files)}")
        if len(all_files) > 0 and len(png_files) == 0:
            print(f"  File types found: {set([f.split('.')[-1] for f in all_files if '.' in f])}")
