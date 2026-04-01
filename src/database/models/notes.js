const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Notes', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Note: { type: DataTypes.TEXT },
    Moderator: { type: DataTypes.STRING(32) },
}, { tableName: 'notes' });
addMongooseCompat(Model);
module.exports = Model;
