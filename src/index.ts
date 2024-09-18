import { redisClient } from './db'
import { StrategyManager } from './strategy-manager'
import { logger } from './utils'

const main = async () => {
  const stop = await StrategyManager.run()
  process.on('SIGINT', async () => {
    logger.info('Stopping...')
    try {
      stop()
      await redisClient.quit()
      logger.info('Stopped')
      process.exit(0)
    } catch (error) {
      logger.error(error)
      process.exit(-1)
    }
  })
}

main().catch((error) => {
  logger.error(error)
  process.exit(-1)
})
