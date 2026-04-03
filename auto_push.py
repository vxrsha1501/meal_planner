import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Change this to your repo branch if not 'main'
BRANCH = "main"

class GitHandler(FileSystemEventHandler):
    def on_modified(self, event):
        # Ignore directories and hidden files
        if event.is_directory:
            return
        if any(ignored in event.src_path for ignored in ['__pycache__', '.git', 'auto_push.py']):
            return
        
        # Stage, commit, and push changes
        os.system("git add .")
        os.system(f'git commit -m "Auto-update from antigravity changes"')
        os.system(f"git push origin {BRANCH}")
        print(f"Pushed changes from {event.src_path}")

if __name__ == "__main__":
    path = "."  # Watch current folder
    observer = Observer()
    observer.schedule(GitHandler(), path=path, recursive=True)
    observer.start()
    print("Auto-push is running... Press Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("Auto-push stopped.")
    observer.join()