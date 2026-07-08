const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'monapp_db',
    port: parseInt(process.env.DB_PORT) || 3306,
  });

  try {
    console.log('Migration : création table seuils...');
    await conn.execute(`
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
      )
    `);
    console.log('  ✓ table seuils créée');
    console.log('Migration terminée avec succès.');
  } catch (err) {
    console.error('Erreur migration :', err.message);
    console.log('\nExécutez cette commande SQL manuellement :\n');
    console.log(`
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
    `);
  } finally {
    await conn.end();
  }
}

migrate();
