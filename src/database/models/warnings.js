const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Warnings', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Warnings: { type: DataTypes.JSON },
}, { tableName: 'warnings' });
addMongooseCompat(Model);
module.exports = Model;
