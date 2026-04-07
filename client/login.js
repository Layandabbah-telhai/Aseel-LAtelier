const API_BASE = "https://aseel-latelier.onrender.com/api";
const APP_BASE = "https://layandabbah-telhai.github.io/Aseel-LAtelier";

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorBox = document.getElementById("loginError");

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

    localStorage.setItem("aseel_token", payload.token);
    localStorage.setItem("aseel_user", JSON.stringify(payload.user));

    window.location.href = `${APP_BASE}/client/customers.html`;
  } catch (err) {
    errorBox.textContent = err.message || "Login failed";
  }
}

document.getElementById("loginForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  login();
});
