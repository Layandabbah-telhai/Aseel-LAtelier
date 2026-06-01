const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";

const MEASUREMENTS_ENDPOINT = `${API_BASE}/measurements`;
const CUSTOMERS_ENDPOINT = `${API_BASE}/customers`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

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

let customersCache = [];
let ordersCache = [];

if (apiText) {
  apiText.textContent = urlOrderId
    ? `${MEASUREMENTS_ENDPOINT}?order_id=${urlOrderId}`
    : MEASUREMENTS_ENDPOINT;
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
  return value === null || value === undefined || value === ""
    ? ""
    : Number(value).toFixed(2);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }

  return payload;
}

function renderCustomerOptions() {
  customerId.innerHTML =
    `<option value="">Select customer...</option>` +
    customersCache
      .map(
        (c) => `
          <option value="${escapeHtml(c.customer_id)}">
            ${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}
            ${c.phone ? `(${escapeHtml(c.phone)})` : ""}
          </option>
        `
      )
      .join("");
}

function renderOrderOptions() {
  const selectedCustomerId = customerId.value;

  const filteredOrders = selectedCustomerId
    ? ordersCache.filter(
      (o) => String(o.customer_id) === String(selectedCustomerId)
    )
    : ordersCache;

  orderId.innerHTML =
    `<option value="">Select order...</option>` +
    filteredOrders
      .map(
        (o) => `
          <option value="${escapeHtml(o.order_id)}">
            #${escapeHtml(o.order_id)} - ${escapeHtml(o.dress_name || "")}
            ${o.occasion_type ? `(${escapeHtml(o.occasion_type)})` : ""}
          </option>
        `
      )
      .join("");

  if (urlOrderId) {
    orderId.value = String(urlOrderId);
  }
}

function renderOrderSummary() {
  if (!orderSummary) return;

  if (!urlOrderId) {
    orderSummary.innerHTML = `
      <div><strong>All Measurements</strong></div>
      <div>Add measurements for any order.</div>
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
  `;
}

async function loadCustomers() {
  customersCache = await fetchJson(CUSTOMERS_ENDPOINT);
  renderCustomerOptions();
}

async function loadOrders() {
  ordersCache = await fetchJson(ORDERS_ENDPOINT);

  if (urlOrderId) {
    const selectedOrder = ordersCache.find(
      (o) => String(o.order_id) === String(urlOrderId)
    );

    if (selectedOrder) {
      customerId.value = String(selectedOrder.customer_id);
    }
  }

  renderOrderOptions();
  renderOrderSummary();
}

async function loadMeasurements() {
  try {
    let url = MEASUREMENTS_ENDPOINT;

    if (urlOrderId) {
      url += `?order_id=${encodeURIComponent(urlOrderId)}`;
    }

    const rows = await fetchJson(url);

    renderMeasurements(Array.isArray(rows) ? rows : []);
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center text-danger">
          ${escapeHtml(err.message)}
        </td>
      </tr>
    `;

    if (measurementsCount) {
      measurementsCount.textContent = "0";
    }
  }
}

function renderMeasurements(rows) {
  if (measurementsCount) {
    measurementsCount.textContent = `${rows.length}`;
  }

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center text-muted">
          No measurements found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (m) => `
        <tr>
          <td>${escapeHtml(m.measurement_id)}</td>

          <td>
            <a href="measurements.html?order_id=${encodeURIComponent(m.order_id)}">
              #${escapeHtml(m.order_id)}
            </a>
          </td>

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
            <button
              class="btn btn-sm btn-outline-primary"
              onclick="editMeasurement(${Number(m.measurement_id)})"
            >
              Edit
            </button>

            <button
              class="btn btn-sm btn-outline-danger"
              onclick="deleteMeasurement(${Number(m.measurement_id)})"
            >
              Delete
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

window.editMeasurement = async function (id) {
  try {
    const m = await fetchJson(`${MEASUREMENTS_ENDPOINT}/${id}`);

    measurementId.value = m.measurement_id || "";
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    alert(err.message || "Failed to load measurement");
  }
};

window.deleteMeasurement = async function (id) {
  if (!confirm("Delete this measurement?")) return;

  try {
    await fetchJson(`${MEASUREMENTS_ENDPOINT}/${id}`, {
      method: "DELETE",
    });

    await loadMeasurements();
    clearForm();
  } catch (err) {
    alert(err.message || "Failed to delete measurement");
  }
};

form?.addEventListener("submit", async (e) => {
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
  const url = id
    ? `${MEASUREMENTS_ENDPOINT}/${id}`
    : MEASUREMENTS_ENDPOINT;

  try {
    await fetchJson(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    await loadMeasurements();
    clearForm();
  } catch (err) {
    alert(err.message || "Failed to save measurement");
  }
});

function clearForm() {
  measurementId.value = "";

  form.reset();

  tailoringType.value = "";
  bust.value = "";
  waist.value = "";
  hips.value = "";
  shoulder.value = "";
  sleeveLength.value = "";
  dressLength.value = "";
  notes.value = "";

  if (urlOrderId) {
    const selectedOrder = ordersCache.find(
      (o) => String(o.order_id) === String(urlOrderId)
    );

    if (selectedOrder) {
      customerId.value = String(selectedOrder.customer_id);
      renderOrderOptions();
      orderId.value = String(selectedOrder.order_id);
    }
  } else {
    customerId.value = "";
    renderOrderOptions();
    orderId.value = "";
  }
}

customerId?.addEventListener("change", renderOrderOptions);
cancelEditBtn?.addEventListener("click", clearForm);

(async function initMeasurementsPage() {
  try {

    await loadCustomers();

    await loadOrders();

    clearForm();

    await loadMeasurements();

    const params =
      new URLSearchParams(window.location.search);

    const orderId =
      params.get("order_id");

    if (orderId && orderSelect) {

      orderSelect.value =
        orderId;
    }

  } catch (err) {

    if (orderSummary) {

      orderSummary.innerHTML = `
        <div class="text-danger">
          ${escapeHtml(err.message)}
        </div>
      `;
    }
  }
})();