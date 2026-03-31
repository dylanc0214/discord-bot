/**
 * Centralized Configuration Manager
 * Handles all bot configuration with validation and fallbacks
 */

const customConfig = require('../../../config/custom');
const path = require('path');

class ConfigManager {
    constructor() {
        this.config = this.mergeConfigs();
        this.validateConfig();
    }

    mergeConfigs() {
        return {
            ...customConfig,
            // Runtime environment overrides
            env: process.env.NODE_ENV || 'production',
            isDevelopment: process.env.NODE_ENV === 'development'
        };
    }

    validateConfig() {
        const required = [
            'DISCORD_TOKEN',
            'DISCORD_ID',
            'MONGO_TOKEN'
        ];

        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
            console.error('💡 Please copy .env.custom to .env and fill in the required values');
            if (this.config.env === 'production') {
                process.exit(1);
            }
        }

        // Validate bot client ID
        if (this.config.bot.client_id === "YOUR_BOT_CLIENT_ID_HERE") {
            console.warn('⚠️  Please update your bot client ID in config/custom.js');
        }
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.config);
    }

    get botInvite() {
        return this.config.bot.botInvite;
    }

    get supportServer() {
        return this.config.bot.supportServer;
    }

    get webhookUsername() {
        return this.config.branding.webhookUsername;
    }

    get colors() {
        return this.config.branding.colors;
    }

    get footer() {
        return this.config.branding.footer;
    }

    // Feature flag checking
    isFeatureEnabled(feature) {
        return this.config.features[feature] === true;
    }

    // Environment helpers
    isDev() {
        return this.config.isDevelopment;
    }

    isProd() {
        return !this.config.isDevelopment;
    }
}

module.exports = new ConfigManager();
