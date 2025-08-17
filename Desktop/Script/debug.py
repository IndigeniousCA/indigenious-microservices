import os

base = "/Users/Jon/Desktop/indiana communication "
data1 = os.path.join(base, "Data 1")
data2 = os.path.join(base, "Data2")

print("Checking folders...")
print("Base exists:", os.path.exists(base))
print("Data 1 exists:", os.path.exists(data1))
print("Data2 exists:", os.path.exists(data2))

for folder_name, folder_path in [("Data 1", data1), ("Data2", data2)]:
    if os.path.exists(folder_path):
        all_files = os.listdir(folder_path)
        png_files = [f for f in all_files if f.lower().endswith('.png')]
        print(f"\n{folder_name}:")
        print(f"  Total files: {len(all_files)}")
        print(f"  PNG files: {len(png_files)}")

