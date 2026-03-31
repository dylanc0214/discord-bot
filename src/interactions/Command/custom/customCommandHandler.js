/**
 * Custom Command Execution Handler
 * Handles the execution of user-created custom commands
 */

module.exports = {
    async execute(interaction, commandData, client) {
        try {
            const guild = interaction.guild;
            const member = interaction.member;

            // Check if user can use this command
            const permissionCheck = await commandData.canUse(member);
            if (!permissionCheck.allowed) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Access Denied',
                        description: permissionCheck.reason,
                        color: client.config?.colors?.error || 0xED4245
                    }],
                    ephemeral: true
                });
            }

            // Check cooldown
            const cooldownCheck = commandData.checkCooldown(member.id);
            if (!cooldownCheck.canUse) {
                return await interaction.reply({
                    embeds: [{
                        title: '⏰ Cooldown Active',
                        description: cooldownCheck.reason,
                        color: client.config?.colors?.error || 0xED4245
                    }],
                    ephemeral: true
                });
            }

            // Process response text with variables
            let response = processVariables(commandData.response, interaction, client);

            // Send the response
            if (commandData.embed) {
                const embed = {
                    title: response.length > 256 ? null : response,
                    description: response.length > 256 ? response : null,
                    color: parseInt(commandData.embedColor.replace('#', ''), 16),
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: `Custom Command • Used ${commandData.uses + 1} times`
                    }
                };

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply(response);
            }

            // Update usage statistics
            await commandData.recordUsage(member.id);

        } catch (error) {
            console.error('Error executing custom command:', error);
            
            if (!interaction.replied) {
                await interaction.reply({
                    embeds: [{
                        title: '❌ Command Error',
                        description: 'There was an error executing this custom command.',
                        color: client.config?.colors?.error || 0xED4245
                    }],
                    ephemeral: true
                });
            }
        }
    }
};

// Process variables in custom command responses
function processVariables(text, interaction, client) {
    const replacements = {
        '{user}': interaction.user.username,
        '{user.mention}': `<@${interaction.user.id}>`,
        '{user.id}': interaction.user.id,
        '{user.tag}': interaction.user.tag,
        '{guild}': interaction.guild.name,
        '{guild.id}': interaction.guild.id,
        '{guild.members}': interaction.guild.memberCount,
        '{channel}': interaction.channel.name,
        '{channel.mention}': `<#${interaction.channel.id}>`,
        '{channel.id}': interaction.channel.id,
        '{date}': new Date().toLocaleDateString(),
        '{time}': new Date().toLocaleTimeString(),
        '{timestamp}': `<t:${Math.floor(Date.now() / 1000)}:R>`,
        '{owner}': interaction.guild.ownerId ? `<@${interaction.guild.ownerId}>` : 'Unknown',
        '{bot}': client.user?.username || 'Bot',
        '{bot.mention}': client.user ? `<@${client.user.id}>` : 'Bot',
        '{random.number}': Math.floor(Math.random() * 100),
        '{random.uuid}': generateUUID(),
        '{server.icon}': interaction.guild.iconURL() || 'No icon'
    };

    let processed = text;
    
    // Replace all variables
    for (const [placeholder, value] of Object.entries(replacements)) {
        processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    // Handle conditional variables
    processed = processed.replace(/\{if\.(.+?)\}(.+?)\{endif\}/g, (match, condition, content) => {
        try {
            // Simple conditional logic
            if (condition.includes('guild.members>') && content.includes('>')) {
                const [_, operator, number] = condition.split('>');
                const memberCount = interaction.guild.memberCount;
                const targetCount = parseInt(number);
                
                if (operator === '>' && memberCount > targetCount) {
                    return content;
                }
            }
            return '';
        } catch (error) {
            return '';
        }
    });

    return processed;
}

// Generate a simple UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
