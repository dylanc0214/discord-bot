const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const CustomCommand = require('../../../database/models/customCommands');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Manage custom commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all custom commands')
                .addStringOption(option =>
                    option.setName('sort')
                        .setDescription('Sort commands by')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Name', value: 'name' },
                            { name: 'Created', value: 'created' },
                            { name: 'Uses', value: 'uses' },
                            { name: 'Last Used', value: 'lastUsed' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The command to edit')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('response')
                        .setDescription('New response text')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('New description')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('embed')
                        .setDescription('Send as embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('cooldown')
                        .setDescription('Cooldown in seconds')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The command to delete')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get detailed info about a custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The command to inspect')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable/disable a custom command')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The command to toggle')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'list':
                await handleList(interaction, client);
                break;
            case 'edit':
                await handleEdit(interaction, client);
                break;
            case 'delete':
                await handleDelete(interaction, client);
                break;
            case 'info':
                await handleInfo(interaction, client);
                break;
            case 'toggle':
                await handleToggle(interaction, client);
                break;
        }
    }
};

// Handle command listing
async function handleList(interaction, client) {

    const sortBy = interaction.options.getString('sort') || 'name';
    const guild = interaction.guild;

    try {
        const commands = await CustomCommand.find({ guildID: guild.id });

        if (commands.length === 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '📋 Custom Commands',
                    description: 'No custom commands found in this server.',
                    color: client.config?.colors?.normal || 0x5865F2
                }]
            });
        }

        // Sort commands
        commands.sort((a, b) => {
            switch (sortBy) {
                case 'created':
                    return b.createdAt - a.createdAt;
                case 'uses':
                    return b.uses - a.uses;
                case 'lastUsed':
                    const aTime = a.lastUsed ? a.lastUsed.getTime() : 0;
                    const bTime = b.lastUsed ? b.lastUsed.getTime() : 0;
                    return bTime - aTime;
                default: // name
                    return a.commandName.localeCompare(b.commandName);
            }
        });

        // Create embed
        const embed = {
            title: `📋 Custom Commands (${commands.length})`,
            description: `**Sort:** ${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}\n\n` +
                commands.map(cmd => {
                    const status = cmd.enabled ? '✅' : '❌';
                    const type = cmd.embed ? '📄' : '💬';
                    return `${status} ${type} \`/${cmd.commandName}\` - Used ${cmd.uses} times`;
                }).join('\n'),
            color: client.config?.colors?.normal || 0x5865F2,
            footer: {
                text: `Total uses: ${commands.reduce((sum, cmd) => sum + cmd.uses, 0)}`
            }
        };

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error listing custom commands:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch custom commands.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle command editing
async function handleEdit(interaction, client) {

    const guild = interaction.guild;
    const commandName = interaction.options.getString('name');
    const response = interaction.options.getString('response');
    const description = interaction.options.getString('description');
    const embed = interaction.options.getBoolean('embed');
    const color = interaction.options.getString('color');
    const cooldown = interaction.options.getInteger('cooldown');

    try {
        const command = await CustomCommand.findOne({ 
            guildID: guild.id, 
            commandName 
        });

        if (!command) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Command Not Found',
                    description: `The command \`/${commandName}\` doesn't exist.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Update fields
        if (response !== null) command.response = response;
        if (description !== null) command.description = description;
        if (embed !== null) command.embed = embed;
        if (color !== null) {
            if (!/^#[0-9A-F]{6}$/i.test(color)) {
                return await interaction.editReply({
                    embeds: [{
                        title: '❌ Invalid Color',
                        description: 'Color must be a valid hex code (e.g., #FF0000)',
                        color: client.config?.colors?.error || 0xED4245
                    }]
                });
            }
            command.embedColor = color;
        }
        if (cooldown !== null) command.cooldown = cooldown;

        await command.save();

        const embedResponse = {
            title: '✅ Command Updated',
            description: `Successfully updated \`/${commandName}\`!`,
            color: client.config?.colors?.success || 0x57F287,
            fields: [
                { name: 'Response', value: command.response.substring(0, 100) + (command.response.length > 100 ? '...' : ''), inline: false },
                { name: 'Description', value: command.description, inline: true },
                { name: 'Embed', value: command.embed ? 'Yes' : 'No', inline: true },
                { name: 'Cooldown', value: command.cooldown > 0 ? `${command.cooldown}s` : 'None', inline: true }
            ]
        };

        await interaction.editReply({ embeds: [embedResponse] });

    } catch (error) {
        console.error('Error editing custom command:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to update the command.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle command deletion
async function handleDelete(interaction, client) {

    const guild = interaction.guild;
    const commandName = interaction.options.getString('name');

    try {
        const command = await CustomCommand.findOne({ 
            guildID: guild.id, 
            commandName 
        });

        if (!command) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Command Not Found',
                    description: `The command \`/${commandName}\` doesn't exist.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Delete from database
        await CustomCommand.deleteOne({ _id: command._id });

        // Delete from Discord
        try {
            const discordCommand = await guild.commands.fetch().then(cmds => 
                cmds.find(cmd => cmd.name === commandName)
            );
            if (discordCommand) {
                await discordCommand.delete();
            }
        } catch (error) {
            console.warn('Could not delete Discord command:', error.message);
        }

        // Remove from client cache
        client.commands.delete(commandName);

        await interaction.editReply({
            embeds: [{
                title: '✅ Command Deleted',
                description: `Successfully deleted \`/${commandName}\`!\n\n**Stats:**\n• Used ${command.uses} times\n• Created by <@${command.createdBy}>`,
                color: client.config?.colors?.success || 0x57F287
            }]
        });

    } catch (error) {
        console.error('Error deleting custom command:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to delete the command.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle command info
async function handleInfo(interaction, client) {

    const guild = interaction.guild;
    const commandName = interaction.options.getString('name');

    try {
        const command = await CustomCommand.findOne({ 
            guildID: guild.id, 
            commandName 
        });

        if (!command) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Command Not Found',
                    description: `The command \`/${commandName}\` doesn't exist.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        const embed = {
            title: `ℹ️ Command Info: /${command.commandName}`,
            color: command.embed ? parseInt(command.embedColor.replace('#', ''), 16) : (client.config?.colors?.normal || 0x5865F2),
            fields: [
                { name: 'Description', value: command.description, inline: false },
                { name: 'Response', value: command.response.length > 200 ? command.response.substring(0, 200) + '...' : command.response, inline: false },
                { name: 'Status', value: command.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: 'Type', value: command.embed ? '📄 Embed' : '💬 Text', inline: true },
                { name: 'Cooldown', value: command.cooldown > 0 ? `${command.cooldown}s` : 'None', inline: true },
                { name: 'Uses', value: command.uses.toString(), inline: true },
                { name: 'Created', value: `<t:${Math.floor(command.createdAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'Last Used', value: command.lastUsed ? `<t:${Math.floor(command.lastUsed.getTime() / 1000)}:R>` : 'Never', inline: true },
                { name: 'Created By', value: `<@${command.createdBy}>`, inline: true }
            ],
            footer: {
                text: `Command ID: ${command._id}`
            }
        };

        // Add permissions info
        const permissions = [];
        if (command.allowedRoles.length > 0) {
            const roleNames = await Promise.all(
                command.allowedRoles.map(roleId => 
                    guild.roles.fetch(roleId).then(role => role?.name || 'Unknown').catch(() => 'Unknown')
                )
            );
            permissions.push(`Allowed Roles: ${roleNames.join(', ')}`);
        }
        if (command.allowedUsers.length > 0) {
            permissions.push(`Allowed Users: ${command.allowedUsers.map(id => `<@${id}>`).join(', ')}`);
        }
        if (permissions.length > 0) {
            embed.fields.push({ name: 'Permissions', value: permissions.join('\n'), inline: false });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error getting command info:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch command info.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle command toggle
async function handleToggle(interaction, client) {

    const guild = interaction.guild;
    const commandName = interaction.options.getString('name');

    try {
        const command = await CustomCommand.findOne({ 
            guildID: guild.id, 
            commandName 
        });

        if (!command) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Command Not Found',
                    description: `The command \`/${commandName}\` doesn't exist.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        command.enabled = !command.enabled;
        await command.save();

        const embed = {
            title: command.enabled ? '✅ Command Enabled' : '❌ Command Disabled',
            description: `The command \`/${commandName}\` has been ${command.enabled ? 'enabled' : 'disabled'}.`,
            color: command.enabled ? (client.config?.colors?.success || 0x57F287) : (client.config?.colors?.error || 0xED4245)
        };

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error toggling command:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to toggle the command.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}
