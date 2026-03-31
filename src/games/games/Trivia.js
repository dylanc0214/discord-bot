/**
 * Trivia Game
 * Multiplayer trivia quiz with various categories
 */

const BaseGame = require('./BaseGame');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class Trivia extends BaseGame {
    constructor(interaction, options = {}) {
        super(interaction, 'trivia', options);
        
        this.category = options.category || 'general';
        this.difficulty = options.difficulty || 'medium';
        this.maxQuestions = options.questions || 10;
        this.currentQuestion = 0;
        this.score = new Map(); // userID -> score
        this.answers = new Map(); // userID -> answer
        this.questionTimer = null;
        this.currentQuestionData = null;
        this.gameState = 'waiting'; // waiting, active, ended
        
        // Trivia questions database
        this.questions = this.loadQuestions();
    }

    loadQuestions() {
        return {
            general: [
                {
                    question: "What is the capital of France?",
                    options: ["London", "Berlin", "Paris", "Madrid"],
                    correct: 2,
                    difficulty: "easy"
                },
                {
                    question: "What is the largest planet in our solar system?",
                    options: ["Earth", "Mars", "Jupiter", "Saturn"],
                    correct: 2,
                    difficulty: "easy"
                },
                {
                    question: "Who painted the Mona Lisa?",
                    options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "What is the smallest country in the world?",
                    options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "In which year did World War II end?",
                    options: ["1943", "1944", "1945", "1946"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "What is the chemical symbol for gold?",
                    options: ["Go", "Gd", "Au", "Ag"],
                    correct: 2,
                    difficulty: "easy"
                },
                {
                    question: "Who wrote 'Romeo and Juliet'?",
                    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "What is the speed of light?",
                    options: ["299,792 km/s", "199,792 km/s", "399,792 km/s", "99,792 km/s"],
                    correct: 0,
                    difficulty: "hard"
                },
                {
                    question: "Which element has the atomic number 1?",
                    options: ["Helium", "Hydrogen", "Lithium", "Carbon"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "What is the largest ocean on Earth?",
                    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
                    correct: 3,
                    difficulty: "easy"
                }
            ],
            science: [
                {
                    question: "What is the powerhouse of the cell?",
                    options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "What is the chemical formula for water?",
                    options: ["H2O", "CO2", "O2", "N2"],
                    correct: 0,
                    difficulty: "easy"
                },
                {
                    question: "How many bones are in the human body?",
                    options: ["106", "206", "306", "406"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "What is the hardest natural substance on Earth?",
                    options: ["Gold", "Iron", "Diamond", "Platinum"],
                    correct: 2,
                    difficulty: "easy"
                },
                {
                    question: "What planet is known as the Red Planet?",
                    options: ["Venus", "Mars", "Jupiter", "Saturn"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "What is the study of earthquakes called?",
                    options: ["Geology", "Meteorology", "Seismology", "Volcanology"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "What is the largest organ in the human body?",
                    options: ["Heart", "Liver", "Brain", "Skin"],
                    correct: 3,
                    difficulty: "medium"
                },
                {
                    question: "What gas do plants absorb from the atmosphere?",
                    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
                    correct: 2,
                    difficulty: "easy"
                },
                {
                    question: "What is the smallest unit of matter?",
                    options: ["Molecule", "Atom", "Proton", "Electron"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "How many chambers does a human heart have?",
                    options: ["2", "3", "4", "5"],
                    correct: 2,
                    difficulty: "easy"
                }
            ],
            history: [
                {
                    question: "Who was the first President of the United States?",
                    options: ["Thomas Jefferson", "George Washington", "John Adams", "Benjamin Franklin"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "In which year did Christopher Columbus discover America?",
                    options: ["1490", "1491", "1492", "1493"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "Who built the pyramids of Giza?",
                    options: ["Romans", "Greeks", "Egyptians", "Persians"],
                    correct: 2,
                    difficulty: "easy"
                },
                {
                    question: "Which empire was known as 'the empire on which the sun never sets'?",
                    options: ["Roman Empire", "British Empire", "Ottoman Empire", "Mongol Empire"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "Who invented the telephone?",
                    options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Benjamin Franklin"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "In which year did the Titanic sink?",
                    options: ["1910", "1911", "1912", "1913"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "Who was the first person to walk on the moon?",
                    options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "Which ancient wonder of the world still stands today?",
                    options: ["Colossus of Rhodes", "Hanging Gardens", "Great Pyramid of Giza", "Lighthouse of Alexandria"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "Who wrote the Declaration of Independence?",
                    options: ["George Washington", "Thomas Jefferson", "Benjamin Franklin", "John Adams"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "In which year did World War I begin?",
                    options: ["1912", "1913", "1914", "1915"],
                    correct: 2,
                    difficulty: "medium"
                }
            ],
            entertainment: [
                {
                    question: "Who directed the movie 'Titanic'?",
                    options: ["Steven Spielberg", "James Cameron", "Martin Scorsese", "Quentin Tarantino"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "Which movie won the Oscar for Best Picture in 2020?",
                    options: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "Who played Jack Sparrow in Pirates of the Caribbean?",
                    options: ["Tom Cruise", "Johnny Depp", "Brad Pitt", "Leonardo DiCaprio"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "Which band wrote the song 'Bohemian Rhapsody'?",
                    options: ["The Beatles", "Queen", "Pink Floyd", "Led Zeppelin"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "In which year was the first Star Wars movie released?",
                    options: ["1975", "1976", "1977", "1978"],
                    correct: 2,
                    difficulty: "medium"
                },
                {
                    question: "Who created the Harry Potter series?",
                    options: ["J.R.R. Tolkien", "J.K. Rowling", "Stephen King", "George R.R. Martin"],
                    correct: 1,
                    difficulty: "easy"
                },
                {
                    question: "Which TV show features the character 'Walter White'?",
                    options: ["House of Cards", "Breaking Bad", "The Sopranos", "The Wire"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "Who directed 'The Godfather'?",
                    options: ["Francis Ford Coppola", "Martin Scorsese", "Alfred Hitchcock", "Stanley Kubrick"],
                    correct: 0,
                    difficulty: "medium"
                },
                {
                    question: "Which artist holds the record for most Grammy Awards?",
                    options: ["The Beatles", "Beyoncé", "Taylor Swift", "Madonna"],
                    correct: 1,
                    difficulty: "medium"
                },
                {
                    question: "In which year was Netflix founded?",
                    options: ["1995", "1997", "1999", "2001"],
                    correct: 1,
                    difficulty: "hard"
                }
            ]
        };
    }

    async start() {
        // Add players
        this.addPlayer(this.interaction.user);
        this.score.set(this.interaction.user.id, 0);
        
        await this.showGameBoard();
        await this.startGame();
    }

    async showGameBoard() {
        const embed = new EmbedBuilder()
            .setTitle('🧠 Trivia Challenge')
            .setDescription(`**Category:** ${this.category}\n**Difficulty:** ${this.difficulty}\n**Questions:** ${this.maxQuestions}\n\nWaiting to start...`)
            .setColor(0x9B59B6)
            .addFields(
                {
                    name: '👥 Players',
                    value: this.players.map(p => `${p.user.tag}`).join('\n'),
                    inline: true
                },
                {
                    name: '📊 Scores',
                    value: this.players.map(p => `${p.user.tag}: 0`).join('\n'),
                    inline: true
                }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start')
                    .setLabel('🎮 START GAME')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(this.gameState !== 'waiting')
            );

        const message = await this.interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        this.message = message;
        this.setupCollector();
    }

    setupCollector() {
        const collector = this.message.createMessageComponentCollector({
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'start') {
                if (interaction.user.id !== this.interaction.user.id) {
                    await interaction.reply({
                        content: 'Only the game creator can start the game!',
                        ephemeral: true
                    });
                    return;
                }
                
                await interaction.deferUpdate();
                await this.startGame();
            } else if (interaction.customId.startsWith('answer_')) {
                await this.handleAnswer(interaction);
            }
        });

        collector.on('end', async () => {
            if (!this.ended) {
                await this.end('timeout');
            }
        });
    }

    async startGame() {
        if (this.gameState !== 'waiting') return;
        
        this.gameState = 'active';
        this.currentQuestion = 0;
        
        await this.nextQuestion();
    }

    async nextQuestion() {
        if (this.currentQuestion >= this.maxQuestions) {
            await this.endGame();
            return;
        }

        // Clear previous answers
        this.answers.clear();
        
        // Get question
        const categoryQuestions = this.questions[this.category] || this.questions.general;
        const questionData = categoryQuestions[this.currentQuestion % categoryQuestions.length];
        this.currentQuestionData = questionData;
        
        // Show question
        await this.showQuestion(questionData);
        
        // Start timer
        this.startQuestionTimer(30); // 30 seconds per question
    }

    async showQuestion(questionData) {
        const embed = new EmbedBuilder()
            .setTitle(`🧠 Question ${this.currentQuestion + 1}/${this.maxQuestions}`)
            .setDescription(`**${questionData.question}**`)
            .setColor(0x9B59B6)
            .addFields(
                {
                    name: '⏱️ Time Remaining',
                    value: '30 seconds',
                    inline: true
                },
                {
                    name: '📊 Current Scores',
                    value: this.players.map(p => `${p.user.tag}: ${this.score.get(p.id)}`).join('\n'),
                    inline: true
                }
            );

        // Create answer buttons
        const row = new ActionRowBuilder();
        questionData.options.forEach((option, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`answer_${index}`)
                    .setLabel(option)
                    .setStyle(ButtonStyle.Secondary)
            );
        });

        await this.message.edit({
            embeds: [embed],
            components: [row]
        });
    }

    startQuestionTimer(seconds) {
        let timeLeft = seconds;
        
        this.questionTimer = setInterval(async () => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                clearInterval(this.questionTimer);
                await this.revealAnswer();
            } else {
                // Update timer display
                const embed = this.message.embeds[0];
                const updatedEmbed = EmbedBuilder.from(embed)
                    .spliceFields(0, 1, {
                        name: '⏱️ Time Remaining',
                        value: `${timeLeft} seconds`,
                        inline: true
                    });
                
                await this.message.edit({ embeds: [updatedEmbed] });
            }
        }, 1000);
    }

    async handleAnswer(interaction) {
        if (this.gameState !== 'active') return;
        
        const answerIndex = parseInt(interaction.customId.split('_')[1]);
        const userId = interaction.user.id;
        
        // Check if user already answered
        if (this.answers.has(userId)) {
            await interaction.reply({
                content: 'You already answered this question!',
                ephemeral: true
            });
            return;
        }
        
        // Record answer
        this.answers.set(userId, answerIndex);
        
        await interaction.deferUpdate();
        
        // Check if all players answered
        if (this.answers.size === this.players.length) {
            clearInterval(this.questionTimer);
            await this.revealAnswer();
        }
    }

    async revealAnswer() {
        const questionData = this.currentQuestionData;
        const correctAnswer = questionData.correct;
        
        // Calculate scores
        for (const [userId, answerIndex] of this.answers) {
            if (answerIndex === correctAnswer) {
                const currentScore = this.score.get(userId) || 0;
                this.score.set(userId, currentScore + 1);
            }
        }
        
        // Show results
        const embed = new EmbedBuilder()
            .setTitle(`🧠 Question ${this.currentQuestion + 1} - Results`)
            .setDescription(`**${questionData.question}**\n\n**Correct Answer:** ${questionData.options[correctAnswer]}`)
            .setColor(0x9B59B6)
            .addFields(
                {
                    name: '✅ Correct Answers',
                    value: Array.from(this.answers.entries())
                        .filter(([_, answer]) => answer === correctAnswer)
                        .map(([userId, _]) => {
                            const player = this.players.find(p => p.id === userId);
                            return player ? player.user.tag : 'Unknown';
                        })
                        .join('\n') || 'None',
                    inline: true
                },
                {
                    name: '❌ Incorrect Answers',
                    value: Array.from(this.answers.entries())
                        .filter(([_, answer]) => answer !== correctAnswer)
                        .map(([userId, answer]) => {
                            const player = this.players.find(p => p.id === userId);
                            return player ? `${player.user.tag} (${questionData.options[answer]})` : 'Unknown';
                        })
                        .join('\n') || 'None',
                    inline: true
                },
                {
                    name: '📊 Updated Scores',
                    value: this.players.map(p => `${p.user.tag}: ${this.score.get(p.id)}`).join('\n'),
                    inline: false
                }
            );

        await this.message.edit({
            embeds: [embed],
            components: []
        });

        // Wait before next question
        await this.sleep(3000);
        
        this.currentQuestion++;
        await this.nextQuestion();
    }

    async endGame() {
        this.gameState = 'ended';
        
        // Determine winner
        let winner = null;
        let highScore = 0;
        
        for (const [userId, score] of this.score) {
            if (score > highScore) {
                highScore = score;
                winner = userId;
            }
        }
        
        if (winner) {
            this.winner = winner;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🧠 Trivia Challenge - Game Over!')
            .setDescription(`**Category:** ${this.category}\n**Difficulty:** ${this.difficulty}`)
            .setColor(0x9B59B6)
            .addFields(
                {
                    name: '🏆 Winner',
                    value: winner ? this.players.find(p => p.id === winner)?.user.tag || 'Unknown' : 'No winner',
                    inline: true
                },
                {
                    name: '🎯 High Score',
                    value: `${highScore}/${this.maxQuestions}`,
                    inline: true
                },
                {
                    name: '📊 Final Scores',
                    value: this.players
                        .sort((a, b) => this.score.get(b.id) - this.score.get(a.id))
                        .map(p => `${p.user.tag}: ${this.score.get(p.id)}/${this.maxQuestions}`)
                        .join('\n'),
                    inline: false
                }
            );

        if (winner) {
            const winnerPlayer = this.players.find(p => p.id === winner);
            embed.setThumbnail(winnerPlayer.user.displayAvatarURL());
        }

        await this.message.edit({
            embeds: [embed],
            components: []
        });

        // Award winnings
        if (winner && highScore > 0) {
            await this.awardWinnings(winner, highScore);
        }

        await this.end('completed');
    }

    async awardWinnings(winnerId, score) {
        const winnings = score * 50; // 50 coins per correct answer
        
        const EconomyUser = require('../../database/models/economyUser');
        const economyUser = await EconomyUser.getOrCreateUser(
            this.interaction.guild.id,
            winnerId,
            this.players.find(p => p.id === winnerId).user.tag
        );

        await economyUser.addMoney(winnings, 'GAME', `Won trivia with ${score}/${this.maxQuestions} correct answers`);
        
        // Store winnings for game stats
        this.winnings = { [winnerId]: winnings };
        
        // Send win notification
        await this.interaction.followUp({
            content: `🎉 <@${winnerId}> won **${winnings}** coins for getting ${score}/${this.maxQuestions} questions correct!`
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async end(reason) {
        if (this.ended) return;
        
        this.ended = true;
        
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
        }
        
        if (reason === 'timeout') {
            const embed = new EmbedBuilder()
                .setTitle('🧠 Game Ended')
                .setDescription('Game timed out due to inactivity.')
                .setColor(0xFF0000);

            await this.message.edit({
                embeds: [embed],
                components: []
            });
        }

        // Call parent end method
        await super.end(reason);
    }
}

module.exports = Trivia;
