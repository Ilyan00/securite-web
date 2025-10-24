const express = require("express");
const bcrypt = require("bcryptjs");
const { authenticateToken } = require("../middleware/auth");
const { validateChangePassword } = require("../middleware/validation");
const { strictRateLimit } = require("../middleware/rateLimiter");
const supabase = require("../config/supabase");

const router = express.Router();

router.put(
  "/",
  strictRateLimit,
  authenticateToken,
  validateChangePassword,
  async (req, res) => {
    try {
      const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

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

      const isOldPasswordValid = await bcrypt.compare(
        ancien_mot_de_passe,
        user.mot_de_passe
      );
      if (!isOldPasswordValid) {
        return res.status(401).json({
          error: "Ancien mot de passe incorrect",
        });
      }

      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(
        nouveau_mot_de_passe,
        saltRounds
      );

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
        message: "Mot de passe modifié avec succès",
      });
    } catch (error) {
      console.error("Erreur serveur:", error);
      res.status(500).json({
        error: "Erreur interne du serveur",
      });
    }
  }
);

module.exports = router;
