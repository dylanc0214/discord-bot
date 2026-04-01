const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Verify', {
    Guild: { type: DataTypes.STRING(32) },
    Role: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
}, { tableName: 'verify' });
addMongooseCompat(Model);
module.exports = Model;
