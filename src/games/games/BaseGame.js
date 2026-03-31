/**
 * Base Game Class
 * Foundation for all game implementations
 */

const { v4: uuidv4 } = require('uuid');

class BaseGame {
    constructor(interaction, type, options = {}) {
        this.id = uuidv4();
        this.type = type;
        this.interaction = interaction;
        this.options = options;
        this.players = [];
        this.message = null;
        this.ended = false;
        this.createdAt = Date.now();
        this.winner = null;
        this.winnings = {};
        this.result = null;
        
        // Add the interaction user as first player
        this.addPlayer(interaction.user);
    }

    /**
     * Add a player to the game
     */
    addPlayer(user) {
        if (!this.hasPlayer(user.id)) {
            this.players.push({
                id: user.id,
                user: user,
                tag: user.tag,
                joinedAt: Date.now()
            });
        }
    }

    /**
     * Remove a player from the game
     */
    removePlayer(userId) {
        this.players = this.players.filter(p => p.id !== userId);
    }

    /**
     * Check if user is in the game
     */
    hasPlayer(userId) {
        return this.players.some(p => p.id === userId);
    }

    /**
     * Get player by ID
     */
    getPlayer(userId) {
        return this.players.find(p => p.id === userId);
    }

    /**
     * Start the game - to be implemented by subclasses
     */
    async start() {
        throw new Error('start() method must be implemented by subclass');
    }

    /**
     * End the game
     */
    async end(reason = 'completed') {
        if (this.ended) return;
        
        this.ended = true;
        this.result = reason;
        
        // Clean up any timers or intervals
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
        }
        
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
        }
        
        console.log(`Game ${this.id} ended: ${reason}`);
    }

    /**
     * Send a message to the game channel
     */
    async sendMessage(content, embed = null, components = []) {
        try {
            if (this.message) {
                await this.message.edit({
                    content,
                    embeds: embed ? [embed] : [],
                    components
                });
            } else {
                this.message = await this.interaction.channel.send({
                    content,
                    embeds: embed ? [embed] : [],
                    components
                });
            }
        } catch (error) {
            console.error('Error sending game message:', error);
        }
    }

    /**
     * Send a follow-up message
     */
    async sendFollowUp(content, ephemeral = false) {
        try {
            await this.interaction.followUp({
                content,
                ephemeral
            });
        } catch (error) {
            console.error('Error sending follow-up:', error);
        }
    }

    /**
     * Create a game embed
     */
    createEmbed(title, description, color = 0x5865F2) {
        const { EmbedBuilder } = require('discord.js');
        
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setFooter({ 
                text: `Game ID: ${this.id} • ${this.interaction.user.tag}` 
            })
            .setTimestamp();
    }

    /**
     * Create action buttons
     */
    createButton(id, label, style = 'Primary', disabled = false, emoji = null) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const button = new ButtonBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(this.getButtonStyle(style))
            .setDisabled(disabled);
        
        if (emoji) {
            button.setEmoji(emoji);
        }
        
        return button;
    }

    /**
     * Create action row with buttons
     */
    createActionRow(buttons) {
        const { ActionRowBuilder } = require('discord.js');
        
        const row = new ActionRowBuilder();
        buttons.forEach(button => row.addComponents(button));
        
        return row;
    }

    /**
     * Get button style from string
     */
    getButtonStyle(style) {
        const { ButtonStyle } = require('discord.js');
        
        switch (style.toLowerCase()) {
            case 'primary': return ButtonStyle.Primary;
            case 'secondary': return ButtonStyle.Secondary;
            case 'success': return ButtonStyle.Success;
            case 'danger': return ButtonStyle.Danger;
            case 'link': return ButtonStyle.Link;
            default: return ButtonStyle.Primary;
        }
    }

    /**
     * Sleep utility function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format time remaining
     */
    formatTimeRemaining(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Get game duration
     */
    getDuration() {
        return Date.now() - this.createdAt;
    }

    /**
     * Validate game state
     */
    validateState() {
        if (this.ended) {
            throw new Error('Game has already ended');
        }
        
        if (this.players.length === 0) {
            throw new Error('No players in game');
        }
    }

    /**
     * Get game statistics
     */
    getStats() {
        return {
            id: this.id,
            type: this.type,
            players: this.players.length,
            duration: this.getDuration(),
            winner: this.winner,
            result: this.result,
            winnings: this.winnings,
            createdAt: this.createdAt,
            endedAt: this.ended ? Date.now() : null
        };
    }

    /**
     * Handle player disconnect
     */
    async handleDisconnect(userId) {
        const player = this.getPlayer(userId);
        if (!player) return;
        
        // Remove player from game
        this.removePlayer(userId);
        
        // If no players left, end the game
        if (this.players.length === 0) {
            await this.end('no_players');
        } else if (this.players.length === 1 && this.constructor.minPlayers > 1) {
            // Not enough players for multiplayer game
            await this.end('insufficient_players');
        }
        
        // Notify remaining players
        await this.sendMessage(
            `${player.user.tag} has left the game.`
        );
    }

    /**
     * Setup collector for game interactions
     */
    setupCollector(filter, time = 60000) {
        if (!this.message) return null;
        
        const collector = this.message.createMessageComponentCollector({
            filter,
            time
        });

        collector.on('collect', async (interaction) => {
            try {
                await this.handleInteraction(interaction);
            } catch (error) {
                console.error('Error handling interaction:', error);
                await interaction.reply({
                    content: 'An error occurred while processing your action.',
                    ephemeral: true
                });
            }
        });

        collector.on('end', async () => {
            if (!this.ended) {
                await this.end('timeout');
            }
        });

        return collector;
    }

    /**
     * Handle interaction - to be implemented by subclasses
     */
    async handleInteraction(interaction) {
        throw new Error('handleInteraction() method must be implemented by subclass');
    }

    /**
     * Check if game can start
     */
    canStart() {
        const minPlayers = this.constructor.minPlayers || 1;
        const maxPlayers = this.constructor.maxPlayers || 10;
        
        return this.players.length >= minPlayers && this.players.length <= maxPlayers;
    }

    /**
     * Get game info for display
     */
    getInfo() {
        const gameConfig = require('../GameEngine').gameTypes[this.type];
        
        return {
            name: gameConfig?.name || this.type,
            description: gameConfig?.description || 'A custom game',
            category: gameConfig?.category || 'custom',
            minPlayers: gameConfig?.minPlayers || 1,
            maxPlayers: gameConfig?.maxPlayers || 10,
            economyRequired: gameConfig?.economyRequired || false,
            currentPlayers: this.players.length,
            canStart: this.canStart()
        };
    }
}

module.exports = BaseGame;
