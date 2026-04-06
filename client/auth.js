const APP_BASE="https://aseel-latelier-production.up.railway.app";
const LOGIN_PAGE = `${APP_BASE}/client/login.html`;
function requireAuth() {
    const token= localStorage.getItem("aseel_token");
    if(!token || !token.startsWith("aseel_user_")){
        window.location.href=LOGIN_PAGE;
    }
}

function logout() {
    localStorage.removeItem("aseel_token");
    localStorage.removeItem("aseel_user");
    window.location.href=LOGIN_PAGE;
}