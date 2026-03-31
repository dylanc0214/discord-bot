const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const gameEngine = require('../../games/GameEngine');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play various games')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('Choose a game to play')
                .setRequired(true)
                .addChoices(
                    // Casino Games
                    { name: '🎰 Slots', value: 'slots' },
                    { name: '🎲 Roulette', value: 'roulette' },
                    { name: '🃏 Blackjack', value: 'blackjack' },
                    { name: '♠️ Texas Hold\'em', value: 'poker' },
                    
                    // Party Games
                    { name: '🧠 Trivia Challenge', value: 'trivia' },
                    { name: '📝 Word Scramble', value: 'wordscramble' },
                    { name: '🧩 Memory Match', value: 'memory' },
                    { name: '✊ Rock Paper Scissors', value: 'rps' },
                    
                    // Skill Games
                    { name: '⚡ Reaction Time', value: 'reaction' },
                    { name: '🔢 Math Challenge', value: 'math' },
                    { name: '⌨️ Speed Typing', value: 'typing' },
                    
                    // Strategy Games
                    { name: '❌⭕ Tic-Tac-Toe', value: 'tic-tac-toe' },
                    { name: '🔴 Connect Four', value: 'connect4' },
                    { name: '♟️ Chess', value: 'chess' }
                ))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Bet amount (for casino games)')
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(10000))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Game category (for trivia)')
                .setRequired(false)
                .addChoices(
                    { name: 'General', value: 'general' },
                    { name: 'Science', value: 'science' },
                    { name: 'History', value: 'history' },
                    { name: 'Entertainment', value: 'entertainment' }
                ))
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Difficulty level')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' }
                ))
        .addIntegerOption(option =>
            option.setName('questions')
                .setDescription('Number of questions (for trivia)')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(20))
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Opponent for 2-player games')
                .setRequired(false)),

    async execute(interaction, client) {
        const gameType = interaction.options.getString('game');
        const bet = interaction.options.getInteger('bet');
        const category = interaction.options.getString('category');
        const difficulty = interaction.options.getString('difficulty');
        const questions = interaction.options.getInteger('questions');
        const opponent = interaction.options.getUser('opponent');

        try {
            // Get game configuration
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

            // Check if user is already in a game
            const existingGame = gameEngine.findUserGame(interaction.user.id);
            if (existingGame) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Already in Game',
                        description: 'You are already in a game! Finish it first.',
                        color: client.config?.colors?.error || 0xED4245
                    }]
                });
            }

            // Validate bet for economy games
            if (gameConfig.economyRequired && (!bet || bet < 10)) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Invalid Bet',
                        description: 'Economy games require a minimum bet of 10 coins.',
                        color: client.config?.colors?.error || 0xED4245
                    }]
                });
            }

            // Check opponent for 2-player games
            if (gameConfig.minPlayers === 2 && !opponent) {
                return await interaction.reply({
                    embeds: [{
                        title: '❌ Opponent Required',
                        description: 'This game requires an opponent. Please specify one.',
                        color: client.config?.colors?.error || 0xED4245
                    }]
                });
            }

            // Check if opponent is available
            if (opponent && gameConfig.minPlayers === 2) {
                const opponentGame = gameEngine.findUserGame(opponent.id);
                if (opponentGame) {
                    return await interaction.reply({
                        embeds: [{
                            title: '❌ Opponent Unavailable',
                            description: `${opponent.tag} is already in a game.`,
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }

                if (opponent.bot) {
                    return await interaction.reply({
                        embeds: [{
                            title: '❌ Invalid Opponent',
                            description: 'You cannot play against bots.',
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }

                if (opponent.id === interaction.user.id) {
                    return await interaction.reply({
                        embeds: [{
                            title: '❌ Invalid Opponent',
                            description: 'You cannot play against yourself.',
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }
            }

            // Prepare game options
            const options = {
                bet,
                category,
                difficulty,
                questions
            };

            // Create game
            const game = await gameEngine.createGame(gameType, interaction, options);

            // Add opponent if specified
            if (opponent && gameConfig.minPlayers === 2) {
                game.addPlayer(opponent);
            }

            // Start the game
            await game.start();

        } catch (error) {
            console.error('Error starting game:', error);
            
            const embed = {
                title: '❌ Game Error',
                description: error.message || 'Failed to start the game.',
                color: client.config?.colors?.error || 0xED4245
            };

            if (error.message.includes('coins')) {
                embed.fields = [{
                    name: '💡 Tip',
                    value: 'Use `/balance` to check your coins and `/work` to earn more!',
                    inline: false
                }];
            }

            await interaction.reply({ embeds: [embed] });
        }
    }
};
