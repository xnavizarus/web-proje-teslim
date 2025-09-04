const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Çok fazla istek yaptınız, lütfen daha sonra tekrar deneyin.",
});
app.use(limiter);

// Log middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logMessage = `${new Date().toLocaleString()} | IP: ${req.ip} | ${
      req.method
    } | ${req.url} | Status: ${res.statusCode} | ${duration}ms\n`;
    fs.appendFile("log.txt", logMessage, (err) => {
      if (err) console.error("Log dosyasına yazılamadı:", err);
    });
  });
  next();
});

// MongoDB bağlantısı
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Atlas bağlantısı başarılı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

// MODELS
const User = require("./models/userModel"); // ✅ DÜZELTİLDİ
const { ObjectId } = require("mongodb");

// Yeni: Ayarlar için Mongoose Şeması
const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: "Admin Paneli",
  },
  contactEmail: {
    type: String,
    default: "admin@example.com",
  },
});
const Settings = mongoose.model("Settings", settingsSchema);

// JWT admin kontrolü
function isAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Authorization header yok" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token bulunamadı" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token geçersiz" });
    if (user.role !== "admin")
      return res.status(403).json({ message: "Yetkisiz erişim" });
    req.user = user;
    next();
  });
}

// COLLECTIONS
const commentsCollection = () => mongoose.connection.db.collection("comments");

// Admin oluşturma (ilk kullanım)
app.get("/create-admin", async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin zaten var." });

    const hashedPassword = await bcrypt.hash("GucLu$Sifre2025!", 10);
    const adminUser = new User({
      username: "admin",
      password: hashedPassword,
      role: "admin",
    });
    await adminUser.save();

    // Yeni: İlk ayarları oluştur
    const defaultSettings = new Settings({});
    await defaultSettings.save();

    res
      .status(201)
      .json({ message: "Admin ve varsayılan ayarlar oluşturuldu." });
  } catch (err) {
    res.status(500).json({ message: "Hata oluştu.", error: err.message });
  }
});

// Admin giriş endpoint
app.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Kullanıcı adı ve şifre gerekli" });

    const adminUser = await User.findOne({ username });
    if (!adminUser)
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const passwordMatch = await bcrypt.compare(password, adminUser.password);
    if (!passwordMatch)
      return res.status(401).json({ message: "Şifre hatalı" });
    if (adminUser.role !== "admin")
      return res.status(403).json({ message: "Admin yetkisi yok" });

    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.status(200).json({ message: "Giriş başarılı", token });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Girişte hata oluştu", error: err.message });
  }
});

// YORUM CRUD (onay alanı ekli)
app.get("/api/comments", async (req, res) => {
  try {
    const comments = await commentsCollection()
      .find({})
      .sort({ tarih: -1 })
      .toArray();
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ message: "Yorumlar alınırken hata oluştu" });
  }
});

app.post("/api/comments", async (req, res) => {
  try {
    const { metin } = req.body;
    if (!metin || metin.trim() === "")
      return res.status(400).json({ message: "Yorum metni boş olamaz" });

    const yeniYorum = { metin, tarih: new Date(), onaylandi: false };
    const result = await commentsCollection().insertOne(yeniYorum);
    res
      .status(201)
      .json({ message: "Yorum başarıyla eklendi", id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: "Yorum eklenirken hata oluştu" });
  }
});

// Yorum silme
app.delete("/api/comments/:id", isAdmin, async (req, res) => {
  try {
    const commentId = req.params.id;
    const result = await commentsCollection().deleteOne({
      _id: new ObjectId(commentId),
    });
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "Yorum bulunamadı" });
    res.status(200).json({ message: "Yorum başarıyla silindi" });
  } catch (err) {
    res.status(500).json({ message: "Yorum silinirken hata oluştu" });
  }
});

// Yorum onaylama
app.put("/api/comments/:id/onayla", isAdmin, async (req, res) => {
  try {
    const commentId = req.params.id;
    const result = await commentsCollection().updateOne(
      { _id: new ObjectId(commentId) },
      { $set: { onaylandi: true } }
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Yorum bulunamadı" });
    res.status(200).json({ message: "Yorum onaylandı" });
  } catch (err) {
    res.status(500).json({ message: "Yorum onaylanırken hata oluştu" });
  }
});

// Dashboard verileri
app.get("/api/dashboard", isAdmin, async (req, res) => {
  try {
    const toplamYorumlar = await commentsCollection().countDocuments({});
    const bekleyenOnay = await commentsCollection().countDocuments({
      onaylandi: false,
    });
    const toplamKullanici = await User.countDocuments({});

    res.status(200).json({ toplamYorumlar, bekleyenOnay, toplamKullanici });
  } catch (err) {
    res.status(500).json({ message: "Dashboard verileri alınamadı" });
  }
});

// Admin istatistik endpoint (düzeltilmiş)
app.get("/api/admin/stats", isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalComments = await commentsCollection().countDocuments();
    const pendingApprovals = await commentsCollection().countDocuments({
      onaylandi: false,
    });

    res.json({
      totalUsers: totalUsers,
      totalComments: totalComments,
      pendingApprovals: pendingApprovals,
    });
  } catch (err) {
    console.log("İstatistik endpointi hatası:", err);
    res.status(500).json({ error: "Sunucu Hatası" });
  }
});

// ------------------------------
// Yeni eklenen kullanıcı listeleme endpoint'i
// ------------------------------
app.get("/api/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Kullanıcılar alınamadı" });
  }
});

// ------------------------------
// Yeni: Ayarlar API'ları
// ------------------------------

// Ayarları al
app.get("/api/settings", isAdmin, async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Ayarlar bulunamadı." });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Ayarlar alınırken hata oluştu." });
  }
});

// Ayarları güncelle
app.put("/api/settings", isAdmin, async (req, res) => {
  try {
    const { siteName, contactEmail } = req.body;
    if (!siteName || !contactEmail) {
      return res.status(400).json({ message: "Tüm alanlar zorunludur." });
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      { siteName, contactEmail },
      { new: true, upsert: true }
    );
    res.json({
      message: "Ayarlar başarıyla güncellendi.",
      settings: updatedSettings,
    });
  } catch (err) {
    res.status(500).json({ message: "Ayarlar güncellenirken hata oluştu." });
  }
});

// Sunucu başlat
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
