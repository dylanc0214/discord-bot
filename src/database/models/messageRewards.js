const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('MessageRewards', {
    Guild: { type: DataTypes.STRING(32) },
    Amount: { type: DataTypes.INTEGER },
    Role: { type: DataTypes.STRING(32) },
}, { tableName: 'message_rewards' });
addMongooseCompat(Model);
module.exports = Model;
