const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('WarnCase', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
}, { tableName: 'warn_case' });
addMongooseCompat(Model);
module.exports = Model;
