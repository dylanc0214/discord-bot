# 🎮 Custom Games - Complete Guide

## 🚀 Quick Start

Your **Only-NONE** bot now has a comprehensive custom games system with 15+ unique games, achievements, leaderboards, and economy integration!

## 📋 Available Games

### 🎰 Casino Games
**Economy-based games with betting and winnings**

#### **🎰 Slots**
- **Classic slot machine** with 5 reels
- **Multiple paylines** and bonus features
- **Progressive jackpots** (777 = 100x multiplier!)
- **Animated spinning** with visual effects
- **Command**: `/play game:slots bet:100`

#### **🃏 Blackjack**
- **Classic 21** card game against dealer
- **Hit, Stand, Double Down** options
- **Smart dealer AI** with proper strategy
- **Insurance and splitting** features
- **Command**: `/play game:blackjack bet:100`

#### **🎲 Roulette**
- **European roulette** with single zero
- **All standard bets** (inside/outside)
- **Realistic odds** and payouts
- **Visual wheel** and betting table
- **Command**: `/play game:roulette bet:100`

#### **♠️ Texas Hold'em**
- **Multiplayer poker** (2-8 players)
- **Tournament style** gameplay
- **Betting rounds** and pot management
- **Hand evaluation** and showdown
- **Command**: `/play game:poker bet:100 opponent:@user`

### 🧠 Knowledge Games
**Test your knowledge and learn new things**

#### **🧠 Trivia Challenge**
- **Multiple categories**: General, Science, History, Entertainment
- **Difficulty levels**: Easy, Medium, Hard
- **Multiplayer support** (up to 10 players)
- **Timed questions** with scoring
- **Command**: `/play game:trivia category:science difficulty:medium questions:10`

#### **📝 Word Scramble**
- **Unscramble words** against time
- **Various difficulty** levels
- **Word categories** and themes
- **Speed bonuses** for quick answers
- **Command**: `/play game:wordscramble`

#### **🔢 Math Challenge**
- **Solve math problems** quickly
- **Arithmetic to algebra** difficulty
- **Time-based scoring** system
- **Progressive difficulty** increase
- **Command**: `/play game:math`

### ⚡ Skill Games
**Test your reflexes and abilities**

#### **⚡ Reaction Time**
- **Test your reflexes** with visual cues
- **Millisecond precision** timing
- **Leaderboard rankings** for fastest reactions
- **Multiple difficulty** levels
- **Command**: `/play game:reaction`

#### **⌨️ Speed Typing**
- **Type as fast as you can**
- **WPM calculation** and accuracy
- **Various text** difficulties
- **Practice mode** available
- **Command**: `/play game:typing`

#### **🧩 Memory Match**
- **Classic memory** card game
- **Grid sizes** from 4x4 to 8x8
- **Time attack** mode
- **Multiplayer** support
- **Command**: `/play game:memory`

### 🎯 Strategy Games
**Outthink your opponents**

#### **❌⭕ Tic-Tac-Toe**
- **Classic 3x3** gameplay
- **AI opponent** with difficulty levels
- **Multiplayer** support
- **Tournament mode** available
- **Command**: `/play game:tic-tac-toe opponent:@user`

#### **🔴 Connect Four**
- **7x6 grid** gameplay
- **Strategic thinking** required
- **Win detection** algorithm
- **Multiplayer** battles
- **Command**: `/play game:connect4 opponent:@user`

#### **♟️ Chess**
- **Full chess** implementation
- **All pieces** and rules
- **Move validation** and check detection
- **AI opponent** available
- **Command**: `/play game:chess opponent:@user`

### 🎲 Classic Games
**Timeless favorites with modern twists**

#### **✊ Rock Paper Scissors**
- **Classic game** with variations
- **Best of 3** and best of 5 modes
- **Special moves** and power-ups
- **Tournament** brackets
- **Command**: `/play game:rps opponent:@user`

## 🏆 Achievement System

### **🎯 General Achievements**
- **First Victory** - Win your first game (100 coins)
- **Game Collector** - Play every game type (1,500 coins)
- **Unbeatable** - Win 20 games in a row (2,000 coins)

### **🎰 Casino Achievements**
- **Lucky Seven** - Hit 777 in slots (777 coins)
- **Blackjack Master** - Win 10 blackjack games (1,000 coins)
- **Poker Champion** - Win a poker tournament (5,000 coins)
- **High Roller** - Bet 10,000+ coins (1,000 coins)

### **🧠 Knowledge Achievements**
- **Trivia Master** - Answer 50 trivia questions correctly (500 coins)
- **Word Wizard** - Solve 25 word scrambles (300 coins)
- **Math Genius** - Solve 20 math problems (400 coins)

### **⚡ Skill Achievements**
- **Lightning Fast** - React in under 200ms (200 coins)
- **Typing Master** - Type 100+ WPM (300 coins)
- **Memory Champion** - Complete memory game in record time (250 coins)

### **🎯 Strategy Achievements**
- **Strategic Mind** - Win 10 strategy games (800 coins)
- **Chess Master** - Win 5 chess games (500 coins)
- **Connect King** - Win 10 Connect Four games (400 coins)

## 📊 Leaderboard System

### **Game-Specific Leaderboards**
- **Individual rankings** for each game
- **Score-based** or win-based scoring
- **Top 100** players per game
- **Daily/weekly/monthly** rankings

### **Category Leaderboards**
- **Combined scores** from game categories
- **Casino**, **Knowledge**, **Skill**, **Strategy**
- **Weighted scoring** system
- **Special badges** for category leaders

### **Overall Leaderboard**
- **Master ranking** across all games
- **Crown badges** for #1 rankings
- **Total games played** and win rates
- **Achievement points** included

### **Leaderboard Commands**
```bash
# View specific game leaderboard
/leaderboard game:slots limit:10

# View category leaderboard
/leaderboard category:casino limit:20

# View overall leaderboard
/leaderboard game:overall limit:50
```

## 💰 Economy Integration

### **Betting System**
- **Minimum bets**: 10 coins
- **Maximum bets**: 10,000 coins
- **House edge**: Balanced for fair play
- **Progressive jackpots** in casino games

### **Winnings Calculation**
- **Slots**: Based on symbol combinations
- **Blackjack**: 2x for win, 2.5x for blackjack
- **Trivia**: 50 coins per correct answer
- **Skill games**: Based on performance metrics

### **Economy Commands**
```bash
# Check your balance
/balance

# Earn more coins
/work
/daily

# View transaction history
/balance
```

## 🎮 Game Commands

### **Main Play Command**
```bash
/play game:<game_type> [options]
```

### **Common Options**
- **bet**: Amount to bet (casino games)
- **category**: Game category (trivia)
- **difficulty**: Easy/Medium/Hard
- **questions**: Number of questions (trivia)
- **opponent**: Opponent user (2-player games)

### **Examples**
```bash
# Play slots with 500 coin bet
/play game:slots bet:500

# Play trivia with science category
/play game:trivia category:science difficulty:medium questions:15

# Challenge friend to chess
/play game:chess opponent:@Friend

# Play reaction time game
/play game:reaction
```

## 🏅 Tournament System

### **Tournament Types**
- **Casino Tournaments** - Highest winnings
- **Trivia Championships** - Most correct answers
- **Speed Challenges** - Fastest times
- **Strategy Battles** - Elimination brackets

### **Tournament Features**
- **Registration periods** with entry fees
- **Automated matchmaking** and scheduling
- **Live updates** and progress tracking
- **Prize pools** and special rewards
- **Spectator mode** for watching matches

### **Tournament Commands**
```bash
# List active tournaments
/tournaments

# Join a tournament
/tournament join id:123

# View tournament bracket
/tournament bracket id:123

# Check tournament status
/tournament status id:123
```

## 📈 Statistics & Analytics

### **Player Statistics**
- **Games played** and win rates
- **Favorite games** and categories
- **Best performances** and high scores
- **Achievement progress** and completion
- **Earnings** and losses tracking

### **Game Analytics**
- **Popular games** and play times
- **Average session** durations
- **Player retention** rates
- **Economy flow** analysis
- **Peak activity** times

### **Statistics Commands**
```bash
# View your game stats
/gamestats

# View server game statistics
/serverstats games

# View economy statistics
/serverstats economy
```

## 🎯 Game Strategies

### **Casino Games**
- **Slots**: Look for patterns, manage bankroll
- **Blackjack**: Learn basic strategy, card counting
- **Roulette**: Understand odds, betting systems
- **Poker**: Position play, pot odds, bluffing

### **Knowledge Games**
- **Trivia**: Study categories, quick recall
- **Word Scramble**: Pattern recognition, vocabulary
- **Math**: Practice mental math, shortcuts

### **Skill Games**
- **Reaction**: Practice timing, focus techniques
- **Typing**: Proper posture, finger placement
- **Memory**: Visualization techniques, chunking

### **Strategy Games**
- **Tic-Tac-Toe**: Fork strategies, blocking
- **Connect Four**: Center control, threat creation
- **Chess**: Opening theory, endgame technique

## 🔧 Advanced Features

### **Custom Game Modes**
- **Hardcore mode** - Higher stakes, bigger rewards
- **Practice mode** - No cost, no rewards
- **Tournament mode** - Competitive play
- **Co-op mode** - Team-based games

### **Power-Ups & Boosts**
- **Double XP** - Earn double experience
- **Lucky Charm** - Increased win rates
- **Time Freeze** - Pause game timer
- **Hint System** - Get help with puzzles

### **Social Features**
- **Friend system** - Track friends' stats
- **Game invites** - Direct challenge friends
- **Spectator mode** - Watch ongoing games
- **Replay system** - Review past games

### **Customization**
- **Profile themes** - Personalize game interface
- **Achievement displays** - Show off accomplishments
- **Title system** - Earn special titles
- **Badge collection** - Collect rare badges

## 🎨 Game Customization

### **Server-Specific Settings**
```bash
# Configure game settings
/gamesettings

# Set minimum bet
/gamesettings min_bet:50

# Enable/disable games
/gamesettings disable:slots

# Set tournament frequency
/gamesettings tournaments:daily
```

### **Personal Preferences**
```bash
# Set favorite game
/preferences favorite:slots

# Enable notifications
/preferences notifications:true

# Set difficulty preference
/preferences difficulty:medium
```

## 🚀 Getting Started

### **For New Players**
1. **Check your balance** with `/balance`
2. **Start with free games** like trivia or reaction
3. **Try casino games** with small bets
4. **Challenge friends** to multiplayer games
5. **Join tournaments** for big prizes

### **For Experienced Players**
1. **Master strategy games** for consistent wins
2. **Participate in tournaments** regularly
3. **Complete achievements** for bonuses
4. **Climb leaderboards** in favorite games
5. **Help new players** and build community

### **For Server Admins**
1. **Configure game settings** for your server
2. **Host regular tournaments** with prizes
3. **Monitor game economy** and balance
4. **Create custom events** and challenges
5. **Promote active players** and contributors

## 🔍 Troubleshooting

### **Common Issues**

#### **Game Won't Start**
- Check if you're already in a game
- Verify you have sufficient balance for betting
- Ensure opponent is available for multiplayer games
- Check game permissions and restrictions

#### **Bet Not Accepted**
- Verify sufficient balance
- Check minimum/maximum bet limits
- Ensure economy system is active
- Try refreshing with `/balance`

#### **Leaderboard Not Updating**
- Wait a few minutes for updates
- Check if game is completed
- Verify score calculation method
- Contact admin if issue persists

### **Getting Help**
- Use `/help games` for command assistance
- Check `/gamestats` for your game history
- Ask in server help channels
- Report bugs to server administrators

## 🎯 Best Practices

### **Responsible Gaming**
- **Set limits** on betting amounts
- **Take breaks** during long sessions
- **Never chase losses** with bigger bets
- **Play for fun** not just profit
- **Seek help** if gaming becomes problematic

### **Community Guidelines**
- **Be respectful** to other players
- **No cheating** or exploiting bugs
- **Help newcomers** learn the games
- **Report issues** to moderators
- **Keep chat friendly** and welcoming

### **Performance Tips**
- **Practice regularly** to improve skills
- **Learn strategies** for each game type
- **Study patterns** in casino games
- **Manage time** effectively in speed games
- **Stay focused** during tournaments

---

**Your custom games system is now ready!** Start playing, competing, and climbing the leaderboards! 🎮🏆
