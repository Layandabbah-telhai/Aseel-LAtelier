const API_BASE = CONFIG.API_BASE;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

const apiText = document.getElementById("apiUrlText");
const orderSummary = document.getElementById("orderSummary");

const form = document.getElementById("paymentForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const paymentId = document.getElementById("payment_id");
const orderId = document.getElementById("order_id");
const amount = document.getElementById("amount");
const paymentDate = document.getElementById("payment_date");
const paymentMethod = document.getElementById("payment_method");
const notes = document.getElementById("notes");

const paymentsTbody = document.getElementById("paymentsTbody");
const paymentsCount = document.getElementById("paymentsCount");

let ordersCache = [];
let paymentsCache = [];

if (apiText) {
  apiText.textContent = urlOrderId
    ? `${ORDERS_ENDPOINT}/${urlOrderId}/payments`
    : `${ORDERS_ENDPOINT}/:order_id/payments`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function authHeaders(json = false) {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    Authorization: "Bearer " + localStorage.getItem("aseel_token"),
  };
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function renderOrderSummary() {
  if (!urlOrderId) {
    orderSummary.innerHTML = `
      <div><strong>All Payments</strong></div>
      <div>You can add a payment to any order, or open this page from one order only.</div>
    `;
    return;
  }

  const order = ordersCache.find((o) => String(o.order_id) === String(urlOrderId));

  if (!order) {
    orderSummary.innerHTML = `<div class="text-danger">Failed to load selected order.</div>`;
    return;
  }

  orderSummary.innerHTML = `
    <div><strong>Selected Order #${order.order_id}</strong></div>
    <div>Customer: ${escapeHtml(order.first_name || "")} ${escapeHtml(order.last_name || "")}</div>
    <div>Dress: ${escapeHtml(order.dress_name || "")}</div>
    <div>Occasion: ${escapeHtml(order.occasion_type || "")}</div>
  `;
}

async function loadOrders() {
  const res = await fetch(ORDERS_ENDPOINT, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error("Failed to load orders");
  }

  ordersCache = await res.json();

  orderId.innerHTML = `
    <option value="">Select order...</option>
    ${ordersCache.map((o) => `
      <option value="${o.order_id}">
        #${o.order_id} - ${escapeHtml(o.first_name || "")} ${escapeHtml(o.last_name || "")} - ${escapeHtml(o.dress_name || "")}
      </option>
    `).join("")}
  `;

  if (urlOrderId) {
    orderId.value = urlOrderId;
  }

  renderOrderSummary();
}

async function loadPaymentsForOrder(orderIdValue) {
  const res = await fetch(`${ORDERS_ENDPOINT}/${orderIdValue}/payments`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to load payments for order #${orderIdValue}`);
  }

  const rows = await res.json();

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    _order_id: Number(orderIdValue),
  }));
}

async function loadPayments() {
  try {
    let rows = [];

    if (urlOrderId) {
      rows = await loadPaymentsForOrder(urlOrderId);
    } else {
      const allRows = await Promise.all(
        ordersCache.map((o) => loadPaymentsForOrder(o.order_id))
      );
      rows = allRows.flat();
    }

    paymentsCache = rows;
    renderPayments(rows);
  } catch (error) {
    paymentsCache = [];
    paymentsTbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">${escapeHtml(error.message)}</td>
      </tr>
    `;
    paymentsCount.textContent = "0 payments";
  }
}

function renderPayments(rows) {
  paymentsCount.textContent = `${rows.length} payments`;

  if (!rows.length) {
    paymentsTbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">No payments found</td>
      </tr>
    `;
    return;
  }

  paymentsTbody.innerHTML = rows.map((p) => {
    const realOrderId = p.order_id || p._order_id;

    return `
      <tr>
        <td>${p.payment_id}</td>
        <td><a href="payments.html?order_id=${realOrderId}">#${realOrderId}</a></td>
        <td>${escapeHtml(p.first_name || "")} ${escapeHtml(p.last_name || "")}</td>
        <td>${formatMoney(p.amount)}</td>
        <td>${formatDate(p.payment_date)}</td>
        <td>${escapeHtml(p.payment_method || "")}</td>
        <td>${escapeHtml(p.notes || "")}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editPayment(${p.payment_id})">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${p.payment_id})">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.editPayment = function (id) {
  const p = paymentsCache.find((row) => String(row.payment_id) === String(id));

  if (!p) {
    alert("Payment not found");
    return;
  }

  paymentId.value = p.payment_id;
  orderId.value = p.order_id || p._order_id || "";
  amount.value = p.amount ?? "";
  paymentDate.value = formatDate(p.payment_date);
  paymentMethod.value = p.payment_method || "";
  notes.value = p.notes || "";
};

window.deletePayment = async function (id) {
  if (!confirm("Delete this payment?")) return;

  const res = await fetch(`${ORDERS_ENDPOINT}/payments/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    alert(payload?.message || "Failed to delete payment");
    return;
  }

  clearForm();
  await loadPayments();
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!orderId.value) {
    alert("Please select an order");
    return;
  }

  const data = {
    payment_date: paymentDate.value,
    amount: amount.value,
    payment_method: paymentMethod.value,
    notes: notes.value.trim(),
  };

  const currentOrderId = orderId.value;
  const currentPaymentId = paymentId.value;

  let res;

  // current backend supports POST create + DELETE.
  // keep save working reliably by using POST for new records.
  // if you are editing, we show clear message instead of fake save failure.
  if (currentPaymentId) {
    alert("Editing existing payments is not supported by the current backend yet. Delete and create a new payment instead.");
    return;
  }

  res = await fetch(`${ORDERS_ENDPOINT}/${currentOrderId}/payments`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    alert(payload?.message || "Failed to save payment");
    return;
  }

  clearForm();
  await loadPayments();
});

function clearForm() {
  paymentId.value = "";
  form.reset();

  if (urlOrderId) {
    orderId.value = urlOrderId;
  } else {
    orderId.value = "";
  }
}

cancelEditBtn.addEventListener("click", clearForm);

(async function init() {
  try {
    await loadOrders();
    clearForm();
    await loadPayments();
  } catch (error) {
    orderSummary.innerHTML = `<div class="text-danger">${escapeHtml(error.message)}</div>`;
  }
})();