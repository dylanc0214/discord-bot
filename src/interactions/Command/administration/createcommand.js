const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const CustomCommand = require('../../../database/models/customCommands');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createcommand')
        .setDescription('Create a custom slash command for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The command name (lowercase, no spaces)')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(32))
        .addStringOption(option =>
            option.setName('response')
                .setDescription('What the command should respond with')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2000))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Command description (shows in Discord)')
                .setRequired(false)
                .setMaxLength(100))
        .addBooleanOption(option =>
            option.setName('embed')
                .setDescription('Send response as an embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Embed color (hex format, e.g., #FF0000)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('cooldown')
                .setDescription('Cooldown in seconds (0 = no cooldown)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(3600))
        .addRoleOption(option =>
            option.setName('allowed-role')
                .setDescription('Role that can use this command')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('allowed-user')
                .setDescription('User that can use this command')
                .setRequired(false)),

    async execute(interaction, client) {

        const guild = interaction.guild;
        const member = interaction.member;

        // Extract options
        const commandName = interaction.options.getString('name').toLowerCase().trim();
        const response = interaction.options.getString('response');
        const description = interaction.options.getString('description') || 'Custom command';
        const useEmbed = interaction.options.getBoolean('embed') || false;
        const embedColor = interaction.options.getString('color') || '#5865F2';
        const cooldown = interaction.options.getInteger('cooldown') || 0;
        const allowedRole = interaction.options.getRole('allowed-role');
        const allowedUser = interaction.options.getUser('allowed-user');

        // Validate command name
        if (!/^[a-z0-9_-]+$/.test(commandName)) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Invalid Command Name',
                    description: 'Command name must only contain lowercase letters, numbers, underscores, and hyphens.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Check if command already exists
        const existingCommand = await CustomCommand.findOne({ 
            guildID: guild.id, 
            commandName 
        });

        if (existingCommand) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Command Already Exists',
                    description: `The command \`/${commandName}\` already exists in this server.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Validate embed color if provided
        if (useEmbed && !/^#[0-9A-F]{6}$/i.test(embedColor)) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Invalid Color',
                    description: 'Embed color must be a valid hex color (e.g., #FF0000)',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Check for conflicts with built-in commands
        const builtInCommand = client.commands.get(commandName);
        if (builtInCommand) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Command Conflict',
                    description: `The command \`/${commandName}\` conflicts with a built-in command.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Create permissions array
        const allowedRoles = allowedRole ? [allowedRole.id] : [];
        const allowedUsers = allowedUser ? [allowedUser.id] : [];

        // Create the custom command
        try {
            const newCommand = new CustomCommand({
                guildID: guild.id,
                commandName,
                response,
                description,
                createdBy: member.id,
                embed: useEmbed,
                embedColor: useEmbed ? embedColor : '#5865F2',
                cooldown,
                allowedRoles,
                allowedUsers
            });

            await newCommand.save();

            // Register the command with Discord
            await registerCustomCommand(client, guild, commandName, description);

            const successEmbed = {
                title: '✅ Custom Command Created',
                description: `Successfully created the command \`/${commandName}\`!`,
                fields: [
                    { name: 'Response', value: response.length > 100 ? response.substring(0, 100) + '...' : response, inline: false },
                    { name: 'Description', value: description, inline: true },
                    { name: 'Embed', value: useEmbed ? 'Yes' : 'No', inline: true },
                    { name: 'Cooldown', value: cooldown > 0 ? `${cooldown}s` : 'None', inline: true },
                    { name: 'Permissions', value: allowedRole ? `Role: ${allowedRole.name}` : allowedUser ? `User: ${allowedUser.username}` : 'Everyone', inline: false }
                ],
                color: client.config?.colors?.success || 0x57F287,
                footer: {
                    text: `Command ID: ${newCommand._id}`
                }
            };

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error creating custom command:', error);
            await interaction.editReply({
                embeds: [{
                    title: '❌ Creation Failed',
                    description: 'There was an error creating the custom command. Please try again.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }
    }
};

// Helper function to register custom command with Discord
async function registerCustomCommand(client, guild, commandName, description) {
    try {
        // Create the slash command data
        const commandData = {
            name: commandName,
            description: description,
        };

        // Register the command to the guild
        await guild.commands.create(commandData);
        
        // Add to client commands collection for immediate use
        client.commands.set(commandName, {
            data: { name: commandName, description },
            isCustom: true,
            execute: async (interaction) => {
                const CustomCommand = require('../../../database/models/customCommands');
                const command = await CustomCommand.findOne({ 
                    guildID: guild.id, 
                    commandName 
                });
                
                if (!command) {
                    return await interaction.reply({
                        content: 'This custom command no longer exists.',
                        ephemeral: true
                    });
                }

                // Handle command execution
                const customHandler = require('../custom/customCommandHandler');
                await customHandler.execute(interaction, command, client);
            }
        });

    } catch (error) {
        console.error('Error registering custom command with Discord:', error);
    }
}
