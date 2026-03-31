const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    // Case identification
    guildID: { type: String, required: true, index: true },
    caseID: { type: Number, required: true, index: true },
    caseType: { 
        type: String, 
        required: true,
        enum: ['WARN', 'KICK', 'BAN', 'TEMPBAN', 'MUTE', 'TEMPMUTE', 'SOFTBAN', 'VMUTE', 'VDEAFEN', 'NOTE', 'UNBAN', 'UNMUTE']
    },
    
    // User information
    userID: { type: String, required: true, index: true },
    userTag: { type: String, required: true },
    
    // Moderator information
    moderatorID: { type: String, required: true, index: true },
    moderatorTag: { type: String, required: true },
    
    // Case details
    reason: { type: String, required: true, maxlength: 1000 },
    evidence: [{ 
        type: String,
        maxlength: 1000 
    }],
    
    // Timing information
    createdAt: { type: Date, default: Date.now, required: true },
    duration: { type: Number, default: null }, // Duration in milliseconds for temp actions
    expiresAt: { type: Date, default: null }, // When temp action expires
    
    // Status and resolution
    status: { 
        type: String, 
        default: 'ACTIVE',
        enum: ['ACTIVE', 'EXPIRED', 'APPEALED', 'PARDONED', 'OVERTURNED']
    },
    
    // Appeal information
    appeal: {
        requested: { type: Boolean, default: false },
        requestedAt: { type: Date, default: null },
        reason: { type: String, maxlength: 1000 },
        status: { 
            type: String, 
            default: 'NONE',
            enum: ['NONE', 'PENDING', 'APPROVED', 'DENIED']
        },
        reviewedBy: { type: String, default: null },
        reviewedAt: { type: Date, default: null },
        reviewReason: { type: String, maxlength: 1000 }
    },
    
    // Additional metadata
    context: {
        channelID: { type: String },
        messageID: { type: String },
        attachments: [{ type: String }],
        previousWarnings: { type: Number, default: 0 },
        automod: { type: Boolean, default: false },
        ruleViolated: { type: String } // For automod cases
    },
    
    // Tags and categorization
    tags: [{ type: String, maxlength: 50 }],
    severity: { 
        type: Number, 
        min: 1, 
        max: 5, 
        default: 1 
    },
    
    // Logging information
    logged: { type: Boolean, default: false },
    logMessageID: { type: String, default: null },
    notified: { type: Boolean, default: false }
}, { 
    timestamps: true,
    // Ensure unique case IDs per guild
    index: { guildID: 1, caseID: 1 }, 
    unique: true 
});

// Static method to get next case ID
schema.statics.getNextCaseID = async function(guildID) {
    const lastCase = await this.findOne({ guildID }).sort({ caseID: -1 });
    return lastCase ? lastCase.caseID + 1 : 1;
};

// Method to check if case is expired
schema.methods.isExpired = function() {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt.getTime();
};

// Method to get remaining time
schema.methods.getRemainingTime = function() {
    if (!this.expiresAt) return null;
    const remaining = this.expiresAt.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
};

// Method to add evidence
schema.methods.addEvidence = function(evidenceText) {
    if (this.evidence.length >= 10) {
        throw new Error('Maximum evidence entries reached (10)');
    }
    this.evidence.push(evidenceText);
    return this.save();
};

// Method to create appeal
schema.methods.createAppeal = function(reason) {
    if (this.appeal.requested) {
        throw new Error('Appeal already requested for this case');
    }
    
    this.appeal = {
        requested: true,
        requestedAt: new Date(),
        reason: reason,
        status: 'PENDING'
    };
    
    this.status = 'APPEALED';
    return this.save();
};

// Method to review appeal
schema.methods.reviewAppeal = function(moderatorID, approved, reviewReason) {
    if (!this.appeal.requested) {
        throw new Error('No appeal requested for this case');
    }
    
    this.appeal.status = approved ? 'APPROVED' : 'DENIED';
    this.appeal.reviewedBy = moderatorID;
    this.appeal.reviewedAt = new Date();
    this.appeal.reviewReason = reviewReason;
    
    if (approved) {
        this.status = 'OVERTURNED';
    }
    
    return this.save();
};

// Virtual for formatted duration
schema.virtual('formattedDuration').get(function() {
    if (!this.duration) return 'Permanent';
    
    const seconds = Math.floor(this.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day(s)`;
    if (hours > 0) return `${hours} hour(s)`;
    if (minutes > 0) return `${minutes} minute(s)`;
    return `${seconds} second(s)`;
});

// Virtual for case URL (if using dashboard)
schema.virtual('caseURL').get(function() {
    return `https://your-bot.com/cases/${this.guildID}/${this.caseID}`;
});

// Pre-save middleware
schema.pre('save', function(next) {
    // Auto-set expiresAt for temp actions
    if (this.isModified('duration') && this.duration && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + this.duration);
    }
    
    // Auto-update status for expired cases
    if (this.expiresAt && Date.now() > this.expiresAt.getTime() && this.status === 'ACTIVE') {
        this.status = 'EXPIRED';
    }
    
    next();
});

// Static method to get user history
schema.statics.getUserHistory = async function(guildID, userID, limit = 10) {
    return this.find({ guildID, userID })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('moderatorID', 'username')
        .populate('userID', 'username');
};

// Static method to get guild statistics
schema.statics.getGuildStats = async function(guildID, timeRange = 30) {
    const since = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));
    
    const stats = await this.aggregate([
        { $match: { guildID, createdAt: { $gte: since } } },
        {
            $group: {
                _id: '$caseType',
                count: { $sum: 1 },
                avgSeverity: { $avg: '$severity' }
            }
        }
    ]);
    
    return stats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, avgSeverity: stat.avgSeverity };
        return acc;
    }, {});
};

module.exports = mongoose.model('ModerationCases', schema);
