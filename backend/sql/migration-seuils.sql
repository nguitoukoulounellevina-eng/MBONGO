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

ALTER TABLE analyses_ia ADD COLUMN IF NOT EXISTS rapport JSON;
