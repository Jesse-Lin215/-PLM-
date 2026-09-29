import subprocess

def run_tsc():
    result = subprocess.run(["npx", "tsc", "--noEmit", "src/components/DrawingVersionsView.tsx"], capture_output=True, text=True)
    return result.stdout

print(run_tsc())
