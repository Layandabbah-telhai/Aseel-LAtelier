const API_BASE =
  window.CONFIG?.API_BASE ||
  "http://localhost:4000/api";

const ENDPOINT = `${API_BASE}/customers`;

const tbody =
  document.getElementById("customersTbody");

const searchInput =
  document.getElementById("searchInput");

const searchBtn =
  document.getElementById("searchBtn");

const resetBtn =
  document.getElementById("resetBtn");

const form =
  document.getElementById("customerForm");

const cancelEditBtn =
  document.getElementById("cancelEditBtn");

const customersCount =
  document.getElementById("customersCount");

const apiText =
  document.getElementById("apiUrlText");

const idField =
  document.getElementById("customer_id");

const firstName =
  document.getElementById("first_name");

const lastName =
  document.getElementById("last_name");

const city =
  document.getElementById("city");

const phone =
  document.getElementById("phone");

const email =
  document.getElementById("email");

const birthDate =
  document.getElementById("birth_date");

const sourceType =
  document.getElementById("source_type");

const sourceDetails =
  document.getElementById("source_details");

const sourceDetailsWrap =
  document.getElementById("sourceDetailsWrap");

if (apiText) {
  apiText.textContent = ENDPOINT;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toggleSourceDetails() {
  if (!sourceDetailsWrap) return;

  if (sourceType?.value === "other") {
    sourceDetailsWrap.style.display = "";
  } else {
    sourceDetailsWrap.style.display = "none";

    if (sourceDetails) {
      sourceDetails.value = "";
    }
  }
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

async function loadCustomers(search = "") {
  try {
    let url = ENDPOINT;

    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }

    const res = await fetch(url);

    const payload =
      await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(
        payload?.message ||
        "Failed to load customers"
      );
    }

    renderCustomers(
      Array.isArray(payload)
        ? payload
        : []
    );

  } catch (err) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8"
            class="text-danger text-center">

          ${escapeHtml(err.message)}

        </td>
      </tr>
    `;

    if (customersCount) {
      customersCount.textContent =
        "0 customers";
    }
  }
}

function renderCustomers(rows) {

  if (customersCount) {
    customersCount.textContent =
      `${rows.length} customer${rows.length === 1 ? "" : "s"}`;
  }

  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8"
            class="text-center text-muted">

          No customers found

        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = rows.map(c => `

    <tr>

      <td>
        ${escapeHtml(c.customer_id)}
      </td>

      <td>
        ${escapeHtml(c.first_name)}
        ${escapeHtml(c.last_name)}
      </td>

      <td>
        ${escapeHtml(c.phone)}
      </td>

      <td>
        ${escapeHtml(c.city || "")}
      </td>

      <td>
        ${escapeHtml(c.email || "")}
      </td>

      <td>
        ${escapeHtml(
    c.birth_date
      ? String(c.birth_date).slice(0, 10)
      : "-"
  )}
      </td>

      <td>
        ${escapeHtml(sourceLabel(c.source_type))}

        ${c.source_details
      ? `
              <div class="small text-muted">
                ${escapeHtml(c.source_details)}
              </div>
            `
      : ""
    }
      </td>

<td class="d-flex gap-2 flex-wrap">

  <a
    class="btn btn-sm btn-outline-secondary"
    href="./customer-profile.html?id=${encodeURIComponent(c.customer_id)}"
  >
    Profile
  </a>

  <button
    class="btn btn-sm btn-outline-secondary"
    onclick="editCustomer(${Number(c.customer_id)})"
  >
    Edit
  </button>

  <button
    class="btn btn-sm btn-outline-danger"
    onclick="deleteCustomer(${Number(c.customer_id)})"
  >
    Delete
  </button>

  <a
    class="btn btn-sm btn-outline-secondary"
    href="./orders.html?customer_id=${encodeURIComponent(c.customer_id)}"
  >
    Orders
  </a>

</td>

    </tr>

  `).join("");
}

window.editCustomer =
  async function (id) {

    try {

      const res =
        await fetch(`${ENDPOINT}/${id}`);

      const customer =
        await res.json().catch(() => null);

      if (!res.ok) {

        throw new Error(
          customer?.message ||
          "Failed to load customer"
        );
      }

      idField.value =
        customer.customer_id || "";

      firstName.value =
        customer.first_name || "";

      lastName.value =
        customer.last_name || "";

      city.value =
        customer.city || "";

      phone.value =
        customer.phone || "";

      email.value =
        customer.email || "";

      birthDate.value =
        customer.birth_date
          ? String(customer.birth_date).slice(0, 10)
          : "";

      sourceType.value =
        customer.source_type || "";

      sourceDetails.value =
        customer.source_details || "";

      toggleSourceDetails();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    } catch (err) {

      alert(
        err.message ||
        "Failed to load customer"
      );
    }
  };

window.deleteCustomer =
  async function (id) {

    if (
      !confirm(
        "Delete this customer?"
      )
    ) {
      return;
    }

    try {

      const res =
        await fetch(`${ENDPOINT}/${id}`, {
          method: "DELETE",
        });

      const payload =
        await res.json().catch(() => null);

      if (!res.ok) {

        throw new Error(
          payload?.message ||
          "Failed to delete customer"
        );
      }

      loadCustomers(
        searchInput.value.trim()
      );

    } catch (err) {

      alert(
        err.message ||
        "Failed to delete customer"
      );
    }
  };

form?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    const data = {

      first_name:
        firstName.value.trim(),

      last_name:
        lastName.value.trim(),

      city:
        city.value.trim(),

      phone:
        phone.value.trim(),

      email:
        email.value.trim(),

      birth_date:
        birthDate.value || null,

      source_type:
        sourceType.value || null,

      source_details:
        sourceDetails.value.trim() || null,
    };

    const id = idField.value;

    const method =
      id ? "PUT" : "POST";

    const url = id
      ? `${ENDPOINT}/${id}`
      : ENDPOINT;

    try {

      const res = await fetch(url, {

        method,

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(data),
      });

      const payload =
        await res.json().catch(() => null);

      if (!res.ok) {

        throw new Error(
          payload?.message ||
          "Failed to save customer"
        );
      }

      clearForm();

      loadCustomers(
        searchInput.value.trim()
      );

    } catch (err) {

      alert(
        err.message ||
        "Failed to save customer"
      );
    }
  }
);

function clearForm() {

  idField.value = "";

  form.reset();

  if (sourceDetailsWrap) {
    sourceDetailsWrap.style.display =
      "none";
  }
}

searchBtn?.addEventListener(
  "click",
  () => {

    loadCustomers(
      searchInput.value.trim()
    );
  }
);

resetBtn?.addEventListener(
  "click",
  () => {

    searchInput.value = "";

    loadCustomers();
  }
);

cancelEditBtn?.addEventListener(
  "click",
  clearForm
);

sourceType?.addEventListener(
  "change",
  toggleSourceDetails
);

(async function () {

  await loadCustomers();

  const params =
    new URLSearchParams(window.location.search);

  const editCustomerId =
    params.get("edit_customer_id");

  if (editCustomerId) {

    window.editCustomer(
      Number(editCustomerId)
    );
  }

})();