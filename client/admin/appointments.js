const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";
const ENDPOINT = `${API_BASE}/appointments`;
const CUSTOMERS_ENDPOINT = `${API_BASE}/customers`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

const tbody = document.getElementById("appointmentsTbody");
const count = document.getElementById("appointmentsCount");
const apiText = document.getElementById("apiUrlText");
const orderSummary = document.getElementById("orderSummary");
const form = document.getElementById("appointmentForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const appointmentId = document.getElementById("appointment_id");
const customerId = document.getElementById("customer_id");
const orderId = document.getElementById("order_id");
const appointmentType = document.getElementById("appointment_type");
const appointmentDate = document.getElementById("appointment_date");
const appointmentTime = document.getElementById("appointment_time");
const statusField = document.getElementById("status");
const notes = document.getElementById("notes");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");

let customersCache = [];
let ordersCache = [];
let appointmentsCache = [];

if (apiText) apiText.textContent = urlOrderId ? `${ENDPOINT}?order_id=${urlOrderId}` : ENDPOINT;

function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function formatDate(value) { return value ? String(value).slice(0, 10) : ""; }
function formatTime(value) { return value ? String(value).slice(0, 5) : ""; }
async function fetchJson(url, options = {}) { const res = await fetch(url, options); const payload = await res.json().catch(() => null); if (!res.ok) throw new Error(payload?.message || `Request failed (${res.status})`); return payload; }

async function loadCustomers() {
  customersCache = await fetchJson(CUSTOMERS_ENDPOINT);
  customerId.innerHTML = `<option value="">Select customer...</option>` + customersCache.map(c => `
    <option value="${escapeHtml(c.customer_id)}">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</option>
  `).join("");
}

function renderOrderOptions() {
  const selectedCustomerId = customerId.value;
  const filtered = selectedCustomerId ? ordersCache.filter(o => String(o.customer_id) === String(selectedCustomerId)) : ordersCache;
  orderId.innerHTML = `<option value="">No order / general appointment</option>` + filtered.map(o => `
    <option value="${escapeHtml(o.order_id)}">#${escapeHtml(o.order_id)} - ${escapeHtml(o.first_name || "")} ${escapeHtml(o.last_name || "")} - ${escapeHtml(o.dress_name || "")}</option>
  `).join("");
  if (urlOrderId) orderId.value = urlOrderId;
}

async function loadOrders() {
  ordersCache = await fetchJson(ORDERS_ENDPOINT);
  if (urlOrderId) {
    const selected = ordersCache.find(o => String(o.order_id) === String(urlOrderId));
    if (selected) customerId.value = selected.customer_id;
  }
  renderOrderOptions();
  renderOrderSummary();
}

function renderOrderSummary() {
  if (!orderSummary) return;
  if (!urlOrderId) { orderSummary.innerHTML = `<div><strong>All Appointments</strong></div><div>Create appointments for any customer or order.</div>`; return; }
  const order = ordersCache.find(o => String(o.order_id) === String(urlOrderId));
  if (!order) return orderSummary.innerHTML = `<div class="text-danger">Selected order was not found.</div>`;
  orderSummary.innerHTML = `<div><strong>Selected Order #${escapeHtml(order.order_id)}</strong></div><div>Customer: ${escapeHtml(order.first_name || "")} ${escapeHtml(order.last_name || "")}</div><div>Dress: ${escapeHtml(order.dress_name || "")}</div>`;
}

async function loadAppointments() {
  try {
    let url = ENDPOINT;
    const q = new URLSearchParams();
    if (urlOrderId) q.set("order_id", urlOrderId);
    if (searchInput?.value.trim()) q.set("search", searchInput.value.trim());
    if (statusFilter?.value) q.set("status", statusFilter.value);
    const qs = q.toString();
    if (qs) url += `?${qs}`;
    const data = await fetchJson(url);
    appointmentsCache = Array.isArray(data) ? data : [];
    renderAppointments(appointmentsCache);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger">${escapeHtml(err.message)}</td></tr>`;
    count.textContent = "0 appointments";
  }
}

function renderAppointments(rows) {
  count.textContent = `${rows.length} appointment${rows.length === 1 ? "" : "s"}`;
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No appointments found</td></tr>`; return; }
  tbody.innerHTML = rows.map(a => `
    <tr>
      <td>${escapeHtml(a.appointment_id)}</td>
      <td>${a.order_id ? `<a href="appointments.html?order_id=${encodeURIComponent(a.order_id)}">#${escapeHtml(a.order_id)}</a>` : "-"}</td>
      <td>${escapeHtml(a.first_name || "")} ${escapeHtml(a.last_name || "")}</td>
      <td>${escapeHtml(a.phone || "")}</td>
      <td>${escapeHtml(a.dress_name || "")}</td>
      <td>${escapeHtml(a.appointment_type || "")}</td>
      <td>${escapeHtml(formatDate(a.appointment_date))}</td>
      <td>${escapeHtml(formatTime(a.appointment_time))}</td>
      <td>${escapeHtml(a.status || "")}</td>
      <td>${escapeHtml(a.notes || "")}</td>
      <td><button onclick="editAppointment(${Number(a.appointment_id)})" class="btn btn-sm btn-outline-primary">Edit</button> <button onclick="deleteAppointment(${Number(a.appointment_id)})" class="btn btn-sm btn-outline-danger">Delete</button></td>
    </tr>
  `).join("");
}

window.editAppointment = function (id) {
  const a = appointmentsCache.find(x => String(x.appointment_id) === String(id));
  if (!a) return alert("Appointment not found");
  appointmentId.value = a.appointment_id || "";
  customerId.value = a.customer_id || "";
  renderOrderOptions();
  orderId.value = a.order_id || "";
  appointmentType.value = a.appointment_type || "Consultation";
  appointmentDate.value = formatDate(a.appointment_date);
  appointmentTime.value = formatTime(a.appointment_time);
  statusField.value = a.status || "Scheduled";
  notes.value = a.notes || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteAppointment = async function (id) {
  if (!confirm("Delete appointment?")) return;
  try { await fetchJson(`${ENDPOINT}/${id}`, { method: "DELETE" }); await loadAppointments(); }
  catch (err) { alert(err.message || "Delete failed"); }
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!customerId.value) return alert("Please select a customer");
  if (!appointmentDate.value) return alert("Appointment date is required");
  const data = {
    customer_id: customerId.value,
    order_id: orderId.value || null,
    appointment_type: appointmentType.value,
    appointment_date: appointmentDate.value,
    appointment_time: appointmentTime.value || null,
    status: statusField.value,
    notes: notes.value.trim(),
  };
  const id = appointmentId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;
  try { await fetchJson(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); clearForm(); await loadAppointments(); }
  catch (err) { alert(err.message || "Save failed"); }
});

function clearForm() {
  appointmentId.value = "";
  form.reset();
  statusField.value = "Scheduled";
  appointmentType.value = "Consultation";
  if (urlOrderId) {
    const selected = ordersCache.find(o => String(o.order_id) === String(urlOrderId));
    if (selected) customerId.value = selected.customer_id;
    renderOrderOptions();
    orderId.value = urlOrderId;
  } else { customerId.value = ""; renderOrderOptions(); orderId.value = ""; }
}

customerId?.addEventListener("change", renderOrderOptions);
searchBtn?.addEventListener("click", loadAppointments);
resetBtn?.addEventListener("click", () => { if (searchInput) searchInput.value = ""; if (statusFilter) statusFilter.value = ""; loadAppointments(); });
cancelEditBtn?.addEventListener("click", clearForm);

(async function initAppointmentsPage() {
  try { await loadCustomers(); await loadOrders(); clearForm(); await loadAppointments(); }
  catch (err) { orderSummary.innerHTML = `<div class="text-danger">${escapeHtml(err.message)}</div>`; }
})();
