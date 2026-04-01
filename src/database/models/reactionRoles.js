const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('ReactionRoles', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Message: { type: DataTypes.STRING(32) },
    Emoji: { type: DataTypes.STRING(100) },
    Role: { type: DataTypes.STRING(32) },
}, { tableName: 'reaction_roles' });
addMongooseCompat(Model);
module.exports = Model;
