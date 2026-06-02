const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";
const FALLBACK_IMAGE = "../shared/dark_logo.jpeg";

const token = localStorage.getItem("aseel_token");
const userRaw = localStorage.getItem("aseel_user");

if (!token || !userRaw) {
  window.location.href = "../login.html";
}

const user = JSON.parse(userRaw || "{}");

if (user.role !== "customer") {
  window.location.href = "../admin/admin-dashboard.html";
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
  const normalized = normalizeStatus(status);

  let cls = "badge-soft";

  if (
    normalized === "paid" ||
    normalized === "completed" ||
    normalized === "accepted" ||
    normalized === "ready" ||
    normalized === "delivered"
  ) {
    cls = "text-bg-success";
  }

  if (
    normalized === "partial" ||
    normalized === "pending" ||
    normalized === "missed" ||
    normalized === "in_progress" ||
    normalized === "sewing"
  ) {
    cls = "text-bg-warning";
  }

  if (
    normalized === "unpaid" ||
    normalized === "cancelled" ||
    normalized === "rejected"
  ) {
    cls = "text-bg-danger";
  }

  return `
    <span class="${cls} px-3 py-2 rounded-pill">
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
      <div class="alert alert-danger rounded-4 mb-0">
        This order was cancelled.
      </div>
    `;
  }

  return `
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
  `;
}

function getNextAppointment(orders) {
  const allAppointments =
    orders.flatMap((order) =>
      (order.appointments || []).map((appointment) => ({
        ...appointment,
        _order_id: order.order_id,
      }))
    );

  const now = new Date();

  return allAppointments
    .filter((appointment) => {
      const status = normalizeStatus(appointment.status);

      if (
        status === "completed" ||
        status === "cancelled" ||
        status === "missed"
      ) {
        return false;
      }

      const date = formatDate(appointment.appointment_date);

      if (date === "-") return false;

      const time =
        formatTime(appointment.appointment_time) === "-"
          ? "23:59"
          : formatTime(appointment.appointment_time);

      return new Date(`${date}T${time}`) >= now;
    })
    .sort((a, b) => {
      const aKey = `${formatDate(a.appointment_date)} ${formatTime(
        a.appointment_time
      )}`;
      const bKey = `${formatDate(b.appointment_date)} ${formatTime(
        b.appointment_time
      )}`;

      return aKey.localeCompare(bKey);
    })[0] || null;
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

  const pendingRequests = occasionRequests.filter(
    (request) => normalizeStatus(request.status) === "pending"
  );

  const nextAppointment = getNextAppointment(orders);

  const activeOrders = orders.filter(
    (order) =>
      !["completed", "cancelled"].includes(normalizeStatus(order.status))
  );

  const totalRemaining =
    orders.reduce((sum, order) => {
      const total = Number(order.total_price || 0);
      const paid = Number(order.paid_amount || 0);

      return sum + Math.max(total - paid, 0);
    }, 0);

  dashboardContent.innerHTML = `
    ${renderCustomerHeader(customer)}

    ${renderSummaryCards({
    orders,
    activeOrders,
    pendingRequests,
    nextAppointment,
    totalRemaining,
  })}

    ${renderRequestPanel()}

    ${renderMyOccasionRequests(occasionRequests)}

    ${orders.length
      ? `
        <div class="mb-3">
          <h3 class="mb-1">My Orders</h3>
          <p class="small-muted mb-0">
            Follow your dress process, payments, and appointments.
          </p>
        </div>

        ${orders.map(renderOrderCard).join("")}
      `
      : `
        <div class="card card-luxe">
          <div class="card-body text-center small-muted">
            You do not have any orders yet.
          </div>
        </div>
      `
    }
  `;

  bindOccasionExperienceToggle();
}

function renderCustomerHeader(customer) {
  return `
    <div class="card card-luxe mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div class="small-muted mb-1">
              Welcome back
            </div>

            <h2 class="mb-2">
              ${escapeHtml(customer.first_name || "")}
              ${escapeHtml(customer.last_name || "")}
            </h2>

            <div class="small-muted">
              ${escapeHtml(customer.email || "-")}
              ${customer.phone ? ` · ${escapeHtml(customer.phone)}` : ""}
              ${customer.city ? ` · ${escapeHtml(customer.city)}` : ""}
            </div>
          </div>

          <button
            class="btn btn-primary"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#occasionRequestCollapse"
          >
            + New Occasion Request
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSummaryCards({
  orders,
  activeOrders,
  pendingRequests,
  nextAppointment,
  totalRemaining,
}) {
  return `
    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card card-luxe h-100">
          <div class="card-body">
            <div class="small-muted">Orders</div>
            <h2 class="mb-0">${orders.length}</h2>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card card-luxe h-100">
          <div class="card-body">
            <div class="small-muted">Active Orders</div>
            <h2 class="mb-0">${activeOrders.length}</h2>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card card-luxe h-100">
          <div class="card-body">
            <div class="small-muted">Pending Requests</div>
            <h2 class="mb-0">${pendingRequests.length}</h2>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card card-luxe h-100">
          <div class="card-body">
            <div class="small-muted">Remaining Balance</div>
            <h2 class="mb-0">${formatMoney(totalRemaining)}</h2>
          </div>
        </div>
      </div>
    </div>

    <div class="card card-luxe mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
          <div>
            <div class="small-muted mb-1">
              Next Appointment
            </div>

            ${nextAppointment
      ? `
                  <h4 class="mb-1">
                    ${escapeHtml(formatDate(nextAppointment.appointment_date))}
                    ·
                    ${escapeHtml(formatTime(nextAppointment.appointment_time))}
                  </h4>

                  <div class="small-muted">
                    ${escapeHtml(
        nextAppointment.appointment_type ||
        nextAppointment.type ||
        "-"
      )}
                    · Order #${escapeHtml(nextAppointment._order_id)}
                  </div>
                `
      : `
                  <h4 class="mb-1">No upcoming appointment</h4>

                  <div class="small-muted">
                    The designer will schedule appointments once needed.
                  </div>
                `
    }
          </div>

          ${nextAppointment ? statusBadge(nextAppointment.status) : ""}
        </div>
      </div>
    </div>
  `;
}

function renderRequestPanel() {
  return `
    <div class="collapse mb-4" id="occasionRequestCollapse">
      ${renderNewOccasionRequest()}
    </div>
  `;
}

function renderNewOccasionRequest() {
  return `
    <div class="card card-luxe">
      <div class="card-header">
        Request New Occasion
      </div>

      <div class="card-body">
        <div class="row g-3">

          <div class="col-md-4">
            <label class="label-soft">Occasion Type</label>
            <select class="form-select" id="occasion_type">
              <option value="Wedding">Wedding</option>
              <option value="Engagement Party">Engagement Party</option>
              <option value="Contract">Contract</option>
              <option value="Fatiha">Fatiha</option>
              <option value="Henna">Henna</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="col-md-4">
            <label class="label-soft">Request Type</label>
            <select class="form-select" id="occasion_order_type">
              <option value="sale">Custom Design - request first appointment</option>
              <option value="rental">Rental - request fitting appointment</option>
            </select>
          </div>

          <div class="col-md-4">
            <label class="label-soft">Occasion Date</label>
            <input type="date" class="form-control" id="occasion_date">
          </div>

          <div class="col-md-6">
            <label class="label-soft">Venue City</label>
            <input
              id="occasion_venue_city"
              class="form-control"
              placeholder="City"
            >
          </div>

          <div class="col-md-6">
            <label class="label-soft">Venue Hall</label>
            <input
              id="occasion_venue_hall"
              class="form-control"
              placeholder="Hall name"
            >
          </div>

          <div class="col-md-6">
            <label class="label-soft">Customer Type</label>
            <select class="form-select" id="occasion_customer_type">
              <option value="">Select customer type</option>
              <option value="Bride">Bride</option>
              <option value="Bride / Groom Sister">Bride / Groom Sister</option>
              <option value="Bride / Groom Mother">Bride / Groom Mother</option>
              <option value="Bridesmaid">Bridesmaid</option>
              <option value="Friend">Friend</option>
              <option value="Guest">Guest</option>
            </select>
          </div>

          <div class="col-md-6">
            <label class="label-soft">Previous Experience?</label>
            <select class="form-select" id="occasion_has_previous_experience">
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>

          <div class="col-md-6" id="occasion_experience_type_wrap" style="display:none;">
            <label class="label-soft">Previous Experience Type</label>
            <select class="form-select" id="occasion_previous_experience_type">
              <option value="">Select type</option>
              <option value="design">Design</option>
              <option value="rental">Rental</option>
            </select>
          </div>

          <div class="col-md-6" id="occasion_experience_rating_wrap" style="display:none;">
            <label class="label-soft">Experience Rating</label>
            <select class="form-select" id="occasion_experience_rating">
              <option value="">Select rating</option>
              <option value="1">1 - Not Satisfied</option>
              <option value="2">2 - Fair</option>
              <option value="3">3 - Good</option>
              <option value="4">4 - Very Good</option>
              <option value="5">5 - Excellent</option>
            </select>
          </div>

        </div>

        <div class="mt-3">
          <label class="label-soft">Notes</label>
          <textarea
            class="form-control"
            rows="3"
            placeholder="Write notes..."
            id="occasion_notes"
            style="height:auto !important;"
          ></textarea>
        </div>

        <div class="mt-3 d-flex gap-2 flex-wrap">
          <button class="btn btn-primary" onclick="submitOccasionRequest()">
            Submit Occasion Request
          </button>

          <button
            class="btn btn-outline-secondary"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#occasionRequestCollapse"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindOccasionExperienceToggle() {
  const hasExperienceSelect =
    document.getElementById("occasion_has_previous_experience");

  const typeWrap =
    document.getElementById("occasion_experience_type_wrap");

  const ratingWrap =
    document.getElementById("occasion_experience_rating_wrap");

  const typeInput =
    document.getElementById("occasion_previous_experience_type");

  const ratingInput =
    document.getElementById("occasion_experience_rating");

  function toggle() {
    const hasExperience =
      hasExperienceSelect?.value === "1";

    if (typeWrap) {
      typeWrap.style.display = hasExperience ? "" : "none";
    }

    if (ratingWrap) {
      ratingWrap.style.display = hasExperience ? "" : "none";
    }

    if (!hasExperience) {
      if (typeInput) typeInput.value = "";
      if (ratingInput) ratingInput.value = "";
    }
  }

  hasExperienceSelect?.addEventListener("change", toggle);

  toggle();
}

function renderMyOccasionRequests(requests) {
  if (!Array.isArray(requests) || !requests.length) {
    return `
      <div class="card card-luxe mb-4">
        <div class="card-header">
          My Occasion Requests
        </div>

        <div class="card-body">
          <div class="small-muted">
            No occasion requests yet.
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="card card-luxe mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>My Occasion Requests</span>
        <span class="badge-soft px-3 py-2 rounded-pill">
          ${requests.length}
        </span>
      </div>

      <div class="card-body">
        <div class="row g-3">
          ${requests
      .slice(0, 6)
      .map(
        (r) => `
                <div class="col-md-6 col-xl-4">
                  <div class="border rounded-4 p-3 h-100">
                    <div class="d-flex justify-content-between gap-2 mb-2">
                      <strong>${escapeHtml(r.occasion_type || "-")}</strong>
                      ${statusBadge(r.status)}
                    </div>

                    <div class="small-muted">
                      Date: ${escapeHtml(formatDate(r.event_date))}
                    </div>

                    <div class="small-muted">
                      Type: ${escapeHtml(prettifyStatus(r.order_type || "-"))}
                    </div>

                    <div class="small-muted">
                      Venue:
                      ${escapeHtml(r.venue_city || "-")}
                      ${r.venue_hall ? `· ${escapeHtml(r.venue_hall)}` : ""}
                    </div>

                    ${r.admin_notes
            ? `
                          <div class="small-muted mt-2">
                            Admin notes: ${escapeHtml(r.admin_notes)}
                          </div>
                        `
            : ""
          }
                  </div>
                </div>
              `
      )
      .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderOrderCard(order) {
  const dressDisplayName = getDressDisplayName(order);

  const imageSrc =
    order.image_url &&
      order.dress_name &&
      order.dress_name !== "Not assigned yet"
      ? order.image_url
      : FALLBACK_IMAGE;

  const remaining =
    Math.max(
      Number(order.total_price || 0) -
      Number(order.paid_amount || 0),
      0
    );

  return `
    <div class="card card-luxe mb-4 overflow-hidden">
      <div class="card-body">
        <div class="row g-4">

          <div class="col-lg-4">
            <img
              src="${escapeHtml(imageSrc)}"
              alt="${escapeHtml(dressDisplayName)}"
              class="img-fluid rounded-4"
              style="
                width:100%;
                height:360px;
                object-fit:contain;
                background:#f8f5f3;
                padding:12px;
              "
              onerror="this.src='${FALLBACK_IMAGE}'"
            >
          </div>

          <div class="col-lg-8">

            <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
              <div>
                <h3 class="mb-1">
                  Order #${escapeHtml(order.order_id)}
                  -
                  ${escapeHtml(dressDisplayName)}
                </h3>

                <div class="small-muted">
                  ${escapeHtml(order.occasion_type || "-")}
                  ·
                  ${escapeHtml(
    order.order_type === "sale"
      ? "Custom Design"
      : prettifyStatus(order.order_type || "-")
  )}
                </div>
              </div>

              <div>
                ${statusBadge(order.status)}
              </div>
            </div>

            <div class="mb-4">
              <h5>Dress Progress</h5>
              ${renderProgressTimeline(order.status)}
            </div>

            <div class="row g-3 mb-4">

              <div class="col-md-3">
                <div class="card border-0 bg-light rounded-4 h-100">
                  <div class="card-body">
                    <div class="small-muted">Order Date</div>
                    <strong>${formatDate(order.order_date)}</strong>
                  </div>
                </div>
              </div>

              <div class="col-md-3">
                <div class="card border-0 bg-light rounded-4 h-100">
                  <div class="card-body">
                    <div class="small-muted">Return Date</div>
                    <strong>${formatDate(order.return_date)}</strong>
                  </div>
                </div>
              </div>

              <div class="col-md-3">
                <div class="card border-0 bg-light rounded-4 h-100">
                  <div class="card-body">
                    <div class="small-muted">Paid</div>
                    <strong>${formatMoney(order.paid_amount)}</strong>
                  </div>
                </div>
              </div>

              <div class="col-md-3">
                <div class="card border-0 bg-light rounded-4 h-100">
                  <div class="card-body">
                    <div class="small-muted">Remaining</div>
                    <strong>${formatMoney(remaining)}</strong>
                  </div>
                </div>
              </div>

            </div>

            ${renderAppointments(order.appointments)}

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
          The designer will schedule appointments for this order.
        </div>
      </div>
    `;
  }

  return `
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
        <h5 class="mb-0">Appointments</h5>
        <span class="badge-soft px-3 py-2 rounded-pill">
          ${appointments.length}
        </span>
      </div>

      <div class="row g-3">
        ${appointments
      .map(
        (a) => `
              <div class="col-md-6">
                <div class="border rounded-4 p-3 h-100">
                  <div class="d-flex justify-content-between gap-2 mb-2">
                    <strong>
                      ${formatDate(a.appointment_date)}
                      ·
                      ${formatTime(a.appointment_time)}
                    </strong>

                    ${statusBadge(a.status)}
                  </div>

                  <div class="small-muted mb-2">
                    ${escapeHtml(a.type || a.appointment_type || "-")}
                  </div>

                  ${renderChangeRequestButton(a)}
                </div>
              </div>
            `
      )
      .join("")}
      </div>
    </div>
  `;
}

function renderChangeRequestButton(appointment) {
  const status = normalizeStatus(appointment.status);

  if (
    status === "completed" ||
    status === "cancelled" ||
    status === "missed"
  ) {
    return `
      <span class="small-muted">
        Change not available
      </span>
    `;
  }

  return `
    <button
      class="btn btn-sm btn-outline-secondary"
      onclick="openChangeRequestForm(${Number(appointment.appointment_id)})"
    >
      Request Change
    </button>

    <div
      id="change_request_form_${appointment.appointment_id}"
      class="mt-3"
      style="display:none;"
    >
      <div class="row g-2">

        <div class="col-md-4">
          <input
            type="date"
            class="form-control form-control-sm"
            id="change_date_${appointment.appointment_id}"
          >
        </div>

        <div class="col-md-4">
          <input
            type="time"
            class="form-control form-control-sm"
            id="change_time_${appointment.appointment_id}"
          >
        </div>

        <div class="col-md-4">
          <button
            class="btn btn-sm btn-primary w-100"
            onclick="submitAppointmentChangeRequest(${Number(appointment.appointment_id)}, ${Number(appointment.order_id)})"
          >
            Submit
          </button>
        </div>

      </div>

      <div class="mt-2">
        <textarea
          class="form-control form-control-sm"
          rows="2"
          placeholder="Reason / notes..."
          id="change_reason_${appointment.appointment_id}"
          style="height:auto !important;"
        ></textarea>
      </div>
    </div>
  `;
}

function openChangeRequestForm(appointmentId) {
  const form =
    document.getElementById(`change_request_form_${appointmentId}`);

  if (!form) return;

  form.style.display =
    form.style.display === "none"
      ? ""
      : "none";
}

async function submitAppointmentChangeRequest(appointmentId, orderId) {
  try {
    const requested_date =
      document.getElementById(`change_date_${appointmentId}`)?.value;

    const requested_time =
      document.getElementById(`change_time_${appointmentId}`)?.value;

    const reason =
      document.getElementById(`change_reason_${appointmentId}`)?.value;

    if (!requested_date || !requested_time) {
      alert("Please choose requested date and time.");
      return;
    }

    await fetchJson(`${API_BASE}/appointments/change-requests`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        appointment_id: appointmentId,
        customer_id: user.customer_id,
        order_id: orderId,
        requested_date,
        requested_time,
        reason,
      }),
    });

    alert("Change request submitted successfully!");

    await loadDashboard();
  } catch (err) {
    alert(err.message || "Failed to submit change request");
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

    const venue_city =
      document.getElementById("occasion_venue_city")?.value;

    const venue_hall =
      document.getElementById("occasion_venue_hall")?.value;

    const customer_type =
      document.getElementById("occasion_customer_type")?.value;

    const has_previous_experience =
      document.getElementById("occasion_has_previous_experience")?.value === "1";

    const previous_experience_type =
      document.getElementById("occasion_previous_experience_type")?.value;

    const experience_rating =
      document.getElementById("occasion_experience_rating")?.value;

    const notes =
      document.getElementById("occasion_notes")?.value;

    if (!occasion_type || !event_date || !order_type) {
      alert("Please fill occasion type, date, and request type.");
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

        venue_city,
        venue_hall,
        customer_type,
        has_previous_experience,
        previous_experience_type: has_previous_experience
          ? previous_experience_type
          : null,
        experience_rating: has_previous_experience && experience_rating
          ? Number(experience_rating)
          : null,
      }),
    });

    alert("Occasion request submitted successfully!");

    await loadDashboard();
  } catch (err) {
    alert(err.message || "Failed to submit request");
  }
}

window.submitOccasionRequest = submitOccasionRequest;
window.openChangeRequestForm = openChangeRequestForm;
window.submitAppointmentChangeRequest = submitAppointmentChangeRequest;

loadDashboard();