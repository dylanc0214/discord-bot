const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('CustomCommandAdvanced', {
    Guild: { type: DataTypes.STRING(32) },
    Name: { type: DataTypes.STRING(100) },
    Responce: { type: DataTypes.TEXT },
    Action: { type: DataTypes.STRING(50), defaultValue: 'Normal' },
}, { tableName: 'custom_command_advanced' });
addMongooseCompat(Model);
module.exports = Model;