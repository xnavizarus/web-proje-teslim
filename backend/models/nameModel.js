const mongoose = require("mongoose");

const nameSchema = new mongoose.Schema({
  ad: {
    type: String,
    required: true,
  },
  soyad: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Name", nameSchema);
