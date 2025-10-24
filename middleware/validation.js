const validator = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  password: (password) => {
    if (!password || password.length < 8) {
      return {
        valid: false,
        message: "Le mot de passe doit contenir au moins 8 caractères",
      };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return {
        valid: false,
        message: "Le mot de passe doit contenir au moins une minuscule",
      };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        valid: false,
        message: "Le mot de passe doit contenir au moins une majuscule",
      };
    }
    if (!/(?=.*\d)/.test(password)) {
      return {
        valid: false,
        message: "Le mot de passe doit contenir au moins un chiffre",
      };
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return {
        valid: false,
        message:
          "Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)",
      };
    }
    return { valid: true };
  },

  sanitizeString: (str) => {
    if (typeof str !== "string") return "";
    return str.trim().replace(/[<>]/g, "");
  },

  validateRequired: (fields, data) => {
    const missing = [];
    for (const field of fields) {
      if (
        !data[field] ||
        (typeof data[field] === "string" && !data[field].trim())
      ) {
        missing.push(field);
      }
    }
    return missing;
  },
};

const validateLogin = (req, res, next) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) {
    return res.status(400).json({
      error: "Email et mot de passe sont requis",
    });
  }

  if (!validator.email(email)) {
    return res.status(400).json({
      error: "Format d'email invalide",
    });
  }

  req.body.email = validator.sanitizeString(email.toLowerCase());
  next();
};

const validateRegister = (req, res, next) => {
  const { nom, email, mot_de_passe } = req.body;

  const missing = validator.validateRequired(
    ["nom", "email", "mot_de_passe"],
    req.body
  );
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Champs requis manquants: ${missing.join(", ")}`,
    });
  }

  if (!validator.email(email)) {
    return res.status(400).json({
      error: "Format d'email invalide",
    });
  }

  const passwordValidation = validator.password(mot_de_passe);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      error: passwordValidation.message,
    });
  }

  if (nom.length < 2 || nom.length > 50) {
    return res.status(400).json({
      error: "Le nom doit contenir entre 2 et 50 caractères",
    });
  }

  req.body.email = validator.sanitizeString(email.toLowerCase());
  req.body.nom = validator.sanitizeString(nom);
  next();
};

const validateChangePassword = (req, res, next) => {
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

  const missing = validator.validateRequired(
    ["ancien_mot_de_passe", "nouveau_mot_de_passe"],
    req.body
  );
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Champs requis manquants: ${missing.join(", ")}`,
    });
  }

  const passwordValidation = validator.password(nouveau_mot_de_passe);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      error: passwordValidation.message,
    });
  }

  if (ancien_mot_de_passe === nouveau_mot_de_passe) {
    return res.status(400).json({
      error: "Le nouveau mot de passe doit être différent de l'ancien",
    });
  }

  next();
};

module.exports = {
  validator,
  validateLogin,
  validateRegister,
  validateChangePassword,
};

