const API_BASE = CONFIG.API_BASE;
const ENDPOINT = `${API_BASE}/customers`;

const tbody = document.getElementById("customersTbody");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const form = document.getElementById("customerForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const customersCount = document.getElementById("customersCount");
const apiText = document.getElementById("apiUrlText");

const idField = document.getElementById("customer_id");
const firstName = document.getElementById("first_name");
const lastName = document.getElementById("last_name");
const city = document.getElementById("city");
const phone = document.getElementById("phone");
const email = document.getElementById("email");

if (apiText) apiText.textContent = ENDPOINT;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadCustomers(search = "") {
  try {
    let url = ENDPOINT;
    if (search) {
      url += "?search=" + encodeURIComponent(search);
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load customers");

    const data = await res.json();
    renderCustomers(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">${err.message}</td></tr>`;
    customersCount.textContent = "0";
  }
}

function renderCustomers(rows) {
  customersCount.textContent = `${rows.length} customers`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No customers found</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(c => `
    <tr>
      <td>${c.customer_id}</td>
      <td>${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.city || "")}</td>
      <td>${escapeHtml(c.email || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editCustomer(${c.customer_id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer(${c.customer_id})">Delete</button>
        <a class="btn btn-sm btn-outline-secondary" href="orders.html?customer_id=${c.customer_id}">
          Orders
        </a>
      </td>
    </tr>
  `).join("");
}

window.editCustomer = async function (id) {
  const res = await fetch(`${ENDPOINT}/${id}`);
  const c = await res.json();

  idField.value = c.customer_id;
  firstName.value = c.first_name || "";
  lastName.value = c.last_name || "";
  city.value = c.city || "";
  phone.value = c.phone || "";
  email.value = c.email || "";
};

window.deleteCustomer = async function (id) {
  if (!confirm("Delete this customer?")) return;

  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    alert("Failed to delete customer");
    return;
  }

  loadCustomers(searchInput.value);
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    city: city.value.trim(),
    phone: phone.value.trim(),
    email: email.value.trim()
  };

  const id = idField.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    alert("Failed to save customer");
    return;
  }

  clearForm();
  loadCustomers(searchInput.value);
});

function clearForm() {
  idField.value = "";
  form.reset();
}

searchBtn.addEventListener("click", () => {
  loadCustomers(searchInput.value.trim());
});

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadCustomers();
});

cancelEditBtn.addEventListener("click", clearForm);

loadCustomers();