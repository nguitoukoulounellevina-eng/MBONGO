require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const cron = require('node-cron');
const { verifierEtEnvoyerRappels } = require('./services/reminder.service');
const { verifierRappelsDepensesJournalieres } = require('./services/daily-reminder.service');
const { verifierSeuils } = require('./services/threshold-check.service');
const { initSocket } = require('./services/socket.service');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const comptesRoutes = require('./routes/comptes.routes');
const categoriesRoutes = require('./routes/categories.routes');
const revenusRoutes = require('./routes/revenus.routes');
const depensesRoutes = require('./routes/depenses.routes');
const budgetsRoutes = require('./routes/budgets.routes');
const objectifsRoutes = require('./routes/objectifs.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const analyseIaRoutes = require('./routes/analyse-ia.routes');
const statsRoutes = require('./routes/stats.routes');
const aiRoutes = require('./ai/ai.routes');
const deviceTokensRoutes = require('./routes/device-tokens.routes');
const seuilsRoutes = require('./routes/seuils.routes');
const abonnementsRoutes = require('./routes/abonnements.routes');
const archiveRoutes = require('./routes/archive.routes');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Trop de tentatives depuis cette adresse IP. Réessayez dans 15 minutes.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/comptes', comptesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/depenses', depensesRoutes);
app.use('/api/revenus', revenusRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/objectifs', objectifsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analyse-ia', analyseIaRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/device-tokens', deviceTokensRoutes);
app.use('/api/seuils', seuilsRoutes);
app.use('/api/abonnements', abonnementsRoutes);
app.use('/api/archive', archiveRoutes);

app.use(errorHandler);

cron.schedule('0 * * * *', () => {
  console.log('[Cron] Vérification des utilisateurs inactifs...');
  verifierEtEnvoyerRappels();
});

cron.schedule('0 20 * * *', () => {
  console.log('[Cron] Rappel dépenses journalières...');
  verifierRappelsDepensesJournalieres();
});

cron.schedule('30 * * * *', () => {
  console.log('[Cron] Vérification des seuils...');
  verifierSeuils();
});

server.listen(PORT, () => {
  console.log(`MonApp API running on http://localhost:${PORT}`);
  console.log('[Cron] Planifié : inactivité toutes les heures.');
  console.log('[Cron] Planifié : rappel dépenses à 20h.');
  console.log('[Cron] Planifié : seuils toutes les heures (min 30).');
});
