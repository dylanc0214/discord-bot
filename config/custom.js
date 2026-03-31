/**
 * Custom Bot Configuration
 * Replace all hardcoded values with your own branding
 */

module.exports = {
    // Bot Identity
    bot: {
        name: "Only-NONE",
        description: "A fully customizable Discord bot with 400+ commands and extensive features",
        version: "0.1.0",
        author: "none0214",
        website: "https://your-website.com",
        supportServer: "https://discord.gg/PWfy9FxUtm",
        prefix: "!",
        
        // OAuth2 Configuration - REPLACE WITH YOUR BOT'S CLIENT ID
        client_id: process.env.DISCORD_ID || "1229409455125561384",
        
        // Bot Invite Link - Auto-generated from client_id
        get botInvite() {
            return `https://discord.com/oauth2/authorize?&client_id=${this.client_id}&scope=applications.commands+bot&permissions=8`;
        }
    },

    // Branding
    branding: {
        footer: `© ${new Date().getFullYear()} ${this.bot.name}`,
        webhookUsername: `${this.bot.name} Logs`,
        status: "Custom status message here",
        
        // Embed colors
        colors: {
            success: '#57F287',
            error: "#ED4245",
            normal: "#5865F2",
            warning: "#FEE75C"
        }
    },

    // External Services
    services: {
        website: {
            url: "https://your-dashboard.com",
            iframeUrl: "https://your-dashboard.com"
        },
        api: {
            baseUrl: "https://api.your-bot.com"
        }
    },

    // Development Settings
    development: {
        logLevel: process.env.NODE_ENV === "development" ? "debug" : "info",
        enableDebugCommands: process.env.NODE_ENV === "development"
    },

    // Feature Flags
    features: {
        music: true,
        economy: true,
        moderation: true,
        giveaways: true,
        tickets: true,
        customCommands: true
    }
};
