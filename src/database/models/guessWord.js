const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('GuessWord', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Word: { type: DataTypes.STRING(100) },
    Active: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'guess_word' });
addMongooseCompat(Model);
module.exports = Model;
