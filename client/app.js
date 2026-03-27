const API_BASE = "https://aseel-latelier-production.up.railway.app/api";
const ENDPOINT = `${API_BASE}/customers`;

// Elements
const tbody = document.getElementById("customersTbody");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const form = document.getElementById("customerForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const customersCount = document.getElementById("customersCount");

// Form fields
const idField = document.getElementById("customer_id");
const firstName = document.getElementById("first_name");
const lastName = document.getElementById("last_name");
const phone = document.getElementById("phone");
const eventDate = document.getElementById("event_date");
const email = document.getElementById("email");

// Show endpoint text
const apiText = document.getElementById("apiUrlText");
if (apiText) apiText.textContent = ENDPOINT;

// ---------------- LOAD CUSTOMERS ----------------
async function loadCustomers(search = "") {
  try {
    let url = ENDPOINT;
    if (search) {
      url += "?search=" + encodeURIComponent(search);
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load customers (${res.status})`);
    }

    const customers = await res.json();
    renderCustomers(customers);
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          ${error.message}
        </td>
      </tr>
    `;
    customersCount.textContent = "0 customers";
  }
}

// ---------------- RENDER TABLE ----------------
function renderCustomers(customers) {
  customersCount.textContent = `${customers.length} customers`;

  if (!customers.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No customers found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>${c.customer_id}</td>
      <td>${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${formatDate(c.event_date)}</td>
      <td>${escapeHtml(c.email || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editCustomer(${c.customer_id})">
          Edit
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer(${c.customer_id})">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
}

// ---------------- HELPERS ----------------
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------------- ADD / UPDATE ----------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    phone: phone.value.trim(),
    event_date: eventDate.value,
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
    const err = await res.json().catch(() => null);
    alert(err?.message || "Failed to save customer");
    return;
  }

  clearForm();
  loadCustomers(searchInput.value);
});

// ---------------- EDIT ----------------
window.editCustomer = async function (id) {
  const res = await fetch(`${ENDPOINT}/${id}`);
  if (!res.ok) {
    alert("Failed to load customer");
    return;
  }

  const c = await res.json();

  idField.value = c.customer_id;
  firstName.value = c.first_name;
  lastName.value = c.last_name;
  phone.value = c.phone;
  eventDate.value = c.event_date ? c.event_date.slice(0, 10) : "";
  email.value = c.email || "";
};

// ---------------- DELETE ----------------
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

// ---------------- CLEAR FORM ----------------
function clearForm() {
  idField.value = "";
  form.reset();
}

// ---------------- SEARCH ----------------
searchBtn.addEventListener("click", () => {
  loadCustomers(searchInput.value.trim());
});

// ---------------- RESET ----------------
resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadCustomers();
});

// ---------------- CANCEL EDIT ----------------
cancelEditBtn.addEventListener("click", () => {
  clearForm();
});

// ---------------- INITIAL LOAD ----------------
loadCustomers();