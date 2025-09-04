const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../../models/userModel"); // senin user modelin
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    const newPassword = "GucLu$Sifre2025!"; // admin şifresi
    const hash = await bcrypt.hash(newPassword, 10);

    const result = await User.updateOne(
      { username: "admin" },
      { $set: { password: hash } }
    );
    console.log("Admin şifresi güncellendi!", result);
    process.exit();
  })
  .catch(console.error);
