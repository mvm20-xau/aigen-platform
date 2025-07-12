const winston = require('winston');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration des formats
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuration pour la console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'aigen-backend' },
  transports: [
    // Erreurs dans un fichier séparé
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Tous les logs dans combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Gestion des exceptions non capturées
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  // Gestion des rejections de promesses
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Ajouter la console en développement
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Méthodes utilitaires
logger.logHttpRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.userId || 'anonymous'
  };
  
  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

logger.logAgentExecution = (agentId, agentType, userId, status, executionTime, error = null) => {
  const logData = {
    agentId,
    agentType,
    userId,
    status,
    executionTime: `${executionTime}ms`,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    logData.error = error.message;
    logger.error('Agent Execution Failed', logData);
  } else {
    logger.info('Agent Execution Success', logData);
  }
};

logger.logApiCall = (service, endpoint, status, responseTime, error = null) => {
  const logData = {
    service,
    endpoint,
    status,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    logData.error = error.message;
    logger.error('External API Call Failed', logData);
  } else {
    logger.info('External API Call Success', logData);
  }
};

logger.logUserAction = (userId, action, details = {}) => {
  logger.info('User Action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.logSecurityEvent = (type, userId, ip, details = {}) => {
  logger.warn('Security Event', {
    type,
    userId,
    ip,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.logPerformance = (operation, duration, metadata = {}) => {
  const logData = {
    operation,
    duration: `${duration}ms`,
    metadata,
    timestamp: new Date().toISOString()
  };
  
  if (duration > 5000) { // Plus de 5 secondes
    logger.warn('Slow Operation', logData);
  } else {
    logger.info('Performance Log', logData);
  }
};

// Middleware pour logger les requêtes HTTP
logger.httpMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logHttpRequest(req, res, duration);
  });
  
  next();
};

// Fonction pour créer un logger contextuel
logger.createContext = (context) => {
  return {
    info: (message, meta = {}) => logger.info(message, { ...meta, context }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, context }),
    error: (message, meta = {}) => logger.error(message, { ...meta, context }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, context })
  };
};

module.exports = logger;