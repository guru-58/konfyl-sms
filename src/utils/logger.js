import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../../logs');
const logFile = path.join(logDir, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString();
}

function writeToFile(level, message, error) {
  const timestamp = getTimestamp();
  let logMessage = `[${timestamp}] [${level}] ${message}\n`;
  if (error) {
    logMessage += `Stack: ${error.stack || error}\n`;
  }
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}

const logger = {
  info(message) {
    const timestamp = getTimestamp();
    console.log(`\x1b[32m[${timestamp}] [INFO]\x1b[0m ${message}`);
    writeToFile('INFO', message);
  },
  warn(message) {
    const timestamp = getTimestamp();
    console.warn(`\x1b[33m[${timestamp}] [WARN]\x1b[0m ${message}`);
    writeToFile('WARN', message);
  },
  error(message, error = null) {
    const timestamp = getTimestamp();
    console.error(`\x1b[31m[${timestamp}] [ERROR]\x1b[0m ${message}`, error || '');
    writeToFile('ERROR', message, error);
  }
};

export default logger;
