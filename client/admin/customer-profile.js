const API_BASE =
  window.CONFIG?.API_BASE ||
  "http://localhost:4000/api";

const customerInfo =
  document.getElementById("customerInfo");

const ordersContainer =
  document.getElementById("ordersContainer");

const params =
  new URLSearchParams(window.location.search);

const customerId =
  params.get("id");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateOnly(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
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

function sourceLabel(value) {
  switch (value) {
    case "friend":
      return "Friend";

    case "instagram":
      return "Instagram";

    case "previous_experience":
      return "Previous Experience";

    case "other":
      return "Other";

    default:
      return "-";
  }
}

function experienceLabel(value) {
  switch (String(value || "")) {
    case "1":
      return "1 - Bad";

    case "2":
      return "2 - Fair";

    case "3":
      return "3 - Good";

    case "4":
      return "4 - Very Good";

    case "5":
      return "5 - Excellent";

    default:
      return "-";
  }
}

function paymentStatusBadge(status) {
  const s = String(status || "").toLowerCase();

  if (s === "paid") {
    return `<span class="badge bg-success">Paid</span>`;
  }

  if (s === "partial") {
    return `<span class="badge bg-warning text-dark">Partial</span>`;
  }

  return `<span class="badge bg-secondary">Unpaid</span>`;
}

async function fetchJson(url) {
  const res = await fetch(url);

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

function renderCustomer(customer) {
  const fullName =
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

  customerInfo.innerHTML = `
    <div class="row g-3">

      <div class="col-md-4">
        <div class="small-muted">Name</div>
        <div class="fw-semibold">
          ${escapeHtml(fullName || "-")}
        </div>
      </div>

      <div class="col-md-4">
        <div class="small-muted">Phone</div>
        <div>
          ${escapeHtml(customer.phone || "-")}
        </div>
      </div>

      <div class="col-md-4">
        <div class="small-muted">Email</div>
        <div>
          ${escapeHtml(customer.email || "-")}
        </div>
      </div>

      <div class="col-md-4">
        <div class="small-muted">City</div>
        <div>
          ${escapeHtml(customer.city || "-")}
        </div>
      </div>

      <div class="col-md-4">
        <div class="small-muted">Birth Date</div>
        <div>
          ${escapeHtml(dateOnly(customer.birth_date))}
        </div>
      </div>

      <div class="col-md-4">
        <div class="small-muted">How did she know us?</div>
        <div>
          ${escapeHtml(sourceLabel(customer.source_type))}
        </div>

        ${
          customer.source_details
            ? `
              <div class="small text-muted">
                ${escapeHtml(customer.source_details)}
              </div>
            `
            : ""
        }
      </div>

    </div>
  `;
}

function renderPayments(payments) {
  if (!payments || !payments.length) {
    return `
      <div class="small text-muted">
        No payments.
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          ${payments.map(p => `
            <tr>
              <td>${escapeHtml(p.payment_id)}</td>
              <td>${escapeHtml(dateOnly(p.payment_date))}</td>
              <td>${escapeHtml(money(p.amount))}</td>
              <td>${escapeHtml(text(p.payment_method))}</td>
              <td>${escapeHtml(text(p.payment_status))}</td>
              <td>${escapeHtml(text(p.notes))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAppointments(appointments) {
  if (!appointments || !appointments.length) {
    return `
      <div class="small text-muted">
        No appointments.
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>#</th>
            <th>Type</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          ${appointments.map(a => `
            <tr>
              <td>${escapeHtml(a.appointment_id)}</td>
              <td>${escapeHtml(text(a.appointment_type || a.type))}</td>
              <td>${escapeHtml(dateOnly(a.appointment_date))}</td>
              <td>${escapeHtml(text(a.appointment_time ? String(a.appointment_time).slice(0, 5) : ""))}</td>
              <td>${escapeHtml(text(a.status))}</td>
              <td>${escapeHtml(text(a.notes))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMeasurements(measurements) {
  if (!measurements || !measurements.length) {
    return `
      <div class="small text-muted">
        No measurements.
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>#</th>
            <th>Tailoring</th>
            <th>Bust</th>
            <th>Waist</th>
            <th>Hips</th>
            <th>Shoulder</th>
            <th>Sleeve</th>
            <th>Length</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          ${measurements.map(m => `
            <tr>
              <td>${escapeHtml(m.measurement_id)}</td>
              <td>${escapeHtml(text(m.tailoring_type))}</td>
              <td>${escapeHtml(text(m.bust))}</td>
              <td>${escapeHtml(text(m.waist))}</td>
              <td>${escapeHtml(text(m.hips))}</td>
              <td>${escapeHtml(text(m.shoulder))}</td>
              <td>${escapeHtml(text(m.sleeve_length))}</td>
              <td>${escapeHtml(text(m.dress_length))}</td>
              <td>${escapeHtml(text(m.notes))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSeamstresses(seamstresses) {
  if (!seamstresses || !seamstresses.length) {
    return `
      <div class="small text-muted">
        No seamstress assigned.
      </div>
    `;
  }

  return seamstresses.map(s => `
    <div>
      ${escapeHtml(s.seamstress_name || "-")}
      ${
        s.seamstress_phone
          ? `<span class="small text-muted">(${escapeHtml(s.seamstress_phone)})</span>`
          : ""
      }
    </div>
  `).join("");
}

function renderPreviousExperience(order) {
  if (!order.has_previous_experience) {
    return "No";
  }

  return `
    Yes
    ${
      order.previous_experience_type
        ? `<div class="small text-muted">Type: ${escapeHtml(order.previous_experience_type)}</div>`
        : ""
    }
    ${
      order.experience_rating
        ? `<div class="small text-muted">Rating: ${escapeHtml(experienceLabel(order.experience_rating))}</div>`
        : ""
    }
  `;
}

function renderOrders(orders) {
  if (!orders || !orders.length) {
    ordersContainer.innerHTML = `
      <div class="card card-luxe">
        <div class="card-body text-muted">
          This customer does not have any orders yet.
        </div>
      </div>
    `;
    return;
  }

  ordersContainer.innerHTML = orders.map((o) => `
    <div class="card card-luxe mb-4">

      <div class="card-header d-flex flex-column flex-md-row justify-content-between gap-2">

        <div>
          <strong>
            Occasion / Order #${escapeHtml(o.order_id)}
          </strong>

          <div class="small text-muted">
            ${escapeHtml(text(o.occasion_type))}
            |
            ${escapeHtml(text(o.order_type))}
            |
            ${escapeHtml(dateOnly(o.order_date))}
          </div>
        </div>

        <div>
          ${paymentStatusBadge(o.payment_status)}
        </div>

      </div>

      <div class="card-body">

        <div class="row g-3 mb-4">

          <div class="col-md-3">
            <div class="small-muted">Customer Type</div>
            <div>${escapeHtml(text(o.customer_type))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Dress</div>
            <div>${escapeHtml(o.dress_name || "Not assigned yet")}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Status</div>
            <div>${escapeHtml(text(o.status))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Total Price</div>
            <div>${escapeHtml(money(o.total_price))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Paid</div>
            <div>${escapeHtml(money(o.paid_amount))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Remaining</div>
            <div>${escapeHtml(money(o.remaining_amount))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Venue City</div>
            <div>${escapeHtml(text(o.venue_city))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Venue Hall</div>
            <div>${escapeHtml(text(o.venue_hall))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Return Date</div>
            <div>${escapeHtml(dateOnly(o.return_date))}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Previous Experience</div>
            <div>${renderPreviousExperience(o)}</div>
          </div>

          <div class="col-md-3">
            <div class="small-muted">Assigned Seamstress</div>
            <div>${renderSeamstresses(o.seamstresses)}</div>
          </div>

        </div>

        <hr>

        <h6>Appointments</h6>
        ${renderAppointments(o.appointments)}

        <hr>

        <h6>Measurements</h6>
        ${renderMeasurements(o.measurements)}

        <hr>

        <h6>Payments</h6>
        ${renderPayments(o.payments)}

      </div>
    </div>
  `).join("");
}

async function init() {
  if (!customerId) {
    customerInfo.innerHTML = `
      <div class="text-danger">
        Missing customer id.
      </div>
    `;
    return;
  }

  try {
    const data =
      await fetchJson(
        `${API_BASE}/admin/customer-profile/${encodeURIComponent(customerId)}`
      );

    renderCustomer(data.customer);
    renderOrders(data.orders);
  } catch (err) {
    customerInfo.innerHTML = `
      <div class="text-danger">
        ${escapeHtml(err.message)}
      </div>
    `;

    ordersContainer.innerHTML = "";
  }
}

init();