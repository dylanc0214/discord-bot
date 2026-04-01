const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('InviteBy', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    InvitedBy: { type: DataTypes.STRING(32) },
}, { tableName: 'invite_by' });
addMongooseCompat(Model);
module.exports = Model;
