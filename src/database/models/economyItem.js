const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const EconomyItem = sequelize.define('EconomyItem', {
    itemID: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING(50) },
    rarity: { type: DataTypes.STRING(30), defaultValue: 'common' },
    emoji: { type: DataTypes.STRING(10), defaultValue: '📦' },
    color: { type: DataTypes.STRING(10), defaultValue: '#FFFFFF' },
    image: { type: DataTypes.TEXT },
    basePrice: { type: DataTypes.BIGINT, defaultValue: 0 },
    sellPrice: { type: DataTypes.BIGINT },
    tradeable: { type: DataTypes.BOOLEAN, defaultValue: true },
    stackable: { type: DataTypes.BOOLEAN, defaultValue: true },
    maxStack: { type: DataTypes.INTEGER, defaultValue: 99 },
    properties: { type: DataTypes.JSON, defaultValue: {} },
    requirements: { type: DataTypes.JSON, defaultValue: {} },
    shop: { type: DataTypes.JSON, defaultValue: { available: true, stock: -1 } },
    market: { type: DataTypes.JSON, defaultValue: { totalSold: 0, totalBought: 0, avgPrice: 0, priceHistory: [] } },
    metadata: { type: DataTypes.JSON, defaultValue: {} },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'economy_item' });

addMongooseCompat(EconomyItem);

// Instance methods
EconomyItem.prototype.isInStock = function() {
    const s = this.shop || {};
    return s.stock === -1 || s.stock > 0;
};

EconomyItem.prototype.purchase = async function(quantity = 1) {
    const s = this.shop || { available: true, stock: -1 };
    if (!s.available) throw new Error('Item is not available for purchase');
    if (!this.isInStock()) throw new Error('Item is out of stock');
    if (s.stock !== -1) s.stock -= quantity;
    const m = this.market || { totalBought: 0, totalSold: 0 };
    m.totalBought = (m.totalBought || 0) + quantity;
    this.shop = s;
    this.market = m;
    return this.save();
};

EconomyItem.prototype.sell = async function(quantity = 1, price = null) {
    const m = this.market || { totalSold: 0 };
    m.totalSold = (m.totalSold || 0) + quantity;
    this.market = m;
    return this.save();
};

// Static methods
EconomyItem.getByCategory = function(category, active = true) {
    return EconomyItem.findAll({ where: { category, active, deleted: false } });
};

EconomyItem.getByRarity = function(rarity, active = true) {
    return EconomyItem.findAll({ where: { rarity, active, deleted: false } });
};

EconomyItem.getShopItems = function() {
    return EconomyItem.findAll({ where: { active: true, deleted: false } });
};

EconomyItem.createDefaultItems = async function() {
    const defaults = [
        { itemID: 'coin_bag_small', name: 'Small Coin Bag', description: 'A small bag of coins', category: 'consumable', rarity: 'common', emoji: '💰', basePrice: 100, properties: { effect: 'balance_boost', multiplier: 0.1 } },
        { itemID: 'lucky_clover', name: 'Lucky Clover', description: 'Brings good luck', category: 'consumable', rarity: 'uncommon', emoji: '🍀', basePrice: 500, properties: { effect: 'lucky_boost', strength: 5 } },
        { itemID: 'work_gloves', name: 'Work Gloves', description: 'Improve work efficiency', category: 'tool', rarity: 'common', emoji: '🧤', basePrice: 200 },
        { itemID: 'diamond_sword', name: 'Diamond Sword', description: 'Legendary sword', category: 'weapon', rarity: 'legendary', emoji: '⚔️', basePrice: 5000 },
    ];
    for (const item of defaults) {
        const exists = await EconomyItem.findOne({ where: { itemID: item.itemID } });
        if (!exists) await EconomyItem.create(item);
    }
};

module.exports = EconomyItem;
