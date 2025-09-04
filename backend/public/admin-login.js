// ------------------------------
// Admin Login JS
// ------------------------------
const loginForm = document.getElementById("adminLoginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      alert("Kullanıcı adı ve şifre gerekli!");
      return;
    }

    try {
      const res = await fetch("/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Giriş başarısız");
        return;
      }

      // Token'ı localStorage'a kaydet
      localStorage.setItem("adminToken", data.token);

      // Panel sayfasına yönlendir
      window.location.href = "admin-panel.html"; // Admin panel HTML dosyanın adı
    } catch (err) {
      console.error("Login hatası:", err);
      alert("Sunucu hatası oluştu");
    }
  });
}
