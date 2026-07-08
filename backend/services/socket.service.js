const jwt = require('jsonwebtoken');
const { notificationEvent } = require('./notification.service');

function initSocket(server) {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token manquant'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.utilisateurId = decoded.id;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.utilisateurId;
    socket.join(`user:${uid}`);
    socket.join(`user:${uid}`);

    socket.on('disconnect', () => {});
  });

  notificationEvent.on('new', ({ utilisateurId, notification }) => {
    io.to(`user:${utilisateurId}`).emit('new-notification', notification);
  });

  return io;
}

module.exports = { initSocket };
