const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const gameEngine = require('../../games/GameEngine');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View game leaderboards')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Select a game')
                .setRequired(false)
                .addChoices(
                    { name: '🎰 Slots', value: 'slots' },
                    { name: '🎲 Roulette', value: 'roulette' },
                    { name: '🃏 Blackjack', value: 'blackjack' },
                    { name: '♠️ Texas Hold\'em', value: 'poker' },
                    { name: '🧠 Trivia Challenge', value: 'trivia' },
                    { name: '📝 Word Scramble', value: 'wordscramble' },
                    { name: '🧩 Memory Match', value: 'memory' },
                    { name: '✊ Rock Paper Scissors', value: 'rps' },
                    { name: '⚡ Reaction Time', value: 'reaction' },
                    { name: '🔢 Math Challenge', value: 'math' },
                    { name: '⌨️ Speed Typing', value: 'typing' },
                    { name: '❌⭕ Tic-Tac-Toe', value: 'tic-tac-toe' },
                    { name: '🔴 Connect Four', value: 'connect4' },
                    { name: '♟️ Chess', value: 'chess' },
                    { name: '🏆 Overall', value: 'overall' }
                ))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Filter by category')
                .setRequired(false)
                .addChoices(
                    { name: 'Casino', value: 'casino' },
                    { name: 'Knowledge', value: 'knowledge' },
                    { name: 'Word', value: 'word' },
                    { name: 'Puzzle', value: 'puzzle' },
                    { name: 'Skill', value: 'skill' },
                    { name: 'Strategy', value: 'strategy' },
                    { name: 'Classic', value: 'classic' }
                ))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of players to show')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(50)),

    async execute(interaction, client) {
        const gameType = interaction.options.getString('game');
        const category = interaction.options.getString('category');
        const limit = interaction.options.getInteger('limit') || 10;

        try {
            if (gameType === 'overall') {
                await showOverallLeaderboard(interaction, client, limit);
            } else if (gameType) {
                await showGameLeaderboard(interaction, client, gameType, limit);
            } else if (category) {
                await showCategoryLeaderboard(interaction, client, category, limit);
            } else {
                await showMainLeaderboard(interaction, client, limit);
            }
        } catch (error) {
            console.error('Error showing leaderboard:', error);
            await interaction.reply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to load leaderboard.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }
    }
};

async function showMainLeaderboard(interaction, client, limit) {
    const embed = new EmbedBuilder()
        .setTitle('🏆 Game Leaderboards')
        .setDescription('Select a specific game or category to view detailed rankings.')
        .setColor(0xFFD700)
        .addFields(
            {
                name: '🎮 Casino Games',
                value: '🎰 Slots • 🎲 Roulette • 🃏 Blackjack • ♠️ Poker',
                inline: false
            },
            {
                name: '🧠 Knowledge Games',
                value: '🧠 Trivia • 📝 Word Scramble • 🔢 Math Challenge',
                inline: false
            },
            {
                name: '⚡ Skill Games',
                value: '⚡ Reaction • ⌨️ Typing • 🧩 Memory',
                inline: false
            },
            {
                name: '🎯 Strategy Games',
                value: '❌⭕ Tic-Tac-Toe • 🔴 Connect Four • ♟️ Chess',
                inline: false
            }
        )
        .setFooter({ text: 'Use /leaderboard game:<game> to view specific rankings' });

    await interaction.reply({ embeds: [embed] });
}

async function showGameLeaderboard(interaction, client, gameType, limit) {
    const gameConfig = gameEngine.gameTypes[gameType];
    if (!gameConfig) {
        return await interaction.reply({
            embeds: [{
                title: '❌ Game Not Found',
                description: 'The specified game could not be found.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }

    const leaderboard = gameEngine.getLeaderboard(gameType, limit);
    
    if (leaderboard.length === 0) {
        return await interaction.reply({
            embeds: [{
                title: `${gameConfig.name} Leaderboard`,
                description: 'No players found on this leaderboard yet!',
                color: client.config?.colors?.normal || 0x5865F2
            }]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`${gameConfig.name} Leaderboard`)
        .setDescription(`Top ${Math.min(limit, leaderboard.length)} players`)
        .setColor(0xFFD700)
        .setThumbnail('https://cdn.discordapp.com/emojis/749769973876312124.png');

    // Add leaderboard entries
    leaderboard.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        embed.addFields({
            name: `${medal} #${index + 1} ${entry.username}`,
            value: `**Score:** ${entry.score.toLocaleString()}\n**Last Played:** <t:${Math.floor(entry.lastUpdated.getTime() / 1000)}:R>`,
            inline: true
        });
    });

    embed.setFooter({ 
        text: `Showing top ${leaderboard.length} players • Updated: ${new Date().toLocaleDateString()}` 
    });

    await interaction.reply({ embeds: [embed] });
}

async function showCategoryLeaderboard(interaction, client, category, limit) {
    const categoryGames = Object.entries(gameEngine.gameTypes)
        .filter(([_, config]) => config.category === category)
        .map(([type, config]) => ({ type, ...config }));

    if (categoryGames.length === 0) {
        return await interaction.reply({
            embeds: [{
                title: '❌ Category Not Found',
                description: 'The specified category has no games.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }

    // Combine leaderboards from all games in category
    const combinedLeaderboard = new Map();
    
    for (const game of categoryGames) {
        const gameLeaderboard = gameEngine.getLeaderboard(game.type, 100);
        
        for (const entry of gameLeaderboard) {
            const existing = combinedLeaderboard.get(entry.userId);
            if (existing) {
                existing.score += entry.score;
                existing.games++;
            } else {
                combinedLeaderboard.set(entry.userId, {
                    userId: entry.userId,
                    username: entry.username,
                    score: entry.score,
                    games: 1,
                    lastUpdated: entry.lastUpdated
                });
            }
        }
    }

    // Sort and limit
    const sortedLeaderboard = Array.from(combinedLeaderboard.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    if (sortedLeaderboard.length === 0) {
        return await interaction.reply({
            embeds: [{
                title: `${category.charAt(0).toUpperCase() + category.slice(1)} Leaderboard`,
                description: 'No players found in this category yet!',
                color: client.config?.colors?.normal || 0x5865F2
            }]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`${category.charAt(0).toUpperCase() + category.slice(1)} Games Leaderboard`)
        .setDescription(`Combined rankings from ${categoryGames.length} games`)
        .setColor(0xFFD700);

    sortedLeaderboard.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        embed.addFields({
            name: `${medal} #${index + 1} ${entry.username}`,
            value: `**Score:** ${entry.score.toLocaleString()}\n**Games Played:** ${entry.games}\n**Last Played:** <t:${Math.floor(entry.lastUpdated.getTime() / 1000)}:R>`,
            inline: true
        });
    });

    embed.setFooter({ 
        text: `Combined from ${categoryGames.length} games • Top ${sortedLeaderboard.length} players` 
    });

    await interaction.reply({ embeds: [embed] });
}

async function showOverallLeaderboard(interaction, client, limit) {
    // Combine all game leaderboards
    const overallLeaderboard = new Map();
    
    for (const gameType of Object.keys(gameEngine.gameTypes)) {
        const gameLeaderboard = gameEngine.getLeaderboard(gameType, 100);
        
        for (const entry of gameLeaderboard) {
            const existing = overallLeaderboard.get(entry.userId);
            if (existing) {
                existing.score += entry.score;
                existing.games++;
                existing.wins = existing.wins || 0;
                
                // Check if this user is #1 in any game
                if (gameLeaderboard[0]?.userId === entry.userId) {
                    existing.wins++;
                }
            } else {
                overallLeaderboard.set(entry.userId, {
                    userId: entry.userId,
                    username: entry.username,
                    score: entry.score,
                    games: 1,
                    wins: gameLeaderboard[0]?.userId === entry.userId ? 1 : 0,
                    lastUpdated: entry.lastUpdated
                });
            }
        }
    }

    // Sort and limit
    const sortedLeaderboard = Array.from(overallLeaderboard.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    if (sortedLeaderboard.length === 0) {
        return await interaction.reply({
            embeds: [{
                title: '🏆 Overall Leaderboard',
                description: 'No players found yet! Start playing to appear on the leaderboard.',
                color: client.config?.colors?.normal || 0x5865F2
            }]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🏆 Overall Games Leaderboard')
        .setDescription(`Top ${Math.min(limit, sortedLeaderboard.length)} players across all games`)
        .setColor(0xFFD700)
        .setThumbnail('https://cdn.discordapp.com/emojis/749769973876312124.png');

    sortedLeaderboard.forEach((entry, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        const crown = entry.wins > 0 ? `👑 x${entry.wins}` : '';
        
        embed.addFields({
            name: `${medal} #${index + 1} ${entry.username} ${crown}`,
            value: `**Total Score:** ${entry.score.toLocaleString()}\n**Games:** ${entry.games}\n**#1 Rankings:** ${entry.wins}\n**Last Played:** <t:${Math.floor(entry.lastUpdated.getTime() / 1000)}:R>`,
            inline: true
        });
    });

    embed.setFooter({ 
        text: `Combined from ${Object.keys(gameEngine.gameTypes).length} games • Updated: ${new Date().toLocaleDateString()}` 
    });

    await interaction.reply({ embeds: [embed] });
}
