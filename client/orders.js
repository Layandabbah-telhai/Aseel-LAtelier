const API_BASE = CONFIG.API_BASE;
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

let customersCache = [];
let dressesCache = [];

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
            <button class="btn btn-sm btn-outline-secondary" onclick="goToPayments(${o.order_id})">Payments</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="goToMeasurements(${o.order_id})">Measurements</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder(${o.order_id})">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.goToPayments = function (id) {
  window.location.href = `payments.html?order_id=${id}`;
};

window.goToMeasurements = function (id) {
  window.location.href = `measurements.html?order_id=${id}`;
};

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

  loadOrders();
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
})();