const API_BASE =
  window.CONFIG?.API_BASE ||
  "https://aseel-latelier.onrender.com/api";

const ENDPOINT = `${API_BASE}/orders`;

const orderIdInput =
  document.getElementById("order_id");

const customerSelect =
  document.getElementById("customer_id");

const dressSelect =
  document.getElementById("dress_id");

const orderTypeInput =
  document.getElementById("order_type");

const occasionTypeInput =
  document.getElementById("occasion_type");

const customerTypeInput =
  document.getElementById("customer_type");

const orderDateInput =
  document.getElementById("order_date");

const returnDateInput =
  document.getElementById("return_date");

const totalPriceInput =
  document.getElementById("total_price");

const statusInput =
  document.getElementById("status");

const venueCityInput =
  document.getElementById("venue_city");

const venueHallInput =
  document.getElementById("venue_hall");

const hasPreviousExperienceInput =
  document.getElementById("has_previous_experience");

const previousExperienceTypeInput =
  document.getElementById("previous_experience_type");

const experienceRatingInput =
  document.getElementById("experience_rating");

const orderForm =
  document.getElementById("orderForm");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");

const searchBtn =
  document.getElementById("searchBtn");

const resetBtn =
  document.getElementById("resetBtn");

const cancelEditBtn =
  document.getElementById("cancelEditBtn");

const ordersTbody =
  document.getElementById("ordersTbody");

const ordersCount =
  document.getElementById("ordersCount");

const apiUrlText =
  document.getElementById("apiUrlText");

const returnDateWrap =
  document.getElementById("returnDateWrap");

let customers = [];
let dresses = [];
let orders = [];

let priceWasAutoFilled = false;

if (apiUrlText) {
  apiUrlText.textContent = "/api/orders";
}

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function todayString() {
  const now = new Date();

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function text(value) {
  return value === null ||
    value === undefined ||
    value === ""
    ? "-"
    : String(value);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  const data =
    await res.json().catch(() => null);

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
  customers =
    await fetchJson(`${API_BASE}/customers`);

  customerSelect.innerHTML =
    `<option value="">Select customer</option>` +
    customers.map((c) => {
      const name =
        `${c.first_name || ""} ${c.last_name || ""}`.trim();

      return `
        <option value="${c.customer_id}">
          ${name || `Customer #${c.customer_id}`}
        </option>
      `;
    }).join("");
}

async function loadDresses() {
  dresses =
    await fetchJson(`${API_BASE}/dresses`);

  dressSelect.innerHTML =
    `<option value="">Select dress</option>` +
    dresses.map((d) => {
      const name =
        d.dress_name || `Dress #${d.dress_id}`;

      return `
        <option
          value="${d.dress_id}"
          data-rental-price="${d.rental_price ?? ""}"
          data-sale-price="${d.sale_price ?? ""}"
        >
          ${name}
        </option>
      `;
    }).join("");
}

async function loadOrders() {
  const params = new URLSearchParams();

  if (searchInput?.value.trim()) {
    params.set(
      "search",
      searchInput.value.trim()
    );
  }

  if (statusFilter?.value) {
    params.set(
      "status",
      statusFilter.value
    );
  }

  const url =
    params.toString()
      ? `${ENDPOINT}?${params.toString()}`
      : ENDPOINT;

  orders =
    await fetchJson(url);

  renderOrders();
}

function renderOrders() {

  if (ordersCount) {
    ordersCount.textContent =
      `${orders.length} orders`;
  }

  if (!orders.length) {

    ordersTbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4">
          No orders found.
        </td>
      </tr>
    `;

    return;
  }

  ordersTbody.innerHTML =
    orders.map((o) => `
      <tr>

        <td>${o.order_id}</td>

        <td>
          ${text(
      o.customer_name ||
      `${o.first_name || ""} ${o.last_name || ""}`.trim()
    )}
        </td>

        <td>
          ${text(o.dress_name)}
        </td>

        <td>
          ${text(o.order_type)}
        </td>

        <td>
          ${text(o.occasion_type)}
        </td>

        <td>
          ${text(o.customer_type)}
        </td>

        <td>
          ${money(o.total_price)}
        </td>

        <td>
          ${text(o.status)}
        </td>

        <td class="d-flex gap-2 flex-wrap">

          <button
            class="btn btn-sm btn-outline-secondary"
            onclick="editOrder(${o.order_id})"
          >
            Edit
          </button>

          <button
            class="btn btn-sm btn-outline-danger"
            onclick="deleteOrder(${o.order_id})"
          >
            Delete
          </button>

        </td>

      </tr>
    `).join("");
}

function getSelectedDress() {
  const dressId =
    Number(dressSelect.value);

  return dresses.find(
    (d) => Number(d.dress_id) === dressId
  ) || null;
}

function getPriceForSelectedDress() {
  const dress =
    getSelectedDress();

  if (!dress) return "";

  if (orderTypeInput.value === "rental") {
    return dress.rental_price ?? "";
  }

  return dress.sale_price ?? "";
}

function autofillTotalPrice(force = false) {
  const suggestedPrice =
    getPriceForSelectedDress();

  if (
    suggestedPrice === "" ||
    suggestedPrice === null ||
    suggestedPrice === undefined
  ) {

    if (force || priceWasAutoFilled) {
      totalPriceInput.value = "";
    }

    return;
  }

  if (
    force ||
    !totalPriceInput.value ||
    priceWasAutoFilled
  ) {

    totalPriceInput.value =
      Number(suggestedPrice).toFixed(2);

    priceWasAutoFilled = true;
  }
}

function toggleReturnDate() {
  const isRental =
    orderTypeInput.value === "rental";

  if (returnDateWrap) {
    returnDateWrap.style.display =
      isRental ? "" : "none";
  }

  if (!isRental) {
    returnDateInput.value = "";
  }
}

function toggleExperienceFields() {

  const hasExperience =
    hasPreviousExperienceInput.value === "1";

  previousExperienceTypeInput.disabled =
    !hasExperience;

  experienceRatingInput.disabled =
    !hasExperience;

  if (!hasExperience) {
    previousExperienceTypeInput.value = "";
    experienceRatingInput.value = "";
  }
}

function clearOrderForm() {

  orderIdInput.value = "";

  orderForm.reset();

  orderDateInput.value =
    todayString();

  statusInput.value =
    "in_progress";

  orderTypeInput.value = "";

  hasPreviousExperienceInput.value = "0";

  toggleExperienceFields();

  priceWasAutoFilled = false;

  toggleReturnDate();
  autofillTotalPrice(true);
}

window.editOrder =
  function (id) {

    const order =
      orders.find(
        (o) =>
          Number(o.order_id) === Number(id)
      );

    if (!order) return;

    orderIdInput.value =
      order.order_id;

    customerSelect.value =
      order.customer_id || "";

    dressSelect.value =
      order.dress_id || "";

    orderTypeInput.value =
      order.order_type || "";

    occasionTypeInput.value =
      order.occasion_type || "";

    customerTypeInput.value =
      order.customer_type || "";

    orderDateInput.value =
      dateOnly(order.order_date);

    returnDateInput.value =
      dateOnly(order.return_date);

    totalPriceInput.value =
      order.total_price ?? "";

    statusInput.value =
      order.status || "in_progress";

    venueCityInput.value =
      order.venue_city || "";

    venueHallInput.value =
      order.venue_hall || "";

    hasPreviousExperienceInput.value =
      order.has_previous_experience
        ? "1"
        : "0";

    previousExperienceTypeInput.value =
      order.previous_experience_type || "";

    experienceRatingInput.value =
      order.experience_rating || "";

    toggleExperienceFields();

    priceWasAutoFilled = false;

    toggleReturnDate();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

window.deleteOrder =
  async function (id) {

    if (
      !confirm("Delete this order?")
    ) {
      return;
    }

    try {

      await fetchJson(
        `${ENDPOINT}/${id}`,
        {
          method: "DELETE",
        }
      );

      await loadOrders();

    } catch (err) {

      alert(err.message);
    }
  };

orderForm?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    const payload = {

      customer_id:
        Number(customerSelect.value),

      dress_id:
        dressSelect.value
          ? Number(dressSelect.value)
          : null,

      order_type:
        orderTypeInput.value,

      occasion_type:
        occasionTypeInput.value.trim() || null,

      customer_type:
        customerTypeInput.value || null,

      order_date:
        orderDateInput.value || null,

      return_date:
        orderTypeInput.value === "rental"
          ? returnDateInput.value || null
          : null,

      total_price:
        Number(totalPriceInput.value || 0),

      status:
        statusInput.value,

      venue_city:
        venueCityInput.value.trim() || null,

      venue_hall:
        venueHallInput.value.trim() || null,

      has_previous_experience:
        hasPreviousExperienceInput.value === "1",

      previous_experience_type:
        previousExperienceTypeInput.value || null,

      experience_rating:
        experienceRatingInput.value
          ? Number(experienceRatingInput.value)
          : null,
    };

    const id =
      orderIdInput.value;

    const method =
      id ? "PUT" : "POST";

    const url =
      id
        ? `${ENDPOINT}/${id}`
        : ENDPOINT;

    try {

      await fetchJson(url, {

        method,

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),
      });

      clearOrderForm();

      await loadOrders();

    } catch (err) {

      alert(err.message);
    }
  }
);

searchBtn?.addEventListener(
  "click",
  loadOrders
);

resetBtn?.addEventListener(
  "click",
  () => {

    if (searchInput) {
      searchInput.value = "";
    }

    if (statusFilter) {
      statusFilter.value = "";
    }

    loadOrders();
  }
);

cancelEditBtn?.addEventListener(
  "click",
  clearOrderForm
);

orderTypeInput?.addEventListener(
  "change",
  () => {

    toggleReturnDate();
    autofillTotalPrice(true);
  }
);

dressSelect?.addEventListener(
  "change",
  () => {

    autofillTotalPrice(true);
  }
);

hasPreviousExperienceInput?.addEventListener(
  "change",
  toggleExperienceFields
);

totalPriceInput?.addEventListener(
  "input",
  () => {

    priceWasAutoFilled = false;
  }
);

(async function init() {

  try {

    await Promise.all([
      loadCustomers(),
      loadDresses(),
    ]);

    clearOrderForm();

    await loadOrders();

  } catch (err) {

    alert(err.message);
  }
})();