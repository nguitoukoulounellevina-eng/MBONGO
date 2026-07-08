const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Cette valeur existe déjà.' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Référence invalide.' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Erreur interne du serveur.',
  });
};

module.exports = errorHandler;
