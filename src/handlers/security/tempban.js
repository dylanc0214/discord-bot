const Schema = require("../../database/models/tempban");

module.exports = (client) => {
    const checkForExpired = async () => {
        const now = new Date()

        const condition = {
            expires: {
                [require('sequelize').Op.lt]: now,
            },
        }

        const results = await Schema.findAll({ where: condition })

        if (results) {
            for (const result of results) {
                const { guildId, userId } = result

                const guild = client.guilds.cache.get(guildId)
                if (guild) {
                    guild.members.unban(userId)
                }
            }

            await Schema.destroy({ where: condition })
        }

        setTimeout(checkForExpired, 1000 * 10)
    }

    checkForExpired()
}