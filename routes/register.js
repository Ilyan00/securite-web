const express = require("express");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { registerRateLimit } = require("../middleware/rateLimiter");
const { validateRegister } = require("../middleware/validation");

const router = express.Router();

router.post("/", registerRateLimit, validateRegister, async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;

    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        error: "Un utilisateur avec cet email existe déjà",
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(mot_de_passe, saltRounds);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          nom: nom,
          email: email,
          mot_de_passe: hashedPassword,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Erreur Supabase:", error);
      return res.status(500).json({
        error: "Erreur lors de la création de l'utilisateur",
      });
    }

    const user = data[0];
    delete user.mot_de_passe;

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: user,
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

module.exports = router;
