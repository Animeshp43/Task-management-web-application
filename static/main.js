let user = null;
let editingId = null;
let usersCache = [];

// API helper
async function api(path, method="GET", body=null){
  const opts = {method, headers:{}};
  if(body){
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  return res.json();
}

/* -------------------------
   Login + inline validation
   ------------------------- */
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const roleSelect = document.getElementById("role");
const usernameError = document.getElementById("usernameError");

// Validate username depending on role
function validateLoginInputs(){
  const role = roleSelect.value;
  const username = usernameInput.value || "";
  // If role is 'user', username is required
  if(role === "user"){
    if(username.trim() === ""){
      usernameError.style.display = "block";
      usernameError.textContent = "Field should not be empty: Username is required for Users";
      loginBtn.disabled = true;
      return false;
    } else {
      usernameError.style.display = "none";
      loginBtn.disabled = false;
      return true;
    }
  }
  // role is PM -> username optional, allow login
  usernameError.style.display = "none";
  loginBtn.disabled = false;
  return true;
}

// Live validation: on input change
usernameInput.addEventListener("input", () => {
  validateLoginInputs();
});

// When role changes: if user selected -> focus username input and validate
roleSelect.addEventListener("change", () => {
  if(roleSelect.value === "user"){
    usernameInput.focus();
  }
  validateLoginInputs();
});

// initial validation state on page load
validateLoginInputs();

// Login click handler (uses inline validation, no alert popups)
loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value || "";
  const role = roleSelect.value;

  if(!validateLoginInputs()){
    // Inline errors already shown by validateLoginInputs
    return;
  }

  const r = await api("/api/login","POST",{username, role});
  if(r.ok){
    user = r.user; user.users = r.users;
    afterLogin();
  } else {
    // server-level failure (very unlikely in dummy login)
    usernameError.style.display = "block";
    usernameError.textContent = "Login failed. Try again.";
  }
});

/* -------------------------
   Remaining app logic
   ------------------------- */

function afterLogin(){
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("main").style.display = "block";
  document.getElementById("meName").innerText = user.name;
  if(user.role === "pm"){
    document.getElementById("pmPanel").style.display = "block";
    document.getElementById("userPanel").style.display = "none";
    document.getElementById("showAdd").onclick = showAdd;
  } else {
    document.getElementById("pmPanel").style.display = "none";
    document.getElementById("userPanel").style.display = "block";
  }
  loadUsers();
  loadTasks();
  checkOverdue();
}

function showAdd(){
  editingId = null;
  document.getElementById("taskForm").style.display = "block";
  document.getElementById("formTitle").innerText = "Add Task";
}

document.getElementById("cancelTask").onclick = ()=>{
  document.getElementById("taskForm").style.display = "none";
};

document.getElementById("saveTask").onclick = async () => {
  const title = document.getElementById("t_title").value.trim();
  const desc = document.getElementById("t_desc").value.trim();
  const deadline = document.getElementById("t_deadline").value;
  const assigned_user_id = document.getElementById("t_assigned").value;
  const status = document.getElementById("t_status").value;
  const errorBox = document.getElementById("taskFormError");

  // Reset error message
  errorBox.style.display = "none";
  errorBox.textContent = "";

  // INLINE VALIDATION
  if (!title) {
    errorBox.textContent = "Title is required.";
    errorBox.style.display = "block";
    return;
  }
  if (!desc) {
    errorBox.textContent = "Description is required.";
    errorBox.style.display = "block";
    return;
  }
  if (!assigned_user_id) {
    errorBox.textContent = "Assigned user is required.";
    errorBox.style.display = "block";
    return;
  }
  if (!deadline) {
    errorBox.textContent = "Deadline (date) is required.";
    errorBox.style.display = "block";
    return;
  }

  const payload = {
    title,
    description: desc,
    deadline,
    assigned_user_id: parseInt(assigned_user_id),
    status
  };

  if (editingId) {
    await api("/api/tasks/" + editingId, "PUT", payload);
  } else {
    await api("/api/tasks", "POST", payload);
  }

  errorBox.style.display = "none";
  document.getElementById("taskForm").style.display = "none";
  clearForm();
  loadTasks();
};




function clearForm(){
  document.getElementById("t_title").value="";
  document.getElementById("t_desc").value="";
  document.getElementById("t_deadline").value="";
  document.getElementById("t_assigned").value = "";
  document.getElementById("t_assigned_name").value = "";
  document.getElementById("t_status").value = "Pending";
}

async function loadUsers(){
  const users = await api("/api/users");
  usersCache = users;
  const sel = document.getElementById("t_assigned");
  sel.innerHTML = "<option value=''>--assign--</option>";
  users.forEach(u=>{
    const o = document.createElement("option");
    o.value = u.id; o.text = u.name;
    sel.appendChild(o);
  });

  // When selection changes, fill the assigned name field
  sel.onchange = ()=>{
    const v = sel.value;
    const nameInput = document.getElementById("t_assigned_name");
    if(!v){
      nameInput.value = "";
      return;
    }
    const found = usersCache.find(x => String(x.id) === String(v));
    nameInput.value = found ? found.name : "";
  };
}

async function loadTasks(){
  const rows = await api("/api/tasks");
  const tbody = document.querySelector("#tasksTable tbody");
  tbody.innerHTML = "";
  rows.forEach(t=>{
    // if user, show only assigned tasks
    if(user.role === "user" && t.assigned_user_name !== user.name) return;
    const tr = document.createElement("tr");
    const shortDesc = t.description ? (t.description.length > 120 ? t.description.slice(0, 120) + "..." : t.description) : "";
    tr.innerHTML = `<td>${escapeHtml(t.title)}</td>
      <td title="${escapeHtml(t.description || "")}">${escapeHtml(shortDesc)}</td>
      <td>${t.assigned_user_name || ""}</td>
      <td>${t.deadline || ""}</td>
      <td>${t.status}</td>
      <td></td>`;
    const actions = tr.querySelector("td:last-child");
    if(user.role === "pm"){
      const edit = document.createElement("button"); edit.textContent="Edit";
      edit.onclick = ()=>{ startEdit(t); };
      const del = document.createElement("button"); del.textContent="Delete";
      del.onclick = async ()=>{ if(confirm("Delete?")){ await api("/api/tasks/"+t.id,"DELETE"); loadTasks(); } };
      actions.appendChild(edit); actions.appendChild(del);
    } else {
      const sel = document.createElement("select");
      ["Pending","In Progress","Done"].forEach(s=>{
        const o = document.createElement("option"); o.value = s; o.text = s;
        if(s === t.status) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = async ()=>{
        await api("/api/tasks/"+t.id,"PUT",{status: sel.value});
        loadTasks();
      };
      actions.appendChild(sel);
    }
    tbody.appendChild(tr);
  });
}

function startEdit(t){
  editingId = t.id;
  document.getElementById("taskForm").style.display = "block";
  document.getElementById("formTitle").innerText = "Edit Task";
  document.getElementById("t_title").value = t.title;
  document.getElementById("t_desc").value = t.description || "";
  document.getElementById("t_deadline").value = t.deadline || "";
  document.getElementById("t_assigned").value = t.assigned_user_id || "";
  document.getElementById("t_assigned_name").value = t.assigned_user_name || "";
  document.getElementById("t_status").value = t.status || "Pending";
}

async function checkOverdue(){
  if(user.role !== "pm") return;
  const o = await api("/api/overdue");
  const el = document.getElementById("overdueNotice");
  if(o.length === 0){ el.innerHTML = "<div>No overdue tasks</div>"; return;}
  el.innerHTML = "<strong>Overdue tasks:</strong><ul>" + o.map(t=>`<li>${escapeHtml(t.title)} (assigned: ${escapeHtml(t.assigned_user || 'N/A')}) deadline: ${t.deadline}</li>`).join("") + "</ul>";
}

// refresh tasks periodically
setInterval(()=>{ if(user) loadTasks(); }, 30000);

// small helper to avoid HTML injection when injecting strings
function escapeHtml(text){
  if(!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
