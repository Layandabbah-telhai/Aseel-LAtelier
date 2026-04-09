const API_BASE = CONFIG.API_BASE;
const SEAMSTRESSES_ENDPOINT = `${API_BASE}/seamstresses`;
const ASSIGNMENTS_ENDPOINT = `${API_BASE}/seamstresses/assignments`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

const seamstressesTbody = document.getElementById("seamstressesTbody");
const assignmentsTbody = document.getElementById("assignmentsTbody");
const assignmentsCount = document.getElementById("assignmentsCount");

const seamstressForm = document.getElementById("seamstressForm");
const assignmentForm = document.getElementById("assignmentForm");

const seamstressId = document.getElementById("seamstress_id");
const nameField = document.getElementById("name");
const phoneField = document.getElementById("phone");

const assignmentId = document.getElementById("assignment_id");
const orderIdField = document.getElementById("order_id");
const seamstressSelect = document.getElementById("assigned_seamstress_id");
const taskType = document.getElementById("task_type");
const notes = document.getElementById("assignment_notes");

let seamstressesCache = [];
let assignmentsCache = [];
let ordersCache = [];

function authHeaders(json = false) {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    "Authorization": "Bearer " + localStorage.getItem("aseel_token")
  };
}

/* LOAD */

async function loadSeamstresses() {
  const res = await fetch(SEAMSTRESSES_ENDPOINT, { headers: authHeaders() });
  seamstressesCache = await res.json();

  seamstressSelect.innerHTML = `
    <option value="">Select seamstress</option>
    ${seamstressesCache.map(s => `
      <option value="${s.seamstress_id}">${s.name}</option>
    `).join("")}
  `;
}

async function loadOrders() {
  const res = await fetch(ORDERS_ENDPOINT, { headers: authHeaders() });
  ordersCache = await res.json();

  orderIdField.innerHTML = `
    <option value="">Select order</option>
    ${ordersCache.map(o => `
      <option value="${o.order_id}">
        #${o.order_id} - ${o.first_name} ${o.last_name}
      </option>
    `).join("")}
  `;

  if (urlOrderId) orderIdField.value = urlOrderId;
}

async function loadAssignments() {
  let url = ASSIGNMENTS_ENDPOINT;

  if (urlOrderId) {
    url += `?order_id=${urlOrderId}`;
  }

  const res = await fetch(url, { headers: authHeaders() });
  assignmentsCache = await res.json();

  renderAssignments(assignmentsCache);
}

/* RENDER */

function renderAssignments(rows) {
  assignmentsCount.textContent = `${rows.length}`;

  assignmentsTbody.innerHTML = rows.map(a => `
    <tr>
      <td>${a.assignment_id}</td>
      <td>#${a.order_id}</td>
      <td>${a.first_name} ${a.last_name}</td>
      <td>${a.dress_name || ""}</td>
      <td>${a.name}</td>
      <td>${a.task_type || ""}</td>
      <td>${a.assignment_notes || ""}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editAssignment(${a.assignment_id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAssignment(${a.assignment_id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

/* CRUD */

window.editAssignment = function (id) {
  const a = assignmentsCache.find(x => x.assignment_id === id);
  if (!a) return;

  assignmentId.value = a.assignment_id;
  orderIdField.value = a.order_id;
  seamstressSelect.value = a.seamstress_id;
  taskType.value = a.task_type || "";
  notes.value = a.assignment_notes || "";
};

window.deleteAssignment = async function (id) {
  if (!confirm("Delete assignment?")) return;

  const res = await fetch(`${ASSIGNMENTS_ENDPOINT}/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  if (!res.ok) {
    alert("Delete failed");
    return;
  }

  loadAssignments();
};

assignmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    order_id: orderIdField.value,
    seamstress_id: seamstressSelect.value,
    task_type: taskType.value,
    notes: notes.value
  };

  const id = assignmentId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ASSIGNMENTS_ENDPOINT}/${id}` : ASSIGNMENTS_ENDPOINT;

  await fetch(url, {
    method,
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  assignmentForm.reset();
  loadAssignments();
});

/* INIT */

(async function () {
  await loadSeamstresses();
  await loadOrders();
  await loadAssignments();
})();