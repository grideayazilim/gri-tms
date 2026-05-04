/* ========================================================================
   WINSTON LOGGER
   Yapılandırılmış JSON log çıktısı — Docker stdout üzerinden capture edilir.
   Development'ta renkli, production'da makine-okunabilir JSON formatında.
   ======================================================================== */
import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    const stackStr = stack ? `\n${String(stack)}` : '';
    return `${String(timestamp)} [${level}] ${String(message)}${metaStr}${stackStr}`;
  }),
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  format: isDev ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
