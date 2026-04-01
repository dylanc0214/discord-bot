const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Radios', {
    Guild: { type: DataTypes.STRING(32) },
    Radio: { type: DataTypes.TEXT },
}, { tableName: 'radios' });
addMongooseCompat(Model);
module.exports = Model;
