const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in packages/database/.env');
}

module.exports = {
  datasource: {
    url: process.env.DATABASE_URL
  }
};
