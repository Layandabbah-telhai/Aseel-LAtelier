const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";
const SEAMSTRESSES_ENDPOINT = `${API_BASE}/seamstresses`;
const ASSIGNMENTS_ENDPOINT = `${API_BASE}/seamstresses/assignments`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

const orderSummary = document.getElementById("orderSummary");
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
const cancelSeamstressEditBtn = document.getElementById("cancelSeamstressEditBtn");
const cancelAssignmentEditBtn = document.getElementById("cancelAssignmentEditBtn");

let seamstressesCache = [];
let assignmentsCache = [];
let ordersCache = [];

function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
async function fetchJson(url, options = {}) { const res = await fetch(url, options); const payload = await res.json().catch(() => null); if (!res.ok) throw new Error(payload?.message || `Request failed (${res.status})`); return payload; }

async function loadSeamstresses() {
  seamstressesCache = await fetchJson(SEAMSTRESSES_ENDPOINT);
  seamstressSelect.innerHTML = `<option value="">Select seamstress...</option>` + seamstressesCache.map(s => `
    <option value="${escapeHtml(s.seamstress_id)}">${escapeHtml(s.name || s.full_name || "")}</option>
  `).join("");
  renderSeamstresses();
}

function renderSeamstresses() {
  if (!seamstressesTbody) return;
  if (!seamstressesCache.length) { seamstressesTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No seamstresses found</td></tr>`; return; }
  seamstressesTbody.innerHTML = seamstressesCache.map(s => `
    <tr>
      <td>${escapeHtml(s.seamstress_id)}</td><td>${escapeHtml(s.name || s.full_name || "")}</td><td>${escapeHtml(s.phone || "")}</td>
      <td><button class="btn btn-sm btn-outline-primary" onclick="editSeamstress(${Number(s.seamstress_id)})">Edit</button> <button class="btn btn-sm btn-outline-danger" onclick="deleteSeamstress(${Number(s.seamstress_id)})">Delete</button></td>
    </tr>
  `).join("");
}

async function loadOrders() {
  ordersCache = await fetchJson(ORDERS_ENDPOINT);
  orderIdField.innerHTML = `<option value="">Select order...</option>` + ordersCache.map(o => `
    <option value="${escapeHtml(o.order_id)}">#${escapeHtml(o.order_id)} - ${escapeHtml(o.first_name || "")} ${escapeHtml(o.last_name || "")} - ${escapeHtml(o.dress_name || "")}</option>
  `).join("");
  if (urlOrderId) orderIdField.value = urlOrderId;
  renderOrderSummary();
}

function renderOrderSummary() {
  if (!orderSummary) return;
  if (!urlOrderId) { orderSummary.innerHTML = `<div><strong>All Assignments</strong></div><div>Assign seamstresses to any order.</div>`; return; }
  const order = ordersCache.find(o => String(o.order_id) === String(urlOrderId));
  if (!order) return orderSummary.innerHTML = `<div class="text-danger">Selected order was not found.</div>`;
  orderSummary.innerHTML = `<div><strong>Selected Order #${escapeHtml(order.order_id)}</strong></div><div>Customer: ${escapeHtml(order.first_name || "")} ${escapeHtml(order.last_name || "")}</div><div>Dress: ${escapeHtml(order.dress_name || "")}</div>`;
}

async function loadAssignments() {
  try {
    let url = ASSIGNMENTS_ENDPOINT;
    if (urlOrderId) url += `?order_id=${encodeURIComponent(urlOrderId)}`;
    assignmentsCache = await fetchJson(url);
    renderAssignments(assignmentsCache);
  } catch (err) {
    assignmentsTbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${escapeHtml(err.message)}</td></tr>`;
    assignmentsCount.textContent = "0";
  }
}

function renderAssignments(rows) {
  assignmentsCount.textContent = `${rows.length}`;
  if (!rows.length) { assignmentsTbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No assignments found</td></tr>`; return; }
  assignmentsTbody.innerHTML = rows.map(a => `
    <tr>
      <td>${escapeHtml(a.assignment_id)}</td><td>#${escapeHtml(a.order_id)}</td>
      <td>${escapeHtml(a.first_name || a.customer_name || "")} ${escapeHtml(a.last_name || "")}</td>
      <td>${escapeHtml(a.dress_name || "")}</td><td>${escapeHtml(a.name || a.seamstress_name || "")}</td>
      <td>${escapeHtml(a.task_type || a.task_description || "")}</td><td>${escapeHtml(a.assignment_notes || a.notes || "")}</td>
      <td><button class="btn btn-sm btn-outline-primary" onclick="editAssignment(${Number(a.assignment_id)})">Edit</button> <button class="btn btn-sm btn-outline-danger" onclick="deleteAssignment(${Number(a.assignment_id)})">Delete</button></td>
    </tr>
  `).join("");
}

window.editSeamstress = function (id) {
  const s = seamstressesCache.find(x => String(x.seamstress_id) === String(id));
  if (!s) return;
  seamstressId.value = s.seamstress_id || "";
  nameField.value = s.name || s.full_name || "";
  phoneField.value = s.phone || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteSeamstress = async function (id) {
  if (!confirm("Delete seamstress?")) return;
  try { await fetchJson(`${SEAMSTRESSES_ENDPOINT}/${id}`, { method: "DELETE" }); await loadSeamstresses(); await loadAssignments(); }
  catch (err) { alert(err.message || "Delete failed"); }
};

window.editAssignment = function (id) {
  const a = assignmentsCache.find(x => String(x.assignment_id) === String(id));
  if (!a) return;
  assignmentId.value = a.assignment_id || "";
  orderIdField.value = a.order_id || "";
  seamstressSelect.value = a.seamstress_id || "";
  taskType.value = a.task_type || a.task_description || "";
  notes.value = a.assignment_notes || a.notes || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteAssignment = async function (id) {
  if (!confirm("Delete assignment?")) return;
  try { await fetchJson(`${ASSIGNMENTS_ENDPOINT}/${id}`, { method: "DELETE" }); clearAssignmentForm(); await loadAssignments(); }
  catch (err) { alert(err.message || "Delete failed"); }
};

seamstressForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!nameField.value.trim()) return alert("Name is required");
  const data = { name: nameField.value.trim(), phone: phoneField.value.trim() };
  const id = seamstressId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${SEAMSTRESSES_ENDPOINT}/${id}` : SEAMSTRESSES_ENDPOINT;
  try { await fetchJson(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); clearSeamstressForm(); await loadSeamstresses(); }
  catch (err) { alert(err.message || "Save failed"); }
});

assignmentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!orderIdField.value) return alert("Please select an order");
  if (!seamstressSelect.value) return alert("Please select a seamstress");
  const data = { order_id: orderIdField.value, seamstress_id: seamstressSelect.value, task_type: taskType.value, notes: notes.value.trim() };
  const id = assignmentId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ASSIGNMENTS_ENDPOINT}/${id}` : ASSIGNMENTS_ENDPOINT;
  try { await fetchJson(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); clearAssignmentForm(); await loadAssignments(); }
  catch (err) { alert(err.message || "Save failed"); }
});

function clearSeamstressForm() { seamstressId.value = ""; seamstressForm.reset(); }
function clearAssignmentForm() { assignmentId.value = ""; assignmentForm.reset(); orderIdField.value = urlOrderId || ""; seamstressSelect.value = ""; }

cancelSeamstressEditBtn?.addEventListener("click", clearSeamstressForm);
cancelAssignmentEditBtn?.addEventListener("click", clearAssignmentForm);

(async function initSeamstressesPage() {
  try { await loadSeamstresses(); await loadOrders(); clearAssignmentForm(); await loadAssignments(); }
  catch (err) { if (orderSummary) orderSummary.innerHTML = `<div class="text-danger">${escapeHtml(err.message)}</div>`; }
})();
