const API_BASE = window.CONFIG?.API_BASE || "https://aseel-latelier.onrender.com/api";
const ENDPOINT = `${API_BASE}/orders`;

const orderIdInput = document.getElementById("order_id");
const customerSelect = document.getElementById("customer_id");
const dressSelect = document.getElementById("dress_id");
const orderTypeInput = document.getElementById("order_type");
const occasionTypeInput = document.getElementById("occasion_type");
const orderDateInput = document.getElementById("order_date");
const returnDateInput = document.getElementById("return_date");
const totalPriceInput = document.getElementById("total_price");
const statusInput = document.getElementById("status");

const orderForm = document.getElementById("orderForm");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const ordersTbody = document.getElementById("ordersTbody");
const ordersCount = document.getElementById("ordersCount");
const returnDateWrap = document.getElementById("returnDateWrap");

const paymentsCard = document.getElementById("paymentsCard");
const paymentsTitle = document.getElementById("paymentsTitle");
const paymentsSummary = document.getElementById("paymentsSummary");
const paymentForm = document.getElementById("paymentForm");
const paymentDateInput = document.getElementById("payment_date");
const amountInput = document.getElementById("amount");
const paymentMethodInput = document.getElementById("payment_method");
const dueDateInput = document.getElementById("due_date");
const referenceNumberInput = document.getElementById("reference_number");
const paymentStatusInput = document.getElementById("payment_status");
const paymentNotesInput = document.getElementById("payment_notes");
const paymentsTbody = document.getElementById("paymentsTbody");

let customers = [];
let dresses = [];
let orders = [];
let selectedOrderId = null;

/*
IMPORTANT:
Do NOT use:
new Date(value).toISOString().slice(0, 10)

because timezone converts the date
and causes one-day backward bug.
*/
function dateOnly(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return "";
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function text(value) {
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Request failed"
    );
  }

  return data;
}

async function loadCustomers() {
  customers = await fetchJson(`${API_BASE}/customers`);

  customerSelect.innerHTML = customers
    .map((c) => {
      const name =
        `${c.first_name || ""} ${c.last_name || ""}`.trim();

      return `
        <option value="${c.customer_id}">
          ${name || `Customer #${c.customer_id}`}
        </option>
      `;
    })
    .join("");
}

async function loadDresses() {
  dresses = await fetchJson(`${API_BASE}/dresses`);

  dressSelect.innerHTML =
    `<option value="">No dress</option>` +
    dresses
      .map((d) => {
        const name =
          d.dress_name || `Dress #${d.dress_id}`;

        return `
          <option value="${d.dress_id}">
            ${name}
          </option>
        `;
      })
      .join("");
}

async function loadOrders() {
  const params = new URLSearchParams();

  if (searchInput.value.trim()) {
    params.set("search", searchInput.value.trim());
  }

  if (statusFilter.value) {
    params.set("status", statusFilter.value);
  }

  const url = params.toString()
    ? `${ENDPOINT}?${params.toString()}`
    : ENDPOINT;

  orders = await fetchJson(url);

  renderOrders();
}

function renderOrders() {
  ordersCount.textContent = `${orders.length} orders`;

  if (!orders.length) {
    ordersTbody.innerHTML = `
      <tr>
        <td colspan="14" class="text-center py-4">
          No orders found.
        </td>
      </tr>
    `;
    return;
  }

  ordersTbody.innerHTML = orders
    .map((o) => {
      const total = Number(o.total_price || 0);
      const paid = Number(o.paid_amount || 0);
      const balance = Math.max(total - paid, 0);

      return `
        <tr>
          <td>${o.order_id}</td>

          <td>
            ${text(
              o.customer_name ||
              `${o.first_name || ""} ${o.last_name || ""}`.trim()
            )}
          </td>

          <td>${text(o.phone)}</td>

          <td>${text(o.dress_name)}</td>

          <td>${text(o.order_type)}</td>

          <td>${text(o.occasion_type)}</td>

          <td>${dateOnly(o.order_date)}</td>

          <td>${dateOnly(o.return_date)}</td>

          <td>${money(total)}</td>

          <td>${money(paid)}</td>

          <td>${money(balance)}</td>

          <td>${text(o.payment_status)}</td>

          <td>${text(o.status)}</td>

          <td>
            <button
              class="btn btn-sm btn-outline-primary me-1"
              onclick="editOrder(${o.order_id})"
            >
              Edit
            </button>

            <button
              class="btn btn-sm btn-outline-secondary me-1"
              onclick="showPayments(${o.order_id})"
            >
              Payments
            </button>

            <button
              class="btn btn-sm btn-outline-danger"
              onclick="deleteOrder(${o.order_id})"
            >
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function clearOrderForm() {
  orderIdInput.value = "";

  orderForm.reset();

  orderDateInput.value =
    dateOnly(new Date().toISOString());

  statusInput.value = "in_progress";

  orderTypeInput.value = "sale";

  toggleReturnDate();
}

function toggleReturnDate() {
  const isRental =
    orderTypeInput.value === "rental";

  returnDateWrap.style.display =
    isRental ? "" : "none";

  if (!isRental) {
    returnDateInput.value = "";
  }
}

window.editOrder = function (id) {
  const order = orders.find(
    (o) => Number(o.order_id) === Number(id)
  );

  if (!order) return;

  orderIdInput.value = order.order_id;

  customerSelect.value =
    order.customer_id || "";

  dressSelect.value =
    order.dress_id || "";

  orderTypeInput.value =
    order.order_type || "sale";

  occasionTypeInput.value =
    order.occasion_type || "";

  orderDateInput.value =
    dateOnly(order.order_date);

  returnDateInput.value =
    dateOnly(order.return_date);

  totalPriceInput.value =
    order.total_price || "";

  statusInput.value =
    order.status || "in_progress";

  toggleReturnDate();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

window.deleteOrder = async function (id) {
  if (!confirm("Delete this order?")) {
    return;
  }

  try {
    await fetchJson(`${ENDPOINT}/${id}`, {
      method: "DELETE"
    });

    if (Number(selectedOrderId) === Number(id)) {
      selectedOrderId = null;
      paymentsCard.style.display = "none";
    }

    await loadOrders();

  } catch (err) {
    alert(err.message);
  }
};

orderForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    customer_id: Number(customerSelect.value),

    dress_id: dressSelect.value
      ? Number(dressSelect.value)
      : null,

    order_type: orderTypeInput.value,

    occasion_type:
      occasionTypeInput.value.trim() || null,

    order_date:
      orderDateInput.value || null,

    return_date:
      orderTypeInput.value === "rental"
        ? (returnDateInput.value || null)
        : null,

    total_price:
      Number(totalPriceInput.value || 0),

    status: statusInput.value,
  };

  const id = orderIdInput.value;

  const method = id ? "PUT" : "POST";

  const url = id
    ? `${ENDPOINT}/${id}`
    : ENDPOINT;

  try {
    await fetchJson(url, {
      method,

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload),
    });

    clearOrderForm();

    await loadOrders();

  } catch (err) {
    alert(err.message);
  }
});

searchBtn.addEventListener("click", loadOrders);

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";

  loadOrders();
});

cancelEditBtn.addEventListener(
  "click",
  clearOrderForm
);

orderTypeInput.addEventListener(
  "change",
  toggleReturnDate
);

(async function init() {
  try {
    document.getElementById("apiUrlText").textContent =
      "/api/orders";

    await Promise.all([
      loadCustomers(),
      loadDresses()
    ]);

    clearOrderForm();

    await loadOrders();

  } catch (err) {
    alert(err.message);
  }
})();