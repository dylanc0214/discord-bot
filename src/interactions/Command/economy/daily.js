const { SlashCommandBuilder } = require('discord.js');
const EconomyUser = require('../../../database/models/economyUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward'),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            // Get or create economy user
            const economyUser = await EconomyUser.getOrCreateUser(
                interaction.guild.id,
                interaction.user.id,
                interaction.user.tag
            );

            // Check if user can claim daily
            if (!economyUser.canClaimDaily()) {
                const nextDaily = new Date();
                nextDaily.setHours(24, 0, 0, 0); // Set to midnight
                
                const timeUntil = nextDaily.getTime() - Date.now();
                const hours = Math.floor(timeUntil / (1000 * 60 * 60));
                const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

                return await interaction.editReply({
                    embeds: [{
                        title: '⏰ Daily Reward Not Available',
                        description: `You've already claimed your daily reward!\n\n**Next daily in:** ${hours}h ${minutes}m`,
                        color: client.config?.colors?.error || 0xED4245,
                        fields: [
                            {
                                name: '🔥 Current Streak',
                                value: `${economyUser.stats.dailyStreak} day${economyUser.stats.dailyStreak > 1 ? 's' : ''}`,
                                inline: true
                            }
                        ]
                    }]
                });
            }

            // Calculate daily reward
            let baseReward = 100;
            let streakBonus = 0;
            let achievementBonus = 0;
            let totalReward = baseReward;

            // Add streak bonus
            if (economyUser.stats.dailyStreak > 0) {
                streakBonus = Math.floor(baseReward * (economyUser.stats.dailyStreak * 0.1));
                totalReward += streakBonus;
            }

            // Add achievement bonuses
            const achievementBonuses = {
                'first_daily': 50,
                'week_streak': 200,
                'month_streak': 1000,
                'rich_user': 500
            };

            for (const [achievementID, bonus] of Object.entries(achievementBonuses)) {
                if (economyUser.achievements.some(a => a.achievementID === achievementID)) {
                    achievementBonus += bonus;
                    totalReward += bonus;
                }
            }

            // Update streak
            const now = new Date();
            const lastDaily = economyUser.cooldowns.daily;
            
            if (lastDaily) {
                const daysSinceLastDaily = Math.floor((now - lastDaily) / (1000 * 60 * 60 * 24));
                
                if (daysSinceLastDaily === 1) {
                    // Continued streak
                    economyUser.stats.dailyStreak += 1;
                } else {
                    // Streak broken
                    economyUser.stats.dailyStreak = 1;
                }
            } else {
                // First time claiming
                economyUser.stats.dailyStreak = 1;
            }

            economyUser.cooldowns.daily = now;

            // Check and unlock achievements
            const achievements = [];
            
            if (economyUser.stats.dailyStreak === 1) {
                if (economyUser.checkAchievement('first_daily')) {
                    achievements.push('🏆 First Daily - Unlocked!');
                }
            }
            
            if (economyUser.stats.dailyStreak === 7) {
                if (economyUser.checkAchievement('week_streak')) {
                    achievements.push('🏆 Week Streak - Unlocked!');
                }
            }
            
            if (economyUser.stats.dailyStreak === 30) {
                if (economyUser.checkAchievement('month_streak')) {
                    achievements.push('🏆 Month Streak - Unlocked!');
                }
            }

            // Add money to user
            await economyUser.addMoney(totalReward, 'DAILY', `Daily reward (Streak: ${economyUser.stats.dailyStreak})`, {
                streak: economyUser.stats.dailyStreak,
                baseReward,
                streakBonus,
                achievementBonus
            });

            // Create response embed
            const embed = {
                title: '🎉 Daily Reward Claimed!',
                description: `You've claimed your daily reward of **${totalReward.toLocaleString()}** ${economyUser.preferences.currency}!`,
                color: client.config?.colors?.success || 0x57F287,
                fields: [
                    {
                        name: '💰 Reward Breakdown',
                        value: `Base: ${baseReward.toLocaleString()}\nStreak Bonus: ${streakBonus.toLocaleString()}\nAchievement Bonus: ${achievementBonus.toLocaleString()}`,
                        inline: true
                    },
                    {
                        name: '🔥 Daily Streak',
                        value: `${economyUser.stats.dailyStreak} day${economyUser.stats.dailyStreak > 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '📊 New Balance',
                        value: economyUser.totalBalance.toLocaleString(),
                        inline: true
                    }
                ]
            };

            // Add achievements if any were unlocked
            if (achievements.length > 0) {
                embed.fields.push({
                    name: '🏆 New Achievements',
                    value: achievements.join('\n'),
                    inline: false
                });
            }

            // Add upcoming milestones
            const milestones = [
                { days: 7, reward: '200 bonus coins' },
                { days: 14, reward: '500 bonus coins' },
                { days: 30, reward: '1000 bonus coins' },
                { days: 100, reward: '5000 bonus coins' }
            ];

            const nextMilestone = milestones.find(m => m.days > economyUser.stats.dailyStreak);
            if (nextMilestone) {
                embed.fields.push({
                    name: '🎯 Next Milestone',
                    value: `${nextMilestone.days} days - ${nextMilestone.reward}`,
                    inline: false
                });
            }

            // Add streak warning
            if (economyUser.stats.dailyStreak > 0) {
                embed.fields.push({
                    name: '⚠️ Remember',
                    value: 'Come back tomorrow to keep your streak alive!',
                    inline: false
                });
            }

            embed.footer = {
                text: `Daily Reward • ${new Date().toLocaleDateString()}`
            };

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error claiming daily:', error);
            await interaction.editReply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to claim daily reward. Please try again.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }
    }
};
