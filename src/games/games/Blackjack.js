/**
 * Blackjack Game
 * Classic 21 card game with dealer
 */

const BaseGame = require('./BaseGame');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

class Blackjack extends BaseGame {
    constructor(interaction, options = {}) {
        super(interaction, 'blackjack', options);
        
        this.betAmount = options.betAmount || 100;
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gameState = 'betting'; // betting, playing, dealer, ended
        this.standing = false;
        this.result = null;
        this.winnings = 0;
    }

    async start() {
        this.initializeDeck();
        this.shuffleDeck();
        await this.showGameBoard();
    }

    initializeDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                let value = parseInt(rank);
                if (rank === 'A') value = 11;
                else if (['J', 'Q', 'K'].includes(rank)) value = 10;
                
                this.deck.push({
                    rank,
                    suit,
                    value,
                    display: `${rank}${suit}`
                });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    drawCard() {
        return this.deck.pop();
    }

    calculateHand(hand) {
        let value = 0;
        let aces = 0;
        
        for (const card of hand) {
            if (card.rank === 'A') {
                aces++;
                value += 11;
            } else {
                value += card.value;
            }
        }
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    async showGameBoard() {
        const embed = new EmbedBuilder()
            .setTitle('🃏 Blackjack')
            .setDescription(`**Bet:** ${this.betAmount} coins\n\nClick DEAL to start!`)
            .setColor(0x000000)
            .addFields(
                {
                    name: '🎴 Your Hand',
                    value: 'No cards yet',
                    inline: true
                },
                {
                    name: '🎰 Dealer Hand',
                    value: 'No cards yet',
                    inline: true
                }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('deal')
                    .setLabel('🎴 DEAL')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(this.gameState !== 'betting')
            );

        const message = await this.interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        this.message = message;
        this.setupCollector();
    }

    setupCollector() {
        const collector = this.message.createMessageComponentCollector({
            time: 120000 // 2 minutes
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

            switch (interaction.customId) {
                case 'deal':
                    await this.dealCards();
                    break;
                case 'hit':
                    await this.hit();
                    break;
                case 'stand':
                    await this.stand();
                    break;
                case 'double':
                    await this.double();
                    break;
            }
        });

        collector.on('end', async () => {
            if (!this.ended) {
                await this.end('timeout');
            }
        });
    }

    async dealCards() {
        if (this.gameState !== 'betting') return;
        
        this.gameState = 'playing';
        
        // Deal initial cards
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.dealerHand = [this.drawCard(), this.drawCard()];
        
        // Check for blackjack
        const playerValue = this.calculateHand(this.playerHand);
        const dealerValue = this.calculateHand(this.dealerHand);
        
        if (playerValue === 21 && dealerValue === 21) {
            await this.endGame('push');
        } else if (playerValue === 21) {
            await this.endGame('blackjack');
        } else if (dealerValue === 21) {
            await this.endGame('lose');
        } else {
            await this.updateGameBoard();
        }
    }

    async hit() {
        if (this.gameState !== 'playing' || this.standing) return;
        
        this.playerHand.push(this.drawCard());
        const playerValue = this.calculateHand(this.playerHand);
        
        if (playerValue > 21) {
            await this.endGame('bust');
        } else if (playerValue === 21) {
            await this.stand();
        } else {
            await this.updateGameBoard();
        }
    }

    async stand() {
        if (this.gameState !== 'playing' || this.standing) return;
        
        this.standing = true;
        this.gameState = 'dealer';
        
        await this.dealerPlay();
    }

    async double() {
        if (this.gameState !== 'playing' || this.playerHand.length !== 2) return;
        
        // Check if player has enough coins
        const EconomyUser = require('../../database/models/economyUser');
        const economyUser = await EconomyUser.getOrCreateUser(
            this.interaction.guild.id,
            this.interaction.user.id,
            this.interaction.user.tag
        );

        if (economyUser.balance < this.betAmount) {
            await this.interaction.followUp({
                content: 'You don\'t have enough coins to double down!',
                ephemeral: true
            });
            return;
        }

        // Double the bet
        await economyUser.removeMoney(this.betAmount, 'GAME', 'Double down in blackjack');
        this.betAmount *= 2;
        
        // Take one card and stand
        this.playerHand.push(this.drawCard());
        const playerValue = this.calculateHand(this.playerHand);
        
        if (playerValue > 21) {
            await this.endGame('bust');
        } else {
            await this.stand();
        }
    }

    async dealerPlay() {
        const dealerValue = this.calculateHand(this.dealerHand);
        
        if (dealerValue < 17) {
            // Dealer hits
            this.dealerHand.push(this.drawCard());
            await this.updateGameBoard();
            await this.sleep(1500); // Delay for realism
            await this.dealerPlay();
        } else {
            // Dealer stands
            const playerValue = this.calculateHand(this.playerHand);
            
            if (dealerValue > 21) {
                await this.endGame('win');
            } else if (dealerValue > playerValue) {
                await this.endGame('lose');
            } else if (playerValue > dealerValue) {
                await this.endGame('win');
            } else {
                await this.endGame('push');
            }
        }
    }

    async updateGameBoard() {
        const playerValue = this.calculateHand(this.playerHand);
        const dealerValue = this.calculateHand(this.dealerHand);
        
        const playerCards = this.playerHand.map(card => card.display).join(' ');
        const dealerCards = this.gameState === 'playing' 
            ? `${this.dealerHand[0].display} ||??||`
            : this.dealerHand.map(card => card.display).join(' ');

        const embed = new EmbedBuilder()
            .setTitle('🃏 Blackjack')
            .setDescription(`**Bet:** ${this.betAmount} coins\n**Your Total:** ${playerValue}\n**Dealer Total:** ${this.gameState === 'playing' ? '?' : dealerValue}`)
            .setColor(0x000000)
            .addFields(
                {
                    name: '🎴 Your Hand',
                    value: playerCards,
                    inline: true
                },
                {
                    name: '🎰 Dealer Hand',
                    value: dealerCards,
                    inline: true
                }
            );

        // Create action buttons based on game state
        const row = new ActionRowBuilder();
        
        if (this.gameState === 'playing' && !this.standing) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('hit')
                    .setLabel('🎯 HIT')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stand')
                    .setLabel('✋ STAND')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            if (this.playerHand.length === 2) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('double')
                        .setLabel('💰 DOUBLE')
                        .setStyle(ButtonStyle.Success)
                );
            }
        }

        await this.message.edit({
            embeds: [embed],
            components: this.gameState === 'playing' ? [row] : []
        });
    }

    async endGame(result) {
        this.gameState = 'ended';
        this.result = result;
        
        let winnings = 0;
        let description = '';
        let color = 0x000000;
        
        switch (result) {
            case 'blackjack':
                winnings = Math.floor(this.betAmount * 2.5);
                description = `🎉 **BLACKJACK!** You win ${winnings} coins!`;
                color = 0x00FF00;
                this.winner = this.interaction.user.id;
                break;
            case 'win':
                winnings = this.betAmount * 2;
                description = `🎉 **YOU WIN!** You win ${winnings} coins!`;
                color = 0x00FF00;
                this.winner = this.interaction.user.id;
                break;
            case 'push':
                winnings = this.betAmount;
                description = `🤝 **PUSH!** You get your ${winnings} coins back.`;
                color = 0xFFFF00;
                break;
            case 'bust':
                description = `💥 **BUST!** You went over 21!`;
                color = 0xFF0000;
                break;
            case 'lose':
                description = `😞 **YOU LOSE!** Dealer wins!`;
                color = 0xFF0000;
                break;
        }

        this.winnings = winnings;

        const playerValue = this.calculateHand(this.playerHand);
        const dealerValue = this.calculateHand(this.dealerHand);
        
        const embed = new EmbedBuilder()
            .setTitle('🃏 Blackjack - Game Over')
            .setDescription(description)
            .setColor(color)
            .addFields(
                {
                    name: '🎴 Your Hand',
                    value: `${this.playerHand.map(card => card.display).join(' ')} (${playerValue})`,
                    inline: true
                },
                {
                    name: '🎰 Dealer Hand',
                    value: `${this.dealerHand.map(card => card.display).join(' ')} (${dealerValue})`,
                    inline: true
                }
            );

        if (winnings > 0) {
            embed.addFields(
                {
                    name: '💰 Profit',
                    value: `${winnings - this.betAmount} coins`,
                    inline: true
                }
            );
        }

        await this.message.edit({
            embeds: [embed],
            components: []
        });

        // Award winnings
        if (winnings > 0) {
            await this.awardWinnings();
        }

        // End the game
        await this.end(result);
    }

    async awardWinnings() {
        const EconomyUser = require('../../database/models/economyUser');
        const economyUser = await EconomyUser.getOrCreateUser(
            this.interaction.guild.id,
            this.interaction.user.id,
            this.interaction.user.tag
        );

        await economyUser.addMoney(this.winnings, 'GAME', `Won in blackjack`);
        
        // Send win notification
        await this.interaction.followUp({
            content: `🎉 Congratulations! You won **${this.winnings}** coins!`,
            ephemeral: true
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async end(reason) {
        if (this.ended) return;
        
        this.ended = true;
        
        if (reason === 'timeout') {
            const embed = new EmbedBuilder()
                .setTitle('🃏 Game Ended')
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

module.exports = Blackjack;
