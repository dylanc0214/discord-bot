const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('Invites', {
    Guild: { type: DataTypes.STRING(32) },
    User: { type: DataTypes.STRING(32) },
    Invites: { type: DataTypes.INTEGER, defaultValue: 0 },
    RealInvites: { type: DataTypes.INTEGER, defaultValue: 0 },
    FakeInvites: { type: DataTypes.INTEGER, defaultValue: 0 },
    LeftInvites: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'invites' });
addMongooseCompat(Model);
module.exports = Model;
