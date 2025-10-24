const supabase = require("../config/supabase");

// Middleware de vérification des permissions
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user) {
        return res.status(401).json({
          error: "Utilisateur non authentifié",
        });
      }

      // Récupérer le rôle de l'utilisateur avec ses permissions
      const { data: userWithRole, error } = await supabase
        .from("users")
        .select(
          `
          id,
          nom,
          email,
          role_id,
          roles (
            id,
            nom,
            can_post_login,
            can_get_my_user,
            can_get_users,
            can_post_products,
            can_get_products,
            can_upload_images,
            can_get_bestsellers
          )
        `
        )
        .eq("id", req.user.id)
        .single();

      if (error || !userWithRole) {
        return res.status(403).json({
          error: "Impossible de récupérer les permissions de l'utilisateur",
        });
      }

      // Vérifier si l'utilisateur a le rôle requis
      if (!userWithRole.roles) {
        return res.status(403).json({
          error: "Aucun rôle assigné à cet utilisateur",
        });
      }

      // Vérifier la permission spécifique
      const hasPermission = userWithRole.roles[permission];

      if (!hasPermission) {
        return res.status(403).json({
          error: `Permission insuffisante. Permission requise: ${permission}`,
          userRole: userWithRole.roles.nom,
        });
      }

      // Ajouter les informations du rôle à la requête pour utilisation ultérieure
      req.userRole = userWithRole.roles;
      req.userWithRole = userWithRole;

      next();
    } catch (error) {
      console.error("Erreur de vérification des permissions:", error);
      return res.status(500).json({
        error:
          "Erreur interne du serveur lors de la vérification des permissions",
      });
    }
  };
};

// Middleware spécifique pour chaque endpoint
const requireLoginPermission = checkPermission("can_post_login");
const requireMyUserPermission = checkPermission("can_get_my_user");
const requireUsersPermission = checkPermission("can_get_users");
const requirePostProductsPermission = checkPermission("can_post_products");
const requireGetProductsPermission = checkPermission("can_get_products");
const requireUploadImagesPermission = checkPermission("can_upload_images");
const requireBestsellersPermission = checkPermission("can_get_bestsellers");

// Middleware pour vérifier si l'utilisateur est ADMIN
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Utilisateur non authentifié",
      });
    }

    const { data: userWithRole, error } = await supabase
      .from("users")
      .select(
        `
        id,
        roles (
          nom
        )
      `
      )
      .eq("id", req.user.id)
      .single();

    if (error || !userWithRole || !userWithRole.roles) {
      return res.status(403).json({
        error: "Impossible de vérifier le rôle administrateur",
      });
    }

    if (userWithRole.roles.nom !== "ADMIN") {
      return res.status(403).json({
        error: "Accès refusé. Rôle administrateur requis",
        userRole: userWithRole.roles.nom,
      });
    }

    req.userRole = userWithRole.roles;
    next();
  } catch (error) {
    console.error("Erreur de vérification du rôle administrateur:", error);
    return res.status(500).json({
      error: "Erreur interne du serveur",
    });
  }
};

module.exports = {
  checkPermission,
  requireLoginPermission,
  requireMyUserPermission,
  requireUsersPermission,
  requirePostProductsPermission,
  requireGetProductsPermission,
  requireUploadImagesPermission,
  requireBestsellersPermission,
  requireAdmin,
};
