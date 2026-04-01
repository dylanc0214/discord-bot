const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('JoinRole', {
    Guild: { type: DataTypes.STRING(32) },
    Role: { type: DataTypes.STRING(32) },
}, { tableName: 'join_role' });
addMongooseCompat(Model);
module.exports = Model;
