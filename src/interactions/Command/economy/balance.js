const { SlashCommandBuilder } = require('discord.js');
const EconomyUser = require('../../../database/models/economyUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your or someone else\'s balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)),

    async execute(interaction, client) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        try {
            // Get or create economy user
            const economyUser = await EconomyUser.getOrCreateUser(
                interaction.guild.id,
                targetUser.id,
                targetUser.tag
            );

            // Check privacy settings
            if (targetUser.id !== interaction.user.id && economyUser.preferences.privacy === 'private') {
                return await interaction.editReply({
                    embeds: [{
                        title: '🔒 Private Balance',
                        description: `**${targetUser.tag}** has set their balance to private.`,
                        color: client.config?.colors?.normal || 0x5865F2
                    }]
                });
            }

            // Create balance embed
            const embed = {
                title: targetUser.id === interaction.user.id ? '💰 Your Balance' : `💰 ${targetUser.tag}'s Balance`,
                description: `**Total Balance:** ${economyUser.totalBalance.toLocaleString()} ${economyUser.preferences.currency}`,
                color: client.config?.colors?.success || 0x57F287,
                fields: [
                    {
                        name: '💵 Wallet',
                        value: economyUser.balance.toLocaleString(),
                        inline: true
                    },
                    {
                        name: '🏦 Bank',
                        value: economyUser.bank.toLocaleString(),
                        inline: true
                    },
                    {
                        name: '📊 Net Worth',
                        value: economyUser.netWorth.toLocaleString(),
                        inline: true
                    }
                ],
                thumbnail: {
                    url: targetUser.displayAvatarURL()
                }
            };

            // Add stats if checking own balance
            if (targetUser.id === interaction.user.id) {
                embed.fields.push(
                    {
                        name: '📈 Statistics',
                        value: `**Total Earned:** ${economyUser.totalEarned.toLocaleString()}\n**Total Spent:** ${economyUser.totalSpent.toLocaleString()}\n**Highest Balance:** ${economyUser.stats.highestBalance.toLocaleString()}`,
                        inline: false
                    },
                    {
                        name: '🎯 Achievements',
                        value: `${economyUser.achievements.length} unlocked`,
                        inline: true
                    },
                    {
                        name: '📦 Inventory',
                        value: `${economyUser.inventory.length} different items`,
                        inline: true
                    }
                );

                // Add streaks
                const streakInfo = [];
                if (economyUser.stats.dailyStreak > 0) {
                    streakInfo.push(`🔥 Daily: ${economyUser.stats.dailyStreak}`);
                }
                if (economyUser.stats.weeklyStreak > 0) {
                    streakInfo.push(`📅 Weekly: ${economyUser.stats.weeklyStreak}`);
                }
                if (economyUser.stats.monthlyStreak > 0) {
                    streakInfo.push(`🗓️ Monthly: ${economyUser.stats.monthlyStreak}`);
                }

                if (streakInfo.length > 0) {
                    embed.fields.push({
                        name: '🔥 Streaks',
                        value: streakInfo.join(' • '),
                        inline: false
                    });
                }

                // Add recent transactions
                const recentTransactions = economyUser.getTransactionHistory(5);
                if (recentTransactions.length > 0) {
                    const transactionList = recentTransactions.map(t => {
                        const icon = t.type === 'EARN' ? '💰' : 
                                     t.type === 'SPEND' ? '💸' : 
                                     t.type === 'TRANSFER' ? '🔄' : '📋';
                        return `${icon} ${t.description} (${t.amount > 0 ? '+' : ''}${t.amount.toLocaleString()})`;
                    }).join('\n');

                    embed.fields.push({
                        name: '📋 Recent Transactions',
                        value: transactionList,
                        inline: false
                    });
                }
            }

            // Add footer
            embed.footer = {
                text: `Economy System • ${new Date().toLocaleDateString()}`
            };

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error checking balance:', error);
            await interaction.editReply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to fetch balance. Please try again.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }
    }
};
