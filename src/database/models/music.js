const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Music', {
    Guild: { type: DataTypes.STRING(32) },
    Playing: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'music' });
addMongooseCompat(Model);
module.exports = Model;
