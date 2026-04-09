(function () {
  const path = window.location.pathname.toLowerCase();

  const links = [
    { href: "customers.html", label: "Customers", match: "customers.html" },
    { href: "dresses.html", label: "Dresses", match: "dresses.html" },
    { href: "orders.html", label: "Orders", match: "orders.html" },
    { href: "appointments.html", label: "Appointments", match: "appointments.html" },
    { href: "payments.html", label: "Payments", match: "payments.html" },
    { href: "measurements.html", label: "Measurements", match: "measurements.html" },
    { href: "seamstresses.html", label: "Seamstresses", match: "seamstresses.html" },
  ];

  function isActive(match) {
    return path.endsWith("/" + match) || path.endsWith(match);
  }

  const navHtml = `
    <div class="hero mb-4">
      <div class="hero-inner">
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
          <div>
            <div class="brand">Aseel L'Atelier</div>
            <div class="small-muted">Atelier Management System</div>
          </div>

          <div class="d-flex flex-wrap gap-2">
            ${links.map(link => `
              <a
                class="btn ${isActive(link.match) ? "btn-primary" : "btn-outline-secondary"} btn-soft"
                href="${link.href}"
              >
                ${link.label}
              </a>
            `).join("")}
            <button class="btn btn-outline-danger btn-soft" onclick="logout()">Logout</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const mount = document.getElementById("sharedNav");
  if (mount) {
    mount.innerHTML = navHtml;
  }
})();