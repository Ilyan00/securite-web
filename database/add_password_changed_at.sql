-- Script pour ajouter la colonne password_changed_at aux utilisateurs existants
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Ajouter la colonne password_changed_at si elle n'existe pas déjà
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Mettre à jour tous les utilisateurs existants pour avoir la date de création comme password_changed_at
-- (car ils n'ont jamais changé de mot de passe)
UPDATE users 
SET password_changed_at = created_at 
WHERE password_changed_at IS NULL;

-- 3. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at);
