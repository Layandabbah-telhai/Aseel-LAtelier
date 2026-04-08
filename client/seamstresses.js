const API_BASE = CONFIG.API_BASE;
const SEAMSTRESSES_ENDPOINT = `${API_BASE}/seamstresses`;
const ASSIGNMENTS_ENDPOINT = `${API_BASE}/seamstresses/assignments`;
const ORDERS_ENDPOINT = `${API_BASE}/orders`;

const apiTextRegistry = document.getElementById("apiTextRegistry");
const apiTextAssignments = document.getElementById("apiTextAssignments");
const orderSummary = document.getElementById("orderSummary");

const seamstressForm = document.getElementById("seamstressForm");
const seamstressId = document.getElementById("seamstress_id");
const nameField = document.getElementById("name");
const phoneField = document.getElementById("phone");
const cancelSeamstressEditBtn = document.getElementById("cancelSeamstressEditBtn");

const seamstressesTbody = document.getElementById("seamstressesTbody");
const seamstressesCount = document.getElementById("seamstressesCount");

const assignmentForm = document.getElementById("assignmentForm");
const assignmentId = document.getElementById("assignment_id");
const orderIdField = document.getElementById("order_id");
const assignedSeamstressId = document.getElementById("assigned_seamstress_id");
const taskTypeField = document.getElementById("task_type");
const assignmentNotesField = document.getElementById("assignment_notes");
const cancelAssignmentEditBtn = document.getElementById("cancelAssignmentEditBtn");

const assignmentsTbody = document.getElementById("assignmentsTbody");
const assignmentsCount = document.getElementById("assignmentsCount");

const params = new URLSearchParams(window.location.search);
const urlOrderId = params.get("order_id");

let seamstressesCache = [];
let ordersCache = [];

if (apiTextRegistry) apiTextRegistry.textContent = SEAMSTRESSES_ENDPOINT;
if (apiTextAssignments) {
    apiTextAssignments.textContent = urlOrderId
        ? `${ASSIGNMENTS_ENDPOINT}?order_id=${urlOrderId}`
        : ASSIGNMENTS_ENDPOINT;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderOrderSummary() {
    if (urlOrderId) {
        const order = ordersCache.find((o) => String(o.order_id) === String(urlOrderId));

        if (!order) {
            orderSummary.innerHTML = `<div class="text-danger">Failed to load selected order.</div>`;
            return;
        }

        orderSummary.innerHTML = `
      <div><strong>Selected Order #${order.order_id}</strong></div>
      <div>Customer: ${escapeHtml(order.first_name || "")} ${escapeHtml(order.last_name || "")}</div>
      <div>Dress: ${escapeHtml(order.dress_name || "")}</div>
      <div>Occasion: ${escapeHtml(order.occasion_type || "")}</div>
    `;
        return;
    }

    orderSummary.innerHTML = `
    <div><strong>All Seamstress Assignments</strong></div>
    <div>Assign seamstresses to any order, and you can create more than one assignment for the same order.</div>
  `;
}

function renderSeamstressOptions() {
    assignedSeamstressId.innerHTML = seamstressesCache.map((s) => `
    <option value="${s.seamstress_id}">${escapeHtml(s.name)}</option>
  `).join("");
}

function renderOrderOptions() {
    orderIdField.innerHTML = ordersCache.map((o) => `
    <option value="${o.order_id}">
      #${o.order_id} - ${escapeHtml(o.first_name || "")} ${escapeHtml(o.last_name || "")} - ${escapeHtml(o.dress_name || "")}
    </option>
  `).join("");

    if (urlOrderId) {
        orderIdField.value = urlOrderId;
    }
}

async function loadOrders() {
    const res = await fetch(ORDERS_ENDPOINT);
    if (!res.ok) throw new Error("Failed to load orders");
    ordersCache = await res.json();
    renderOrderOptions();
    renderOrderSummary();
}

async function loadSeamstresses() {
    const res = await fetch(SEAMSTRESSES_ENDPOINT);
    if (!res.ok) throw new Error("Failed to load seamstresses");

    seamstressesCache = await res.json();
    renderSeamstressOptions();
    renderSeamstressesTable(seamstressesCache);
}

function renderSeamstressesTable(rows) {
    seamstressesCount.textContent = `${rows.length} seamstresses`;

    if (!rows.length) {
        seamstressesTbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">No seamstresses found</td>
      </tr>
    `;
        return;
    }

    seamstressesTbody.innerHTML = rows.map((s) => `
    <tr>
      <td>${s.seamstress_id}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.phone || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editSeamstress(${s.seamstress_id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteSeamstress(${s.seamstress_id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function loadAssignmentsForOrder(orderIdValue) {
    const res = await fetch(`${ASSIGNMENTS_ENDPOINT}?order_id=${encodeURIComponent(orderIdValue)}`);
    if (!res.ok) {
        throw new Error(`Failed to load assignments (${res.status})`);
    }

    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
}

async function loadAssignments() {
    try {
        let rows = [];

        if (urlOrderId) {
            rows = await loadAssignmentsForOrder(urlOrderId);
        } else {
            const allAssignments = await Promise.all(
                ordersCache.map((order) => loadAssignmentsForOrder(order.order_id))
            );
            rows = allAssignments.flat();
        }

        renderAssignmentsTable(rows);
    } catch (error) {
        assignmentsTbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger">${error.message}</td>
      </tr>
    `;
        assignmentsCount.textContent = "0 assignments";
    }
}

function renderAssignmentsTable(rows) {
    assignmentsCount.textContent = `${rows.length} assignments`;

    if (!rows.length) {
        assignmentsTbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted">No assignments found</td>
      </tr>
    `;
        return;
    }

    assignmentsTbody.innerHTML = rows.map((a) => `
    <tr>
      <td>${a.assignment_id}</td>
      <td><a href="seamstresses.html?order_id=${a.order_id}">#${a.order_id}</a></td>
      <td>${escapeHtml(a.first_name || "")} ${escapeHtml(a.last_name || "")}</td>
      <td>${escapeHtml(a.dress_name || "")}</td>
      <td>${escapeHtml(a.occasion_type || "")}</td>
      <td>${escapeHtml(a.name || "")}</td>
      <td>${escapeHtml(a.task_type || "")}</td>
      <td>${escapeHtml(a.assignment_notes || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editAssignment(${a.assignment_id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAssignment(${a.assignment_id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

window.editSeamstress = async function (id) {
    const res = await fetch(`${SEAMSTRESSES_ENDPOINT}/${id}`);
    if (!res.ok) {
        alert("Failed to load seamstress");
        return;
    }

    const s = await res.json();
    seamstressId.value = s.seamstress_id;
    nameField.value = s.name || "";
    phoneField.value = s.phone || "";
};

window.deleteSeamstress = async function (id) {
    if (!confirm("Delete this seamstress?")) return;

    const res = await fetch(`${SEAMSTRESSES_ENDPOINT}/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Failed to delete seamstress");
        return;
    }

    clearSeamstressForm();
    await loadSeamstresses();
};

window.editAssignment = async function (id) {
    let rows = [];

    if (urlOrderId) {
        rows = await loadAssignmentsForOrder(urlOrderId);
    } else {
        const allAssignments = await Promise.all(
            ordersCache.map((order) => loadAssignmentsForOrder(order.order_id))
        );
        rows = allAssignments.flat();
    }

    const a = rows.find((row) => String(row.assignment_id) === String(id));

    if (!a) {
        alert("Assignment not found");
        return;
    }

    assignmentId.value = a.assignment_id;
    orderIdField.value = a.order_id;
    assignedSeamstressId.value = a.seamstress_id;
    taskTypeField.value = a.task_type || "";
    assignmentNotesField.value = a.assignment_notes || "";
};

window.deleteAssignment = async function (id) {
    if (!confirm("Delete this assignment?")) return;

    const res = await fetch(`${ASSIGNMENTS_ENDPOINT}/${id}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Failed to delete assignment");
        return;
    }

    clearAssignmentForm();
    await loadAssignments();
};

seamstressForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        name: nameField.value.trim(),
        phone: phoneField.value.trim(),
    };

    const id = seamstressId.value;
    const method = id ? "PUT" : "POST";
    const url = id ? `${SEAMSTRESSES_ENDPOINT}/${id}` : SEAMSTRESSES_ENDPOINT;

    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Failed to save seamstress");
        return;
    }

    clearSeamstressForm();
    await loadSeamstresses();
});

assignmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        order_id: orderIdField.value,
        seamstress_id: assignedSeamstressId.value,
        task_type: taskTypeField.value,
        notes: assignmentNotesField.value.trim(),
    };

    const id = assignmentId.value;
    const method = id ? "PUT" : "POST";
    const url = id ? `${ASSIGNMENTS_ENDPOINT}/${id}` : ASSIGNMENTS_ENDPOINT;

    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
        alert(payload?.message || "Failed to save assignment");
        return;
    }

    clearAssignmentForm();
    await loadAssignments();
});

function clearSeamstressForm() {
    seamstressId.value = "";
    seamstressForm.reset();
}

function clearAssignmentForm() {
    assignmentId.value = "";
    assignmentForm.reset();

    if (urlOrderId) {
        orderIdField.value = urlOrderId;
    }
}

cancelSeamstressEditBtn.addEventListener("click", clearSeamstressForm);
cancelAssignmentEditBtn.addEventListener("click", clearAssignmentForm);

(async function init() {
    await loadOrders();
    await loadSeamstresses();
    clearAssignmentForm();
    await loadAssignments();
})();