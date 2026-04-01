const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Messages', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Messages: { type: DataTypes.BIGINT, defaultValue: 0 },
}, { tableName: 'messages_count' });
addMongooseCompat(Model);
module.exports = Model;
