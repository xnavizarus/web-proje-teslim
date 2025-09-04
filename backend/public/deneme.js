const express = require("express");
const Router = express.Router();
const productController = require("../controllers/productController");

router.get("/", productController.listProducts);
router.get("/:id", productController.productDetail);
router.get("/api/json", productController.listProductsJSON); // REST API
module.exports = router;

const db = require("../db/db");

module.exports = {
  listProducts: async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = 5;
    let offset = (page - 1) * limit;
    try {
      const [rows] = await db.query("SELECT * FROM products LIMIT ? OFFSET ?", [
        limit,
        offset,
      ]);
      res.render("products", { products: rows, page });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  productDetail: async (req, res) => {
    const id = req.params.id;
    try {
      const [rows] = await db.query("SELECT * FROM products WHERE id=?", [id]);
      if (rows.length === 0) return res.status(404).send("Ürün bulunamadı");
      res.render("product", { product: rows[0] });
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  listProductsJSON: async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM products");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.get("/", adminController.dashboard);
router.get("/products/add", adminController.addProductPage);
router.post("/products/add", adminController.addProduct);
router.get("/products/edit/:id", adminController.editProductPage);
router.post("/products/edit/:id", adminController.editProduct);
router.post("/products/delete/:id", adminController.deleteProduct);

module.exports = router;

const db = require("../db/db");

module.exports = {
  dashboard: async (req, res) => {
    const [rows] = await db.query("SELECT * FROM products");
    res.render("admin/dashboard", { products: rows });
  },
  addProductPage: (req, res) => res.render("admin/addProduct"),
  addProduct: async (req, res) => {
    const { name, price, description } = req.body;
    try {
      await db.query(
        "INSERT INTO products (name,price,description) VALUES (?,?,?)",
        [name, price, description]
      );
      res.redirect("/admin");
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  editProductPage: async (req, res) => {
    const id = req.params.id;
    const [rows] = await db.query("SELECT * FROM products WHERE id=?", [id]);
    res.render("admin/editProduct", { product: rows[0] });
  },
  editProduct: async (req, res) => {
    const id = req.params.id;
    const { name, price, description } = req.body;
    try {
      await db.query(
        "UPDATE products SET name=?,price=?,description=? WHERE id=?",
        [name, price, description, id]
      );
      res.redirect("/admin");
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
  deleteProduct: async (req, res) => {
    const id = req.params.id;
    try {
      await db.query("DELETE FROM products WHERE id=?", [id]);
      res.redirect("/admin");
    } catch (err) {
      res.status(500).send(err.message);
    }
  },
};
