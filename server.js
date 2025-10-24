const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  "/uploads",
  express.static("uploads", {
    maxAge: "1d",
    etag: false,
    lastModified: false,
  })
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use((req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
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

app.use("/api/register", registerRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/my-user", myUserRoutes);
app.use("/api/get-users", getUsersRoutes);
app.use("/api/change-password", changePasswordRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/my-products", myProductsRoutes);
app.use("/api/my-bestsellers", myBestsellersRoutes);
app.use("/api/api-keys", apiKeysRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use("*", (req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

app.use((err, req, res, next) => {
  console.error("Erreur non gérée:", err);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

process.on("uncaughtException", (err) => {
  console.error("Exception non capturée:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promesse rejetée non gérée:", reason);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`Serveur sécurisé démarré sur le port ${PORT}`);
});
