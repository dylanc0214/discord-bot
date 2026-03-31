const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    // Shop identification
    shopID: { type: String, required: true, unique: true, index: true },
    guildID: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    
    // Shop configuration
    type: { 
        type: String, 
        required: true,
        enum: ['general', 'weapons', 'armor', 'tools', 'consumables', 'special', 'limited', 'seasonal'],
        default: 'general'
    },
    
    // Shop settings
    settings: {
        open: { type: Boolean, default: true },
        public: { type: Boolean, default: true },
        autoRestock: { type: Boolean, default: true },
        globalDiscount: { type: Number, min: 0, max: 100, default: 0 },
        tax: { type: Number, min: 0, max: 50, default: 0 }, // Sales tax percentage
        currency: { type: String, default: 'coins' }
    },
    
    // Shop items
    items: [{
        itemID: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, min: -1, default: -1 }, // -1 = unlimited
        maxStock: { type: Number, min: 0 },
        restockAmount: { type: Number, min: 0, default: 5 },
        restockInterval: { type: Number, min: 0, default: 3600000 }, // 1 hour in ms
        lastRestock: { type: Date, default: Date.now },
        discount: { type: Number, min: 0, max: 100, default: 0 },
        limited: { type: Boolean, default: false },
        limitedQuantity: { type: Number, min: 0 },
        expiresAt: { type: Date },
        requirements: {
            level: { type: Number, min: 0, default: 1 },
            rank: { type: String },
            achievements: [String]
        },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: String },
        sales: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 }
    }],
    
    // Shop owner and staff
    owner: { type: String, required: true }, // User ID
    staff: [{ type: String }], // User IDs who can manage shop
    
    // Shop statistics
    stats: {
        totalSales: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        totalCustomers: { type: Number, default: 0 },
        averageSale: { type: Number, default: 0 },
        mostPopularItem: { type: String },
        lastSale: { type: Date, default: null },
        dailySales: [{
            date: { type: Date, default: Date.now },
            sales: { type: Number, default: 0 },
            revenue: { type: Number, default: 0 },
            customers: { type: Number, default: 0 }
        }]
    },
    
    // Shop appearance
    appearance: {
        emoji: { type: String, default: '🏪' },
        color: { type: String, default: '#5865F2' },
        banner: { type: String }, // URL to banner image
        theme: { type: String, default: 'default' },
        layout: { type: String, enum: ['grid', 'list', 'compact'], default: 'grid' }
    },
    
    // Shop features
    features: {
        auctions: { type: Boolean, default: false },
        trades: { type: Boolean, default: true },
        wishlists: { type: Boolean, default: true },
        reviews: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true }
    },
    
    // Shop status
    status: {
        active: { type: Boolean, default: true },
        verified: { type: Boolean, default: false },
        featured: { type: Boolean, default: false },
        suspended: { type: Boolean, default: false },
        suspensionReason: { type: String }
    },
    
    // Metadata
    metadata: {
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        tags: [String],
        category: { type: String },
        description: { type: String, maxlength: 1000 }
    }
}, { 
    timestamps: true 
});

// Virtual for total items in shop
schema.virtual('totalItems').get(function() {
    return this.items.length;
});

// Virtual for items in stock
schema.virtual('itemsInStock').get(function() {
    return this.items.filter(item => item.stock === -1 || item.stock > 0).length;
});

// Virtual for shop rating (if reviews are enabled)
schema.virtual('rating').get(function() {
    // TODO: Calculate from reviews
    return 0;
});

// Method to add item to shop
schema.methods.addItem = async function(itemID, price, options = {}) {
    // Check if item already exists
    const existingItem = this.items.find(item => item.itemID === itemID);
    if (existingItem) {
        throw new Error('Item already exists in shop');
    }
    
    // Get item details
    const EconomyItem = mongoose.model('EconomyItem');
    const item = await EconomyItem.findOne({ itemID });
    
    if (!item) {
        throw new Error('Item not found');
    }
    
    const shopItem = {
        itemID,
        price,
        stock: options.stock || -1,
        maxStock: options.maxStock || 99,
        restockAmount: options.restockAmount || 5,
        restockInterval: options.restockInterval || 3600000,
        discount: options.discount || 0,
        limited: options.limited || false,
        limitedQuantity: options.limitedQuantity || 0,
        requirements: options.requirements || {},
        addedBy: options.addedBy,
        addedAt: new Date()
    };
    
    this.items.push(shopItem);
    return this.save();
};

// Method to remove item from shop
schema.methods.removeItem = async function(itemID) {
    const itemIndex = this.items.findIndex(item => item.itemID === itemID);
    
    if (itemIndex === -1) {
        throw new Error('Item not found in shop');
    }
    
    this.items.splice(itemIndex, 1);
    return this.save();
};

// Method to update item
schema.methods.updateItem = async function(itemID, updates) {
    const item = this.items.find(item => item.itemID === itemID);
    
    if (!item) {
        throw new Error('Item not found in shop');
    }
    
    Object.assign(item, updates);
    return this.save();
};

// Method to purchase item
schema.methods.purchaseItem = async function(itemID, quantity = 1, purchaserID) {
    const shopItem = this.items.find(item => item.itemID === itemID);
    
    if (!shopItem) {
        throw new Error('Item not found in shop');
    }
    
    if (!this.settings.open) {
        throw new Error('Shop is currently closed');
    }
    
    // Check stock
    if (shopItem.stock !== -1 && shopItem.stock < quantity) {
        throw new Error('Insufficient stock');
    }
    
    // Check limited quantity
    if (shopItem.limited && shopItem.limitedQuantity < quantity) {
        throw new Error('Insufficient limited quantity');
    }
    
    // Check expiration
    if (shopItem.expiresAt && new Date() > shopItem.expiresAt) {
        throw new Error('Item has expired');
    }
    
    // Calculate price with discounts
    let finalPrice = shopItem.price;
    if (shopItem.discount > 0) {
        finalPrice = Math.floor(finalPrice * (1 - shopItem.discount / 100));
    }
    if (this.settings.globalDiscount > 0) {
        finalPrice = Math.floor(finalPrice * (1 - this.settings.globalDiscount / 100));
    }
    
    // Add tax
    if (this.settings.tax > 0) {
        finalPrice = Math.floor(finalPrice * (1 + this.settings.tax / 100));
    }
    
    const totalPrice = finalPrice * quantity;
    
    // Update stock
    if (shopItem.stock !== -1) {
        shopItem.stock -= quantity;
    }
    
    if (shopItem.limited) {
        shopItem.limitedQuantity -= quantity;
    }
    
    // Update sales data
    shopItem.sales += quantity;
    shopItem.totalRevenue += totalPrice;
    
    // Update shop stats
    this.stats.totalSales += quantity;
    this.stats.totalRevenue += totalPrice;
    this.stats.lastSale = new Date();
    
    // Update daily stats
    const today = new Date().toDateString();
    const dailyStats = this.stats.dailySales.find(d => d.date.toDateString() === today);
    
    if (dailyStats) {
        dailyStats.sales += quantity;
        dailyStats.revenue += totalPrice;
        if (!dailyStats.customers.includes(purchaserID)) {
            dailyStats.customers.push(purchaserID);
        }
    } else {
        this.stats.dailySales.push({
            date: new Date(),
            sales: quantity,
            revenue: totalPrice,
            customers: [purchaserID]
        });
    }
    
    // Keep only last 30 days of daily stats
    if (this.stats.dailySales.length > 30) {
        this.stats.dailySales = this.stats.dailySales.slice(-30);
    }
    
    await this.save();
    
    return {
        item: shopItem,
        quantity,
        finalPrice,
        totalPrice
    };
};

// Method to restock items
schema.methods.restockItems = async function() {
    const now = new Date();
    let restockedCount = 0;
    
    for (const item of this.items) {
        if (item.stock === -1) continue; // Unlimited stock
        
        const timeSinceRestock = now - item.lastRestock;
        
        if (timeSinceRestock >= item.restockInterval) {
            const restockAmount = item.restockAmount;
            const newStock = item.maxStock ? Math.min(item.stock + restockAmount, item.maxStock) : item.stock + restockAmount;
            
            item.stock = newStock;
            item.lastRestock = now;
            restockedCount++;
        }
    }
    
    if (restockedCount > 0) {
        await this.save();
    }
    
    return restockedCount;
};

// Method to get shop items
schema.methods.getShopItems = function(filters = {}) {
    let items = this.items;
    
    // Apply filters
    if (filters.inStock) {
        items = items.filter(item => item.stock === -1 || item.stock > 0);
    }
    
    if (filters.limited) {
        items = items.filter(item => item.limited);
    }
    
    if (filters.discounted) {
        items = items.filter(item => item.discount > 0);
    }
    
    if (filters.category) {
        // Would need to join with EconomyItem to filter by category
        // For now, return all items
    }
    
    return items.sort((a, b) => {
        // Sort by popularity (sales) then by price
        if (b.sales !== a.sales) {
            return b.sales - a.sales;
        }
        return a.price - b.price;
    });
};

// Method to check if user can access shop
schema.methods.canAccess = function(user) {
    if (!this.settings.open) {
        return { canAccess: false, reason: 'Shop is closed' };
    }
    
    if (!this.settings.public && !this.staff.includes(user.userID) && user.userID !== this.owner) {
        return { canAccess: false, reason: 'Shop is private' };
    }
    
    return { canAccess: true };
};

// Method to add staff member
schema.methods.addStaff = async function(userID) {
    if (!this.staff.includes(userID)) {
        this.staff.push(userID);
        await this.save();
    }
    return this;
};

// Method to remove staff member
schema.methods.removeStaff = async function(userID) {
    const index = this.staff.indexOf(userID);
    if (index > -1) {
        this.staff.splice(index, 1);
        await this.save();
    }
    return this;
};

// Method to update shop settings
schema.methods.updateSettings = async function(settings) {
    Object.assign(this.settings, settings);
    this.metadata.updatedAt = new Date();
    return this.save();
};

// Static method to get shop by ID
schema.statics.getShop = async function(shopID) {
    return this.findOne({ shopID, 'status.active': true });
};

// Static method to get shops by guild
schema.statics.getGuildShops = async function(guildID, filters = {}) {
    const query = { guildID, 'status.active': true, ...filters };
    
    return this.find(query)
        .sort({ 'stats.totalRevenue': -1, name: 1 });
};

// Static method to get featured shops
schema.statics.getFeaturedShops = async function(limit = 10) {
    return this.find({ 
        'status.featured': true, 
        'status.active': true,
        'settings.open': true 
    })
    .sort({ 'stats.totalRevenue': -1 })
    .limit(limit);
};

// Static method to search shops
schema.statics.searchShops = async function(query, filters = {}) {
    const searchQuery = {
        'status.active': true,
        ...filters
    };
    
    if (query) {
        searchQuery.$or = [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { 'metadata.tags': { $regex: query, $options: 'i' } }
        ];
    }
    
    return this.find(searchQuery)
        .sort({ 'stats.totalRevenue': -1, name: 1 });
};

// Static method to create default shop
schema.statics.createDefaultShop = async function(guildID, ownerID) {
    const existingShop = await this.findOne({ guildID, shopID: 'default' });
    
    if (existingShop) {
        return existingShop;
    }
    
    return this.create({
        shopID: 'default',
        guildID,
        name: 'General Store',
        description: 'The default server shop with basic items',
        owner: ownerID,
        type: 'general'
    });
};

module.exports = mongoose.model('EconomyShop', schema);
