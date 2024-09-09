import { StrategyManager } from './strategy-manager'
import { logger } from './utils'

const main = async () => {
  StrategyManager.run()
}

main().catch((error) => {
  logger.error(error)
  process.exit(-1)
})
