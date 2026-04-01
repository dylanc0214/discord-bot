const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Badge', {
    User: { type: DataTypes.STRING(32) },
    Badge: { type: DataTypes.STRING(100) },
}, { tableName: 'badge' });
addMongooseCompat(Model);
module.exports = Model;