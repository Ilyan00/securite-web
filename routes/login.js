const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { loginRateLimit } = require("../middleware/rateLimiter");
const { validateLogin } = require("../middleware/validation");

const router = express.Router();

router.post("/", loginRateLimit, validateLogin, async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select(
        `
        id, 
        nom, 
        email, 
        mot_de_passe,
        role_id,
        roles (
          id,
          nom,
          can_post_login,
          can_get_my_user,
          can_get_users
        )
      `
      )
      .eq("email", email)
      .single();

    if (fetchError || !user) {
      return res.status(401).json({
        error: "Email ou mot de passe incorrect",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      mot_de_passe,
      user.mot_de_passe
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Email ou mot de passe incorrect",
      });
    }

    if (!user.roles || !user.roles.can_post_login) {
      return res.status(403).json({
        error:
          "Accès refusé. Votre compte n'a pas la permission de se connecter",
        userRole: user.roles ? user.roles.nom : "Aucun rôle",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET non configuré");
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        nom: user.nom,
        role: user.roles.nom,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const userResponse = {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.roles.nom,
    };

    res.status(200).json({
      message: "Connexion réussie",
      token: token,
      user: userResponse,
      expiresIn: "1h",
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

module.exports = router;
