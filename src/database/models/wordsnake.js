const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Wordsnake', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    LastWord: { type: DataTypes.STRING(100) },
    Active: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'wordsnake' });
addMongooseCompat(Model);
module.exports = Model;
