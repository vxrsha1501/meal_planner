import os
import time

while True:
    # Track all changes
    os.system("git add .")
    os.system('git commit -m "Auto-update from antigravity script"')
    os.system("git push origin main")
    time.sleep(30)  # check every 30 seconds