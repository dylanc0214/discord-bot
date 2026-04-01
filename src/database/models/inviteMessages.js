const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('InviteMessages', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Message: { type: DataTypes.TEXT },
}, { tableName: 'invite_messages' });
addMongooseCompat(Model);
module.exports = Model;
