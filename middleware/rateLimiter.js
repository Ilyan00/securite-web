const rateLimit = require("express-rate-limit");

// Configuration du rate limiting pour les tentatives de connexion
const loginRateLimit = rateLimit({
  windowMs: 5 * 1000, // Fenêtre de 5 secondes
  max: 3, // Maximum 1 tentative par fenêtre
  message: {
    error:
      "Trop de tentatives de connexion. Veuillez attendre 5 secondes avant de réessayer.",
    retryAfter: 5,
  },
  standardHeaders: true, // Retourne les headers de rate limit dans la réponse
  legacyHeaders: false, // Désactive les headers X-RateLimit-*
  // Fonction pour générer la clé unique (par IP)
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  // Fonction appelée quand la limite est dépassée
  handler: (req, res) => {
    res.status(429).json({
      error:
        "Trop de tentatives de connexion. Veuillez attendre 5 secondes avant de réessayer.",
      retryAfter: 5,
      timestamp: new Date().toISOString(),
    });
  },
  // Skip successful requests (ne compte que les échecs)
  skipSuccessfulRequests: true,
  // Skip failed requests (ne compte que les requêtes qui arrivent jusqu'au handler)
  skipFailedRequests: false,
});

module.exports = { loginRateLimit };
