const crypto = require("crypto");

const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

const generateApiKey = () => {
  const prefix = "sk_";
  const randomPart = crypto.randomBytes(24).toString("hex");
  return `${prefix}${randomPart}`;
};

const hashApiKey = (apiKey) => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const constantTimeCompare = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};

const sanitizeInput = (input) => {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>\"']/g, "");
};

const validateUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

module.exports = {
  generateSecureToken,
  generateApiKey,
  hashApiKey,
  generateCSRFToken,
  constantTimeCompare,
  sanitizeInput,
  validateUUID,
};

