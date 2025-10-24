const express = require("express");
const crypto = require("crypto");
const supabase = require("../config/supabase");

const router = express.Router();

// Middleware pour vérifier la signature HMAC de Shopify
const verifyShopifyWebhook = (req, res, next) => {
  try {
    const hmac = req.get("X-Shopify-Hmac-Sha256");
    const body = JSON.stringify(req.body);
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // TEMPORAIRE : Désactiver la vérification HMAC pour les tests
    if (process.env.DISABLE_HMAC_VERIFICATION === "true") {
      console.log("⚠️  Vérification HMAC désactivée pour les tests");
      return next();
    }

    if (!hmac || !secret) {
      console.error("Signature HMAC ou secret manquant");
      return res.status(401).json({ error: "Signature HMAC manquante" });
    }

    // Calculer la signature HMAC
    const calculatedHmac = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    // Comparer les signatures
    if (hmac !== calculatedHmac) {
      console.error("Signature HMAC invalide");
      return res.status(401).json({ error: "Signature HMAC invalide" });
    }

    next();
  } catch (error) {
    console.error("Erreur lors de la vérification HMAC:", error);
    return res.status(500).json({ error: "Erreur de vérification" });
  }
};

// Endpoint POST /webhooks/shopify-sales
router.post("/shopify-sales", verifyShopifyWebhook, async (req, res) => {
  try {
    console.log("Webhook Shopify reçu:", JSON.stringify(req.body, null, 2));

    const order = req.body;

    // Vérifier que c'est bien une commande créée
    if (!order || !order.line_items || !Array.isArray(order.line_items)) {
      console.log("Commande invalide ou sans articles");
      return res.status(400).json({ error: "Commande invalide" });
    }

    // Traiter chaque article de la commande
    const updatePromises = order.line_items.map(async (lineItem) => {
      try {
        // Récupérer le produit par son shopify_id
        const { data: product, error: fetchError } = await supabase
          .from("products")
          .select("id, sales_count")
          .eq("shopify_id", lineItem.product_id.toString())
          .single();

        if (fetchError) {
          console.error(
            `Erreur lors de la récupération du produit ${lineItem.product_id}:`,
            fetchError
          );
          return null;
        }

        if (!product) {
          console.log(
            `Produit ${lineItem.product_id} non trouvé dans la base de données`
          );
          return null;
        }

        // Incrémenter le compteur de ventes avec la quantité
        const newSalesCount = product.sales_count + lineItem.quantity;

        const { error: updateError } = await supabase
          .from("products")
          .update({ sales_count: newSalesCount })
          .eq("id", product.id);

        if (updateError) {
          console.error(
            `Erreur lors de la mise à jour du produit ${product.id}:`,
            updateError
          );
          return null;
        }

        console.log(
          `Produit ${product.id} mis à jour: ${product.sales_count} + ${lineItem.quantity} = ${newSalesCount}`
        );
        return {
          productId: product.id,
          shopifyId: lineItem.product_id,
          quantity: lineItem.quantity,
          newSalesCount,
        };
      } catch (error) {
        console.error(
          `Erreur lors du traitement de l'article ${lineItem.product_id}:`,
          error
        );
        return null;
      }
    });

    // Attendre que toutes les mises à jour soient terminées
    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter((result) => result !== null);

    console.log(
      `Traitement terminé: ${successfulUpdates.length} produits mis à jour`
    );

    res.status(200).json({
      success: true,
      message: "Webhook traité avec succès",
      processedItems: successfulUpdates.length,
      orderId: order.id,
      updates: successfulUpdates,
    });
  } catch (error) {
    console.error("Erreur lors du traitement du webhook:", error);
    res.status(500).json({
      error: "Erreur interne du serveur",
      message: error.message,
    });
  }
});

module.exports = router;
