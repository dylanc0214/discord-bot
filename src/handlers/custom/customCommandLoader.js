/**
 * Custom Command Loader
 * Loads and registers existing custom commands on bot startup
 */

const CustomCommand = require('../../database/models/customCommands');

module.exports = async (client) => {
    console.log('🔄 Loading custom commands...');

    try {
        // Get all guilds the bot is in
        const guilds = client.guilds.cache;
        
        let totalLoaded = 0;

        for (const guild of guilds.values()) {
            try {
                // Get all custom commands for this guild
                const customCommands = await CustomCommand.find({ 
                    guildID: guild.id,
                    enabled: true 
                });

                for (const command of customCommands) {
                    try {
                        // Register command with Discord if not already registered
                        await registerCustomCommand(client, guild, command);
                        totalLoaded++;
                    } catch (error) {
                        console.warn(`Failed to register custom command ${command.commandName} in guild ${guild.name}:`, error.message);
                    }
                }

                console.log(`📋 Loaded ${customCommands.length} custom commands for guild: ${guild.name}`);

            } catch (error) {
                console.error(`Error loading custom commands for guild ${guild.name}:`, error);
            }
        }

        console.log(`✅ Successfully loaded ${totalLoaded} custom commands across ${guilds.size} guilds`);

    } catch (error) {
        console.error('Error in custom command loader:', error);
    }
};

// Helper function to register a custom command
async function registerCustomCommand(client, guild, commandData) {
    try {
        // Check if command is already registered
        const existingCommands = await guild.commands.fetch();
        const existingCommand = existingCommands.find(cmd => cmd.name === commandData.commandName);

        if (!existingCommand) {
            // Create the command
            const commandDataForDiscord = {
                name: commandData.commandName,
                description: commandData.description,
            };

            await guild.commands.create(commandDataForDiscord);
        }

        // Add to client commands collection
        client.commands.set(commandData.commandName, {
            data: { 
                name: commandData.commandName, 
                description: commandData.description 
            },
            isCustom: true,
            execute: async (interaction) => {
                // Get fresh command data from database
                const CustomCommand = require('../../database/models/customCommands');
                const command = await CustomCommand.findOne({ 
                    guildID: guild.id, 
                    commandName: commandData.commandName 
                });
                
                if (!command || !command.enabled) {
                    return await interaction.reply({
                        content: 'This custom command is no longer available.',
                        ephemeral: true
                    });
                }

                // Handle command execution
                const customHandler = require('../../interactions/Command/custom/customCommandHandler');
                await customHandler.execute(interaction, command, client);
            }
        });

    } catch (error) {
        console.error(`Error registering custom command ${commandData.commandName}:`, error);
        throw error;
    }
}
