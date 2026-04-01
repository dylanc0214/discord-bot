const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Stats', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Commands: { type: DataTypes.BIGINT, defaultValue: 0 },
    Messages: { type: DataTypes.BIGINT, defaultValue: 0 },
    Wins: { type: DataTypes.BIGINT, defaultValue: 0 },
    Losses: { type: DataTypes.BIGINT, defaultValue: 0 },
}, { tableName: 'stats' });
addMongooseCompat(Model);
module.exports = Model;
