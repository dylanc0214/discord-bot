const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('EconomyItems', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    FishingRod: { type: DataTypes.BOOLEAN, defaultValue: false },
    FishingRodUsage: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'economy_items_simple' });
addMongooseCompat(Model);
module.exports = Model;