const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const supabase = require("../config/supabase");
const { authenticateToken } = require("../middleware/auth");

// POST /api-keys - Créer une nouvelle clé API
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    // Validation des données
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Le nom de la clé API est requis",
      });
    }

    // Vérifier que le nom n'est pas trop long
    if (name.length > 100) {
      return res.status(400).json({
        error: "Le nom de la clé API ne peut pas dépasser 100 caractères",
      });
    }

    // Vérifier qu'il n'y a pas déjà une clé avec ce nom pour cet utilisateur
    const { data: existingKey, error: checkError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("name", name.trim())
      .eq("is_active", true)
      .single();

    if (existingKey) {
      return res.status(409).json({
        error: "Une clé API avec ce nom existe déjà",
      });
    }

    // Générer une clé API unique
    const apiKey = `sk_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Enregistrer la clé API dans la base de données
    const { data: newApiKey, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        key_hash: keyHash,
        is_active: true,
      })
      .select("id, name, created_at")
      .single();

    if (error) {
      console.error("Erreur lors de la création de la clé API:", error);
      return res.status(500).json({
        error: "Erreur lors de la création de la clé API",
      });
    }

    res.status(201).json({
      message: "Clé API créée avec succès",
      apiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        key: apiKey, // Retourner la clé seulement lors de la création
        created_at: newApiKey.created_at,
      },
      warning:
        "Conservez cette clé API en sécurité, elle ne sera plus affichée",
    });
  } catch (error) {
    console.error("Erreur lors de la création de la clé API:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

// GET /api-keys - Récupérer toutes les clés API de l'utilisateur
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { data: apiKeys, error } = await supabase
      .from("api_keys")
      .select("id, name, last_used, created_at, is_active")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des clés API:", error);
      return res.status(500).json({
        error: "Erreur lors de la récupération des clés API",
      });
    }

    res.json({
      message: "Clés API récupérées avec succès",
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        last_used: key.last_used,
        created_at: key.created_at,
        is_active: key.is_active,
      })),
      count: apiKeys.length,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des clés API:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

// GET /api-keys/:id - Récupérer une clé API spécifique
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        error: "ID de clé API invalide",
      });
    }

    const { data: apiKey, error } = await supabase
      .from("api_keys")
      .select("id, name, last_used, created_at, is_active")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (error || !apiKey) {
      return res.status(404).json({
        error: "Clé API introuvable",
      });
    }

    res.json({
      message: "Clé API récupérée avec succès",
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        last_used: apiKey.last_used,
        created_at: apiKey.created_at,
        is_active: apiKey.is_active,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la clé API:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

// PUT /api-keys/:id - Mettre à jour une clé API (renommer)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validation de l'ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        error: "ID de clé API invalide",
      });
    }

    // Validation des données
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Le nom de la clé API est requis",
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        error: "Le nom de la clé API ne peut pas dépasser 100 caractères",
      });
    }

    // Vérifier que la clé API existe et appartient à l'utilisateur
    const { data: existingKey, error: checkError } = await supabase
      .from("api_keys")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .eq("is_active", true)
      .single();

    if (checkError || !existingKey) {
      return res.status(404).json({
        error: "Clé API introuvable",
      });
    }

    // Vérifier qu'il n'y a pas déjà une autre clé avec ce nom pour cet utilisateur
    const { data: duplicateKey, error: duplicateError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("name", name.trim())
      .eq("is_active", true)
      .neq("id", id)
      .single();

    if (duplicateKey) {
      return res.status(409).json({
        error: "Une clé API avec ce nom existe déjà",
      });
    }

    // Mettre à jour la clé API
    const { data: updatedKey, error } = await supabase
      .from("api_keys")
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id, name, last_used, created_at, is_active")
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour de la clé API:", error);
      return res.status(500).json({
        error: "Erreur lors de la mise à jour de la clé API",
      });
    }

    res.json({
      message: "Clé API mise à jour avec succès",
      apiKey: {
        id: updatedKey.id,
        name: updatedKey.name,
        last_used: updatedKey.last_used,
        created_at: updatedKey.created_at,
        is_active: updatedKey.is_active,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la clé API:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

// DELETE /api-keys/:id - Supprimer (désactiver) une clé API
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        error: "ID de clé API invalide",
      });
    }

    // Vérifier que la clé API existe et appartient à l'utilisateur
    const { data: existingKey, error: checkError } = await supabase
      .from("api_keys")
      .select("id, name")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .eq("is_active", true)
      .single();

    if (checkError || !existingKey) {
      return res.status(404).json({
        error: "Clé API introuvable",
      });
    }

    // Désactiver la clé API (soft delete)
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) {
      console.error("Erreur lors de la suppression de la clé API:", error);
      return res.status(500).json({
        error: "Erreur lors de la suppression de la clé API",
      });
    }

    res.json({
      message: "Clé API supprimée avec succès",
      deletedKey: {
        id: existingKey.id,
        name: existingKey.name,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la clé API:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
});

module.exports = router;
