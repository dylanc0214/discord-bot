const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Reminder', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Reminder: { type: DataTypes.TEXT },
    Time: { type: DataTypes.BIGINT },
}, { tableName: 'reminder' });
addMongooseCompat(Model);
module.exports = Model;
