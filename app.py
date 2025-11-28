from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(BASE_DIR, "tasks.db")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# Simple User model (for assignment purposes)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    deadline = db.Column(db.Date, nullable=True)
    assigned_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    status = db.Column(db.String(50), nullable=False, default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assigned_user = db.relationship("User", backref="tasks")

# Initialize DB and create demo users in a safe startup function
def create_tables():
    with app.app_context():
        db.create_all()
        if User.query.count() == 0:
            u1 = User(name="alice")
            u2 = User(name="bob")
            db.session.add_all([u1, u2])
            db.session.commit()

# Serve single page
@app.route("/")
def index():
    return render_template("index.html")

# API endpoints
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username","")
    role = data.get("role","user")  # 'pm' or 'user'
    users = [{"id":u.id, "name":u.name} for u in User.query.all()]
    return jsonify({"ok":True, "user":{"name":username, "role":role}, "users":users})

@app.route("/api/tasks", methods=["GET","POST"])
def tasks():
    if request.method == "GET":
        tasks = Task.query.order_by(Task.created_at.desc()).all()
        out = []
        for t in tasks:
            out.append({
                "id":t.id, "title":t.title, "description":t.description,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "assigned_user_id": t.assigned_user_id,
                "assigned_user_name": t.assigned_user.name if t.assigned_user else None,
                "status": t.status
            })
        return jsonify(out)
    else:
        data = request.json or {}
        title = data.get("title")
        if not title:
            return jsonify({"error":"title required"}), 400
        t = Task(
            title=title,
            description=data.get("description"),
            status=data.get("status","Pending")
        )
        dl = data.get("deadline")
        if dl:
            try:
                t.deadline = datetime.strptime(dl, "%Y-%m-%d").date()
            except:
                t.deadline = None
        assigned = data.get("assigned_user_id")
        if assigned:
            t.assigned_user_id = assigned
        db.session.add(t)
        db.session.commit()
        return jsonify({"ok":True, "id":t.id})

@app.route("/api/tasks/<int:task_id>", methods=["PUT","DELETE"])
def update_task(task_id):
    t = Task.query.get_or_404(task_id)
    if request.method == "DELETE":
        db.session.delete(t)
        db.session.commit()
        return jsonify({"ok":True})
    data = request.json or {}
    if "title" in data: t.title = data.get("title")
    if "description" in data: t.description = data.get("description")
    if "status" in data: t.status = data.get("status")
    if "deadline" in data:
        dl = data.get("deadline")
        if dl:
            try:
                t.deadline = datetime.strptime(dl, "%Y-%m-%d").date()
            except:
                t.deadline = None
        else:
            t.deadline = None
    if "assigned_user_id" in data:
        t.assigned_user_id = data.get("assigned_user_id")
    db.session.commit()
    return jsonify({"ok":True})

@app.route("/api/users", methods=["GET"])
def list_users():
    users = [{"id":u.id, "name":u.name} for u in User.query.all()]
    return jsonify(users)

@app.route("/api/overdue", methods=["GET"])
def overdue():
    today = date.today()
    overdue_tasks = Task.query.filter(Task.deadline != None, Task.deadline < today, Task.status != "Done").all()
    out = [{"id":t.id, "title":t.title, "assigned_user": t.assigned_user.name if t.assigned_user else None, "deadline":t.deadline.isoformat()} for t in overdue_tasks]
    return jsonify(out)

# Static files route (optional)
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

if __name__ == "__main__":
    # ensure DB and demo users are created (Flask 3+ compatible)
    create_tables()
    app.run(host="0.0.0.0", port=5000, debug=True)
