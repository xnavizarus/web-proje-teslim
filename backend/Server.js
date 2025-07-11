const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// PORT değişkeni env veya 3000
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(cors());
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100,
  message: "Çok fazla istek yaptınız, lütfen daha sonra tekrar deneyin.",
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosya servisi
app.use(express.static(path.join(__dirname, "public")));

// Log middleware (her isteği loglar)
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

// MongoDB bağlantısı (env'den alıyor)
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Atlas bağlantısı başarılı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

// Test endpointleri
app.get("/api/test", (req, res) => {
  res.send("Backend çalışıyor. MongoDB bağlantısı aktif!");
});

app.get("/", (req, res) => {
  res.send("Backend çalışıyor. MongoDB bağlantısı aktif!");
});

app.get("/test-db", async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    res
      .status(200)
      .json({ message: "MongoDB bağlantısı çalışıyor!", collections });
  } catch (err) {
    res.status(500).json({
      message: "MongoDB bağlantı testi başarısız!",
      error: err.message,
    });
  }
});

const { ObjectId } = require("mongodb");

// Sipariş CRUD işlemleri

// Sipariş ekleme
app.post("/api/orders", async (req, res) => {
  try {
    const ordersCollection = mongoose.connection.db.collection("orders");
    const newOrder = req.body;
    const result = await ordersCollection.insertOne(newOrder);
    res.status(201).send({
      message: "Sipariş başarıyla eklendi",
      orderId: result.insertedId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Sipariş eklenirken hata oluştu" });
  }
});

// Sipariş listeleme
app.get("/api/orders", async (req, res) => {
  try {
    const ordersCollection = mongoose.connection.db.collection("orders");
    const orders = await ordersCollection.find({}).toArray();
    res.status(200).send(orders);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Siparişler listelenirken hata oluştu" });
  }
});

// ID ile sipariş detayı getirme
app.get("/api/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  if (!ObjectId.isValid(orderId))
    return res.status(400).send({ message: "Geçersiz sipariş ID'si" });
  try {
    const ordersCollection = mongoose.connection.db.collection("orders");
    const order = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    });
    if (!order) return res.status(404).send({ message: "Sipariş bulunamadı" });
    res.status(200).send(order);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Sipariş getirilirken hata oluştu" });
  }
});

// Sipariş güncelleme
app.put("/api/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  if (!ObjectId.isValid(orderId))
    return res.status(400).send({ message: "Geçersiz sipariş ID'si" });
  try {
    const ordersCollection = mongoose.connection.db.collection("orders");
    const updatedData = req.body;
    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: updatedData }
    );
    if (result.matchedCount === 0)
      return res.status(404).send({ message: "Sipariş bulunamadı" });
    res.status(200).send({ message: "Sipariş başarıyla güncellendi" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Sipariş güncellenirken hata oluştu" });
  }
});

// Sipariş silme
app.delete("/api/orders/:id", async (req, res) => {
  const orderId = req.params.id;
  if (!ObjectId.isValid(orderId))
    return res.status(400).send({ message: "Geçersiz sipariş ID'si" });
  try {
    const ordersCollection = mongoose.connection.db.collection("orders");
    const result = await ordersCollection.deleteOne({
      _id: new ObjectId(orderId),
    });
    if (result.deletedCount === 0)
      return res.status(404).send({ message: "Sipariş bulunamadı" });
    res.status(200).send({ message: "Sipariş başarıyla silindi" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Sipariş silinirken hata oluştu" });
  }
});

// Kullanıcı kayıt
app.post("/kayitOl", async (req, res) => {
  try {
    const { Ad, Soyad, Email, Sifre } = req.body;
    if (!Ad || !Soyad || !Email || !Sifre) {
      return res.status(400).send({ message: "Tüm alanları doldurun" });
    }
    const userCollection = mongoose.connection.db.collection("user");
    const mevcutKullanici = await userCollection.findOne({ Email });
    if (mevcutKullanici) {
      return res
        .status(400)
        .send({ message: "Bu email ile kayıtlı kullanıcı var" });
    }
    const hashedPassword = await bcrypt.hash(Sifre, 10);
    const yeniKullanici = {
      Ad,
      Soyad,
      Email,
      Sifre: hashedPassword,
      createdAt: new Date(),
    };
    await userCollection.insertOne(yeniKullanici);
    res.status(201).send({ message: "Kullanıcı başarıyla kaydedildi" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Kayıt olurken bir hata oluştu" });
  }
});

// Kullanıcı giriş
app.post("/girisyap", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).send({ message: "Email veya şifre gerekli" });
    const userCollection = mongoose.connection.db.collection("user");
    const mevcutKullanici = await userCollection.findOne({ Email: email });
    if (!mevcutKullanici)
      return res.status(404).send({ message: "Kullanıcı bulunamadı" });
    const SifreDogruMu = await bcrypt.compare(password, mevcutKullanici.Sifre);
    if (!SifreDogruMu) return res.status(401).send({ message: "Şifre hatalı" });
    res.status(200).send({ message: "Giriş başarılı" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Giriş yapılırken hata oluştu" });
  }
});

// Yorum koleksiyonu tanımla
const commentsCollection = () => mongoose.connection.db.collection("comments");

// Yorumları listele (GET)
app.get("/api/comments", async (req, res) => {
  try {
    const comments = await commentsCollection()
      .find({})
      .sort({ tarih: -1 })
      .toArray();
    res.status(200).json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yorumlar alınırken hata oluştu" });
  }
});

// Yeni yorum ekle (POST)
app.post("/api/comments", async (req, res) => {
  try {
    const { metin } = req.body;
    if (!metin || metin.trim() === "") {
      return res.status(400).json({ message: "Yorum metni boş olamaz" });
    }

    const yeniYorum = {
      metin,
      tarih: new Date(),
    };

    const result = await commentsCollection().insertOne(yeniYorum);
    res
      .status(201)
      .json({ message: "Yorum başarıyla eklendi", id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yorum eklenirken hata oluştu" });
  }
});

// Server dinlemesi
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
