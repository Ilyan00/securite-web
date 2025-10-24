# Rôle PREMIUM - Nouvelles Fonctionnalités

## Vue d'ensemble

Le rôle PREMIUM a été ajouté au système avec les permissions suivantes :
- `can_post_products`: TRUE
- `can_get_products`: TRUE  
- `can_upload_images`: TRUE
- `can_get_bestsellers`: TRUE

## Nouvelles Fonctionnalités

### 1. Upload d'Images dans la Création de Produits

**Endpoint:** `POST /products`

**Permissions requises:** Rôle PREMIUM ou ADMIN

**Fonctionnalité:** Permet d'uploader une image lors de la création d'un produit.

**Utilisation:**
```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Mon Produit Premium" \
  -F "price=29.99" \
  -F "image=@/path/to/image.jpg"
```

**Réponse:**
```json
{
  "message": "Produit créé avec succès",
  "product": {
    "id": 123,
    "shopify_id": "456789",
    "title": "Mon Produit Premium",
    "price": "29.99",
    "created_by": 1,
    "sales_count": 0,
    "image_url": "http://localhost:3000/uploads/images/image-1234567890-123456789.jpg",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

**Restrictions:**
- Formats acceptés: jpeg, jpg, png, gif, webp
- Taille maximale: 5MB
- Un seul fichier par requête

### 2. Endpoint Meilleures Ventes

**Endpoint:** `GET /my-bestsellers`

**Permissions requises:** Rôle PREMIUM ou ADMIN

**Fonctionnalité:** Retourne les produits de l'utilisateur triés par nombre de ventes (décroissant).

**Utilisation:**
```bash
curl -X GET http://localhost:3000/my-bestsellers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
{
  "message": "Meilleures ventes récupérées avec succès",
  "products": [
    {
      "id": 123,
      "shopify_id": "456789",
      "title": "Produit le plus vendu",
      "price": "29.99",
      "sales_count": 150,
      "image_url": "http://localhost:3000/uploads/images/image-1234567890-123456789.jpg",
      "created_at": "2024-01-01T12:00:00Z",
      "shopify_status": "active"
    }
  ],
  "count": 1,
  "user": {
    "id": 1,
    "nom": "Utilisateur Premium",
    "email": "premium@example.com"
  }
}
```

## Configuration de la Base de Données

Pour activer le rôle PREMIUM, exécutez le script SQL suivant dans Supabase :

```sql
-- Ajouter le rôle PREMIUM
INSERT INTO roles (nom, can_post_login, can_get_my_user, can_get_users, can_post_products, can_get_products, can_upload_images, can_get_bestsellers) 
VALUES ('PREMIUM', TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (nom) DO NOTHING;

-- Ajouter les nouvelles colonnes de permissions
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS can_upload_images BOOLEAN DEFAULT FALSE;

ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS can_get_bestsellers BOOLEAN DEFAULT FALSE;

-- Ajouter la colonne image_url à la table products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Mettre à jour les permissions pour tous les rôles
UPDATE roles 
SET can_post_products = TRUE, can_get_products = TRUE, can_upload_images = TRUE, can_get_bestsellers = TRUE
WHERE nom = 'ADMIN';

UPDATE roles 
SET can_post_products = TRUE, can_get_products = TRUE, can_upload_images = TRUE, can_get_bestsellers = TRUE
WHERE nom = 'PREMIUM';
```

## Gestion des Erreurs

### Erreurs d'Upload d'Images

**403 Forbidden - Permission insuffisante:**
```json
{
  "error": "Permission insuffisante pour uploader des images. Rôle PREMIUM requis.",
  "userRole": "USER"
}
```

**400 Bad Request - Fichier invalide:**
```json
{
  "error": "Seules les images sont autorisées (jpeg, jpg, png, gif, webp)"
}
```

**400 Bad Request - Fichier trop volumineux:**
```json
{
  "error": "Fichier trop volumineux. Taille maximale autorisée: 5MB"
}
```

### Erreurs d'Accès aux Meilleures Ventes

**403 Forbidden - Permission insuffisante:**
```json
{
  "error": "Permission insuffisante. Permission requise: can_get_bestsellers",
  "userRole": "USER"
}
```

## Structure des Fichiers

```
uploads/
└── images/
    ├── image-1234567890-123456789.jpg
    └── image-1234567890-987654321.png
```

Les images sont stockées dans le dossier `uploads/images/` avec des noms de fichiers uniques générés automatiquement.

## Notes Importantes

1. **Sécurité:** Dans un environnement de production, utilisez un CDN ou un service de stockage cloud pour les images.

2. **Performance:** L'endpoint `/my-bestsellers` fonctionne même si les webhooks Shopify ne marchent pas, car il utilise les données locales de `sales_count`.

3. **Permissions:** Seuls les utilisateurs avec le rôle PREMIUM ou ADMIN peuvent utiliser ces fonctionnalités.

4. **Compatibilité:** Les utilisateurs avec le rôle USER peuvent toujours créer des produits sans images et consulter la liste générale des produits.
