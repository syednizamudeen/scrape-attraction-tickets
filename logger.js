const fs = require('fs');

function log(message) {
  const now = new Date();
  const timestamp = now.toISOString();
  const logMsg = `[${timestamp}] ${message}`;
  console.log(logMsg);
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const logDir = 'logs';
  const logFile = `${logDir}/scraper_${dateStr}.log`;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(logFile, logMsg + '\n', 'utf8');
}

module.exports = { log };
