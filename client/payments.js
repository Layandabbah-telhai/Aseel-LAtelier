const API_BASE = CONFIG.API_BASE;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const apiText = document.getElementById("apiUrlText");
const orderSummary = document.getElementById("orderSummary");
const paymentsSummary = document.getElementById("paymentsSummary");
const paymentsTbody = document.getElementById("paymentsTbody");

const paymentForm = document.getElementById("paymentForm");
const selectedOrderField = document.getElementById("selected_order_id");
const paymentDate = document.getElementById("payment_date");
const amount = document.getElementById("amount");
const paymentMethod = document.getElementById("payment_method");
const dueDate = document.getElementById("due_date");
const referenceNumber = document.getElementById("reference_number");
const paymentStatus = document.getElementById("payment_status");
const paymentNotes = document.getElementById("payment_notes");

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

let ordersCache = [];

if (apiText) {
  apiText.textContent = urlOrderId
    ? `${ORDERS_ENDPOINT}/${urlOrderId}/payments`
    : `${ORDERS_ENDPOINT}/.../payments`;
}

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

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function renderPaymentStatus(status) {
  const value = String(status || "").toLowerCase();
  let style = "background:#ece8e6; color:#6f625e; border:1px solid #ddd3cf;";

  if (value === "paid") {
    style = "background:#e8f3ea; color:#50735c; border:1px solid #d4e7d8;";
  } else if (value === "partial") {
    style = "background:#f8efe2; color:#8a6c42; border:1px solid #efddbf;";
  } else if (value === "unpaid" || value === "pending") {
    style = "background:#f8e7e7; color:#9d5c5c; border:1px solid #efcece;";
  }

  return `<span class="rounded-pill px-3 py-2 d-inline-block" style="${style}">${escapeHtml(status)}</span>`;
}

function getCustomerName(order) {
  if (order.first_name || order.last_name) {
    return `${escapeHtml(order.first_name || "")} ${escapeHtml(order.last_name || "")}`.trim();
  }
  return escapeHtml(order.customer_name || "");
}

function renderOrderOptions() {
  selectedOrderField.innerHTML = ordersCache.map((order) => `
    <option value="${order.order_id}">
      #${order.order_id} - ${getCustomerName(order)} - ${escapeHtml(order.dress_name || "")}
    </option>
  `).join("");

  if (urlOrderId) {
    selectedOrderField.value = urlOrderId;
  }
}

async function loadOrders() {
  const res = await fetch(ORDERS_ENDPOINT);
  if (!res.ok) {
    throw new Error("Failed to load orders");
  }

  ordersCache = await res.json();
  renderOrderOptions();
}

async function loadOrderSummary() {
  if (urlOrderId) {
    const res = await fetch(`${ORDERS_ENDPOINT}/${urlOrderId}`);
    if (!res.ok) {
      orderSummary.innerHTML = `<div class="text-danger">Failed to load order.</div>`;
      return;
    }

    const order = await res.json();

    orderSummary.innerHTML = `
      <div><strong>Selected Order #${order.order_id}</strong></div>
      <div>Customer: ${getCustomerName(order)}</div>
      <div>Dress: ${escapeHtml(order.dress_name || "")}</div>
      <div>Total Price: ${formatMoney(order.total_price)}</div>
    `;
    return;
  }

  orderSummary.innerHTML = `
    <div><strong>All Payments</strong></div>
    <div>Select any order in the form to add a payment, or open this page from an order to focus on one order only.</div>
  `;
}

async function loadPaymentsForOrder(orderId) {
  const res = await fetch(`${ORDERS_ENDPOINT}/${orderId}/payments`);
  if (!res.ok) {
    throw new Error(`Failed to load payments (${res.status})`);
  }

  const payments = await res.json();
  return payments.map((payment) => ({
    ...payment,
    order_id: orderId
  }));
}

async function loadPayments() {
  try {
    let payments = [];

    if (urlOrderId) {
      payments = await loadPaymentsForOrder(urlOrderId);
    } else {
      const allPayments = await Promise.all(
        ordersCache.map((order) => loadPaymentsForOrder(order.order_id))
      );
      payments = allPayments.flat();
    }

    const paymentsWithOrderInfo = payments.map((payment) => {
      const order = ordersCache.find((o) => String(o.order_id) === String(payment.order_id)) || {};
      return {
        ...payment,
        customer_name: getCustomerName(order),
        dress_name: order.dress_name || ""
      };
    });

    paymentsSummary.textContent = `${paymentsWithOrderInfo.length} payments`;

    if (!paymentsWithOrderInfo.length) {
      paymentsTbody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center text-muted">No payments found</td>
        </tr>
      `;
      return;
    }

    paymentsTbody.innerHTML = paymentsWithOrderInfo.map((p) => `
      <tr>
        <td>${p.payment_id}</td>
        <td>
          <a href="payments.html?order_id=${p.order_id}">#${p.order_id}</a>
        </td>
        <td>${escapeHtml(p.customer_name || "")}</td>
        <td>${formatDate(p.payment_date)}</td>
        <td>${formatMoney(p.amount)}</td>
        <td>${escapeHtml(p.payment_method || "")}</td>
        <td>${formatDate(p.due_date)}</td>
        <td>${escapeHtml(p.reference_number || "")}</td>
        <td>${renderPaymentStatus(p.payment_status || "Paid")}</td>
        <td>${escapeHtml(p.notes || "")}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${p.payment_id}, ${p.order_id})">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    paymentsTbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center text-danger">${error.message}</td>
      </tr>
    `;
  }
}

window.deletePayment = async function (paymentId, orderId) {
  if (!confirm("Delete this payment?")) return;

  const res = await fetch(`${ORDERS_ENDPOINT}/payments/${paymentId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    alert("Failed to delete payment");
    return;
  }

  await loadPayments();

  if (urlOrderId && String(urlOrderId) === String(orderId)) {
    await loadOrderSummary();
  }
};

paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const selectedOrderId = selectedOrderField.value;

  if (!selectedOrderId) {
    alert("Please select an order");
    return;
  }

  const data = {
    payment_date: paymentDate.value,
    amount: amount.value,
    payment_method: paymentMethod.value,
    due_date: dueDate.value,
    reference_number: referenceNumber.value,
    payment_status: paymentStatus.value,
    notes: paymentNotes.value,
  };

  const res = await fetch(`${ORDERS_ENDPOINT}/${selectedOrderId}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    alert(err?.message || "Failed to add payment");
    return;
  }

  paymentForm.reset();
  paymentDate.value = new Date().toISOString().slice(0, 10);
  paymentMethod.value = "Cash";
  await loadPayments();
  await loadOrderSummary();
});

(async function init() {
  paymentDate.value = new Date().toISOString().slice(0, 10);
  paymentMethod.value = "Cash";

  await loadOrders();
  await loadOrderSummary();
  await loadPayments();
})();