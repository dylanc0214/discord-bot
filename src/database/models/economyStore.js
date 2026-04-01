const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('EconomyStore', {
    Guild: { type: DataTypes.STRING(32) },
    Role: { type: DataTypes.STRING(32) },
    Amount: { type: DataTypes.BIGINT },
}, { tableName: 'economy_store' });
addMongooseCompat(Model);
module.exports = Model;