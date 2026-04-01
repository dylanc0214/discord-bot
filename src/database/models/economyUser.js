const { Sequelize, Op } = require('sequelize');
const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const EconomyUser = sequelize.define('EconomyUser', {
    guildID: { type: DataTypes.STRING(32), allowNull: false },
    userID: { type: DataTypes.STRING(32), allowNull: false },
    username: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Unknown' },
    balance: { type: DataTypes.BIGINT, defaultValue: 0 },
    bank: { type: DataTypes.BIGINT, defaultValue: 0 },
    totalEarned: { type: DataTypes.BIGINT, defaultValue: 0 },
    totalSpent: { type: DataTypes.BIGINT, defaultValue: 0 },
    inventory: { type: DataTypes.JSON, defaultValue: [] },
    stats: { type: DataTypes.JSON, defaultValue: {} },
    settings: { type: DataTypes.JSON, defaultValue: {} },
    achievements: { type: DataTypes.JSON, defaultValue: [] },
    transactions: { type: DataTypes.JSON, defaultValue: [] },
    cooldowns: { type: DataTypes.JSON, defaultValue: {} },
    preferences: { type: DataTypes.JSON, defaultValue: {} },
}, {
    tableName: 'economy_users',
    indexes: [{ unique: true, fields: ['guildID', 'userID'] }]
});

// Add basic mongoose compat
addMongooseCompat(EconomyUser);

// Instance methods
EconomyUser.prototype.addMoney = async function(amount, type, description, metadata = {}) {
    this.balance = BigInt(this.balance) + BigInt(amount);
    this.totalEarned = BigInt(this.totalEarned) + BigInt(amount);
    const txns = Array.isArray(this.transactions) ? this.transactions : [];
    txns.push({ type, amount: Number(amount), description, balance: Number(this.balance) + Number(this.bank), timestamp: new Date(), metadata });
    if (txns.length > 100) txns.splice(0, txns.length - 100);
    this.transactions = txns;
    return this.save();
};

EconomyUser.prototype.removeMoney = async function(amount, type, description, metadata = {}) {
    if (BigInt(this.balance) < BigInt(amount)) throw new Error('Insufficient balance');
    this.balance = BigInt(this.balance) - BigInt(amount);
    this.totalSpent = BigInt(this.totalSpent) + BigInt(amount);
    const txns = Array.isArray(this.transactions) ? this.transactions : [];
    txns.push({ type, amount: -Number(amount), description, balance: Number(this.balance) + Number(this.bank), timestamp: new Date(), metadata });
    if (txns.length > 100) txns.splice(0, txns.length - 100);
    this.transactions = txns;
    return this.save();
};

EconomyUser.prototype.addItem = async function(itemID, quantity = 1, acquiredFrom = 'unknown', metadata = {}) {
    const inv = Array.isArray(this.inventory) ? this.inventory : [];
    const existing = inv.find(i => i.itemID === itemID);
    if (existing) { existing.quantity += quantity; } 
    else { inv.push({ itemID, quantity, acquiredFrom, acquiredAt: new Date(), metadata }); }
    this.inventory = inv;
    const s = this.stats || {};
    s.itemsPurchased = (s.itemsPurchased || 0) + quantity;
    this.stats = s;
    return this.save();
};

EconomyUser.prototype.removeItem = async function(itemID, quantity = 1) {
    const inv = Array.isArray(this.inventory) ? this.inventory : [];
    const idx = inv.findIndex(i => i.itemID === itemID);
    if (idx === -1) throw new Error('Item not found in inventory');
    if (inv[idx].quantity < quantity) throw new Error('Insufficient item quantity');
    if (inv[idx].quantity === quantity) { inv.splice(idx, 1); }
    else { inv[idx].quantity -= quantity; }
    this.inventory = inv;
    return this.save();
};

EconomyUser.prototype.canClaimDaily = function() {
    const cd = this.cooldowns || {};
    if (!cd.daily) return true;
    const now = new Date(), last = new Date(cd.daily);
    return now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
};

EconomyUser.prototype.canClaimWeekly = function() {
    const cd = this.cooldowns || {};
    if (!cd.weekly) return true;
    return (new Date() - new Date(cd.weekly)) / (1000 * 60 * 60 * 24 * 7) >= 1;
};

EconomyUser.prototype.canClaimMonthly = function() {
    const cd = this.cooldowns || {};
    if (!cd.monthly) return true;
    const now = new Date(), last = new Date(cd.monthly);
    return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
};

EconomyUser.prototype.updateCooldown = function(type, duration = null) {
    const cd = this.cooldowns || {};
    cd[type] = duration ? new Date(Date.now() + duration) : new Date();
    this.cooldowns = cd;
    return this.save();
};

EconomyUser.prototype.getTransactionHistory = function(limit = 10, type = null) {
    let txns = Array.isArray(this.transactions) ? this.transactions : [];
    if (type) txns = txns.filter(t => t.type === type);
    return txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
};

// Virtual totalBalance getter
Object.defineProperty(EconomyUser.prototype, 'totalBalance', {
    get() { return Number(this.balance) + Number(this.bank); }
});

// Static methods
EconomyUser.getOrCreateUser = async function(guildID, userID, username) {
    let [user, created] = await EconomyUser.findOrCreate({
        where: { guildID, userID },
        defaults: { guildID, userID, username }
    });
    if (!created && user.username !== username) {
        user.username = username;
        await user.save();
    }
    return user;
};

EconomyUser.getLeaderboard = async function(guildID, type = 'balance', limit = 10) {
    const order = type === 'total' ? [['balance', 'DESC']] : [[type, 'DESC']];
    return EconomyUser.findAll({ where: { guildID }, order, limit });
};

EconomyUser.getGuildStats = async function(guildID) {
    const users = await EconomyUser.findAll({ where: { guildID } });
    if (!users.length) return { totalUsers: 0, totalBalance: 0, totalBank: 0, totalEarned: 0, totalSpent: 0, avgBalance: 0, richestUser: 0, totalItems: 0 };
    const totalUsers = users.length;
    const totalBalance = users.reduce((s, u) => s + Number(u.balance), 0);
    const totalBank = users.reduce((s, u) => s + Number(u.bank), 0);
    const totalEarned = users.reduce((s, u) => s + Number(u.totalEarned), 0);
    const totalSpent = users.reduce((s, u) => s + Number(u.totalSpent), 0);
    return { totalUsers, totalBalance, totalBank, totalEarned, totalSpent, avgBalance: totalBalance / totalUsers, richestUser: Math.max(...users.map(u => Number(u.balance))), totalItems: users.reduce((s, u) => s + (Array.isArray(u.inventory) ? u.inventory.length : 0), 0) };
};

module.exports = EconomyUser;
