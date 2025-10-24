const express = require("express");
const { authenticateHybrid } = require("../middleware/auth");
const { requireMyUserPermission } = require("../middleware/permissions");

const router = express.Router();

// GET /my-user - Récupérer les informations de l'utilisateur connecté
router.get("/", authenticateHybrid, requireMyUserPermission, (req, res) => {
  try {
    // Les informations utilisateur sont déjà disponibles dans req.user grâce au middleware
    const userInfo = {
      id: req.user.id,
      nom: req.user.nom,
      email: req.user.email,
      created_at: req.user.created_at,
    };

    res.status(200).json({
      message: "Informations utilisateur récupérées avec succès",
      user: userInfo,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des informations utilisateur:",
      error
    );
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

module.exports = router;
