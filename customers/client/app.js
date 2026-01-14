
const ENDPOINT = "/api/customers";
const tbody = document.getElementById("customersTbody");
const msg = document.getElementById("msg");
const apiInfoEl =
  document.getElementById("apiInfo") || document.getElementById("apiUrlText");
if (apiInfoEl) apiInfoEl.textContent = ENDPOINT;

const form = document.getElementById("customerForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const searchInput = document.getElementById("searchInput");

const customersCountEl = document.getElementById("customersCount");

const orderTypeEl = document.getElementById("order_type");
const rentalDatesEl = document.getElementById("rentalDates");
const pickupDateEl = document.getElementById("pickup_date");
const returnDateEl = document.getElementById("return_date");

const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");

function setMessage(text, type = "muted") {
  if (!msg) return;
  msg.className = `small text-${type}`;
  msg.textContent = text || "";
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

function updateCount(n) {
  if (!customersCountEl) return;
  customersCountEl.textContent = `${n} customers`;
}

function updateRentalVisibility() {
  if (!orderTypeEl || !rentalDatesEl || !pickupDateEl || !returnDateEl) return;

  const isRental = orderTypeEl.value === "rental";
  rentalDatesEl.style.display = isRental ? "" : "none";

  if (!isRental) {
    pickupDateEl.value = "";
    returnDateEl.value = "";
  }
}

if (orderTypeEl) {
  orderTypeEl.addEventListener("change", updateRentalVisibility);
  updateRentalVisibility();
}

function getFormData() {
  return {
    customer_id: document.getElementById("customer_id")?.value || null,
    first_name: document.getElementById("first_name")?.value || "",
    last_name: document.getElementById("last_name")?.value || "",
    phone: document.getElementById("phone")?.value || "",
    event_date: document.getElementById("event_date")?.value || null,
    email: document.getElementById("email")?.value || null,

    order_type: orderTypeEl?.value || "sale",
    pickup_date: pickupDateEl?.value || null,
    return_date: returnDateEl?.value || null,
  };
}

function setFormData(c) {
  document.getElementById("customer_id").value = c?.customer_id || "";
  document.getElementById("first_name").value = c?.first_name || "";
  document.getElementById("last_name").value = c?.last_name || "";
  document.getElementById("phone").value = c?.phone || "";
  document.getElementById("event_date").value = c?.event_date
    ? String(c.event_date).slice(0, 10)
    : "";
  document.getElementById("email").value = c?.email || "";

  if (orderTypeEl) orderTypeEl.value = "sale";
  updateRentalVisibility();
}

function clearForm() {
  setFormData(null);
  if (cancelEditBtn) cancelEditBtn.disabled = true;
  setMessage("");
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function loadCustomers(search = "") {
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  updateCount(0);

  const url = new URL(ENDPOINT, window.location.origin);
  if (search.trim()) url.searchParams.set("search", search.trim());

  let res;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Failed to connect to server</td></tr>`;
    setMessage("Failed to connect to server", "danger");
    return;
  }

  const data = await safeJson(res);

  if (!res.ok) {
    const errMsg = data?.message || `Request failed (${res.status})`;
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">${escapeHtml(errMsg)}</td></tr>`;
    setMessage(errMsg, "danger");
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No customers found</td></tr>`;
    updateCount(0);
    return;
  }

  updateCount(data.length);

  tbody.innerHTML = data
    .map(
      (c) => `
      <tr>
        <td>${c.customer_id}</td>
        <td>${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${c.event_date ? formatDate(c.event_date) : ""}</td>
        <td>${c.email ? escapeHtml(c.email) : ""}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editCustomer(${c.customer_id})">Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer(${c.customer_id})">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");
}

window.editCustomer = async function (id) {
  setMessage("");
  const res = await fetch(`${ENDPOINT}/${id}`);
  const data = await safeJson(res);

  if (!res.ok) {
    return setMessage(data?.message || "Failed to load customer", "danger");
  }

  setFormData(data);
  if (cancelEditBtn) cancelEditBtn.disabled = false;
  setMessage("Edit mode enabled", "primary");
};

window.deleteCustomer = async function (id) {
  if (!confirm("Are you sure you want to delete this customer?")) return;

  const res = await fetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
  const payload = await safeJson(res);

  if (!res.ok) return setMessage(payload?.message || "Delete failed", "danger");

  setMessage("Customer deleted", "success");
  clearForm();
  loadCustomers(searchInput?.value || "");
};

if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    loadCustomers(searchInput?.value || "");
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    loadCustomers("");
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", clearForm);
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMessage("");

    const data = getFormData();

    if (data.order_type === "rental") {
      if (!data.pickup_date || !data.return_date) {
        return setMessage(
          "For Rental, please fill both Pickup Date and Return Date.",
          "danger"
        );
      }
      if (data.return_date < data.pickup_date) {
        return setMessage("Return Date must be after Pickup Date.", "danger");
      }
    }

    const isEdit = !!data.customer_id;
    const url = isEdit ? `${ENDPOINT}/${data.customer_id}` : ENDPOINT;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        event_date: data.event_date,
        email: data.email,

        order_type: data.order_type,
        pickup_date: data.pickup_date,
        return_date: data.return_date,
      }),
    });

    const payload = await safeJson(res);

    if (!res.ok) {
      return setMessage(payload?.message || "Save failed", "danger");
    }

    setMessage(isEdit ? "Customer updated" : "Customer created", "success");
    clearForm();
    loadCustomers(searchInput?.value || "");
  });
}

loadCustomers("");
