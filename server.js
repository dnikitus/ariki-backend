// Startup file for cPanel "Setup Node.js App".
// Requires `npm run build` first, which compiles the app to ./dist.
const { createStrapi } = require('@strapi/strapi');

createStrapi({ distDir: './dist' }).start();
