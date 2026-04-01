const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Birthday', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Birthday: { type: DataTypes.STRING(20) },
}, { tableName: 'birthday' });
addMongooseCompat(Model);
module.exports = Model;