import { createLogger, format, transports } from 'winston'
const { uncolorize, colorize, timestamp, printf, combine } = format

const isProd = process.env.ENV === 'production'

export const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss:SSS',
    }),
    format((info) =>
      Object.assign(info, {
        level: info.level.toUpperCase(),
      })
    )(),
    isProd ? uncolorize() : colorize({ all: true }),
    printf(({ timestamp, level, message, ...defaultMeta }) => {
      return `${timestamp} - [${level}] - ${message}`
    })
  ),
  transports: isProd
    ? [
        new transports.Console(),
        new transports.File({
          filename: './logs/log.log',
          level: 'info',
        }),
        new transports.File({
          filename: './logs/errors.log',
          level: 'error',
        }),
      ]
    : [new transports.Console()],
})
