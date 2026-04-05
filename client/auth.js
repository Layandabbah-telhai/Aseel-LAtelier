function requireAuth() {
  const token = localStorage.getItem("aseel_token");
  if (!token) {
    window.location.href = "./login.html";
  }
}

function logout() {
  localStorage.removeItem("aseel_token");
  localStorage.removeItem("aseel_user");
  window.location.href = "./login.html";
}