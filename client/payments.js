const API_BASE = CONFIG.API_BASE;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const apiText = document.getElementById("apiUrlText");
const orderSummary = document.getElementById("orderSummary");
const paymentsSummary = document.getElementById("paymentsSummary");
const paymentsTbody = document.getElementById("paymentsTbody");

const paymentForm = document.getElementById("paymentForm");
const paymentDate = document.getElementById("payment_date");
const amount = document.getElementById("amount");
const paymentMethod = document.getElementById("payment_method");
const dueDate = document.getElementById("due_date");
const referenceNumber = document.getElementById("reference_number");
const paymentStatus = document.getElementById("payment_status");
const paymentNotes = document.getElementById("payment_notes");

const params = new URLSearchParams(window.location.search);
const selectedOrderId = params.get("order_id");

if (!selectedOrderId) {
  alert("No order selected");
  window.location.href = "orders.html";
}

if (apiText) apiText.textContent = `${ORDERS_ENDPOINT}/${selectedOrderId}/payments`;

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

async function loadOrderSummary() {
  const res = await fetch(`${ORDERS_ENDPOINT}/${selectedOrderId}`);
  if (!res.ok) {
    orderSummary.innerHTML = `<div class="text-danger">Failed to load order.</div>`;
    return;
  }

  const order = await res.json();

  const customerName =
    order.first_name || order.last_name
      ? `${escapeHtml(order.first_name || "")} ${escapeHtml(order.last_name || "")}`.trim()
      : escapeHtml(order.customer_name || "");

  orderSummary.innerHTML = `
    <div><strong>Order #${order.order_id}</strong></div>
    <div>Customer: ${customerName}</div>
    <div>Dress: ${escapeHtml(order.dress_name || "")}</div>
    <div>Total Price: ${formatMoney(order.total_price)}</div>
  `;
}

async function loadPayments() {
  try {
    const res = await fetch(`${ORDERS_ENDPOINT}/${selectedOrderId}/payments`);
    if (!res.ok) throw new Error(`Failed to load payments (${res.status})`);

    const payments = await res.json();
    paymentsSummary.textContent = `${payments.length} payments`;

    if (!payments.length) {
      paymentsTbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-muted">No payments found</td>
        </tr>
      `;
      return;
    }

    paymentsTbody.innerHTML = payments.map((p) => `
      <tr>
        <td>${p.payment_id}</td>
        <td>${formatDate(p.payment_date)}</td>
        <td>${formatMoney(p.amount)}</td>
        <td>${escapeHtml(p.payment_method || "")}</td>
        <td>${formatDate(p.due_date)}</td>
        <td>${escapeHtml(p.reference_number || "")}</td>
        <td>${renderPaymentStatus(p.payment_status || "Paid")}</td>
        <td>${escapeHtml(p.notes || "")}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${p.payment_id})">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    paymentsTbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger">${error.message}</td>
      </tr>
    `;
  }
}

window.deletePayment = async function (paymentId) {
  if (!confirm("Delete this payment?")) return;

  const res = await fetch(`${ORDERS_ENDPOINT}/payments/${paymentId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    alert("Failed to delete payment");
    return;
  }

  await loadPayments();
  await loadOrderSummary();
};

paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

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
  await loadPayments();
  await loadOrderSummary();
});

(async function init() {
  paymentDate.value = new Date().toISOString().slice(0, 10);
  await loadOrderSummary();
  await loadPayments();
})();