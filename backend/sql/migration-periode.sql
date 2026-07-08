USE monapp_db;

-- 1. Ajout de la colonne periode_budget sur utilisateurs
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS periode_budget VARCHAR(20) DEFAULT 'mensuel';

-- 2. Ajout des colonnes période sur budgets
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS periode_type VARCHAR(20) DEFAULT 'mensuel',
  ADD COLUMN IF NOT EXISTS date_debut DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_fin DATE DEFAULT NULL;

-- 3. Ajout des colonnes période sur analyses_ia
ALTER TABLE analyses_ia
  ADD COLUMN IF NOT EXISTS periode_type VARCHAR(20) DEFAULT 'mensuel',
  ADD COLUMN IF NOT EXISTS date_debut DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_fin DATE DEFAULT NULL;

-- 4. Migration des budgets mensuels existants
UPDATE budgets
  SET date_debut = CONCAT(annee, '-', LPAD(mois, 2, '0'), '-01'),
      date_fin   = LAST_DAY(CONCAT(annee, '-', LPAD(mois, 2, '0'), '-01')),
      periode_type = 'mensuel'
  WHERE date_debut IS NULL;

-- 5. Migration des analyses IA existantes
UPDATE analyses_ia
  SET date_debut = CONCAT(annee, '-', LPAD(mois, 2, '0'), '-01'),
      date_fin   = LAST_DAY(CONCAT(annee, '-', LPAD(mois, 2, '0'), '-01')),
      periode_type = 'mensuel'
  WHERE date_debut IS NULL;
