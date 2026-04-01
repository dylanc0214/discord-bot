const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Thanks', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Thanks: { type: DataTypes.BIGINT, defaultValue: 0 },
}, { tableName: 'thanks' });
addMongooseCompat(Model);
module.exports = Model;
