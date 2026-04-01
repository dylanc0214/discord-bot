const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Voice', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Minutes: { type: DataTypes.BIGINT, defaultValue: 0 },
    Muted: { type: DataTypes.BIGINT, defaultValue: 0 },
}, { tableName: 'voice' });
addMongooseCompat(Model);
module.exports = Model;
