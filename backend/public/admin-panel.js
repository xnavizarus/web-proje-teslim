// ------------------------------
// Admin Panel JS
// ------------------------------

// Token kontrolü
const token = localStorage.getItem("adminToken");

const dashboardPage = document.getElementById("dashboard-page");
const usersPage = document.getElementById("users-page");
const commentsPage = document.getElementById("comments-page");
const settingsPage = document.getElementById("settings-page"); // Ayarlar sayfası
const dashboardLink = document.getElementById("dashboard-link");
const usersLink = document.getElementById("users-link");
const commentsLink = document.getElementById("comments-link");
const settingsLink = document.getElementById("settings-link"); // Ayarlar linki
const logoutBtn = document.getElementById("logoutBtn");

if (!token) {
  alert("Yetkisiz erişim! Giriş yapmalısınız.");
  window.location.href = "admin-login.html";
} else {
  // Sayfa yüklendiğinde dashboard'u göster ve verileri yükle
  if (dashboardPage) {
    dashboardPage.style.display = "flex";
    updateDashboardStats(); // Dashboard istatistiklerini yükle
  } // Menü navigasyonunu yönetme

  if (dashboardLink) {
    dashboardLink.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllPages();
      dashboardPage.style.display = "flex";
      updateDashboardStats();
    });
  }

  if (usersLink) {
    usersLink.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllPages();
      usersPage.style.display = "block";
      loadUsersTable();
    });
  }

  if (commentsLink) {
    commentsLink.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllPages();
      commentsPage.style.display = "block";
      loadCommentsTable();
    });
  }

  if (settingsLink) {
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      hideAllPages();
      settingsPage.style.display = "block";
      loadSettings(); // Ayarlar sayfasını gösterirken verileri yükle
    });
  } // Sayfa gizleme fonksiyonu

  function hideAllPages() {
    const pages = [dashboardPage, usersPage, commentsPage, settingsPage];
    pages.forEach((page) => {
      if (page) page.style.display = "none";
    });
  } // Çıkış yap butonu

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      window.location.href = "admin-login.html";
    });
  }
}

// ------------------------------
// Dashboard istatistiklerini güncelle
// ------------------------------
function updateDashboardStats() {
  fetch("http://localhost:3000/api/admin/stats", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Sunucu hatası: " + res.statusText);
      }
      return res.json();
    })
    .then((stats) => {
      document.getElementById("totalUsers").textContent = stats.totalUsers || 0;
      document.getElementById("totalComments").textContent =
        stats.totalComments || 0;
      document.getElementById("pendingApprovals").textContent =
        stats.pendingApprovals || 0;
    })
    .catch((err) =>
      console.error("Dashboard verileri alınırken hata oluştu:", err)
    );
}

// ------------------------------
// Kullanıcıları tabloya yükle
// ------------------------------
function loadUsersTable() {
  fetch("http://localhost:3000/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(
          "Kullanıcılar alınırken hata oluştu: " + res.statusText
        );
      }
      return res.json();
    })
    .then((users) => {
      const tableBody = document.getElementById("users-table-body");
      if (!tableBody) return;

      tableBody.innerHTML = "";
      users.forEach((user) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch((err) => console.error("Kullanıcıları yüklerken hata oluştu:", err));
}

// ------------------------------
// Yorumları tabloya yükle
// ------------------------------
function loadCommentsTable() {
  fetch("http://localhost:3000/api/comments", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Yorumları alınırken hata oluştu: " + res.statusText);
      }
      return res.json();
    })
    .then((comments) => {
      const tableBody = document.getElementById("comments-table-body");
      if (!tableBody) return;

      tableBody.innerHTML = "";
      comments.forEach((comment) => {
        const row = document.createElement("tr");
        const isApproved = comment.onaylandi ? "Evet" : "Hayır";
        row.innerHTML = `
        <td>${comment.metin}</td>
        <td>Bilinmiyor</td>
        <td>${new Date(comment.tarih).toLocaleDateString()}</td>
        <td>${isApproved}</td>
        <td>
          <button class="approve-btn" data-id="${comment._id}">Onayla</button>
          <button class="delete-btn" data-id="${comment._id}">Sil</button>
        </td>
      `;
        tableBody.appendChild(row);
      }); // Butonlara olay dinleyicisi ekle

      document.querySelectorAll(".approve-btn").forEach((button) => {
        button.addEventListener("click", handleApproveComment);
      });
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleDeleteComment);
      });
    })
    .catch((err) => console.error("Yorumları yüklerken hata oluştu:", err));
}

// Yorumu onaylama fonksiyonu
function handleApproveComment(e) {
  const commentId = e.target.dataset.id;
  fetch(`http://localhost:3000/api/comments/${commentId}/onayla`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      loadCommentsTable(); // Yorumları yeniden yükle
    })
    .catch((err) => console.error("Yorum onaylanırken hata:", err));
}

// Yorumu silme fonksiyonu
function handleDeleteComment(e) {
  const commentId = e.target.dataset.id;
  fetch(`http://localhost:3000/api/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      loadCommentsTable(); // Yorumları yeniden yükle
    })
    .catch((err) => console.error("Yorum silinirken hata:", err));
}

// ------------------------------
// Yeni: Ayarlar API'ları
// ------------------------------

// Ayarları veritabanından al ve sayfa yüklendiğinde doldur
function loadSettings() {
  fetch("http://localhost:3000/api/settings", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((settings) => {
      if (settings) {
        document.getElementById("siteName").value = settings.siteName;
        document.getElementById("contactEmail").value = settings.contactEmail;
      }
    })
    .catch((err) => console.error("Ayarlar yüklenirken hata oluştu:", err));
}

// Ayarları kaydetme fonksiyonu
function saveSettings(e) {
  e.preventDefault(); // Formun varsayılan gönderimini engelle

  const siteName = document.getElementById("siteName").value;
  const contactEmail = document.getElementById("contactEmail").value;

  fetch("http://localhost:3000/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ siteName, contactEmail }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      loadSettings(); // Ayarları tekrar yükle
    })
    .catch((err) => console.error("Ayarlar kaydedilirken hata oluştu:", err));
}

// Ayarları Kaydet butonuna olay dinleyicisi ekle
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", saveSettings);
}
