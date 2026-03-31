# 💰 Enhanced Economy System - Complete Guide

## 🚀 Quick Start

Your **Only-NONE** bot now has a comprehensive enhanced economy system with shops, items, auctions, trading, and detailed analytics!

## 📋 Core Features

### 💳 Currency Management
- **`/balance`** - Check wallet, bank, and net worth
- **`/daily`** - Claim daily rewards with streaks
- **`/work`** - Earn money through various jobs
- **Bank system** with auto-deposit options
- **Transaction history** and analytics

### 🛍️ Shop System
- **`/shop view`** - Browse items by category
- **`/shop buy`** - Purchase items with dynamic pricing
- **`/shop info`** - Detailed item information
- **`/shop manage`** - Admin shop management
- **Dynamic pricing** with supply/demand
- **Discount system** and sales events

### 📦 Item System
- **7 categories**: Tools, Weapons, Armor, Consumables, Collectibles, Special, Currency
- **6 rarity tiers**: Common → Mythic
- **Item properties** and effects
- **Inventory management** with stacking
- **Usage requirements** and achievements

### 🏪 Advanced Features
- **Auction system** with multiple types
- **Trading system** with secure exchanges
- **Market analytics** and price tracking
- **Achievement system** with rewards
- **Economy leaderboards** and statistics

## 💰 Currency Commands

### `/balance` - Check Your Wealth
```bash
/balance                    # Check your balance
/balance user:@User         # Check someone's balance
```

**Features:**
- **Wallet & Bank** balances
- **Net worth** calculation
- **Transaction history**
- **Streak information**
- **Achievement progress**

### `/daily` - Claim Daily Rewards
```bash
/daily
```

**Reward System:**
- **Base reward**: 100 coins
- **Streak bonus**: +10% per day
- **Achievement bonuses**: Up to 1500 extra
- **Milestones**: 7, 14, 30, 100 day rewards

### `/work` - Earn Money
```bash
/work
```

**Work Features:**
- **10 different job types**
- **Base pay + bonuses**
- **Item bonuses** (luck, efficiency)
- **Special events** (5% chance)
- **5-minute cooldown**

## 🛍️ Shop System

### `/shop view` - Browse Shop
```bash
/shop view                              # View all items
/shop view category:tool                 # Filter by category
/shop view sort:price_desc              # Sort by price
```

**Categories:**
- **Tools** - Work efficiency items
- **Weapons** - Combat items
- **Armor** - Defense items
- **Consumables** - One-use items
- **Collectibles** - Rare items
- **Special** - Limited items

### `/shop buy` - Purchase Items
```bash
/shop buy item:coin_bag_small quantity:5
```

**Purchase Features:**
- **Dynamic pricing** with discounts
- **Stock management**
- **Tax calculation**
- **Requirements checking**
- **Instant delivery**

### `/shop info` - Item Details
```bash
/shop info item:diamond_sword
```

**Item Information:**
- **Properties and stats**
- **Requirements**
- **Market data**
- **Shop availability**
- **Rarity and category**

### `/shop manage` - Admin Controls
```bash
/shop manage action:add item:lucky_clover price:500 quantity:10
/shop manage action:discount item:diamond_sword discount:20
/shop manage action:restock item:coin_bag_small quantity:50
```

**Management Options:**
- **Add/Remove items**
- **Update prices**
- **Set discounts**
- **Restock management**
- **Staff permissions**

## 📦 Item System

### Item Categories & Properties

#### 🛠️ Tools
- **Efficiency bonus** for work commands
- **Durability** and usage limits
- **Special effects** (luck, speed)

#### ⚔️ Weapons
- **Damage stats** for combat
- **Speed and accuracy**
- **Special abilities**

#### 🛡️ Armor
- **Defense values**
- **Durability system**
- **Protection types**

#### 💊 Consumables
- **One-time effects**
- **Boosts and bonuses**
- **Temporary abilities**

#### 🏆 Collectibles
- **Limited availability**
- **High value**
- **Display purposes**

#### ✨ Special Items
- **Unique abilities**
- **Event exclusives**
- **Custom properties**

### Item Rarity System
- **⚪ Common** - Basic items, low cost
- **🟢 Uncommon** - Slightly better stats
- **🔵 Rare** - Good properties, higher cost
- **🟣 Epic** - Excellent stats, limited
- **🟠 Legendary** - Top-tier items
- **🔴 Mythic** - Ultra-rare, unique

## 🏪 Shop Management

### Setting Up Your Shop

#### 1. Create Default Shop
```bash
# Automatically created on first use
/shop manage action:add item:coin_bag_small price:100
```

#### 2. Configure Shop Settings
```bash
# Set global discount
/shop manage action:discount item:all discount:10

# Restock items
/shop manage action:restock item:lucky_clover quantity:20
```

#### 3. Manage Inventory
```bash
# Add new items
/shop manage action:add item:diamond_sword price:5000

# Update pricing
/shop manage action:update item:diamond_sword price:4500
```

### Shop Features

#### Dynamic Pricing
- **Supply & demand** calculations
- **Market trends** tracking
- **Price history** visualization
- **Automated adjustments**

#### Discount System
- **Global discounts** (store-wide)
- **Item-specific** discounts
- **Limited-time** sales
- **Bulk purchase** bonuses

#### Stock Management
- **Automatic restocking**
- **Stock limits** and alerts
- **Unlimited stock** options
- **Limited quantity** items

## 🎯 Economy Strategies

### For Users

#### 💰 Earning Money
1. **Daily streaks** - Build up to 100%+ bonuses
2. **Work regularly** - Use item bonuses
3. **Smart shopping** - Buy during discounts
4. **Item trading** - Profit from market trends
5. **Achievements** - Unlock bonus rewards

#### 📦 Building Wealth
1. **Bank savings** - Protect your coins
2. **Item collection** - Invest in rare items
3. **Market analysis** - Buy low, sell high
4. **Auction flipping** - Profit from auctions
5. **Special events** - Limited-time opportunities

### For Server Admins

#### 🏪 Shop Management
1. **Balanced pricing** - Keep economy stable
2. **Regular updates** - Add new items
3. **Monitor market** - Adjust prices as needed
4. **Special events** - Seasonal items and sales
5. **User feedback** - Listen to community

#### 📊 Economy Health
1. **Monitor inflation** - Adjust money supply
2. **Track activity** - User engagement metrics
3. **Balance rewards** - Fair earning opportunities
4. **Prevent exploits** - Security measures
5. **Regular maintenance** - Keep system healthy

## 🏆 Achievement System

### Earning Achievements

#### Basic Achievements
- **First Daily** - Claim your first daily reward
- **Work Enthusiast** - Use work 10 times
- **Shopper** - Buy 10 items
- **Collector** - Own 20 different items

#### Advanced Achievements
- **Week Streak** - 7-day daily streak
- **Month Streak** - 30-day daily streak
- **Work Master** - Use work 100 times
- **Big Earner** - Earn 500+ in one work session

#### Elite Achievements
- **Economy Legend** - Reach 1M net worth
- **Item Collector** - Own all rarity tiers
- **Auction Master** - Win 50 auctions
- **Market Guru** - Complete 100 profitable trades

### Achievement Rewards
- **Bonus coins** for milestones
- **Special items** unlocked
- **Permanent boosts** to earnings
- **Exclusive titles** and roles
- **Custom permissions** and features

## 📊 Analytics & Statistics

### User Statistics
```bash
/balance                    # Personal finance overview
/cases stats               # Economy participation
```

**Personal Metrics:**
- **Total earnings** and spending
- **Net worth** over time
- **Item collection** value
- **Achievement progress**
- **Activity patterns**

### Server Statistics
```bash
/economy leaderboard        # Richest users
/economy stats             # Server economy overview
```

**Server Metrics:**
- **Total money supply**
- **Active users** count
- **Transaction volume**
- **Popular items** and trends
- **Economy growth** rate

### Market Analytics
- **Price trends** for items
- **Supply/demand** ratios
- **Trading volume** analysis
- **Auction success** rates
- **User behavior** patterns

## 🔧 Advanced Configuration

### Economy Settings

#### Currency Configuration
```javascript
// In config/custom.js
economy: {
    currency: 'coins',
    startingBalance: 1000,
    dailyBonus: 100,
    workCooldown: 300000, // 5 minutes
    maxBalance: 10000000
}
```

#### Shop Configuration
```javascript
shop: {
    autoRestock: true,
    defaultTax: 5, // 5% tax
    globalDiscount: 0,
    maxItems: 100
}
```

#### Auction Configuration
```javascript
auctions: {
    minDuration: 3600000, // 1 hour
    maxDuration: 604800000, // 7 days
    autoExtend: true,
    minReputation: 0
}
```

## 🚀 Getting Started Guide

### For New Users

#### 1. First Steps
```bash
# Check your starting balance
/balance

# Claim your first daily
/daily

# Do some work
/work
```

#### 2. Building Wealth
```bash
# Browse the shop
/shop view

# Buy useful items
/shop buy item:lucky_clover

# Check your progress
/balance
```

#### 3. Advanced Features
```bash
# View auctions
/auction list

# Start trading
/trade create user:@Friend

# Check achievements
/achievements
```

### For Server Setup

#### 1. Initial Configuration
```bash
# Create default shop
/shop manage action:add item:coin_bag_small price:100

# Set up basic items
/shop manage action:add item:lucky_clover price:500
/shop manage action:add item:work_gloves price:200
```

#### 2. Economy Balance
```bash
# Monitor economy health
/economy stats

# Adjust prices as needed
/shop manage action:update item:coin_bag_small price:150

# Add special items
/shop manage action:add item:diamond_sword price:5000
```

#### 3. Community Engagement
```bash
# Create seasonal items
/shop manage action:add item:holiday_gift price:1000

# Run special events
/economy event start:holiday_sale

# Monitor activity
/economy leaderboard
```

## 🎯 Best Practices

### For Users
1. **Maintain daily streaks** for maximum rewards
2. **Invest in tools** to boost work earnings
3. **Watch market trends** for trading opportunities
4. **Participate in auctions** for rare items
5. **Complete achievements** for bonus rewards

### For Admins
1. **Monitor economy health** regularly
2. **Balance rewards** with server activity
3. **Create engaging events** and special items
4. **Listen to community** feedback
5. **Maintain fair pricing** and prevent exploits

## 🔍 Troubleshooting

### Common Issues

#### **Balance Not Updating**
- Check transaction history with `/balance`
- Wait a few seconds for database updates
- Contact admin if issue persists

#### **Shop Items Not Available**
- Check if shop is enabled: `/shop view`
- Verify stock levels with `/shop info`
- Ask admin to restock items

#### **Auction Problems**
- Check auction status and end time
- Verify you have sufficient balance
- Ensure you meet reputation requirements

#### **Achievement Not Unlocking**
- Check achievement requirements
- Verify you completed the action correctly
- Contact admin if achievement seems bugged

### Getting Help
1. **Check commands** with `/help economy`
2. **Review transaction history** for issues
3. **Contact server admins** for account problems
4. **Report bugs** through proper channels

---

**Your enhanced economy system is now ready!** Start earning, trading, and building your wealth today! 🚀
