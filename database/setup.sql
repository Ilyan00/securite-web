-- Script de création des tables users, roles et des modifications nécessaires
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Créer la table roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) UNIQUE NOT NULL,
    can_post_login BOOLEAN DEFAULT FALSE,
    can_get_my_user BOOLEAN DEFAULT FALSE,
    can_get_users BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer la table users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ajouter la colonne role_id à la table users (si elle n'existe pas déjà)
-- Cette ligne est nécessaire si la table users existait déjà sans cette colonne
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) DEFAULT 2;

-- 4. Créer les rôles par défaut
INSERT INTO roles (nom, can_post_login, can_get_my_user, can_get_users) VALUES
    ('ADMIN', TRUE, TRUE, TRUE),
    ('USER', TRUE, TRUE, FALSE),
    ('PREMIUM', TRUE, TRUE, FALSE),
    ('BAN', FALSE, FALSE, FALSE)
ON CONFLICT (nom) DO NOTHING;

-- 5. Créer un utilisateur ADMIN (remplacez les valeurs par vos données)
INSERT INTO users (nom, email, mot_de_passe, role_id) VALUES
    ('Admin User', 'admin@example.com', '$2b$10$example_hash_admin', 1)
ON CONFLICT (email) DO NOTHING;

-- 6. Créer un utilisateur BAN (remplacez les valeurs par vos données)
INSERT INTO users (nom, email, mot_de_passe, role_id) VALUES
    ('Banned User', 'banned@example.com', '$2b$10$example_hash_banned', 3)
ON CONFLICT (email) DO NOTHING;

-- 7. Mettre à jour tous les utilisateurs existants pour avoir le rôle USER par défaut
UPDATE users 
SET role_id = 2 
WHERE role_id IS NULL;

-- 8. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_nom ON roles(nom);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 9. Créer la table products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    shopify_id VARCHAR(255) UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    sales_count INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Ajouter les colonnes de permissions produits à la table roles
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS can_post_products BOOLEAN DEFAULT FALSE;

ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS can_get_products BOOLEAN DEFAULT FALSE;

ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS can_upload_images BOOLEAN DEFAULT FALSE;

ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS can_get_bestsellers BOOLEAN DEFAULT FALSE;

-- 11. Mettre à jour les rôles existants pour ajouter les permissions produits
UPDATE roles 
SET can_post_products = TRUE, can_get_products = TRUE, can_upload_images = TRUE, can_get_bestsellers = TRUE
WHERE nom = 'ADMIN';

UPDATE roles 
SET can_get_products = TRUE
WHERE nom = 'USER';

UPDATE roles 
SET can_post_products = TRUE, can_get_products = TRUE, can_upload_images = TRUE, can_get_bestsellers = TRUE
WHERE nom = 'PREMIUM';

-- 12. Créer un index pour améliorer les performances sur la table products
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_id);

-- 13. Créer la table api_keys pour la gestion des clés API
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 14. Créer des index pour améliorer les performances sur la table api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- 15. Ajouter la colonne image_url à la table products si elle n'existe pas déjà
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 16. Ajouter la colonne password_changed_at pour l'invalidation des tokens
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 17. Créer un index pour améliorer les performances sur password_changed_at
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);

-- 18. Pas de triggers updated_at - fonctionnalité supprimée
