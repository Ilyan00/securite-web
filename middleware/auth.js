const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const supabase = require("../config/supabase");

// Fonction pour récupérer les informations utilisateur avec son rôle
const getUserWithRole = async (userId) => {
  const { data: user, error } = await supabase
    .from("users")
    .select(
      `
      id, 
      nom, 
      email, 
      created_at,
      role_id,
      roles (
        id,
        nom,
        can_post_login,
        can_get_my_user,
        can_get_users,
        can_post_products,
        can_get_products,
        can_upload_images,
        can_get_bestsellers
      )
    `
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    return null;
  }
  return user;
};

// Middleware d'authentification JWT
const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        error: "Token d'accès requis. Format: Authorization: Bearer <token>",
      });
    }

    // Vérifier et décoder le token JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "votre_secret_jwt_par_defaut"
    );

    // Récupérer les informations utilisateur avec son rôle depuis la base de données
    const user = await getUserWithRole(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: "Token invalide ou utilisateur introuvable",
      });
    }

    // Ajouter les informations utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Token JWT invalide",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expiré",
      });
    } else {
      console.error("Erreur d'authentification:", error);
      return res.status(500).json({
        error: "Erreur interne du serveur",
      });
    }
  }
};

// Middleware d'authentification par clé API
const authenticateApiKey = async (req, res, next) => {
  try {
    // Récupérer la clé API depuis le header x-api-key
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        error: "Clé API requise. Format: x-api-key: <clé>",
      });
    }

    // Hasher la clé API pour la comparer avec celle en base
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Récupérer la clé API depuis la base de données
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("api_keys")
      .select("id, user_id, name, last_used, is_active")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return res.status(401).json({
        error: "Clé API invalide ou désactivée",
      });
    }

    // Récupérer les informations utilisateur avec son rôle
    const user = await getUserWithRole(apiKeyData.user_id);

    if (!user) {
      return res.status(401).json({
        error: "Utilisateur associé à cette clé API introuvable",
      });
    }

    // Mettre à jour la dernière utilisation de la clé API
    await supabase
      .from("api_keys")
      .update({ last_used: new Date().toISOString() })
      .eq("id", apiKeyData.id);

    // Ajouter les informations utilisateur et clé API à la requête
    req.user = user;
    req.apiKey = {
      id: apiKeyData.id,
      name: apiKeyData.name,
      lastUsed: apiKeyData.last_used,
    };
    next();
  } catch (error) {
    console.error("Erreur d'authentification par clé API:", error);
    return res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
};

// Middleware d'authentification hybride (JWT ou clé API)
const authenticateHybrid = async (req, res, next) => {
  try {
    // Vérifier d'abord si un token JWT est présent
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      // Authentification JWT
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "votre_secret_jwt_par_defaut"
      );
      const user = await getUserWithRole(decoded.userId);

      if (user) {
        req.user = user;
        req.authMethod = "jwt";
        return next();
      }
    }

    // Si pas de JWT valide, vérifier la clé API
    const apiKey = req.headers["x-api-key"];
    if (apiKey) {
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from("api_keys")
        .select("id, user_id, name, last_used, is_active")
        .eq("key_hash", keyHash)
        .eq("is_active", true)
        .single();

      if (!apiKeyError && apiKeyData) {
        const user = await getUserWithRole(apiKeyData.user_id);

        if (user) {
          // Mettre à jour la dernière utilisation
          await supabase
            .from("api_keys")
            .update({ last_used: new Date().toISOString() })
            .eq("id", apiKeyData.id);

          req.user = user;
          req.apiKey = {
            id: apiKeyData.id,
            name: apiKeyData.name,
            lastUsed: apiKeyData.last_used,
          };
          req.authMethod = "api_key";
          return next();
        }
      }
    }

    // Aucune méthode d'authentification valide trouvée
    return res.status(401).json({
      error:
        "Authentification requise. Utilisez soit Authorization: Bearer <token> soit x-api-key: <clé>",
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Token JWT invalide",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expiré",
      });
    } else {
      console.error("Erreur d'authentification hybride:", error);
      return res.status(500).json({
        error: "Erreur interne du serveur",
      });
    }
  }
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  authenticateHybrid,
};
