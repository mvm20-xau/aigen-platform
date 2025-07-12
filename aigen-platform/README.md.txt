# 🤖 AiGen - Plateforme d'Agents IA

**AiGen** est une plateforme SaaS complète qui permet aux entreprises d'automatiser leurs tâches business grâce à plus de 15 agents IA spécialisés.

## 🚀 Fonctionnalités

### 15 Agents IA Disponibles
- **Content Creator Pro** - Génération automatique de contenu
- **SEO Optimizer** - Optimisation référencement 
- **Video Creator AI** - Scripts vidéo TikTok/YouTube
- **Email Marketing** - Campagnes email automatisées
- **Customer Retention** - Prévention du churn client
- **Lead Generator** - Prospection automatique
- **Data Analyst** - Analyses business automatisées
- **Financial Analyst** - Analyses financières et prévisions
- **Task Automator** - Automatisation tâches répétitives
- **Project Manager AI** - Gestion de projets automatisée
- **Brand Monitoring** - Surveillance réputation en temps réel
- **Competitor Intelligence** - Veille concurrentielle
- **AI Recruiter** - Recrutement automatisé
- **Support Assistant** - Service client 24/7
- **Inventory Manager** - Gestion stock intelligente

### Technologies
- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **IA**: Groq API (Mixtral, Llama3)
- **Paiements**: Stripe
- **Déploiement**: Vercel
- **Notifications**: Email, Telegram, WhatsApp

## 📦 Installation

### Prérequis
- Node.js 18+
- PostgreSQL 13+
- Compte Groq API
- Compte Stripe

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/votre-username/aigen-platform.git
cd aigen-platform

# Installation backend
cd backend
npm install
cp .env.example .env
# Configurer vos variables d'environnement dans .env

# Migration base de données
npm run migrate

# Démarrage en développement
npm run dev
```

## 🔧 Configuration

### Variables d'environnement
```env
DATABASE_URL=postgresql://user:password@localhost:5432/aigen_db
JWT_SECRET=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
GROQ_API_KEY=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
```

## 🚀 Déploiement Vercel

```bash
# Installation Vercel CLI
npm i -g vercel

# Déploiement
vercel
```

### Variables d'environnement Vercel
Configurez ces variables dans le dashboard Vercel :
- `DATABASE_URL` - URL de votre base PostgreSQL
- `JWT_SECRET` - Clé secrète pour JWT
- `STRIPE_SECRET_KEY` - Clé secrète Stripe
- `GROQ_API_KEY` - Clé API Groq

## 📖 Documentation

### API Endpoints

#### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

#### Agents
- `GET /api/agents` - Liste des agents utilisateur
- `POST /api/agents` - Créer un agent
- `PUT /api/agents/:id` - Modifier un agent
- `POST /api/agents/:id/execute` - Exécuter un agent
- `GET /api/agents/templates` - Templates disponibles

#### Facturation
- `GET /api/billing/subscription` - Abonnement actuel
- `POST /api/billing/create-checkout` - Créer session Stripe
- `POST /api/billing/webhook` - Webhook Stripe

## 💰 Plans et Tarifs

- **Starter**: 29€/mois (10 agents, 5K actions)
- **Business**: 79€/mois (50 agents, 25K actions) 
- **Enterprise**: 199€/mois (illimité)

## 🔒 Sécurité

- Authentification JWT
- Validation des entrées
- Rate limiting
- Chiffrement des données sensibles
- Conformité RGPD

## 📊 Monitoring

- Logs Winston
- Métriques de performance agents
- Tracking erreurs
- Analytics utilisation

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Support

- 📧 Email: support@aigen.ai
- 💬 Discord: [Serveur AiGen](https://discord.gg/aigen)
- 📚 Documentation: [docs.aigen.ai](https://docs.aigen.ai)

## 🙏 Remerciements

- [Groq](https://groq.com) pour l'API IA ultra-rapide
- [Stripe](https://stripe.com) pour les paiements
- [Vercel](https://vercel.com) pour l'hébergement

---

**AiGen** - Automatisez votre business avec l'IA 🚀