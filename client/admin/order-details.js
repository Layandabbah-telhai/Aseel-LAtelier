const API_BASE =
  window.CONFIG?.API_BASE ||
  "https://aseel-latelier.onrender.com/api";

const params = new URLSearchParams(window.location.search);
const orderId = params.get("order_id");

const loadingBox = document.getElementById("loadingBox");
const detailsWrap = document.getElementById("detailsWrap");

const caseCustomerName = document.getElementById("caseCustomerName");
const caseOrderStatus = document.getElementById("caseOrderStatus");
const casePaymentStatus = document.getElementById("casePaymentStatus");
const caseOrderType = document.getElementById("caseOrderType");
const casePhoneText = document.getElementById("casePhoneText");
const caseEmailText = document.getElementById("caseEmailText");

const orderIdText = document.getElementById("orderIdText");
const totalText = document.getElementById("totalText");
const paidText = document.getElementById("paidText");
const paymentStatusText = document.getElementById("paymentStatusText");
const remainingText = document.getElementById("remainingText");
const occasionText = document.getElementById("occasionText");
const customerTypeText = document.getElementById("customerTypeText");
const orderDateText = document.getElementById("orderDateText");
const returnDateText = document.getElementById("returnDateText");
const venueText = document.getElementById("venueText");

const customerBox = document.getElementById("customerBox");
const dressBox = document.getElementById("dressBox");
const paymentsMiniList = document.getElementById("paymentsMiniList");
const progressTimeline = document.getElementById("progressTimeline");
const measurementsSummary = document.getElementById("measurementsSummary");
const assignmentsSummary = document.getElementById("assignmentsSummary");
const appointmentsTbody = document.getElementById("appointmentsTbody");
const activityBox = document.getElementById("activityBox");

const editOrderBtn = document.getElementById("editOrderBtn");
const editCustomerBtn = document.getElementById("editCustomerBtn");
const managePaymentsBtn = document.getElementById("managePaymentsBtn");
const manageMeasurementsBtn = document.getElementById("manageMeasurementsBtn");
const manageAssignmentsBtn = document.getElementById("manageAssignmentsBtn");

const manageAppointmentsButtons = [
  document.getElementById("manageAppointmentsBtn"),
  document.getElementById("manageAppointmentsBtn2"),
  document.getElementById("manageAppointmentsBtn3"),
];

let currentOrder = null;
let currentCustomer = null;
let currentDress = null;

function text(value) {
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function dateOnly(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function timeOnly(value) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

function customerName(customer) {
  return text(
    `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim()
  );
}

function statusBadge(value) {
  const status = String(value || "-");

  let cls = "badge-soft";

  if (status === "paid" || status === "Completed" || status === "completed") {
    cls = "text-bg-success";
  }

  if (status === "partial" || status === "Missed" || status === "missed") {
    cls = "text-bg-warning";
  }

  if (status === "cancelled" || status === "Cancelled" || status === "unpaid") {
    cls = "text-bg-danger";
  }

  return `
    <span class="${cls} px-3 py-2 rounded-pill">
      ${text(status)}
    </span>
  `;
}

function getEffectiveAppointmentStatus(appointment) {
  const original = String(appointment.status || "");

  if (original !== "Scheduled") {
    return original;
  }

  const date = dateOnly(appointment.appointment_date);
  const time = timeOnly(appointment.appointment_time) === "-"
    ? "23:59"
    : timeOnly(appointment.appointment_time);

  const appointmentDateTime = new Date(`${date}T${time}`);
  const now = new Date();

  if (appointmentDateTime < now) {
    return "Missed";
  }

  return original;
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
}

async function loadAllAppointmentsForOrder() {
  const statuses = [
    "Scheduled",
    "Completed",
    "Cancelled",
    "Missed",
  ];

  const results = await Promise.all(
    statuses.map((status) =>
      fetchJson(
        `${API_BASE}/appointments?order_id=${orderId}&status=${encodeURIComponent(status)}`
      ).catch(() => [])
    )
  );

  const merged = results.flat();

  const unique = new Map();

  merged.forEach((appointment) => {
    unique.set(
      String(appointment.appointment_id),
      appointment
    );
  });

  return Array.from(unique.values()).sort((a, b) => {
    const aKey = `${dateOnly(a.appointment_date)} ${timeOnly(a.appointment_time)}`;
    const bKey = `${dateOnly(b.appointment_date)} ${timeOnly(b.appointment_time)}`;

    return aKey.localeCompare(bKey);
  });
}

function renderPayments(payments) {
  if (!payments.length) {
    paymentsMiniList.innerHTML = `
      <div class="text-muted">
        No payments yet.
      </div>
    `;
    return;
  }

  const latestPayments =
    [...payments]
      .sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)))
      .slice(0, 3);

  paymentsMiniList.innerHTML =
    latestPayments.map((p) => `
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <div>
          <strong>${money(p.amount)}</strong>
          <div class="small-muted">
            ${dateOnly(p.payment_date)} · ${text(p.payment_method)}
          </div>
        </div>

        <div>
          ${statusBadge(p.payment_status)}
        </div>
      </div>
    `).join("");
}

function renderProgressTimeline(appointments) {
  if (!appointments.length) {
    progressTimeline.innerHTML = `
      <div class="text-muted">
        No appointments yet.
      </div>
    `;
    return;
  }

  progressTimeline.innerHTML =
    appointments.map((a, index) => {
      const effectiveStatus = getEffectiveAppointmentStatus(a);

      const marker =
        effectiveStatus === "Completed"
          ? "✓"
          : effectiveStatus === "Cancelled"
            ? "×"
            : effectiveStatus === "Missed"
              ? "!"
              : index + 1;

      return `
        <div class="d-flex gap-3 align-items-start mb-3">
          <div
            class="rounded-circle d-flex align-items-center justify-content-center"
            style="width:34px;height:34px;border:1px solid #ddd;flex:0 0 34px;"
          >
            ${marker}
          </div>

          <div class="flex-grow-1">
            <div class="d-flex justify-content-between gap-2 flex-wrap">
              <strong>${text(a.appointment_type)}</strong>
              ${statusBadge(effectiveStatus)}
            </div>

            <div class="small-muted">
              ${dateOnly(a.appointment_date)} · ${timeOnly(a.appointment_time)}
            </div>

            ${
              a.notes
                ? `<div class="small-muted mt-1">${text(a.notes)}</div>`
                : ""
            }
          </div>
        </div>
      `;
    }).join("");
}

function renderMeasurements(measurements) {
  if (!measurements.length) {
    measurementsSummary.innerHTML = `
      <div class="text-muted">
        No measurements yet.
      </div>
    `;
    return;
  }

  const latest = measurements[0];

  measurementsSummary.innerHTML = `
    <div class="row g-3">
      <div class="col-6">
        <div class="small-muted">Type</div>
        <strong>${text(latest.tailoring_type)}</strong>
      </div>

      <div class="col-6">
        <div class="small-muted">Height</div>
        <strong>${text(latest.height)}</strong>
      </div>

      <div class="col-6">
        <div class="small-muted">Bust</div>
        <strong>${text(latest.bust)}</strong>
      </div>

      <div class="col-6">
        <div class="small-muted">Waist</div>
        <strong>${text(latest.waist)}</strong>
      </div>

      <div class="col-6">
        <div class="small-muted">Hip</div>
        <strong>${text(latest.hip)}</strong>
      </div>

      <div class="col-6">
        <div class="small-muted">Weight</div>
        <strong>${text(latest.weight)}</strong>
      </div>
    </div>
  `;
}

function renderAssignments(assignments) {
  if (!assignments.length) {
    assignmentsSummary.innerHTML = `
      <div class="text-muted">
        No seamstress assigned yet.
      </div>
    `;
    return;
  }

  assignmentsSummary.innerHTML =
    assignments.map((a) => `
      <div class="border rounded-4 p-3 mb-2">
        <div class="d-flex justify-content-between gap-2 flex-wrap">
          <strong>${text(a.name)}</strong>
          ${statusBadge(a.assignment_status)}
        </div>

        <div class="small-muted">
          ${text(a.task_type)}
        </div>

        <div class="small-muted">
          Due: ${dateOnly(a.due_date)}
        </div>

        ${
          a.assignment_notes
            ? `<div class="small-muted mt-1">${text(a.assignment_notes)}</div>`
            : ""
        }
      </div>
    `).join("");
}

function renderAppointmentsTable(appointments) {
  if (!appointments.length) {
    appointmentsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          No appointments
        </td>
      </tr>
    `;
    return;
  }

  appointmentsTbody.innerHTML =
    appointments.map((a) => {
      const effectiveStatus = getEffectiveAppointmentStatus(a);

      return `
        <tr>
          <td>${dateOnly(a.appointment_date)}</td>
          <td>${timeOnly(a.appointment_time)}</td>
          <td>${text(a.appointment_type)}</td>
          <td>${statusBadge(effectiveStatus)}</td>
        </tr>
      `;
    }).join("");
}

function renderCustomer(order) {
  customerBox.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="small-muted">Name</div>
        <strong>${customerName(currentCustomer)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Customer ID</div>
        <strong>${text(order.customer_id)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Phone</div>
        <strong>${text(currentCustomer?.phone)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Email</div>
        <strong>${text(currentCustomer?.email)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">City</div>
        <strong>${text(currentCustomer?.city)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Birth Date</div>
        <strong>${dateOnly(currentCustomer?.birth_date)}</strong>
      </div>
    </div>
  `;
}

function renderDress(order) {
  dressBox.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="small-muted">Dress</div>
        <strong>${text(currentDress?.dress_name)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Dress ID</div>
        <strong>${text(order.dress_id)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Color</div>
        <strong>${text(currentDress?.color)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Size</div>
        <strong>${text(currentDress?.size)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Rental Price</div>
        <strong>${money(currentDress?.rental_price)}</strong>
      </div>

      <div class="col-md-6">
        <div class="small-muted">Sale Price</div>
        <strong>${money(currentDress?.sale_price)}</strong>
      </div>
    </div>
  `;
}

function renderActivitySnapshot({ payments, measurements, appointments, assignments }) {
  activityBox.innerHTML = `
    <div class="row g-3">
      <div class="col-md-3">
        <div class="small-muted">Payments</div>
        <h4>${payments.length}</h4>
      </div>

      <div class="col-md-3">
        <div class="small-muted">Measurements</div>
        <h4>${measurements.length}</h4>
      </div>

      <div class="col-md-3">
        <div class="small-muted">Appointments</div>
        <h4>${appointments.length}</h4>
      </div>

      <div class="col-md-3">
        <div class="small-muted">Assignments</div>
        <h4>${assignments.length}</h4>
      </div>
    </div>
  `;
}

function setupNavigationButtons() {
  editOrderBtn.onclick = () => {
    window.location.href = `orders.html?edit_order_id=${currentOrder.order_id}`;
  };

  editCustomerBtn.onclick = () => {
    window.location.href = `customers.html?edit_customer_id=${currentOrder.customer_id}`;
  };

  managePaymentsBtn.onclick = () => {
    window.location.href = `payments.html?order_id=${currentOrder.order_id}`;
  };

  manageMeasurementsBtn.onclick = () => {
    window.location.href = `measurements.html?order_id=${currentOrder.order_id}`;
  };

  manageAssignmentsBtn.onclick = () => {
    window.location.href = `seamstresses.html?order_id=${currentOrder.order_id}`;
  };

  manageAppointmentsButtons.forEach((btn) => {
    if (!btn) return;

    btn.onclick = () => {
      window.location.href = `appointments.html?order_id=${currentOrder.order_id}`;
    };
  });
}

async function loadOrder() {
  try {
    if (!orderId) {
      throw new Error("Missing order_id");
    }

    const [
      order,
      payments,
      customers,
      dresses,
      measurements,
      appointments,
      assignments,
    ] = await Promise.all([
      fetchJson(`${API_BASE}/orders/${orderId}`),
      fetchJson(`${API_BASE}/orders/${orderId}/payments`),
      fetchJson(`${API_BASE}/customers`),
      fetchJson(`${API_BASE}/dresses`),
      fetchJson(`${API_BASE}/measurements?order_id=${orderId}`),
      loadAllAppointmentsForOrder(),
      fetchJson(`${API_BASE}/seamstresses/assignments?order_id=${orderId}`),
    ]);

    currentOrder = order;

    currentCustomer = customers.find(
      (c) => Number(c.customer_id) === Number(order.customer_id)
    );

    currentDress = dresses.find(
      (d) => Number(d.dress_id) === Number(order.dress_id)
    );

    const total = Number(order.total_price || 0);
    const paid = Number(order.paid_amount || 0);
    const remaining = Math.max(total - paid, 0);

    caseCustomerName.textContent = customerName(currentCustomer);
    caseOrderStatus.innerHTML = statusBadge(order.status);
    casePaymentStatus.innerHTML = statusBadge(order.payment_status);
    caseOrderType.textContent =
      order.order_type === "sale"
        ? "Custom Design"
        : text(order.order_type);

    casePhoneText.textContent = text(currentCustomer?.phone);
    caseEmailText.textContent = text(currentCustomer?.email);

    orderIdText.textContent = text(order.order_id);
    totalText.textContent = money(total);
    paidText.textContent = money(paid);
    paymentStatusText.innerHTML = statusBadge(order.payment_status);
    remainingText.textContent = money(remaining);
    occasionText.textContent = text(order.occasion_type);
    customerTypeText.textContent = text(order.customer_type);
    orderDateText.textContent = dateOnly(order.order_date);
    returnDateText.textContent = dateOnly(order.return_date);

    venueText.textContent =
      [order.venue_city, order.venue_hall]
        .filter(Boolean)
        .join(" - ") || "-";

    renderCustomer(order);
    renderDress(order);
    renderPayments(payments);
    renderProgressTimeline(appointments);
    renderMeasurements(measurements);
    renderAssignments(assignments);
    renderAppointmentsTable(appointments);
    renderActivitySnapshot({
      payments,
      measurements,
      appointments,
      assignments,
    });

    setupNavigationButtons();

    loadingBox.style.display = "none";
    detailsWrap.style.display = "";

  } catch (err) {
    loadingBox.className = "alert alert-danger";
    loadingBox.textContent = err.message;
  }
}

loadOrder();
