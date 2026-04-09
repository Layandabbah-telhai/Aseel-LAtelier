const API_BASE = CONFIG.API_BASE;
const ENDPOINT = `${API_BASE}/payments`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const tbody = document.getElementById("paymentsTbody");
const paymentsCount = document.getElementById("paymentsCount");
const orderSummary = document.getElementById("orderSummary");

const form = document.getElementById("paymentForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const paymentId = document.getElementById("payment_id");
const orderId = document.getElementById("order_id");
const amount = document.getElementById("amount");
const paymentDate = document.getElementById("payment_date");
const paymentMethod = document.getElementById("payment_method");
const notes = document.getElementById("notes");

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

let ordersCache = [];

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

/* LOAD ORDERS */

async function loadOrders() {
  const res = await fetch(ORDERS_ENDPOINT, { headers: authHeaders() });
  ordersCache = await res.json();

  orderId.innerHTML = ordersCache.map(o =>
    `<option value="${o.order_id}">#${o.order_id} - ${escapeHtml(o.first_name)} ${escapeHtml(o.last_name)}</option>`
  ).join("");

  if (urlOrderId) {
    orderId.value = urlOrderId;
    renderOrderSummary();
  }
}

/* ORDER SUMMARY */

function renderOrderSummary() {
  if (!urlOrderId) {
    orderSummary.innerHTML = "<strong>All Payments</strong>";
    return;
  }

  const order = ordersCache.find(o => String(o.order_id) === String(urlOrderId));

  if (!order) return;

  orderSummary.innerHTML = `
    <div><strong>Order #${order.order_id}</strong></div>
    <div>${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}</div>
    <div>${escapeHtml(order.dress_name || "")}</div>
  `;
}

/* LOAD PAYMENTS */

async function loadPayments() {
  let url = ENDPOINT;

  if (urlOrderId) {
    url += `?order_id=${encodeURIComponent(urlOrderId)}`;
  }

  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();

  renderPayments(data);
}

function renderPayments(rows) {
  paymentsCount.textContent = `${rows.length} payments`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No payments</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(p => `
    <tr>
      <td>${p.payment_id}</td>
      <td><a href="payments.html?order_id=${p.order_id}">#${p.order_id}</a></td>
      <td>${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</td>
      <td>${Number(p.amount).toFixed(2)}</td>
      <td>${p.payment_date ? p.payment_date.slice(0,10) : ""}</td>
      <td>${escapeHtml(p.payment_method || "")}</td>
      <td>${escapeHtml(p.notes || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editPayment(${p.payment_id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${p.payment_id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

/* CRUD */

window.editPayment = async function (id) {
  const res = await fetch(`${ENDPOINT}/${id}`, { headers: authHeaders() });
  const p = await res.json();

  paymentId.value = p.payment_id;
  orderId.value = p.order_id;
  amount.value = p.amount;
  paymentDate.value = p.payment_date?.slice(0,10) || "";
  paymentMethod.value = p.payment_method || "";
  notes.value = p.notes || "";
};

window.deletePayment = async function (id) {
  if (!confirm("Delete payment?")) return;

  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  if (!res.ok) {
    alert("Delete failed");
    return;
  }

  loadPayments();
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    order_id: orderId.value,
    amount: amount.value,
    payment_date: paymentDate.value,
    payment_method: paymentMethod.value,
    notes: notes.value.trim()
  };

  const id = paymentId.value;
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
  loadPayments();
});

/* HELPERS */

function clearForm() {
  paymentId.value = "";
  form.reset();

  if (urlOrderId) {
    orderId.value = urlOrderId;
  }
}

cancelEditBtn.addEventListener("click", clearForm);

/* INIT */

(async function () {
  await loadOrders();
  await loadPayments();
})();