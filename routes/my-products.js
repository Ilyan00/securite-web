const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { requireMyUserPermission } = require("../middleware/permissions");
const { authenticateHybrid } = require("../middleware/auth");
const { getShopifyProduct } = require("../middleware/shopify");

// GET /my-products - Récupérer les produits créés par l'utilisateur connecté
router.get(
  "/",
  authenticateHybrid,
  requireMyUserPermission,
  async (req, res) => {
    try {
      // Récupérer les produits créés par l'utilisateur
      const { data: products, error } = await supabase
        .from("products")
        .select(
          `
        id,
        shopify_id,
        created_by,
        sales_count,
        created_at
      `
        )
        .eq("created_by", req.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération des produits:", error);
        return res.status(500).json({
          error: "Erreur lors de la récupération des produits",
        });
      }

      // Enrichir les données avec les informations Shopify
      const enrichedProducts = await Promise.all(
        products.map(async (product) => {
          const shopifyResult = await getShopifyProduct(product.shopify_id);

          if (shopifyResult.success) {
            const shopifyProduct = shopifyResult.product;
            return {
              id: product.id,
              shopify_id: product.shopify_id,
              title: shopifyProduct.title,
              price: shopifyProduct.variants[0]?.price,
              created_by: product.created_by,
              sales_count: product.sales_count,
              created_at: product.created_at,
              shopify_status: shopifyProduct.status,
            };
          } else {
            // Si on ne peut pas récupérer les données Shopify, retourner les données de base
            return {
              id: product.id,
              shopify_id: product.shopify_id,
              title: "Produit non disponible",
              price: null,
              created_by: product.created_by,
              sales_count: product.sales_count,
              created_at: product.created_at,
              shopify_status: "error",
            };
          }
        })
      );

      res.json({
        message: "Produits récupérés avec succès",
        products: enrichedProducts,
        count: enrichedProducts.length,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des produits:", error);
      res.status(500).json({
        error: "Erreur interne du serveur",
      });
    }
  }
);

module.exports = router;
