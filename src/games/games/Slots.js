/**
 * Slots Game
 * Classic slot machine with multiple paylines and bonuses
 */

const BaseGame = require('./BaseGame');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class Slots extends BaseGame {
    constructor(interaction, options = {}) {
        super(interaction, 'slots', options);
        
        this.betAmount = options.betAmount || 100;
        this.paylines = options.paylines || 1;
        this.reels = 5;
        this.rows = 3;
        
        // Slot symbols
        this.symbols = {
            '🍒': { name: 'Cherry', value: 2, weight: 30 },
            '🍋': { name: 'Lemon', value: 3, weight: 25 },
            '🍊': { name: 'Orange', value: 4, weight: 20 },
            '🍇': { name: 'Grape', value: 5, weight: 15 },
            '🔔': { name: 'Bell', value: 10, weight: 10 },
            '💎': { name: 'Diamond', value: 20, weight: 5 },
            '7️⃣': { name: 'Seven', value: 50, weight: 2 },
            '🎰': { name: 'Jackpot', value: 100, weight: 1 }
        };
        
        this.spinning = false;
        this.result = null;
        this.winnings = 0;
        this.bonus = false;
    }

    async start() {
        await this.showGameBoard();
    }

    async showGameBoard() {
        const embed = new EmbedBuilder()
            .setTitle('🎰 Slot Machine')
            .setDescription(`**Bet:** ${this.betAmount} coins\n**Paylines:** ${this.paylines}\n\nClick SPIN to play!`)
            .setColor(0xFFD700)
            .addFields(
                {
                    name: '🎰 Slot Machine',
                    value: this.createSlotDisplay(['🎰', '🎰', '🎰', '🎰', '🎰']),
                    inline: false
                }
            )
            .setFooter({ text: `Player: ${this.interaction.user.tag}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spin')
                    .setLabel('🎰 SPIN')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(this.spinning)
            );

        const message = await this.interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        this.message = message;
        this.setupCollector();
    }

    createSlotDisplay(symbols) {
        // Create visual representation of slots
        const display = symbols.map(symbol => `||${symbol}||`).join(' ');
        return `┌─────────┐\n│ ${display} │\n└─────────┘`;
    }

    setupCollector() {
        const collector = this.message.createMessageComponentCollector({
            time: 60000 // 1 minute
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== this.interaction.user.id) {
                await interaction.reply({
                    content: 'This is not your game!',
                    ephemeral: true
                });
                return;
            }

            await interaction.deferUpdate();

            if (interaction.customId === 'spin') {
                await this.spin();
            }
        });

        collector.on('end', async () => {
            if (!this.ended) {
                await this.end('timeout');
            }
        });
    }

    async spin() {
        if (this.spinning) return;
        
        this.spinning = true;
        await this.updateSpinButton(true);

        // Animate spinning
        await this.animateSpin();

        // Generate result
        this.result = this.generateResult();
        this.winnings = this.calculateWinnings();

        // Show result
        await this.showResult();

        // Handle winnings
        if (this.winnings > 0) {
            await this.awardWinnings();
        }

        this.spinning = false;
        await this.updateSpinButton(false);
    }

    async animateSpin() {
        const duration = 3000; // 3 seconds
        const interval = 200; // Update every 200ms
        const steps = duration / interval;

        for (let i = 0; i < steps; i++) {
            const randomSymbols = this.getRandomSymbols(this.reels);
            const embed = new EmbedBuilder()
                .setTitle('🎰 Slot Machine - Spinning...')
                .setDescription(`**Bet:** ${this.betAmount} coins\n**Paylines:** ${this.paylines}`)
                .setColor(0xFFD700)
                .addFields(
                    {
                        name: '🎰 Slot Machine',
                        value: this.createSlotDisplay(randomSymbols),
                        inline: false
                    }
                );

            await this.message.edit({ embeds: [embed] });
            await this.sleep(interval);
        }
    }

    generateResult() {
        const symbols = [];
        
        // Generate weighted random symbols
        for (let i = 0; i < this.reels; i++) {
            symbols.push(this.getWeightedSymbol());
        }

        return symbols;
    }

    getWeightedSymbol() {
        const totalWeight = Object.values(this.symbols).reduce((sum, symbol) => sum + symbol.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [symbol, data] of Object.entries(this.symbols)) {
            random -= data.weight;
            if (random <= 0) {
                return symbol;
            }
        }
        
        return '🍒'; // Default
    }

    getRandomSymbols(count) {
        const symbols = [];
        for (let i = 0; i < count; i++) {
            symbols.push(this.getWeightedSymbol());
        }
        return symbols;
    }

    calculateWinnings() {
        let totalWinnings = 0;
        
        // Check for winning combinations
        const combinations = this.getWinningCombinations();
        
        for (const combo of combinations) {
            const multiplier = this.getMultiplier(combo);
            if (multiplier > 0) {
                totalWinnings += this.betAmount * multiplier;
            }
        }

        // Check for jackpot
        if (this.result.every(symbol => symbol === '7️⃣')) {
            totalWinnings += this.betAmount * 100; // 100x jackpot
            this.bonus = true;
        } else if (this.result.every(symbol => symbol === '🎰')) {
            totalWinnings += this.betAmount * 50; // 50x mega jackpot
            this.bonus = true;
        }

        return totalWinnings;
    }

    getWinningCombinations() {
        const combinations = [];
        
        // Check horizontal lines (3 rows)
        for (let row = 0; row < this.rows; row++) {
            const line = this.result.slice(0, 3); // Simplified for 3 visible symbols
            combinations.push(line);
        }
        
        // Check diagonal lines
        if (this.result.length >= 3) {
            combinations.push([this.result[0], this.result[1], this.result[2]]);
        }
        
        return combinations;
    }

    getMultiplier(combo) {
        // Check for three of a kind
        if (combo[0] === combo[1] && combo[1] === combo[2]) {
            const symbol = combo[0];
            return this.symbols[symbol]?.value || 0;
        }
        
        // Check for two of a kind
        if (combo[0] === combo[1] || combo[1] === combo[2] || combo[0] === combo[2]) {
            const symbol = combo.find(s => combo.filter(x => x === s).length >= 2);
            return Math.floor((this.symbols[symbol]?.value || 0) / 2);
        }
        
        return 0;
    }

    async showResult() {
        const resultString = this.result.join(' ');
        let description = `**Bet:** ${this.betAmount} coins\n**Result:** ${resultString}\n`;
        
        if (this.winnings > 0) {
            description += `**🎉 WINNINGS:** ${this.winnings} coins!`;
            
            if (this.bonus) {
                description += `\n**🎊 BONUS WIN!**`;
            }
        } else {
            description += `**No win this time. Try again!**`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎰 Slot Machine - Result')
            .setDescription(description)
            .setColor(this.winnings > 0 ? 0x00FF00 : 0xFF0000)
            .addFields(
                {
                    name: '🎰 Final Result',
                    value: this.createSlotDisplay(this.result),
                    inline: false
                }
            );

        if (this.winnings > 0) {
            embed.addFields(
                {
                    name: '💰 Profit',
                    value: `${this.winnings - this.betAmount} coins`,
                    inline: true
                },
                {
                    name: '📊 Return',
                    value: `${Math.round((this.winnings / this.betAmount) * 100)}%`,
                    inline: true
                }
            );
        }

        await this.message.edit({ embeds: [embed] });
    }

    async awardWinnings() {
        const EconomyUser = require('../../database/models/economyUser');
        const economyUser = await EconomyUser.getOrCreateUser(
            this.interaction.guild.id,
            this.interaction.user.id,
            this.interaction.user.tag
        );

        await economyUser.addMoney(this.winnings, 'GAME', `Won in slots`);
        
        // Store winnings for game stats
        this.winnings = this.winnings;
        this.winner = this.interaction.user.id;

        // Send win notification
        await this.interaction.followUp({
            content: `🎉 Congratulations! You won **${this.winnings}** coins!`,
            ephemeral: true
        });
    }

    async updateSpinButton(disabled) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spin')
                    .setLabel(disabled ? '🎰 SPINNING...' : '🎰 SPIN')
                    .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setDisabled(disabled)
            );

        await this.message.edit({ components: [row] });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async end(reason) {
        if (this.ended) return;
        
        this.ended = true;
        
        if (reason === 'timeout') {
            const embed = new EmbedBuilder()
                .setTitle('🎰 Game Ended')
                .setDescription('Game timed out due to inactivity.')
                .setColor(0xFF0000);

            await this.message.edit({
                embeds: [embed],
                components: []
            });
        }

        // Call parent end method
        await super.end(reason);
    }
}

module.exports = Slots;
