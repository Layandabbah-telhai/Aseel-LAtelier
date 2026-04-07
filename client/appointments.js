const API_BASE = CONFIG.API_BASE;
const ENDPOINT = `${API_BASE}/appointments`;
const CUSTOMERS_ENDPOINT = `${API_BASE}/customers`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const statusFilter = document.getElementById("statusFilter");
const tbody = document.getElementById("appointmentsTbody");
const appointmentsCount = document.getElementById("appointmentsCount");
const apiText = document.getElementById("apiUrlText");

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

let customersCache = [];
let ordersCache = [];

if (apiText) apiText.textContent = ENDPOINT;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString();
}

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function renderStatusBadge(status) {
  const value = String(status || "");
  let style = "background:#ece8e6; color:#6f625e; border:1px solid #ddd3cf;";

  if (value === "Scheduled") {
    style = "background:#eee8f8; color:#6f5f8d; border:1px solid #ddd2f0;";
  } else if (value === "Completed") {
    style = "background:#e8f3ea; color:#50735c; border:1px solid #d4e7d8;";
  } else if (value === "Cancelled") {
    style = "background:#f8e7e7; color:#9d5c5c; border:1px solid #efcece;";
  } else if (value === "Missed") {
    style = "background:#f8efe2; color:#8a6c42; border:1px solid #efddbf;";
  }

  return `<span class="rounded-pill px-3 py-2 d-inline-block" style="${style}">${escapeHtml(value)}</span>`;
}

async function loadCustomers() {
  const res = await fetch(CUSTOMERS_ENDPOINT);
  customersCache = await res.json();

  customerId.innerHTML = customersCache
    .map(
      (c) =>
        `<option value="${c.customer_id}">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)} (${escapeHtml(c.phone)})</option>`
    )
    .join("");
}

async function loadOrders() {
  const res = await fetch(ORDERS_ENDPOINT);
  ordersCache = await res.json();
  renderOrderOptions();
}

function renderOrderOptions() {
  const selectedCustomerId = customerId.value;

  const filteredOrders = selectedCustomerId
    ? ordersCache.filter((o) => String(o.customer_id) === String(selectedCustomerId))
    : ordersCache;

  orderId.innerHTML = [
    `<option value="">No order</option>`,
    ...filteredOrders.map(
      (o) =>
        `<option value="${o.order_id}">#${o.order_id} - ${escapeHtml(o.dress_name || "")} ${o.occasion_type ? `(${escapeHtml(o.occasion_type)})` : ""}</option>`
    ),
  ].join("");
}

async function loadAppointments() {
  try {
    let url = ENDPOINT;
    const params = new URLSearchParams();

    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
    if (statusFilter.value.trim()) params.set("status", statusFilter.value.trim());

    if ([...params.keys()].length) {
      url += "?" + params.toString();
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load appointments (${res.status})`);
    }

    const appointments = await res.json();
    renderAppointments(appointments);
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-danger">${error.message}</td>
      </tr>
    `;
    appointmentsCount.textContent = "0 appointments";
  }
}

function renderAppointments(appointments) {
  appointmentsCount.textContent = `${appointments.length} appointments`;

  if (!appointments.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-muted">No appointments found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appointments
    .map((a) => `
      <tr>
        <td>${a.appointment_id}</td>
        <td>${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}</td>
        <td>${escapeHtml(a.phone || "")}</td>
        <td>${a.order_id ? `#${a.order_id}${a.occasion_type ? ` - ${escapeHtml(a.occasion_type)}` : ""}` : ""}</td>
        <td>${escapeHtml(a.dress_name || "")}</td>
        <td>${escapeHtml(a.appointment_type)}</td>
        <td>${formatDate(a.appointment_date)}</td>
        <td>${formatTime(a.appointment_time)}</td>
        <td>${renderStatusBadge(a.status)}</td>
        <td>${escapeHtml(a.notes || "")}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editAppointment(${a.appointment_id})">
            Edit
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteAppointment(${a.appointment_id})">
            Delete
          </button>
        </td>
      </tr>
    `)
    .join("");
}

window.editAppointment = async function (id) {
  const res = await fetch(`${ENDPOINT}/${id}`);
  if (!res.ok) {
    alert("Failed to load appointment");
    return;
  }

  const a = await res.json();

  appointmentId.value = a.appointment_id;
  customerId.value = a.customer_id;
  renderOrderOptions();
  orderId.value = a.order_id || "";
  appointmentType.value = a.appointment_type || "Consultation";
  appointmentDate.value = a.appointment_date ? a.appointment_date.slice(0, 10) : "";
  appointmentTime.value = a.appointment_time ? String(a.appointment_time).slice(0, 5) : "";
  statusField.value = a.status || "Scheduled";
  notes.value = a.notes || "";
};

window.deleteAppointment = async function (id) {
  if (!confirm("Delete this appointment?")) return;

  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    alert("Failed to delete appointment");
    return;
  }

  loadAppointments();
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    customer_id: customerId.value,
    order_id: orderId.value,
    appointment_type: appointmentType.value,
    appointment_date: appointmentDate.value,
    appointment_time: appointmentTime.value,
    status: statusField.value,
    notes: notes.value.trim(),
  };

  const id = appointmentId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    alert(err?.message || "Failed to save appointment");
    return;
  }

  clearForm();
  loadAppointments();
});

function clearForm() {
  appointmentId.value = "";
  form.reset();
  statusField.value = "Scheduled";
  appointmentType.value = "Consultation";
  renderOrderOptions();
}

searchBtn.addEventListener("click", loadAppointments);

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";
  loadAppointments();
});

cancelEditBtn.addEventListener("click", clearForm);
customerId.addEventListener("change", renderOrderOptions);

(async function init() {
  await loadCustomers();
  await loadOrders();
  clearForm();
  await loadAppointments();
})();