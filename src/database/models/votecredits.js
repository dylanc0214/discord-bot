const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Votecredits', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Credits: { type: DataTypes.BIGINT, defaultValue: 0 },
}, { tableName: 'votecredits' });
addMongooseCompat(Model);
module.exports = Model;
