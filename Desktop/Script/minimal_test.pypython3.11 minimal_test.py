import os
print("Test 1: Python works!")

folder = "/Users/Jon/Desktop/indiana communication /Data 1"
print(f"Test 2: Checking folder: {folder}")
print(f"Test 3: Folder exists: {os.path.exists(folder)}")

if os.path.exists(folder):
    files = os.listdir(folder)
    print(f"Test 4: Found {len(files)} files")
    png_files = [f for f in files if f.lower().endswith('.png')]
    print(f"Test 5: Found {len(png_files)} PNG files")
    if png_files:
        print(f"First PNG: {png_files[0]}")

