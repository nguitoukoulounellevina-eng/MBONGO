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
    console.log('Migration : création de device_tokens...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        utilisateur_id INT NOT NULL,
        token VARCHAR(191) NOT NULL,
        plateforme VARCHAR(10) DEFAULT 'unknown',
        cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_token (token)
      )
    `);
    console.log('  ✓ device_tokens');

    console.log('Migration terminée avec succès.');
  } catch (err) {
    console.error('Erreur migration :', err.message);
  } finally {
    await conn.end();
  }
}

migrate();
