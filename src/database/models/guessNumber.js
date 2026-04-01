const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('GuessNumber', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Number: { type: DataTypes.INTEGER },
    Active: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'guess_number' });
addMongooseCompat(Model);
module.exports = Model;
