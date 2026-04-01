const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Blacklist', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Reason: { type: DataTypes.TEXT },
}, { tableName: 'blacklist' });
addMongooseCompat(Model);
module.exports = Model;