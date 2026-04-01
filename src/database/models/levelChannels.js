const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('LevelChannels', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
}, { tableName: 'level_channels' });
addMongooseCompat(Model);
module.exports = Model;
