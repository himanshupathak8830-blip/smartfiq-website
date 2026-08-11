const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  GOOGLE_SHEETS_URL: process.env.GOOGLE_SHEETS_URL || process.env.GOOGLE_SHEET_URL || 'https://script.google.com/macros/s/AKfycbxOnGtaB0r8Pwh5gi-B5QsXNa-LKpNG255KyFVGdoyZpV9r2iwt51rMeSpw273S9Rc/exec',
  GOOGLE_SHEETS_SECRET: process.env.GOOGLE_SHEETS_SECRET || 'SmartFiQ_Google_Sheets_Secret_2026',
  JWT_SECRET: process.env.JWT_SECRET || 'SmartFiQ_JWT_Secret_Key_2026_Production_Secure_X9!',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8841778238:AAHOmeQHKc8MiBpOTnov-defOCzBHdIkOI0',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '-5570843599'
};
