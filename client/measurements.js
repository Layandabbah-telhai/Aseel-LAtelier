const API_BASE = CONFIG.API_BASE;
const MEASUREMENTS_ENDPOINT = `${API_BASE}/measurements`;
const CUSTOMERS_ENDPOINT = `${API_BASE}/customers`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const apiText = document.getElementById("apiUrlText");
const orderSummary = document.getElementById("orderSummary");
const measurementsCount = document.getElementById("measurementsCount");
const tbody = document.getElementById("measurementsTbody");

const form = document.getElementById("measurementForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const measurementId = document.getElementById("measurement_id");
const customerId = document.getElementById("customer_id");
const orderId = document.getElementById("order_id");
const tailoringType = document.getElementById("tailoring_type");
const bust = document.getElementById("bust");
const waist = document.getElementById("waist");
const hips = document.getElementById("hips");
const shoulder = document.getElementById("shoulder");
const sleeveLength = document.getElementById("sleeve_length");
const dressLength = document.getElementById("dress_length");
const notes = document.getElementById("notes");

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

let customersCache = [];
let ordersCache = [];

if (apiText) {
  apiText.textContent = urlOrderId
    ? `${MEASUREMENTS_ENDPOINT}?order_id=${urlOrderId}`
    : MEASUREMENTS_ENDPOINT;
}

function authHeaders(json = false) {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    Authorization: "Bearer " + localStorage.getItem("aseel_token"),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toFixed(2);
}

function renderCustomerOptions() {
  customerId.innerHTML = `
    <option value="">Select customer...</option>
    ${customersCache.map((c) => `
      <option value="${c.customer_id}">
        ${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)} (${escapeHtml(c.phone || "")})
      </option>
    `).join("")}
  `;
}

function renderOrderOptions() {
  const selectedCustomerId = customerId.value;

  const filteredOrders = selectedCustomerId
    ? ordersCache.filter((o) => String(o.customer_id) === String(selectedCustomerId))
    : ordersCache;

  orderId.innerHTML = `
    <option value="">Select order...</option>
    ${filteredOrders.map((o) => `
      <option value="${o.order_id}">
        #${o.order_id} - ${escapeHtml(o.dress_name || "")}${o.occasion_type ? ` (${escapeHtml(o.occasion_type)})` : ""}
      </option>
    `).join("")}
  `;

  if (urlOrderId) {
    orderId.value = urlOrderId;
  }
}

async function loadCustomers() {
  const res = await fetch(CUSTOMERS_ENDPOINT, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load customers");
  customersCache = await res.json();
  renderCustomerOptions();
}

async function loadOrders() {
  const res = await fetch(ORDERS_ENDPOINT, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load orders");
  ordersCache = await res.json();

  if (urlOrderId) {
    const selectedOrder = ordersCache.find((o) => String(o.order_id) === String(urlOrderId));
    if (selectedOrder) {
      customerId.value = selectedOrder.customer_id;
    }
  }

  renderOrderOptions();
  renderOrderSummary();
}

function renderOrderSummary() {
  if (urlOrderId) {
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
    return;
  }

  orderSummary.innerHTML = `
    <div><strong>All Measurements</strong></div>
    <div>You can add measurements for any order, or open this page from an order to focus on one order only.</div>
  `;
}

async function loadMeasurements() {
  try {
    let url = MEASUREMENTS_ENDPOINT;
    if (urlOrderId) {
      url += `?order_id=${encodeURIComponent(urlOrderId)}`;
    }

    const res = await fetch(url, {
      headers: authHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to load measurements (${res.status})`);
    }

    const rows = await res.json();
    renderMeasurements(Array.isArray(rows) ? rows : []);
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center text-danger">${escapeHtml(error.message)}</td>
      </tr>
    `;
    measurementsCount.textContent = "0";
  }
}

function renderMeasurements(rows) {
  measurementsCount.textContent = `${rows.length}`;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center text-muted">No measurements found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((m) => `
    <tr>
      <td>${m.measurement_id}</td>
      <td><a href="measurements.html?order_id=${m.order_id}">#${m.order_id}</a></td>
      <td>${escapeHtml(m.first_name || "")} ${escapeHtml(m.last_name || "")}</td>
      <td>${escapeHtml(m.dress_name || "")}</td>
      <td>${escapeHtml(m.occasion_type || "")}</td>
      <td>${escapeHtml(m.tailoring_type || "")}</td>
      <td>${formatNumber(m.bust)}</td>
      <td>${formatNumber(m.waist)}</td>
      <td>${formatNumber(m.hips)}</td>
      <td>${formatNumber(m.shoulder)}</td>
      <td>${formatNumber(m.sleeve_length)}</td>
      <td>${formatNumber(m.dress_length)}</td>
      <td>${escapeHtml(m.notes || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editMeasurement(${m.measurement_id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteMeasurement(${m.measurement_id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

window.editMeasurement = async function (id) {
  const res = await fetch(`${MEASUREMENTS_ENDPOINT}/${id}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    alert("Failed to load measurement");
    return;
  }

  const m = await res.json();

  measurementId.value = m.measurement_id;
  customerId.value = m.customer_id || "";
  renderOrderOptions();
  orderId.value = m.order_id || "";
  tailoringType.value = m.tailoring_type || "";
  bust.value = m.bust ?? "";
  waist.value = m.waist ?? "";
  hips.value = m.hips ?? "";
  shoulder.value = m.shoulder ?? "";
  sleeveLength.value = m.sleeve_length ?? "";
  dressLength.value = m.dress_length ?? "";
  notes.value = m.notes || "";
};

window.deleteMeasurement = async function (id) {
  if (!confirm("Delete this measurement?")) return;

  const res = await fetch(`${MEASUREMENTS_ENDPOINT}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    alert(payload?.message || "Failed to delete measurement");
    return;
  }

  clearForm();
  await loadMeasurements();
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!customerId.value) {
    alert("Please select a customer");
    return;
  }

  if (!orderId.value) {
    alert("Please select an order");
    return;
  }

  const data = {
    customer_id: customerId.value,
    order_id: orderId.value,
    tailoring_type: tailoringType.value,
    bust: bust.value,
    waist: waist.value,
    hips: hips.value,
    shoulder: shoulder.value,
    sleeve_length: sleeveLength.value,
    dress_length: dressLength.value,
    notes: notes.value.trim(),
  };

  const id = measurementId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${MEASUREMENTS_ENDPOINT}/${id}` : MEASUREMENTS_ENDPOINT;

  const res = await fetch(url, {
    method,
    headers: authHeaders(true),
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    alert(payload?.message || "Failed to save measurement");
    return;
  }

  clearForm();
  await loadMeasurements();
});

function clearForm() {
  measurementId.value = "";
  form.reset();
  tailoringType.value = "";

  if (urlOrderId) {
    const selectedOrder = ordersCache.find((o) => String(o.order_id) === String(urlOrderId));
    if (selectedOrder) {
      customerId.value = selectedOrder.customer_id;
      renderOrderOptions();
      orderId.value = selectedOrder.order_id;
    }
  } else {
    customerId.value = "";
    renderOrderOptions();
    orderId.value = "";
  }
}

customerId.addEventListener("change", renderOrderOptions);
cancelEditBtn.addEventListener("click", clearForm);

(async function init() {
  try {
    await loadCustomers();
    await loadOrders();
    clearForm();
    await loadMeasurements();
  } catch (error) {
    orderSummary.innerHTML = `<div class="text-danger">${escapeHtml(error.message)}</div>`;
  }
})();