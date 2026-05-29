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
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const appointmentsTbody =
  document.getElementById("appointmentsTbody");

const appointmentsCount =
  document.getElementById("appointmentsCount");

let customers = [];
let orders = [];
let appointments = [];

/*
IMPORTANT:
Do NOT use:
new Date(value).toISOString()

because timezone shifts
the date one day backward.
*/
function dateOnly(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return "";
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

  const data = await res
    .json()
    .catch(() => null);

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
  customers = await fetchJson(
    `${API_BASE}/customers`
  );

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

async function loadOrders() {
  orders = await fetchJson(
    `${API_BASE}/orders`
  );

  orderSelect.innerHTML =
    `<option value="">No order</option>` +
    orders
      .map((o) => {
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
      })
      .join("");
}

async function loadAppointments() {
  const params = new URLSearchParams();

  if (searchInput.value.trim()) {
    params.set(
      "search",
      searchInput.value.trim()
    );
  }

  if (statusFilter.value) {
    params.set(
      "status",
      statusFilter.value
    );
  }

  const url = params.toString()
    ? `${ENDPOINT}?${params.toString()}`
    : ENDPOINT;

  appointments = await fetchJson(url);

  renderAppointments();
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
    appointments
      .map((a) => `
        <tr>
          <td>${a.appointment_id}</td>

          <td>
            ${text(
              a.customer_name ||
              `${a.first_name || ""} ${a.last_name || ""}`.trim()
            )}
          </td>

          <td>${text(a.phone)}</td>

          <td>
            ${a.order_id
              ? `#${a.order_id}`
              : "-"}
          </td>

          <td>${text(a.dress_name)}</td>

          <td>
            ${text(
              a.appointment_type ||
              a.type
            )}
          </td>

          <td>
            ${dateOnly(
              a.appointment_date
            )}
          </td>

          <td>
            ${text(
              a.appointment_time
                ? String(a.appointment_time).slice(0, 5)
                : ""
            )}
          </td>

          <td>${text(a.status)}</td>

          <td>${text(a.notes)}</td>

          <td>
            <button
              class="btn btn-sm btn-outline-primary me-1"
              onclick="editAppointment(${a.appointment_id})"
            >
              Edit
            </button>

            <button
              class="btn btn-sm btn-outline-danger"
              onclick="deleteAppointment(${a.appointment_id})"
            >
              Delete
            </button>
          </td>
        </tr>
      `)
      .join("");
}

function clearForm() {
  appointmentIdInput.value = "";

  appointmentForm.reset();

  appointmentDateInput.value =
    dateOnly(
      new Date().toISOString()
    );

  statusInput.value = "Scheduled";

  appointmentTypeInput.value =
    "Consultation";
}

window.editAppointment = function (id) {
  const appointment =
    appointments.find(
      (a) =>
        Number(a.appointment_id) ===
        Number(id)
    );

  if (!appointment) return;

  appointmentIdInput.value =
    appointment.appointment_id;

  customerSelect.value =
    appointment.customer_id || "";

  orderSelect.value =
    appointment.order_id || "";

  appointmentTypeInput.value =
    appointment.appointment_type ||
    appointment.type ||
    "Consultation";

  appointmentDateInput.value =
    dateOnly(
      appointment.appointment_date
    );

  appointmentTimeInput.value =
    appointment.appointment_time
      ? String(
          appointment.appointment_time
        ).slice(0, 5)
      : "";

  statusInput.value =
    appointment.status ||
    "Scheduled";

  notesInput.value =
    appointment.notes || "";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

window.deleteAppointment =
  async function (id) {

  if (
    !confirm(
      "Delete this appointment?"
    )
  ) {
    return;
  }

  try {
    await fetchJson(
      `${ENDPOINT}/${id}`,
      {
        method: "DELETE"
      }
    );

    await loadAppointments();

  } catch (err) {
    alert(err.message);
  }
};

appointmentForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    const payload = {
      customer_id:
        Number(customerSelect.value),

      order_id:
        orderSelect.value
          ? Number(orderSelect.value)
          : null,

      appointment_type:
        appointmentTypeInput.value,

      appointment_date:
        appointmentDateInput.value,

      appointment_time:
        appointmentTimeInput.value ||
        null,

      status:
        statusInput.value,

      notes:
        notesInput.value.trim() ||
        null,
    };

    const id =
      appointmentIdInput.value;

    const method =
      id ? "PUT" : "POST";

    const url = id
      ? `${ENDPOINT}/${id}`
      : ENDPOINT;

    try {
      await fetchJson(url, {
        method,

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(
          payload
        ),
      });

      clearForm();

      await loadAppointments();

    } catch (err) {
      alert(err.message);
    }
  }
);

searchBtn.addEventListener(
  "click",
  loadAppointments
);

resetBtn.addEventListener(
  "click",
  () => {

    searchInput.value = "";

    statusFilter.value = "";

    loadAppointments();
  }
);

cancelEditBtn.addEventListener(
  "click",
  clearForm
);

(async function init() {

  try {

    document.getElementById(
      "apiUrlText"
    ).textContent =
      "/api/appointments";

    await Promise.all([
      loadCustomers(),
      loadOrders()
    ]);

    clearForm();

    await loadAppointments();

  } catch (err) {
    alert(err.message);
  }
})();