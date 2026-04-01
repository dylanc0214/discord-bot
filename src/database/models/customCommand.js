const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('CustomCommand', {
    Guild: { type: DataTypes.STRING(32) },
    Command: { type: DataTypes.STRING(100) },
    Response: { type: DataTypes.TEXT },
}, { tableName: 'custom_command' });
addMongooseCompat(Model);
module.exports = Model;