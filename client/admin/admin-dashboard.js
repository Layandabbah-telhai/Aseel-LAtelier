const API_BASE =
    window.CONFIG?.API_BASE ||
    "https://aseel-latelier.onrender.com/api";

const loadingBox = document.getElementById("loadingBox");
const dashboardWrap = document.getElementById("dashboardWrap");

const todayAppointmentsCount = document.getElementById("todayAppointmentsCount");
const pendingRequestsCount = document.getElementById("pendingRequestsCount");
const activeOrdersCount = document.getElementById("activeOrdersCount");
const unpaidOrdersCount = document.getElementById("unpaidOrdersCount");

const todayAppointmentsBox = document.getElementById("todayAppointmentsBox");
const pendingRequestsBox = document.getElementById("pendingRequestsBox");
const recentOrdersTbody = document.getElementById("recentOrdersTbody");

const upcomingWeddingsCount =
    document.getElementById("upcomingWeddingsCount");

const currentlyRentedCount =
    document.getElementById("currentlyRentedCount");

const waitingPaymentCount =
    document.getElementById("waitingPaymentCount");

const completedTodayCount =
    document.getElementById("completedTodayCount");

function text(value) {
    return value === null || value === undefined || value === ""
        ? "-"
        : String(value);
}

function money(value) {
    return Number(value || 0).toFixed(2);
}

function todayString() {
    const now = new Date();

    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
}

function timeOnly(value) {
    if (!value) return "-";
    return String(value).slice(0, 5);
}

function statusBadge(value) {
    const status = String(value || "-");

    let cls = "badge-soft";

    if (status === "paid" || status === "completed" || status === "Completed") {
        cls = "text-bg-success";
    }

    if (status === "partial" || status === "Missed") {
        cls = "text-bg-warning";
    }

    if (status === "unpaid" || status === "cancelled" || status === "Cancelled") {
        cls = "text-bg-danger";
    }

    return `
    <span class="${cls} px-3 py-2 rounded-pill">
      ${text(status)}
    </span>
  `;
}

function customerName(row) {
    return text(
        row.customer_name ||
        `${row.first_name || ""} ${row.last_name || ""}`.trim()
    );
}

async function fetchJson(url) {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.message || data?.error || "Request failed");
    }

    return data;
}

function renderTodayAppointments(appointments) {
    if (!appointments.length) {
        todayAppointmentsBox.innerHTML = `
      <div class="text-muted">
        No appointments scheduled for today.
      </div>
    `;
        return;
    }

    todayAppointmentsBox.innerHTML =
        appointments.map((a) => `
      <div class="border rounded-4 p-3 mb-2">
        <div class="d-flex justify-content-between gap-2 flex-wrap">
          <strong>${timeOnly(a.appointment_time)} · ${text(a.appointment_type)}</strong>
          ${statusBadge(a.status)}
        </div>

        <div class="small-muted">
          ${customerName(a)} · ${text(a.phone)}
        </div>

        <div class="small-muted">
          Order: ${a.order_id ? `#${a.order_id}` : "-"} · Dress: ${text(a.dress_name)}
        </div>
      </div>
    `).join("");
}

function renderPendingRequests(requests) {
    if (!requests.length) {
        pendingRequestsBox.innerHTML = `
      <div class="text-muted">
        No pending customer requests.
      </div>
    `;
        return;
    }

    pendingRequestsBox.innerHTML =
        requests.slice(0, 5).map((r) => `
      <div class="border rounded-4 p-3 mb-2">
        <div class="d-flex justify-content-between gap-2 flex-wrap">
          <strong>${customerName(r)}</strong>
          <span class="badge-soft px-3 py-2 rounded-pill">Pending</span>
        </div>

        <div class="small-muted">
          ${text(r.occasion_type)} · ${text(r.customer_type)}
        </div>

        <div class="small-muted">
          ${text(r.order_type)} · ${text(r.phone)}
        </div>
      </div>
    `).join("");
}

function renderRecentOrders(orders) {
    if (!orders.length) {
        recentOrdersTbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No orders found.
        </td>
      </tr>
    `;
        return;
    }

    recentOrdersTbody.innerHTML =
        orders.slice(0, 8).map((o) => `
      <tr>
        <td>
          <a href="order-details.html?order_id=${o.order_id}">
            #${o.order_id}
          </a>
        </td>

        <td>${customerName(o)}</td>

        <td>${text(o.occasion_type)}</td>

        <td>${money(o.total_price)}</td>

        <td>${statusBadge(o.status)}</td>
      </tr>
    `).join("");
}

async function loadDashboard() {
    try {
        const today = todayString();

        const [
            todayAppointments,
            completedTodayAppointments,
            occasionRequests,
            orders,
        ] = await Promise.all([
            fetchJson(`${API_BASE}/appointments?date=${today}&status=Scheduled`),
            fetchJson(`${API_BASE}/appointments?date=${today}&status=Completed`),
            fetchJson(`${API_BASE}/occasion-requests`),
            fetchJson(`${API_BASE}/orders`),
        ]);

        const pendingRequests =
            occasionRequests.filter(
                (r) => String(r.status || "").toLowerCase() === "pending"
            );

        const activeOrders =
            orders.filter(
                (o) =>
                    !["completed", "cancelled"].includes(
                        String(o.status || "").toLowerCase()
                    )
            );

        const unpaidOrPartial =
            orders.filter(
                (o) =>
                    ["unpaid", "partial"].includes(
                        String(o.payment_status || "").toLowerCase()
                    )
            );

        const upcomingWeddings =
            orders.filter((o) => {
                const rawDate =
                    o.event_date ||
                    o.occasion_date ||
                    o.order_date ||
                    o.return_date;

                if (!rawDate) return false;

                const eventDate =
                    new Date(String(rawDate).slice(0, 10));

                const now = new Date();

                const diff =
                    eventDate - now;

                const days =
                    diff / (1000 * 60 * 60 * 24);

                return days >= 0 && days <= 30;
            });
        const rentedDresses =
            orders.filter((o) =>
                String(o.order_type || "")
                    .toLowerCase()
                    .includes("rental")
            );

        const completedToday = completedTodayAppointments;

        todayAppointmentsCount.textContent =
            todayAppointments.length;

        pendingRequestsCount.textContent =
            pendingRequests.length;

        activeOrdersCount.textContent =
            activeOrders.length;

        unpaidOrdersCount.textContent =
            unpaidOrPartial.length;

        upcomingWeddingsCount.textContent =
            upcomingWeddings.length;

        currentlyRentedCount.textContent =
            rentedDresses.length;

        waitingPaymentCount.textContent =
            unpaidOrPartial.length;

        completedTodayCount.textContent =
            completedToday.length;

        renderTodayAppointments(todayAppointments);
        renderPendingRequests(pendingRequests);
        renderRecentOrders(orders);

        loadingBox.style.display = "none";
        dashboardWrap.style.display = "";

    } catch (err) {
        loadingBox.className = "alert alert-danger";
        loadingBox.textContent = err.message;
    }
}

loadDashboard();
