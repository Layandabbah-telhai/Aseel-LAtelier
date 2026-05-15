const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";
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
const orderType = document.getElementById("order_type");
const occasion = document.getElementById("occasion_type");
const orderDate = document.getElementById("order_date");
const returnDate = document.getElementById("return_date");
const totalPrice = document.getElementById("total_price");
const statusField = document.getElementById("status");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");

if (apiText) apiText.textContent = ENDPOINT;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value) { return value ? String(value).slice(0, 10) : ""; }
function formatPrice(value) { return Number(value || 0).toFixed(2); }

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.message || `Request failed (${res.status})`);
  return payload;
}

async function loadCustomers() {
  const data = await fetchJson(CUSTOMERS_ENDPOINT);
  customerId.innerHTML = `<option value="">Select customer...</option>` + data.map(c => `
    <option value="${escapeHtml(c.customer_id)}">${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</option>
  `).join("");
}

async function loadDresses() {
  const data = await fetchJson(DRESSES_ENDPOINT);
  dressId.innerHTML = `<option value="">Select dress...</option>` + data.map(d => `
    <option value="${escapeHtml(d.dress_id)}">${escapeHtml(d.dress_name)}</option>
  `).join("");
}

async function loadOrders(search = "") {
  try {
    let url = ENDPOINT;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const data = await fetchJson(url);
    renderOrders(Array.isArray(data) ? data : []);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">${escapeHtml(err.message)}</td></tr>`;
    if (ordersCount) ordersCount.textContent = "0 orders";
  }
}

function renderOrders(rows) {
  if (ordersCount) ordersCount.textContent = `${rows.length} order${rows.length === 1 ? "" : "s"}`;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No orders found</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(o => `
    <tr>
      <td>${escapeHtml(o.order_id)}</td>
      <td>${escapeHtml(o.first_name || "")} ${escapeHtml(o.last_name || "")}</td>
      <td>${escapeHtml(o.dress_name || "")}</td>
      <td>${escapeHtml(o.order_type || "")}</td>
      <td>${escapeHtml(o.occasion_type || "")}</td>
      <td>${escapeHtml(formatDate(o.order_date))}</td>
      <td>${escapeHtml(formatDate(o.return_date))}</td>
      <td>${escapeHtml(formatPrice(o.total_price))}</td>
      <td>${escapeHtml(o.status || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editOrder(${Number(o.order_id)})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteOrder(${Number(o.order_id)})">Delete</button>
        <a class="btn btn-sm btn-outline-secondary" href="./payments.html?order_id=${encodeURIComponent(o.order_id)}">Payments</a>
        <a class="btn btn-sm btn-outline-secondary" href="./measurements.html?order_id=${encodeURIComponent(o.order_id)}">Measurements</a>
        <a class="btn btn-sm btn-outline-secondary" href="./seamstresses.html?order_id=${encodeURIComponent(o.order_id)}">Assignments</a>
        <a class="btn btn-sm btn-outline-secondary" href="./appointments.html?order_id=${encodeURIComponent(o.order_id)}">Appointments</a>
      </td>
    </tr>
  `).join("");
}

window.editOrder = async function (id) {
  try {
    const o = await fetchJson(`${ENDPOINT}/${id}`);
    orderId.value = o.order_id || "";
    customerId.value = o.customer_id || "";
    dressId.value = o.dress_id || "";
    orderType.value = o.order_type || "rental";
    occasion.value = o.occasion_type || "";
    orderDate.value = formatDate(o.order_date);
    returnDate.value = formatDate(o.return_date);
    totalPrice.value = o.total_price ?? "";
    statusField.value = o.status || "in_progress";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) { alert(err.message || "Failed to load order"); }
};

window.deleteOrder = async function (id) {
  if (!confirm("Delete order?")) return;
  try {
    await fetchJson(`${ENDPOINT}/${id}`, { method: "DELETE" });
    loadOrders(searchInput.value.trim());
  } catch (err) { alert(err.message || "Delete failed"); }
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!customerId.value) return alert("Please select a customer");
  if (!dressId.value) return alert("Please select a dress");
  if (!orderType.value) return alert("Please select order type");
  if (!orderDate.value) return alert("Please select order date");
  if (orderType.value === "rental" && !returnDate.value) return alert("Return date is required for rental");
  if (!totalPrice.value) return alert("Total price is required");

  const data = {
    customer_id: customerId.value,
    dress_id: dressId.value,
    order_type: orderType.value,
    occasion_type: occasion.value,
    order_date: orderDate.value,
    return_date: returnDate.value || null,
    total_price: totalPrice.value,
    status: statusField.value || "in_progress",
  };

  const id = orderId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;

  try {
    await fetchJson(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    clearForm();
    loadOrders(searchInput.value.trim());
  } catch (err) { alert(err.message || "Save failed"); }
});

function clearForm() {
  orderId.value = "";
  form.reset();
  customerId.value = "";
  dressId.value = "";
  orderType.value = "";
  occasion.value = "";
  orderDate.value = "";
  returnDate.value = "";
  totalPrice.value = "";
  statusField.value = "in_progress";
}

searchBtn?.addEventListener("click", () => loadOrders(searchInput.value.trim()));
resetBtn?.addEventListener("click", () => { searchInput.value = ""; loadOrders(); });
cancelEditBtn?.addEventListener("click", clearForm);

(async function initOrdersPage() {
  try { await loadCustomers(); await loadDresses(); await loadOrders(); }
  catch (err) { alert(err.message || "Failed to load orders page"); }
})();
