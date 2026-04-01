const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const ModerationSettings = sequelize.define('ModerationSettings', {
    guildID: { type: DataTypes.STRING(32), unique: true, allowNull: false },
    logging: { type: DataTypes.JSON, defaultValue: { enabled: true, channelID: null, logActions: { warn: true, kick: true, ban: true, mute: true, unban: true, note: false } } },
    automod: { type: DataTypes.JSON, defaultValue: { enabled: false, rules: [] } },
    roles: { type: DataTypes.JSON, defaultValue: { moderators: [], administrators: [], muted: null, jailed: null } },
    thresholds: { type: DataTypes.JSON, defaultValue: { warn: 0, mute: 3, kick: 5, ban: 7, muteDuration: 3600000 } },
    appeals: { type: DataTypes.JSON, defaultValue: { enabled: true, channelID: null, autoApprove: false, maxAppeals: 3 } },
    notifications: { type: DataTypes.JSON, defaultValue: { dmUsers: true, dmMessage: 'You have been {action} in {guild} for: {reason}', notifyModerators: true } },
    cases: { type: DataTypes.JSON, defaultValue: { autoExpire: true, expireAfter: 7776000000, archiveOld: true } },
    quickActions: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'moderation_settings' });

addMongooseCompat(ModerationSettings);

// Instance methods
ModerationSettings.prototype.isModerator = function(member) {
    const roles = this.roles || { moderators: [], administrators: [] };
    const modRoles = [...(roles.moderators || []), ...(roles.administrators || [])];
    return member.permissions.has('ManageGuild') || member.roles.cache.some(role => modRoles.includes(role.id));
};

ModerationSettings.prototype.isExempt = function(member, rule) {
    const exemptions = (rule || {}).exemptions || { users: [], roles: [], channels: [] };
    return (exemptions.users || []).includes(member.id) ||
           (exemptions.roles || []).some(roleID => member.roles.cache.has(roleID));
};

ModerationSettings.prototype.getNextAction = function(currentWarnings) {
    const t = this.thresholds || { ban: 7, kick: 5, mute: 3, muteDuration: 3600000 };
    if (currentWarnings >= t.ban) return { action: 'BAN', reason: 'Exceeded warning threshold' };
    if (currentWarnings >= t.kick) return { action: 'KICK', reason: 'Exceeded warning threshold' };
    if (currentWarnings >= t.mute) return { action: 'TEMPMUTE', duration: t.muteDuration, reason: 'Exceeded warning threshold' };
    return { action: 'WARN', reason: 'Warning issued' };
};

ModerationSettings.prototype.addAutomodRule = function(ruleData) {
    const automod = this.automod || { enabled: false, rules: [] };
    const rules = Array.isArray(automod.rules) ? automod.rules : [];
    rules.push({ id: require('crypto').randomUUID(), ...ruleData, createdAt: new Date() });
    automod.rules = rules;
    this.automod = automod;
    return this.save();
};

ModerationSettings.prototype.removeAutomodRule = function(ruleID) {
    const automod = this.automod || { rules: [] };
    automod.rules = (automod.rules || []).filter(r => r.id !== ruleID);
    this.automod = automod;
    return this.save();
};

// Static methods
ModerationSettings.getSettings = async function(guildID) {
    const [settings] = await ModerationSettings.findOrCreate({ where: { guildID }, defaults: { guildID } });
    return settings;
};

module.exports = ModerationSettings;
