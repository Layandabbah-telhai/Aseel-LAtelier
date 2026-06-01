const API_BASE = window.CONFIG?.API_BASE || "https://aseel-latelier.onrender.com/api";
const ENDPOINT = `${API_BASE}/appointments`;

const appointmentIdInput = document.getElementById("appointment_id");
const customerSelect = document.getElementById("customer_id");
const orderSelect = document.getElementById("order_id");
const appointmentTypeInput = document.getElementById("appointment_type");
const appointmentDateInput = document.getElementById("appointment_date");
const appointmentTimeInput = document.getElementById("appointment_time");
const statusInput = document.getElementById("status");
const notesInput = document.getElementById("notes");

const appointmentForm = document.getElementById("appointmentForm");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const dateFilter = document.getElementById("dateFilter");
const viewMode = document.getElementById("viewMode");

const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const todayBtn = document.getElementById("todayBtn");
const tomorrowBtn = document.getElementById("tomorrowBtn");
const weekBtn = document.getElementById("weekBtn");
const allBtn = document.getElementById("allBtn");

const appointmentsTbody = document.getElementById("appointmentsTbody");
const appointmentsCount = document.getElementById("appointmentsCount");
const agendaWrap = document.getElementById("agendaWrap");
const orderSummary = document.getElementById("orderSummary");

let customers = [];
let orders = [];
let appointments = [];
let quickRange = "";

const SALE_APPOINTMENTS = [
  "First Consultation",
  "Design Selection",
  "Fabric Selection",
  "First Fitting",
  "Second Fitting",
  "Final Fitting",
  "Pickup",
];

const RENTAL_APPOINTMENTS = [
  "Rental Fitting",
  "Final Adjustments",
  "Dress Pickup",
  "Dress Return",
];

const GENERAL_APPOINTMENTS = [
  "Consultation",
  "Measurement",
  "Delivery",
  "Custom",
];

function populateAppointmentTypes(orderType = "") {
  const type = String(orderType || "").trim().toLowerCase();

  let options = GENERAL_APPOINTMENTS;

  if (type === "sale") {
    options = SALE_APPOINTMENTS;
  }

  if (type === "rental") {
    options = RENTAL_APPOINTMENTS;
  }

  appointmentTypeInput.innerHTML =
    options.map((option) => `
      <option value="${option}">
        ${option}
      </option>
    `).join("");
}

function getSelectedOrder() {
  const id = Number(orderSelect.value);

  return orders.find(
    (o) => Number(o.order_id) === id
  ) || null;
}

function syncAppointmentTypesWithOrder() {
  const order = getSelectedOrder();

  populateAppointmentTypes(order?.order_type || "");
}

function dateOnly(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

function timeOnly(value) {
  if (!value) return "";

  return String(value).slice(0, 5);
}

function todayString() {
  return toDateInputValue(new Date());
}

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function text(value) {
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

function customerFullName(row) {
  return text(
    row.customer_name ||
    `${row.first_name || ""} ${row.last_name || ""}`.trim()
  );
}

function getEffectiveStatus(appointment) {

  const original =
    String(appointment.status || "");

  if (original !== "Scheduled") {
    return original;
  }

  if (!appointment.appointment_date) {
    return original;
  }

  const date =
    dateOnly(appointment.appointment_date);

  const time =
    timeOnly(appointment.appointment_time) || "23:59";

  const appointmentDateTime =
    new Date(`${date}T${time}`);

  const now = new Date();

  if (appointmentDateTime < now) {
    return "Missed";
  }

  return original;
}

function statusBadge(appointment) {

  const value =
    getEffectiveStatus(appointment);

  let cls = "badge-soft";

  if (value === "Completed") {
    cls = "text-bg-success";
  }

  if (value === "Cancelled") {
    cls = "text-bg-danger";
  }

  if (value === "Missed") {
    cls = "text-bg-warning";
  }

  if (value === "Scheduled") {
    cls = "badge-soft";
  }

  return `
    <span class="${cls} px-3 py-2 rounded-pill">
      ${text(value)}
    </span>
  `;
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

  customerSelect.innerHTML =
    customers.map((c) => {
      const name = `${c.first_name || ""} ${c.last_name || ""}`.trim();

      return `
        <option value="${c.customer_id}">
          ${name || `Customer #${c.customer_id}`}
        </option>
      `;
    }).join("");
}

async function loadOrders() {
  orders = await fetchJson(`${API_BASE}/orders`);

  orderSelect.innerHTML =
    `<option value="">No order</option>` +
    orders.map((o) => {
      const customerName =
        o.customer_name ||
        `${o.first_name || ""} ${o.last_name || ""}`.trim();

      const label =
        `#${o.order_id} - ${customerName || "Customer"} - ${o.dress_name || "No dress"}`;

      return `
        <option value="${o.order_id}">
          ${label}
        </option>
      `;
    }).join("");
}

async function loadAppointments() {
  const params = new URLSearchParams();

  if (searchInput.value.trim()) {
    params.set("search", searchInput.value.trim());
  }

  if (statusFilter.value) {
    params.set("status", statusFilter.value);
  }

  if (dateFilter.value) {
    params.set("date", dateFilter.value);
  }

  if (quickRange === "week") {
    const today = new Date();
    const weekLater = new Date();

    weekLater.setDate(today.getDate() + 7);

    params.set("date_from", toDateInputValue(today));
    params.set("date_to", toDateInputValue(weekLater));
  }

  const url = params.toString()
    ? `${ENDPOINT}?${params.toString()}`
    : ENDPOINT;

  appointments = await fetchJson(url);

  renderAppointments();
  renderAgenda();
}

function renderAppointments() {
  appointmentsCount.textContent =
    `${appointments.length} appointments`;

  if (!appointments.length) {
    appointmentsTbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center py-4">
          No appointments found.
        </td>
      </tr>
    `;

    return;
  }

  appointmentsTbody.innerHTML =
    appointments.map((a) => `
      <tr>
        <td>${a.appointment_id}</td>

        <td>
          ${a.order_id ? `#${a.order_id}` : "-"}
        </td>

        <td>${customerFullName(a)}</td>

        <td>${text(a.phone)}</td>

        <td>${text(a.dress_name)}</td>

        <td>${text(a.appointment_type || a.type)}</td>

        <td>${dateOnly(a.appointment_date)}</td>

        <td>${text(timeOnly(a.appointment_time))}</td>

        <td>${statusBadge(a)}</td>

        <td>${text(a.notes)}</td>

        <td class="d-flex gap-2 flex-wrap">
          <button
            class="btn btn-sm btn-outline-secondary"
            onclick="editAppointment(${a.appointment_id})"
          >
            Edit
          </button>

          <button
            class="btn btn-sm btn-outline-success"
            onclick="quickStatus(${a.appointment_id}, 'Completed')"
          >
            Complete
          </button>

          <button
            class="btn btn-sm btn-outline-danger"
            onclick="quickStatus(${a.appointment_id}, 'Cancelled')"
          >
            Cancel
          </button>
        </td>
      </tr>
    `).join("");
}

function renderAgenda() {
  if (!agendaWrap) return;

  if (viewMode.value === "table") {
    agendaWrap.style.display = "none";
    return;
  }

  agendaWrap.style.display = "";

  if (!appointments.length) {
    agendaWrap.innerHTML = `
      <div class="card card-luxe">
        <div class="card-body text-center text-muted">
          No appointments found.
        </div>
      </div>
    `;

    return;
  }

  const grouped = {};

  appointments.forEach((a) => {
    const date = dateOnly(a.appointment_date) || "No date";

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(a);
  });

  agendaWrap.innerHTML =
    Object.entries(grouped).map(([date, rows]) => `
      <div class="card card-luxe mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <strong>${text(date)}</strong>

          <span class="badge-soft px-3 py-2 rounded-pill">
            ${rows.length} appointments
          </span>
        </div>

        <div class="card-body">
          <div class="row g-3">
            ${rows.map((a) => `
              <div class="col-md-6 col-xl-4">
                <div class="border rounded-4 p-3 h-100">
                  <div class="d-flex justify-content-between gap-2 mb-2">
                    <strong>${text(timeOnly(a.appointment_time))}</strong>
                    ${statusBadge(a)}
                  </div>

                  <div class="mb-1">
                    <strong>${text(a.appointment_type)}</strong>
                  </div>

                  <div class="small-muted">
                    ${customerFullName(a)}
                  </div>

                  <div class="small-muted">
                    ${text(a.phone)}
                  </div>

                  <div class="small-muted">
                    Order: ${a.order_id ? `#${a.order_id}` : "-"}
                  </div>

                  <div class="small-muted">
                    Dress: ${text(a.dress_name)}
                  </div>

                  <div class="mt-3 d-flex gap-2 flex-wrap">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      onclick="editAppointment(${a.appointment_id})"
                    >
                      Edit
                    </button>

                    <button
                      class="btn btn-sm btn-outline-success"
                      onclick="quickStatus(${a.appointment_id}, 'Completed')"
                    >
                      Complete
                    </button>

                    <button
                      class="btn btn-sm btn-outline-danger"
                      onclick="quickStatus(${a.appointment_id}, 'Cancelled')"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `).join("");
}

function clearForm() {
  appointmentIdInput.value = "";

  appointmentForm.reset();

  const today = todayString();

  appointmentDateInput.value = today;
  appointmentDateInput.min = today;

  statusInput.value = "Scheduled";

  orderSelect.value = "";

  populateAppointmentTypes("");
}

function validateAppointmentBeforeSave() {
  const today = todayString();

  if (appointmentDateInput.value < today) {
    alert("Appointment date cannot be in the past.");
    return false;
  }

  const selectedTime = timeOnly(appointmentTimeInput.value);

  if (!selectedTime) {
    return true;
  }

  const duplicate = appointments.some((a) => {
    const sameDate =
      dateOnly(a.appointment_date) === appointmentDateInput.value;

    const sameTime =
      timeOnly(a.appointment_time) === selectedTime;

    const differentAppointment =
      String(a.appointment_id) !== String(appointmentIdInput.value || "");

    return sameDate && sameTime && differentAppointment;
  });

  if (duplicate) {
    alert("There is already an appointment at this date and time.");
    return false;
  }

  return true;
}

window.editAppointment = function (id) {
  const appointment = appointments.find(
    (a) => Number(a.appointment_id) === Number(id)
  );

  if (!appointment) return;

  appointmentIdInput.value = appointment.appointment_id;

  customerSelect.value = appointment.customer_id || "";

  orderSelect.value = appointment.order_id || "";

  syncAppointmentTypesWithOrder();

  appointmentTypeInput.value =
    appointment.appointment_type ||
    appointment.type ||
    appointmentTypeInput.value;

  appointmentDateInput.value = dateOnly(appointment.appointment_date);

  appointmentDateInput.min = todayString();

  appointmentTimeInput.value = timeOnly(appointment.appointment_time);

  statusInput.value = appointment.status || "Scheduled";

  notesInput.value = appointment.notes || "";

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

window.quickStatus = async function (id, newStatus) {
  const appointment = appointments.find(
    (a) => Number(a.appointment_id) === Number(id)
  );

  if (!appointment) return;

  if (!confirm(`Mark this appointment as ${newStatus}?`)) {
    return;
  }

  const payload = {
    customer_id: Number(appointment.customer_id),
    order_id: appointment.order_id ? Number(appointment.order_id) : null,
    appointment_type: appointment.appointment_type || appointment.type,
    appointment_date: dateOnly(appointment.appointment_date),
    appointment_time: appointment.appointment_time
      ? timeOnly(appointment.appointment_time)
      : null,
    status: newStatus,
    notes: appointment.notes || null,
  };

  try {
    await fetchJson(`${ENDPOINT}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    await loadAppointments();
  } catch (err) {
    alert(err.message);
  }
};

window.deleteAppointment = async function (id) {
  if (!confirm("Delete this appointment?")) {
    return;
  }

  try {
    await fetchJson(`${ENDPOINT}/${id}`, {
      method: "DELETE",
    });

    await loadAppointments();
  } catch (err) {
    alert(err.message);
  }
};

appointmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateAppointmentBeforeSave()) {
    return;
  }

  const payload = {
    customer_id: Number(customerSelect.value),

    order_id: orderSelect.value
      ? Number(orderSelect.value)
      : null,

    appointment_type: appointmentTypeInput.value,

    appointment_date: appointmentDateInput.value,

    appointment_time: appointmentTimeInput.value || null,

    status: statusInput.value,

    notes: notesInput.value.trim() || null,
  };

  const id = appointmentIdInput.value;

  const method = id ? "PUT" : "POST";

  const url = id
    ? `${ENDPOINT}/${id}`
    : ENDPOINT;

  try {
    await fetchJson(url, {
      method,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    clearForm();

    await loadAppointments();
  } catch (err) {
    alert(err.message);
  }
});

searchBtn.addEventListener("click", () => {
  quickRange = "";
  loadAppointments();
});

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";
  dateFilter.value = "";
  quickRange = "";

  loadAppointments();
});

cancelEditBtn.addEventListener("click", clearForm);

orderSelect.addEventListener("change", syncAppointmentTypesWithOrder);

viewMode.addEventListener("change", () => {
  renderAgenda();
});

todayBtn.addEventListener("click", () => {
  quickRange = "";
  dateFilter.value = todayString();
  loadAppointments();
});

tomorrowBtn.addEventListener("click", () => {
  quickRange = "";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  dateFilter.value = toDateInputValue(tomorrow);

  loadAppointments();
});

weekBtn.addEventListener("click", () => {
  quickRange = "week";
  dateFilter.value = "";

  loadAppointments();
});

allBtn.addEventListener("click", () => {
  quickRange = "";
  dateFilter.value = "";

  loadAppointments();
});

(async function init() {
  try {
    document.getElementById("apiUrlText").textContent = "/api/appointments";

    await Promise.all([
      loadCustomers(),
      loadOrders(),
    ]);

    clearForm();

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");

    if (orderId && orderSelect) {
      orderSelect.value = orderId;
      syncAppointmentTypesWithOrder();

      const selectedOrder = getSelectedOrder();

      if (selectedOrder && orderSummary) {
        const customerName =
          selectedOrder.customer_name ||
          `${selectedOrder.first_name || ""} ${selectedOrder.last_name || ""}`.trim();

        orderSummary.innerHTML = `
          <div class="alert alert-secondary mb-0">
            Showing appointments for Order #${selectedOrder.order_id}
            - ${text(customerName)}
          </div>
        `;
      }
    }

    await loadAppointments();

  } catch (err) {
    alert(err.message);
  }
})();

