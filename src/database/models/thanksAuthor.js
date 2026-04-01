const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('ThanksAuthor', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
}, { tableName: 'thanks_author' });
addMongooseCompat(Model);
module.exports = Model;
