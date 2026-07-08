USE monapp_db;

CREATE TABLE IF NOT EXISTS device_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  token VARCHAR(191) NOT NULL,
  plateforme VARCHAR(10) DEFAULT 'unknown',
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  UNIQUE KEY unique_token (token)
);

-- Table rappels_inactivite supprimée, fusionnée dans notifications (champ type)
