const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    // User identification
    guildID: { type: String, required: true, index: true },
    userID: { type: String, required: true, index: true },
    username: { type: String, required: true }, // Cache username
    
    // Currency balances
    balance: { type: Number, default: 0, min: 0 },
    bank: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    
    // User inventory
    inventory: [{
        itemID: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        acquiredAt: { type: Date, default: Date.now },
        acquiredFrom: { type: String }, // How they got it (shop, trade, etc.)
        metadata: { type: mongoose.Schema.Types.Mixed } // Item-specific data
    }],
    
    // User stats and achievements
    stats: {
        messages: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        commandsUsed: { type: Number, default: 0 },
        dailyStreak: { type: Number, default: 0 },
        lastDaily: { type: Date, default: null },
        weeklyStreak: { type: Number, default: 0 },
        lastWeekly: { type: Date, default: null },
        monthlyStreak: { type: Number, default: 0 },
        lastMonthly: { type: Date, default: null },
        highestBalance: { type: Number, default: 0 },
        itemsPurchased: { type: Number, default: 0 },
        itemsSold: { type: Number, default: 0 },
        tradesCompleted: { type: Number, default: 0 },
        auctionsWon: { type: Number, default: 0 },
        auctionsCreated: { type: Number, default: 0 }
    },
    
    // Economy settings
    settings: {
        autoDeposit: { type: Boolean, default: false },
        depositThreshold: { type: Number, default: 1000 },
        tradeNotifications: { type: Boolean, default: true },
        auctionNotifications: { type: Boolean, default: true },
        publicInventory: { type: Boolean, default: true }
    },
    
    // Achievements and badges
    achievements: [{
        achievementID: { type: String, required: true },
        unlockedAt: { type: Date, default: Date.now },
        progress: { type: mongoose.Schema.Types.Mixed }
    }],
    
    // Transaction history (last 100 transactions)
    transactions: [{
        type: { 
            type: String, 
            enum: ['EARN', 'SPEND', 'TRANSFER', 'TRADE', 'AUCTION', 'DAILY', 'WEEKLY', 'MONTHLY', 'BONUS'],
            required: true 
        },
        amount: { type: Number, required: true },
        description: { type: String, required: true, maxlength: 200 },
        timestamp: { type: Date, default: Date.now },
        balance: { type: Number, required: }, // Balance after transaction
        relatedUser: { type: String }, // For transfers/trades
        relatedItem: { type: String }, // For item transactions
        metadata: { type: mongoose.Schema.Types.Mixed }
    }],
    
    // Cooldowns and limits
    cooldowns: {
        daily: { type: Date, default: null },
        weekly: { type: Date, default: null },
        monthly: { type: Date, default: null },
        work: { type: Date, default: null },
        crime: { type: Date, default: null },
        gamble: { type: Date, default: null },
        beg: { type: Date, default: null },
        rob: { type: Date, default: null }
    },
    
    // Economy preferences
    preferences: {
        currency: { type: String, default: 'coins' },
        notifications: { type: Boolean, default: true },
        privacy: { 
            type: String, 
            enum: ['public', 'friends', 'private'], 
            default: 'public' 
        }
    }
}, { 
    timestamps: true,
    // Ensure unique user per guild
    index: { guildID: 1, userID: 1 }, 
    unique: true 
});

// Virtual for total balance
schema.virtual('totalBalance').get(function() {
    return this.balance + this.bank;
});

// Virtual for net worth (includes items)
schema.virtual('netWorth').get(function() {
    return this.totalBalance; // TODO: Calculate item values
});

// Method to add money
schema.methods.addMoney = async function(amount, type, description, metadata = {}) {
    this.balance += amount;
    this.totalEarned += amount;
    
    // Update highest balance
    if (this.totalBalance > this.stats.highestBalance) {
        this.stats.highestBalance = this.totalBalance;
    }
    
    // Add transaction
    this.transactions.push({
        type,
        amount,
        description,
        balance: this.totalBalance,
        metadata
    });
    
    // Keep only last 100 transactions
    if (this.transactions.length > 100) {
        this.transactions = this.transactions.slice(-100);
    }
    
    return this.save();
};

// Method to remove money
schema.methods.removeMoney = async function(amount, type, description, metadata = {}) {
    if (this.balance < amount) {
        throw new Error('Insufficient balance');
    }
    
    this.balance -= amount;
    this.totalSpent += amount;
    
    // Add transaction
    this.transactions.push({
        type,
        amount: -amount,
        description,
        balance: this.totalBalance,
        metadata
    });
    
    // Keep only last 100 transactions
    if (this.transactions.length > 100) {
        this.transactions = this.transactions.slice(-100);
    }
    
    return this.save();
};

// Method to transfer money
schema.methods.transferMoney = async function(targetUserID, amount, description) {
    if (this.balance < amount) {
        throw new Error('Insufficient balance for transfer');
    }
    
    // Remove from sender
    await this.removeMoney(amount, 'TRANSFER', `Transfer to ${targetUserID}`, { targetUser: targetUserID });
    
    // Add to receiver (this would be called on their document)
    const EconomyUser = mongoose.model('EconomyUser');
    const targetUser = await EconomyUser.findOne({ guildID: this.guildID, userID: targetUserID });
    
    if (targetUser) {
        await targetUser.addMoney(amount, 'TRANSFER', `Transfer from ${this.userID}`, { sourceUser: this.userID });
    }
    
    return this.save();
};

// Method to add item to inventory
schema.methods.addItem = async function(itemID, quantity = 1, acquiredFrom = 'unknown', metadata = {}) {
    const existingItem = this.inventory.find(item => item.itemID === itemID);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        this.inventory.push({
            itemID,
            quantity,
            acquiredFrom,
            metadata
        });
    }
    
    this.stats.itemsPurchased += quantity;
    return this.save();
};

// Method to remove item from inventory
schema.methods.removeItem = async function(itemID, quantity = 1) {
    const itemIndex = this.inventory.findIndex(item => item.itemID === itemID);
    
    if (itemIndex === -1) {
        throw new Error('Item not found in inventory');
    }
    
    const item = this.inventory[itemIndex];
    
    if (item.quantity < quantity) {
        throw new Error('Insufficient item quantity');
    }
    
    if (item.quantity === quantity) {
        this.inventory.splice(itemIndex, 1);
    } else {
        item.quantity -= quantity;
    }
    
    this.stats.itemsSold += quantity;
    return this.save();
};

// Method to check if user can claim daily
schema.methods.canClaimDaily = function() {
    if (!this.cooldowns.daily) return true;
    
    const now = new Date();
    const lastDaily = new Date(this.cooldowns.daily);
    
    // Check if it's a new day
    return now.getDate() !== lastDaily.getDate() || 
           now.getMonth() !== lastDaily.getMonth() || 
           now.getFullYear() !== lastDaily.getFullYear();
};

// Method to check if user can claim weekly
schema.methods.canClaimWeekly = function() {
    if (!this.cooldowns.weekly) return true;
    
    const now = new Date();
    const lastWeekly = new Date(this.cooldowns.weekly);
    
    // Check if it's been at least 7 days
    const weekDiff = (now - lastWeekly) / (1000 * 60 * 60 * 24 * 7);
    return weekDiff >= 1;
};

// Method to check if user can claim monthly
schema.methods.canClaimMonthly = function() {
    if (!this.cooldowns.monthly) return true;
    
    const now = new Date();
    const lastMonthly = new Date(this.cooldowns.monthly);
    
    // Check if it's a new month
    return now.getMonth() !== lastMonthly.getMonth() || 
           now.getFullYear() !== lastMonthly.getFullYear();
};

// Method to update cooldown
schema.methods.updateCooldown = function(type, duration = null) {
    this.cooldowns[type] = duration ? new Date(Date.now() + duration) : new Date();
    return this.save();
};

// Method to get transaction history
schema.methods.getTransactionHistory = function(limit = 10, type = null) {
    let transactions = this.transactions;
    
    if (type) {
        transactions = transactions.filter(t => t.type === type);
    }
    
    return transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
};

// Method to check achievement
schema.methods.checkAchievement = function(achievementID, progress = null) {
    const existing = this.achievements.find(a => a.achievementID === achievementID);
    
    if (existing) {
        if (progress !== null) {
            existing.progress = progress;
        }
        return false; // Already unlocked
    }
    
    // Unlock new achievement
    this.achievements.push({
        achievementID,
        unlockedAt: new Date(),
        progress
    });
    
    return true; // Newly unlocked
};

// Static method to get or create user
schema.statics.getOrCreateUser = async function(guildID, userID, username) {
    let user = await this.findOne({ guildID, userID });
    
    if (!user) {
        user = await this.create({
            guildID,
            userID,
            username
        });
    } else if (user.username !== username) {
        // Update cached username
        user.username = username;
        await user.save();
    }
    
    return user;
};

// Static method to get leaderboard
schema.statics.getLeaderboard = async function(guildID, type = 'balance', limit = 10) {
    const sortField = type === 'total' ? 'totalBalance' : 'balance';
    
    return this.find({ guildID })
        .sort({ [sortField]: -1 })
        .limit(limit)
        .select('userID username balance bank totalBalance stats');
};

// Static method to get economy stats
schema.statics.getGuildStats = async function(guildID) {
    const stats = await this.aggregate([
        { $match: { guildID } },
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                totalBalance: { $sum: '$balance' },
                totalBank: { $sum: '$bank' },
                totalEarned: { $sum: '$totalEarned' },
                totalSpent: { $sum: '$totalSpent' },
                avgBalance: { $avg: '$balance' },
                richestUser: { $max: '$balance' },
                totalItems: { $sum: { $size: '$inventory' } }
            }
        }
    ]);
    
    return stats[0] || {
        totalUsers: 0,
        totalBalance: 0,
        totalBank: 0,
        totalEarned: 0,
        totalSpent: 0,
        avgBalance: 0,
        richestUser: 0,
        totalItems: 0
    };
};

module.exports = mongoose.model('EconomyUser', schema);
