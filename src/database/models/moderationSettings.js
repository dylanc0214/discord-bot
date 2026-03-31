const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    guildID: { type: String, required: true, unique: true, index: true },
    
    // Logging configuration
    logging: {
        enabled: { type: Boolean, default: true },
        channelID: { type: String, default: null },
        logActions: {
            warn: { type: Boolean, default: true },
            kick: { type: Boolean, default: true },
            ban: { type: Boolean, default: true },
            mute: { type: Boolean, default: true },
            unban: { type: Boolean, default: true },
            note: { type: Boolean, default: false }
        },
        includeEvidence: { type: Boolean, default: true },
        includeUserHistory: { type: Boolean, default: true }
    },
    
    // Auto-mod configuration
    automod: {
        enabled: { type: Boolean, default: false },
        rules: [{
            id: { type: String, required: true },
            name: { type: String, required: true, maxlength: 100 },
            enabled: { type: Boolean, default: true },
            
            // Trigger conditions
            triggers: {
                keywords: [{ type: String, lowercase: true }],
                regex: [{ type: String }],
                mentions: {
                    enabled: { type: Boolean, default: false },
                    threshold: { type: Number, default: 5 }
                },
                links: {
                    enabled: { type: Boolean, default: false },
                    whitelist: [{ type: String }],
                    blacklist: [{ type: String }]
                },
                caps: {
                    enabled: { type: Boolean, default: false },
                    threshold: { type: Number, default: 70 }, // percentage
                    minLength: { type: Number, default: 10 }
                },
                spam: {
                    enabled: { type: Boolean, default: false },
                    messages: { type: Number, default: 5 },
                    timeWindow: { type: Number, default: 10000 }, // ms
                    similar: { type: Boolean, default: false }
                },
                invites: {
                    enabled: { type: Boolean, default: false },
                    allowOwn: { type: Boolean, default: false }
                },
                attachments: {
                    enabled: { type: Boolean, default: false },
                    maxCount: { type: Number, default: 5 },
                    blockedTypes: [{ type: String }] // mime types
                }
            },
            
            // Actions to take
            actions: [{
                type: { 
                    type: String, 
                    enum: ['WARN', 'DELETE', 'KICK', 'BAN', 'MUTE', 'TEMPMUTE', 'TEMPBAN'],
                    required: true 
                },
                duration: { type: Number }, // for temp actions in ms
                reason: { type: String, default: 'Auto-mod violation' },
                severity: { type: Number, min: 1, max: 5, default: 1 }
            }],
            
            // Exemptions
            exemptions: {
                roles: [{ type: String }],
                channels: [{ type: String }],
                users: [{ type: String }]
            },
            
            // Cooldown and limits
            cooldown: { type: Number, default: 0 }, // ms between triggers
            maxPerUser: { type: Number, default: 0 }, // 0 = unlimited
            
            createdAt: { type: Date, default: Date.now },
            triggerCount: { type: Number, default: 0 },
            lastTriggered: { type: Date, default: null }
        }]
    },
    
    // Moderation roles
    roles: {
        moderators: [{ type: String }],
        administrators: [{ type: String }],
        muted: { type: String, default: null }, // muted role ID
        jailed: { type: String, default: null } // jail role ID
    },
    
    // Punishment thresholds
    thresholds: {
        warn: { type: Number, default: 0 }, // warnings before auto-action
        mute: { type: Number, default: 3 }, // warnings before mute
        kick: { type: Number, default: 5 }, // warnings before kick
        ban: { type: Number, default: 7 }, // warnings before ban
        
        // Duration escalations
        muteDuration: { type: Number, default: 3600000 }, // 1 hour
        kickDuration: { type: Number, default: null },
        banDuration: { type: Number, default: null }
    },
    
    // Appeal system
    appeals: {
        enabled: { type: Boolean, default: true },
        channelID: { type: String, default: null },
        autoApprove: { type: Boolean, default: false },
        maxAppeals: { type: Number, default: 3 },
        cooldown: { type: Number, default: 86400000 } // 24 hours
    },
    
    // Notification settings
    notifications: {
        dmUsers: { type: Boolean, default: true },
        dmMessage: { type: String, default: 'You have been {action} in {guild} for: {reason}' },
        notifyModerators: { type: Boolean, default: true },
        moderatorRole: { type: String, default: null }
    },
    
    // Case management
    cases: {
        autoExpire: { type: Boolean, default: true },
        expireAfter: { type: Number, default: 7776000000 }, // 90 days
        archiveOld: { type: Boolean, default: true },
        archiveAfter: { type: Number, default: 2592000000 } // 30 days
    },
    
    // Quick actions (templates)
    quickActions: [{
        name: { type: String, required: true, maxlength: 50 },
        description: { type: String, maxlength: 200 },
        action: { 
            type: String, 
            enum: ['WARN', 'KICK', 'BAN', 'TEMPBAN', 'MUTE', 'TEMPMUTE'],
            required: true 
        },
        duration: { type: Number },
        reason: { type: String, required: true, maxlength: 500 },
        severity: { type: Number, min: 1, max: 5, default: 1 },
        enabled: { type: Boolean, default: true }
    }]
}, { 
    timestamps: true 
});

// Method to check if user is moderator
schema.methods.isModerator = function(member) {
    const moderatorRoles = [...this.roles.moderators, ...this.roles.administrators];
    return member.permissions.has('ManageGuild') || 
           member.roles.cache.some(role => moderatorRoles.includes(role.id));
};

// Method to check if user is exempt from automod
schema.methods.isExempt = function(member, rule) {
    const exemptions = rule.exemptions;
    
    return exemptions.users.includes(member.id) ||
           exemptions.roles.some(roleID => member.roles.cache.has(roleID)) ||
           exemptions.channels.includes(member.channel?.id);
};

// Method to get next action based on user history
schema.methods.getNextAction = async function(userID, currentWarnings) {
    if (currentWarnings >= this.thresholds.ban) {
        return { action: 'BAN', reason: 'Exceeded warning threshold' };
    }
    if (currentWarnings >= this.thresholds.kick) {
        return { action: 'KICK', reason: 'Exceeded warning threshold' };
    }
    if (currentWarnings >= this.thresholds.mute) {
        return { action: 'TEMPMUTE', duration: this.thresholds.muteDuration, reason: 'Exceeded warning threshold' };
    }
    return { action: 'WARN', reason: 'Warning issued' };
};

// Static method to get or create settings
schema.statics.getSettings = async function(guildID) {
    let settings = await this.findOne({ guildID });
    if (!settings) {
        settings = await this.create({ guildID });
    }
    return settings;
};

// Method to add automod rule
schema.methods.addAutomodRule = function(ruleData) {
    const rule = {
        id: require('crypto').randomUUID(),
        ...ruleData,
        createdAt: new Date()
    };
    
    this.automod.rules.push(rule);
    return this.save();
};

// Method to remove automod rule
schema.methods.removeAutomodRule = function(ruleID) {
    this.automod.rules = this.automod.rules.filter(rule => rule.id !== ruleID);
    return this.save();
};

// Method to update automod rule
schema.methods.updateAutomodRule = function(ruleID, updates) {
    const ruleIndex = this.automod.rules.findIndex(rule => rule.id === ruleID);
    if (ruleIndex === -1) {
        throw new Error('Rule not found');
    }
    
    Object.assign(this.automod.rules[ruleIndex], updates);
    return this.save();
};

module.exports = mongoose.model('ModerationSettings', schema);
