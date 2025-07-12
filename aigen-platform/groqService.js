const axios = require('axios');
const logger = require('../utils/logger');

const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class GroqService {
  static models = {
    MIXTRAL_8X7B: 'mixtral-8x7b-32768',
    LLAMA2_70B: 'llama2-70b-4096', 
    GEMMA_7B: 'gemma-7b-it',
    LLAMA3_8B: 'llama3-8b-8192',
    LLAMA3_70B: 'llama3-70b-8192'
  };

  static async generateContent(prompt, options = {}) {
    try {
      const response = await axios.post(GROQ_API_URL, {
        model: options.model || this.models.MIXTRAL_8X7B,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'Tu es un assistant IA professionnel qui aide les entreprises.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        stream: options.stream || false
      }, {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 secondes
      });

      return {
        success: true,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model
      };
    } catch (error) {
      logger.error('Groq API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      throw new Error(`Erreur Groq API: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  static async analyzeData(data, analysisType, context = '') {
    const prompt = `Analyse les données suivantes et fournis des insights actionnables:

Type d'analyse: ${analysisType}
Contexte: ${context}

Données:
${JSON.stringify(data, null, 2)}

Fournis:
1. Résumé des points clés
2. Tendances identifiées  
3. Recommandations d'actions
4. Métriques importantes à suivre

Réponds en format JSON structuré.`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un expert en analyse de données business. Réponds toujours en JSON valide.',
      temperature: 0.3,
      model: this.models.LLAMA3_70B
    });
  }

  static async generatePersonalizedContent(template, context, target) {
    const prompt = `Génère un contenu personnalisé basé sur:

Template: ${template}
Contexte: ${context}
Cible: ${target}

Le contenu doit être:
- Personnalisé et engageant
- Professionnel mais authentique
- Adapté à la cible spécifiée
- Prêt à être publié/envoyé

Longueur: 100-300 mots maximum.`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un expert en copywriting et marketing digital.',
      temperature: 0.8,
      model: this.models.MIXTRAL_8X7B
    });
  }

  static async optimizeForSEO(content, keywords, intent) {
    const prompt = `Optimise ce contenu pour le SEO:

Contenu original: ${content}
Mots-clés cibles: ${keywords}
Intention de recherche: ${intent}

Optimise pour:
- Densité de mots-clés naturelle (1-2%)
- Champ sémantique enrichi
- Structure H1-H6 claire
- Meta description engageante
- Lisibilité optimale

Respecte les guidelines Google E-E-A-T.`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un expert SEO qui optimise le contenu pour les moteurs de recherche.',
      temperature: 0.4,
      model: this.models.LLAMA3_70B
    });
  }

  static async generateCode(specification, language, framework = '') {
    const prompt = `Génère du code ${language} ${framework} selon cette spécification:

Spécification: ${specification}
Langage: ${language}
Framework: ${framework}

Le code doit être:
- Fonctionnel et testé
- Bien commenté
- Respecter les bonnes pratiques
- Optimisé pour la performance
- Sécurisé

Inclus des exemples d'utilisation.`;

    return await this.generateContent(prompt, {
      systemPrompt: `Tu es un développeur expert en ${language} qui écrit du code de qualité production.`,
      temperature: 0.2,
      model: this.models.LLAMA3_70B,
      maxTokens: 2000
    });
  }

  static async moderateContent(content, guidelines) {
    const prompt = `Modère ce contenu selon ces guidelines:

Contenu: ${content}
Guidelines: ${guidelines}

Vérifie:
- Respect des règles communautaires
- Absence de contenu inapproprié
- Conformité légale
- Factualité des informations
- Ton professionnel

Réponds en JSON avec:
- approved (boolean)
- issues (array)
- suggestions (array)`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un modérateur de contenu expert qui assure la qualité et conformité.',
      temperature: 0.1,
      model: this.models.LLAMA3_8B
    });
  }

  static async batchProcess(prompts, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 5;
    
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchPromises = batch.map(prompt => 
        this.generateContent(prompt, options)
      );
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Délai entre batches pour respecter rate limits
        if (i + batchSize < prompts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error(`Erreur batch processing:`, error);
        throw error;
      }
    }
    
    return results;
  }

  // Méthodes spécialisées pour chaque type d'agent
  static async executeContentCreator(config) {
    const prompt = `Crée du contenu ${config.content_type || 'article'} pour:

Secteur: ${config.business_sector || 'technologie'}
Audience: ${config.target_audience || 'professionnels'}
Sujet: ${config.topic || 'tendances du secteur'}
Ton: ${config.tone || 'professionnel'}
Longueur: ${config.length || 'moyen'}

Inclus:
- Titre accrocheur
- Introduction engageante
- 3-5 points principaux
- Conclusion avec CTA
- Suggestions hashtags (si réseaux sociaux)`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un expert en création de contenu marketing viral et engageant.',
      temperature: 0.8
    });
  }

  static async executeSEOOptimizer(config) {
    const prompt = `Effectue un audit SEO pour:

URL: ${config.website_url || 'exemple.com'}
Mots-clés: ${config.target_keywords || 'marketing digital'}
Secteur: ${config.business_sector || 'technologie'}

Fournis:
1. Analyse technique (vitesse, mobile, structure)
2. Optimisation on-page
3. Stratégie mots-clés
4. Recommandations backlinks
5. Plan d'action prioritaire`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un consultant SEO expert avec 10+ ans d\'expérience.',
      temperature: 0.3
    });
  }

  static async executeLeadGenerator(config) {
    const prompt = `Génère une stratégie de prospection pour:

Secteur cible: ${config.target_industry || 'technologie'}
Taille: ${config.company_size || 'PME'}
Fonction: ${config.target_role || 'Marketing Manager'}
Zone: ${config.location || 'France'}

Inclus:
1. Profil prospect idéal (ICP)
2. Canaux de prospection
3. Messages d'approche personnalisés
4. Stratégie de suivi
5. KPIs à tracker`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un expert en prospection B2B et génération de leads qualifiés.',
      temperature: 0.6
    });
  }

  static async executeEmailMarketing(config) {
    const prompt = `Crée une campagne email pour:

Objectif: ${config.campaign_goal || 'engagement'}
Audience: ${config.target_audience || 'clients'}
Produit: ${config.product_name || 'service'}
Timing: ${config.send_time || 'immédiat'}

Génère:
1. Ligne d'objet accrocheuse
2. Email HTML responsive
3. Personnalisation dynamique
4. CTA optimisé
5. Séquence de follow-up`;

    return await this.generateContent(prompt, {
      systemPrompt: 'Tu es un expert en email marketing avec des taux d\'ouverture exceptionnels.',
      temperature: 0.7
    });
  }
}

module.exports = GroqService;