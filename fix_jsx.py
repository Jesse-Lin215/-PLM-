import re

with open("src/components/DrawingVersionsView.tsx", "r") as f:
    lines = f.readlines()

def insert_line(index, text):
    lines.insert(index, text + "\n")

# Let's fix line 333
# Line 332 is `                    <span className="text-slate-400 italic">暂无默认版本</span>`
# We insert `                  )}` after it.
# Instead of hardcoding indices, we find the line.

# Find index of `暂无默认版本</span>`
for i, line in enumerate(lines):
    if "暂无默认版本</span>" in line:
        insert_line(i + 1, "                  )}")
        break

# Find where to close `{!fixedMaterialId ? (`
# It ends right before `{/* 3. 主工作台 (受控版本与多格式图纸清单) */}`
for i, line in enumerate(lines):
    if "3. 主工作台 (受控版本与多格式图纸清单)" in line:
        insert_line(i - 1, "      )}")
        break

with open("src/components/DrawingVersionsView.tsx", "w") as f:
    f.writelines(lines)
