import { createClient } from 'redis'
import { logger } from '@/utils'

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
})

redisClient.on('error', (err) => logger.error('Redis Error:', err))

redisClient.connect().catch((err) => {
  logger.error('Redis Connect Error:', err)
  process.exit(1)
})

export default redisClient
