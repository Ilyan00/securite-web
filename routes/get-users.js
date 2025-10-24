const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { requireUsersPermission } = require("../middleware/permissions");
const supabase = require("../config/supabase");
const router = express.Router();

// GET /get-users - Récupérer les informations de tous les utilisateurs
router.get("/", authenticateToken, requireUsersPermission, async (req, res) => {
  try {
    const { data: users } = await supabase
      .from("users")
      .select("id, nom, email, created_at");
    return res.status(200).json({
      message: "Utilisateurs récupérés avec succès",
      users: users,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});
module.exports = router;
