const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth, checkPlanLimits } = require('../middleware/auth');
const GroqService = require('../services/groqService');

const router = express.Router();

// Templates d'agents disponibles
const AGENT_TEMPLATES = {
  'content-creator': {
    name: 'Content Creator Pro',
    category: 'Marketing Digital',
    description: 'Génère automatiquement du contenu optimisé pour tous vos canaux',
    features: ['Articles SEO', 'Posts sociaux', 'Email marketing', 'Calendrier éditorial']
  },
  'seo-optimizer': {
    name: 'SEO Optimizer Pro',
    category: 'Marketing Digital',
    description: 'Optimise votre référencement et analyse la concurrence',
    features: ['Audit SEO', 'Mots-clés', 'Analyse concurrence', 'Plan d\'action']
  },
  'video-creator': {
    name: 'Video Creator AI',
    category: 'Content Creation',
    description: 'Scripts vidéo pour TikTok, YouTube, Instagram',
    features: ['Scripts optimisés', 'Hooks viraux', 'Thumbnails', 'Calendrier']
  },
  'email-marketing': {
    name: 'Email Marketing Pro',
    category: 'Marketing',
    description: 'Campagnes email automatisées et personnalisées',
    features: ['Segmentation', 'A/B testing', 'Automation', 'Analytics']
  },
  'lead-generator': {
    name: 'Lead Generator Pro',
    category: 'Sales',
    description: 'Trouve et qualifie automatiquement des prospects',
    features: ['Prospection LinkedIn', 'Scoring IA', 'Messages personnalisés', 'CRM sync']
  },
  'support-assistant': {
    name: 'Support Assistant 24/7',
    category: 'Service Client',
    description: 'Assistant client intelligent qui résout 85% des demandes',
    features: ['Réponses 24/7', 'Escalade intelligente', 'Multi-canal', 'Base connaissances']
  },
  'customer-retention': {
    name: 'Customer Retention Master',
    category: 'Customer Success',
    description: 'Automatise la rétention client et prévient le churn',
    features: ['Détection churn', 'Segmentation', 'Campagnes rétention', 'Programmes fidélité']
  },
  'data-analyst': {
    name: 'Business Analyst IA',
    category: 'Analytics',
    description: 'Analyse vos données et génère des insights actionnables',
    features: ['Connexions multi-sources', 'Détection anomalies', 'Rapports auto', 'Prédictions IA']
  },
  'financial-analyst': {
    name: 'Financial Analyst AI',
    category: 'Finance',
    description: 'Analyses financières et prévisions automatisées',
    features: ['Performance financière', 'Prévisions', 'Analyse rentabilité', 'Gestion risques']
  },
  'task-automator': {
    name: 'Task Automator Pro',
    category: 'Productivité',
    description: 'Automatise vos tâches répétitives quotidiennes',
    features: ['Audit tâches', 'Priorisation ROI', 'Workflows', 'Implémentation']
  },
  'project-manager': {
    name: 'Project Manager AI',
    category: 'Management',
    description: 'Gère vos projets avec suivi et optimisation automatique',
    features: ['Planification auto', 'Gestion ressources', 'Suivi progrès', 'Gestion risques']
  },
  'brand-monitoring': {
    name: 'Brand Monitor 360',
    category: 'Réputation',
    description: 'Surveille votre réputation en temps réel',
    features: ['Monitoring mentions', 'Analyse sentiment', 'Surveillance concurrence', 'Gestion crise']
  },
  'competitor-analyst': {
    name: 'Competitor Intelligence',
    category: 'Business Intelligence',
    description: 'Surveille et analyse la concurrence automatiquement',
    features: ['Monitoring prix', 'Stratégies marketing', 'Nouveaux produits', 'Opportunités']
  },
  'recruitment': {
    name: 'AI Recruiter Pro',
    category: 'RH',
    description: 'Automatise le recrutement de A à Z',
    features: ['Job descriptions', 'Sourcing auto', 'Screening IA', 'Communication candidats']
  },
  'inventory-manager': {
    name: 'Inventory Manager Pro',
    category: 'E-commerce',
    description: 'Optimise automatiquement votre stock',
    features: ['Prédiction demande', 'Optimisation stock', 'Alertes rupture', 'Commandes auto']
  }
};

// Get all user agents
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, description, status, last_execution, 
              total_executions, success_rate, created_at 
       FROM agents WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json({ agents: result.rows });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get agent templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = Object.entries(AGENT_TEMPLATES).map(([id, template]) => ({
      id,
      ...template
    }));

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Create new agent
router.post('/', auth, checkPlanLimits('agents'), [
  body('name').trim().isLength({ min: 1 }),
  body('type').trim().isLength({ min: 1 }),
  body('config').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, description, config } = req.body;

    // Vérifier que le type d'agent existe
    if (!AGENT_TEMPLATES[type]) {
      return res.status(400).json({ message: 'Type d\'agent non supporté' });
    }

    const result = await pool.query(
      `INSERT INTO agents (user_id, name, type, description, config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.userId, name, type, description, JSON.stringify(config)]
    );

    res.status(201).json({ agent: result.rows[0] });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get single agent
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM agents WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    res.json({ agent: result.rows[0] });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Update agent
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('config').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, config } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = ${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = ${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (config !== undefined) {
      updateFields.push(`config = ${paramCount}`);
      values.push(JSON.stringify(config));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(req.user.userId);

    const query = `
      UPDATE agents 
      SET ${updateFields.join(', ')}
      WHERE id = ${paramCount} AND user_id = ${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    res.json({ agent: result.rows[0] });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Execute agent
router.post('/:id/execute', auth, checkPlanLimits('actions'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const agentResult = await pool.query(
      'SELECT * FROM agents WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    const agentData = agentResult.rows[0];
    
    // Exécuter l'agent avec Groq
    const execution = await executeAgent(agentData);

    // Log execution
    await pool.query(
      `INSERT INTO executions (agent_id, status, input_data, output_data, execution_time)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        agentData.id,
        execution.success ? 'success' : 'error',
        JSON.stringify(agentData.config),
        JSON.stringify(execution),
        Date.now()
      ]
    );

    // Update agent stats
    await pool.query(
      `UPDATE agents SET 
        last_execution = NOW(),
        total_executions = total_executions + 1
       WHERE id = $1`,
      [agentData.id]
    );

    res.json({ execution });
  } catch (error) {
    console.error('Execute agent error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Delete agent
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM agents WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agent non trouvé' });
    }

    res.json({ success: true, message: 'Agent supprimé avec succès' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Fonction pour exécuter un agent avec Groq
async function executeAgent(agentData) {
  try {
    const { type, config } = agentData;
    
    // Générer le prompt selon le type d'agent
    const prompt = generateAgentPrompt(type, config);
    
    // Appeler Groq API
    const response = await GroqService.generateContent(prompt, {
      systemPrompt: getSystemPrompt(type),
      temperature: 0.7,
      maxTokens: 1500
    });

    return {
      success: true,
      results: response.content,
      summary: `Agent ${type} exécuté avec succès`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Agent execution error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Générer le prompt selon le type d'agent
function generateAgentPrompt(type, config) {
  const prompts = {
    'content-creator': `Génère du contenu marketing pour:
Secteur: ${config.business_sector || 'général'}
Audience: ${config.target_audience || 'professionnels'}
Type: ${config.content_type || 'article de blog'}
Ton: ${config.tone || 'professionnel'}
Sujet: ${config.topic || 'tendances du secteur'}`,

    'seo-optimizer': `Effectue un audit SEO pour:
Site web: ${config.website_url || 'exemple.com'}
Mots-clés cibles: ${config.target_keywords || 'marketing digital'}
Secteur: ${config.business_sector || 'technologie'}`,

    'lead-generator': `Trouve des prospects pour:
Secteur cible: ${config.target_industry || 'technologie'}
Taille entreprise: ${config.company_size || 'PME'}
Fonction: ${config.target_role || 'Marketing Manager'}
Localisation: ${config.location || 'France'}`,

    'support-assistant': `Réponds à cette demande client:
Demande: ${config.customer_query || 'Comment puis-je vous aider?'}
Produit/Service: ${config.product_info || 'plateforme SaaS'}
Politique: ${config.support_policy || 'service client standard'}`,

    'email-marketing': `Crée une campagne email pour:
Objectif: ${config.campaign_goal || 'engagement'}
Audience: ${config.target_audience || 'clients existants'}
Produit: ${config.product_name || 'notre service'}
CTA: ${config.call_to_action || 'en savoir plus'}`
  };

  return prompts[type] || `Exécute la tâche pour l'agent ${type} avec la configuration: ${JSON.stringify(config)}`;
}

// Prompts système pour chaque type d'agent
function getSystemPrompt(type) {
  const systemPrompts = {
    'content-creator': 'Tu es un expert en création de contenu marketing qui génère du contenu engageant et optimisé.',
    'seo-optimizer': 'Tu es un consultant SEO expert qui audite et optimise les sites web pour les moteurs de recherche.',
    'lead-generator': 'Tu es un expert en prospection B2B qui trouve et qualifie des prospects de qualité.',
    'support-assistant': 'Tu es un assistant service client professionnel qui résout les problèmes efficacement.',
    'email-marketing': 'Tu es un expert en email marketing qui crée des campagnes à fort taux de conversion.'
  };

  return systemPrompts[type] || 'Tu es un assistant IA professionnel qui aide les entreprises.';
}

module.exports = router;