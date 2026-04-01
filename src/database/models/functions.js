const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Functions', {
    Guild: { type: DataTypes.STRING(32) },
    Levels: { type: DataTypes.BOOLEAN, defaultValue: false },
    Beta: { type: DataTypes.BOOLEAN, defaultValue: false },
    AntiAlt: { type: DataTypes.BOOLEAN, defaultValue: false },
    AntiSpam: { type: DataTypes.BOOLEAN, defaultValue: false },
    AntiCaps: { type: DataTypes.BOOLEAN, defaultValue: false },
    AntiInvite: { type: DataTypes.BOOLEAN, defaultValue: false },
    AntiLinks: { type: DataTypes.BOOLEAN, defaultValue: false },
    Prefix: { type: DataTypes.STRING(10) },
    Color: { type: DataTypes.STRING(20) },
}, { tableName: 'functions' });
addMongooseCompat(Model);
module.exports = Model;