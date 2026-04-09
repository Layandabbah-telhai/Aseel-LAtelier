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

const customerId = document.getElementById("customer_id");
const orderId = document.getElementById("order_id");

if (apiText) {
  apiText.textContent = urlOrderId
    ? `${ENDPOINT}?order_id=${urlOrderId}`
    : ENDPOINT;
}

let orders = [];

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

  count.textContent = `${data.length} appointments`;

  tbody.innerHTML = data.map(a => `
    <tr>
      <td>${a.appointment_id}</td>
      <td>${a.order_id ? `<a href="?order_id=${a.order_id}">#${a.order_id}</a>` : ""}</td>
      <td>${a.first_name} ${a.last_name}</td>
      <td>${a.appointment_date}</td>
      <td>${a.status}</td>
      <td>
        <button onclick="deleteAppointment(${a.appointment_id})" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function deleteAppointment(id) {
  if (!confirm("Delete?")) return;

  await fetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
  loadAppointments();
}

(async function init() {
  await loadCustomers();
  await loadOrders();
  await loadAppointments();
})();