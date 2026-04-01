const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Afk', {
    User: { type: DataTypes.STRING(32) },
    Reason: { type: DataTypes.TEXT },
}, { tableName: 'afk' });
addMongooseCompat(Model);
module.exports = Model;