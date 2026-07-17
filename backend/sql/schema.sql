CREATE DATABASE IF NOT EXISTS monapp_db;
USE monapp_db;

/* 1. UTILISATEURS */
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  telephone VARCHAR(20) UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  est_actif TINYINT(1) DEFAULT 1,
  derniere_connexion DATETIME,
  photo VARCHAR(255) DEFAULT NULL,
  profil VARCHAR(20) DEFAULT 'user',
  tentatives_echec INT DEFAULT 0,
  bloque_jusqua DATETIME DEFAULT NULL,
  periode_budget VARCHAR(20) DEFAULT 'mensuel',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* 2. COMPTES */
CREATE TABLE IF NOT EXISTS comptes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  nom_compte VARCHAR(100) NOT NULL,
  type_compte ENUM('banque', 'momo', 'especes', 'autre') NOT NULL,
  type_personnalise VARCHAR(100) DEFAULT NULL,
  solde_initial DECIMAL(15,2) DEFAULT 0.00,
  solde_actuel DECIMAL(15,2) DEFAULT 0.00,
  devise VARCHAR(10) DEFAULT 'XAF',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

/* 3. CATEGORIES UNIFIEES */
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NULL,
  libelle VARCHAR(100) NOT NULL,
  type ENUM('revenu', 'depense') NOT NULL,
  icone VARCHAR(50) DEFAULT '📦',
  couleur VARCHAR(7) DEFAULT '#7C3AED',
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

/* 4. REVENUS */
CREATE TABLE IF NOT EXISTS revenus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  compte_id INT NOT NULL,
  categorie_id INT NULL,
  libelle VARCHAR(150) NOT NULL,
  montant DECIMAL(15,2) NOT NULL,
  date_revenu DATE NOT NULL,
  recurrent TINYINT(1) DEFAULT 0,
  frequence ENUM('unique', 'quotidien', 'hebdomadaire', 'mensuel', 'annuel') DEFAULT 'unique',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL
);

/* 5. DEPENSES */
CREATE TABLE IF NOT EXISTS depenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  compte_id INT NOT NULL,
  categorie_id INT NULL,
  libelle VARCHAR(150) NOT NULL,
  montant DECIMAL(15,2) NOT NULL,
  date_depense DATE NOT NULL,
  lieu VARCHAR(150),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL
);

/* 6. BUDGETS */
CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  categorie_id INT NOT NULL,
  montant_prevu DECIMAL(15,2) NOT NULL,
  mois INT NOT NULL,
  annee INT NOT NULL,
  alerte_seuil INT DEFAULT 80,
  periode_type VARCHAR(20) DEFAULT 'mensuel',
  date_debut DATE DEFAULT NULL,
  date_fin DATE DEFAULT NULL,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budgets_comptes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  budget_id INT NOT NULL,
  compte_id INT NOT NULL,
  montant_preleve DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE CASCADE
);

/* 7. OBJECTIFS ET PLANNING */
CREATE TABLE IF NOT EXISTS objectifs_epargne (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  titre VARCHAR(150) NOT NULL,
  montant_cible DECIMAL(15,2) NOT NULL,
  montant_actuel DECIMAL(15,2) DEFAULT 0.00,
  date_limite DATE,
  icone VARCHAR(10) DEFAULT '🎯',
  statut ENUM('en_cours', 'atteint', 'annule') DEFAULT 'en_cours',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS objectifs_alimentations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  objectif_id INT NOT NULL,
  compte_id INT NULL,
  montant DECIMAL(15,2) NOT NULL,
  date_alimentation DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (objectif_id) REFERENCES objectifs_epargne(id) ON DELETE CASCADE,
  FOREIGN KEY (compte_id) REFERENCES comptes(id) ON DELETE SET NULL
);
/* 8. NOTIFICATIONS */
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  type VARCHAR(50),
  titre VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  est_lue TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

/* 9. DEVICE TOKENS (push notifications) */
CREATE TABLE IF NOT EXISTS device_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  token VARCHAR(191) NOT NULL,
  plateforme VARCHAR(10) DEFAULT 'unknown',
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  UNIQUE KEY unique_token (token)
);

/* 10. SEUILS (alertes de depenses par categorie) */
CREATE TABLE IF NOT EXISTS seuils (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  categorie_id INT NOT NULL,
  montant_seuil DECIMAL(15,2) NOT NULL,
  type ENUM('alerte', 'blocage') DEFAULT 'alerte',
  est_actif TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE CASCADE
);

/* Migration pour tables existantes */
ALTER TABLE revenus ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE depenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS montant_utilise DECIMAL(15,2) DEFAULT 0.00;

/* Catégories quotidiennes */
ALTER TABLE categories ADD COLUMN IF NOT EXISTS est_quotidien TINYINT(1) DEFAULT 0;

/* 11. ANALYSES IA */
CREATE TABLE IF NOT EXISTS analyses_ia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  score_financier INT,
  taux_epargne DECIMAL(5,2),
  mois INT NOT NULL,
  annee INT NOT NULL,
  recommandations JSON,
  previsions JSON,
  periode_type VARCHAR(20) DEFAULT 'mensuel',
  date_debut DATE DEFAULT NULL,
  date_fin DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);
