const API_BASE =
  window.CONFIG?.API_BASE ||
  "https://aseel-latelier.onrender.com/api";

const loadingBox = document.getElementById("loadingBox");
const reportsWrap = document.getElementById("reportsWrap");

const totalRevenueText = document.getElementById("totalRevenueText");
const paidRevenueText = document.getElementById("paidRevenueText");
const remainingRevenueText = document.getElementById("remainingRevenueText");
const totalAppointmentsText = document.getElementById("totalAppointmentsText");

const ordersAnalyticsBox = document.getElementById("ordersAnalyticsBox");
const appointmentsAnalyticsBox = document.getElementById("appointmentsAnalyticsBox");
const paymentStatusBox = document.getElementById("paymentStatusBox");
const seamstressWorkloadBox = document.getElementById("seamstressWorkloadBox");
const recentOrdersTbody = document.getElementById("recentOrdersTbody");
const printBtn = document.getElementById("printBtn");

function text(value) {
  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function percent(part, total) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function customerName(row) {
  return text(
    row.customer_name ||
    `${row.first_name || ""} ${row.last_name || ""}`.trim()
  );
}

function statusBadge(value) {
  const status = String(value || "-");

  let cls = "badge-soft";

  if (["paid", "completed", "Completed", "Completed"].includes(status)) {
    cls = "text-bg-success";
  }

  if (["partial", "Missed", "pending", "Pending"].includes(status)) {
    cls = "text-bg-warning";
  }

  if (["unpaid", "cancelled", "Cancelled"].includes(status)) {
    cls = "text-bg-danger";
  }

  return `
    <span class="${cls} px-3 py-2 rounded-pill">
      ${text(status)}
    </span>
  `;
}

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
}

function countBy(rows, getter) {
  const result = {};

  rows.forEach((row) => {
    const key = text(getter(row));

    result[key] = (result[key] || 0) + 1;
  });

  return result;
}

function renderMetricRows(data) {
  const entries = Object.entries(data);

  if (!entries.length) {
    return `<div class="text-muted">No data available.</div>`;
  }

  return entries.map(([label, count]) => `
    <div class="d-flex justify-content-between align-items-center border-bottom py-2">
      <span>${text(label)}</span>
      <strong>${count}</strong>
    </div>
  `).join("");
}

function renderOrdersAnalytics(orders) {
  const byType = countBy(orders, (o) =>
    o.order_type === "sale"
      ? "Custom Design"
      : o.order_type
  );

  const byOccasion = countBy(orders, (o) => o.occasion_type || "Not specified");

  const activeOrders =
    orders.filter((o) =>
      !["completed", "cancelled"].includes(String(o.status || "").toLowerCase())
    );

  ordersAnalyticsBox.innerHTML = `
    <div class="row g-4">
      <div class="col-md-6">
        <div class="small-muted mb-2">By Order Type</div>
        ${renderMetricRows(byType)}
      </div>

      <div class="col-md-6">
        <div class="small-muted mb-2">Top Occasions</div>
        ${renderMetricRows(byOccasion)}
      </div>

      <div class="col-12">
        <hr>
        <div class="d-flex justify-content-between">
          <span>Active Orders</span>
          <strong>${activeOrders.length} / ${orders.length}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderAppointmentsAnalytics(allAppointments) {
  const byStatus = countBy(allAppointments, (a) => a.status || "Unknown");
  const byType = countBy(allAppointments, (a) => a.appointment_type || "Unknown");

  appointmentsAnalyticsBox.innerHTML = `
    <div class="row g-4">
      <div class="col-md-6">
        <div class="small-muted mb-2">By Status</div>
        ${renderMetricRows(byStatus)}
      </div>

      <div class="col-md-6">
        <div class="small-muted mb-2">By Type</div>
        ${renderMetricRows(byType)}
      </div>
    </div>
  `;
}

function renderPaymentStatus(orders) {
  const byPayment = countBy(orders, (o) => o.payment_status || "unknown");

  const total = orders.length;

  paymentStatusBox.innerHTML =
    Object.entries(byPayment).map(([status, count]) => `
      <div class="border rounded-4 p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            ${statusBadge(status)}
          </div>

          <strong>${count} orders</strong>
        </div>

        <div class="small-muted mt-2">
          ${percent(count, total)} of all orders
        </div>
      </div>
    `).join("") ||
    `<div class="text-muted">No payment data available.</div>`;
}

function renderSeamstressWorkload(assignments) {
  if (!assignments.length) {
    seamstressWorkloadBox.innerHTML = `
      <div class="text-muted">
        No seamstress assignments yet.
      </div>
    `;
    return;
  }

  const bySeamstress = {};

  assignments.forEach((a) => {
    const name = text(a.name || "Unassigned");

    if (!bySeamstress[name]) {
      bySeamstress[name] = {
        total: 0,
        pending: 0,
        completed: 0,
      };
    }

    bySeamstress[name].total += 1;

    const status =
      String(a.assignment_status || "").toLowerCase();

    if (status.includes("complete") || status.includes("done")) {
      bySeamstress[name].completed += 1;
    } else {
      bySeamstress[name].pending += 1;
    }
  });

  seamstressWorkloadBox.innerHTML =
    Object.entries(bySeamstress).map(([name, stats]) => `
      <div class="border rounded-4 p-3 mb-3">
        <div class="d-flex justify-content-between gap-2 flex-wrap">
          <strong>${text(name)}</strong>
          <span class="badge-soft px-3 py-2 rounded-pill">
            ${stats.total} tasks
          </span>
        </div>

        <div class="small-muted mt-2">
          Pending: ${stats.pending} · Completed: ${stats.completed}
        </div>
      </div>
    `).join("");
}

function renderRecentOrders(orders) {
  if (!orders.length) {
    recentOrdersTbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          No orders found.
        </td>
      </tr>
    `;
    return;
  }

  recentOrdersTbody.innerHTML =
    orders.slice(0, 10).map((o) => `
      <tr>
        <td>
          <a href="order-details.html?order_id=${o.order_id}">
            #${o.order_id}
          </a>
        </td>

        <td>${customerName(o)}</td>

        <td>${text(o.occasion_type)}</td>

        <td>${o.order_type === "sale" ? "Custom Design" : text(o.order_type)}</td>

        <td>${money(o.total_price)}</td>

        <td>${money(o.paid_amount)}</td>

        <td>${statusBadge(o.payment_status)}</td>
      </tr>
    `).join("");
}

async function loadAllAppointments() {
  const statuses = [
    "Scheduled",
    "Completed",
    "Cancelled",
    "Missed",
  ];

  const results = await Promise.all(
    statuses.map((status) =>
      fetchJson(`${API_BASE}/appointments?status=${encodeURIComponent(status)}`)
        .catch(() => [])
    )
  );

  const unique = new Map();

  results.flat().forEach((a) => {
    unique.set(String(a.appointment_id), a);
  });

  return Array.from(unique.values());
}

async function loadAllAssignments() {
  try {
    return await fetchJson(`${API_BASE}/seamstresses/assignments`);
  } catch {
    return [];
  }
}

async function loadReports() {
  try {
    const [
      orders,
      appointments,
      assignments,
    ] = await Promise.all([
      fetchJson(`${API_BASE}/orders`),
      loadAllAppointments(),
      loadAllAssignments(),
    ]);

    const totalRevenue =
      orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);

    const paidRevenue =
      orders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);

    const remainingRevenue =
      Math.max(totalRevenue - paidRevenue, 0);

    totalRevenueText.textContent = money(totalRevenue);
    paidRevenueText.textContent = money(paidRevenue);
    remainingRevenueText.textContent = money(remainingRevenue);
    totalAppointmentsText.textContent = appointments.length;

    renderOrdersAnalytics(orders);
    renderAppointmentsAnalytics(appointments);
    renderPaymentStatus(orders);
    renderSeamstressWorkload(assignments);
    renderRecentOrders(orders);

    loadingBox.style.display = "none";
    reportsWrap.style.display = "";
  } catch (err) {
    loadingBox.className = "alert alert-danger";
    loadingBox.textContent = err.message;
  }
}

printBtn?.addEventListener("click", () => {
  window.print();
});

loadReports();


