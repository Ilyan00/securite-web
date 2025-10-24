const axios = require('axios');

// Configuration Shopify
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN; // Votre domaine de boutique Shopify
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN; // Token d'accès privé de votre app

// Middleware pour créer un produit dans Shopify
const createShopifyProduct = async (productData) => {
  try {
    const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2023-10/products.json`;
    
    const productPayload = {
      product: {
        title: productData.title,
        variants: [
          {
            price: productData.price
          }
        ]
      }
    };

    // Ajouter l'image si elle est fournie
    if (productData.image_url) {
      productPayload.product.images = [
        {
          src: productData.image_url
        }
      ];
    }
    
    const response = await axios.post(url, productPayload, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      product: response.data.product
    };
  } catch (error) {
    console.error('Erreur lors de la création du produit Shopify:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

// Middleware pour récupérer un produit depuis Shopify
const getShopifyProduct = async (productId) => {
  try {
    const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2023-10/products/${productId}.json`;
    
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      product: response.data.product
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du produit Shopify:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

module.exports = {
  createShopifyProduct,
  getShopifyProduct
};
