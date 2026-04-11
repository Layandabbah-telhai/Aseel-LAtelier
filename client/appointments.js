const API_BASE = CONFIG.API_BASE;
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
const status = document.getElementById("status");
const notes = document.getElementById("notes");

let orders = [];
let appointmentsCache = [];

if (apiText) {
  apiText.textContent = urlOrderId
    ? `${ENDPOINT}?order_id=${urlOrderId}`
    : ENDPOINT;
}

/* LOAD DATA */

async function loadOrders() {
  const res = await fetch(ORDERS_ENDPOINT);
  orders = await res.json();

  orderId.innerHTML = `<option value="">No order</option>` +
    orders.map(o => `<option value="${o.order_id}">#${o.order_id}</option>`).join("");

  if (urlOrderId) {
    orderId.value = urlOrderId;
    const o = orders.find(x => String(x.order_id) === urlOrderId);
    if (o) {
      orderSummary.innerHTML = `<strong>Order #${o.order_id}</strong>`;
    }
  }
}

async function loadCustomers() {
  const res = await fetch(CUSTOMERS_ENDPOINT);
  const data = await res.json();

  customerId.innerHTML = `<option value="">Select customer</option>` +
    data.map(c => `<option value="${c.customer_id}">${c.first_name} ${c.last_name}</option>`).join("");
}

async function loadAppointments() {
  let url = ENDPOINT;

  if (urlOrderId) {
    url += `?order_id=${urlOrderId}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  appointmentsCache = data;
  count.textContent = `${data.length} appointments`;

  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${a.appointment_id}</td>
      <td>${a.order_id ? `<a href="?order_id=${a.order_id}">#${a.order_id}</a>` : ""}</td>
      <td>${a.first_name} ${a.last_name}</td>
      <td>${a.phone || ""}</td>
      <td>${a.dress_name || ""}</td>
      <td>${a.appointment_type || ""}</td>
      <td>${a.appointment_date || ""}</td>
      <td>${a.appointment_time || ""}</td>
      <td>${a.status}</td>
      <td>${a.notes || ""}</td>
      <td>
        <button onclick="editAppointment(${a.appointment_id})" class="btn btn-sm btn-primary">Edit</button>
        <button onclick="deleteAppointment(${a.appointment_id})" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>
  `).join("");
}

/* EDIT */

window.editAppointment = function (id) {
  const a = appointmentsCache.find(x => x.appointment_id == id);
  if (!a) return;

  appointmentId.value = a.appointment_id;
  customerId.value = a.customer_id;
  orderId.value = a.order_id || "";
  appointmentType.value = a.appointment_type;
  appointmentDate.value = a.appointment_date;
  appointmentTime.value = a.appointment_time || "";
  status.value = a.status;
  notes.value = a.notes || "";
};

/* DELETE */

window.deleteAppointment = async function (id) {
  if (!confirm("Delete?")) return;

  await fetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
  loadAppointments();
};

/* SAVE */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    customer_id: customerId.value,
    order_id: orderId.value,
    appointment_type: appointmentType.value,
    appointment_date: appointmentDate.value,
    appointment_time: appointmentTime.value,
    status: status.value,
    notes: notes.value
  };

  const id = appointmentId.value;

  const method = id ? "PUT" : "POST";
  const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  clearForm();
  loadAppointments();
});

/* CLEAR */

function clearForm() {
  appointmentId.value = "";
  form.reset();

  if (urlOrderId) {
    orderId.value = urlOrderId;
  }
}

cancelEditBtn.addEventListener("click", clearForm);

/* INIT */

(async function init() {
  await loadCustomers();
  await loadOrders();
  await loadAppointments();
})();