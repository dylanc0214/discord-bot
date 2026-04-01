const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('StickyMessages', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
    Message: { type: DataTypes.TEXT },
    MessageID: { type: DataTypes.STRING(32) },
}, { tableName: 'sticky_messages' });
addMongooseCompat(Model);
module.exports = Model;
