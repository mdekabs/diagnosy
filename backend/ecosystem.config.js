module.exports = {
  apps: [
    {
      name: "Diagnosy API",
      script: "npm run server",
      watch: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
