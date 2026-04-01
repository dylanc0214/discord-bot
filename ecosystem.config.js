module.exports = {
    apps: [
        {
            name: 'discord-bot',
            script: './src/index.js',
            cwd: '/root/discord-bot',
            env_file: '/root/discord-bot/.env',
            watch: false,
            instances: 1,
            exec_mode: 'fork',
            max_memory_restart: '512M',
            restart_delay: 5000,
            max_restarts: 10,
            min_uptime: '10s',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            out_file: '/root/discord-bot/logs/out.log',
            error_file: '/root/discord-bot/logs/error.log',
            merge_logs: true,
            env: {
                NODE_ENV: 'production',
                DASHBOARD_PORT: 8085
            }
        }
    ]
};
