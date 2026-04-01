const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Count', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'count' });
addMongooseCompat(Model);
module.exports = Model;