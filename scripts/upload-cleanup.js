const fs = require("fs");
const path = require("path");

// Script de nettoyage des fichiers uploadés
const cleanupUploads = () => {
  const uploadDir = "uploads/images";
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

  if (!fs.existsSync(uploadDir)) {
    console.log("Dossier uploads/images n'existe pas");
    return;
  }

  try {
    const files = fs.readdirSync(uploadDir);
    let deletedCount = 0;
    let totalSize = 0;

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);

      // Vérifier si le fichier est plus ancien que maxAge
      if (Date.now() - stats.mtime.getTime() > maxAge) {
        const fileSize = stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
        totalSize += fileSize;
        console.log(
          `Fichier supprimé: ${file} (${(fileSize / 1024 / 1024).toFixed(
            2
          )} MB)`
        );
      }
    });

    console.log(`\nNettoyage terminé:`);
    console.log(`- Fichiers supprimés: ${deletedCount}`);
    console.log(`- Espace libéré: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error("Erreur lors du nettoyage:", error);
  }
};

// Fonction pour obtenir les statistiques des uploads
const getUploadStats = () => {
  const uploadDir = "uploads/images";

  if (!fs.existsSync(uploadDir)) {
    console.log("Dossier uploads/images n'existe pas");
    return;
  }

  try {
    const files = fs.readdirSync(uploadDir);
    let totalSize = 0;
    let fileCount = 0;

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      fileCount++;
    });

    console.log(`\nStatistiques des uploads:`);
    console.log(`- Nombre de fichiers: ${fileCount}`);
    console.log(`- Taille totale: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `- Taille moyenne: ${
        fileCount > 0 ? (totalSize / fileCount / 1024).toFixed(2) : 0
      } KB`
    );
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
  }
};

// Exécuter selon les arguments de ligne de commande
const command = process.argv[2];

switch (command) {
  case "cleanup":
    cleanupUploads();
    break;
  case "stats":
    getUploadStats();
    break;
  default:
    console.log("Usage:");
    console.log(
      "  node scripts/upload-cleanup.js cleanup  - Supprimer les fichiers anciens"
    );
    console.log(
      "  node scripts/upload-cleanup.js stats   - Afficher les statistiques"
    );
    break;
}
