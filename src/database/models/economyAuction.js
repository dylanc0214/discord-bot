const { sequelize, DataTypes, addMongooseCompat } = require('./modelHelper');

const EconomyAuction = sequelize.define('EconomyAuction', {
    auctionID: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    guildID: { type: DataTypes.STRING(32), allowNull: false },
    type: { type: DataTypes.STRING(30), defaultValue: 'standard' },
    item: { type: DataTypes.JSON },
    seller: { type: DataTypes.JSON },
    pricing: { type: DataTypes.JSON, defaultValue: { startingBid: 1, currentBid: 0, minimumIncrement: 1 } },
    timing: { type: DataTypes.JSON },
    bids: { type: DataTypes.JSON, defaultValue: [] },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    result: { type: DataTypes.JSON, defaultValue: {} },
    settings: { type: DataTypes.JSON, defaultValue: { public: true, allowBuyout: true } },
    stats: { type: DataTypes.JSON, defaultValue: { totalBids: 0, uniqueBidders: 0, viewCount: 0 } },
    metadata: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'economy_auction' });

addMongooseCompat(EconomyAuction);

// Virtuals
Object.defineProperty(EconomyAuction.prototype, 'timeRemaining', {
    get() { const t = this.timing || {}; return t.endTime ? new Date(t.endTime).getTime() - Date.now() : 0; }
});
Object.defineProperty(EconomyAuction.prototype, 'isActive', {
    get() { return this.status === 'active' && this.timeRemaining > 0; }
});
Object.defineProperty(EconomyAuction.prototype, 'highestBid', {
    get() { const b = this.bids || []; return b.length ? b.reduce((h, c) => c.amount > h.amount ? c : h) : null; }
});

// Instance methods
EconomyAuction.prototype.placeBid = async function(bidderID, bidderName, amount, isBuyout = false) {
    if (!this.isActive) throw new Error('Auction is not active');
    const seller = this.seller || {};
    if (bidderID === seller.userID) throw new Error('Seller cannot bid on their own auction');
    const pricing = this.pricing || { currentBid: 0, startingBid: 1, minimumIncrement: 1 };
    const minBid = pricing.currentBid > 0 ? pricing.currentBid + pricing.minimumIncrement : pricing.startingBid;
    if (amount < minBid && !isBuyout) throw new Error(`Minimum bid is ${minBid}`);
    const bids = Array.isArray(this.bids) ? this.bids : [];
    bids.push({ bidderID, bidderName, amount, timestamp: new Date(), isBuyout });
    pricing.currentBid = amount;
    this.bids = bids;
    this.pricing = pricing;
    const stats = this.stats || { totalBids: 0 };
    stats.totalBids = (stats.totalBids || 0) + 1;
    this.stats = stats;
    if (isBuyout) await this.endAuction('sold', 'Buyout price reached', bidderID);
    return this.save();
};

EconomyAuction.prototype.endAuction = async function(status, reason, endedBy = 'auto') {
    this.status = status;
    const highest = this.highestBid;
    const result = { endedAt: new Date(), endedBy, reason };
    if (status === 'sold' && highest) { result.winner = highest.bidderID; result.finalPrice = highest.amount; }
    this.result = result;
    return this.save();
};

EconomyAuction.prototype.canBid = function(userID) {
    if (!this.isActive) return { canBid: false, reason: 'Auction not active' };
    const seller = this.seller || {};
    if (userID === seller.userID) return { canBid: false, reason: 'Cannot bid on your own auction' };
    return { canBid: true };
};

// Static methods
EconomyAuction.createAuction = async function(auctionData) {
    const count = await EconomyAuction.count({ where: { guildID: auctionData.guildID } });
    const timing = auctionData.timing || { startTime: new Date(), duration: 3600000 };
    if (!timing.endTime) timing.endTime = new Date(new Date(timing.startTime).getTime() + timing.duration);
    return EconomyAuction.create({ ...auctionData, auctionID: `${auctionData.guildID}-${count + 1}`, timing });
};

EconomyAuction.getActiveAuctions = function(guildID) {
    return EconomyAuction.findAll({ where: { guildID, status: 'active' } });
};

EconomyAuction.getUserAuctions = function(guildID, userID) {
    return EconomyAuction.findAll({ where: { guildID } })
        .then(auctions => auctions.filter(a => (a.seller || {}).userID === userID));
};

EconomyAuction.getGuildStats = async function(guildID) {
    const auctions = await EconomyAuction.findAll({ where: { guildID } });
    return {
        totalAuctions: auctions.length,
        activeAuctions: auctions.filter(a => a.status === 'active').length,
        soldAuctions: auctions.filter(a => a.status === 'sold').length,
        totalValue: auctions.reduce((s, a) => s + ((a.result || {}).finalPrice || 0), 0)
    };
};

module.exports = EconomyAuction;
