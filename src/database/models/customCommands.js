const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const CustomCommands = sequelize.define('CustomCommands', {
    guildID: { type: DataTypes.STRING(32), allowNull: false },
    commandName: { type: DataTypes.STRING(100), allowNull: false },
    createdBy: { type: DataTypes.STRING(32) },
    response: { type: DataTypes.TEXT },
    description: { type: DataTypes.STRING(200), defaultValue: 'Custom command' },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    embed: { type: DataTypes.BOOLEAN, defaultValue: false },
    embedColor: { type: DataTypes.STRING(10), defaultValue: '#5865F2' },
    uses: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastUsed: { type: DataTypes.DATE, defaultValue: null },
    allowedRoles: { type: DataTypes.JSON, defaultValue: [] },
    allowedUsers: { type: DataTypes.JSON, defaultValue: [] },
    deniedRoles: { type: DataTypes.JSON, defaultValue: [] },
    deniedUsers: { type: DataTypes.JSON, defaultValue: [] },
    cooldown: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastUsedBy: { type: DataTypes.JSON, defaultValue: {} },
}, {
    tableName: 'custom_commands',
    indexes: [{ unique: true, fields: ['guildID', 'commandName'] }]
});

addMongooseCompat(CustomCommands);

// Instance methods
CustomCommands.prototype.canUse = async function(member) {
    if (!this.enabled) return { allowed: false, reason: 'Command is disabled' };
    const denied = this.deniedUsers || [];
    const deniedRoles = this.deniedRoles || [];
    const allowedUsers = this.allowedUsers || [];
    const allowedRoles = this.allowedRoles || [];
    if (denied.includes(member.id)) return { allowed: false, reason: 'You are denied from using this command' };
    if (member.roles.cache.some(r => deniedRoles.includes(r.id))) return { allowed: false, reason: 'Your role is denied' };
    if (allowedUsers.length > 0 && !allowedUsers.includes(member.id)) return { allowed: false, reason: 'You are not allowed to use this command' };
    if (allowedRoles.length > 0 && !member.roles.cache.some(r => allowedRoles.includes(r.id))) return { allowed: false, reason: 'You need the required role' };
    return { allowed: true };
};

CustomCommands.prototype.checkCooldown = function(userId) {
    if (!this.cooldown || this.cooldown <= 0) return { canUse: true };
    const lastUsedBy = this.lastUsedBy || {};
    const lastUse = lastUsedBy[userId];
    if (!lastUse) return { canUse: true };
    const timeSince = Date.now() - new Date(lastUse).getTime();
    const cooldownMs = this.cooldown * 1000;
    if (timeSince < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - timeSince) / 1000);
        return { canUse: false, remainingTime: remaining, reason: `Please wait ${remaining} more seconds` };
    }
    return { canUse: true };
};

CustomCommands.prototype.recordUsage = function(userId) {
    this.uses = (this.uses || 0) + 1;
    this.lastUsed = new Date();
    const lastUsedBy = this.lastUsedBy || {};
    lastUsedBy[userId] = new Date();
    this.lastUsedBy = lastUsedBy;
    return this.save();
};

module.exports = CustomCommands;
