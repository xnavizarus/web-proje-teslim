const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();
const User = require("../../models/userModel");
// user modelin yolu

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB bağlantısı başarılı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

async function updateAdminPassword() {
  const hashedPassword = await bcrypt.hash("YeniSifren123!", 10);
  const result = await User.updateOne(
    { username: "admin" },
    { $set: { password: hashedPassword } }
  );
  console.log("Admin şifresi güncellendi:", result);
  mongoose.disconnect();
}

updateAdminPassword();
