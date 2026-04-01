const crypto = require('crypto');
const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const ApiKey = sequelize.define('ApiKey', {
    key: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    ownerID: { type: DataTypes.STRING(32), allowNull: false },
    ownerName: { type: DataTypes.STRING(100) },
    permissions: { type: DataTypes.JSON, defaultValue: ['read'] },
    guilds: { type: DataTypes.JSON, defaultValue: [] },
    global: { type: DataTypes.BOOLEAN, defaultValue: false },
    rateLimit: { type: DataTypes.INTEGER, defaultValue: 60 },
    dailyLimit: { type: DataTypes.INTEGER, defaultValue: 10000 },
    usage: { type: DataTypes.JSON, defaultValue: { requests: 0, lastUsed: null, dailyUsage: [] } },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    expiresAt: { type: DataTypes.DATE, defaultValue: null },
    allowedIPs: { type: DataTypes.JSON, defaultValue: [] },
    allowedOrigins: { type: DataTypes.JSON, defaultValue: [] },
    metadata: { type: DataTypes.JSON, defaultValue: { version: '1.0.0' } },
}, { tableName: 'api_keys' });

addMongooseCompat(ApiKey);

// Instance methods
ApiKey.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return Date.now() > new Date(this.expiresAt).getTime();
};

ApiKey.prototype.isIPAllowed = function(ip) {
    const ips = this.allowedIPs || [];
    return ips.length === 0 || ips.includes(ip);
};

ApiKey.prototype.recordUsage = function(ip) {
    const usage = this.usage || { requests: 0, dailyUsage: [] };
    usage.requests = (usage.requests || 0) + 1;
    usage.lastUsed = new Date();
    usage.lastIP = ip;
    const today = new Date().toDateString();
    const daily = Array.isArray(usage.dailyUsage) ? usage.dailyUsage : [];
    const todayEntry = daily.find(u => new Date(u.date).toDateString() === today);
    if (todayEntry) { todayEntry.requests += 1; }
    else { daily.push({ date: new Date(), requests: 1 }); if (daily.length > 30) daily.splice(0, 1); }
    usage.dailyUsage = daily;
    this.usage = usage;
    return this.save();
};

ApiKey.prototype.rotateKey = async function() {
    const oldKey = this.key;
    this.key = crypto.randomBytes(32).toString('hex');
    const meta = this.metadata || {};
    meta.lastRotated = new Date();
    this.metadata = meta;
    await this.save();
    return { oldKey, newKey: this.key };
};

ApiKey.prototype.deactivate = function(reason = '') {
    this.active = false;
    const meta = this.metadata || {};
    meta.notes = `Deactivated: ${reason}`;
    this.metadata = meta;
    return this.save();
};

// Static methods
ApiKey.generateKey = function(length = 32) {
    return crypto.randomBytes(length).toString('hex');
};

ApiKey.createKey = async function(keyData) {
    return ApiKey.create({ key: ApiKey.generateKey(), ...keyData });
};

ApiKey.getKeysByOwner = function(ownerID) {
    return ApiKey.findAll({ where: { ownerID } });
};

ApiKey.getActiveKeys = function() {
    return ApiKey.findAll({ where: { active: true } });
};

ApiKey.getUsageStats = async function() {
    const keys = await ApiKey.findAll({ where: { active: true } });
    const totalRequests = keys.reduce((s, k) => s + ((k.usage || {}).requests || 0), 0);
    return { totalKeys: keys.length, totalRequests, activeKeys: keys.filter(k => k.active).length };
};

module.exports = ApiKey;
