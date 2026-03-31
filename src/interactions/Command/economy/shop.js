const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EconomyUser = require('../../../database/models/economyUser');
const EconomyItem = require('../../../database/models/economyItem');
const EconomyShop = require('../../../database/models/economyShop');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View and manage the server shop')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the shop')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Filter by category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All Items', value: 'all' },
                            { name: 'Tools', value: 'tool' },
                            { name: 'Weapons', value: 'weapon' },
                            { name: 'Armor', value: 'armor' },
                            { name: 'Consumables', value: 'consumable' },
                            { name: 'Collectibles', value: 'collectible' },
                            { name: 'Special', value: 'special' }
                        ))
                .addStringOption(option =>
                    option.setName('sort')
                        .setDescription('Sort items by')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Price (Low to High)', value: 'price_asc' },
                            { name: 'Price (High to Low)', value: 'price_desc' },
                            { name: 'Rarity', value: 'rarity' },
                            { name: 'Name', value: 'name' },
                            { name: 'Popularity', value: 'popularity' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy an item from the shop')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to buy')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Quantity to buy')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(99)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get detailed information about an item')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to inspect')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('manage')
                .setDescription('Manage the shop (Admin only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Management action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add Item', value: 'add' },
                            { name: 'Remove Item', value: 'remove' },
                            { name: 'Update Item', value: 'update' },
                            { name: 'Restock', value: 'restock' },
                            { name: 'Set Discount', value: 'discount' }
                        ))
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item ID')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Item price')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Stock quantity')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('discount')
                        .setDescription('Discount percentage (0-100)')
                        .setRequired(false))),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'view':
                await handleView(interaction, client);
                break;
            case 'buy':
                await handleBuy(interaction, client);
                break;
            case 'info':
                await handleInfo(interaction, client);
                break;
            case 'manage':
                await handleManage(interaction, client);
                break;
        }
    }
};

// Handle viewing the shop
async function handleView(interaction, client) {
    await interaction.deferReply();

    const category = interaction.options.getString('category') || 'all';
    const sortBy = interaction.options.getString('sort') || 'price_asc';

    try {
        // Get or create default shop
        let shop = await EconomyShop.getShop('default');
        if (!shop) {
            shop = await EconomyShop.createDefaultShop(interaction.guild.id, interaction.user.id);
        }

        // Get shop items
        let shopItems = shop.getShopItems({ inStock: true });

        // Filter by category
        if (category !== 'all') {
            const itemIDs = shopItems.map(item => item.itemID);
            const categoryItems = await EconomyItem.find({ 
                itemID: { $in: itemIDs }, 
                category,
                active: true,
                deleted: false 
            });
            
            const categoryItemIDs = categoryItems.map(item => item.itemID);
            shopItems = shopItems.filter(item => categoryItemIDs.includes(item.itemID));
        }

        // Get full item details
        const itemIDs = shopItems.map(item => item.itemID);
        const items = await EconomyItem.find({ 
            itemID: { $in: itemIDs },
            active: true,
            deleted: false 
        });

        // Combine shop and item data
        const fullItems = shopItems.map(shopItem => {
            const item = items.find(i => i.itemID === shopItem.itemID);
            return { ...shopItem.toObject(), ...item?.toObject() };
        });

        // Sort items
        fullItems.sort((a, b) => {
            switch (sortBy) {
                case 'price_asc':
                    return a.price - b.price;
                case 'price_desc':
                    return b.price - a.price;
                case 'rarity':
                    const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
                    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'popularity':
                    return b.sales - a.sales;
                default:
                    return a.price - b.price;
            }
        });

        if (fullItems.length === 0) {
            return await interaction.editReply({
                embeds: [{
                    title: '🏪 Shop',
                    description: category === 'all' ? 'No items available in the shop.' : `No ${category} items available.`,
                    color: client.config?.colors?.normal || 0x5865F2
                }]
            });
        }

        // Create shop embed
        const embed = {
            title: '🏪 Server Shop',
            description: `Browse our selection of items!\n\n**Category:** ${category.charAt(0).toUpperCase() + category.slice(1)}\n**Sort:** ${sortBy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            color: client.config?.colors?.normal || 0x5865F2,
            fields: []
        };

        // Add items (limit to 25 for Discord limits)
        const displayItems = fullItems.slice(0, 25);
        
        for (const item of displayItems) {
            const stock = item.stock === -1 ? '∞' : item.stock;
            const discount = item.discount > 0 ? ` (${item.discount}% off)` : '';
            
            const fieldValue = `${item.emoji} **${item.name}**\n💰 ${item.price.toLocaleString()}${discount}\n📦 Stock: ${stock}\n${item.description.substring(0, 60)}${item.description.length > 60 ? '...' : ''}`;
            
            embed.fields.push({
                name: `${getRarityEmoji(item.rarity)} ${item.name}`,
                value: fieldValue,
                inline: false
            });
        }

        if (fullItems.length > 25) {
            embed.footer = {
                text: `Showing 25 of ${fullItems.length} items • Use /shop buy to purchase`
            };
        } else {
            embed.footer = {
                text: `Total items: ${fullItems.length} • Use /shop buy to purchase`
            };
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error viewing shop:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to load shop. Please try again.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle buying items
async function handleBuy(interaction, client) {
    await interaction.deferReply();

    const itemID = interaction.options.getString('item');
    const quantity = interaction.options.getInteger('quantity') || 1;

    try {
        // Get user
        const economyUser = await EconomyUser.getOrCreateUser(
            interaction.guild.id,
            interaction.user.id,
            interaction.user.tag
        );

        // Get shop
        let shop = await EconomyShop.getShop('default');
        if (!shop) {
            shop = await EconomyShop.createDefaultShop(interaction.guild.id, interaction.user.id);
        }

        // Check if user can access shop
        const accessCheck = shop.canAccess(economyUser);
        if (!accessCheck.canAccess) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Access Denied',
                    description: accessCheck.reason,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Get item details
        const shopItem = shop.items.find(item => item.itemID === itemID);
        if (!shopItem) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Item Not Found',
                    description: 'This item is not available in the shop.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        const item = await EconomyItem.findOne({ itemID, active: true, deleted: false });
        if (!item) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Item Not Found',
                    description: 'This item does not exist.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Check stock
        if (shopItem.stock !== -1 && shopItem.stock < quantity) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Out of Stock',
                    description: `Only ${shopItem.stock} available, you tried to buy ${quantity}.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Check user requirements
        const canUse = item.canUse(economyUser);
        if (!canUse.canUse) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Requirements Not Met',
                    description: canUse.reason,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Calculate total cost
        let finalPrice = shopItem.price;
        if (shopItem.discount > 0) {
            finalPrice = Math.floor(finalPrice * (1 - shopItem.discount / 100));
        }
        if (shop.settings.globalDiscount > 0) {
            finalPrice = Math.floor(finalPrice * (1 - shop.settings.globalDiscount / 100));
        }
        if (shop.settings.tax > 0) {
            finalPrice = Math.floor(finalPrice * (1 + shop.settings.tax / 100));
        }

        const totalCost = finalPrice * quantity;

        // Check user balance
        if (economyUser.balance < totalCost) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Insufficient Balance',
                    description: `You need ${totalCost.toLocaleString()} ${economyUser.preferences.currency} but only have ${economyUser.balance.toLocaleString()}.`,
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Purchase the item
        const purchase = await shop.purchaseItem(itemID, quantity, interaction.user.id);

        // Remove money from user
        await economyUser.removeMoney(totalCost, 'SPEND', `Purchased ${quantity}x ${item.name}`, {
            itemID,
            quantity,
            finalPrice
        });

        // Add item to user inventory
        await economyUser.addItem(itemID, quantity, 'shop');

        // Create response embed
        const embed = {
            title: '✅ Purchase Successful!',
            description: `You purchased **${quantity}x ${item.name}** for **${totalCost.toLocaleString()}** ${economyUser.preferences.currency}!`,
            color: client.config?.colors?.success || 0x57F287,
            fields: [
                {
                    name: '📦 Item Received',
                    value: `${item.emoji} ${item.name}\n${item.description}`,
                    inline: true
                },
                {
                    name: '💰 Payment',
                    value: `Unit Price: ${finalPrice.toLocaleString()}\nQuantity: ${quantity}\nTotal: ${totalCost.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '💵 New Balance',
                    value: economyUser.balance.toLocaleString(),
                    inline: true
                }
            ]
        };

        // Add discount info if applicable
        const totalDiscount = (shopItem.discount || 0) + (shop.settings.globalDiscount || 0);
        if (totalDiscount > 0) {
            embed.fields.push({
                name: '🎉 Discount Applied',
                value: `You saved ${totalDiscount}% on this purchase!`,
                inline: false
            });
        }

        embed.footer = {
            text: `Shop Purchase • ${new Date().toLocaleDateString()}`
        };

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error buying item:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: error.message || 'Failed to purchase item. Please try again.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle item info
async function handleInfo(interaction, client) {
    await interaction.deferReply();

    const itemID = interaction.options.getString('item');

    try {
        const item = await EconomyItem.findOne({ itemID, active: true, deleted: false });
        
        if (!item) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Item Not Found',
                    description: 'This item does not exist.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        // Get shop info
        let shop = await EconomyShop.getShop('default');
        let shopItem = null;
        
        if (shop) {
            shopItem = shop.items.find(i => i.itemID === itemID);
        }

        const embed = {
            title: `${item.emoji} ${item.name}`,
            description: item.description,
            color: parseInt(item.rarityColor.replace('#', ''), 16),
            fields: [
                {
                    name: '📊 Information',
                    value: `**Category:** ${item.category}\n**Rarity:** ${item.rarity}\n**Stackable:** ${item.stackable ? 'Yes' : 'No'}\n**Tradeable:** ${item.tradeable ? 'Yes' : 'No'}`,
                    inline: true
                }
            ]
        };

        // Add shop information if available
        if (shopItem) {
            const stock = shopItem.stock === -1 ? '∞' : shopItem.stock;
            const discount = shopItem.discount > 0 ? ` (${shopItem.discount}% off)` : '';
            let finalPrice = shopItem.price;
            
            if (shopItem.discount > 0) {
                finalPrice = Math.floor(finalPrice * (1 - shopItem.discount / 100));
            }

            embed.fields.push({
                name: '🏪 Shop Information',
                value: `**Price:** ${shopItem.price.toLocaleString()}${discount}\n**Final Price:** ${finalPrice.toLocaleString()}\n**Stock:** ${stock}\n**Sold:** ${shopItem.sales}`,
                inline: true
            });
        }

        // Add properties if item has any
        const properties = [];
        if (item.properties.damage) properties.push(`Damage: ${item.properties.damage}`);
        if (item.properties.defense) properties.push(`Defense: ${item.properties.defense}`);
        if (item.properties.efficiency) properties.push(`Efficiency: ${item.properties.efficiency}`);
        if (item.properties.luck) properties.push(`Luck: ${item.properties.luck}`);
        if (item.properties.effect) properties.push(`Effect: ${item.properties.effect}`);
        if (item.properties.duration) properties.push(`Duration: ${item.properties.duration}s`);

        if (properties.length > 0) {
            embed.fields.push({
                name: '⚙️ Properties',
                value: properties.join('\n'),
                inline: false
            });
        }

        // Add requirements if any
        const requirements = [];
        if (item.requirements.level > 1) requirements.push(`Level: ${item.requirements.level}`);
        if (item.requirements.currency > 0) requirements.push(`Currency: ${item.requirements.currency}`);
        if (item.requirements.items.length > 0) {
            requirements.push(`Items: ${item.requirements.items.map(req => `${req.quantity}x ${req.itemID}`).join(', ')}`);
        }

        if (requirements.length > 0) {
            embed.fields.push({
                name: '🔒 Requirements',
                value: requirements.join('\n'),
                inline: false
            });
        }

        // Add market data if available
        if (item.market.totalSold > 0 || item.market.totalBought > 0) {
            embed.fields.push({
                name: '📈 Market Data',
                value: `**Sold:** ${item.market.totalSold}\n**Bought:** ${item.market.totalBought}\n**Avg Price:** ${item.market.avgPrice.toLocaleString()}\n**Demand:** ${item.market.demand}/100\n**Supply:** ${item.market.supply}/100`,
                inline: false
            });
        }

        embed.footer = {
            text: `Item ID: ${item.itemID} • ${new Date().toLocaleDateString()}`
        };

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error getting item info:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: 'Failed to fetch item information.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Handle shop management
async function handleManage(interaction, client) {
    await interaction.deferReply();

    const action = interaction.options.getString('action');
    const itemID = interaction.options.getString('item');
    const price = interaction.options.getInteger('price');
    const quantity = interaction.options.getInteger('quantity');
    const discount = interaction.options.getInteger('discount');

    try {
        // Get or create default shop
        let shop = await EconomyShop.getShop('default');
        if (!shop) {
            shop = await EconomyShop.createDefaultShop(interaction.guild.id, interaction.user.id);
        }

        // Check if user is owner or staff
        if (interaction.user.id !== shop.owner && !shop.staff.includes(interaction.user.id)) {
            return await interaction.editReply({
                embeds: [{
                    title: '❌ Access Denied',
                    description: 'You don\'t have permission to manage this shop.',
                    color: client.config?.colors?.error || 0xED4245
                }]
            });
        }

        switch (action) {
            case 'add':
                if (!itemID || !price) {
                    return await interaction.editReply({
                        embeds: [{
                            title: '❌ Missing Information',
                            description: 'Please provide both item ID and price to add an item.',
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }

                await shop.addItem(itemID, price, {
                    stock: quantity,
                    addedBy: interaction.user.id
                });

                await interaction.editReply({
                    embeds: [{
                        title: '✅ Item Added',
                        description: `Added ${itemID} to the shop for ${price.toLocaleString()} coins.`,
                        color: client.config?.colors?.success || 0x57F287
                    }]
                });
                break;

            case 'remove':
                if (!itemID) {
                    return await interaction.editReply({
                        embeds: [{
                            title: '❌ Missing Information',
                            description: 'Please provide an item ID to remove.',
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }

                await shop.removeItem(itemID);

                await interaction.editReply({
                    embeds: [{
                        title: '✅ Item Removed',
                        description: `Removed ${itemID} from the shop.`,
                        color: client.config?.colors?.success || 0x57F287
                    }]
                });
                break;

            case 'update':
                if (!itemID) {
                    return await interaction.editReply({
                        embeds: [{
                            title: '❌ Missing Information',
                            description: 'Please provide an item ID to update.',
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }

                const updates = {};
                if (price !== null) updates.price = price;
                if (quantity !== null) updates.stock = quantity;

                await shop.updateItem(itemID, updates);

                await interaction.editReply({
                    embeds: [{
                        title: '✅ Item Updated',
                        description: `Updated ${itemID} in the shop.`,
                        color: client.config?.colors?.success || 0x57F287
                    }]
                });
                break;

            case 'restock':
                if (!itemID) {
                    return await interaction.editReply({
                        embeds: [{
                            title: '❌ Missing Information',
                            description: 'Please provide an item ID to restock.',
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }

                await shop.updateItem(itemID, { 
                    stock: quantity || 99,
                    lastRestock: new Date()
                });

                await interaction.editReply({
                    embeds: [{
                        title: '✅ Item Restocked',
                        description: `Restocked ${itemID} to ${quantity || 99}.`,
                        color: client.config?.colors?.success || 0x57F287
                    }]
                });
                break;

            case 'discount':
                if (!itemID || discount === null) {
                    return await interaction.editReply({
                        embeds: [{
                            title: '❌ Missing Information',
                            description: 'Please provide both item ID and discount percentage.',
                            color: client.config?.colors?.error || 0xED4245
                        }]
                    });
                }

                await shop.updateItem(itemID, { discount });

                await interaction.editReply({
                    embeds: [{
                        title: '✅ Discount Applied',
                        description: `Set ${discount}% discount on ${itemID}.`,
                        color: client.config?.colors?.success || 0x57F287
                    }]
                });
                break;
        }

    } catch (error) {
        console.error('Error managing shop:', error);
        await interaction.editReply({
            embeds: [{
                title: '❌ Error',
                description: error.message || 'Failed to manage shop.',
                color: client.config?.colors?.error || 0xED4245
            }]
        });
    }
}

// Helper function to get rarity emoji
function getRarityEmoji(rarity) {
    const emojis = {
        common: '⚪',
        uncommon: '🟢',
        rare: '🔵',
        epic: '🟣',
        legendary: '🟠',
        mythic: '🔴'
    };
    return emojis[rarity] || '⚪';
}
