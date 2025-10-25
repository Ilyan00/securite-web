const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { requireBestsellersPermission } = require("../middleware/permissions");
const { authenticateHybrid } = require("../middleware/auth");
const { getShopifyProduct } = require("../middleware/shopify");

// GET /my-bestsellers - Récupérer les meilleures ventes de l'utilisateur
router.get(
  "/",
  authenticateHybrid,
  requireBestsellersPermission,
  async (req, res) => {
    try {
      // Récupérer les produits de l'utilisateur triés par nombre de ventes (décroissant)
      const { data: products, error } = await supabase
        .from("products")
        .select(
          `
         id,
         shopify_id,
         created_by,
         sales_count,
         image_url,
         created_at
       `
        )
        .eq("created_by", req.user.id)
        .order("sales_count", { ascending: false });

      if (error) {
        console.error(
          "Erreur lors de la récupération des meilleures ventes:",
          error
        );
        return res.status(500).json({
          error: "Erreur lors de la récupération des meilleures ventes",
        });
      }

      // Enrichir les données avec les informations Shopify
      const enrichedProducts = await Promise.all(
        products.map(async (product) => {
          // Vérifier que l'ID Shopify est valide
          if (!product.shopify_id || product.shopify_id === "") {
            console.warn(`Produit ${product.id} n'a pas d'ID Shopify valide`);
            return {
              id: product.id,
              shopify_id: product.shopify_id,
              title: "Produit sans ID Shopify",
              price: null,
              sales_count: product.sales_count,
              image_url: product.image_url,
              created_at: product.created_at,
              shopify_status: "no_id",
            };
          }

          console.log(
            `Récupération du produit Shopify avec l'ID: ${product.shopify_id}`
          );
          const shopifyResult = await getShopifyProduct(product.shopify_id);

          if (shopifyResult.success) {
            const shopifyProduct = shopifyResult.product;
            return {
              id: product.id,
              shopify_id: product.shopify_id,
              title: shopifyProduct.title,
              price: shopifyProduct.variants[0]?.price,
              sales_count: product.sales_count,
              image_url: product.image_url,
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
              sales_count: product.sales_count,
              image_url: product.image_url,
              created_at: product.created_at,
              shopify_status: "error",
            };
          }
        })
      );

      res.json({
        message: "Meilleures ventes récupérées avec succès",
        products: enrichedProducts,
        count: enrichedProducts.length,
        user: {
          id: req.user.id,
          nom: req.user.nom,
          email: req.user.email,
        },
      });
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des meilleures ventes:",
        error
      );
      res.status(500).json({
        error: "Erreur interne du serveur",
      });
    }
  }
);

module.exports = router;
