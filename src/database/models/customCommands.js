const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    // Command identification
    guildID: { type: String, required: true, index: true },
    commandName: { type: String, required: true, lowercase: true, trim: true },
    createdBy: { type: String, required: true }, // User ID who created it
    
    // Command content
    response: { type: String, required: true, maxlength: 2000 },
    description: { type: String, default: 'Custom command', maxlength: 100 },
    
    // Command settings
    enabled: { type: Boolean, default: true },
    embed: { 
        type: Boolean, 
        default: false 
    },
    embedColor: { 
        type: String, 
        default: '#5865F2',
        validate: {
            validator: function(v) {
                return /^#[0-9A-F]{6}$/i.test(v);
            },
            message: 'Embed color must be a valid hex color'
        }
    },
    
    // Usage tracking
    uses: { type: Number, default: 0 },
    lastUsed: { type: Date, default: null },
    
    // Permissions
    allowedRoles: [{ type: String }], // Role IDs that can use this command
    allowedUsers: [{ type: String }], // User IDs that can use this command
    deniedRoles: [{ type: String }], // Role IDs denied from using
    deniedUsers: [{ type: String }], // User IDs denied from using
    
    // Cooldowns
    cooldown: { type: Number, default: 0 }, // Cooldown in seconds
    lastUsedBy: {}, // Track last usage per user for cooldowns
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { 
    timestamps: true,
    // Ensure unique command names per guild
    index: { guildID: 1, commandName: 1 }, 
    unique: true 
});

// Pre-save middleware to update timestamps
schema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Method to check if user can use this command
schema.methods.canUse = async function(member) {
    // Check if command is enabled
    if (!this.enabled) return { allowed: false, reason: 'Command is disabled' };
    
    // Check denied users first (highest priority)
    if (this.deniedUsers.includes(member.id)) {
        return { allowed: false, reason: 'You are explicitly denied from using this command' };
    }
    
    // Check denied roles
    const hasDeniedRole = member.roles.cache.some(role => this.deniedRoles.includes(role.id));
    if (hasDeniedRole) {
        return { allowed: false, reason: 'Your role is denied from using this command' };
    }
    
    // If allowed users are set, check if user is in the list
    if (this.allowedUsers.length > 0 && !this.allowedUsers.includes(member.id)) {
        return { allowed: false, reason: 'You are not allowed to use this command' };
    }
    
    // If allowed roles are set, check if user has any of them
    if (this.allowedRoles.length > 0) {
        const hasAllowedRole = member.roles.cache.some(role => this.allowedRoles.includes(role.id));
        if (!hasAllowedRole) {
            return { allowed: false, reason: 'You don\'t have the required role to use this command' };
        }
    }
    
    return { allowed: true };
};

// Method to check cooldown
schema.methods.checkCooldown = function(userId) {
    if (this.cooldown <= 0) return { canUse: true };
    
    const lastUse = this.lastUsedBy[userId];
    if (!lastUse) return { canUse: true };
    
    const timeSinceLastUse = Date.now() - lastUse.getTime();
    const cooldownMs = this.cooldown * 1000;
    
    if (timeSinceLastUse < cooldownMs) {
        const remainingTime = Math.ceil((cooldownMs - timeSinceLastUse) / 1000);
        return { 
            canUse: false, 
            remainingTime,
            reason: `Please wait ${remainingTime} more seconds before using this command again`
        };
    }
    
    return { canUse: true };
};

// Method to update usage
schema.methods.recordUsage = function(userId) {
    this.uses += 1;
    this.lastUsed = new Date();
    this.lastUsedBy[userId] = new Date();
    return this.save();
};

module.exports = mongoose.model('CustomCommands', schema);
