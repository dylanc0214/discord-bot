/**
 * Game Engine Framework
 * Core system for managing custom games
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');

class GameEngine {
    constructor() {
        this.activeGames = new Map(); // gameID -> Game instance
        this.gameQueues = new Map();  // gameType -> Array of waiting players
        this.gameStats = new Map();   // userID -> Game statistics
        this.achievements = new Map(); // achievementID -> Achievement data
        this.leaderboards = new Map(); // gameType -> Leaderboard data
        
        this.initializeAchievements();
        this.initializeGameTypes();
    }

    /**
     * Initialize available game types
     */
    initializeGameTypes() {
        this.gameTypes = {
            // Casino Games
            'slots': {
                name: '🎰 Slots',
                description: 'Classic slot machine game',
                minPlayers: 1,
                maxPlayers: 1,
                economyRequired: true,
                category: 'casino'
            },
            'roulette': {
                name: '🎲 Roulette',
                description: 'European roulette with betting',
                minPlayers: 1,
                maxPlayers: 1,
                economyRequired: true,
                category: 'casino'
            },
            'blackjack': {
                name: '🃏 Blackjack',
                description: 'Classic 21 card game',
                minPlayers: 1,
                maxPlayers: 1,
                economyRequired: true,
                category: 'casino'
            },
            'poker': {
                name: '♠️ Texas Hold\'em',
                description: 'Multiplayer poker game',
                minPlayers: 2,
                maxPlayers: 8,
                economyRequired: true,
                category: 'casino'
            },
            
            // Party Games
            'trivia': {
                name: '🧠 Trivia Challenge',
                description: 'Test your knowledge',
                minPlayers: 1,
                maxPlayers: 10,
                economyRequired: false,
                category: 'knowledge'
            },
            'wordscramble': {
                name: '📝 Word Scramble',
                description: 'Unscramble the words',
                minPlayers: 1,
                maxPlayers: 10,
                economyRequired: false,
                category: 'word'
            },
            'memory': {
                name: '🧩 Memory Match',
                description: 'Match the pairs',
                minPlayers: 1,
                maxPlayers: 4,
                economyRequired: false,
                category: 'puzzle'
            },
            'rps': {
                name: '✊ Rock Paper Scissors',
                description: 'Classic game with twists',
                minPlayers: 2,
                maxPlayers: 2,
                economyRequired: false,
                category: 'classic'
            },
            
            // Skill Games
            'reaction': {
                name: '⚡ Reaction Time',
                description: 'Test your reflexes',
                minPlayers: 1,
                maxPlayers: 10,
                economyRequired: false,
                category: 'skill'
            },
            'math': {
                name: '🔢 Math Challenge',
                description: 'Solve math problems quickly',
                minPlayers: 1,
                maxPlayers: 10,
                economyRequired: false,
                category: 'skill'
            },
            'typing': {
                name: '⌨️ Speed Typing',
                description: 'Type as fast as you can',
                minPlayers: 1,
                maxPlayers: 10,
                economyRequired: false,
                category: 'skill'
            },
            
            // Strategy Games
            'tic-tac-toe': {
                name: '❌⭕ Tic-Tac-Toe',
                description: 'Classic strategy game',
                minPlayers: 2,
                maxPlayers: 2,
                economyRequired: false,
                category: 'strategy'
            },
            'connect4': {
                name: '🔴 Connect Four',
                description: 'Connect four in a row',
                minPlayers: 2,
                maxPlayers: 2,
                economyRequired: false,
                category: 'strategy'
            },
            'chess': {
                name: '♟️ Chess',
                description: 'Classic chess game',
                minPlayers: 2,
                maxPlayers: 2,
                economyRequired: false,
                category: 'strategy'
            }
        };
    }

    /**
     * Initialize game achievements
     */
    initializeAchievements() {
        this.achievements = new Map([
            // Casino Achievements
            ['first_win', {
                id: 'first_win',
                name: '🎯 First Victory',
                description: 'Win your first game',
                category: 'general',
                reward: { coins: 100, xp: 50 }
            }],
            ['lucky_seven', {
                id: 'lucky_seven',
                name: '🍀 Lucky Seven',
                description: 'Hit a 777 in slots',
                category: 'casino',
                reward: { coins: 777, xp: 100 }
            }],
            ['blackjack_master', {
                id: 'blackjack_master',
                name: '🃏 Blackjack Master',
                description: 'Win 10 blackjack games',
                category: 'casino',
                reward: { coins: 1000, xp: 200 }
            }],
            ['poker_champ', {
                id: 'poker_champ',
                name: '🏆 Poker Champion',
                description: 'Win a poker tournament',
                category: 'casino',
                reward: { coins: 5000, xp: 500 }
            }],
            
            // Knowledge Achievements
            ['trivia_master', {
                id: 'trivia_master',
                name: '🧠 Trivia Master',
                description: 'Answer 50 trivia questions correctly',
                category: 'knowledge',
                reward: { coins: 500, xp: 250 }
            }],
            ['word_wizard', {
                id: 'word_wizard',
                name: '📚 Word Wizard',
                description: 'Solve 25 word scrambles',
                category: 'word',
                reward: { coins: 300, xp: 150 }
            }],
            
            // Skill Achievements
            ['lightning_fast', {
                id: 'lightning_fast',
                name: '⚡ Lightning Fast',
                description: 'React in under 200ms',
                category: 'skill',
                reward: { coins: 200, xp: 100 }
            }],
            ['math_genius', {
                id: 'math_genius',
                name: '🔢 Math Genius',
                description: 'Solve 20 math problems correctly',
                category: 'skill',
                reward: { coins: 400, xp: 200 }
            }],
            ['typing_master', {
                id: 'typing_master',
                name: '⌨️ Typing Master',
                description: 'Type 100 WPM or faster',
                category: 'skill',
                reward: { coins: 300, xp: 150 }
            }],
            
            // Strategy Achievements
            ['strategic_mind', {
                id: 'strategic_mind',
                name: '🧠 Strategic Mind',
                description: 'Win 10 strategy games',
                category: 'strategy',
                reward: { coins: 800, xp: 300 }
            }],
            ['unbeatable', {
                id: 'unbeatable',
                name: '👑 Unbeatable',
                description: 'Win 20 games in a row',
                category: 'general',
                reward: { coins: 2000, xp: 1000 }
            }],
            
            // Special Achievements
            ['game_collector', {
                id: 'game_collector',
                name: '🎮 Game Collector',
                description: 'Play every game type at least once',
                category: 'general',
                reward: { coins: 1500, xp: 500 }
            }],
            ['high_roller', {
                id: 'high_roller',
                name: '💰 High Roller',
                description: 'Bet 10,000 coins in a single game',
                category: 'casino',
                reward: { coins: 1000, xp: 200 }
            }]
        ]);
    }

    /**
     * Create a new game instance
     */
    async createGame(gameType, interaction, options = {}) {
        const gameConfig = this.gameTypes[gameType];
        if (!gameConfig) {
            throw new Error(`Unknown game type: ${gameType}`);
        }

        // Check if user is already in a game
        const existingGame = this.findUserGame(interaction.user.id);
        if (existingGame) {
            throw new Error('You are already in a game! Finish it first.');
        }

        // Check economy requirements
        if (gameConfig.economyRequired) {
            const EconomyUser = require('../database/models/economyUser');
            const economyUser = await EconomyUser.getOrCreateUser(
                interaction.guild.id,
                interaction.user.id,
                interaction.user.tag
            );

            const betAmount = options.bet || 100;
            if (economyUser.balance < betAmount) {
                throw new Error(`You need ${betAmount} coins to play! Your balance: ${economyUser.balance}`);
            }

            // Deduct bet amount
            await economyUser.removeMoney(betAmount, 'GAME', `Bet for ${gameConfig.name}`);
            options.betAmount = betAmount;
        }

        // Create game instance
        const GameClass = this.getGameClass(gameType);
        const game = new GameClass(interaction, options);
        
        // Store game
        this.activeGames.set(game.id, game);

        return game;
    }

    /**
     * Get game class by type
     */
    getGameClass(gameType) {
        const gameClasses = {
            'slots': require('./games/Slots'),
            'roulette': require('./games/Roulette'),
            'blackjack': require('./games/Blackjack'),
            'poker': require('./games/Poker'),
            'trivia': require('./games/Trivia'),
            'wordscramble': require('./games/WordScramble'),
            'memory': require('./games/Memory'),
            'rps': require('./games/RockPaperScissors'),
            'reaction': require('./games/Reaction'),
            'math': require('./games/MathChallenge'),
            'typing': require('./games/Typing'),
            'tic-tac-toe': require('./games/TicTacToe'),
            'connect4': require('./games/Connect4'),
            'chess': require('./games/Chess')
        };

        return gameClasses[gameType] || require('./games/BaseGame');
    }

    /**
     * Find game by user ID
     */
    findUserGame(userId) {
        for (const game of this.activeGames.values()) {
            if (game.hasPlayer(userId)) {
                return game;
            }
        }
        return null;
    }

    /**
     * End and cleanup game
     */
    async endGame(gameId, reason = 'completed') {
        const game = this.activeGames.get(gameId);
        if (!game) return;

        try {
            // End the game
            await game.end(reason);

            // Update statistics
            await this.updateGameStats(game);

            // Check achievements
            await this.checkAchievements(game);

            // Update leaderboards
            await this.updateLeaderboards(game);

        } catch (error) {
            console.error('Error ending game:', error);
        } finally {
            // Remove from active games
            this.activeGames.delete(gameId);
        }
    }

    /**
     * Update player statistics
     */
    async updateGameStats(game) {
        const EconomyUser = require('../database/models/economyUser');

        for (const player of game.players) {
            const stats = this.gameStats.get(player.id) || {
                gamesPlayed: 0,
                gamesWon: 0,
                gamesLost: 0,
                totalWinnings: 0,
                totalLosses: 0,
                winStreak: 0,
                bestWinStreak: 0,
                favoriteGame: game.type,
                achievements: [],
                lastPlayed: new Date()
            };

            stats.gamesPlayed++;
            stats.lastPlayed = new Date();

            if (game.winner === player.id) {
                stats.gamesWon++;
                stats.winStreak++;
                stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);
                
                if (game.winnings) {
                    stats.totalWinnings += game.winnings[player.id] || 0;
                }
            } else {
                stats.gamesLost++;
                stats.winStreak = 0;
                
                if (game.betAmount) {
                    stats.totalLosses += game.betAmount;
                }
            }

            this.gameStats.set(player.id, stats);

            // Update economy user
            const economyUser = await EconomyUser.getOrCreateUser(
                game.interaction.guild.id,
                player.id,
                player.tag
            );

            // Add game stats to economy user
            if (!economyUser.stats.games) {
                economyUser.stats.games = {};
            }

            economyUser.stats.games[game.type] = stats;
            await economyUser.save();
        }
    }

    /**
     * Check and award achievements
     */
    async checkAchievements(game) {
        const EconomyUser = require('../database/models/economyUser');

        for (const player of game.players) {
            const stats = this.gameStats.get(player.id);
            const economyUser = await EconomyUser.getOrCreateUser(
                game.interaction.guild.id,
                player.id,
                player.tag
            );

            for (const [achievementId, achievement] of this.achievements) {
                if (economyUser.achievements.includes(achievementId)) continue;

                const unlocked = await this.checkAchievementCondition(achievementId, stats, game, player);
                if (unlocked) {
                    economyUser.achievements.push(achievementId);
                    
                    // Award rewards
                    if (achievement.reward.coins) {
                        await economyUser.addMoney(achievement.reward.coins, 'ACHIEVEMENT', achievement.name);
                    }

                    // Notify user
                    await this.sendAchievementNotification(game.interaction, player, achievement);
                }
            }

            await economyUser.save();
        }
    }

    /**
     * Check if achievement condition is met
     */
    async checkAchievementCondition(achievementId, stats, game, player) {
        switch (achievementId) {
            case 'first_win':
                return game.winner === player.id && stats.gamesWon === 1;
            
            case 'lucky_seven':
                return game.type === 'slots' && game.result === '777';
            
            case 'blackjack_master':
                return stats.gamesWon >= 10 && game.type === 'blackjack';
            
            case 'poker_champ':
                return game.type === 'poker' && game.isTournament && game.winner === player.id;
            
            case 'trivia_master':
                return stats.gamesWon >= 50 && game.type === 'trivia';
            
            case 'word_wizard':
                return stats.gamesWon >= 25 && game.type === 'wordscramble';
            
            case 'lightning_fast':
                return game.type === 'reaction' && game.reactionTime < 200;
            
            case 'math_genius':
                return stats.gamesWon >= 20 && game.type === 'math';
            
            case 'typing_master':
                return game.type === 'typing' && game.wpm >= 100;
            
            case 'strategic_mind':
                return stats.gamesWon >= 10 && ['tic-tac-toe', 'connect4', 'chess'].includes(game.type);
            
            case 'unbeatable':
                return stats.winStreak >= 20;
            
            case 'game_collector':
                const playedGames = new Set(Object.keys(stats.games || {}));
                return playedGames.size >= Object.keys(this.gameTypes).length;
            
            case 'high_roller':
                return game.betAmount >= 10000;
            
            default:
                return false;
        }
    }

    /**
     * Send achievement notification
     */
    async sendAchievementNotification(interaction, player, achievement) {
        const embed = new EmbedBuilder()
            .setTitle('🏆 Achievement Unlocked!')
            .setDescription(`**${achievement.name}**\n${achievement.description}`)
            .setColor(0xFFD700)
            .addFields(
                {
                    name: '🎁 Rewards',
                    value: achievement.reward.coins ? `${achievement.reward.coins} coins` : 'No rewards',
                    inline: true
                },
                {
                    name: '📊 Progress',
                    value: `${this.gameStats.get(player.id)?.achievements?.length || 0} achievements unlocked`,
                    inline: true
                }
            )
            .setThumbnail(player.displayAvatarURL())
            .setFooter({ text: `${player.tag}` });

        await interaction.channel.send({
            content: `🎉 ${player.toString()} unlocked an achievement!`,
            embeds: [embed]
        });
    }

    /**
     * Update leaderboards
     */
    async updateLeaderboards(game) {
        for (const player of game.players) {
            const stats = this.gameStats.get(player.id);
            if (!stats) continue;

            // Update game-specific leaderboard
            if (!this.leaderboards.has(game.type)) {
                this.leaderboards.set(game.type, []);
            }

            const leaderboard = this.leaderboards.get(game.type);
            const existingEntry = leaderboard.find(entry => entry.userId === player.id);

            if (existingEntry) {
                existingEntry.score = this.calculateLeaderboardScore(game.type, stats);
                existingEntry.lastUpdated = new Date();
            } else {
                leaderboard.push({
                    userId: player.id,
                    username: player.tag,
                    score: this.calculateLeaderboardScore(game.type, stats),
                    lastUpdated: new Date()
                });
            }

            // Sort leaderboard
            leaderboard.sort((a, b) => b.score - a.score);
            
            // Keep top 100
            if (leaderboard.length > 100) {
                leaderboard.splice(100);
            }
        }
    }

    /**
     * Calculate leaderboard score for game type
     */
    calculateLeaderboardScore(gameType, stats) {
        switch (gameType) {
            case 'slots':
            case 'roulette':
            case 'blackjack':
            case 'poker':
                // Casino games: total winnings
                return stats.totalWinnings;
            
            case 'trivia':
            case 'wordscramble':
            case 'math':
            case 'typing':
                // Knowledge games: win rate * games played
                const winRate = stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0;
                return Math.floor(winRate * stats.gamesPlayed * 100);
            
            case 'reaction':
                // Skill games: best performance
                return stats.bestPerformance || 0;
            
            case 'tic-tac-toe':
            case 'connect4':
            case 'chess':
                // Strategy games: win streak
                return stats.bestWinStreak * 100;
            
            default:
                return stats.gamesWon;
        }
    }

    /**
     * Get game list
     */
    getGameList(category = null) {
        const games = Object.entries(this.gameTypes);
        
        if (category) {
            return games.filter(([_, config]) => config.category === category);
        }
        
        return games;
    }

    /**
     * Get leaderboard
     */
    getLeaderboard(gameType, limit = 10) {
        const leaderboard = this.leaderboards.get(gameType) || [];
        return leaderboard.slice(0, limit);
    }

    /**
     * Get user statistics
     */
    getUserStats(userId) {
        return this.gameStats.get(userId) || {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            totalWinnings: 0,
            totalLosses: 0,
            winStreak: 0,
            bestWinStreak: 0,
            favoriteGame: null,
            achievements: [],
            lastPlayed: null
        };
    }

    /**
     * Get user achievements
     */
    getUserAchievements(userId) {
        const stats = this.getUserStats(userId);
        return stats.achievements.map(id => this.achievements.get(id)).filter(Boolean);
    }

    /**
     * Cleanup old inactive games
     */
    cleanup() {
        const now = Date.now();
        const timeout = 30 * 60 * 1000; // 30 minutes

        for (const [gameId, game] of this.activeGames) {
            if (now - game.createdAt > timeout) {
                console.log(`Cleaning up inactive game: ${gameId}`);
                this.endGame(gameId, 'timeout');
            }
        }
    }
}

module.exports = new GameEngine();
