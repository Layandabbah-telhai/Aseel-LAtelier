const API_BASE = window.CONFIG?.API_BASE || "http://localhost:4000/api";

async function login() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("loginError");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  errorBox.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.message || "Login failed");
    }

    const user = payload.user;

    localStorage.setItem("aseel_token", payload.token);
    localStorage.setItem("aseel_user", JSON.stringify(user));

    if (user.role === "customer") {
      window.location.href = "./customer/dashboard.html";
    } else {
      window.location.href = "./admin/admin-dashboard.html";
    }
  } catch (err) {
    errorBox.textContent = err.message || "Login failed";
  }
}

document.getElementById("loginForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  login();
});


