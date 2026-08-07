module.exports = {
  apps: [
    {
      name: "dwip-enterprise-server",
      script: "./dist/server.cjs",
      instances: "max", // utilizes all CPU cores in cluster mode
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      env_pilot: {
        NODE_ENV: "pilot",
        PORT: 3001
      },
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      autorestart: true,
      max_memory_restart: "2G"
    }
  ]
};
