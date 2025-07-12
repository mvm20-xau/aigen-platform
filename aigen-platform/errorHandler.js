const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId
  });

  // Stripe webhook errors
  if (err.type === 'StripeSignatureVerificationError') {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Données invalides', 
      errors: err.errors 
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token invalide' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expiré' });
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({ message: 'Données déjà existantes' });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ message: 'Référence invalide' });
  }

  // Default error
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Erreur serveur interne' 
      : err.message
  });
};

module.exports = { errorHandler };