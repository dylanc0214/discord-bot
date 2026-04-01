const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Giveaways', {
    messageId: { type: DataTypes.STRING(32) },
    channelId: { type: DataTypes.STRING(32) },
    guildId: { type: DataTypes.STRING(32) },
    startAt: { type: DataTypes.BIGINT },
    endAt: { type: DataTypes.BIGINT },
    ended: { type: DataTypes.BOOLEAN },
    winnerCount: { type: DataTypes.INTEGER },
    prize: { type: DataTypes.TEXT },
    messages: { type: DataTypes.JSON },
    thumbnail: { type: DataTypes.TEXT },
    hostedBy: { type: DataTypes.STRING(100) },
    winnerIds: { type: DataTypes.JSON },
    reaction: { type: DataTypes.JSON },
    botsCanWin: { type: DataTypes.BOOLEAN },
    embedColor: { type: DataTypes.JSON },
    embedColorEnd: { type: DataTypes.JSON },
    exemptPermissions: { type: DataTypes.JSON },
    exemptMembers: { type: DataTypes.TEXT },
    bonusEntries: { type: DataTypes.TEXT },
    extraData: { type: DataTypes.JSON },
    lastChance: { type: DataTypes.JSON },
    pauseOptions: { type: DataTypes.JSON },
    isDrop: { type: DataTypes.BOOLEAN },
    allowedMentions: { type: DataTypes.JSON },
}, { tableName: 'giveaways' });
addMongooseCompat(Model);
module.exports = Model;