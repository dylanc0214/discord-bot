# 🚀 Custom Bot Customization Guide

## 📋 Quick Start

1. **Copy Environment Config:**
   ```bash
   cp .env.custom .env
   # Edit .env with your actual values
   ```

2. **Update Bot Identity:**
   Edit `config/custom.js` with your bot's information:
   - Bot name, description, author
   - Support server link
   - Client ID (from Discord Developer Portal)

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start Your Bot:**
   ```bash
   npm start
   ```

## 🏗️ Architecture Overview

```
src/
├── index.js           # Entry point (Express + Discord)
├── bot.js            # Discord client setup
├── config/
│   ├── bot.js        # Original config (deprecated)
│   ├── configManager.js # NEW: Centralized config
│   └── ...           # Other config files
├── handlers/
│   └── loaders/
│       ├── commands.js   # Slash command loader
│       └── event.js      # Event loader
├── interactions/
│   └── Command/          # Slash commands
├── events/
│   └── [category]/       # Event handlers
└── database/
    ├── connect.js        # MongoDB connection
    └── models/           # Mongoose schemas
```

## 🔧 Adding New Commands

### Slash Commands (Recommended)

1. **Create Command File:**
   ```javascript
   // src/interactions/Command/yourcategory/yourcommand.js
   const { SlashCommandBuilder } = require('discord.js');

   module.exports = {
       data: new SlashCommandBuilder()
           .setName('yourcommand')
           .setDescription('Your command description')
           .addUserOption(option => 
               option.setName('user')
                   .setDescription('User to mention')
                   .setRequired(false)),
       
       async execute(interaction, client) {
           // Command logic here
           await interaction.reply('Hello!');
       }
   };
   ```

2. **Auto-Registration:** Commands are automatically loaded on bot restart

### Categories Available:
- `administration/` - Admin commands
- `economy/` - Currency/points system
- `fun/` - Entertainment commands
- `games/` - Interactive games
- `giveaways/` - Giveaway management
- `information/` - Server/user info
- `moderation/` - Moderation tools
- `music/` - Audio commands
- `utility/` - Useful utilities

## 🎪 Adding New Events

1. **Create Event File:**
   ```javascript
   // src/events/guild/yourEvent.js
   module.exports = async (client, ...args) => {
       // Event logic here
       console.log('Event triggered!');
   };
   ```

2. **Event Categories:**
   - `client/` - Bot lifecycle events
   - `guild/` - Server-related events
   - `message/` - Message events
   - `voice/` - Voice channel events
   - And many more...

## 💾 Database Integration

### Using Existing Models
```javascript
const Profile = require('../../database/models/profile');

// Get user profile
const profile = await Profile.findOne({ userID: interaction.user.id });

// Create new profile
const newProfile = new Profile({
    userID: interaction.user.id,
    // ... other fields
});
await newProfile.save();
```

### Creating New Models
```javascript
// src/database/models/yourModel.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userID: { type: String, required: true },
    // Your fields here
}, { timestamps: true });

module.exports = mongoose.model('YourModel', schema);
```

## 🎨 Customization Points

### 1. Bot Branding
- **File:** `config/custom.js`
- **What to change:** Bot name, colors, footer, status

### 2. Webhook Integration
- **File:** `.env` (WEBHOOK_ID, WEBHOOK_TOKEN)
- **Usage:** Automatic logging to your Discord channel

### 3. Music System
- **Lavalink:** Configure in `.env`
- **Spotify:** Add credentials for enhanced music features

### 4. Feature Flags
```javascript
// In config/custom.js
features: {
    music: true,        // Enable/disable music
    economy: true,      // Enable/disable economy
    moderation: true,   // Enable/disable moderation
    // ... add your own features
}
```

## 🔌 Advanced Customization

### Custom Middleware
```javascript
// src/handlers/middleware/yourMiddleware.js
module.exports = (client, interaction, next) => {
    // Your middleware logic
    if (someCondition) {
        return next(); // Continue
    }
    // Stop execution
};
```

### Custom Handlers
```javascript
// src/handlers/custom/yourHandler.js
module.exports = (client) => {
    // Custom initialization logic
    console.log('Custom handler loaded');
};
```

## 🚨 Important Notes

### Security
- Never commit your `.env` file
- Use environment variables for sensitive data
- Validate user input in commands

### Performance
- Commands are lazy-loaded
- Database connections are pooled
- Use caching for frequently accessed data

### Discord.js v14
- All commands use slash command syntax
- Proper intent management in `bot.js`
- Modern component interactions supported

## 🛠️ Development Workflow

1. **Feature Development:**
   ```bash
   NODE_ENV=development npm start
   ```

2. **Testing Commands:**
   - Use Discord's slash command interface
   - Check console for loading messages

3. **Database Changes:**
   - Models auto-update (no migrations needed)
   - Backup data before schema changes

4. **Deployment:**
   ```bash
   NODE_ENV=production npm start
   ```

## 📚 Next Steps

Now that your bot is rebranded and configured, what feature would you like to build first?

1. **Custom Commands System** - Let users create their own commands
2. **Advanced Moderation** - Custom moderation workflows
3. **Enhanced Economy** - Shops, items, trading
4. **Dashboard Integration** - Web panel for server management
5. **API Endpoints** - External integrations
6. **Custom Games** - Unique server games
7. **Automation System** - Custom triggers and actions

**Tell me which feature interests you most and I'll help you build it!**
