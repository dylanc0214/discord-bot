const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('LevelMessages', {
    Guild: { type: DataTypes.STRING(32) },
    Message: { type: DataTypes.TEXT },
}, { tableName: 'level_messages' });
addMongooseCompat(Model);
module.exports = Model;
