const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');
const Model = sequelize.define('ChatbotChannel', {
    Guild: { type: DataTypes.STRING(32) },
    Channel: { type: DataTypes.STRING(32) },
}, { tableName: 'chatbot_channel' });
addMongooseCompat(Model);
module.exports = Model;