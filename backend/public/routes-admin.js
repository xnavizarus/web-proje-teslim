// routes/admin.js
const express = require("express");
const router = express.Router();

// Burada admin kullanıcı bilgilerini belirliyoruz
const ADMIN_USERNAME = "admin"; // senin belirlediğin kullanıcı adı
const ADMIN_PASSWORD = "Admin123!"; // senin belirlediğin şifre

// Admin giriş route'u
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Giriş başarılı → admin paneline yönlendir
    res.redirect("/admin-dashboard.html");
  } else {
    // Hatalı giriş
    res.status(401).send("Hatalı kullanıcı adı veya şifre!");
  }
});

module.exports = router;
