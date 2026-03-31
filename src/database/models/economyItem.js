const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    // Item identification
    itemID: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 500 },
    
    // Item categorization
    category: { 
        type: String, 
        required: true,
        enum: ['tool', 'weapon', 'armor', 'consumable', 'collectible', 'decoration', 'special', 'currency']
    },
    rarity: { 
        type: String, 
        required: true,
        enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
        default: 'common'
    },
    
    // Visual properties
    emoji: { type: String, default: '📦' },
    color: { type: String, default: '#FFFFFF' }, // Hex color for rarity
    image: { type: String }, // URL to item image
    
    // Economic properties
    basePrice: { type: Number, required: true, min: 0 },
    sellPrice: { type: Number, min: 0 },
    tradeable: { type: Boolean, default: true },
    stackable: { type: Boolean, default: true },
    maxStack: { type: Number, default: 99 },
    
    // Item functionality
    properties: {
        // Weapon properties
        damage: { type: Number, min: 0 },
        speed: { type: Number, min: 0 },
        accuracy: { type: Number, min: 0, max: 100 },
        
        // Armor properties
        defense: { type: Number, min: 0 },
        durability: { type: Number, min: 0 },
        
        // Tool properties
        efficiency: { type: Number, min: 0 },
        luck: { type: Number, min: 0 },
        
        // Consumable properties
        effect: { type: String },
        duration: { type: Number, min: 0 },
        strength: { type: Number, min: 0 },
        
        // Special properties
        bonus: { type: String },
        multiplier: { type: Number, default: 1 }
    },
    
    // Usage and requirements
    requirements: {
        level: { type: Number, min: 0, default: 1 },
        rank: { type: String },
        items: [{ itemID: String, quantity: Number }],
        currency: { type: Number, min: 0 },
        achievements: [String]
    },
    
    // Shop availability
    shop: {
        available: { type: Boolean, default: true },
        stock: { type: Number, min: -1, default: -1 }, // -1 = unlimited
        restockTime: { type: Number, min: 0 }, // Minutes between restocks
        lastRestock: { type: Date, default: Date.now },
        discount: { type: Number, min: 0, max: 100, default: 0 },
        limited: { type: Boolean, default: false },
        limitedQuantity: { type: Number, min: 0 },
        expiresAt: { type: Date }
    },
    
    // Market data
    market: {
        totalSold: { type: Number, default: 0 },
        totalBought: { type: Number, default: 0 },
        avgPrice: { type: Number, default: 0 },
        priceHistory: [{
            price: Number,
            timestamp: { type: Date, default: Date.now },
            volume: Number
        }],
        demand: { type: Number, default: 0 }, // 0-100 scale
        supply: { type: Number, default: 0 } // 0-100 scale
    },
    
    // Item metadata
    metadata: {
        creator: { type: String }, // User who created the item
        createdAt: { type: Date, default: Date.now },
        lore: { type: String, maxlength: 1000 },
        tags: [String],
        version: { type: String, default: '1.0.0' },
        seasonal: { type: Boolean, default: false },
        event: { type: String } // Associated event name
    },
    
    // Status and availability
    active: { type: Boolean, default: true },
    hidden: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false }
}, { 
    timestamps: true 
});

// Virtual for current price (with discounts)
schema.virtual('currentPrice').get(function() {
    if (this.shop.discount > 0) {
        return Math.floor(this.basePrice * (1 - this.shop.discount / 100));
    }
    return this.basePrice;
});

// Virtual for rarity color
schema.virtual('rarityColor').get(function() {
    const colors = {
        common: '#FFFFFF',
        uncommon: '#1EFF00',
        rare: '#0070DD',
        epic: '#A335EE',
        legendary: '#FF8000',
        mythic: '#E6CC80'
    };
    return colors[this.rarity] || '#FFFFFF';
});

// Virtual for formatted price
schema.virtual('formattedPrice').get(function() {
    return this.currentPrice.toLocaleString();
});

// Method to check if item is in stock
schema.methods.isInStock = function() {
    return this.shop.stock === -1 || this.shop.stock > 0;
};

// Method to purchase item
schema.methods.purchase = async function(quantity = 1) {
    if (!this.shop.available) {
        throw new Error('Item is not available for purchase');
    }
    
    if (!this.isInStock()) {
        throw new Error('Item is out of stock');
    }
    
    if (this.shop.limited && this.shop.limitedQuantity < quantity) {
        throw new Error('Not enough limited quantity available');
    }
    
    // Update stock
    if (this.shop.stock !== -1) {
        this.shop.stock -= quantity;
    }
    
    if (this.shop.limited) {
        this.shop.limitedQuantity -= quantity;
    }
    
    // Update market data
    this.market.totalBought += quantity;
    this.updateMarketData();
    
    return this.save();
};

// Method to sell item
schema.methods.sell = async function(quantity = 1, price = null) {
    const sellPrice = price || this.sellPrice || Math.floor(this.basePrice * 0.5);
    
    // Update market data
    this.market.totalSold += quantity;
    this.updateMarketData(sellPrice);
    
    return this.save();
};

// Method to update market data
schema.methods.updateMarketData = function(salePrice = null) {
    // Add to price history
    if (salePrice) {
        this.market.priceHistory.push({
            price: salePrice,
            timestamp: new Date(),
            volume: 1
        });
        
        // Keep only last 50 entries
        if (this.market.priceHistory.length > 50) {
            this.market.priceHistory = this.market.priceHistory.slice(-50);
        }
        
        // Update average price
        const total = this.market.priceHistory.reduce((sum, entry) => sum + entry.price, 0);
        this.market.avgPrice = Math.floor(total / this.market.priceHistory.length);
    }
    
    // Update supply/demand (simplified calculation)
    const recentActivity = this.market.priceHistory.slice(-10);
    const recentBuys = recentActivity.filter(p => p.price > 0).length;
    const recentSells = recentActivity.filter(p => p.price < 0).length;
    
    this.market.demand = Math.min(100, recentBuys * 10);
    this.market.supply = Math.min(100, recentSells * 10);
};

// Method to restock item
schema.methods.restock = function() {
    if (this.shop.stock === -1) return; // Unlimited stock
    
    const now = new Date();
    const timeSinceRestock = (now - this.shop.lastRestock) / (1000 * 60); // Minutes
    
    if (timeSinceRestock >= this.shop.restockTime) {
        const restockAmount = Math.floor(Math.random() * 10) + 5; // 5-15 items
        this.shop.stock = Math.min(this.shop.stock + restockAmount, 99);
        this.shop.lastRestock = now;
        
        return true;
    }
    
    return false;
};

// Method to check if user can use item
schema.methods.canUse = function(user) {
    // Check level requirement
    if (user.stats.level < this.requirements.level) {
        return { canUse: false, reason: `Requires level ${this.requirements.level}` };
    }
    
    // Check currency requirement
    if (user.totalBalance < this.requirements.currency) {
        return { canUse: false, reason: `Requires ${this.requirements.currency} coins` };
    }
    
    // Check item requirements
    for (const req of this.requirements.items) {
        const userItem = user.inventory.find(item => item.itemID === req.itemID);
        if (!userItem || userItem.quantity < req.quantity) {
            return { canUse: false, reason: `Requires ${req.quantity}x ${req.itemID}` };
        }
    }
    
    // Check achievement requirements
    for (const achievement of this.requirements.achievements) {
        const userAchievement = user.achievements.find(a => a.achievementID === achievement);
        if (!userAchievement) {
            return { canUse: false, reason: `Requires achievement: ${achievement}` };
        }
    }
    
    return { canUse: true };
};

// Method to apply item effect
schema.methods.applyEffect = async function(user) {
    switch (this.properties.effect) {
        case 'balance_boost':
            const boostAmount = Math.floor(user.balance * this.properties.multiplier);
            await user.addMoney(boostAmount, 'ITEM', `${this.name} boost`);
            return { success: true, message: `Gained ${boostAmount} coins from ${this.name}!` };
            
        case 'lucky_boost':
            user.stats.luck += this.properties.strength;
            await user.save();
            return { success: true, message: `Luck increased by ${this.properties.strength}!` };
            
        case 'work_bonus':
            // This would be handled in the work command
            return { success: true, message: `Work bonus ready for next use!` };
            
        default:
            return { success: false, message: 'Unknown item effect' };
    }
};

// Static method to get items by category
schema.statics.getByCategory = function(category, active = true) {
    return this.find({ category, active, deleted: false }).sort({ rarity: 1, name: 1 });
};

// Static method to get items by rarity
schema.statics.getByRarity = function(rarity, active = true) {
    return this.find({ rarity, active, deleted: false }).sort({ name: 1 });
};

// Static method to search items
schema.statics.searchItems = function(query, filters = {}) {
    const searchQuery = {
        active: true,
        deleted: false,
        ...filters
    };
    
    if (query) {
        searchQuery.$or = [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { 'metadata.tags': { $regex: query, $options: 'i' } }
        ];
    }
    
    return this.find(searchQuery).sort({ rarity: 1, name: 1 });
};

// Static method to get shop items
schema.statics.getShopItems = function(guildID = null) {
    const query = { 
        active: true, 
        deleted: false, 
        'shop.available': true 
    };
    
    return this.find(query)
        .sort({ rarity: 1, category: 1, name: 1 });
};

// Static method to create default items
schema.statics.createDefaultItems = async function() {
    const defaultItems = [
        {
            itemID: 'coin_bag_small',
            name: 'Small Coin Bag',
            description: 'A small bag containing some coins',
            category: 'consumable',
            rarity: 'common',
            emoji: '💰',
            basePrice: 100,
            properties: {
                effect: 'balance_boost',
                multiplier: 0.1,
                strength: 1.1
            }
        },
        {
            itemID: 'lucky_clover',
            name: 'Lucky Clover',
            description: 'A four-leaf clover that brings good luck',
            category: 'consumable',
            rarity: 'uncommon',
            emoji: '🍀',
            basePrice: 500,
            properties: {
                effect: 'lucky_boost',
                strength: 5
            }
        },
        {
            itemID: 'work_gloves',
            name: 'Work Gloves',
            description: 'Durable gloves that improve work efficiency',
            category: 'tool',
            rarity: 'common',
            emoji: '🧤',
            basePrice: 200,
            properties: {
                efficiency: 1.2,
                durability: 100
            }
        },
        {
            itemID: 'diamond_sword',
            name: 'Diamond Sword',
            description: 'A legendary sword forged with diamonds',
            category: 'weapon',
            rarity: 'legendary',
            emoji: '⚔️',
            basePrice: 5000,
            properties: {
                damage: 100,
                speed: 1.5,
                accuracy: 95
            }
        }
    ];
    
    for (const item of defaultItems) {
        const exists = await this.findOne({ itemID: item.itemID });
        if (!exists) {
            await this.create(item);
        }
    }
};

module.exports = mongoose.model('EconomyItem', schema);
