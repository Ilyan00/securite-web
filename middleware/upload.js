const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Extensions autorisées (en minuscules)
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Types MIME autorisés
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Fonction pour nettoyer et sécuriser le nom de fichier
const sanitizeFilename = (originalname) => {
  // Supprimer les caractères dangereux et garder seulement alphanumériques, tirets et points
  const cleanName = originalname.replace(/[^a-zA-Z0-9.-]/g, "");
  // Limiter la longueur
  return cleanName.substring(0, 50);
};

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = "uploads/images";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Générer un nom de fichier sécurisé
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString("hex");
    const sanitizedName = sanitizeFilename(file.originalname);
    const extension = path.extname(file.originalname).toLowerCase();

    // Vérifier que l'extension est autorisée
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return cb(new Error(`Extension non autorisée: ${extension}`));
    }

    // Créer un nom de fichier sécurisé
    const secureFilename = `img-${timestamp}-${randomBytes}${extension}`;
    cb(null, secureFilename);
  },
});

// Filtre sécurisé pour accepter seulement les images
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  // Vérifier l'extension
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(
      new Error(
        `Extension non autorisée: ${extension}. Extensions autorisées: ${ALLOWED_EXTENSIONS.join(
          ", "
        )}`
      )
    );
  }

  // Vérifier le type MIME
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return cb(
      new Error(
        `Type MIME non autorisé: ${mimetype}. Types autorisés: ${ALLOWED_MIME_TYPES.join(
          ", "
        )}`
      )
    );
  }

  // Vérifier que l'extension correspond au type MIME
  const extensionMimeMap = {
    ".jpg": ["image/jpeg", "image/jpg"],
    ".jpeg": ["image/jpeg", "image/jpg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".webp": ["image/webp"],
  };

  if (!extensionMimeMap[extension]?.includes(mimetype)) {
    return cb(
      new Error(
        `L'extension ${extension} ne correspond pas au type MIME ${mimetype}`
      )
    );
  }

  // Vérifier la taille du nom de fichier
  if (file.originalname.length > 255) {
    return cb(
      new Error("Le nom de fichier est trop long (maximum 255 caractères)")
    );
  }

  cb(null, true);
};

// Configuration de multer avec limites sécurisées
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB
    files: 1, // Un seul fichier par requête
    fields: 10, // Maximum 10 champs de formulaire
    fieldNameSize: 100, // Taille max du nom de champ
    fieldSize: 1000000, // Taille max de la valeur du champ (1MB)
  },
  fileFilter: fileFilter,
});

// Middleware pour uploader une seule image
const uploadSingleImage = upload.single("image");

// Middleware pour gérer les erreurs d'upload de manière sécurisée
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          error: "Fichier trop volumineux. Taille maximale autorisée: 10MB",
          code: "FILE_TOO_LARGE",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          error: "Trop de fichiers. Un seul fichier autorisé par requête",
          code: "TOO_MANY_FILES",
        });
      case "LIMIT_FIELD_COUNT":
        return res.status(400).json({
          error: "Trop de champs dans le formulaire",
          code: "TOO_MANY_FIELDS",
        });
      case "LIMIT_FIELD_NAME":
        return res.status(400).json({
          error: "Nom de champ trop long",
          code: "FIELD_NAME_TOO_LONG",
        });
      case "LIMIT_FIELD_VALUE":
        return res.status(400).json({
          error: "Valeur de champ trop longue",
          code: "FIELD_VALUE_TOO_LONG",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          error: "Champ de fichier inattendu",
          code: "UNEXPECTED_FILE",
        });
      default:
        return res.status(400).json({
          error: "Erreur lors de l'upload du fichier",
          code: "UPLOAD_ERROR",
          details: error.message,
        });
    }
  } else if (error) {
    // Erreurs de validation personnalisées
    return res.status(400).json({
      error: error.message,
      code: "VALIDATION_ERROR",
    });
  }
  next();
};

module.exports = {
  uploadSingleImage,
  handleUploadError,
};
