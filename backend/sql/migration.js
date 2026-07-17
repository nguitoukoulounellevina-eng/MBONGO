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
    console.log('Migration : ajout de type_personnalise sur comptes...');
    try {
      await conn.execute('ALTER TABLE comptes ADD COLUMN type_personnalise VARCHAR(100) DEFAULT NULL AFTER type_compte');
      console.log('  ✓ comptes.type_personnalise ajouté');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('  - comptes.type_personnalise existe déjà');
      } else {
        throw e;
      }
    }

    console.log('Migration : ajout de la colonne created_at...');

    const tables = ['revenus', 'depenses', 'categories'];
    for (const table of tables) {
      try {
        await conn.execute(`ALTER TABLE ${table} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        console.log(`  ✓ ${table}.created_at ajouté`);
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log(`  - ${table}.created_at existe déjà`);
        } else {
          throw e;
        }
      }
    }

    console.log('Migration terminée avec succès.');
  } catch (err) {
    console.error('Erreur migration :', err.message);
    console.log('\nEssayez ces commandes SQL manuellement dans phpMyAdmin ou MySQL Workbench :\n');
    console.log('  ALTER TABLE revenus ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
    console.log('  ALTER TABLE depenses ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
    console.log('  ALTER TABLE categories ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
  } finally {
    await conn.end();
  }
}

migrate();
