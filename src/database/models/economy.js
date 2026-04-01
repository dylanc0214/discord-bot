const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Economy', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Money: { type: DataTypes.BIGINT, defaultValue: 0 },
    Bank: { type: DataTypes.BIGINT, defaultValue: 0 },
}, { tableName: 'economy' });
addMongooseCompat(Model);
module.exports = Model;