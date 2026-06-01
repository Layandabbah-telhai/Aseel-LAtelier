const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";

const OCCASION_ENDPOINT = `${API_BASE}/occasion-requests`;
const CHANGE_REQUESTS_ENDPOINT =
  `${API_BASE}/appointments/change-requests`;

const tbody = document.getElementById("requestsTbody");
const requestsCount = document.getElementById("requestsCount");

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

function yesNo(value) {
  return value ? "Yes" : "No";
}

function ratingLabel(value) {
  switch (String(value || "")) {
    case "1":
      return "1 - Not Satisfied";
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

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }

  return payload;
}

async function loadRequests() {
  try {
    const [occasionRows, changeRows] = await Promise.all([
      fetchJson(OCCASION_ENDPOINT),
      fetchJson(CHANGE_REQUESTS_ENDPOINT),
    ]);

    renderRequests(
      Array.isArray(occasionRows) ? occasionRows : [],
      Array.isArray(changeRows) ? changeRows : []
    );
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          ${escapeHtml(err.message)}
        </td>
      </tr>
    `;

    requestsCount.textContent = "0";
  }
}

function renderRequests(occasionRows, changeRows) {
  const pendingOccasionRows = occasionRows.filter(
    (r) => String(r.status || "").toLowerCase() === "pending"
  );

  const pendingChangeRows = changeRows.filter(
    (r) => String(r.status || "").toLowerCase() === "pending"
  );

  const total = pendingOccasionRows.length + pendingChangeRows.length;

  requestsCount.textContent =
    `${total} pending request${total === 1 ? "" : "s"}`;

  tbody.innerHTML = "";

  if (!pendingOccasionRows.length && !pendingChangeRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          No pending requests
        </td>
      </tr>
    `;
    return;
  }

  if (pendingOccasionRows.length) {
    tbody.innerHTML += `
      <tr class="table-light">
        <td colspan="8">
          <strong>New Occasion Requests</strong>
        </td>
      </tr>
    `;

    tbody.innerHTML += pendingOccasionRows
      .map((r) => `
        <tr>
          <td>${escapeHtml(r.request_id)}</td>

          <td>
            <strong>
              ${escapeHtml(r.first_name || "")}
              ${escapeHtml(r.last_name || "")}
            </strong>

            <div class="small-muted">
              ${escapeHtml(r.phone || "")}
            </div>

            <div class="small-muted">
              ${escapeHtml(r.email || "")}
            </div>
          </td>

          <td>
            <div><strong>Occasion:</strong> ${escapeHtml(r.occasion_type || "-")}</div>
            <div><strong>Customer Type:</strong> ${escapeHtml(r.customer_type || "-")}</div>
            <div><strong>Request:</strong> ${escapeHtml(r.order_type || "-")}</div>
          </td>

          <td>
            <div><strong>Date:</strong> ${escapeHtml(formatDate(r.event_date))}</div>
            <div><strong>City:</strong> ${escapeHtml(r.venue_city || "-")}</div>
            <div><strong>Hall:</strong> ${escapeHtml(r.venue_hall || "-")}</div>
          </td>

          <td>
            <div>
              <strong>Previous:</strong>
              ${escapeHtml(yesNo(Number(r.has_previous_experience)))}
            </div>

            ${
              Number(r.has_previous_experience)
                ? `
                  <div>
                    <strong>Type:</strong>
                    ${escapeHtml(r.previous_experience_type || "-")}
                  </div>

                  <div>
                    <strong>Rating:</strong>
                    ${escapeHtml(ratingLabel(r.experience_rating))}
                  </div>
                `
                : ""
            }
          </td>

          <td>
            ${escapeHtml(r.notes || "-")}
          </td>

          <td>
            <span class="badge-soft px-3 py-2 rounded-pill">
              Pending
            </span>
          </td>

          <td>
            <textarea
              class="form-control form-control-sm mb-2"
              rows="2"
              placeholder="Admin notes..."
              id="admin_notes_${r.request_id}"
            ></textarea>

            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-success"
                onclick="updateRequestStatus(${Number(r.request_id)}, 'accepted')"
              >
                Accept
              </button>

              <button
                class="btn btn-sm btn-outline-danger"
                onclick="updateRequestStatus(${Number(r.request_id)}, 'rejected')"
              >
                Reject
              </button>
            </div>
          </td>
        </tr>
      `)
      .join("");
  }

  if (pendingChangeRows.length) {
    tbody.innerHTML += `
      <tr class="table-light">
        <td colspan="8">
          <strong>Appointment Change Requests</strong>
        </td>
      </tr>
    `;

    tbody.innerHTML += pendingChangeRows
      .map((r) => `
        <tr>
          <td>${escapeHtml(r.request_id)}</td>

          <td>
            <strong>
              ${escapeHtml(r.first_name || "")}
              ${escapeHtml(r.last_name || "")}
            </strong>

            <div class="small-muted">
              ${escapeHtml(r.phone || "")}
            </div>

            <div class="small-muted">
              ${escapeHtml(r.email || "")}
            </div>
          </td>

          <td>
            ${escapeHtml(r.appointment_type || "-")}
          </td>

          <td>
            <div>
              <strong>Current:</strong>
              ${escapeHtml(formatDate(r.current_appointment_date
))}
              ${escapeHtml(formatTime(r.current_appointment_time))}
            </div>

            <div class="mt-1">
              <strong>Requested:</strong>
              ${escapeHtml(formatDate(r.requested_date))}
              ${escapeHtml(formatTime(r.requested_time))}
            </div>
          </td>

          <td>
            ${escapeHtml(r.order_type || "-")}
          </td>

          <td>
            ${escapeHtml(r.reason || "-")}
          </td>

          <td>
            <span class="badge-soft px-3 py-2 rounded-pill">
              Pending
            </span>
          </td>

          <td>
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-success"
                onclick="updateChangeRequestStatus(${Number(r.request_id)}, 'accepted')"
              >
                Accept
              </button>

              <button
                class="btn btn-sm btn-outline-danger"
                onclick="updateChangeRequestStatus(${Number(r.request_id)}, 'rejected')"
              >
                Reject
              </button>
            </div>
          </td>
        </tr>
      `)
      .join("");
  }
}

window.updateRequestStatus = async function (requestId, status) {
  try {
    const notes =
      document.getElementById(`admin_notes_${requestId}`)?.value || "";

    const confirmMessage =
      status === "accepted"
        ? "Accept this request and create a new order?"
        : "Reject this request?";

    if (!confirm(confirmMessage)) return;

    const result = await fetchJson(`${OCCASION_ENDPOINT}/${requestId}/status`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        status,
        admin_notes: notes.trim(),
      }),
    });

    if (status === "accepted" && result.order_id) {
      alert(`Request accepted. Order #${result.order_id} was created.`);
    } else {
      alert(result.message || "Request updated successfully.");
    }

    await loadRequests();
  } catch (err) {
    alert(err.message || "Failed to update request");
  }
};

window.updateChangeRequestStatus = async function (requestId, status) {
  try {
    const confirmMessage =
      status === "accepted"
        ? "Accept this appointment change request?"
        : "Reject this appointment change request?";

    if (!confirm(confirmMessage)) return;

    await fetchJson(`${CHANGE_REQUESTS_ENDPOINT}/${requestId}/status`, {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        status,
      }),
    });

    alert(
      status === "accepted"
        ? "Appointment updated successfully."
        : "Request rejected."
    );

    await loadRequests();
  } catch (err) {
    alert(err.message || "Failed to update request");
  }
};

loadRequests();