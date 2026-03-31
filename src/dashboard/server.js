/**
 * Dashboard Web Server
 * Express server for bot administration and analytics
 */

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.DASHBOARD_URL || "http://localhost:3001",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Session configuration
app.use(session({
    secret: process.env.DASHBOARD_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Discord OAuth Strategy
passport.use(new Strategy({
    clientID: process.env.DISCORD_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET || process.env.DISCORD_TOKEN,
    callbackURL: process.env.DASHBOARD_CALLBACK_URL || "http://localhost:3001/auth/discord/callback",
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Get user's guilds
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const guilds = await guildsResponse.json();
        
        profile.guilds = guilds;
        return done(null, profile);
    } catch (error) {
        return done(error, null);
    }
}));

// Serialize/deserialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Authentication middleware
function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Admin middleware
function ensureAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    
    // Check if user is admin in any guild
    const isAdmin = req.user.guilds.some(guild => 
        guild.permissions & 0x8 || // Administrator permission
        guild.owner === true
    );
    
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// API Routes
app.get('/api/user', ensureAuth, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            discriminator: req.user.discriminator,
            avatar: req.user.avatar,
            guilds: req.user.guilds
        }
    });
});

app.get('/api/guilds', ensureAuth, (req, res) => {
    const managedGuilds = req.user.guilds.filter(guild => 
        guild.permissions & 0x8 || // Administrator
        guild.owner === true ||
        guild.permissions & 0x20 // Manage Guild
    );
    
    res.json({ guilds: managedGuilds });
});

// Guild-specific API routes
app.get('/api/guild/:guildId/stats', ensureAdmin, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = require('../../bot'); // Get bot client
        
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Check if user has permission for this guild
        const userGuild = req.user.guilds.find(g => g.id === guildId);
        if (!userGuild || !(userGuild.permissions & 0x8 || userGuild.owner === true)) {
            return res.status(403).json({ error: 'No permission for this guild' });
        }
        
        // Gather statistics
        const stats = {
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount,
                channelCount: guild.channels.cache.size,
                roleCount: guild.roles.cache.size,
                createdAt: guild.createdAt
            },
            members: {
                total: guild.memberCount,
                online: guild.members.cache.filter(m => m.presence?.status !== 'offline').size,
                bots: guild.members.cache.filter(m => m.user.bot).size,
                humans: guild.members.cache.filter(m => !m.user.bot).size
            },
            channels: {
                total: guild.channels.cache.size,
                text: guild.channels.cache.filter(c => c.type === 0).size,
                voice: guild.channels.cache.filter(c => c.type === 2).size,
                categories: guild.channels.cache.filter(c => c.type === 4).size
            },
            roles: {
                total: guild.roles.cache.size,
                managed: guild.roles.cache.filter(r => r.managed).size,
                custom: guild.roles.cache.filter(r => !r.managed).size
            }
        };
        
        // Get economy stats if available
        try {
            const EconomyUser = require('../database/models/economyUser');
            const economyStats = await EconomyUser.getGuildStats(guildId);
            stats.economy = economyStats;
        } catch (error) {
            console.log('Economy stats not available:', error.message);
        }
        
        // Get moderation stats if available
        try {
            const ModerationCases = require('../database/models/moderationCases');
            const modStats = await ModerationCases.getGuildStats(guildId, 30);
            stats.moderation = modStats;
        } catch (error) {
            console.log('Moderation stats not available:', error.message);
        }
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching guild stats:', error);
        res.status(500).json({ error: 'Failed to fetch guild statistics' });
    }
});

app.get('/api/guild/:guildId/members', ensureAdmin, async (req, res) => {
    try {
        const { guildId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        
        const client = require('../../bot');
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Check permissions
        const userGuild = req.user.guilds.find(g => g.id === guildId);
        if (!userGuild || !(userGuild.permissions & 0x8 || userGuild.owner === true)) {
            return res.status(403).json({ error: 'No permission for this guild' });
        }
        
        // Fetch members
        await guild.members.fetch();
        
        let members = guild.members.cache.array();
        
        // Filter out bots if requested
        if (req.query.bots !== 'true') {
            members = members.filter(m => !m.user.bot);
        }
        
        // Search functionality
        if (search) {
            members = members.filter(m => 
                m.user.username.toLowerCase().includes(search.toLowerCase()) ||
                m.user.displayName.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        // Sort
        const sortBy = req.query.sort || 'joinedAt';
        members.sort((a, b) => {
            switch (sortBy) {
                case 'username':
                    return a.user.username.localeCompare(b.user.username);
                case 'joinedAt':
                    return a.joinedAt - b.joinedAt;
                case 'id':
                    return a.user.id.localeCompare(b.user.id);
                default:
                    return a.joinedAt - b.joinedAt;
            }
        });
        
        // Pagination
        const total = members.length;
        const pages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedMembers = members.slice(offset, offset + limit);
        
        const memberData = paginatedMembers.map(member => ({
            id: member.id,
            username: member.user.username,
            displayName: member.displayName,
            discriminator: member.user.discriminator,
            avatar: member.user.displayAvatarURL(),
            status: member.presence?.status || 'offline',
            joinedAt: member.joinedAt,
            roles: member.roles.cache.map(r => ({
                id: r.id,
                name: r.name,
                color: r.color,
                position: r.position
            })).sort((a, b) => b.position - a.position),
            bot: member.user.bot
        }));
        
        res.json({
            members: memberData,
            pagination: {
                page,
                limit,
                total,
                pages,
                hasNext: page < pages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

app.get('/api/guild/:guildId/economy', ensureAdmin, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = require('../../bot');
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Check permissions
        const userGuild = req.user.guilds.find(g => g.id === guildId);
        if (!userGuild || !(userGuild.permissions & 0x8 || userGuild.owner === true)) {
            return res.status(403).json({ error: 'No permission for this guild' });
        }
        
        const EconomyUser = require('../database/models/economyUser');
        const EconomyItem = require('../database/models/economyItem');
        const EconomyShop = require('../database/models/economyShop');
        
        // Get economy stats
        const stats = await EconomyUser.getGuildStats(guildId);
        
        // Get leaderboard
        const leaderboard = await EconomyUser.getLeaderboard(guildId, 'balance', 10);
        
        // Get shop items
        const shop = await EconomyShop.getShop('default');
        let shopItems = [];
        if (shop) {
            const itemIDs = shop.items.map(item => item.itemID);
            const items = await EconomyItem.find({ itemID: { $in: itemIDs } });
            
            shopItems = shop.items.map(shopItem => {
                const item = items.find(i => i.itemID === shopItem.itemID);
                return {
                    ...shopItem.toObject(),
                    ...item?.toObject()
                };
            });
        }
        
        res.json({
            stats,
            leaderboard: leaderboard.map(user => ({
                userID: user.userID,
                username: user.username,
                balance: user.balance,
                bank: user.bank,
                totalBalance: user.totalBalance
            })),
            shop: {
                items: shopItems,
                totalItems: shopItems.length,
                inStock: shopItems.filter(item => item.stock === -1 || item.stock > 0).length
            }
        });
    } catch (error) {
        console.error('Error fetching economy data:', error);
        res.status(500).json({ error: 'Failed to fetch economy data' });
    }
});

app.get('/api/guild/:guildId/moderation', ensureAdmin, async (req, res) => {
    try {
        const { guildId } = req.params;
        const client = require('../../bot');
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Check permissions
        const userGuild = req.user.guilds.find(g => g.id === guildId);
        if (!userGuild || !(userGuild.permissions & 0x8 || userGuild.owner === true)) {
            return res.status(403).json({ error: 'No permission for this guild' });
        }
        
        const ModerationCases = require('../database/models/moderationCases');
        const ModerationSettings = require('../database/models/moderationSettings');
        
        // Get moderation stats
        const stats = await ModerationCases.getGuildStats(guildId, 30);
        
        // Get recent cases
        const recentCases = await ModerationCases.find({ guildID })
            .sort({ createdAt: -1 })
            .limit(20);
        
        // Get settings
        const settings = await ModerationSettings.getSettings(guildId);
        
        res.json({
            stats,
            recentCases: recentCases.map(c => ({
                caseID: c.caseID,
                caseType: c.caseType,
                userID: c.userID,
                userTag: c.userTag,
                moderatorTag: c.moderatorTag,
                reason: c.reason,
                severity: c.severity,
                createdAt: c.createdAt,
                status: c.status
            })),
            settings: {
                automodEnabled: settings.automod.enabled,
                loggingEnabled: settings.logging.enabled,
                totalRules: settings.automod.rules.length,
                activeRules: settings.automod.rules.filter(r => r.enabled).length
            }
        });
    } catch (error) {
        console.error('Error fetching moderation data:', error);
        res.status(500).json({ error: 'Failed to fetch moderation data' });
    }
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Dashboard client connected:', socket.id);
    
    socket.on('join-guild', (guildId) => {
        socket.join(`guild-${guildId}`);
        console.log(`Socket ${socket.id} joined guild ${guildId}`);
    });
    
    socket.on('leave-guild', (guildId) => {
        socket.leave(`guild-${guildId}`);
        console.log(`Socket ${socket.id} left guild ${guildId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('Dashboard client disconnected:', socket.id);
    });
});

// Function to broadcast updates to dashboard
function broadcastToGuild(guildId, event, data) {
    io.to(`guild-${guildId}`).emit(event, data);
}

// Export for use in other modules
module.exports = { app, server, io, broadcastToGuild };

// Start server
const PORT = process.env.DASHBOARD_PORT || 3001;
server.listen(PORT, () => {
    console.log(`🌐 Dashboard server running on port ${PORT}`);
    console.log(`📊 Dashboard URL: http://localhost:${PORT}`);
});
