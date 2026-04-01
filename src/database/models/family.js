const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Family', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Parent: { type: DataTypes.JSON, defaultValue: null },
    Partner: { type: DataTypes.STRING(32), defaultValue: null },
    Children: { type: DataTypes.JSON, defaultValue: null },
}, { tableName: 'family' });
addMongooseCompat(Model);
module.exports = Model;