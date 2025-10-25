const express = require("express");
const bcrypt = require("bcryptjs");
const { authenticateToken } = require("../middleware/auth");
const supabase = require("../config/supabase");

const router = express.Router();

// PUT /change-password - Changer le mot de passe de l'utilisateur connecté
router.put("/", authenticateToken, async (req, res) => {
  try {
    const { nouveau_mot_de_passe } = req.body;

    // Validation des données
    if (!nouveau_mot_de_passe) {
      return res.status(400).json({
        error: "Nouveau mot de passe est requis",
      });
    }

    // Récupérer l'utilisateur avec son mot de passe actuel
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, mot_de_passe")
      .eq("id", req.user.id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({
        error: "Utilisateur introuvable",
      });
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(
      nouveau_mot_de_passe,
      saltRounds
    );

    // Mettre à jour le mot de passe et le timestamp de changement
    const { error: updateError } = await supabase
      .from("users")
      .update({
        mot_de_passe: hashedNewPassword,
        password_changed_at: new Date().toISOString(),
      })
      .eq("id", req.user.id);

    if (updateError) {
      console.error("Erreur Supabase:", updateError);
      return res.status(500).json({
        error: "Erreur lors de la mise à jour du mot de passe",
      });
    }

    res.status(200).json({
      message:
        "Mot de passe modifié avec succès. Tous vos tokens JWT ont été invalidés.",
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

module.exports = router;
