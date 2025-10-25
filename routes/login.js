const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { loginRateLimit } = require("../middleware/rateLimiter");

const router = express.Router();

// POST /login - Connexion d'un utilisateur et génération d'un token JWT
router.post("/", loginRateLimit, async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    // Validation des données
    if (!email || !mot_de_passe) {
      return res.status(400).json({
        error: "Email et mot de passe sont requis",
      });
    }

    // Récupérer l'utilisateur par email avec son rôle
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

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(
      mot_de_passe,
      user.mot_de_passe
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier si l'utilisateur a la permission de se connecter
    if (!user.roles || !user.roles.can_post_login) {
      return res.status(403).json({
        error:
          "Accès refusé. Votre compte n'a pas la permission de se connecter",
        userRole: user.roles ? user.roles.nom : "Aucun rôle",
      });
    }

    // Générer le token JWT (valable 1 heure)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        nom: user.nom,
      },
      process.env.JWT_SECRET || "votre_secret_jwt_par_defaut", // Utilisez une variable d'environnement en production
      { expiresIn: "1h" }
    );

    // Retourner le token et les informations utilisateur (sans le mot de passe)
    const userResponse = {
      id: user.id,
      nom: user.nom,
      email: user.email,
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
