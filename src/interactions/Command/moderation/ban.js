const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationCases = require('../../../database/models/moderationCases');
const ModerationSettings = require('../../../database/models/moderationSettings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(true)
                .setMaxLength(1000))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in days (leave empty for permanent)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(365))
        .addStringOption(option =>
            option.setName('evidence')
                .setDescription('Evidence for this ban')
                .setRequired(false)
                .setMaxLength(1000))
        .addIntegerOption(option =>
            option.setName('severity')
                .setDescription('Severity level (1-5)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5))
        .addBooleanOption(option =>
            option.setName('notify')
                .setDescription('Notify the user via DM')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('delete-days')
                .setDescription('Delete messages from past 7 days')
                .setRequired(false))
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
        const duration = interaction.options.getInteger('duration');
        const evidence = interaction.options.getString('evidence');
        const severity = interaction.options.getInteger('severity') || 4;
        const notify = interaction.options.getBoolean('notify') ?? true;
        const deleteDays = interaction.options.getBoolean('delete-days') ? 7 : 0;
        const tags = interaction.options.getString('tags')?.split(',').map(tag => tag.trim()) || [];

        // Validation checks
        if (targetUser.id === moderator.id) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Cannot Ban Yourself',
                    description: 'You cannot ban yourself.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        if (targetUser.id === client.user.id) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Cannot Ban Bot',
                    description: 'You cannot ban the bot.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        if (targetUser.id === guild.ownerId) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Cannot Ban Server Owner',
                    description: 'You cannot ban the server owner.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Check if target is bannable
        if (!targetMember || !targetMember.bannable) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Cannot Ban User',
                    description: 'I cannot ban this user. They may have higher permissions than me.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Check hierarchy
        if (targetMember && targetMember.roles.highest.position >= moderator.roles.highest.position && !guild.ownerId === moderator.id) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Insufficient Permissions',
                    description: 'You cannot ban someone with equal or higher role than you.',
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

            // Get user's moderation history
            const userHistory = await ModerationCases.find({ 
                guildID: guild.id, 
                userID: targetUser.id 
            });

            // Calculate duration in milliseconds
            const durationMs = duration ? duration * 24 * 60 * 60 * 1000 : null;
            const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;

            // Create moderation case
            const moderationCase = new ModerationCases({
                guildID: guild.id,
                caseID,
                caseType: duration ? 'TEMPBAN' : 'BAN',
                userID: targetUser.id,
                userTag: targetUser.tag,
                moderatorID: moderator.id,
                moderatorTag: moderator.user.tag,
                reason,
                severity,
                tags,
                duration: durationMs,
                expiresAt,
                context: {
                    channelID: interaction.channel.id,
                    messageID: interaction.id,
                    previousWarnings: userHistory.filter(c => c.caseType === 'WARN').length,
                    automod: false
                }
            });

            // Add evidence if provided
            if (evidence) {
                moderationCase.evidence.push(evidence);
            }

            await moderationCase.save();

            // Send DM to user if enabled and requested
            if (notify && settings.notifications.dmUsers) {
                try {
                    const dmMessage = settings.notifications.dmMessage
                        .replace('{action}', duration ? 'temporarily banned' : 'banned')
                        .replace('{guild}', guild.name)
                        .replace('{reason}', reason)
                        .replace('{case}', `#${caseID}`);

                    const dmEmbed = {
                        title: duration ? '⏰ Temporarily Banned' : '🔨 Banned from Server',
                        description: dmMessage,
                        color: client.config?.colors?.error || 0xED4245,
                        fields: [
                            { name: 'Server', value: guild.name, inline: true },
                            { name: 'Reason', value: reason, inline: true },
                            { name: 'Case ID', value: `#${caseID}`, inline: true },
                            { name: 'Moderator', value: moderator.user.tag, inline: true }
                        ]
                    };

                    if (duration) {
                        dmEmbed.fields.push({
                            name: 'Duration',
                            value: `${duration} day${duration > 1 ? 's' : ''}`,
                            inline: true
                        });
                        dmEmbed.fields.push({
                            name: 'Expires',
                            value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
                            inline: true
                        });
                    }

                    await targetUser.send({ embeds: [dmEmbed] });
                    moderationCase.notified = true;
                    await moderationCase.save();
                } catch (error) {
                    console.warn(`Could not send DM to user ${targetUser.id}:`, error.message);
                }
            }

            // Perform the ban
            await targetMember.ban({
                reason: reason,
                deleteMessageDays: deleteDays
            });

            // Log the action
            await logModerationAction(client, guild, settings, moderationCase, targetUser, moderator);

            // Create response embed
            const responseEmbed = {
                title: duration ? '⏰ User Temporarily Banned' : '🔨 User Banned',
                description: `Successfully **${duration ? 'temporarily' : ''}banned** **${targetUser.tag}** from the server`,
                color: client.config?.colors?.success || 0x57F287,
                fields: [
                    { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Case ID', value: `#${caseID}`, inline: true },
                    { name: 'Severity', value: `${severity}/5`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true }
                ]
            };

            if (duration) {
                responseEmbed.fields.push({
                    name: 'Duration',
                    value: `${duration} day${duration > 1 ? 's' : ''}`,
                    inline: true
                });
                responseEmbed.fields.push({
                    name: 'Expires',
                    value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
                    inline: true
                });
            } else {
                responseEmbed.fields.push({
                    name: 'Type',
                    value: 'Permanent',
                    inline: true
                });
            }

            if (deleteDays > 0) {
                responseEmbed.fields.push({
                    name: 'Messages Deleted',
                    value: `Last ${deleteDays} days`,
                    inline: true
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

            // Add user history summary
            const priorCases = userHistory.length;
            if (priorCases > 0) {
                responseEmbed.fields.push({
                    name: 'Prior Cases',
                    value: `${priorCases} previous case${priorCases > 1 ? 's' : ''}`,
                    inline: true
                });
            }

            await interaction.editReply({ embeds: [responseEmbed] });

            // Schedule unban if temporary
            if (duration) {
                scheduleUnban(client, guild, targetUser.id, moderator.id, caseID, expiresAt);
            }

        } catch (error) {
            console.error('Error banning user:', error);
            await interaction.editReply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to ban user. This could be due to missing permissions or the user having higher roles.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }
    }
};

// Helper function to log moderation actions (reused from warn.js)
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
            ]
        };

        // Add duration info for temp bans
        if (moderationCase.expiresAt) {
            logEmbed.fields.push({
                name: 'Duration',
                value: moderationCase.formattedDuration,
                inline: true
            });
            logEmbed.fields.push({
                name: 'Expires',
                value: `<t:${Math.floor(moderationCase.expiresAt.getTime() / 1000)}:R>`,
                inline: true
            });
        }

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

// Helper function to schedule unban
function scheduleUnban(client, guild, userID, moderatorID, caseID, expiresAt) {
    const delay = expiresAt.getTime() - Date.now();
    
    setTimeout(async () => {
        try {
            // Unban the user
            await guild.members.unban(userID, 'Temporary ban expired');
            
            // Update case status
            const ModerationCases = require('../../../database/models/moderationCases');
            await ModerationCases.updateOne(
                { guildID: guild.id, caseID },
                { status: 'EXPIRED' }
            );
            
            // Log the unban
            console.log(`User ${userID} unbanned from ${guild.name} after temporary ban expired`);
            
        } catch (error) {
            console.error(`Error scheduling unban for user ${userID}:`, error);
        }
    }, delay);
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
