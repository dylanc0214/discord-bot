const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('InviteRewards', {
    Guild: { type: DataTypes.STRING(32) },
    Invites: { type: DataTypes.INTEGER },
    Role: { type: DataTypes.STRING(32) },
}, { tableName: 'invite_rewards' });
addMongooseCompat(Model);
module.exports = Model;
