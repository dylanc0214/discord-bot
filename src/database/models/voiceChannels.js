const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('VoiceChannels', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
}, { tableName: 'voice_channels' });
addMongooseCompat(Model);
module.exports = Model;
