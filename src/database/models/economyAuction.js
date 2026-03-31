const mongoose = require('discord.js');

const schema = new mongoose.Schema({
    // Auction identification
    auctionID: { type: String, required: true, unique: true, index: true },
    guildID: { type: String, required: true, index: true },
    
    // Auction details
    type: { 
        type: String, 
        required: true,
        enum: ['standard', 'buyout', 'reverse', 'sealed'],
        default: 'standard'
    },
    
    // Item being auctioned
    item: {
        itemID: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        name: { type: String, required: true },
        description: { type: String, required: true },
        emoji: { type: String, default: '📦' },
        rarity: { type: String, required: true },
        image: { type: String }
    },
    
    // Auction creator
    seller: {
        userID: { type: String, required: true },
        username: { type: String, required: true }
    },
    
    // Auction pricing
    pricing: {
        startingBid: { type: Number, required: true, min: 1 },
        currentBid: { type: Number, default: 0 },
        minimumIncrement: { type: Number, default: 1, min: 1 },
        buyoutPrice: { type: Number, min: 1 }, // Optional instant buy price
        reservePrice: { type: Number, min: 1 } // Minimum price to sell
    },
    
    // Auction timing
    timing: {
        startTime: { type: Date, required: true, default: Date.now },
        duration: { type: Number, required: true, min: 60000 }, // 1 minute minimum
        endTime: { type: Date, required: true },
        autoExtend: { type: Boolean, default: true }, // Extend if bid in last minutes
        extendTime: { type: Number, default: 300000 }, // 5 minutes
        snipeProtection: { type: Number, default: 60000 } // 1 minute
    },
    
    // Bidding
    bids: [{
        bidderID: { type: String, required: true },
        bidderName: { type: String, required: true },
        amount: { type: Number, required: true, min: 1 },
        timestamp: { type: Date, default: Date.now },
        isBuyout: { type: Boolean, default: false },
        isSealed: { type: Boolean, default: false }
    }],
    
    // Auction status
    status: { 
        type: String, 
        required: true,
        enum: ['active', 'ended', 'cancelled', 'sold'],
        default: 'active'
    },
    
    // Auction result
    result: {
        winner: { type: String }, // User ID
        finalPrice: { type: Number },
        endedAt: { type: Date },
        endedBy: { type: String }, // User ID or 'auto'
        reason: { type: String } // Why it ended
    },
    
    // Auction settings
    settings: {
        public: { type: Boolean, default: true },
        allowBuyout: { type: Boolean, default: true },
        showBids: { type: Boolean, default: true },
        minReputation: { type: Number, default: 0 },
        maxBids: { type: Number, default: 0 }, // 0 = unlimited
        bidCooldown: { type: Number, default: 30000 } // 30 seconds
    },
    
    // Statistics
    stats: {
        totalBids: { type: Number, default: 0 },
        uniqueBidders: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        watchCount: { type: Number, default: 0 },
        averageBidIncrement: { type: Number, default: 0 }
    },
    
    // Metadata
    metadata: {
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        tags: [String],
        notes: { type: String, maxlength: 500 },
        featured: { type: Boolean, default: false }
    }
}, { 
    timestamps: true 
});

// Virtual for time remaining
schema.virtual('timeRemaining').get(function() {
    const now = new Date();
    const endTime = new Date(this.timing.endTime);
    return endTime.getTime() - now.getTime();
});

// Virtual for is active
schema.virtual('isActive').get(function() {
    return this.status === 'active' && this.timeRemaining > 0;
});

// Virtual for highest bid
schema.virtual('highestBid').get(function() {
    if (this.bids.length === 0) return null;
    return this.bids.reduce((highest, bid) => bid.amount > highest.amount ? bid : highest);
});

// Virtual for current winner
schema.virtual('currentWinner').get(function() {
    const highest = this.highestBid;
    return highest ? highest.bidderID : null;
});

// Method to place a bid
schema.methods.placeBid = async function(bidderID, bidderName, amount, isBuyout = false) {
    // Check if auction is active
    if (!this.isActive) {
        throw new Error('Auction is not active');
    }
    
    // Check if seller is bidding
    if (bidderID === this.seller.userID) {
        throw new Error('Seller cannot bid on their own auction');
    }
    
    // Check minimum bid
    const minBid = this.pricing.currentBid > 0 
        ? this.pricing.currentBid + this.pricing.minimumIncrement 
        : this.pricing.startingBid;
    
    if (amount < minBid && !isBuyout) {
        throw new Error(`Minimum bid is ${minBid.toLocaleString()}`);
    }
    
    // Check buyout
    if (this.pricing.buyoutPrice && amount >= this.pricing.buyoutPrice && !isBuyout) {
        return this.placeBid(bidderID, bidderName, this.pricing.buyoutPrice, true);
    }
    
    // Check bid cooldown
    const lastBid = this.bids
        .filter(bid => bid.bidderID === bidderID)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (lastBid && (Date.now() - lastBid.timestamp.getTime()) < this.settings.bidCooldown) {
        const cooldownLeft = Math.ceil((this.settings.bidCooldown - (Date.now() - lastBid.timestamp.getTime())) / 1000);
        throw new Error(`Please wait ${cooldownLeft} seconds before bidding again`);
    }
    
    // Check max bids
    if (this.settings.maxBids > 0) {
        const bidderBidCount = this.bids.filter(bid => bid.bidderID === bidderID).length;
        if (bidderBidCount >= this.settings.maxBids) {
            throw new Error(`Maximum bids per user reached (${this.settings.maxBids})`);
        }
    }
    
    // Add the bid
    this.bids.push({
        bidderID,
        bidderName,
        amount,
        timestamp: new Date(),
        isBuyout
    });
    
    // Update current bid
    this.pricing.currentBid = amount;
    
    // Update stats
    this.stats.totalBids++;
    if (!this.bids.some(bid => bid.bidderID === bidderID && bid.bidderID !== bidderID)) {
        this.stats.uniqueBidders++;
    }
    
    // Calculate average bid increment
    if (this.bids.length > 1) {
        const increments = [];
        for (let i = 1; i < this.bids.length; i++) {
            increments.push(this.bids[i].amount - this.bids[i-1].amount);
        }
        this.stats.averageBidIncrement = increments.reduce((sum, inc) => sum + inc, 0) / increments.length;
    }
    
    // Auto-extend if bid in last minutes
    if (this.timing.autoExtend && this.timeRemaining < this.timing.extendTime) {
        const newEndTime = new Date(this.timing.endTime.getTime() + this.timing.extendTime);
        this.timing.endTime = newEndTime;
    }
    
    // End auction if buyout
    if (isBuyout) {
        await this.endAuction('sold', 'Buyout price reached', bidderID);
    }
    
    this.metadata.updatedAt = new Date();
    return this.save();
};

// Method to end auction
schema.methods.endAuction = async function(status, reason, endedBy = 'auto') {
    this.status = status;
    this.result.endedAt = new Date();
    this.result.endedBy = endedBy;
    this.result.reason = reason;
    
    if (status === 'sold' && this.highestBid) {
        const winner = this.highestBid;
        this.result.winner = winner.bidderID;
        this.result.finalPrice = winner.amount;
    }
    
    this.metadata.updatedAt = new Date();
    return this.save();
};

// Method to cancel auction
schema.methods.cancelAuction = async function(reason, cancelledBy) {
    return this.endAuction('cancelled', reason, cancelledBy);
};

// Method to add watcher
schema.methods.addWatcher = async function(userID) {
    // This would be implemented with a separate watchers model
    this.stats.watchCount++;
    return this.save();
};

// Method to increment view count
schema.methods.incrementViews = async function() {
    this.stats.viewCount++;
    return this.save();
};

// Method to get bid history
schema.methods.getBidHistory = function(limit = 10) {
    return this.bids
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
};

// Method to check if user can bid
schema.methods.canBid = function(userID, userReputation = 0) {
    if (!this.isActive) {
        return { canBid: false, reason: 'Auction is not active' };
    }
    
    if (userID === this.seller.userID) {
        return { canBid: false, reason: 'Cannot bid on your own auction' };
    }
    
    if (userReputation < this.settings.minReputation) {
        return { canBid: false, reason: `Minimum reputation required: ${this.settings.minReputation}` };
    }
    
    return { canBid: true };
};

// Static method to create auction
schema.statics.createAuction = async function(auctionData) {
    const auction = new this(auctionData);
    
    // Set end time
    auction.timing.endTime = new Date(auction.timing.startTime.getTime() + auction.timing.duration);
    
    // Generate auction ID
    const count = await this.countDocuments({ guildID: auction.guildID });
    auction.auctionID = `${auction.guildID}-${count + 1}`;
    
    return auction.save();
};

// Static method to get active auctions
schema.statics.getActiveAuctions = function(guildID, filters = {}) {
    const query = { 
        guildID, 
        status: 'active',
        'timing.endTime': { $gt: new Date() }
    };
    
    if (filters.type) query.type = filters.type;
    if (filters.seller) query['seller.userID'] = filters.seller;
    if (filters.featured) query['metadata.featured'] = true;
    
    return this.find(query)
        .sort({ 'timing.endTime': 1 })
        .limit(25);
};

// Static method to get user's auctions
schema.statics.getUserAuctions = function(guildID, userID, includeEnded = false) {
    const query = { guildID, 'seller.userID': userID };
    
    if (!includeEnded) {
        query.status = 'active';
    }
    
    return this.find(query)
        .sort({ 'metadata.createdAt': -1 });
};

// Static method to search auctions
schema.statics.searchAuctions = function(guildID, query, filters = {}) {
    const searchQuery = {
        guildID,
        status: 'active',
        'timing.endTime': { $gt: new Date() },
        ...filters
    };
    
    if (query) {
        searchQuery.$or = [
            { 'item.name': { $regex: query, $options: 'i' } },
            { 'item.description': { $regex: query, $options: 'i' } },
            { 'metadata.tags': { $regex: query, $options: 'i' } }
        ];
    }
    
    return this.find(searchQuery)
        .sort({ 'timing.endTime': 1 })
        .limit(25);
};

// Static method to get auction statistics
schema.statics.getGuildStats = async function(guildID, timeRange = 7) {
    const since = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
    
    const stats = await this.aggregate([
        { $match: { guildID, 'metadata.createdAt': { $gte: since } } },
        {
            $group: {
                _id: null,
                totalAuctions: { $sum: 1 },
                activeAuctions: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                soldAuctions: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
                totalValue: { $sum: '$result.finalPrice' },
                averagePrice: { $avg: '$result.finalPrice' },
                totalBids: { $sum: '$stats.totalBids' },
                uniqueBidders: { $sum: '$stats.uniqueBidders' }
            }
        }
    ]);
    
    return stats[0] || {
        totalAuctions: 0,
        activeAuctions: 0,
        soldAuctions: 0,
        totalValue: 0,
        averagePrice: 0,
        totalBids: 0,
        uniqueBidders: 0
    };
};

module.exports = mongoose.model('EconomyAuction', schema);
