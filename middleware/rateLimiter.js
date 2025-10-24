const rateLimit = require("express-rate-limit");

const createRateLimit = (windowMs, max, message, skipSuccessful = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    },
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    },
    skipSuccessfulRequests: skipSuccessful,
    skipFailedRequests: false,
  });
};

const loginRateLimit = createRateLimit(
  5 * 60 * 1000,
  5,
  "Trop de tentatives de connexion. Veuillez attendre 5 minutes avant de réessayer.",
  true
);

const registerRateLimit = createRateLimit(
  15 * 60 * 1000,
  3,
  "Trop de tentatives d'inscription. Veuillez attendre 15 minutes avant de réessayer.",
  true
);

const generalRateLimit = createRateLimit(
  15 * 60 * 1000,
  100,
  "Trop de requêtes. Veuillez attendre 15 minutes avant de réessayer.",
  false
);

const strictRateLimit = createRateLimit(
  5 * 60 * 1000,
  20,
  "Trop de requêtes. Veuillez attendre 5 minutes avant de réessayer.",
  false
);

module.exports = {
  loginRateLimit,
  registerRateLimit,
  generalRateLimit,
  strictRateLimit,
};
