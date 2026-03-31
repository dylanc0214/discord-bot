const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationCases = require('../../../database/models/moderationCases');
const ModerationSettings = require('../../../database/models/moderationSettings');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cases')
        .setDescription('Manage and view moderation cases')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View a specific case')
                .addIntegerOption(option =>
                    option.setName('case')
                        .setDescription('Case ID')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('View cases for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of cases to show')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('recent')
                .setDescription('View recent moderation cases')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of cases to show')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Filter by case type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Warnings', value: 'WARN' },
                            { name: 'Kicks', value: 'KICK' },
                            { name: 'Bans', value: 'BAN' },
                            { name: 'Mutes', value: 'MUTE' },
                            { name: 'Notes', value: 'NOTE' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search cases by reason or moderator')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Search query')
                        .setRequired(true)
                        .setMaxLength(100))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of results')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('note')
                .setDescription('Add a note to a case')
                .addIntegerOption(option =>
                    option.setName('case')
                        .setDescription('Case ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('note')
                        .setDescription('Note content')
                        .setRequired(true)
                        .setMaxLength(500)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit case details')
                .addIntegerOption(option =>
                    option.setName('case')
                        .setDescription('Case ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('New reason')
                        .setRequired(false)
                        .setMaxLength(1000))
                .addIntegerOption(option =>
                    option.setName('severity')
                        .setDescription('New severity (1-5)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(5)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show moderation statistics')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'view':
                await handleView(interaction, client);
                break;
            case 'user':
                await handleUser(interaction, client);
                break;
            case 'recent':
                await handleRecent(interaction, client);
                break;
            case 'search':
                await handleSearch(interaction, client);
                break;
            case 'note':
                await handleNote(interaction, client);
                break;
            case 'edit':
                await handleEdit(interaction, client);
                break;
            case 'stats':
                await handleStats(interaction, client);
                break;
        }
    }
};

// Handle viewing a specific case
async function handleView(interaction, client) {
    await interaction.deferReply();

    const caseID = interaction.options.getInteger('case');

    try {
        const moderationCase = await ModerationCases.findOne({ 
            guildID: interaction.guild.id, 
            caseID 
        });

        if (!moderationCase) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Case Not Found',
                    description: `Case #${caseID} not found in this server.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        const embed = createCaseEmbed(moderationCase, client);
        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error viewing case:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch case details.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle viewing user cases
async function handleUser(interaction, client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;

    try {
        const cases = await ModerationCases.find({ 
            guildID: interaction.guild.id, 
            userID: targetUser.id 
        })
        .sort({ createdAt: -1 })
        .limit(limit);

        if (cases.length === 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '📋 User Cases',
                    description: `No moderation cases found for **${targetUser.tag}**.`,
                    color: client.config?.colors?.normal || 0x5865F2
                }]
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Cases for ${targetUser.tag}`)
            .setDescription(`Showing ${cases.length} most recent cases`)
            .setColor(client.config?.colors?.normal || 0x5865F2)
            .setThumbnail(targetUser.displayAvatarURL());

        for (const moderationCase of cases) {
            const status = moderationCase.status === 'ACTIVE' ? '✅' : 
                          moderationCase.status === 'EXPIRED' ? '⏰' : 
                          moderationCase.status === 'APPEALED' ? '🔄' : '❌';
            
            const value = `**Type:** ${moderationCase.caseType}\n**Reason:** ${moderationCase.reason.substring(0, 100)}${moderationCase.reason.length > 100 ? '...' : ''}\n**Moderator:** <@${moderationCase.moderatorID}>\n**Date:** <t:${Math.floor(moderationCase.createdAt.getTime() / 1000)}:R>`;
            
            embed.addFields({
                name: `${status} Case #${moderationCase.caseID}`,
                value,
                inline: false
            });
        }

        embed.setFooter({ 
            text: `Total cases: ${await ModerationCases.countDocuments({ guildID: interaction.guild.id, userID: targetUser.id })}` 
        });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error viewing user cases:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch user cases.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle viewing recent cases
async function handleRecent(interaction, client) {
    await interaction.deferReply();

    const limit = interaction.options.getInteger('limit') || 10;
    const type = interaction.options.getString('type') || 'all';

    try {
        const query = { guildID: interaction.guild.id };
        if (type !== 'all') {
            query.caseType = type;
        }

        const cases = await ModerationCases.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);

        if (cases.length === 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '📋 Recent Cases',
                    description: `No ${type === 'all' ? '' : type} cases found.`,
                    color: client.config?.colors?.normal || 0x5865F2
                }]
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Recent ${type === 'all' ? '' : type} Cases`)
            .setDescription(`Showing ${cases.length} most recent cases`)
            .setColor(client.config?.colors?.normal || 0x5865F2);

        for (const moderationCase of cases) {
            const status = moderationCase.status === 'ACTIVE' ? '✅' : 
                          moderationCase.status === 'EXPIRED' ? '⏰' : 
                          moderationCase.status === 'APPEALED' ? '🔄' : '❌';
            
            const value = `**User:** <@${moderationCase.userID}>\n**Reason:** ${moderationCase.reason.substring(0, 100)}${moderationCase.reason.length > 100 ? '...' : ''}\n**Moderator:** <@${moderationCase.moderatorID}>\n**Date:** <t:${Math.floor(moderationCase.createdAt.getTime() / 1000)}:R>`;
            
            embed.addFields({
                name: `${status} Case #${moderationCase.caseID} - ${moderationCase.caseType}`,
                value,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error viewing recent cases:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch recent cases.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle searching cases
async function handleSearch(interaction, client) {
    await interaction.deferReply();

    const query = interaction.options.getString('query');
    const limit = interaction.options.getInteger('limit') || 10;

    try {
        const cases = await ModerationCases.find({
            guildID: interaction.guild.id,
            $or: [
                { reason: { $regex: query, $options: 'i' } },
                { moderatorTag: { $regex: query, $options: 'i' } },
                { userTag: { $regex: query, $options: 'i' } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(limit);

        if (cases.length === 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '🔍 Search Results',
                    description: `No cases found matching "${query}".`,
                    color: client.config?.colors?.normal || 0x5865F2
                }]
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Search Results for "${query}"`)
            .setDescription(`Found ${cases.length} cases`)
            .setColor(client.config?.colors?.normal || 0x5865F2);

        for (const moderationCase of cases) {
            const value = `**User:** <@${moderationCase.userID}>\n**Reason:** ${moderationCase.reason.substring(0, 100)}${moderationCase.reason.length > 100 ? '...' : ''}\n**Moderator:** ${moderationCase.moderatorTag}\n**Date:** <t:${Math.floor(moderationCase.createdAt.getTime() / 1000)}:R>`;
            
            embed.addFields({
                name: `Case #${moderationCase.caseID} - ${moderationCase.caseType}`,
                value,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error searching cases:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to search cases.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle adding notes to cases
async function handleNote(interaction, client) {
    await interaction.deferReply();

    const caseID = interaction.options.getInteger('case');
    const note = interaction.options.getString('note');

    try {
        const moderationCase = await ModerationCases.findOne({ 
            guildID: interaction.guild.id, 
            caseID 
        });

        if (!moderationCase) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Case Not Found',
                    description: `Case #${caseID} not found.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        await moderationCase.addEvidence(`Note by ${interaction.user.tag}: ${note}`);

        await interaction.editReply({
            embeds: [{
                title: '✅ Note Added',
                description: `Note added to Case #${caseID}.`,
                color: client.config?.colors?.success || 0x57F287
            }]
        });

    } catch (error) {
        console.error('Error adding note:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to add note to case.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle editing cases
async function handleEdit(interaction, client) {
    await interaction.deferReply();

    const caseID = interaction.options.getInteger('case');
    const newReason = interaction.options.getString('reason');
    const newSeverity = interaction.options.getInteger('severity');

    try {
        const moderationCase = await ModerationCases.findOne({ 
            guildID: interaction.guild.id, 
            caseID 
        });

        if (!moderationCase) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Case Not Found',
                    description: `Case #${caseID} not found.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Update fields
        if (newReason) moderationCase.reason = newReason;
        if (newSeverity) moderationCase.severity = newSeverity;

        await moderationCase.save();

        await interaction.editReply({
            embeds: [{
                title: '✅ Case Updated',
                description: `Case #${caseID} has been updated.`,
                color: client.config?.colors?.success || 0x57F287
            }]
        });

    } catch (error) {
        console.error('Error editing case:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to edit case.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle showing statistics
async function handleStats(interaction, client) {
    await interaction.deferReply();

    try {
        const stats = await ModerationCases.getGuildStats(interaction.guild.id, 30);
        const totalCases = await ModerationCases.countDocuments({ guildID: interaction.guild.id });

        const embed = new EmbedBuilder()
            .setTitle('📊 Moderation Statistics')
            .setDescription(`Statistics for the last 30 days`)
            .setColor(client.config?.colors?.normal || 0x5865F2)
            .addFields(
                { name: 'Total Cases (All Time)', value: totalCases.toString(), inline: true }
            );

        // Add stats for each case type
        for (const [caseType, data] of Object.entries(stats)) {
            embed.addFields({
                name: caseType,
                value: `${data.count} cases\nAvg Severity: ${data.avgSeverity?.toFixed(1) || 'N/A'}`,
                inline: true
            });
        }

        embed.setFooter({ text: `Statistics for ${interaction.guild.name}` });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error showing stats:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch statistics.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Helper function to create case embed
function createCaseEmbed(moderationCase, client) {
    const embed = new EmbedBuilder()
        .setTitle(`${getCaseIcon(moderationCase.caseType)} Case #${moderationCase.caseID} - ${moderationCase.caseType}`)
        .setColor(getCaseColor(moderationCase.caseType))
        .addFields(
            { name: 'User', value: `${moderationCase.userTag} (${moderationCase.userID})`, inline: true },
            { name: 'Moderator', value: `${moderationCase.moderatorTag} (${moderationCase.moderatorID})`, inline: true },
            { name: 'Status', value: moderationCase.status, inline: true },
            { name: 'Reason', value: moderationCase.reason, inline: false },
            { name: 'Severity', value: `${moderationCase.severity}/5`, inline: true },
            { name: 'Created', value: `<t:${Math.floor(moderationCase.createdAt.getTime() / 1000)}:R>`, inline: true }
        );

    // Add duration info for temp actions
    if (moderationCase.duration) {
        embed.addFields({
            name: 'Duration',
            value: moderationCase.formattedDuration,
            inline: true
        });
    }

    // Add expiration info
    if (moderationCase.expiresAt) {
        embed.addFields({
            name: 'Expires',
            value: `<t:${Math.floor(moderationCase.expiresAt.getTime() / 1000)}:R>`,
            inline: true
        });
    }

    // Add last used info
    if (moderationCase.lastUsed) {
        embed.addFields({
            name: 'Last Used',
            value: `<t:${Math.floor(moderationCase.lastUsed.getTime() / 1000)}:R>`,
            inline: true
        });
    }

    // Add evidence if available
    if (moderationCase.evidence.length > 0) {
        embed.addFields({
            name: 'Evidence',
            value: moderationCase.evidence.join('\n\n'),
            inline: false
        });
    }

    // Add appeal info if applicable
    if (moderationCase.appeal.requested) {
        embed.addFields({
            name: 'Appeal Status',
            value: `${moderationCase.appeal.status}\n${moderationCase.appeal.reason}`,
            inline: false
        });
    }

    // Add context info
    if (moderationCase.context.channelID) {
        embed.addFields({
            name: 'Context',
            value: `Channel: <#${moderationCase.context.channelID}>\n${moderationCase.context.automod ? 'Auto-mod triggered' : 'Manual action'}`,
            inline: false
        });
    }

    embed.setFooter({ text: `Case ID: ${moderationCase._id}` });

    return embed;
}

// Helper functions
function getCaseIcon(caseType) {
    const icons = {
        'WARN': '⚠️',
        'KICK': '👢',
        'BAN': '🔨',
        'TEMPBAN': '⏰',
        'MUTE': '🔇',
        'TEMPMUTE': '⏱️',
        'SOFTBAN': '💨',
        'VMUTE': '🎤',
        'VDEAFEN': '🔊',
        'NOTE': '📝',
        'UNBAN': '🔓',
        'UNMUTE': '🔊'
    };
    return icons[caseType] || '📋';
}

function getCaseColor(caseType) {
    const colors = {
        'WARN': 0xFFAA00,
        'KICK': 0xFF6600,
        'BAN': 0xFF0000,
        'TEMPBAN': 0xFF3300,
        'MUTE': 0x9966FF,
        'TEMPMUTE': 0x9966FF,
        'SOFTBAN': 0xFF9900,
        'VMUTE': 0x9999FF,
        'VDEAFEN': 0x9999FF,
        'NOTE': 0x6699FF,
        'UNBAN': 0x00FF00,
        'UNMUTE': 0x00FF00
    };
    return colors[caseType] || 0x5865F2;
}
