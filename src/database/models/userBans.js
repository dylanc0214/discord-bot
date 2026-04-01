const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('UserBans', {
    User: { type: DataTypes.STRING(32) },
}, { tableName: 'user_bans' });
addMongooseCompat(Model);
module.exports = Model;
