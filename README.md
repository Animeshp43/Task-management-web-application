# Task Management Assignment

This repository contains a simple Task Management web application built to satisfy the internship assignment requirements.

## What the assignment asked
- Build a simple Task Management web application where Project Managers (PMs) and Users can manage tasks effectively. (Source: PDF assignment).

**PM Capabilities**
1. Login (dummy login is fine).
2. Add Task with Title, Description, Deadline, Assigned User.
3. Edit / Delete Task.

**User Capabilities**
1. View tasks assigned to them.
2. Update task status (Pending, In Progress, Done).

**Bonus (Optional)**: If any user misses a task deadline, automatically notify the PM (this app shows overdue tasks on PM dashboard). fileciteturn0file0

## Tech stack used
- Python 3.8+ (Flask)
- SQLite (file-based)
- Vanilla JS/CSS for frontend (single-page)

## Folder structure
- app.py              -> Flask backend + API
- requirements.txt
- templates/index.html
- static/main.js
- static/style.css
- tasks.db            -> created automatically on first run
- README.md
- instructions below

## Steps to run (on VS Code)
1. Make sure Python 3.8+ is installed. Verify with `python --version`.
2. Open this folder in VS Code.
3. (Optional) Create and activate a virtual environment:
   - Linux/macOS:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```
   - Windows (PowerShell):
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
5. Run the app:
   ```
   python app.py
   ```
   The app will be available at `http://127.0.0.1:5000/`.

6. How to use:
   - On the login box, enter any username (e.g., `alice`) and select role `pm` or `user`.
   - PM can add/edit/delete tasks, assign to users.
   - User will only see tasks assigned to their username (the dummy login returns the entered username).
   - PM dashboard shows overdue tasks as a notification — this satisfies the optional bonus.



