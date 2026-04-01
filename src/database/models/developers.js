const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Developers', {
    Action: { type: DataTypes.STRING(100) },
    Date: { type: DataTypes.STRING(50) },
}, { tableName: 'developers' });
addMongooseCompat(Model);
module.exports = Model;