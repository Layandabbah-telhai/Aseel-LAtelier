const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";
const FALLBACK_IMAGE = "../logo.png";

const token = localStorage.getItem("aseel_token");
const userRaw = localStorage.getItem("aseel_user");

if (!token || !userRaw) {
  window.location.href = "../login.html";
}

const user = JSON.parse(userRaw || "{}");

if (user.role !== "customer") {
  window.location.href = "../admin/customers.html";
}

if (!user.customer_id) {
  alert("This customer account is not linked to a customer profile.");
  window.location.href = "../login.html";
}

const dashboardContent = document.getElementById("dashboardContent");

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("aseel_token");
  localStorage.removeItem("aseel_user");
  window.location.href = "../login.html";
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "-";
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function prettifyStatus(status) {
  const s = String(status || "unknown")
    .replaceAll("_", " ")
    .toLowerCase();

  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

function statusBadge(status) {
  return `
    <span class="badge-soft px-3 py-2 rounded-pill">
      ${escapeHtml(prettifyStatus(status))}
    </span>
  `;
}

function getDressDisplayName(order) {
  const orderType = String(order.order_type || "").toLowerCase();

  if (order.dress_name && order.dress_name !== "Not assigned yet") {
    return order.dress_name;
  }

  if (orderType === "sale") {
    return "Custom Design In Progress";
  }

  if (orderType === "rental") {
    return "Dress Not Selected Yet";
  }

  return "Not assigned yet";
}

function getProgressIndex(status) {
  const s = normalizeStatus(status);

  if (s === "pending") return 0;
  if (s === "in_progress") return 1;
  if (s === "sewing") return 2;
  if (s === "ready_for_fitting") return 3;
  if (s === "ready") return 4;
  if (s === "delivered" || s === "completed") return 5;
  if (s === "cancelled") return -1;

  return 0;
}

function renderProgressTimeline(status) {
  const steps = [
    "Consultation",
    "Measurements",
    "Tailoring",
    "Fitting",
    "Ready",
    "Delivered",
  ];

  const current = getProgressIndex(status);

  if (normalizeStatus(status) === "cancelled") {
    return `
      <div class="mb-4">
        <h5>Dress Progress</h5>

        <div class="alert alert-danger rounded-4 mb-0">
          This order was cancelled.
        </div>
      </div>
    `;
  }

  return `
    <div class="mb-4">
      <h5>Dress Progress</h5>

      <div class="d-flex flex-wrap gap-2">
        ${steps
      .map((step, index) => {
        const done = index <= current;
        const active = index === current;

        return `
              <div
                class="px-3 py-2 rounded-pill border"
                style="
                  background:${done ? "#f1e7e2" : "#fff"};
                  border-color:${active ? "#b99d91" : "#eadfd9"} !important;
                  font-weight:${active ? "700" : "500"};
                  color:${done ? "#5e4a45" : "#a99892"};
                "
              >
                ${done ? "✓" : "○"} ${escapeHtml(step)}
              </div>
            `;
      })
      .join("")}
      </div>
    </div>
  `;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }

  return payload;
}

async function loadDashboard() {
  try {
    const data = await fetchJson(
      `${API_BASE}/customer-dashboard/${user.customer_id}`
    );

    const requests = await fetchJson(
      `${API_BASE}/customer-occasion-requests/${user.customer_id}`
    );

    renderDashboard(data, requests);
  } catch (err) {
    dashboardContent.innerHTML = `
      <div class="card card-luxe">
        <div class="card-body text-center text-danger">
          ${escapeHtml(err.message)}
        </div>
      </div>
    `;
  }
}

function renderDashboard(data, occasionRequests = []) {
  const customer = data.customer;
  const orders = Array.isArray(data.orders) ? data.orders : [];

  dashboardContent.innerHTML = `
    <div class="card card-luxe mb-4">
      <div class="card-body">
        <h4 class="mb-2">
          Welcome,
          ${escapeHtml(customer.first_name)}
          ${escapeHtml(customer.last_name)}
        </h4>

        <div class="small-muted">
          ${escapeHtml(customer.email || "")}
          ${customer.phone ? ` | ${escapeHtml(customer.phone)}` : ""}
          ${customer.city ? ` | ${escapeHtml(customer.city)}` : ""}
        </div>
      </div>
    </div>

    ${renderNewOccasionRequest()}

    ${renderMyOccasionRequests(occasionRequests)}

    ${orders.length
      ? orders.map(renderOrderCard).join("")
      : `
          <div class="card card-luxe">
            <div class="card-body text-center small-muted">
              You do not have any orders yet.
            </div>
          </div>
        `
    }
  `;
}

function renderNewOccasionRequest() {
  return `
    <div class="card card-luxe mb-4">
      <div class="card-body">
        <h3 class="mb-4">Request New Occasion</h3>

        <div class="row g-3">
          <div class="col-md-4">
            <select class="form-select" id="occasion_type">
              <option value="Wedding">Wedding</option>
              <option value="Engagement">Engagement</option>
              <option value="Henna">Henna</option>
              <option value="Graduation">Graduation</option>
              <option value="Evening Event">Evening Event</option>
            </select>
          </div>

          <div class="col-md-4">
            <select class="form-select" id="occasion_order_type">
              <option value="sale">Custom Design / Sale</option>
              <option value="rental">Rental</option>
            </select>
          </div>

          <div class="col-md-4">
            <input type="date" class="form-control" id="occasion_date">
          </div>
        </div>

        <div class="mt-3">
          <textarea
            class="form-control"
            rows="3"
            placeholder="Write notes..."
            id="occasion_notes"
          ></textarea>
        </div>

        <div class="mt-3">
          <button class="btn btn-dark" onclick="submitOccasionRequest()">
            Submit Occasion Request
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMyOccasionRequests(requests) {
  if (!Array.isArray(requests) || !requests.length) {
    return `
      <div class="card card-luxe mb-4">
        <div class="card-body">
          <h4 class="mb-2">My Occasion Requests</h4>

          <div class="small-muted">
            No occasion requests yet.
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="card card-luxe mb-4">
      <div class="card-body">
        <h4 class="mb-3">My Occasion Requests</h4>

        <div class="table-responsive">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Occasion</th>
                <th>Event Date</th>
                <th>Order Type</th>
                <th>Status</th>
                <th>Admin Notes</th>
              </tr>
            </thead>

            <tbody>
              ${requests
      .map(
        (r) => `
                <tr>
                  <td>${escapeHtml(r.request_id)}</td>

                  <td>${escapeHtml(r.occasion_type || "-")}</td>

                  <td>${escapeHtml(formatDate(r.event_date))}</td>

                  <td>${escapeHtml(
          prettifyStatus(r.order_type || "-")
        )}</td>

                  <td>${statusBadge(r.status)}</td>

                  <td>${escapeHtml(r.admin_notes || "-")}</td>
                </tr>
              `
      )
      .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderOrderCard(order) {
  const dressDisplayName = getDressDisplayName(order);

  return `
    <div class="card card-luxe mb-4 overflow-hidden">
      <div class="card-body">
        <div class="row g-4">

          <div class="col-md-4">
            <img
              src="${escapeHtml(order.image_url || FALLBACK_IMAGE)}"
              alt="${escapeHtml(dressDisplayName)}"
              class="img-fluid rounded-4"
              style="
                width:100%;
                height:420px;
                object-fit:contain;
                background:#f8f5f3;
                padding:12px;
              "
              onerror="this.src='${FALLBACK_IMAGE}'"
            >
          </div>

          <div class="col-md-8">

            <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
              <div>
                <h3 class="mb-1">
                  Order #${escapeHtml(order.order_id)}
                  -
                  ${escapeHtml(dressDisplayName)}
                </h3>

                <div class="small-muted">
                  ${escapeHtml(order.occasion_type || "-")}
                  |
                  ${escapeHtml(order.order_type || "-")}
                </div>
              </div>

              <div>
                ${statusBadge(order.status)}
              </div>
            </div>

            ${renderProgressTimeline(order.status)}

            <div class="row g-3 mb-4">

              <div class="col-md-4">
                <div class="card border-0 bg-light rounded-4">
                  <div class="card-body">
                    <div class="small-muted">
                      Order Date
                    </div>

                    <strong>
                      ${formatDate(order.order_date)}
                    </strong>
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <div class="card border-0 bg-light rounded-4">
                  <div class="card-body">
                    <div class="small-muted">
                      Return Date
                    </div>

                    <strong>
                      ${formatDate(order.return_date)}
                    </strong>
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <div class="card border-0 bg-light rounded-4">
                  <div class="card-body">
                    <div class="small-muted">
                      Payment Status
                    </div>

                    <strong>
                      ${escapeHtml(
    prettifyStatus(order.payment_status)
  )}
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            ${renderAppointmentRequest(order)}

            ${renderAppointments(order.appointments)}

          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAppointmentRequest(order) {
  const status = normalizeStatus(order.status);

  if (
    status === "completed" ||
    status === "delivered" ||
    status === "cancelled"
  ) {
    return `
      <div class="mb-4">
        <h5 class="mb-3">Request Appointment</h5>

        <div class="alert alert-secondary rounded-4 mb-0">
          This order is completed,
          appointments can no longer be requested.
        </div>
      </div>
    `;
  }

  const hasPendingCustomerRequest =
    Array.isArray(order.appointments) &&
    order.appointments.some((appointment) => {
      return (
        normalizeStatus(appointment.status) === "pending" &&
        String(appointment.requested_by || "").toLowerCase() === "customer"
      );
    });

  if (hasPendingCustomerRequest) {
    return `
      <div class="mb-4">
        <h5 class="mb-3">Request Appointment</h5>

        <div class="alert alert-warning rounded-4 mb-0">
          You already have a pending appointment request.
          Please wait for atelier confirmation.
        </div>
      </div>
    `;
  }

  const orderType = String(order.order_type || "")
    .trim()
    .toLowerCase();

  let appointmentOptions = [];

  if (orderType === "sale") {
    appointmentOptions = [
      "Consultation",
      "Measurements",
      "Design Approval",
      "First Fitting",
      "Final Fitting",
      "Pickup",
    ];
  } else if (orderType === "rental") {
    appointmentOptions = [
      "Rental Consultation",
      "Fitting",
      "Pickup",
      "Return",
    ];
  } else {
    appointmentOptions = ["Consultation", "Fitting"];
  }

  return `
    <div class="mb-4">
      <h5 class="mb-3">Request Appointment</h5>

      <div class="card border-0 bg-light rounded-4">
        <div class="card-body">

          <div class="row g-3">

            <div class="col-md-4">
              <select
                class="form-select"
                id="request_type_${order.order_id}"
              >
                ${appointmentOptions
      .map(
        (option) => `
                  <option value="${escapeHtml(option)}">
                    ${escapeHtml(option)}
                  </option>
                `
      )
      .join("")}
              </select>
            </div>

            <div class="col-md-4">
              <input
                type="date"
                class="form-control"
                id="request_date_${order.order_id}"
              >
            </div>

            <div class="col-md-4">
              <input
                type="time"
                class="form-control"
                id="request_time_${order.order_id}"
              >
            </div>

          </div>

          <div class="mt-3">
            <textarea
              class="form-control"
              rows="3"
              placeholder="Notes..."
              id="request_notes_${order.order_id}"
            ></textarea>
          </div>

          <div class="mt-3">
            <button
              class="btn btn-dark"
              onclick="submitAppointmentRequest(${order.order_id})"
            >
              Submit Request
            </button>
          </div>

        </div>
      </div>
    </div>
  `;
}

function renderAppointments(appointments) {
  if (!appointments?.length) {
    return `
      <div class="mb-4">
        <h5>Appointments</h5>

        <div class="small-muted">
          No appointments yet.
        </div>
      </div>
    `;
  }

  return `
    <div class="mb-4">
      <h5>Appointments</h5>

      <div class="table-responsive">
        <table class="table table-sm">

          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${appointments
      .map(
        (a) => `
              <tr>
                <td>${formatDate(a.appointment_date)}</td>

                <td>${formatTime(a.appointment_time)}</td>

                <td>${escapeHtml(a.type || "-")}</td>

                <td>
                  ${escapeHtml(prettifyStatus(a.status || "-"))}
                </td>
              </tr>
            `
      )
      .join("")}
          </tbody>

        </table>
      </div>
    </div>
  `;
}

async function submitAppointmentRequest(orderId) {
  try {
    const type =
      document.getElementById(`request_type_${orderId}`)?.value;

    const appointment_date =
      document.getElementById(`request_date_${orderId}`)?.value;

    const appointment_time =
      document.getElementById(`request_time_${orderId}`)?.value;

    const notes =
      document.getElementById(`request_notes_${orderId}`)?.value;

    if (!appointment_date || !appointment_time) {
      alert("Please select appointment date and time.");
      return;
    }

    await fetchJson(`${API_BASE}/customer-appointment-request`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        customer_id: user.customer_id,
        order_id: orderId,
        appointment_date,
        appointment_time,
        type,
        notes,
      }),
    });

    alert("Appointment request submitted!");

    await loadDashboard();
  } catch (err) {
    alert(err.message || "Failed to submit request");
  }
}


async function submitOccasionRequest() {
  try {
    const occasion_type =
      document.getElementById("occasion_type")?.value;

    const order_type =
      document.getElementById("occasion_order_type")?.value;

    const event_date =
      document.getElementById("occasion_date")?.value;

    const notes =
      document.getElementById("occasion_notes")?.value;

    if (!occasion_type || !event_date || !order_type) {
      alert("Please fill all required fields.");
      return;
    }

    const existingRequests = await fetchJson(
      `${API_BASE}/customer-occasion-requests/${user.customer_id}`
    );

    const hasPendingSameDate = existingRequests.some((r) => {
      return (
        normalizeStatus(r.status) === "pending" &&
        formatDate(r.event_date) === event_date
      );
    });

    if (hasPendingSameDate) {
      alert("You already have a pending request on this date.");
      return;
    }

    await fetchJson(`${API_BASE}/customer-occasion-request`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        customer_id: user.customer_id,
        occasion_type,
        event_date,
        order_type,
        notes,
      }),
    });

    alert("Occasion request submitted successfully!");

    await loadDashboard();
  } catch (err) {
    alert(err.message || "Failed to submit request");
  }
}

window.submitAppointmentRequest = submitAppointmentRequest;
window.submitOccasionRequest = submitOccasionRequest;

loadDashboard();