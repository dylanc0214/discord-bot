const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const ModerationCases = sequelize.define('ModerationCases', {
    guildID: { type: DataTypes.STRING(32), allowNull: false },
    caseID: { type: DataTypes.INTEGER, allowNull: false },
    caseType: { type: DataTypes.STRING(20), allowNull: false },
    userID: { type: DataTypes.STRING(32), allowNull: false },
    userTag: { type: DataTypes.STRING(100), allowNull: false },
    moderatorID: { type: DataTypes.STRING(32), allowNull: false },
    moderatorTag: { type: DataTypes.STRING(100), allowNull: false },
    reason: { type: DataTypes.TEXT },
    evidence: { type: DataTypes.JSON, defaultValue: [] },
    duration: { type: DataTypes.BIGINT, defaultValue: null },
    expiresAt: { type: DataTypes.DATE, defaultValue: null },
    status: { type: DataTypes.STRING(20), defaultValue: 'ACTIVE' },
    appeal: { type: DataTypes.JSON, defaultValue: { requested: false, status: 'NONE' } },
    context: { type: DataTypes.JSON, defaultValue: {} },
    tags: { type: DataTypes.JSON, defaultValue: [] },
    severity: { type: DataTypes.INTEGER, defaultValue: 1 },
    logged: { type: DataTypes.BOOLEAN, defaultValue: false },
    logMessageID: { type: DataTypes.STRING(32), defaultValue: null },
    notified: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    tableName: 'moderation_cases',
    indexes: [{ unique: true, fields: ['guildID', 'caseID'] }]
});

addMongooseCompat(ModerationCases);

// Instance methods
ModerationCases.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return Date.now() > new Date(this.expiresAt).getTime();
};

ModerationCases.prototype.getRemainingTime = function() {
    if (!this.expiresAt) return null;
    const remaining = new Date(this.expiresAt).getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
};

ModerationCases.prototype.addEvidence = function(evidenceText) {
    const ev = Array.isArray(this.evidence) ? this.evidence : [];
    if (ev.length >= 10) throw new Error('Maximum evidence entries reached (10)');
    ev.push(evidenceText);
    this.evidence = ev;
    return this.save();
};

ModerationCases.prototype.createAppeal = function(reason) {
    const appeal = this.appeal || { requested: false };
    if (appeal.requested) throw new Error('Appeal already requested for this case');
    this.appeal = { requested: true, requestedAt: new Date(), reason, status: 'PENDING' };
    this.status = 'APPEALED';
    return this.save();
};

ModerationCases.prototype.reviewAppeal = function(moderatorID, approved, reviewReason) {
    const appeal = this.appeal || {};
    if (!appeal.requested) throw new Error('No appeal requested for this case');
    appeal.status = approved ? 'APPROVED' : 'DENIED';
    appeal.reviewedBy = moderatorID;
    appeal.reviewedAt = new Date();
    appeal.reviewReason = reviewReason;
    this.appeal = appeal;
    if (approved) this.status = 'OVERTURNED';
    return this.save();
};

// Static methods
ModerationCases.getNextCaseID = async function(guildID) {
    const lastCase = await ModerationCases.findOne({ where: { guildID }, order: [['caseID', 'DESC']] });
    return lastCase ? lastCase.caseID + 1 : 1;
};

ModerationCases.getUserHistory = async function(guildID, userID, limit = 10) {
    return ModerationCases.findAll({ where: { guildID, userID }, order: [['createdAt', 'DESC']], limit });
};

ModerationCases.getGuildStats = async function(guildID, timeRange = 30) {
    const since = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
    const cases = await ModerationCases.findAll({ where: { guildID } })
        .then(rows => rows.filter(r => new Date(r.createdAt) >= since));
    return cases.reduce((acc, c) => {
        if (!acc[c.caseType]) acc[c.caseType] = { count: 0, avgSeverity: 0, total: 0 };
        acc[c.caseType].count++;
        acc[c.caseType].total += c.severity || 1;
        acc[c.caseType].avgSeverity = acc[c.caseType].total / acc[c.caseType].count;
        return acc;
    }, {});
};

module.exports = ModerationCases;
