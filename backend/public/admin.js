document
  .getElementById("adminLoginForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value; // email -> username
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("http://localhost:3000/admin-login", {
        // endpoint düzeltildi
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("adminToken", data.token);
        window.location.href = "admin-panel.html"; // başarılı girişte yönlendir
      } else {
        alert(data.message || "Giriş başarısız");
      }
    } catch (err) {
      console.error("Giriş Hatası:", err);
      alert("Sunucu hatası");
    }
  });
