import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'
import config from '../config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? '\n' + stack : ''}`
  })
)

const logger = winston.createLogger({
  level: config.logs.level,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(config.logs.dir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(config.logs.dir, 'combined.log'),
    }),
  ],
})

export default logger