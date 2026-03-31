# 🎯 Custom Commands System - User Guide

## 🚀 Quick Start

Your **Only-NONE** bot now has a powerful custom commands system! Server administrators can create their own slash commands with dynamic responses.

## 📝 Creating Custom Commands

### Basic Command Creation
```bash
/createcommand name:hello response:"Hello {user.mention}!"
```

### Advanced Command with Embeds
```bash
/createcommand 
  name:rules 
  response:"1. Be respectful\n2. No spam\n3. Have fun!" 
  description:"Server rules" 
  embed:true 
  color:#FF0000 
  cooldown:30
```

## 🎮 Available Variables

Use these variables in your command responses:

| Variable | Description | Example |
|----------|-------------|---------|
| `{user}` | Username | "Dylan" |
| `{user.mention}` | User mention | "@Dylan" |
| `{user.id}` | User ID | "123456789" |
| `{user.tag}` | User tag | "Dylan#1234" |
| `{guild}` | Server name | "My Server" |
| `{guild.members}` | Member count | "150" |
| `{channel}` | Channel name | "general" |
| `{channel.mention}` | Channel mention | "#general" |
| `{date}` | Current date | "4/1/2026" |
| `{time}` | Current time | "1:30:00 AM" |
| `{timestamp}` | Discord timestamp | "2 hours ago" |
| `{bot}` | Bot username | "Only-NONE" |
| `{random.number}` | Random number 0-99 | "42" |

## 🔧 Command Options

### `/createcommand`
- **name**: Command name (lowercase, no spaces, max 32 chars)
- **response**: What the command responds with (max 2000 chars)
- **description**: Command description (shows in Discord)
- **embed**: Send as embed instead of plain text
- **color**: Embed color (hex format, e.g., #FF0000)
- **cooldown**: Cooldown in seconds (0-3600)
- **allowed-role**: Role that can use this command
- **allowed-user**: Specific user that can use this command

### `/commands` (Management)
- **list**: Show all custom commands
- **edit**: Modify existing commands
- **delete**: Remove a command
- **info**: View detailed command stats
- **toggle**: Enable/disable commands

## 💡 Example Commands

### Welcome Command
```bash
/createcommand 
  name:welcome 
  response:"Welcome {user.mention} to {guild}! 🎉\nWe now have {guild.members} members!" 
  embed:true 
  color:#00FF00
```

### Server Info
```bash
/createcommand 
  name:serverinfo 
  response:"📊 **Server Information**\n\n**Name:** {guild}\n**Members:** {guild.members}\n**Created:** {date}\n**Owner:** {owner}" 
  embed:true 
  color:#5865F2
```

### Fun Command
```bash
/createcommand 
  name:coinflip 
  response:"🪙 {user} flipped a coin and got **{random.number > 50 ? Heads : Tails}**!" 
  cooldown:5
```

### Role-Gated Command
```bash
/createcommand 
  name:modtools 
  response:"🔨 Moderator tools available!" 
  allowed-role:@Moderator
  embed:true 
  color:#FF0000
```

## 🔒 Permission System

Custom commands support granular permissions:

- **Everyone**: Default, all users can use
- **Role-based**: Only specific roles can use
- **User-based**: Only specific users can use
- **Denied**: Explicitly deny roles/users

### Setting Permissions
```bash
# Allow only Admins
/createcommand name:admincmd response:"Admin stuff!" allowed-role:@Admin

# Allow specific user
/createcommand name:personalcmd response:"Personal command!" allowed-user:@Dylan

# Multiple permissions (use edit command)
/commands edit name:admincmd allowed-role:@Admin allowed-role:@Moderator
```

## 📊 Command Statistics

Track usage with built-in analytics:
- Total uses per command
- Last used timestamp
- Created date and creator
- Usage patterns over time

View stats with:
```bash
/commands info name:yourcommand
```

## 🎨 Embed Customization

Make your commands stand out with custom embeds:

```bash
/createcommand 
  name:rules 
  response:"📋 **Server Rules**\n\n1. Be respectful\n2. No spam\n3. Follow Discord ToS" 
  embed:true 
  color:#FF0000
```

**Embed Features:**
- Custom colors (hex codes)
- Automatic footer with usage stats
- Clean formatting
- Better readability

## ⏰ Cooldown System

Prevent spam with per-user cooldowns:

```bash
/createcommand 
  name:daily 
  response:"Here's your daily reward! 💰" 
  cooldown:86400  # 24 hours
```

**Cooldown Options:**
- 0: No cooldown (default)
- 1-3600: 1 second to 1 hour
- Cooldowns are per-user, not global

## 🔄 Command Management

### Edit Commands
```bash
/commands edit 
  name:yourcommand 
  response:"New response text" 
  description:"Updated description"
```

### Toggle Commands
```bash
/commands toggle name:yourcommand
```

### Delete Commands
```bash
/commands delete name:yourcommand
```

### List All Commands
```bash
/commands list sort:uses
```

**Sort Options:** name, created, uses, lastUsed

## 🚨 Important Notes

### Command Names
- Must be lowercase
- No spaces (use hyphens or underscores)
- Max 32 characters
- Cannot conflict with built-in commands

### Response Limits
- Max 2000 characters per response
- Variables are processed in real-time
- HTML/Markdown supported

### Permissions
- Requires **Manage Guild** permission to create/edit/delete
- Regular users can only use enabled commands they have permission for

## 🔧 Advanced Features

### Conditional Logic (Coming Soon)
```bash
# Future feature example
{if.guild.members>100}This is a large server!{endif}
```

### Custom Variables (Coming Soon)
```bash
# Future feature example
{custom.counter} - Server-specific counters
{custom.weather} - Weather integration
```

## 🎯 Best Practices

1. **Descriptive Names**: Use clear, intuitive command names
2. **Good Descriptions**: Help users understand what commands do
3. **Reasonable Cooldowns**: Prevent spam but don't be too restrictive
4. **Use Embeds**: For longer responses or important information
5. **Test Commands**: Always test custom commands before deploying

## 🆘 Troubleshooting

### Command Not Working?
- Check you have **Manage Guild** permission
- Verify command name follows naming rules
- Ensure command isn't disabled
- Check user/role permissions

### Variables Not Replacing?
- Make sure variables are in exact format: `{user.mention}`
- Check for typos in variable names
- Some variables require specific contexts

### Can't Create Command?
- Check if command name already exists
- Verify you're not conflicting with built-in commands
- Ensure you have proper permissions

---

**Ready to create your first custom command?** Try `/createcommand name:test response:"Hello world!"` to get started!
