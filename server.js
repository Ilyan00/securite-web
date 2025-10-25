const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques (images uploadées)
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/health", (req, res) => {
  res.json({ test: "hello world" });
});

// Import des routes
const registerRoutes = require("./routes/register");
const loginRoutes = require("./routes/login");
const myUserRoutes = require("./routes/my-user");
const getUsersRoutes = require("./routes/get-users");
const changePasswordRoutes = require("./routes/change-password");
const productsRoutes = require("./routes/products");
const myProductsRoutes = require("./routes/my-products");
const myBestsellersRoutes = require("./routes/my-bestsellers");
const apiKeysRoutes = require("./routes/api-keys");
const webhooksRoutes = require("./routes/webhooks");

app.use("/register", registerRoutes);
app.use("/login", loginRoutes);
app.use("/my-user", myUserRoutes);
app.use("/get-users", getUsersRoutes);
app.use("/change-password", changePasswordRoutes);
app.use("/products", productsRoutes);
app.use("/my-products", myProductsRoutes);
app.use("/my-bestsellers", myBestsellersRoutes);
app.use("/api-keys", apiKeysRoutes);
app.use("/webhooks", webhooksRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
