const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Tickets', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Closed: { type: DataTypes.BOOLEAN, defaultValue: false },
    TicketNumber: { type: DataTypes.INTEGER },
}, { tableName: 'tickets' });
addMongooseCompat(Model);
module.exports = Model;
