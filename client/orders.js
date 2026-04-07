const API_BASE = "https://aseel-latelier.onrender.com/api";
const ENDPOINT = `${API_BASE}/orders`;
const CUSTOMERS_ENDPOINT = `${API_BASE}/customers`;
const DRESSES_ENDPOINT = `${API_BASE}/dresses`;

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const statusFilter = document.getElementById("statusFilter");
const ordersTbody = document.getElementById("ordersTbody");
const ordersCount = document.getElementById("ordersCount");
const apiText = document.getElementById("apiUrlText");

const orderForm = document.getElementById("orderForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const orderId = document.getElementById("order_id");
const customerId = document.getElementById("customer_id");
const dressId = document.getElementById("dress_id");
const orderType = document.getElementById("order_type");
const occasionType = document.getElementById("occasion_type");
const orderDate = document.getElementById("order_date");
const returnDate = document.getElementById("return_date");
const returnDateWrap = document.getElementById("returnDateWrap");
const totalPrice = document.getElementById("total_price");
const statusField = document.getElementById("status");

const paymentsCard = document.getElementById("paymentsCard");
const paymentsTitle = document.getElementById("paymentsTitle");
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

let customersCache = [];
let dressesCache = [];
let selectedPaymentsOrderId = null;

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

function renderOrderStatus(status) {
  const value = String(status || "");
  let label = value;

  if (value === "in_progress") label = "In Progress";
  if (value === "sewing") label = "Sewing";
  if (value === "ready_for_fitting") label = "Ready for Fitting";
  if (value === "completed") label = "Completed";

  return renderPaymentStatus(label);
}

function updateReturnVisibility() {
  returnDateWrap.style.display = orderType.value === "rental" ? "" : "none";
  if (orderType.value !== "rental") {
    returnDate.value = "";
  }
}

function updatePriceFromDress() {
  const dress = dressesCache.find((d) => String(d.dress_id) === String(dressId.value));
  if (!dress) return;

  if (orderType.value === "sale") {
    totalPrice.value = dress.sale_price ?? "";
  } else {
    totalPrice.value = dress.rental_price ?? "";
  }
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

async function loadDresses() {
  const res = await fetch(DRESSES_ENDPOINT);
  dressesCache = await res.json();

  dressId.innerHTML = dressesCache
    .map(
      (d) =>
        `<option value="${d.dress_id}">${escapeHtml(d.dress_name)} - ${escapeHtml(d.status || "")}</option>`
    )
    .join("");

  updatePriceFromDress();
}

async function loadOrders() {
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
      throw new Error(`Failed to load orders (${res.status})`);
    }

    const orders = await res.json();
    renderOrders(orders);
  } catch (error) {
    ordersTbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center text-danger">
          ${error.message}
        </td>
      </tr>
    `;
    ordersCount.textContent = "0 orders";
  }
}

function renderOrders(orders) {
  ordersCount.textContent = `${orders.length} orders`;

  if (!orders.length) {
    ordersTbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center text-muted">
          No orders found
        </td>
      </tr>
    `;
    return;
  }

  ordersTbody.innerHTML = orders
    .map((o) => {
      const balance = Number(o.total_price || 0) - Number(o.paid_amount || 0);

      return `
        <tr>
          <td>${o.order_id}</td>
          <td>${escapeHtml(o.first_name)} ${escapeHtml(o.last_name)}</td>
          <td>${escapeHtml(o.phone)}</td>
          <td>${escapeHtml(o.dress_name)}</td>
          <td>${escapeHtml(o.order_type)}</td>
          <td>${escapeHtml(o.occasion_type || "")}</td>
          <td>${formatDate(o.order_date)}</td>
          <td>${formatDate(o.return_date)}</td>
          <td>${formatMoney(o.total_price)}</td>
          <td>${formatMoney(o.paid_amount)}</td>
          <td>${formatMoney(balance)}</td>
          <td>${renderPaymentStatus(o.payment_status)}</td>
          <td>${renderOrderStatus(o.status)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="editOrder(${o.order_id})">Edit</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="openPayments(${o.order_id}, '${escapeHtml(
        o.first_name
      )} ${escapeHtml(o.last_name)}', '${escapeHtml(o.dress_name)}')">Payments</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder(${o.order_id})">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.editOrder = async function (id) {
  const res = await fetch(`${ENDPOINT}/${id}`);
  if (!res.ok) {
    alert("Failed to load order");
    return;
  }

  const o = await res.json();

  orderId.value = o.order_id;
  customerId.value = o.customer_id;
  dressId.value = o.dress_id;
  orderType.value = o.order_type;
  occasionType.value = o.occasion_type || "";
  orderDate.value = o.order_date ? o.order_date.slice(0, 10) : "";
  returnDate.value = o.return_date ? o.return_date.slice(0, 10) : "";
  totalPrice.value = o.total_price ?? "";
  statusField.value = o.status || "in_progress";

  updateReturnVisibility();
};

window.deleteOrder = async function (id) {
  if (!confirm("Delete this order and its payments?")) return;

  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    alert("Failed to delete order");
    return;
  }

  if (selectedPaymentsOrderId === id) {
    paymentsCard.style.display = "none";
    selectedPaymentsOrderId = null;
  }

  loadOrders();
};

window.openPayments = async function (id, customerName, dressName) {
  selectedPaymentsOrderId = id;
  paymentsCard.style.display = "";
  paymentsTitle.textContent = `Payments — Order #${id} — ${customerName} — ${dressName}`;
  paymentForm.reset();
  paymentDate.value = new Date().toISOString().slice(0, 10);
  await loadPayments(id);
  paymentsCard.scrollIntoView({ behavior: "smooth" });
};

async function loadPayments(orderIdValue) {
  try {
    const res = await fetch(`${ENDPOINT}/${orderIdValue}/payments`);
    if (!res.ok) throw new Error(`Failed to load payments (${res.status})`);

    const payments = await res.json();
    paymentsSummary.textContent = `${payments.length} payments`;

    if (!payments.length) {
      paymentsTbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-muted">
            No payments found
          </td>
        </tr>
      `;
      return;
    }

    paymentsTbody.innerHTML = payments
      .map(
        (p) => `
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
        `
      )
      .join("");
  } catch (error) {
    paymentsTbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger">
          ${error.message}
        </td>
      </tr>
    `;
  }
}

window.deletePayment = async function (paymentId) {
  if (!confirm("Delete this payment?")) return;

  const res = await fetch(`${ENDPOINT}/payments/${paymentId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    alert("Failed to delete payment");
    return;
  }

  if (selectedPaymentsOrderId) {
    await loadPayments(selectedPaymentsOrderId);
    await loadOrders();
  }
};

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    customer_id: customerId.value,
    dress_id: dressId.value,
    order_type: orderType.value,
    occasion_type: occasionType.value.trim(),
    order_date: orderDate.value,
    return_date: returnDate.value,
    total_price: totalPrice.value,
    status: statusField.value,
  };

  const id = orderId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    alert(err?.message || "Failed to save order");
    return;
  }

  clearOrderForm();
  loadOrders();
});

paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedPaymentsOrderId) {
    alert("Select an order first");
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

  const res = await fetch(`${ENDPOINT}/${selectedPaymentsOrderId}/payments`, {
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
  await loadPayments(selectedPaymentsOrderId);
  await loadOrders();
});

function clearOrderForm() {
  orderId.value = "";
  orderForm.reset();
  statusField.value = "in_progress";
  orderType.value = "sale";
  occasionType.value = "";
  updateReturnVisibility();
  updatePriceFromDress();
}

searchBtn.addEventListener("click", loadOrders);

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";
  loadOrders();
});

cancelEditBtn.addEventListener("click", clearOrderForm);

orderType.addEventListener("change", () => {
  updateReturnVisibility();
  updatePriceFromDress();
});

dressId.addEventListener("change", updatePriceFromDress);

(async function init() {
  await loadCustomers();
  await loadDresses();
  clearOrderForm();
  await loadOrders();
  paymentDate.value = new Date().toISOString().slice(0, 10);
})();