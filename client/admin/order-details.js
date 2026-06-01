const API_BASE =
    window.CONFIG?.API_BASE ||
    "https://aseel-latelier.onrender.com/api";

const params = new URLSearchParams(window.location.search);
const orderId = params.get("order_id");

const loadingBox = document.getElementById("loadingBox");
const detailsWrap = document.getElementById("detailsWrap");

const orderIdText = document.getElementById("orderIdText");
const statusText = document.getElementById("statusText");
const totalText = document.getElementById("totalText");
const paidText = document.getElementById("paidText");
const paymentStatusText = document.getElementById("paymentStatusText");
const remainingText = document.getElementById("remainingText");
const typeText = document.getElementById("typeText");
const occasionText = document.getElementById("occasionText");
const customerTypeText = document.getElementById("customerTypeText");
const orderDateText = document.getElementById("orderDateText");
const returnDateText = document.getElementById("returnDateText");
const venueText = document.getElementById("venueText");

const customerBox = document.getElementById("customerBox");
const dressBox = document.getElementById("dressBox");

const paymentsTbody = document.getElementById("paymentsTbody");
const measurementsTbody = document.getElementById("measurementsTbody");
const appointmentsTbody = document.getElementById("appointmentsTbody");
const assignmentsTbody = document.getElementById("assignmentsTbody");

const editOrderBtn = document.getElementById("editOrderBtn");
const editCustomerBtn = document.getElementById("editCustomerBtn");
const editDressBtn = document.getElementById("editDressBtn");
const managePaymentsBtn = document.getElementById("managePaymentsBtn");
const manageMeasurementsBtn = document.getElementById("manageMeasurementsBtn");
const manageAppointmentsBtn = document.getElementById("manageAppointmentsBtn");
const manageAssignmentsBtn = document.getElementById("manageAssignmentsBtn");

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

async function fetchJson(url) {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || data?.error || "Request failed");
    }

    return data;
}

function renderPayments(payments) {
    if (!payments.length) {
        paymentsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          No payments
        </td>
      </tr>
    `;
        return;
    }

    paymentsTbody.innerHTML =
        payments.map((p) => `
      <tr>
        <td>${dateOnly(p.payment_date)}</td>
        <td>${money(p.amount)}</td>
        <td>${text(p.payment_method)}</td>
        <td>${text(p.payment_status)}</td>
      </tr>
    `).join("");
}

function renderMeasurements(measurements) {
    if (!measurements.length) {
        measurementsTbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          No measurements
        </td>
      </tr>
    `;
        return;
    }

    measurementsTbody.innerHTML =
        measurements.map((m) => `
      <tr>
        <td>${text(m.tailoring_type)}</td>
        <td>${text(m.height)}</td>
        <td>${text(m.weight)}</td>
        <td>${text(m.bust)}</td>
        <td>${text(m.waist)}</td>
        <td>${text(m.hip)}</td>
      </tr>
    `).join("");
}

function renderAppointments(appointments) {
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
        appointments.map((a) => `
      <tr>
        <td>${dateOnly(a.appointment_date)}</td>
        <td>${text(a.appointment_time)}</td>
        <td>${text(a.appointment_type)}</td>
        <td>${text(a.status)}</td>
      </tr>
    `).join("");
}

function renderAssignments(assignments) {
    if (!assignments.length) {
        assignmentsTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          No assignments
        </td>
      </tr>
    `;
        return;
    }

    assignmentsTbody.innerHTML =
        assignments.map((a) => `
      <tr>
        <td>${text(a.name)}</td>
        <td>${text(a.task_type)}</td>
        <td>${text(a.assignment_status)}</td>
        <td>${dateOnly(a.due_date)}</td>
      </tr>
    `).join("");
}

function setupNavigationButtons() {
    editOrderBtn.onclick = () => {
        window.location.href = `orders.html?edit_order_id=${currentOrder.order_id}`;
    };

    editCustomerBtn.onclick = () => {
        window.location.href = `customers.html?edit_customer_id=${currentOrder.customer_id}`;
    };

    editDressBtn.onclick = () => {
        window.location.href = `dresses.html?edit_dress_id=${currentOrder.dress_id}`;
    };

    managePaymentsBtn.onclick = () => {
        window.location.href = `payments.html?order_id=${currentOrder.order_id}`;
    };

    manageMeasurementsBtn.onclick = () => {
        window.location.href = `measurements.html?order_id=${currentOrder.order_id}`;
    };

    manageAppointmentsBtn.onclick = () => {
        window.location.href = `appointments.html?order_id=${currentOrder.order_id}`;
    };

    manageAssignmentsBtn.onclick = () => {
        window.location.href = `seamstresses.html?order_id=${currentOrder.order_id}`;
    };
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
            assignments
        ] = await Promise.all([
            fetchJson(`${API_BASE}/orders/${orderId}`),
            fetchJson(`${API_BASE}/orders/${orderId}/payments`),
            fetchJson(`${API_BASE}/customers`),
            fetchJson(`${API_BASE}/dresses`),
            fetchJson(`${API_BASE}/measurements?order_id=${orderId}`),
            fetchJson(`${API_BASE}/appointments?order_id=${orderId}`),
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

        orderIdText.textContent = text(order.order_id);
        statusText.textContent = text(order.status);
        totalText.textContent = money(total);
        paidText.textContent = money(paid);
        paymentStatusText.textContent = text(order.payment_status);
        remainingText.textContent = money(remaining);
        typeText.textContent = text(order.order_type);
        occasionText.textContent = text(order.occasion_type);
        customerTypeText.textContent = text(order.customer_type);
        orderDateText.textContent = dateOnly(order.order_date);
        returnDateText.textContent = dateOnly(order.return_date);

        venueText.textContent =
            [order.venue_city, order.venue_hall]
                .filter(Boolean)
                .join(" - ") || "-";

        customerBox.innerHTML = `
      <div class="row g-3">
        <div class="col-md-4">
          <strong>Name:</strong>
          <div>${text(`${currentCustomer?.first_name || ""} ${currentCustomer?.last_name || ""}`.trim())}</div>
        </div>

        <div class="col-md-4">
          <strong>Phone:</strong>
          <div>${text(currentCustomer?.phone)}</div>
        </div>

        <div class="col-md-4">
          <strong>Email:</strong>
          <div>${text(currentCustomer?.email)}</div>
        </div>

        <div class="col-md-4">
          <strong>Customer ID:</strong>
          <div>${text(order.customer_id)}</div>
        </div>
      </div>
    `;

        dressBox.innerHTML = `
      <div class="row g-3">
        <div class="col-md-4">
          <strong>Dress:</strong>
          <div>${text(currentDress?.dress_name)}</div>
        </div>

        <div class="col-md-4">
          <strong>Color:</strong>
          <div>${text(currentDress?.color)}</div>
        </div>

        <div class="col-md-4">
          <strong>Size:</strong>
          <div>${text(currentDress?.size)}</div>
        </div>

        <div class="col-md-4">
          <strong>Dress ID:</strong>
          <div>${text(order.dress_id)}</div>
        </div>
      </div>
    `;

        renderPayments(payments);
        renderMeasurements(measurements);
        renderAppointments(appointments);
        renderAssignments(assignments);

        setupNavigationButtons();

        loadingBox.style.display = "none";
        detailsWrap.style.display = "";

    } catch (err) {
        loadingBox.className = "alert alert-danger";
        loadingBox.textContent = err.message;
    }
}

loadOrder();