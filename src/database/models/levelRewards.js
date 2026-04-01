const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('LevelRewards', {
    Guild: { type: DataTypes.STRING(32) },
    Level: { type: DataTypes.INTEGER },
    Role: { type: DataTypes.STRING(32) },
}, { tableName: 'level_rewards' });
addMongooseCompat(Model);
module.exports = Model;
