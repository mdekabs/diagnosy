module.exports = {
  apps: [
    {
      name: "Diagnosy",
      script: "npm run server",
      watch: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
