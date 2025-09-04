const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Aynı kullanıcı adı tekrar olmasın diye
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"], // Rolleri tanımla
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Şifreyi kaydetmeden önce hashle
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10); // 10 saltRounds
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
