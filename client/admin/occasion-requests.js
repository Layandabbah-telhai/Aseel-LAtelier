const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";
const ENDPOINT = `${API_BASE}/occasion-requests`;

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

function prettifyStatus(status) {
  const s = String(status || "pending")
    .replaceAll("_", " ")
    .toLowerCase();

  return s.charAt(0).toUpperCase() + s.slice(1);
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
    const rows = await fetchJson(ENDPOINT);
    renderRequests(Array.isArray(rows) ? rows : []);
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

function renderRequests(rows) {
  requestsCount.textContent = `${rows.length} request${rows.length === 1 ? "" : "s"}`;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          No occasion requests found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((r) => {
    const status = String(r.status || "").toLowerCase();
    const isFinal = status === "accepted" || status === "rejected";

    return `
      <tr>
        <td>${escapeHtml(r.request_id)}</td>

        <td>
          <strong>${escapeHtml(r.first_name || "")} ${escapeHtml(r.last_name || "")}</strong>
          <div class="small-muted">${escapeHtml(r.phone || "")}</div>
          <div class="small-muted">${escapeHtml(r.email || "")}</div>
        </td>

        <td>${escapeHtml(r.occasion_type || "-")}</td>
        <td>${escapeHtml(formatDate(r.event_date))}</td>
        <td>${escapeHtml(r.order_type || "-")}</td>
        <td>${escapeHtml(r.notes || "-")}</td>

        <td>
          <span class="badge-soft px-3 py-2 rounded-pill">
            ${escapeHtml(prettifyStatus(r.status))}
          </span>
          ${r.admin_notes ? `<div class="small-muted mt-2">${escapeHtml(r.admin_notes)}</div>` : ""}
        </td>

        <td>
          <textarea
            class="form-control form-control-sm mb-2"
            rows="2"
            placeholder="Admin notes..."
            id="admin_notes_${r.request_id}"
            ${isFinal ? "disabled" : ""}
          >${escapeHtml(r.admin_notes || "")}</textarea>

          ${
            isFinal
              ? `
                <div class="small-muted">
                  Decision already submitted.
                  ${
                    status === "accepted"
                      ? "<br>Order was created automatically."
                      : ""
                  }
                </div>
              `
              : `
                <div class="d-flex gap-2">
                  <button
                    class="btn btn-sm btn-success"
                    onclick="updateRequestStatus(${Number(r.request_id)}, 'accepted')"
                  >
                    Accept + Create Order
                  </button>

                  <button
                    class="btn btn-sm btn-outline-danger"
                    onclick="updateRequestStatus(${Number(r.request_id)}, 'rejected')"
                  >
                    Reject
                  </button>
                </div>
              `
          }
        </td>
      </tr>
    `;
  }).join("");
}

window.updateRequestStatus = async function (requestId, status) {
  try {
    const notes = document.getElementById(`admin_notes_${requestId}`)?.value || "";

    const confirmMessage =
      status === "accepted"
        ? "Accept this request and create a new order?"
        : "Reject this request?";

    if (!confirm(confirmMessage)) return;

    const result = await fetchJson(`${ENDPOINT}/${requestId}/status`, {
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

loadRequests();