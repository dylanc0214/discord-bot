const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Levels', {
    userID: { type: DataTypes.STRING(32) },
    guildID: { type: DataTypes.STRING(32) },
    xp: { type: DataTypes.BIGINT, defaultValue: 0 },
    level: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'levels' });
addMongooseCompat(Model);
module.exports = Model;
