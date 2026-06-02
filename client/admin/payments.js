const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

const apiText = document.getElementById("apiUrlText");
const orderSummary = document.getElementById("orderSummary");
const form = document.getElementById("paymentForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const paymentFormCard = document.getElementById("paymentFormCard");
const newPaymentBtn = document.getElementById("newPaymentBtn");

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

function showPaymentForm() {
  if (paymentFormCard) {
    paymentFormCard.style.display = "";
  }
}

function hidePaymentForm() {
  if (paymentFormCard) {
    paymentFormCard.style.display = "none";
  }
}

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

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }

  return payload;
}

function renderOrderSummary() {
  if (!orderSummary) return;

  if (!urlOrderId) {
    orderSummary.innerHTML = `
      <div><strong>All Payments</strong></div>
      <div>Select an order to add a payment.</div>
    `;
    return;
  }

  const order = ordersCache.find(
    (o) => String(o.order_id) === String(urlOrderId)
  );

  if (!order) {
    orderSummary.innerHTML = `
      <div class="text-danger">Selected order was not found.</div>
    `;
    return;
  }

  orderSummary.innerHTML = `
    <div><strong>Selected Order #${escapeHtml(order.order_id)}</strong></div>
    <div>Customer: ${escapeHtml(order.first_name || "")} ${escapeHtml(order.last_name || "")}</div>
    <div>Dress: ${escapeHtml(order.dress_name || "")}</div>
    <div>Total: ${formatMoney(order.total_price)} | Paid: ${formatMoney(order.paid_amount)}</div>
  `;
}

async function loadOrders() {
  ordersCache = await fetchJson(ORDERS_ENDPOINT);

  orderId.innerHTML =
    `<option value="">Select order...</option>` +
    ordersCache
      .map(
        (o) => `
          <option value="${escapeHtml(o.order_id)}">
            #${escapeHtml(o.order_id)}
            - ${escapeHtml(o.first_name || "")} ${escapeHtml(o.last_name || "")}
            - ${escapeHtml(o.dress_name || "")}
          </option>
        `
      )
      .join("");

  if (urlOrderId) {
    orderId.value = urlOrderId;
    orderId.disabled = true;
  }

  renderOrderSummary();
}

async function loadPaymentsForOrder(orderIdValue) {
  const rows = await fetchJson(`${ORDERS_ENDPOINT}/${orderIdValue}/payments`);

  const order = ordersCache.find(
    (o) => String(o.order_id) === String(orderIdValue)
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    _order_id: Number(orderIdValue),
    first_name: row.first_name || order?.first_name || "",
    last_name: row.last_name || order?.last_name || "",
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
        <td colspan="8" class="text-center text-danger">
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;

    paymentsCount.textContent = "0 payments";
  }
}

function renderPayments(rows) {
  paymentsCount.textContent =
    `${rows.length} payment${rows.length === 1 ? "" : "s"}`;

  if (!rows.length) {
    paymentsTbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          No payments found
        </td>
      </tr>
    `;
    return;
  }

  paymentsTbody.innerHTML = rows
    .map((p) => {
      const realOrderId = p.order_id || p._order_id;

      return `
        <tr>
          <td>${escapeHtml(p.payment_id)}</td>

          <td>
            <a href="payments.html?order_id=${encodeURIComponent(realOrderId)}">
              #${escapeHtml(realOrderId)}
            </a>
          </td>

          <td>${escapeHtml(p.first_name || "")} ${escapeHtml(p.last_name || "")}</td>
          <td>${formatMoney(p.amount)}</td>
          <td>${escapeHtml(formatDate(p.payment_date))}</td>
          <td>${escapeHtml(p.payment_method || "")}</td>
          <td>${escapeHtml(p.notes || "")}</td>

          <td>
            <button
              class="btn btn-sm btn-outline-primary"
              onclick="editPayment(${Number(p.payment_id)})"
            >
              Edit
            </button>

            <button
              class="btn btn-sm btn-outline-danger"
              onclick="deletePayment(${Number(p.payment_id)})"
            >
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.editPayment = function (id) {
  showPaymentForm();

  const p = paymentsCache.find(
    (row) => String(row.payment_id) === String(id)
  );

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

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deletePayment = async function (id) {
  if (!confirm("Delete this payment?")) return;

  try {
    await fetchJson(`${ORDERS_ENDPOINT}/payments/${id}`, {
      method: "DELETE",
    });

    clearForm();

    if (!urlOrderId) {
      hidePaymentForm();
    }

    await loadOrders();
    await loadPayments();
  } catch (err) {
    alert(err.message || "Failed to delete payment");
  }
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!orderId.value) {
    alert("Please select an order");
    return;
  }

  if (!amount.value || Number(amount.value) <= 0) {
    alert("Amount must be positive");
    return;
  }

  if (!paymentDate.value) {
    alert("Payment date is required");
    return;
  }

  const data = {
    payment_date: paymentDate.value,
    amount: amount.value,
    payment_method: paymentMethod.value,
    notes: notes.value.trim(),
  };

  const isEditing = Boolean(paymentId.value);

  const url = isEditing
    ? `${ORDERS_ENDPOINT}/payments/${paymentId.value}`
    : `${ORDERS_ENDPOINT}/${orderId.value}/payments`;

  const method = isEditing ? "PUT" : "POST";

  try {
    await fetchJson(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    clearForm();
    await loadOrders();
    await loadPayments();
  } catch (err) {
    alert(err.message || "Failed to save payment");
  }
});

function clearForm() {
  paymentId.value = "";
  form.reset();
  orderId.value = urlOrderId || "";

  if (urlOrderId) {
    orderId.disabled = true;
  }
}

cancelEditBtn?.addEventListener("click", () => {
  clearForm();

  if (!urlOrderId) {
    hidePaymentForm();
  }
});

newPaymentBtn?.addEventListener("click", () => {
  clearForm();
  showPaymentForm();
});

(async function initPaymentsPage() {
  try {
    await loadOrders();
    clearForm();

    if (urlOrderId) {
      showPaymentForm();
    } else {
      hidePaymentForm();
    }

    await loadPayments();
  } catch (err) {
    orderSummary.innerHTML = `
      <div class="text-danger">${escapeHtml(err.message)}</div>
    `;
  }
})();