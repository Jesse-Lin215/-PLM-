import re
import subprocess

def run_tsc():
    result = subprocess.run(["npx", "tsc", "--noEmit", "src/components/DrawingVersionsView.tsx"], capture_output=True, text=True)
    return result.stdout

stdout = run_tsc()
lines_to_fix = set()

for line in stdout.split('\n'):
    if "src/components/DrawingVersionsView.tsx(" in line:
        match = re.search(r"\((\d+),\d+\): error (TS17015|TS1005|TS17008|TS17014)", line)
        if match:
            line_num = int(match.group(1))
            lines_to_fix.add(line_num)

lines_to_fix = sorted(list(lines_to_fix), reverse=True)
print("Lines to fix:", lines_to_fix)

with open("src/components/DrawingVersionsView.tsx", "r") as f:
    content_lines = f.readlines()

for line_num in lines_to_fix:
    # insert `      )}` before the reported line. 
    # Because line_num is 1-indexed, line_num - 1 is the index of the line where the error was reported.
    # We want to insert BEFORE that line, so at index line_num - 1.
    content_lines.insert(line_num - 1, "      )}\n")

with open("src/components/DrawingVersionsView.tsx", "w") as f:
    f.writelines(content_lines)

print("Fixed. Running tsc again...")
print(run_tsc())
