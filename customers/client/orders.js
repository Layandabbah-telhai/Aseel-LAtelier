const API_BASE = "http://localhost:4000/api";

const msg = document.getElementById("msg");
const dressSelect = document.getElementById("dress_id");
const dressPriceInfo = document.getElementById("dressPriceInfo");

const orderTypeEl = document.getElementById("order_type");
const returnWrap = document.getElementById("returnDateWrap");
const returnDateEl = document.getElementById("return_date");
const orderDateEl = document.getElementById("order_date");

const ordersTbody = document.getElementById("ordersTbody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

let dressesCache = [];

function setMessage(text, type = "muted") {
  msg.className = `small text-${type}`;
  msg.textContent = text;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString();
}

function updateReturnVisibility() {
  const isRental = orderTypeEl.value === "rental";
  returnWrap.style.display = isRental ? "" : "none";
  returnDateEl.required = isRental;
  if (!isRental) returnDateEl.value = "";
  updateDressPriceInfo();
}

function updateDressPriceInfo() {
  const dressId = Number(dressSelect.value);
  const dress = dressesCache.find(d => d.dress_id === dressId);
  if (!dress) {
    dressPriceInfo.textContent = "";
    return;
  }

  const type = orderTypeEl.value;
  const price = type === "sale" ? dress.sale_price : dress.rental_price;
  const status = dress.status ? ` | Dress status: ${dress.status}` : "";
  dressPriceInfo.textContent = `Price for ${type}: ${price ?? "N/A"}${status}`;
}

orderTypeEl.addEventListener("change", updateReturnVisibility);
dressSelect.addEventListener("change", updateDressPriceInfo);

async function loadDresses() {
  const res = await fetch(`${API_BASE}/dresses`);
  const dresses = await res.json().catch(() => []);
  dressesCache = Array.isArray(dresses) ? dresses : [];

  dressSelect.innerHTML = dressesCache
    .map(d => `<option value="${d.dress_id}">${escapeHtml(d.dress_name)} (ID: ${d.dress_id})</option>`)
    .join("");

  updateDressPriceInfo();
}

async function loadOrders() {
  const url = new URL(`${API_BASE}/orders`);
  if (searchInput.value.trim()) url.searchParams.set("search", searchInput.value.trim());
  if (statusFilter.value) url.searchParams.set("status", statusFilter.value);

  const res = await fetch(url);
  const orders = await res.json().catch(() => []);

  if (!Array.isArray(orders) || orders.length === 0) {
    ordersTbody.innerHTML = `<tr><td colspan="10" class="text-muted">No orders found</td></tr>`;
    return;
  }

  ordersTbody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.order_id}</td>
      <td>${escapeHtml(o.first_name)} ${escapeHtml(o.last_name)} (ID: ${o.customer_id})</td>
      <td>${escapeHtml(o.phone)}</td>
      <td>${escapeHtml(o.dress_name)} (ID: ${o.dress_id})</td>
      <td>${escapeHtml(o.order_type)}</td>
      <td>${o.order_date ? formatDate(o.order_date) : ""}</td>
      <td>${o.return_date ? formatDate(o.return_date) : ""}</td>
      <td>${o.total_price}</td>
      <td><span class="badge text-bg-secondary">${escapeHtml(o.status)}</span></td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" onclick="setStatus(${o.order_id}, 'IN_SEWING')">IN_SEWING</button>
          <button class="btn btn-outline-primary" onclick="setStatus(${o.order_id}, 'READY_FOR_FITTING')">READY</button>
          <button class="btn btn-outline-success" onclick="setStatus(${o.order_id}, 'COMPLETED')">DONE</button>
        </div>
      </td>
    </tr>
  `).join("");
}

window.setStatus = async function(orderId, status) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return alert(payload.message || "Failed to update status");

  loadOrders();
};

document.getElementById("filterBtn").addEventListener("click", loadOrders);
document.getElementById("resetBtn").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";
  loadOrders();
});

document.getElementById("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("");

  const customer_id = Number(document.getElementById("customer_id").value);
  const dress_id = Number(dressSelect.value);
  const order_type = orderTypeEl.value;
  const order_date = orderDateEl.value;
  const return_date = returnDateEl.value || null;
  const status = document.getElementById("status").value;

  if (order_type === "rental") {
    if (!return_date) return setMessage("For rental, Return Date is required.", "danger");
    if (return_date < order_date) return setMessage("Return Date must be after Pickup Date.", "danger");
  }

  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_id,
      dress_id,
      order_type,
      order_date,
      return_date,
      status
    })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return setMessage(payload.message || "Failed to create order", "danger");

  setMessage("Order created successfully", "success");
  e.target.reset();
  orderTypeEl.value = "sale";
  updateReturnVisibility();
  await loadOrders();
});

(async function init() {
  await loadDresses();
  updateReturnVisibility();
  await loadOrders();
})();
