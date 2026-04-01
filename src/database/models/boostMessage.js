const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('BoostMessage', {
    Guild: { type: DataTypes.STRING(32) },
    Message: { type: DataTypes.TEXT },
    Channel: { type: DataTypes.STRING(32) },
}, { tableName: 'boost_message' });
addMongooseCompat(Model);
module.exports = Model;