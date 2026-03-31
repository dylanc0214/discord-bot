/**
 * REST API Server
 * External API endpoints for third-party integrations
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.API_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/v1', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API versioning
const API_VERSION = 'v1';

// API key validation middleware
async function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
        return res.status(401).json({
            error: 'API key required',
            message: 'Please provide an API key in the X-API-Key header or api_key parameter'
        });
    }
    
    try {
        const ApiKey = require('../database/models/apiKey');
        const keyData = await ApiKey.findOne({ key: apiKey, active: true });
        
        if (!keyData) {
            return res.status(401).json({
                error: 'Invalid API key',
                message: 'The provided API key is invalid or has been deactivated'
            });
        }
        
        // Check rate limits for this key
        const keyLimiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: keyData.rateLimit || 60,
            keyGenerator: () => apiKey,
            message: {
                error: 'Rate limit exceeded for this API key',
                retryAfter: 60
            }
        });
        
        // Apply key-specific rate limiting
        await new Promise((resolve, reject) => {
            keyLimiter(req, res, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        
        // Attach key data to request
        req.apiKey = keyData;
        
        // Update usage statistics
        keyData.usage.requests += 1;
        keyData.usage.lastUsed = new Date();
        await keyData.save();
        
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to validate API key'
        });
    }
}

// Guild access validation middleware
async function validateGuildAccess(req, res, next) {
    const guildId = req.params.guildId;
    
    if (!guildId) {
        return res.status(400).json({
            error: 'Guild ID required',
            message: 'Please provide a guild ID in the URL parameters'
        });
    }
    
    try {
        // Check if API key has access to this guild
        if (!req.apiKey.guilds.includes(guildId) && !req.apiKey.global) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'This API key does not have access to the specified guild'
            });
        }
        
        // Check if bot is in the guild
        const client = require('../bot');
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({
                error: 'Guild not found',
                message: 'The bot is not in the specified guild'
            });
        }
        
        req.guild = guild;
        next();
    } catch (error) {
        console.error('Guild access validation error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to validate guild access'
        });
    }
}

// Error handling middleware
function errorHandler(err, req, res, next) {
    console.error('API Error:', err);
    
    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            message: err.message,
            details: Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }))
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

// API Routes
app.get(`/api/${API_VERSION}/health`, (req, res) => {
    res.json({
        status: 'healthy',
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get(`/api/${API_VERSION}/info`, validateApiKey, (req, res) => {
    res.json({
        api: {
            version: API_VERSION,
            name: 'Only-NONE Bot API',
            description: 'REST API for Only-NONE Discord bot',
            documentation: `${req.protocol}://${req.get('host')}/api/${API_VERSION}/docs`
        },
        key: {
            id: req.apiKey.id,
            name: req.apiKey.name,
            permissions: req.apiKey.permissions,
            rateLimit: req.apiKey.rateLimit,
            usage: req.apiKey.usage
        }
    });
});

// User endpoints
app.get(`/api/${API_VERSION}/users/:userId`, validateApiKey, async (req, res) => {
    try {
        const { userId } = req.params;
        const client = require('../bot');
        
        // Try to fetch user from cache or API
        let user = client.users.cache.get(userId);
        if (!user) {
            user = await client.users.fetch(userId).catch(() => null);
        }
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user could not be found'
            });
        }
        
        // Get user's guilds where bot is present
        const userGuilds = [];
        for (const guild of client.guilds.cache.values()) {
            const member = guild.members.cache.get(userId);
            if (member) {
                userGuilds.push({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL(),
                    permissions: member.permissions.bitfield,
                    joinedAt: member.joinedAt,
                    roles: member.roles.cache.map(r => ({
                        id: r.id,
                        name: r.name,
                        color: r.color,
                        position: r.position
                    }))
                });
            }
        }
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                avatar: user.displayAvatarURL(),
                bot: user.bot,
                createdAt: user.createdAt
            },
            guilds: userGuilds
        });
    } catch (error) {
        next(error);
    }
});

// Guild endpoints
app.get(`/api/${API_VERSION}/guilds`, validateApiKey, (req, res) => {
    try {
        const client = require('../bot');
        const guilds = [];
        
        for (const guild of client.guilds.cache.values()) {
            // Filter guilds based on API key permissions
            if (!req.apiKey.global && !req.apiKey.guilds.includes(guild.id)) {
                continue;
            }
            
            guilds.push({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                owner: guild.ownerId,
                memberCount: guild.memberCount,
                createdAt: guild.createdAt,
                features: guild.features,
                description: guild.description,
                banner: guild.bannerURL(),
                splash: guild.splashURL()
            });
        }
        
        res.json({
            guilds,
            total: guilds.length
        });
    } catch (error) {
        next(error);
    }
});

app.get(`/api/${API_VERSION}/guilds/:guildId`, validateApiKey, validateGuildAccess, async (req, res) => {
    try {
        const guild = req.guild;
        
        // Get detailed guild information
        const guildInfo = {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            owner: guild.ownerId,
            memberCount: guild.memberCount,
            createdAt: guild.createdAt,
            features: guild.features,
            description: guild.description,
            banner: guild.bannerURL(),
            splash: guild.splashURL(),
            vanityURL: guild.vanityURLCode,
            verificationLevel: guild.verificationLevel,
            nsfwLevel: guild.nsfwLevel,
            boostCount: guild.premiumSubscriptionCount,
            boostTier: guild.premiumTier
        };
        
        // Get channels
        const channels = guild.channels.cache.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            parentId: channel.parentId,
            position: channel.position,
            topic: channel.topic,
            nsfw: channel.nsfw,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            rateLimitPerUser: channel.rateLimitPerUser
        }));
        
        // Get roles
        const roles = guild.roles.cache.map(role => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
            permissions: role.permissions.bitfield,
            managed: role.managed,
            hoist: role.hoist,
            mentionable: role.mentionable
        }));
        
        // Get emojis
        const emojis = guild.emojis.cache.map(emoji => ({
            id: emoji.id,
            name: emoji.name,
            animated: emoji.animated,
            available: emoji.available
        }));
        
        res.json({
            guild: guildInfo,
            channels,
            roles,
            emojis
        });
    } catch (error) {
        next(error);
    }
});

app.get(`/api/${API_VERSION}/guilds/:guildId/members`, validateApiKey, validateGuildAccess, async (req, res) => {
    try {
        const guild = req.guild;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const search = req.query.search;
        const filter = req.query.filter;
        
        // Fetch all members
        await guild.members.fetch();
        
        let members = Array.from(guild.members.cache.values());
        
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            members = members.filter(member => 
                member.user.username.toLowerCase().includes(searchLower) ||
                member.displayName.toLowerCase().includes(searchLower)
            );
        }
        
        if (filter) {
            switch (filter) {
                case 'bots':
                    members = members.filter(member => member.user.bot);
                    break;
                case 'humans':
                    members = members.filter(member => !member.user.bot);
                    break;
                case 'online':
                    members = members.filter(member => member.presence?.status === 'online');
                    break;
            }
        }
        
        // Pagination
        const total = members.length;
        const pages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedMembers = members.slice(offset, offset + limit);
        
        const memberData = paginatedMembers.map(member => ({
            id: member.id,
            user: {
                id: member.user.id,
                username: member.user.username,
                discriminator: member.user.discriminator,
                avatar: member.user.displayAvatarURL(),
                bot: member.user.bot
            },
            guildMember: {
                nick: member.nickname,
                joinedAt: member.joinedAt,
                premiumSince: member.premiumSince,
                roles: member.roles.cache.map(r => r.id),
                permissions: member.permissions.bitfield,
                pending: member.pending
            },
            presence: {
                status: member.presence?.status || 'offline',
                activities: member.presence?.activities?.map(a => ({
                    name: a.name,
                    type: a.type,
                    url: a.url
                })) || []
            }
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
        next(error);
    }
});

// Economy endpoints
app.get(`/api/${API_VERSION}/guilds/:guildId/economy/users`, validateApiKey, validateGuildAccess, async (req, res) => {
    try {
        const EconomyUser = require('../database/models/economyUser');
        
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const sort = req.query.sort || 'balance';
        const order = req.query.order || 'desc';
        
        const sortOrder = order === 'desc' ? -1 : 1;
        const sortField = sort === 'totalBalance' ? 'totalBalance' : 'balance';
        
        const users = await EconomyUser.find({ guildID: req.guild.id })
            .sort({ [sortField]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('userID username balance bank totalBalance stats achievements inventory');
        
        const total = await EconomyUser.countDocuments({ guildID: req.guild.id });
        
        res.json({
            users: users.map(user => ({
                id: user.userID,
                username: user.username,
                balance: user.balance,
                bank: user.bank,
                totalBalance: user.totalBalance,
                stats: user.stats,
                achievements: user.achievements,
                inventory: user.inventory
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

app.get(`/api/${API_VERSION}/guilds/:guildId/economy/user/:userId`, validateApiKey, validateGuildAccess, async (req, res) => {
    try {
        const EconomyUser = require('../database/models/economyUser');
        const { userId } = req.params;
        
        const user = await EconomyUser.findOne({ 
            guildID: req.guild.id, 
            userID: userId 
        });
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user does not have an economy account'
            });
        }
        
        res.json({
            user: {
                id: user.userID,
                username: user.username,
                balance: user.balance,
                bank: user.bank,
                totalBalance: user.totalBalance,
                totalEarned: user.totalEarned,
                totalSpent: user.totalSpent,
                stats: user.stats,
                achievements: user.achievements,
                inventory: user.inventory,
                transactions: user.getTransactionHistory(10),
                settings: user.settings
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post(`/api/${API_VERSION}/guilds/:guildId/economy/user/:userId/balance`, validateApiKey, validateGuildAccess, async (req, res) => {
    try {
        // Check if API key has economy permissions
        if (!req.apiKey.permissions.includes('economy')) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: 'This API key does not have economy permissions'
            });
        }
        
        const EconomyUser = require('../database/models/economyUser');
        const { userId } = req.params;
        const { amount, type, reason } = req.body;
        
        if (!amount || !type) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Amount and type are required'
            });
        }
        
        const user = await EconomyUser.findOne({ 
            guildID: req.guild.id, 
            userID: userId 
        });
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user does not have an economy account'
            });
        }
        
        let newBalance;
        if (type === 'add') {
            await user.addMoney(amount, 'API', reason || 'API balance adjustment');
            newBalance = user.totalBalance;
        } else if (type === 'remove') {
            await user.removeMoney(amount, 'API', reason || 'API balance adjustment');
            newBalance = user.totalBalance;
        } else {
            return res.status(400).json({
                error: 'Invalid type',
                message: 'Type must be either "add" or "remove"'
            });
        }
        
        res.json({
            success: true,
            newBalance,
            amount,
            type,
            reason: reason || 'API balance adjustment'
        });
    } catch (error) {
        next(error);
    }
});

// Moderation endpoints
app.get(`/api/${API_VERSION}/guilds/:guildId/moderation/cases`, validateApiKey, validateGuildAccess, async (req, res) => {
    try {
        // Check if API key has moderation permissions
        if (!req.apiKey.permissions.includes('moderation')) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: 'This API key does not have moderation permissions'
            });
        }
        
        const ModerationCases = require('../database/models/moderationCases');
        
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const type = req.query.type;
        const status = req.query.status;
        
        const query = { guildID: req.guild.id };
        
        if (type) query.caseType = type;
        if (status) query.status = status;
        
        const cases = await ModerationCases.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        const total = await ModerationCases.countDocuments(query);
        
        res.json({
            cases: cases.map(c => ({
                id: c._id,
                caseID: c.caseID,
                caseType: c.caseType,
                userID: c.userID,
                userTag: c.userTag,
                moderatorID: c.moderatorID,
                moderatorTag: c.moderatorTag,
                reason: c.reason,
                severity: c.severity,
                status: c.status,
                createdAt: c.createdAt,
                duration: c.duration,
                expiresAt: c.expiresAt,
                evidence: c.evidence,
                appeal: c.appeal
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

app.post(`/api/${API_VERSION}/guilds/:guildId/moderation/cases`, validateApiKey, validateGuildAccess, async (req, res) => {
    try {
        // Check if API key has moderation permissions
        if (!req.apiKey.permissions.includes('moderation')) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: 'This API key does not have moderation permissions'
            });
        }
        
        const ModerationCases = require('../database/models/moderationCases');
        
        const {
            caseType,
            userID,
            userTag,
            moderatorID,
            moderatorTag,
            reason,
            severity,
            duration,
            evidence
        } = req.body;
        
        if (!caseType || !userID || !userTag || !moderatorID || !moderatorTag || !reason) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'caseType, userID, userTag, moderatorID, moderatorTag, and reason are required'
            });
        }
        
        const caseID = await ModerationCases.getNextCaseID(req.guild.id);
        
        const moderationCase = new ModerationCases({
            guildID: req.guild.id,
            caseID,
            caseType,
            userID,
            userTag,
            moderatorID,
            moderatorTag,
            reason,
            severity: severity || 1,
            duration: duration || null,
            evidence: evidence || [],
            context: {
                automod: false,
                api: true
            }
        });
        
        await moderationCase.save();
        
        res.status(201).json({
            success: true,
            case: {
                id: moderationCase._id,
                caseID: moderationCase.caseID,
                caseType: moderationCase.caseType,
                userID: moderationCase.userID,
                userTag: moderationCase.userTag,
                moderatorID: moderationCase.moderatorID,
                moderatorTag: moderationCase.moderatorTag,
                reason: moderationCase.reason,
                severity: moderationCase.severity,
                createdAt: moderationCase.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
});

// API Documentation endpoint
app.get(`/api/${API_VERSION}/docs`, (req, res) => {
    res.json({
        title: 'Only-NONE Bot API Documentation',
        version: API_VERSION,
        baseUrl: `${req.protocol}://${req.get('host')}/api/${API_VERSION}`,
        authentication: {
            type: 'API Key',
            header: 'X-API-Key',
            parameter: 'api_key'
        },
        endpoints: {
            health: {
                method: 'GET',
                path: '/health',
                description: 'Check API health status',
                authentication: false
            },
            info: {
                method: 'GET',
                path: '/info',
                description: 'Get API and key information',
                authentication: true
            },
            users: {
                method: 'GET',
                path: '/users/{userId}',
                description: 'Get user information and guild memberships',
                authentication: true
            },
            guilds: {
                method: 'GET',
                path: '/guilds',
                description: 'Get list of guilds (filtered by API key permissions)',
                authentication: true
            },
            guild: {
                method: 'GET',
                path: '/guilds/{guildId}',
                description: 'Get detailed guild information',
                authentication: true
            },
            members: {
                method: 'GET',
                path: '/guilds/{guildId}/members',
                description: 'Get guild members with pagination and filtering',
                authentication: true,
                parameters: {
                    page: 'Page number (default: 1)',
                    limit: 'Results per page (max: 1000)',
                    search: 'Search by username or nickname',
                    filter: 'Filter by bots/humans/online'
                }
            },
            economyUsers: {
                method: 'GET',
                path: '/guilds/{guildId}/economy/users',
                description: 'Get economy users with pagination',
                authentication: true,
                permissions: ['economy']
            },
            economyUser: {
                method: 'GET',
                path: '/guilds/{guildId}/economy/user/{userId}',
                description: 'Get specific user economy data',
                authentication: true,
                permissions: ['economy']
            },
            updateBalance: {
                method: 'POST',
                path: '/guilds/{guildId}/economy/user/{userId}/balance',
                description: 'Update user balance',
                authentication: true,
                permissions: ['economy'],
                body: {
                    amount: 'number (required)',
                    type: 'string (add|remove, required)',
                    reason: 'string (optional)'
                }
            },
            moderationCases: {
                method: 'GET',
                path: '/guilds/{guildId}/moderation/cases',
                description: 'Get moderation cases',
                authentication: true,
                permissions: ['moderation'],
                parameters: {
                    page: 'Page number (default: 1)',
                    limit: 'Results per page (max: 100)',
                    type: 'Filter by case type',
                    status: 'Filter by case status'
                }
            },
            createCase: {
                method: 'POST',
                path: '/guilds/{guildId}/moderation/cases',
                description: 'Create a new moderation case',
                authentication: true,
                permissions: ['moderation'],
                body: {
                    caseType: 'string (required)',
                    userID: 'string (required)',
                    userTag: 'string (required)',
                    moderatorID: 'string (required)',
                    moderatorTag: 'string (required)',
                    reason: 'string (required)',
                    severity: 'number (optional)',
                    duration: 'number (optional)',
                    evidence: 'array (optional)'
                }
            }
        }
    });
});

// Apply error handling middleware
app.use(errorHandler);

// Export for use in main application
module.exports = app;
