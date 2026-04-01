const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Tempban', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Time: { type: DataTypes.BIGINT },
    expires: { type: DataTypes.DATE },
}, { tableName: 'tempban' });
addMongooseCompat(Model);
module.exports = Model;
