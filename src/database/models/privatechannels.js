const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('PrivateChannels', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Locked: { type: DataTypes.BOOLEAN, defaultValue: false },
    Limit: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'private_channels' });
addMongooseCompat(Model);
module.exports = Model;
