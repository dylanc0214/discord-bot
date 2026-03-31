# 🛡️ Advanced Moderation System - Complete Guide

## 🚀 Quick Start

Your **Only-NONE** bot now has a comprehensive advanced moderation system with auto-mod, case management, appeals, and detailed logging.

## 📋 Core Features

### 🔨 Manual Moderation Commands
- **`/warn`** - Warn users with evidence and severity levels
- **`/kick`** - Kick users with optional notification
- **`/ban`** - Permanent or temporary bans with message deletion
- **`/cases`** - Complete case management system

### 🤖 Auto-Moderation System
- **`/automod`** - Configure automated rule enforcement
- **Multiple trigger types**: Keywords, links, mentions, spam, invites, attachments
- **Configurable actions**: Delete, warn, mute, kick, ban
- **Smart exemptions**: Roles, channels, users

### 📊 Case Management
- **Complete audit trail** with evidence and timestamps
- **User history tracking** and statistics
- **Search and filter** capabilities
- **Appeal system** with workflow management

## 🔧 Setup Guide

### 1. Configure Moderation Roles
```bash
/automod addrule name:"No Spam" trigger-type:"spam" trigger-data:"5,10000" action:"WARN"
```

### 2. Set Up Logging Channel
```bash
# Make sure you have a dedicated mod-log channel
# The bot will automatically log all moderation actions there
```

### 3. Configure Auto-Mod Rules
```bash
# Anti-spam rule
/automod addrule 
  name:"Message Spam" 
  trigger-type:"spam" 
  trigger-data:"5,10000" 
  action:"MUTE"

# Keyword filter
/automod addrule 
  name:"Bad Words" 
  trigger-type:"keywords" 
  trigger-data:"badword1,badword2,badword3" 
  action:"DELETE"

# Link protection
/automod addrule 
  name:"No Links" 
  trigger-type:"links" 
  trigger-data:"blacklist" 
  action:"WARN"
```

## 🎯 Moderation Commands

### `/warn` - User Warnings
```bash
/warn user:@User reason:"Spamming in general channel" severity:2 evidence:"Screenshots attached"
```

**Options:**
- **user**: Target user
- **reason**: Warning reason (required)
- **severity**: 1-5 severity level
- **evidence**: Supporting evidence
- **tags**: Case tags for organization

### `/kick` - User Kicks
```bash
/kick user:@User reason:"Repeated rule violations" evidence:"Multiple warnings" notify:true
```

**Options:**
- **user**: Target user
- **reason**: Kick reason (required)
- **notify**: Send DM to user
- **evidence**: Supporting evidence
- **severity**: Severity level

### `/ban` - User Bans
```bash
/ban user:@User reason:"Severe rule violations" duration:7 delete-days:true notify:true
```

**Options:**
- **user**: Target user
- **reason**: Ban reason (required)
- **duration**: Days for temporary ban
- **delete-days**: Delete messages from past 7 days
- **notify**: Send DM to user

## 🤖 Auto-Mod Configuration

### Rule Types

#### 1. **Keywords**
```bash
/automod addrule 
  name:"Prohibited Words" 
  trigger-type:"keywords" 
  trigger-data:"badword1,badword2" 
  action:"WARN"
```

#### 2. **Links**
```bash
/automod addrule 
  name:"Link Protection" 
  trigger-type:"links" 
  trigger-data:"blacklist" 
  action:"DELETE"
```

#### 3. **Mentions**
```bash
/automod addrule 
  name:"Mention Spam" 
  trigger-type:"mentions" 
  trigger-data:"5" 
  action:"MUTE"
```

#### 4. **Caps Lock**
```bash
/automod addrule 
  name:"Excessive Caps" 
  trigger-type:"caps" 
  trigger-data:"70" 
  action:"WARN"
```

#### 5. **Message Spam**
```bash
/automod addrule 
  name:"Rapid Messages" 
  trigger-type:"spam" 
  trigger-data:"5,10000" 
  action:"TEMPMUTE" 
  duration:5
```

#### 6. **Discord Invites**
```bash
/automod addrule 
  name:"No Invites" 
  trigger-type:"invites" 
  trigger-data:"block-all" 
  action:"DELETE"
```

#### 7. **Attachments**
```bash
/automod addrule 
  name:"File Limits" 
  trigger-type:"attachments" 
  trigger-data:"3" 
  action:"WARN"
```

### Action Types
- **DELETE** - Remove the message
- **WARN** - Issue a warning
- **MUTE** - Mute the user
- **TEMPMUTE** - Temporary mute (set duration)
- **KICK** - Kick the user
- **BAN** - Ban the user
- **TEMPBAN** - Temporary ban (set duration)

## 📊 Case Management

### `/cases view` - View Specific Case
```bash
/cases view case:123
```

### `/cases user` - User Case History
```bash
/cases user user:@User limit:10
```

### `/cases recent` - Recent Cases
```bash
/cases recent limit:25 type:WARN
```

### `/cases search` - Search Cases
```bash
/cases search query:"spam" limit:15
```

### `/cases note` - Add Evidence
```bash
/cases note case:123 note:"Additional evidence found in #reports"
```

### `/cases edit` - Edit Case Details
```bash
/cases edit case:123 reason:"Updated reason with more details" severity:3
```

### `/cases stats` - Moderation Statistics
```bash
/cases stats
```

## 🔄 Auto-Mod Management

### `/automod enable` - Enable Auto-Mod
```bash
/automod enable
```

### `/automod disable` - Disable Auto-Mod
```bash
/automod disable
```

### `/automod list` - List All Rules
```bash
/automod list filter:enabled
```

### `/automod toggle` - Enable/Disable Rule
```bash
/automod toggle rule:"No Spam"
```

### `/automod removerule` - Remove Rule
```bash
/automod removerule rule:"Old Rule"
```

### `/automod stats` - Auto-Mod Statistics
```bash
/automod stats
```

## 🎨 Advanced Features

### Severity Levels
- **1**: Minor infractions (first warning)
- **2**: Moderate issues (repeated minor)
- **3**: Serious violations (multiple warnings)
- **4**: Severe problems (major rules broken)
- **5**: Critical offenses (security/threats)

### Evidence System
- Attach screenshots, logs, or other evidence
- Add notes and additional context
- Track evidence timestamps
- Evidence included in case logs

### Auto-Action Thresholds
The system can automatically escalate punishments based on warning count:
- **3 warnings** → Auto-mute
- **5 warnings** → Auto-kick  
- **7 warnings** → Auto-ban

### Permission System
- **Manage Guild** required for moderation commands
- **Administrator** required for auto-mod management
- Role-based exemptions for auto-mod rules
- Channel-specific rule exemptions

## 📈 Analytics & Reporting

### Case Statistics
```bash
/cases stats
```
Shows:
- Total cases by type
- Average severity levels
- Recent activity trends
- Top moderators by cases

### Auto-Mod Statistics
```bash
/automod stats
```
Shows:
- Rule trigger counts
- Most active rules
- False positive rates
- Effectiveness metrics

### User History
```bash
/cases user user:@ProblematicUser
```
Shows:
- Complete case history
- Warning patterns
- Appeal status
- Current status

## 🚨 Best Practices

### 1. **Clear Rules**
- Establish clear server rules
- Communicate consequences
- Use consistent severity levels

### 2. **Evidence Collection**
- Always document evidence
- Use screenshots for chat violations
- Include context and timestamps

### 3. **Progressive Discipline**
- Start with warnings for minor issues
- Escalate based on history
- Consider user intent and context

### 4. **Auto-Mod Configuration**
- Start with conservative rules
- Monitor false positives
- Adjust thresholds based on server activity

### 5. **Regular Reviews**
- Review case statistics weekly
- Check for pattern abuse
- Update rules as needed

## 🔍 Troubleshooting

### Auto-Mod Not Working?
- Check if auto-mod is enabled: `/automod stats`
- Verify rule permissions
- Check user exemptions
- Review rule configuration

### Cases Not Logging?
- Verify log channel exists
- Check bot permissions in log channel
- Ensure logging is enabled in settings

### Commands Not Working?
- Verify user has required permissions
- Check bot has sufficient permissions
- Ensure target user is not higher in hierarchy

### False Positives?
- Review auto-mod rules: `/automod list`
- Adjust trigger thresholds
- Add exemptions for trusted users/roles

## 🎯 Advanced Workflows

### Multi-Step Moderation
```bash
# Step 1: Warn user
/warn user:@User reason:"First offense - mild spam" severity:1

# Step 2: Add evidence
/cases note case:123 note:"User continued after warning"

# Step 3: Escalate if needed
/kick user:@User reason:"Repeated spam after warning" evidence:"Case #123"
```

### Custom Auto-Mod Rules
```bash
# Complex spam detection
/automod addrule 
  name:"Advanced Spam" 
  trigger-type:"spam" 
  trigger-data:"3,5000" 
  action:"TEMPMUTE" 
  duration:30

# Link protection with whitelist
/automod addrule 
  name:"Allowed Links Only" 
  trigger-type:"links" 
  trigger-data:"whitelist" 
  action:"WARN"
```

## 📞 Support

For issues with the moderation system:
1. Check bot permissions
2. Verify configuration
3. Review case logs
4. Test with low-severity actions first

---

**Your advanced moderation system is now ready!** Start with basic auto-mod rules and gradually expand based on your server's needs.
