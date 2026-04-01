const chalk = require('chalk');
// Import the shared Sequelize instance (created in modelHelper.js using env vars)
const { sequelize } = require('./models/modelHelper');

// Re-export for any other modules that need it
module.exports.sequelize = sequelize;

// Connect + sync function
async function connect() {
    console.log(chalk.blue(chalk.bold(`Database`)), chalk.white(`>>`), chalk.red(`MySQL`), chalk.green(`is connecting...`));
    try {
        await sequelize.authenticate();
        console.log(chalk.blue(chalk.bold(`Database`)), chalk.white(`>>`), chalk.red(`MySQL`), chalk.green(`is ready!`));

        // Import all models so Sequelize knows about all tables
        require('./models');

        // Sync all tables (creates if not exists, never drops or alters)
        await sequelize.sync({ force: false, alter: false });
        console.log(chalk.blue(chalk.bold(`Database`)), chalk.white(`>>`), chalk.red(`MySQL`), chalk.green(`tables synced!`));
    } catch (err) {
        console.log(chalk.red(`[ERROR]`), chalk.white(`>>`), chalk.red(`MySQL`), chalk.white(`>>`), chalk.red(`Failed to connect!`), chalk.white(`>>`), chalk.red(`Error: ${err}`));
        console.log(chalk.red('Exiting...'));
        process.exit(1);
    }
}

module.exports = async () => await connect();