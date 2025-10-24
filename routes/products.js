const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const {
  requirePostProductsPermission,
  requireGetProductsPermission,
  requireUploadImagesPermission,
} = require("../middleware/permissions");
const { authenticateHybrid } = require("../middleware/auth");
const {
  createShopifyProduct,
  getShopifyProduct,
} = require("../middleware/shopify");
const { uploadSingleImage, handleUploadError } = require("../middleware/upload");

// POST /products - Créer un nouveau produit
router.post(
  "/",
  authenticateHybrid,
  requirePostProductsPermission,
  uploadSingleImage,
  handleUploadError,
  async (req, res) => {
    try {
      const { title, price } = req.body;

      // Validation des données
      if (!title || !price) {
        return res.status(400).json({
          error: "Le titre et le prix sont requis",
        });
      }

      // Validation du prix
      const priceNumber = parseFloat(price);
      if (isNaN(priceNumber) || priceNumber <= 0) {
        return res.status(400).json({
          error: "Le prix doit être un nombre positif",
        });
      }

      // Vérifier si l'utilisateur a la permission d'uploader des images
      let imageUrl = null;
      
      // Méthode 1: Fichier uploadé
      if (req.file) {
        // Vérifier la permission d'upload d'images
        if (!req.userRole.can_upload_images) {
          return res.status(403).json({
            error: "Permission insuffisante pour uploader des images. Rôle PREMIUM requis.",
            userRole: req.userRole.nom,
          });
        }
        
        // Construire l'URL de l'image (dans un vrai projet, vous utiliseriez un CDN)
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
      }
      
      // Méthode 2: URL d'image fournie directement
      if (req.body.image_url && !imageUrl) {
        // Vérifier la permission d'upload d'images
        if (!req.userRole.can_upload_images) {
          return res.status(403).json({
            error: "Permission insuffisante pour utiliser des images. Rôle PREMIUM requis.",
            userRole: req.userRole.nom,
          });
        }
        
        imageUrl = req.body.image_url;
      }

      // Créer le produit dans Shopify
      const shopifyResult = await createShopifyProduct({
        title: title,
        price: priceNumber.toString(),
        image_url: imageUrl,
      });

      if (!shopifyResult.success) {
        return res.status(500).json({
          error: "Erreur lors de la création du produit dans Shopify",
          details: shopifyResult.error,
        });
      }

      const shopifyProduct = shopifyResult.product;

      // Enregistrer le produit dans notre base de données
      const { data: product, error } = await supabase
        .from("products")
        .insert({
          shopify_id: shopifyProduct.id.toString(),
          created_by: req.user.id,
          sales_count: 0,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur lors de l'enregistrement du produit:", error);
        return res.status(500).json({
          error:
            "Erreur lors de l'enregistrement du produit en base de données",
        });
      }

      res.status(201).json({
        message: "Produit créé avec succès",
        product: {
          id: product.id,
          shopify_id: product.shopify_id,
          title: shopifyProduct.title,
          price: shopifyProduct.variants[0]?.price,
          created_by: product.created_by,
          sales_count: product.sales_count,
          image_url: product.image_url,
          created_at: product.created_at,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la création du produit:", error);
      res.status(500).json({
        error: "Erreur interne du serveur",
      });
    }
  }
);

// GET /products - Récupérer tous les produits (pour tous les utilisateurs non-bannis)
router.get(
  "/",
  authenticateHybrid,
  requireGetProductsPermission,
  async (req, res) => {
    try {
      // Récupérer tous les produits avec les informations des créateurs
      const { data: products, error } = await supabase
        .from("products")
        .select(
          `
         id,
         shopify_id,
         created_by,
         sales_count,
         image_url,
         created_at,
         users (
           id,
           nom,
           email
         )
       `
        )
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
          // Vérifier que l'ID Shopify est valide
          if (!product.shopify_id || product.shopify_id === "") {
            console.warn(`Produit ${product.id} n'a pas d'ID Shopify valide`);
            return {
              id: product.id,
              shopify_id: product.shopify_id,
              title: "Produit sans ID Shopify",
              price: null,
              created_by: {
                id: product.users.id,
                nom: product.users.nom,
                email: product.users.email,
              },
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
              created_by: {
                id: product.users.id,
                nom: product.users.nom,
                email: product.users.email,
              },
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
              created_by: {
                id: product.users.id,
                nom: product.users.nom,
                email: product.users.email,
              },
              sales_count: product.sales_count,
              image_url: product.image_url,
              created_at: product.created_at,
              shopify_status: "error",
            };
          }
        })
      );

      res.json({
        message: "Tous les produits récupérés avec succès",
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
