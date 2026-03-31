const mongoose = require('mongoose');
const crypto = require('crypto');

const schema = new mongoose.Schema({
    // Key identification
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    
    // Owner information
    ownerID: { type: String, required: true, index: true },
    ownerName: { type: String, required: true },
    
    // Key permissions
    permissions: [{ 
        type: String, 
        enum: ['read', 'write', 'economy', 'moderation', 'admin'],
        default: ['read']
    }],
    
    // Access control
    guilds: [{ type: String }], // Specific guilds this key can access
    global: { type: Boolean, default: false }, // Can access all guilds
    
    // Rate limiting
    rateLimit: { type: Number, default: 60 }, // Requests per minute
    dailyLimit: { type: Number, default: 10000 }, // Requests per day
    
    // Usage tracking
    usage: {
        requests: { type: Number, default: 0 },
        lastUsed: { type: Date, default: null },
        lastIP: { type: String, default: null },
        dailyUsage: [{
            date: { type: Date, default: Date.now },
            requests: { type: Number, default: 0 }
        }]
    },
    
    // Key status
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null }, // Optional expiration
    
    // Security
    allowedIPs: [{ type: String }], // IP whitelist (empty = no restriction)
    allowedOrigins: [{ type: String }], // CORS origins
    
    // Metadata
    metadata: {
        createdAt: { type: Date, default: Date.now },
        lastRotated: { type: Date, default: Date.now },
        version: { type: String, default: '1.0.0' },
        tags: [String],
        notes: { type: String, maxlength: 1000 }
    }
}, { 
    timestamps: true 
});

// Static method to generate API key
schema.statics.generateKey = function(length = 32) {
    return crypto.randomBytes(length).toString('hex');
};

// Static method to create new API key
schema.statics.createKey = async function(keyData) {
    const key = this.generateKey();
    
    const apiKey = new this({
        key,
        ...keyData
    });
    
    return apiKey.save();
};

// Method to check if key is expired
schema.methods.isExpired = function() {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt.getTime();
};

// Method to check if IP is allowed
schema.methods.isIPAllowed = function(ip) {
    if (this.allowedIPs.length === 0) return true;
    return this.allowedIPs.includes(ip);
};

// Method to check if origin is allowed
schema.methods.isOriginAllowed = function(origin) {
    if (this.allowedOrigins.length === 0) return true;
    return this.allowedOrigins.includes(origin);
};

// Method to check daily rate limit
schema.methods.checkDailyLimit = function() {
    const today = new Date().toDateString();
    const todayUsage = this.usage.dailyUsage.find(u => u.date.toDateString() === today);
    
    if (!todayUsage) {
        // Reset daily usage
        this.usage.dailyUsage = [{
            date: new Date(),
            requests: 0
        }];
        return this.dailyLimit;
    }
    
    return this.dailyLimit - todayUsage.requests;
};

// Method to record usage
schema.methods.recordUsage = function(ip) {
    this.usage.requests += 1;
    this.usage.lastUsed = new Date();
    this.usage.lastIP = ip;
    
    // Update daily usage
    const today = new Date().toDateString();
    const todayUsage = this.usage.dailyUsage.find(u => u.date.toDateString() === today);
    
    if (todayUsage) {
        todayUsage.requests += 1;
    } else {
        this.usage.dailyUsage.push({
            date: new Date(),
            requests: 1
        });
        
        // Keep only last 30 days of daily usage
        if (this.usage.dailyUsage.length > 30) {
            this.usage.dailyUsage = this.usage.dailyUsage.slice(-30);
        }
    }
    
    return this.save();
};

// Method to rotate key
schema.methods.rotateKey = async function() {
    const oldKey = this.key;
    this.key = this.constructor.generateKey();
    this.metadata.lastRotated = new Date();
    this.metadata.version = this.generateVersion();
    
    await this.save();
    
    return { oldKey, newKey: this.key };
};

// Method to generate version
schema.methods.generateVersion = function() {
    const [major, minor, patch] = this.metadata.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
};

// Method to add guild access
schema.methods.addGuild = function(guildId) {
    if (!this.guilds.includes(guildId)) {
        this.guilds.push(guildId);
        return this.save();
    }
    return this;
};

// Method to remove guild access
schema.methods.removeGuild = function(guildId) {
    const index = this.guilds.indexOf(guildId);
    if (index > -1) {
        this.guilds.splice(index, 1);
        return this.save();
    }
    return this;
};

// Method to add permission
schema.methods.addPermission = function(permission) {
    if (!this.permissions.includes(permission)) {
        this.permissions.push(permission);
        return this.save();
    }
    return this;
};

// Method to remove permission
schema.methods.removePermission = function(permission) {
    const index = this.permissions.indexOf(permission);
    if (index > -1) {
        this.permissions.splice(index, 1);
        return this.save();
    }
    return this;
};

// Method to deactivate key
schema.methods.deactivate = function(reason = '') {
    this.active = false;
    this.metadata.notes = `Deactivated: ${reason}`;
    return this.save();
};

// Static method to get keys by owner
schema.statics.getKeysByOwner = function(ownerID) {
    return this.find({ ownerID }).sort({ metadata: { createdAt: -1 } });
};

// Static method to get active keys
schema.statics.getActiveKeys = function() {
    return this.find({ 
        active: true,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    });
};

// Static method to cleanup expired keys
schema.statics.cleanupExpired = function() {
    return this.deleteMany({
        $or: [
            { active: false },
            { expiresAt: { $lt: new Date() } }
        ]
    });
};

// Static method to get usage statistics
schema.statics.getUsageStats = async function(timeRange = 7) {
    const since = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
    
    const stats = await this.aggregate([
        { $match: { active: true } },
        {
            $group: {
                _id: null,
                totalKeys: { $sum: 1 },
                totalRequests: { $sum: '$usage.requests' },
                activeKeys: { 
                    $sum: { 
                        $cond: [
                            { $gte: ['$usage.lastUsed', since] },
                            1,
                            0
                        ]
                    }
                },
                avgRequestsPerKey: { $avg: '$usage.requests' },
                keysWithGuildAccess: { 
                    $sum: { 
                        $cond: [
                            { $gt: [{ $size: '$guilds' }, 0] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalKeys: 0,
        totalRequests: 0,
        activeKeys: 0,
        avgRequestsPerKey: 0,
        keysWithGuildAccess: 0
    };
};

// Pre-save middleware to validate data
schema.pre('save', function(next) {
    // Ensure at least read permission
    if (this.permissions.length === 0) {
        this.permissions.push('read');
    }
    
    // Remove duplicate permissions
    this.permissions = [...new Set(this.permissions)];
    
    // Remove duplicate guilds
    this.guilds = [...new Set(this.guilds)];
    
    // Remove duplicate allowed IPs
    this.allowedIPs = [...new Set(this.allowedIPs)];
    
    // Remove duplicate allowed origins
    this.allowedOrigins = [...new Set(this.allowedOrigins)];
    
    next();
});

// Index for efficient queries
schema.index({ ownerID: 1, active: 1 });
schema.index({ key: 1, active: 1 });
schema.index({ 'usage.lastUsed': 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ApiKey', schema);
