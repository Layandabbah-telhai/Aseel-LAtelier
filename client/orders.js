const API_BASE = CONFIG.API_BASE;
const ENDPOINT = `${API_BASE}/orders`;
const CUSTOMERS_ENDPOINT = `${API_BASE}/customers`;
const DRESSES_ENDPOINT = `${API_BASE}/dresses`;

const tbody = document.getElementById("ordersTbody");
const ordersCount = document.getElementById("ordersCount");
const apiText = document.getElementById("apiUrlText");

const form = document.getElementById("orderForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const orderId = document.getElementById("order_id");
const customerId = document.getElementById("customer_id");
const dressId = document.getElementById("dress_id");
const occasion = document.getElementById("occasion_type");
const orderDate = document.getElementById("order_date");
const statusField = document.getElementById("status");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");

let customersCache = [];
let dressesCache = [];

if (apiText) apiText.textContent = ENDPOINT;

function authHeaders(json = false) {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    "Authorization": "Bearer " + localStorage.getItem("aseel_token")
  };
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* LOAD DROPDOWNS */

async function loadCustomers() {
  const res = await fetch(CUSTOMERS_ENDPOINT, { headers: authHeaders() });
  customersCache = await res.json();

  customerId.innerHTML = customersCache.map(c =>
    `<option value="${c.customer_id}">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</option>`
  ).join("");
}

async function loadDresses() {
  const res = await fetch(DRESSES_ENDPOINT, { headers: authHeaders() });
  dressesCache = await res.json();

  dressId.innerHTML = dressesCache.map(d =>
    `<option value="${d.dress_id}">${escapeHtml(d.dress_name)}</option>`
  ).join("");
}

/* LOAD ORDERS */

async function loadOrders(search = "") {
  let url = ENDPOINT;
  if (search) url += "?search=" + encodeURIComponent(search);

  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();

  renderOrders(data);
}

function renderOrders(rows) {
  ordersCount.textContent = `${rows.length} orders`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No orders</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(o => `
    <tr>
      <td>${o.order_id}</td>
      <td>${escapeHtml(o.first_name)} ${escapeHtml(o.last_name)}</td>
      <td>${escapeHtml(o.dress_name || "")}</td>
      <td>${escapeHtml(o.occasion_type || "")}</td>
      <td>${o.order_date ? o.order_date.slice(0,10) : ""}</td>
      <td>${escapeHtml(o.status)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editOrder(${o.order_id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder(${o.order_id})">Delete</button>

        <a class="btn btn-sm btn-outline-secondary" href="payments.html?order_id=${o.order_id}">Payments</a>
        <a class="btn btn-sm btn-outline-secondary" href="measurements.html?order_id=${o.order_id}">Measurements</a>
        <a class="btn btn-sm btn-outline-secondary" href="seamstresses.html?order_id=${o.order_id}">Assignments</a>
        <a class="btn btn-sm btn-outline-secondary" href="appointments.html?order_id=${o.order_id}">Appointments</a>
      </td>
    </tr>
  `).join("");
}

/* CRUD */

window.editOrder = async function (id) {
  const res = await fetch(`${ENDPOINT}/${id}`, { headers: authHeaders() });
  const o = await res.json();

  orderId.value = o.order_id;
  customerId.value = o.customer_id;
  dressId.value = o.dress_id;
  occasion.value = o.occasion_type || "";
  orderDate.value = o.order_date ? o.order_date.slice(0,10) : "";
  statusField.value = o.status;
};

window.deleteOrder = async function (id) {
  if (!confirm("Delete order?")) return;

  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  if (!res.ok) {
    alert("Delete failed");
    return;
  }

  loadOrders();
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    customer_id: customerId.value,
    dress_id: dressId.value,
    occasion_type: occasion.value,
    order_date: orderDate.value,
    status: statusField.value
  };

  const id = orderId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;

  const res = await fetch(url, {
    method,
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    alert("Save failed");
    return;
  }

  clearForm();
  loadOrders();
});

/* HELPERS */

function clearForm() {
  orderId.value = "";
  form.reset();
  statusField.value = "In Progress";
}

searchBtn.addEventListener("click", () => {
  loadOrders(searchInput.value.trim());
});

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadOrders();
});

cancelEditBtn.addEventListener("click", clearForm);

/* INIT */

(async function () {
  await loadCustomers();
  await loadDresses();
  await loadOrders();
})();