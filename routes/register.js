const express = require("express");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");

const router = express.Router();

// POST /register - Inscription d'un nouvel utilisateur
router.post("/", async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;

    // Validation des données
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({
        error: "Tous les champs sont requis (nom, email, mot_de_passe)",
      });
    }

    // Vérifier si l'utilisateur existe déjà
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

    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(mot_de_passe, saltRounds);

    // Insérer le nouvel utilisateur
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

    // Retourner les données de l'utilisateur (sans le mot de passe)
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
