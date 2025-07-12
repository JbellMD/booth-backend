import winston from 'winston';
import { env, isProduction } from '../config/env';

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define format for production (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Define format for development (colorized text)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Create transports array
const transports = [
  // Always log to console
  new winston.transports.Console(),
];

// If in production, also log to files
if (isProduction) {
  transports.push(
    // Log errors separately
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // Log all levels
    new winston.transports.File({ filename: 'logs/all.log' }),
  );
}

// Create and export the logger
const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  levels,
  format: isProduction ? productionFormat : developmentFormat,
  transports,
});

export default logger;

// Helper method to log HTTP requests
export const httpLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });
  
  next();
};
