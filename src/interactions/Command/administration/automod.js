const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModerationSettings = require('../../../database/models/moderationSettings');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Manage auto-moderation rules and settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable auto-moderation'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable auto-moderation'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('addrule')
                .setDescription('Add a new auto-mod rule')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Rule name')
                        .setRequired(true)
                        .setMaxLength(100))
                .addStringOption(option =>
                    option.setName('trigger-type')
                        .setDescription('Type of trigger')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Keywords', value: 'keywords' },
                            { name: 'Links', value: 'links' },
                            { name: 'Mentions', value: 'mentions' },
                            { name: 'Caps', value: 'caps' },
                            { name: 'Spam', value: 'spam' },
                            { name: 'Invites', value: 'invites' },
                            { name: 'Attachments', value: 'attachments' }
                        ))
                .addStringOption(option =>
                    option.setName('trigger-data')
                        .setDescription('Trigger data (keywords, links, etc.)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to take')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Delete Message', value: 'DELETE' },
                            { name: 'Warn User', value: 'WARN' },
                            { name: 'Mute User', value: 'MUTE' },
                            { name: 'Temp Mute', value: 'TEMPMUTE' },
                            { name: 'Kick User', value: 'KICK' },
                            { name: 'Ban User', value: 'BAN' },
                            { name: 'Temp Ban', value: 'TEMPBAN' }
                        ))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration for temp actions (minutes)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(43200)) // 30 days max
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Custom reason for the action')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('severity')
                        .setDescription('Severity level (1-5)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(5)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removerule')
                .setDescription('Remove an auto-mod rule')
                .addStringOption(option =>
                    option.setName('rule')
                        .setDescription('Rule to remove')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all auto-mod rules')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Filter rules by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All Rules', value: 'all' },
                            { name: 'Enabled Only', value: 'enabled' },
                            { name: 'Disabled Only', value: 'disabled' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable/disable a rule')
                .addStringOption(option =>
                    option.setName('rule')
                        .setDescription('Rule to toggle')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show auto-mod statistics')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'enable':
                await handleEnable(interaction, client);
                break;
            case 'disable':
                await handleDisable(interaction, client);
                break;
            case 'addrule':
                await handleAddRule(interaction, client);
                break;
            case 'removerule':
                await handleRemoveRule(interaction, client);
                break;
            case 'list':
                await handleList(interaction, client);
                break;
            case 'toggle':
                await handleToggle(interaction, client);
                break;
            case 'stats':
                await handleStats(interaction, client);
                break;
        }
    }
};

// Handle enabling auto-mod
async function handleEnable(interaction, client) {
    await interaction.deferReply();

    try {
        const settings = await ModerationSettings.getSettings(interaction.guild.id);
        settings.automod.enabled = true;
        await settings.save();

        await interaction.editReply({
            embeds: [{
                title: '✅ Auto-Mod Enabled',
                description: 'Auto-moderation has been enabled for this server.',
                color: client.config?.colors?.success || 0x57F287
            }]
        });
    } catch (error) {
        console.error('Error enabling auto-mod:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to enable auto-moderation.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle disabling auto-mod
async function handleDisable(interaction, client) {
    await interaction.deferReply();

    try {
        const settings = await ModerationSettings.getSettings(interaction.guild.id);
        settings.automod.enabled = false;
        await settings.save();

        await interaction.editReply({
            embeds: [{
                title: '❌ Auto-Mod Disabled',
                description: 'Auto-moderation has been disabled for this server.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    } catch (error) {
        console.error('Error disabling auto-mod:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to disable auto-moderation.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle adding a new rule
async function handleAddRule(interaction, client) {
    await interaction.deferReply();

    const name = interaction.options.getString('name');
    const triggerType = interaction.options.getString('trigger-type');
    const triggerData = interaction.options.getString('trigger-data');
    const action = interaction.options.getString('action');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'Auto-mod violation';
    const severity = interaction.options.getInteger('severity') || 1;

    try {
        const settings = await ModerationSettings.getSettings(interaction.guild.id);

        // Build rule object
        const ruleData = {
            name,
            triggers: {},
            actions: [{
                type: action,
                reason,
                severity
            }]
        };

        // Configure trigger based on type
        switch (triggerType) {
            case 'keywords':
                ruleData.triggers.keywords = triggerData.split(',').map(k => k.trim().toLowerCase());
                break;
            case 'links':
                ruleData.triggers.links = { enabled: true };
                if (triggerData === 'blacklist') {
                    ruleData.triggers.links.blacklist = [];
                } else if (triggerData === 'whitelist') {
                    ruleData.triggers.links.whitelist = [];
                }
                break;
            case 'mentions':
                ruleData.triggers.mentions = { 
                    enabled: true, 
                    threshold: parseInt(triggerData) || 5 
                };
                break;
            case 'caps':
                ruleData.triggers.caps = { 
                    enabled: true, 
                    threshold: parseInt(triggerData) || 70,
                    minLength: 10
                };
                break;
            case 'spam':
                const [messages, timeWindow] = triggerData.split(',').map(v => parseInt(v.trim()));
                ruleData.triggers.spam = { 
                    enabled: true, 
                    messages: messages || 5,
                    timeWindow: timeWindow || 10000
                };
                break;
            case 'invites':
                ruleData.triggers.invites = { 
                    enabled: true,
                    allowOwn: triggerData === 'allow-own'
                };
                break;
            case 'attachments':
                ruleData.triggers.attachments = { 
                    enabled: true,
                    maxCount: parseInt(triggerData) || 5
                };
                break;
        }

        // Add duration for temp actions
        if (duration && (action === 'TEMPMUTE' || action === 'TEMPBAN')) {
            ruleData.actions[0].duration = duration * 60 * 1000; // Convert minutes to ms
        }

        await settings.addAutomodRule(ruleData);

        const embed = new EmbedBuilder()
            .setTitle('✅ Auto-Mod Rule Added')
            .setDescription(`Successfully created rule: **${name}**`)
            .setColor(client.config?.colors?.success || 0x57F287)
            .addFields(
                { name: 'Trigger Type', value: triggerType, inline: true },
                { name: 'Action', value: action, inline: true },
                { name: 'Severity', value: `${severity}/5`, inline: true }
            );

        if (duration) {
            embed.addFields({
                name: 'Duration',
                value: `${duration} minute${duration > 1 ? 's' : ''}`,
                inline: true
            });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error adding auto-mod rule:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to add auto-mod rule.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle removing a rule
async function handleRemoveRule(interaction, client) {
    await interaction.deferReply();

    const ruleName = interaction.options.getString('rule');

    try {
        const settings = await ModerationSettings.getSettings(interaction.guild.id);
        const rule = settings.automod.rules.find(r => r.name === ruleName);

        if (!rule) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Rule Not Found',
                    description: `No rule named "${ruleName}" found.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        await settings.removeAutomodRule(rule.id);

        await interaction.editReply({
            embeds: [{
                title: '✅ Rule Removed',
                description: `Successfully removed rule: **${ruleName}**`,
                color: client.config?.colors?.success || 0x57F287
            }]
        });

    } catch (error) {
        console.error('Error removing auto-mod rule:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to remove auto-mod rule.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle listing rules
async function handleList(interaction, client) {
    await interaction.deferReply();

    const filter = interaction.options.getString('filter') || 'all';

    try {
        const settings = await ModerationSettings.getSettings(interaction.guild.id);
        let rules = settings.automod.rules;

        if (filter === 'enabled') {
            rules = rules.filter(r => r.enabled);
        } else if (filter === 'disabled') {
            rules = rules.filter(r => !r.enabled);
        }

        if (rules.length === 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '📋 Auto-Mod Rules',
                    description: `No ${filter === 'all' ? '' : filter} auto-mod rules found.`,
                    color: client.config?.colors?.normal || 0x5865F2
                }]
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Auto-Mod Rules (${rules.length})`)
            .setDescription(`Filter: ${filter}`)
            .setColor(client.config?.colors?.normal || 0x5865F2);

        for (const rule of rules.slice(0, 10)) { // Limit to 10 rules
            const status = rule.enabled ? '✅' : '❌';
            const triggers = Object.keys(rule.triggers).filter(key => rule.triggers[key].enabled).join(', ');
            const actions = rule.actions.map(a => a.type).join(', ');

            embed.addFields({
                name: `${status} ${rule.name}`,
                value: `**Triggers:** ${triggers}\n**Actions:** ${actions}\n**Triggered:** ${rule.triggerCount} times`,
                inline: false
            });
        }

        if (rules.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${rules.length} rules` });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error listing auto-mod rules:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to list auto-mod rules.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle toggling a rule
async function handleToggle(interaction, client) {
    await interaction.deferReply();

    const ruleName = interaction.options.getString('rule');

    try {
        const settings = await ModerationSettings.getSettings(interaction.guild.id);
        const rule = settings.automod.rules.find(r => r.name === ruleName);

        if (!rule) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Rule Not Found',
                    description: `No rule named "${ruleName}" found.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        await settings.updateAutomodRule(rule.id, { enabled: !rule.enabled });

        const status = !rule.enabled ? 'enabled' : 'disabled';

        await interaction.editReply({
            embeds: [{
                title: `${status === 'enabled' ? '✅' : '❌'} Rule ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                description: `Rule "${ruleName}" has been ${status}.`,
                color: status === 'enabled' ? (client.config?.colors?.success || 0x57F287) : (client.config?.colors?.error || 0xED4245)
            }]
        });

    } catch (error) {
        console.error('Error toggling auto-mod rule:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to toggle auto-mod rule.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle showing statistics
async function handleStats(interaction, client) {
    await interaction.deferReply();

    try {
        const settings = await ModerationSettings.getSettings(interaction.guild.id);
        const rules = settings.automod.rules;

        const totalTriggers = rules.reduce((sum, rule) => sum + rule.triggerCount, 0);
        const enabledRules = rules.filter(r => r.enabled).length;
        const disabledRules = rules.filter(r => !r.enabled).length;

        // Get trigger counts by rule
        const ruleStats = rules
            .sort((a, b) => b.triggerCount - a.triggerCount)
            .slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle('📊 Auto-Mod Statistics')
            .setColor(client.config?.colors?.normal || 0x5865F2)
            .addFields(
                { name: 'Total Rules', value: rules.length.toString(), inline: true },
                { name: 'Enabled Rules', value: enabledRules.toString(), inline: true },
                { name: 'Disabled Rules', value: disabledRules.toString(), inline: true },
                { name: 'Total Triggers', value: totalTriggers.toString(), inline: true },
                { name: 'Auto-Mod Status', value: settings.automod.enabled ? '✅ Enabled' : '❌ Disabled', inline: true }
            );

        if (ruleStats.length > 0) {
            embed.addFields({
                name: 'Top Rules by Triggers',
                value: ruleStats.map(rule => `**${rule.name}**: ${rule.triggerCount}`).join('\n'),
                inline: false
            });
        }

        embed.setFooter({ text: `Statistics for ${interaction.guild.name}` });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error showing auto-mod stats:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch auto-mod statistics.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}
