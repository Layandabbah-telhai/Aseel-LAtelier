(function () {
  const token = localStorage.getItem("aseel_token");
  const userRaw = localStorage.getItem("aseel_user");
  const currentPage = window.location.pathname.split("/").pop();

  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  const links = [
    { href: "customers.html", label: "Customers" },
    { href: "dresses.html", label: "Dresses" },
    { href: "orders.html", label: "Orders" },
    { href: "appointments.html", label: "Appointments" },
    { href: "measurements.html", label: "Measurements" },
    { href: "payments.html", label: "Payments" },
    { href: "seamstresses.html", label: "Seamstresses" },
  ];

  let userName = "";

  try {
    const user = JSON.parse(userRaw || "{}");
    userName = user?.name || "";
  } catch {}

  const navHtml = `
    <div class="hero mb-4">
      <div class="hero-inner">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div>
            <div class="brand">Aseel L'Atelier</div>
            <div class="small-muted">
              Atelier Management System ${userName ? `- Welcome, ${userName}` : ""}
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2">
            ${links.map(link => `
              <a
                class="btn ${currentPage === link.href ? "btn-primary" : "btn-outline-secondary"} btn-soft"
                href="./${link.href}"
              >
                ${link.label}
              </a>
            `).join("")}

            <button class="btn btn-outline-danger btn-soft" id="logoutBtn">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.addEventListener("DOMContentLoaded", () => {
    const mount =
      document.getElementById("sharedNav") ||
      document.getElementById("navContainer");

    if (mount) {
      mount.innerHTML = navHtml;
    }

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem("aseel_token");
      localStorage.removeItem("aseel_user");
      window.location.href = "../login.html";
    });
  });
})();