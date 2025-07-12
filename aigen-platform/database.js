const { Pool } = require('pg');
const logger = require('../utils/logger');

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialisation de la base de données
const initDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Créer les tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'starter',
        stripe_customer_id VARCHAR(255),
        api_keys JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT,
        config JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'active',
        last_execution TIMESTAMP,
        total_executions INTEGER DEFAULT 0,
        success_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        input_data JSONB,
        output_data JSONB,
        error_message TEXT,
        execution_time INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS billing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        stripe_subscription_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        billing_date TIMESTAMP DEFAULT NOW()
      );
    `);

    // Créer les index pour optimiser les performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
      CREATE INDEX IF NOT EXISTS idx_executions_agent_id ON executions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_billing_user_id ON billing(user_id);
    `);

    client.release();
    logger.info('✅ Base de données initialisée avec succès');
  } catch (error) {
    logger.error('❌ Erreur initialisation base de données:', error);
    throw error;
  }
};

// Test de connexion
const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Connexion à la base de données réussie');
    return true;
  } catch (error) {
    logger.error('❌ Erreur connexion base de données:', error);
    return false;
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    logger.info('Database pool closed');
  });
});

module.exports = { pool, initDatabase, testConnection };