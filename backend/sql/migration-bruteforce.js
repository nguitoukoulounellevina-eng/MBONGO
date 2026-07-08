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
    console.log('Migration : ajout de tentatives_echec et bloque_jusqua...');

    try {
      await conn.execute('ALTER TABLE utilisateurs ADD COLUMN tentatives_echec INT DEFAULT 0 AFTER photo');
      console.log('  ✓ utilisateurs.tentatives_echec ajouté');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('  - utilisateurs.tentatives_echec existe déjà');
      } else throw e;
    }

    try {
      await conn.execute('ALTER TABLE utilisateurs ADD COLUMN bloque_jusqua DATETIME DEFAULT NULL AFTER tentatives_echec');
      console.log('  ✓ utilisateurs.bloque_jusqua ajouté');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('  - utilisateurs.bloque_jusqua existe déjà');
      } else throw e;
    }

    console.log('Migration terminée avec succès.');
  } catch (err) {
    console.error('Erreur migration :', err.message);
  } finally {
    await conn.end();
  }
}

migrate();
