// Startup file for cPanel "Setup Node.js App".
// Requires `npm run build` first, which compiles the app to ./dist.
const path = require('path');

// Passenger may start the app from the domain's document root,
// so anchor the working directory and .env to this folder.
process.chdir(__dirname);
process.env.ENV_PATH = process.env.ENV_PATH || path.join(__dirname, '.env');

const { createStrapi } = require('@strapi/strapi');

createStrapi({ appDir: __dirname, distDir: path.join(__dirname, 'dist') }).start();
