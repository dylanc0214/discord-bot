const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('EconomyTimeout', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Beg: { type: DataTypes.STRING(50) },
    Crime: { type: DataTypes.STRING(50) },
    Daily: { type: DataTypes.STRING(50) },
    Weekly: { type: DataTypes.STRING(50) },
    Monthly: { type: DataTypes.STRING(50) },
    Hourly: { type: DataTypes.STRING(50) },
    Work: { type: DataTypes.STRING(50) },
    Rob: { type: DataTypes.STRING(50) },
    Fish: { type: DataTypes.STRING(50) },
    Hunt: { type: DataTypes.STRING(50) },
    Yearly: { type: DataTypes.STRING(50) },
    Present: { type: DataTypes.STRING(50) },
}, { tableName: 'economy_timeout' });
addMongooseCompat(Model);
module.exports = Model;