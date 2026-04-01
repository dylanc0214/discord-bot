const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('StarboardChannels', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
}, { tableName: 'starboard_channels' });
addMongooseCompat(Model);
module.exports = Model;
