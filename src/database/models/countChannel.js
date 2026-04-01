const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('CountChannel', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Count: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastUser: { type: DataTypes.STRING(32) },
}, { tableName: 'count_channel' });
addMongooseCompat(Model);
module.exports = Model;