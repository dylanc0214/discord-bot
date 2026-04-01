const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationCases = require('../../../database/models/moderationCases');
const ModerationSettings = require('../../../database/models/moderationSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user and create a moderation case')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)
                .setMaxLength(1000))
        .addStringOption(option =>
            option.setName('evidence')
                .setDescription('Evidence for this warning')
                .setRequired(false)
                .setMaxLength(1000))
        .addIntegerOption(option =>
            option.setName('severity')
                .setDescription('Severity level (1-5)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5))
        .addStringOption(option =>
            option.setName('tags')
                .setDescription('Tags for this case (comma-separated)')
                .setRequired(false)),

    async execute(interaction, client) {

        const guild = interaction.guild;
        const moderator = interaction.member;
        const targetUser = interaction.options.getUser('user');
        const targetMember = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');
        const evidence = interaction.options.getString('evidence');
        const severity = interaction.options.getInteger('severity') || 1;
        const tags = interaction.options.getString('tags')?.split(',').map(tag => tag.trim()) || [];

        // Validation checks
        if (targetUser.id === moderator.id) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Cannot Warn Yourself',
                    description: 'You cannot warn yourself.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        if (targetUser.id === client.user.id) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Cannot Warn Bot',
                    description: 'You cannot warn the bot.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Check hierarchy
        if (targetMember && targetMember.roles.highest.position >= moderator.roles.highest.position && !guild.ownerId === moderator.id) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Insufficient Permissions',
                    description: 'You cannot warn someone with equal or higher role than you.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Get guild settings
        const settings = await ModerationSettings.getSettings(guild.id);
        
        // Check if moderator has permission
        if (!settings.isModerator(moderator)) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Insufficient Permissions',
                    description: 'You do not have moderator permissions.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        try {
            // Get next case ID
            const caseID = await ModerationCases.getNextCaseID(guild.id);

            // Get user's warning history
            const userHistory = await ModerationCases.find({ 
                guildID: guild.id, 
                userID: targetUser.id,
                caseType: 'WARN',
                status: { $in: ['ACTIVE', 'APPEALED'] }
            });

            // Create moderation case
            const moderationCase = new ModerationCases({
                guildID: guild.id,
                caseID,
                caseType: 'WARN',
                userID: targetUser.id,
                userTag: targetUser.tag,
                moderatorID: moderator.id,
                moderatorTag: moderator.user.tag,
                reason,
                severity,
                tags,
                context: {
                    channelID: interaction.channel.id,
                    messageID: interaction.id,
                    previousWarnings: userHistory.length,
                    automod: false
                }
            });

            // Add evidence if provided
            if (evidence) {
                moderationCase.evidence.push(evidence);
            }

            await moderationCase.save();

            // Log the action
            await logModerationAction(client, guild, settings, moderationCase, targetUser, moderator);

            // Send DM to user if enabled
            if (settings.notifications.dmUsers) {
                try {
                    const dmMessage = settings.notifications.dmMessage
                        .replace('{action}', 'warned')
                        .replace('{guild}', guild.name)
                        .replace('{reason}', reason)
                        .replace('{case}', `#${caseID}`);

                    await targetUser.send({
                        embeds: [{
                            title: '⚠️ Warning Issued',
                            description: dmMessage,
                            color: client.config?.colors?.normal || 0x5865F2,
                            fields: [
                                { name: 'Case ID', value: `#${caseID}`, inline: true },
                                { name: 'Reason', value: reason, inline: true },
                                { name: 'Moderator', value: moderator.user.tag, inline: true }
                            ],
                            footer: {
                                text: `Total warnings: ${userHistory.length + 1}`
                            }
                        }]
                    });
                    moderationCase.notified = true;
                    await moderationCase.save();
                } catch (error) {
                    console.warn(`Could not send DM to user ${targetUser.id}:`, error.message);
                }
            }

            // Check for auto-actions based on warning count
            const nextAction = settings.getNextAction(targetUser.id, userHistory.length + 1);
            
            let responseEmbed = {
                title: '✅ Warning Issued',
                description: `Successfully warned **${targetUser.tag}**`,
                color: client.config?.colors?.success || 0x57F287,
                fields: [
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Case ID', value: `#${caseID}`, inline: true },
                    { name: 'Severity', value: `${severity}/5`, inline: true },
                    { name: 'Total Warnings', value: `${userHistory.length + 1}`, inline: true }
                ]
            };

            // Add warning about potential auto-action
            if (nextAction.action !== 'WARN') {
                responseEmbed.fields.push({
                    name: '⚠️ Auto-Action Warning',
                    value: `User will be automatically **${nextAction.action.toLowerCase()}** if they receive more warnings.`,
                    inline: false
                });
            }

            // Add evidence if provided
            if (evidence) {
                responseEmbed.fields.push({
                    name: 'Evidence',
                    value: evidence,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [responseEmbed] });

        } catch (error) {
            console.error('Error issuing warning:', error);
            await interaction.editReply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to issue warning. Please try again.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }
    }
};

// Helper function to log moderation actions
async function logModerationAction(client, guild, settings, moderationCase, targetUser, moderator) {
    if (!settings.logging.enabled || !settings.logging.channelID) return;

    try {
        const logChannel = await guild.channels.fetch(settings.logging.channelID);
        if (!logChannel) return;

        const shouldLog = settings.logging.logActions[moderationCase.caseType.toLowerCase()];
        if (!shouldLog) return;

        const logEmbed = {
            title: `${getCaseIcon(moderationCase.caseType)} ${moderationCase.caseType} Case Created`,
            description: `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${moderator.user.tag}\n**Reason:** ${moderationCase.reason}`,
            color: getCaseColor(moderationCase.caseType),
            fields: [
                { name: 'Case ID', value: `#${moderationCase.caseID}`, inline: true },
                { name: 'Severity', value: `${moderationCase.severity}/5`, inline: true },
                { name: 'Channel', value: `<#${moderationCase.context.channelID}>`, inline: true }
            ],
            footer: {
                text: `Case ID: ${moderationCase.caseID} • ${new Date().toLocaleString()}`
            }
        };

        // Add evidence if available
        if (moderationCase.evidence.length > 0 && settings.logging.includeEvidence) {
            logEmbed.fields.push({
                name: 'Evidence',
                value: moderationCase.evidence.slice(0, 3).join('\n'),
                inline: false
            });
        }

        // Add user history if enabled
        if (settings.logging.includeUserHistory) {
            const history = await ModerationCases.getUserHistory(guild.id, targetUser.id, 5);
            if (history.length > 1) {
                const historyText = history.slice(1).map(c => `${c.caseType} #${c.caseID}`).join(', ');
                logEmbed.fields.push({
                    name: 'Recent History',
                    value: historyText || 'No prior cases',
                    inline: false
                });
            }
        }

        const logMessage = await logChannel.send({ embeds: [logEmbed] });
        
        // Update case with log message ID
        moderationCase.logged = true;
        moderationCase.logMessageID = logMessage.id;
        await moderationCase.save();

    } catch (error) {
        console.error('Error logging moderation action:', error);
    }
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
