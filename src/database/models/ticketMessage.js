const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('TicketMessage', {
    Guild: { type: DataTypes.STRING(32) },
    Message: { type: DataTypes.TEXT },
    Channel: { type: DataTypes.STRING(32) },
}, { tableName: 'ticket_message' });
addMongooseCompat(Model);
module.exports = Model;
