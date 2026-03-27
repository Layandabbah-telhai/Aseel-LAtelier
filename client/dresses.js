const API_BASE = "https://aseel-latelier-production.up.railway.app/api";
const ENDPOINT = `${API_BASE}/dresses`;
const UPLOAD_ENDPOINT = `${API_BASE}/upload-image`;

const tbody = document.getElementById("dressesTbody");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const form = document.getElementById("dressForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const dressesCount = document.getElementById("dressesCount");
const dressMessage = document.getElementById("dressMessage");

const idField = document.getElementById("dress_id");
const existingImageUrl = document.getElementById("existing_image_url");
const dressName = document.getElementById("dress_name");
const size = document.getElementById("size");
const color = document.getElementById("color");
const statusField = document.getElementById("status");
const rentalPrice = document.getElementById("rental_price");
const salePrice = document.getElementById("sale_price");
const notes = document.getElementById("notes");
const imageFile = document.getElementById("image_file");
const imagePreview = document.getElementById("image_preview");

const apiText = document.getElementById("apiUrlText");
if (apiText) apiText.textContent = ENDPOINT;

function setMessage(text, isError = false) {
  dressMessage.textContent = text || "";
  dressMessage.className = isError ? "text-danger mb-2" : "small-muted mb-2";
}

function setPreview(src) {
  imagePreview.src = src || "./logo.png";
}

if (imageFile) {
  imageFile.addEventListener("change", () => {
    const file = imageFile.files?.[0];
    if (!file) {
      setPreview(existingImageUrl.value || "./logo.png");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setMessage(`Selected file: ${file.name}`);
  });
}

async function uploadSelectedImageIfNeeded() {
  const file = imageFile.files?.[0];
  if (!file) {
    return existingImageUrl.value || "";
  }

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.message || "Image upload failed");
  }

  return payload.image_url || "";
}

async function loadDresses(search = "") {
  try {
    let url = ENDPOINT;
    if (search) {
      url += "?search=" + encodeURIComponent(search);
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load dresses (${res.status})`);

    const dresses = await res.json();
    renderDresses(dresses);
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-danger">${error.message}</td>
      </tr>
    `;
    dressesCount.textContent = "0 dresses";
  }
}

function renderDresses(dresses) {
  dressesCount.textContent = `${dresses.length} dresses`;

  if (!dresses.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-muted">No dresses found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = dresses.map(d => `
    <tr>
      <td>${d.dress_id}</td>
      <td>
        <img
          src="${escapeHtml(d.image_url || './logo.png')}"
          alt="${escapeHtml(d.dress_name)}"
          class="table-dress-img"
          onerror="this.src='./logo.png'"
        >
      </td>
      <td>${escapeHtml(d.dress_name)}</td>
      <td>${escapeHtml(d.size || "")}</td>
      <td>${escapeHtml(d.color || "")}</td>
      <td>${renderStatusBadge(d.status)}</td>
      <td>${formatPrice(d.rental_price)}</td>
      <td>${formatPrice(d.sale_price)}</td>
      <td>${escapeHtml(d.notes || "")}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="editDress(${d.dress_id})">
          Edit
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteDress(${d.dress_id})">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
}

function renderStatusBadge(status) {
  const safe = escapeHtml(status || "");
  let style = "background: rgba(234,223,218,0.78); color:#7a665f; border:1px solid rgba(123,103,97,0.10);";

  if (status === "Available") {
    style = "background:#e8f3ea; color:#50735c; border:1px solid #d4e7d8;";
  } else if (status === "Rented") {
    style = "background:#f8efe2; color:#8a6c42; border:1px solid #efddbf;";
  } else if (status === "Sold") {
    style = "background:#ece8e6; color:#6f625e; border:1px solid #ddd3cf;";
  } else if (status === "In Repair") {
    style = "background:#f8e7e7; color:#9d5c5c; border:1px solid #efcece;";
  } else if (status === "Reserved") {
    style = "background:#eee8f8; color:#6f5f8d; border:1px solid #ddd2f0;";
  }

  return `<span class="rounded-pill px-3 py-2 d-inline-block" style="${style}">${safe}</span>`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toFixed(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("Saving dress...");

  try {
    const uploadedImageUrl = await uploadSelectedImageIfNeeded();

    const data = {
      dress_name: dressName.value.trim(),
      size: size.value.trim(),
      color: color.value.trim(),
      status: statusField.value,
      rental_price: rentalPrice.value.trim(),
      sale_price: salePrice.value.trim(),
      notes: notes.value.trim(),
      image_url: uploadedImageUrl || existingImageUrl.value || "",
    };

    const id = idField.value;
    const method = id ? "PUT" : "POST";
    const url = id ? `${ENDPOINT}/${id}` : ENDPOINT;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage(payload?.message || "Failed to save dress.", true);
      return;
    }

    clearForm();
    setMessage("Dress saved successfully.");
    loadDresses(searchInput.value);
  } catch (error) {
    setMessage(error.message || "Failed to save dress.", true);
  }
});

window.editDress = async function (id) {
  const res = await fetch(`${ENDPOINT}/${id}`);
  if (!res.ok) {
    setMessage("Failed to load dress.", true);
    return;
  }

  const d = await res.json();

  idField.value = d.dress_id;
  existingImageUrl.value = d.image_url || "";
  dressName.value = d.dress_name || "";
  size.value = d.size || "";
  color.value = d.color || "";
  statusField.value = d.status || "Available";
  rentalPrice.value = d.rental_price ?? "";
  salePrice.value = d.sale_price ?? "";
  notes.value = d.notes || "";
  imageFile.value = "";
  setPreview(d.image_url || "./logo.png");
  setMessage("Edit mode enabled.");
};

window.deleteDress = async function (id) {
  if (!confirm("Delete this dress?")) return;

  const res = await fetch(`${ENDPOINT}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    setMessage("Failed to delete dress.", true);
    return;
  }

  setMessage("Dress deleted successfully.");
  loadDresses(searchInput.value);
};

function clearForm() {
  idField.value = "";
  existingImageUrl.value = "";
  form.reset();
  statusField.value = "Available";
  imageFile.value = "";
  setPreview("./logo.png");
  setMessage("");
}

searchBtn.addEventListener("click", () => {
  loadDresses(searchInput.value.trim());
});

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadDresses();
});

cancelEditBtn.addEventListener("click", clearForm);

loadDresses();