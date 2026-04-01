

const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Discord = require('discord.js');
const moment = require("moment");
require("moment-duration-format");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with the bot'),

    /** 
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */

    run: async (client, interaction, args) => {
        const toUpperCase = (string) => string.charAt(0).toUpperCase() + string.slice(1);
        const commad = (name) => {
            const mentions = client.getSlashMentions(name); // array of [mention, description]
            return mentions.map(cmd => `${cmd[0]} - \`${cmd[1]}\``).join("\n");
        }

        let em1 = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username}\'s Help Menu`, iconURL: client.user.displayAvatarURL({ format: "png" }) })
            .setImage(`https://i.stack.imgur.com/Fzh0w.png`)
            .setColor(`#5865F2`)
            .addFields([
                {
                    name: "Categories [1-9]",
                    value: `>>> 🚫┆AFK
                    📣┆Announcement
                    👮‍♂️┆Auto mod
                    ⚙️┆Auto setup
                    🎂┆Birthday
                    🤖┆Bot
                    🎰┆Casino
                    ⚙┆Configuration
                    💻┆CustomCommand`,
                    inline: true
                },
                {
                    name: "Categories [19-27]",
                    value: `>>> 🆙┆Leveling
                    💬┆Messages
                    👔┆Moderation
                    🎶┆Music
                    📓┆Notepad
                    👤┆Profile
                    📻┆Radio
                    😛┆Reaction Role
                    🔍┆Search`,
                    inline: true
                },
                {
                    name: "\u200b",
                    value: "\u200b",
                    inline: true
                },
                {
                    name: "Categories [10-18]",
                    value: `>>> 💳┆Dcredits
                      💰┆Economy
                      👪┆Family
                      😂┆Fun
                      🎮┆Games
                      🥳┆Giveaway
                      ⚙️┆Guild
                      🖼┆Images
                      📨┆Invites`,
                    inline: true
                }, {
                    name: "Categories Part [28-36]",
                    value: `>>> 📊┆Server stats
                    ⚙️┆Setup
                    🎛┆Soundboard
                    🗨️┆StickyMessage
                    💡┆Suggestions
                    🤝┆Thanks
                    🎫┆Tickets
                    ⚒️┆Tools
                    🔊┆Voice`,
                    inline: true
                },
                {
                    name: "\u200b",
                    value: "\u200b",
                    inline: true
                },
            ])


        let startButton = new ButtonBuilder().setStyle(2).setEmoji(`⏮️`).setCustomId('start'),
            backButton = new ButtonBuilder().setStyle(2).setEmoji(`⬅️`).setCustomId('back'),
            forwardButton = new ButtonBuilder().setStyle(2).setEmoji(`➡️`).setCustomId('forward'),
            endButton = new ButtonBuilder().setStyle(2).setEmoji(`⏭️`).setCustomId('end')

        const options = [{ label: 'Owerview', value: '0' }]
        const options2 = []

        let counter = 0
        let counter2 = 25
        require("fs").readdirSync(`${process.cwd()}/src/commands`).slice(0, 24).forEach(dirs => {
            counter++
            const opt = {
                label: toUpperCase(dirs.replace("-", " ")),
                value: `${counter}`
            }
            options.push(opt)
        })
        require("fs").readdirSync(`${process.cwd()}/src/commands`).slice(25, 37).forEach(dirs => {
            counter2++
            const opt = {
                label: toUpperCase(dirs.replace("-", " ")),
                value: `${counter2}`
            }
            options2.push(opt)
        })

        let menu = new StringSelectMenuBuilder().setPlaceholder('Change page').setCustomId('pagMenu').addOptions(options).setMaxValues(1).setMinValues(1),
            menu2 = new StringSelectMenuBuilder().setPlaceholder('Change page').setCustomId('pagMenu2').addOptions(options2).setMaxValues(1).setMinValues(1)

        const allButtons = [startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]

        let group1 = new ActionRowBuilder().addComponents(menu)
        let group2 = new ActionRowBuilder().addComponents(allButtons)
        let group3 = new ActionRowBuilder().addComponents(menu2)

        const components = [group2, group1, group3]

        // Defer the reply immediately to prevent interaction timeout

        var embeds = [em1]

        require("fs").readdirSync(`${process.cwd()}/src/commands`).forEach(dirs => { embeds.push(new EmbedBuilder().setAuthor({ name: toUpperCase(dirs), iconURL: client.user.displayAvatarURL({ format: "png" }), url: `h` + `tt` + `ps:` + `//` + `d` + `s` + `c` + `.` + `gg` + `/u` + `o` + `a` + `i` + `o` }).setDescription(`${commad(dirs)}`)) })

        let currentPage = 0

        let helpMessage = await interaction.editReply({
            content: `Click on the buttons to change page`,
            embeds: [em1],
            components: components,
        })

        const collector = helpMessage.createMessageComponentCollector((button) => button.user.id === interaction.user.id, { time: 300000 }); // 5 minutes, resets on each interaction

        collector.on('collect', async (b) => {
            if (b.user.id !== interaction.user.id)
                return b.reply({
                    content: `**You Can't Use it\n**`,
                    ephemeral: true
                });
            
            // Reset the collector timer on each interaction
            collector.resetTimer();
            
            switch (b.customId) {
                case 'start':
                    currentPage = 0
                    group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)])
                    b.update({ embeds: [embeds[currentPage]], components: components })
                    break;
                case 'back':
                    --currentPage;
                    if (currentPage === 0) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
                    b.update({ embeds: [embeds[currentPage]], components: components })
                    break;
                case 'forward':
                    currentPage++;
                    if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
                    b.update({ embeds: [embeds[currentPage]], components: components })
                    break;
                case 'end':
                    currentPage = embeds.length - 1;
                    group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)])
                    b.update({ embeds: [embeds[currentPage]], components: components })
                    break;
                case 'pagMenu':
                    currentPage = parseInt(b.values[0])
                    if (currentPage === 0) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
                    b.update({ embeds: [embeds[currentPage]], components: components })
                    break;
                case 'pagMenu2':
                    currentPage = parseInt(b.values[0])
                    if (currentPage === 0) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), endButton.setDisabled(false)]) } else if (currentPage === embeds.length - 1) { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), endButton.setDisabled(true)]) } else { group2 = new ActionRowBuilder().addComponents([startButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), endButton.setDisabled(false)]) }
                    b.update({ embeds: [embeds[currentPage]], components: components })
                    break;
                default:
                    currentPage = 0
                    b.update({ embeds: [embeds[currentPage]], components: null })
                    break;
            }
        });

        collector.on('end', collected => {
            // When collector ends (timeout after 5 minutes of inactivity), remove all components to prevent interaction failure
            if (helpMessage && !helpMessage.deleted) {
                helpMessage.edit({
                    content: `Help menu expired (5 minutes inactive)`,
                    embeds: [helpMessage.embeds[0]], 
                    components: []
                }).catch(err => {
                    // If message was deleted or interaction failed, log error but don't crash
                    console.log('Failed to edit help message after timeout:', err.message);
                });
            }
        });

        collector.on('error', (e) => console.log(e));

        embeds.map((embed, index) => {
            embed.setColor("#5865F2").setImage(`https://i.stack.imgur.com/Fzh0w.png`)
                .setFooter({ text: `Page ${index + 1} / ${embeds.length}`, iconURL: client.user.displayAvatarURL() });
        })

    },
};