/**
 * Auto-Moderation Message Handler
 * Processes messages for rule violations and takes appropriate actions
 */

const ModerationSettings = require('../../database/models/moderationSettings');
const ModerationCases = require('../../database/models/moderationCases');
const { EmbedBuilder } = require('discord.js');

// User message tracking for spam detection
const messageTracker = new Map(); // userID -> { messages: [], lastReset: Date }

module.exports = async (client, message) => {
    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) return;

    try {
        // Get guild settings
        const settings = await ModerationSettings.getSettings(message.guild.id);
        
        // Check if auto-mod is enabled
        if (!settings.automod.enabled) return;

        // Check if user is exempt from auto-mod
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return;

        // Update message tracking
        updateMessageTracker(message.author.id);

        // Process each active rule
        for (const rule of settings.automod.rules.filter(r => r.enabled)) {
            // Check if user is exempt from this rule
            if (settings.isExempt(member, rule)) continue;

            // Check cooldown
            if (rule.cooldown > 0) {
                const lastTriggered = rule.lastTriggered?.getTime() || 0;
                if (Date.now() - lastTriggered < rule.cooldown) continue;
            }

            // Check user limit
            if (rule.maxPerUser > 0) {
                const userTriggers = getUserTriggerCount(message.author.id, rule.id);
                if (userTriggers >= rule.maxPerUser) continue;
            }

            // Evaluate rule triggers
            const violation = await evaluateRule(message, rule, member);
            
            if (violation.triggered) {
                // Update rule stats
                rule.triggerCount++;
                rule.lastTriggered = new Date();
                await settings.save();

                // Increment user trigger count
                incrementUserTriggerCount(message.author.id, rule.id);

                // Take actions
                await executeActions(client, message, rule, violation, settings, member);
                
                // Log the violation
                await logAutomodViolation(client, message, rule, violation, settings);
                
                // Stop processing further rules for this message
                break;
            }
        }

    } catch (error) {
        console.error('Error in auto-mod handler:', error);
    }
};

// Update message tracking for spam detection
function updateMessageTracker(userID) {
    const now = Date.now();
    const user = messageTracker.get(userID) || { messages: [], lastReset: now };
    
    // Clean old messages (older than 10 seconds)
    user.messages = user.messages.filter(time => now - time < 10000);
    
    // Add current message
    user.messages.push(now);
    
    // Reset if it's been a while
    if (now - user.lastReset > 60000) {
        user.messages = [now];
        user.lastReset = now;
    }
    
    messageTracker.set(userID, user);
}

// Get user trigger count for a specific rule
function getUserTriggerCount(userID, ruleID) {
    const user = messageTracker.get(userID);
    return user?.triggerCounts?.get(ruleID) || 0;
}

// Increment user trigger count
function incrementUserTriggerCount(userID, ruleID) {
    const user = messageTracker.get(userID) || { messages: [], lastReset: Date.now(), triggerCounts: new Map() };
    
    if (!user.triggerCounts) user.triggerCounts = new Map();
    
    const current = user.triggerCounts.get(ruleID) || 0;
    user.triggerCounts.set(ruleID, current + 1);
    
    messageTracker.set(userID, user);
}

// Evaluate if a message violates a rule
async function evaluateRule(message, rule, member) {
    const triggers = rule.triggers;
    let triggered = false;
    let reason = '';
    let evidence = '';

    // Keyword detection
    if (triggers.keywords.length > 0) {
        const content = message.content.toLowerCase();
        for (const keyword of triggers.keywords) {
            if (content.includes(keyword.toLowerCase())) {
                triggered = true;
                reason = `Contains prohibited keyword: "${keyword}"`;
                evidence = `Matched keyword: "${keyword}"`;
                break;
            }
        }
    }

    // Regex detection
    if (!triggered && triggers.regex.length > 0) {
        for (const regex of triggers.regex) {
            try {
                const pattern = new RegExp(regex, 'i');
                if (pattern.test(message.content)) {
                    triggered = true;
                    reason = `Matches prohibited pattern: ${regex}`;
                    evidence = `Matched pattern: ${regex}`;
                    break;
                }
            } catch (error) {
                console.warn(`Invalid regex in automod rule: ${regex}`);
            }
        }
    }

    // Mention spam detection
    if (!triggered && triggers.mentions.enabled) {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount >= triggers.mentions.threshold) {
            triggered = true;
            reason = `Too many mentions (${mentionCount} >= ${triggers.mentions.threshold})`;
            evidence = `Mentions: ${mentionCount}`;
        }
    }

    // Link detection
    if (!triggered && triggers.links.enabled) {
        const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)/gi;
        const links = message.content.match(urlRegex) || [];
        
        if (links.length > 0) {
            // Check whitelist
            const whitelisted = links.some(link => 
                triggers.links.whitelist.some(allowed => link.includes(allowed))
            );
            
            // Check blacklist
            const blacklisted = links.some(link => 
                triggers.links.blacklist.some(blocked => link.includes(blocked))
            );
            
            if (!whitelisted && (blacklisted || triggers.links.blacklist.length === 0)) {
                triggered = true;
                reason = `Contains prohibited links`;
                evidence = `Links found: ${links.join(', ')}`;
            }
        }
    }

    // Caps detection
    if (!triggered && triggers.caps.enabled) {
        const content = message.content.replace(/[^\w]/g, '');
        if (content.length >= triggers.caps.minLength) {
            const capsCount = (content.match(/[A-Z]/g) || []).length;
            const capsPercentage = (capsCount / content.length) * 100;
            
            if (capsPercentage >= triggers.caps.threshold) {
                triggered = true;
                reason = `Too many capital letters (${Math.round(capsPercentage)}% >= ${triggers.caps.threshold}%)`;
                evidence = `Caps: ${capsCount}/${content.length} (${Math.round(capsPercentage)}%)`;
            }
        }
    }

    // Spam detection
    if (!triggered && triggers.spam.enabled) {
        const userMessages = messageTracker.get(message.author.id)?.messages || [];
        const recentMessages = userMessages.filter(time => 
            Date.now() - time < triggers.spam.timeWindow
        );
        
        if (recentMessages.length >= triggers.spam.messages) {
            triggered = true;
            reason = `Spamming messages (${recentMessages.length} >= ${triggers.spam.messages})`;
            evidence = `Messages in ${triggers.spam.timeWindow}ms: ${recentMessages.length}`;
        }
    }

    // Invite detection
    if (!triggered && triggers.invites.enabled) {
        const inviteRegex = /discord\.(gg|com)\/\w+/gi;
        const invites = message.content.match(inviteRegex) || [];
        
        if (invites.length > 0) {
            // Check if it's the server's own invite
            if (!triggers.invites.allowOwn) {
                triggered = true;
                reason = `Contains Discord invites`;
                evidence = `Invites found: ${invites.join(', ')}`;
            } else {
                // Check if invites are for this server
                const guildInvites = await message.guild.invites.fetch().catch(() => new Collection());
                const isOwnInvite = invites.some(invite => 
                    guildInvites.some(guildInvite => invite.includes(guildInvite.code))
                );
                
                if (!isOwnInvite) {
                    triggered = true;
                    reason = `Contains external Discord invites`;
                    evidence = `External invites: ${invites.join(', ')}`;
                }
            }
        }
    }

    // Attachment detection
    if (!triggered && triggers.attachments.enabled) {
        const attachmentCount = message.attachments.size;
        if (attachmentCount > triggers.attachments.maxCount) {
            triggered = true;
            reason = `Too many attachments (${attachmentCount} > ${triggers.attachments.maxCount})`;
            evidence = `Attachments: ${attachmentCount}`;
        } else if (triggers.attachments.blockedTypes.length > 0) {
            const blockedAttachments = message.attachments.filter(att => 
                triggers.attachments.blockedTypes.some(type => 
                    att.contentType?.includes(type) || att.name.endsWith(type)
                )
            );
            
            if (blockedAttachments.size > 0) {
                triggered = true;
                reason = `Contains prohibited file types`;
                evidence = `Blocked files: ${blockedAttachments.map(att => att.name).join(', ')}`;
            }
        }
    }

    return { triggered, reason, evidence };
}

// Execute actions for a violation
async function executeActions(client, message, rule, violation, settings, member) {
    for (const action of rule.actions) {
        try {
            switch (action.type) {
                case 'DELETE':
                    await message.delete().catch(() => {});
                    break;
                    
                case 'WARN':
                    await createAutomodCase(client, message, 'WARN', action, violation, member);
                    break;
                    
                case 'MUTE':
                    await createAutomodCase(client, message, 'MUTE', action, violation, member);
                    await applyMute(message.guild, member, action.duration);
                    break;
                    
                case 'TEMPMUTE':
                    await createAutomodCase(client, message, 'TEMPMUTE', action, violation, member);
                    await applyMute(message.guild, member, action.duration);
                    break;
                    
                case 'KICK':
                    await createAutomodCase(client, message, 'KICK', action, violation, member);
                    await member.kick(violation.reason).catch(() => {});
                    break;
                    
                case 'BAN':
                    await createAutomodCase(client, message, 'BAN', action, violation, member);
                    await member.ban({ reason: violation.reason }).catch(() => {});
                    break;
                    
                case 'TEMPBAN':
                    await createAutomodCase(client, message, 'TEMPBAN', action, violation, member);
                    await member.ban({ reason: violation.reason }).catch(() => {});
                    break;
            }
        } catch (error) {
            console.error(`Error executing auto-mod action ${action.type}:`, error);
        }
    }
}

// Create moderation case for auto-mod action
async function createAutomodCase(client, message, caseType, action, violation, member) {
    try {
        const ModerationCases = require('../../database/models/moderationCases');
        const caseID = await ModerationCases.getNextCaseID(message.guild.id);
        
        const moderationCase = new ModerationCases({
            guildID: message.guild.id,
            caseID,
            caseType,
            userID: message.author.id,
            userTag: message.author.tag,
            moderatorID: client.user.id,
            moderatorTag: client.user.tag,
            reason: action.reason || violation.reason,
            severity: action.severity,
            duration: action.duration,
            expiresAt: action.duration ? new Date(Date.now() + action.duration) : null,
            context: {
                channelID: message.channel.id,
                messageID: message.id,
                automod: true,
                ruleViolated: violation.reason
            },
            evidence: [violation.evidence]
        });
        
        await moderationCase.save();
        return moderationCase;
    } catch (error) {
        console.error('Error creating auto-mod case:', error);
    }
}

// Apply mute to user
async function applyMute(guild, member, duration) {
    try {
        const ModerationSettings = require('../../database/models/moderationSettings');
        const settings = await ModerationSettings.getSettings(guild.id);
        
        if (!settings.roles.muted) {
            console.warn('No muted role configured for auto-mod');
            return;
        }
        
        const mutedRole = await guild.roles.fetch(settings.roles.muted).catch(() => null);
        if (!mutedRole) {
            console.warn('Muted role not found for auto-mod');
            return;
        }
        
        await member.roles.add(mutedRole, 'Auto-mod mute');
        
        // Schedule unmute if temporary
        if (duration) {
            setTimeout(async () => {
                try {
                    await member.roles.remove(mutedRole, 'Temporary mute expired');
                } catch (error) {
                    console.error('Error unmuting user:', error);
                }
            }, duration);
        }
    } catch (error) {
        console.error('Error applying mute:', error);
    }
}

// Log auto-mod violation
async function logAutomodViolation(client, message, rule, violation, settings) {
    if (!settings.logging.enabled || !settings.logging.channelID) return;
    
    try {
        const logChannel = await message.guild.channels.fetch(settings.logging.channelID);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🚨 Auto-Mod Violation')
            .setDescription(`**User:** ${message.author.tag} (${message.author.id})\n**Rule:** ${rule.name}\n**Reason:** ${violation.reason}`)
            .setColor(0xFF6600)
            .addFields(
                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Actions Taken', value: rule.actions.map(a => a.type).join(', '), inline: true },
                { name: 'Evidence', value: violation.evidence, inline: false }
            )
            .addFields(
                { name: 'Message Content', value: message.content.length > 200 ? message.content.substring(0, 200) + '...' : message.content, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Rule ID: ${rule.id} • Trigger #${rule.triggerCount}` });
        
        if (message.attachments.size > 0) {
            logEmbed.addFields({
                name: 'Attachments',
                value: message.attachments.map(att => `[${att.name}](${att.url})`).join(', '),
                inline: false
            });
        }
        
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Error logging auto-mod violation:', error);
    }
}
