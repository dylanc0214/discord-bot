const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Profile', {
    User: { type: DataTypes.STRING(32) },
    Gender: { type: DataTypes.STRING(20), defaultValue: '' },
    Age: { type: DataTypes.STRING(10), defaultValue: '' },
    Orgin: { type: DataTypes.STRING(100), defaultValue: '' },
    Pets: { type: DataTypes.JSON },
    Songs: { type: DataTypes.JSON },
    Movies: { type: DataTypes.JSON },
    Actors: { type: DataTypes.JSON },
    Artists: { type: DataTypes.JSON },
    Food: { type: DataTypes.JSON },
    Hobbys: { type: DataTypes.JSON },
    Status: { type: DataTypes.TEXT, defaultValue: '' },
    Aboutme: { type: DataTypes.TEXT, defaultValue: '' },
    Color: { type: DataTypes.STRING(20), defaultValue: '' },
    Birthday: { type: DataTypes.STRING(20), defaultValue: '' },
}, { tableName: 'profile' });
addMongooseCompat(Model);
module.exports = Model;