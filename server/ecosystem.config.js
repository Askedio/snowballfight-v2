const os = require('node:os');

module.exports = {
    apps: [{
        name: "colyseus-app",
        script: 'lib/index.js',
        time: true,
        watch: false,
        instances: os.cpus().length,
        exec_mode: 'fork',
        wait_ready: true,
        env_production: {
            NODE_ENV: 'production'
        }
    }],
};