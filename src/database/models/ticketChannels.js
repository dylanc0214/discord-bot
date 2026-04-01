const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('TicketChannels', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Category: { type: DataTypes.STRING(32) },
    LogChannel: { type: DataTypes.STRING(32) },
    Role: { type: DataTypes.STRING(32) },
}, { tableName: 'ticket_channels' });
addMongooseCompat(Model);
module.exports = Model;
