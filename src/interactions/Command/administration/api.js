const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ApiKey = require('../../../database/models/apiKey');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('api')
        .setDescription('Manage API keys for external integrations')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new API key')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Key name')
                        .setRequired(true)
                        .setMaxLength(100))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Key description')
                        .setMaxLength(500))
                .addStringOption(option =>
                    option.setName('permissions')
                        .setDescription('Permissions (comma-separated)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Read', value: 'read' },
                            { name: 'Write', value: 'write' },
                            { name: 'Economy', value: 'economy' },
                            { name: 'Moderation', value: 'moderation' },
                            { name: 'Admin', value: 'admin' }
                        ))
                .addIntegerOption(option =>
                    option.setName('rate-limit')
                        .setDescription('Requests per minute (default: 60)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(1000))
                .addBooleanOption(option =>
                    option.setName('global')
                        .setDescription('Can access all guilds')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List your API keys')
                .addBooleanOption(option =>
                    option.setName('show-inactive')
                        .setDescription('Show inactive keys')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get detailed information about an API key')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('API key or key name')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('revoke')
                .setDescription('Revoke an API key')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('API key or key name')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rotate')
                .setDescription('Rotate an API key (generate new key)')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('API key or key name')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show API usage statistics')),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction, client);
                break;
            case 'list':
                await handleList(interaction, client);
                break;
            case 'info':
                await handleInfo(interaction, client);
                break;
            case 'revoke':
                await handleRevoke(interaction, client);
                break;
            case 'rotate':
                await handleRotate(interaction, client);
                break;
            case 'stats':
                await handleStats(interaction, client);
                break;
        }
    }
};

// Handle creating API key
async function handleCreate(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const permissions = interaction.options.getString('permissions');
        const rateLimit = interaction.options.getInteger('rate-limit') || 60;
        const global = interaction.options.getBoolean('global') || false;

        // Parse permissions
        let permissionList = ['read']; // Default permission
        if (permissions) {
            permissionList = permissions.split(',').map(p => p.trim().toLowerCase());
        }

        // Validate permissions
        const validPermissions = ['read', 'write', 'economy', 'moderation', 'admin'];
        const invalidPermissions = permissionList.filter(p => !validPermissions.includes(p));
        
        if (invalidPermissions.length > 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Invalid Permissions',
                    description: `Invalid permissions: ${invalidPermissions.join(', ')}`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Create API key
        const keyData = {
            name,
            description,
            ownerID: interaction.user.id,
            ownerName: interaction.user.tag,
            permissions: permissionList,
            guilds: global ? [] : [interaction.guild.id],
            global,
            rateLimit
        };

        const apiKey = await ApiKey.createKey(keyData);

        const embed = new EmbedBuilder()
            .setTitle('✅ API Key Created')
            .setDescription('Your new API key has been generated. Keep it secure!')
            .setColor(client.config?.colors?.success || 0x57F287)
            .addFields(
                {
                    name: '🔑 API Key',
                    value: `\`${apiKey.key}\``,
                    inline: false
                },
                {
                    name: '📝 Name',
                    value: apiKey.name,
                    inline: true
                },
                {
                    name: '🔐 Permissions',
                    value: apiKey.permissions.map(p => `\`${p}\``).join(', '),
                    inline: true
                },
                {
                    name: '⚡ Rate Limit',
                    value: `${apiKey.rateLimit} requests/minute`,
                    inline: true
                },
                {
                    name: '🌐 Access',
                    value: apiKey.global ? 'All guilds' : 'This guild only',
                    inline: true
                },
                {
                    name: '📊 Usage Endpoint',
                    value: `${process.env.API_URL || 'http://localhost:3001'}/api/v1/info`,
                    inline: false
                }
            )
            .setFooter({
                text: 'Store this key securely. It will not be shown again.'
            });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error creating API key:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to create API key. Please try again.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle listing API keys
async function handleList(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const showInactive = interaction.options.getBoolean('show-inactive') || false;
        const keys = await ApiKey.getKeysByOwner(interaction.user.id);

        // Filter keys based on showInactive
        const filteredKeys = showInactive ? keys : keys.filter(key => key.active);

        if (filteredKeys.length === 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '🔑 API Keys',
                    description: showInactive ? 'No API keys found.' : 'No active API keys found.',
                    color: client.config?.colors?.normal || 0x5865F2
                }]
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔑 API Keys')
            .setDescription(`Found ${filteredKeys.length} API key${filteredKeys.length > 1 ? 's' : ''}`)
            .setColor(client.config?.colors?.normal || 0x5865F2);

        for (const key of filteredKeys.slice(0, 10)) { // Limit to 10 keys
            const status = key.active ? '✅ Active' : '❌ Inactive';
            const lastUsed = key.usage.lastUsed ? `<t:${Math.floor(key.usage.lastUsed.getTime() / 1000)}:R>` : 'Never';
            
            embed.addFields({
                name: `${status} ${key.name}`,
                value: `**Permissions:** ${key.permissions.map(p => `\`${p}\``).join(', ')}\n**Usage:** ${key.usage.requests} requests\n**Last Used:** ${lastUsed}\n**Rate Limit:** ${key.rateLimit}/min`,
                inline: false
            });
        }

        if (filteredKeys.length > 10) {
            embed.setFooter({
                text: `Showing 10 of ${filteredKeys.length} keys. Use /api info for more details.`
            });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error listing API keys:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch API keys.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle getting API key info
async function handleInfo(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const keyInput = interaction.options.getString('key');
        
        // Find API key by key or name
        let apiKey = await ApiKey.findOne({ 
            key: keyInput, 
            ownerID: interaction.user.id 
        });
        
        if (!apiKey) {
            apiKey = await ApiKey.findOne({ 
                name: keyInput, 
                ownerID: interaction.user.id 
            });
        }

        if (!apiKey) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Key Not Found',
                    description: 'API key not found or you don\'t have permission to view it.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        const lastUsed = apiKey.usage.lastUsed ? `<t:${Math.floor(apiKey.usage.lastUsed.getTime() / 1000)}:R>` : 'Never';
        const createdAt = `<t:${Math.floor(apiKey.metadata.createdAt.getTime() / 1000)}:F>`;
        const lastRotated = `<t:${Math.floor(apiKey.metadata.lastRotated.getTime() / 1000)}:R>`;
        
        // Calculate daily usage
        const today = new Date().toDateString();
        const todayUsage = apiKey.usage.dailyUsage.find(u => u.date.toDateString() === today);
        const dailyRequests = todayUsage ? todayUsage.requests : 0;
        const remainingDaily = apiKey.checkDailyLimit();

        const embed = new EmbedBuilder()
            .setTitle(`🔑 ${apiKey.name}`)
            .setDescription(apiKey.description || 'No description provided')
            .setColor(apiKey.active ? (client.config?.colors?.success || 0x57F287) : (client.config?.colors?.error || 0xED4245))
            .addFields(
                {
                    name: '🔑 Key',
                    value: `\`${apiKey.key}\``,
                    inline: false
                },
                {
                    name: '📊 Status',
                    value: apiKey.active ? '✅ Active' : '❌ Inactive',
                    inline: true
                },
                {
                    name: '🔐 Permissions',
                    value: apiKey.permissions.map(p => `\`${p}\``).join(', '),
                    inline: true
                },
                {
                    name: '🌐 Access',
                    value: apiKey.global ? 'All guilds' : `${apiKey.guilds.length} guild${apiKey.guilds.length > 1 ? 's' : ''}`,
                    inline: true
                },
                {
                    name: '⚡ Rate Limits',
                    value: `Per Minute: ${apiKey.rateLimit}\nPer Day: ${apiKey.dailyLimit}`,
                    inline: true
                },
                {
                    name: '📈 Usage',
                    value: `Total: ${apiKey.usage.requests}\nToday: ${dailyRequests}\nRemaining: ${remainingDaily}`,
                    inline: true
                },
                {
                    name: '📅 Dates',
                    value: `Created: ${createdAt}\nLast Used: ${lastUsed}\nLast Rotated: ${lastRotated}`,
                    inline: false
                }
            );

        if (apiKey.expiresAt) {
            embed.addFields({
                name: '⏰ Expires',
                value: `<t:${Math.floor(apiKey.expiresAt.getTime() / 1000)}:R>`,
                inline: true
            });
        }

        if (apiKey.allowedIPs.length > 0) {
            embed.addFields({
                name: '🔒 IP Restrictions',
                value: apiKey.allowedIPs.map(ip => `\`${ip}\``).join(', '),
                inline: false
            });
        }

        embed.setFooter({
            text: `Key ID: ${apiKey._id} • Version: ${apiKey.metadata.version}`
        });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error getting API key info:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch API key information.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle revoking API key
async function handleRevoke(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const keyInput = interaction.options.getString('key');
        
        // Find API key
        let apiKey = await ApiKey.findOne({ 
            key: keyInput, 
            ownerID: interaction.user.id 
        });
        
        if (!apiKey) {
            apiKey = await ApiKey.findOne({ 
                name: keyInput, 
                ownerID: interaction.user.id 
            });
        }

        if (!apiKey) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Key Not Found',
                    description: 'API key not found or you don\'t have permission to revoke it.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        await apiKey.deactivate('Revoked by user');

        const embed = new EmbedBuilder()
            .setTitle('✅ API Key Revoked')
            .setDescription(`API key "${apiKey.name}" has been revoked and is no longer usable.`)
            .setColor(client.config?.colors?.success || 0x57F287)
            .addFields(
                {
                    name: '🔑 Key',
                    value: `\`${apiKey.key}\``,
                    inline: false
                },
                {
                    name: '📊 Final Usage',
                    value: `${apiKey.usage.requests} total requests`,
                    inline: true
                },
                {
                    name: '📅 Active Period',
                    value: `Created: <t:${Math.floor(apiKey.metadata.createdAt.getTime() / 1000)}:F>\nRevoked: <t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                }
            );

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error revoking API key:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to revoke API key.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle rotating API key
async function handleRotate(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const keyInput = interaction.options.getString('key');
        
        // Find API key
        let apiKey = await ApiKey.findOne({ 
            key: keyInput, 
            ownerID: interaction.user.id 
        });
        
        if (!apiKey) {
            apiKey = await ApiKey.findOne({ 
                name: keyInput, 
                ownerID: interaction.user.id 
            });
        }

        if (!apiKey) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Key Not Found',
                    description: 'API key not found or you don\'t have permission to rotate it.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        const { oldKey, newKey } = await apiKey.rotateKey();

        const embed = new EmbedBuilder()
            .setTitle('🔄 API Key Rotated')
            .setDescription('Your API key has been rotated. Update your applications with the new key.')
            .setColor(client.config?.colors?.success || 0x57F287)
            .addFields(
                {
                    name: '🔑 New API Key',
                    value: `\`${newKey}\``,
                    inline: false
                },
                {
                    name: '📝 Name',
                    value: apiKey.name,
                    inline: true
                },
                {
                    name: '🔐 Permissions',
                    value: apiKey.permissions.map(p => `\`${p}\``).join(', '),
                    inline: true
                },
                {
                    name: '📊 Version',
                    value: apiKey.metadata.version,
                    inline: true
                },
                {
                    name: '⚠️ Important',
                    value: 'The old key has been invalidated. Update all applications immediately.',
                    inline: false
                }
            )
            .setFooter({
                text: 'Store this new key securely. It will not be shown again.'
            });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error rotating API key:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to rotate API key.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle showing API statistics
async function handleStats(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Get user's keys
        const userKeys = await ApiKey.getKeysByOwner(interaction.user.id);
        
        // Get global stats
        const globalStats = await ApiKey.getUsageStats(7);
        
        // Calculate user stats
        const userStats = {
            totalKeys: userKeys.length,
            activeKeys: userKeys.filter(k => k.active).length,
            totalRequests: userKeys.reduce((sum, k) => sum + k.usage.requests, 0),
            keysWithGuildAccess: userKeys.filter(k => k.guilds.length > 0).length
        };

        // Calculate today's usage
        const today = new Date().toDateString();
        const todayUsage = userKeys.reduce((sum, k) => {
            const todayData = k.usage.dailyUsage.find(u => u.date.toDateString() === today);
            return sum + (todayData ? todayData.requests : 0);
        }, 0);

        const embed = new EmbedBuilder()
            .setTitle('📊 API Usage Statistics')
            .setDescription('Your API usage statistics for the last 7 days')
            .setColor(client.config?.colors?.normal || 0x5865F2)
            .addFields(
                {
                    name: '🔑 Your Keys',
                    value: `Total: ${userStats.totalKeys}\nActive: ${userStats.activeKeys}\nGuild Access: ${userStats.keysWithGuildAccess}`,
                    inline: true
                },
                {
                    name: '📈 Your Usage',
                    value: `Total Requests: ${userStats.totalRequests}\nToday: ${todayUsage}\nAvg per Key: ${Math.floor(userStats.totalRequests / Math.max(userStats.totalKeys, 1))}`,
                    inline: true
                },
                {
                    name: '🌐 Global Stats',
                    value: `Total Keys: ${globalStats.totalKeys}\nActive Keys: ${globalStats.activeKeys}\nTotal Requests: ${globalStats.totalRequests}`,
                    inline: true
                }
            );

        // Add top keys by usage
        const topKeys = userKeys
            .sort((a, b) => b.usage.requests - a.usage.requests)
            .slice(0, 3);

        if (topKeys.length > 0) {
            embed.addFields({
                name: '🏆 Your Top Keys',
                value: topKeys.map((key, index) => 
                    `${index + 1}. **${key.name}** - ${key.usage.requests} requests`
                ).join('\n'),
                inline: false
            });
        }

        embed.setFooter({
            text: `Statistics for the last 7 days • Generated ${new Date().toLocaleString()}`
        });

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error getting API stats:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch API statistics.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}
