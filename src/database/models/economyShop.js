const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const EconomyShop = sequelize.define('EconomyShop', {
    shopID: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    guildID: { type: DataTypes.STRING(32), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    type: { type: DataTypes.STRING(50), defaultValue: 'general' },
    settings: { type: DataTypes.JSON, defaultValue: { open: true, public: true, autoRestock: true, globalDiscount: 0, tax: 0, currency: 'coins' } },
    items: { type: DataTypes.JSON, defaultValue: [] },
    owner: { type: DataTypes.STRING(32) },
    staff: { type: DataTypes.JSON, defaultValue: [] },
    stats: { type: DataTypes.JSON, defaultValue: { totalSales: 0, totalRevenue: 0, totalCustomers: 0 } },
    appearance: { type: DataTypes.JSON, defaultValue: { emoji: '🏪', color: '#5865F2' } },
    features: { type: DataTypes.JSON, defaultValue: { auctions: false, trades: true } },
    status: { type: DataTypes.JSON, defaultValue: { active: true, verified: false, featured: false } },
    metadata: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'economy_shop' });

addMongooseCompat(EconomyShop);

// Instance methods
EconomyShop.prototype.addItem = async function(itemID, price, options = {}) {
    const items = Array.isArray(this.items) ? this.items : [];
    if (items.find(i => i.itemID === itemID)) throw new Error('Item already exists in shop');
    items.push({ itemID, price, stock: options.stock || -1, discount: options.discount || 0, limited: options.limited || false, addedAt: new Date(), addedBy: options.addedBy, sales: 0, totalRevenue: 0 });
    this.items = items;
    return this.save();
};

EconomyShop.prototype.removeItem = async function(itemID) {
    const items = Array.isArray(this.items) ? this.items : [];
    const idx = items.findIndex(i => i.itemID === itemID);
    if (idx === -1) throw new Error('Item not found in shop');
    items.splice(idx, 1);
    this.items = items;
    return this.save();
};

EconomyShop.prototype.purchaseItem = async function(itemID, quantity = 1) {
    const items = Array.isArray(this.items) ? this.items : [];
    const shopItem = items.find(i => i.itemID === itemID);
    if (!shopItem) throw new Error('Item not found in shop');
    const settings = this.settings || {};
    if (!settings.open) throw new Error('Shop is currently closed');
    if (shopItem.stock !== -1 && shopItem.stock < quantity) throw new Error('Insufficient stock');
    let finalPrice = shopItem.price;
    if (shopItem.discount > 0) finalPrice = Math.floor(finalPrice * (1 - shopItem.discount / 100));
    if (settings.globalDiscount > 0) finalPrice = Math.floor(finalPrice * (1 - settings.globalDiscount / 100));
    if (settings.tax > 0) finalPrice = Math.floor(finalPrice * (1 + settings.tax / 100));
    const totalPrice = finalPrice * quantity;
    if (shopItem.stock !== -1) shopItem.stock -= quantity;
    shopItem.sales = (shopItem.sales || 0) + quantity;
    shopItem.totalRevenue = (shopItem.totalRevenue || 0) + totalPrice;
    this.items = items;
    const stats = this.stats || {};
    stats.totalSales = (stats.totalSales || 0) + quantity;
    stats.totalRevenue = (stats.totalRevenue || 0) + totalPrice;
    this.stats = stats;
    await this.save();
    return { item: shopItem, quantity, finalPrice, totalPrice };
};

EconomyShop.prototype.getShopItems = function(filters = {}) {
    let items = Array.isArray(this.items) ? this.items : [];
    if (filters.inStock) items = items.filter(i => i.stock === -1 || i.stock > 0);
    if (filters.limited) items = items.filter(i => i.limited);
    return items;
};

EconomyShop.prototype.updateSettings = async function(settings) {
    Object.assign(this.settings || {}, settings);
    return this.save();
};

// Static methods
EconomyShop.getShop = async function(shopID) {
    return EconomyShop.findOne({ where: { shopID } });
};

EconomyShop.getGuildShops = async function(guildID) {
    return EconomyShop.findAll({ where: { guildID } });
};

EconomyShop.createDefaultShop = async function(guildID, ownerID) {
    const [shop] = await EconomyShop.findOrCreate({
        where: { shopID: 'default', guildID },
        defaults: { shopID: 'default', guildID, name: 'General Store', description: 'The default server shop', owner: ownerID || 'system', type: 'general' }
    });
    return shop;
};

module.exports = EconomyShop;
