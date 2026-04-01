const { SlashCommandBuilder } = require('discord.js');
const EconomyUser = require('../../../database/models/economyUser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn money'),

    async execute(interaction, client) {

        try {
            // Get or create economy user
            const economyUser = await EconomyUser.getOrCreateUser(
                interaction.guild.id,
                interaction.user.id,
                interaction.user.tag
            );

            // Check cooldown
            const cooldownTime = 5 * 60 * 1000; // 5 minutes
            const now = Date.now();
            
            if (economyUser.cooldowns.work && economyUser.cooldowns.work.getTime() > now) {
                const timeLeft = economyUser.cooldowns.work.getTime() - now;
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                return await interaction.editReply({
                    embeds: [{
                        title: '⏰ Work Cooldown',
                        description: `You're still on a break! Come back in ${minutes}m ${seconds}s.`,
                        color: client.config?.colors?.error || 0xED4245
                    }]
                });
            }

            // Work scenarios and rewards
            const workScenarios = [
                {
                    name: 'Office Work',
                    description: 'You spent the day crunching numbers and organizing files.',
                    baseReward: 50,
                    maxBonus: 100,
                    emoji: '💼'
                },
                {
                    name: 'Delivery Driver',
                    description: 'You delivered packages across the city.',
                    baseReward: 75,
                    maxBonus: 125,
                    emoji: '🚚'
                },
                {
                    name: 'Freelance Project',
                    description: 'You completed a coding project for a client.',
                    baseReward: 100,
                    maxBonus: 200,
                    emoji: '💻'
                },
                {
                    name: 'Retail Assistant',
                    description: 'You helped customers at the local store.',
                    baseReward: 40,
                    maxBonus: 80,
                    emoji: '🏪'
                },
                {
                    name: 'Food Service',
                    description: 'You worked at a busy restaurant.',
                    baseReward: 60,
                    maxBonus: 120,
                    emoji: '🍔'
                },
                {
                    name: 'Landscaping',
                    description: 'You maintained gardens and lawns.',
                    baseReward: 55,
                    maxBonus: 110,
                    emoji: '🌳'
                },
                {
                    name: 'Tutoring',
                    description: 'You helped students with their homework.',
                    baseReward: 80,
                    maxBonus: 150,
                    emoji: '📚'
                },
                {
                    name: 'Pet Sitting',
                    description: 'You took care of adorable pets.',
                    baseReward: 45,
                    maxBonus: 90,
                    emoji: '🐕'
                },
                {
                    name: 'Event Setup',
                    description: 'You helped set up a community event.',
                    baseReward: 70,
                    maxBonus: 140,
                    emoji: '🎉'
                },
                {
                    name: 'Tech Support',
                    description: 'You fixed computer issues for people.',
                    baseReward: 90,
                    maxBonus: 180,
                    emoji: '🔧'
                }
            ];

            // Select random work scenario
            const scenario = workScenarios[Math.floor(Math.random() * workScenarios.length)];
            
            // Calculate earnings with bonuses
            let baseEarnings = scenario.baseReward;
            let bonusMultiplier = 1;
            let totalEarnings = baseEarnings;

            // Add luck bonus from items
            const luckItems = economyUser.inventory.filter(item => {
                // Check if item has luck property
                return item.itemID.includes('lucky') || item.itemID.includes('clover');
            });
            
            if (luckItems.length > 0) {
                bonusMultiplier += 0.1 * luckItems.length;
            }

            // Add efficiency bonus from tools
            const toolItems = economyUser.inventory.filter(item => {
                return item.itemID.includes('tool') || item.itemID.includes('gloves');
            });
            
            if (toolItems.length > 0) {
                bonusMultiplier += 0.05 * toolItems.length;
            }

            // Random bonus (10-50% extra)
            const randomBonus = Math.random() * 0.4 + 0.1; // 10% to 50%
            bonusMultiplier += randomBonus;

            // Apply bonuses
            totalEarnings = Math.floor(baseEarnings * bonusMultiplier);
            totalEarnings = Math.min(totalEarnings, scenario.maxBonus); // Cap at max

            // Special events (rare)
            let specialEvent = null;
            const eventRoll = Math.random();
            
            if (eventRoll < 0.05) { // 5% chance
                specialEvent = {
                    name: '💎 Big Client!',
                    description: 'A wealthy client was impressed by your work!',
                    bonus: Math.floor(totalEarnings * 2)
                };
                totalEarnings += specialEvent.bonus;
            } else if (eventRoll < 0.1) { // 5% chance
                specialEvent = {
                    name: '🎯 Perfect Performance!',
                    description: 'You did an exceptional job!',
                    bonus: Math.floor(totalEarnings * 0.5)
                };
                totalEarnings += specialEvent.bonus;
            }

            // Update cooldown
            economyUser.cooldowns.work = new Date(now + cooldownTime);
            
            // Update stats
            economyUser.stats.commandsUsed += 1;

            // Add money
            await economyUser.addMoney(totalEarnings, 'WORK', `${scenario.name} - ${scenario.description}`, {
                scenario: scenario.name,
                baseEarnings,
                bonusMultiplier,
                specialEvent: specialEvent?.name
            });

            // Check achievements
            const achievements = [];
            
            if (economyUser.stats.commandsUsed === 10) {
                if (economyUser.checkAchievement('work_enthusiast')) {
                    achievements.push('🏆 Work Enthusiast - 10 work commands!');
                }
            }
            
            if (economyUser.stats.commandsUsed === 100) {
                if (economyUser.checkAchievement('work_master')) {
                    achievements.push('🏆 Work Master - 100 work commands!');
                }
            }

            if (totalEarnings >= 500) {
                if (economyUser.checkAchievement('big_earner')) {
                    achievements.push('🏆 Big Earner - Earned 500+ in one work session!');
                }
            }

            // Create response embed
            const embed = {
                title: `${scenario.emoji} ${scenario.name}`,
                description: scenario.description,
                color: client.config?.colors?.success || 0x57F287,
                fields: [
                    {
                        name: '💰 Earnings',
                        value: `Base: ${baseEarnings.toLocaleString()}\nBonus: ${Math.floor(totalEarnings - baseEarnings).toLocaleString()}\n**Total: ${totalEarnings.toLocaleString()}**`,
                        inline: true
                    },
                    {
                        name: '📊 Stats',
                        value: `Multiplier: ${(bonusMultiplier * 100).toFixed(1)}%\nCommands Used: ${economyUser.stats.commandsUsed}`,
                        inline: true
                    },
                    {
                        name: '💵 New Balance',
                        value: economyUser.totalBalance.toLocaleString(),
                        inline: true
                    }
                ]
            };

            // Add special event if occurred
            if (specialEvent) {
                embed.fields.unshift({
                    name: specialEvent.name,
                    value: `${specialEvent.description}\n💰 Bonus: ${specialEvent.bonus.toLocaleString()}`,
                    inline: false
                });
            }

            // Add achievements if any were unlocked
            if (achievements.length > 0) {
                embed.fields.push({
                    name: '🏆 New Achievements',
                    value: achievements.join('\n'),
                    inline: false
                });
            }

            // Add cooldown info
            embed.fields.push({
                name: '⏰ Cooldown',
                value: `You can work again in 5 minutes`,
                inline: false
            });

            embed.footer = {
                text: `Work Command • ${new Date().toLocaleDateString()}`
            };

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in work command:', error);
            await interaction.editReply({
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to process work. Please try again.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }
    }
};
