const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";

const form = document.getElementById("registerForm");

const firstName = document.getElementById("first_name");
const lastName = document.getElementById("last_name");
const city = document.getElementById("city");
const phone = document.getElementById("phone");
const email = document.getElementById("email");
const birthDate = document.getElementById("birth_date");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirm_password");
const sourceType = document.getElementById("source_type");
const sourceDetails = document.getElementById("source_details");
const sourceDetailsWrap = document.getElementById("sourceDetailsWrap");

const errorBox = document.getElementById("registerError");
const successBox = document.getElementById("registerSuccess");

function toggleSourceDetails() {
  if (sourceType.value === "other") {
    sourceDetailsWrap.style.display = "";
  } else {
    sourceDetailsWrap.style.display = "none";
    sourceDetails.value = "";
  }
}

sourceType?.addEventListener("change", toggleSourceDetails);

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  errorBox.textContent = "";
  successBox.textContent = "";

  if (password.value !== confirmPassword.value) {
    errorBox.textContent = "Passwords do not match";
    return;
  }

  const data = {
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim(),
    city: city.value.trim(),
    phone: phone.value.trim(),
    email: email.value.trim(),
    birth_date: birthDate.value || null,
    password: password.value,
    source_type: sourceType.value || null,
    source_details: sourceDetails.value.trim() || null,
  };

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.message || "Registration failed");
    }

    localStorage.setItem("aseel_token", payload.token);
    localStorage.setItem("aseel_user", JSON.stringify(payload.user));

    successBox.textContent = "Account created successfully";

    window.location.href = "./customer/dashboard.html";
  } catch (err) {
    errorBox.textContent = err.message || "Registration failed";
  }
});