const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant, accès refusé' });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    if (!token) {
      return res.status(401).json({ message: 'Token manquant, accès refusé' });
    }

    try {
      // Vérifier le token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Vérifier que l'utilisateur existe toujours en base
      const result = await pool.query(
        'SELECT id, email, plan FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Utilisateur non trouvé, accès refusé' });
      }

      const user = result.rows[0];
      
      // Ajouter les infos utilisateur à la requête
      req.user = {
        userId: user.id,
        email: user.email,
        plan: user.plan
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expiré, veuillez vous reconnecter' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token invalide, accès refusé' });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'authentification' });
  }
};

// Middleware pour vérifier le plan utilisateur
const requirePlan = (requiredPlan) => {
  const planHierarchy = {
    'starter': 1,
    'business': 2,
    'enterprise': 3
  };

  return (req, res, next) => {
    const userPlanLevel = planHierarchy[req.user.plan] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({ 
        message: `Plan ${requiredPlan} requis pour cette fonctionnalité`,
        currentPlan: req.user.plan,
        requiredPlan: requiredPlan
      });
    }

    next();
  };
};

// Middleware pour vérifier les limites du plan
const checkPlanLimits = (resource) => {
  const planLimits = {
    starter: {
      agents: 10,
      actionsPerMonth: 5000
    },
    business: {
      agents: 50,
      actionsPerMonth: 25000
    },
    enterprise: {
      agents: -1, // unlimited
      actionsPerMonth: -1 // unlimited
    }
  };

  return async (req, res, next) => {
    try {
      const userPlan = req.user.plan;
      const limits = planLimits[userPlan];

      if (!limits) {
        return res.status(400).json({ message: 'Plan utilisateur invalide' });
      }

      if (resource === 'agents') {
        if (limits.agents !== -1) {
          const agentCount = await pool.query(
            'SELECT COUNT(*) as count FROM agents WHERE user_id = $1',
            [req.user.userId]
          );

          if (parseInt(agentCount.rows[0].count) >= limits.agents) {
            return res.status(403).json({ 
              message: `Limite d'agents atteinte pour le plan ${userPlan}`,
              currentCount: parseInt(agentCount.rows[0].count),
              limit: limits.agents
            });
          }
        }
      }

      if (resource === 'actions') {
        if (limits.actionsPerMonth !== -1) {
          const actionCount = await pool.query(
            `SELECT COUNT(*) as count FROM executions e
             JOIN agents a ON e.agent_id = a.id
             WHERE a.user_id = $1 AND e.created_at >= date_trunc('month', CURRENT_DATE)`,
            [req.user.userId]
          );

          if (parseInt(actionCount.rows[0].count) >= limits.actionsPerMonth) {
            return res.status(403).json({ 
              message: `Limite d'actions mensuelle atteinte pour le plan ${userPlan}`,
              currentCount: parseInt(actionCount.rows[0].count),
              limit: limits.actionsPerMonth
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Plan limits check error:', error);
      res.status(500).json({ message: 'Erreur lors de la vérification des limites' });
    }
  };
};

module.exports = { auth, requirePlan, checkPlanLimits };