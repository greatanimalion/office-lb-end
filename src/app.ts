
import express, { Application } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import passport from 'passport'
import session from 'express-session'
import config from './config/index'
import routes from './routes/index'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware'
import { apiLimiter } from './middlewares/rateLimit.middleware'
import { ensureDirectoryExists } from './utils/file'
import logger from './utils/logger'
import { initMeiliSearch } from './utils/MeiliSearch'
import './config/passport'
import { getDB } from './db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const createApp = (): Application => {
  initMeiliSearch()
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  ensureDirectoryExists(config.uploads.documents)
  ensureDirectoryExists(config.uploads.temp)
  ensureDirectoryExists(config.uploads.versions)
  ensureDirectoryExists(config.uploads.previews)
  ensureDirectoryExists(config.logs.dir)

  app.use(session({
    secret: config.auth.sessionSecret,
    resave: false,
    saveUninitialized: false,// 不保存未初始化的会话,节省内存
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }))
  app.use((req, res, next) => {
    //允许非同源请求
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', '*')
    res.header('Access-Control-Allow-Headers', '*')
    console.log(req.method, req.url)
    next()
  })
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(express.static(path.join(__dirname, '../public')))
  app.use('/api', apiLimiter)
  app.use('/api', routes)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

export const startServer = async (): Promise<void> => {
  const app = createApp()
  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} http://localhost:${config.port}`)
    logger.info(`Environment: ${config.nodeEnv}`)
  })

  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`)

    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down')
      process.exit(1)
    }, 10000)
  }

  await makSureAdminUserExist()
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}

async function makSureAdminUserExist() {
  const prisma = getDB()
  const user = await prisma.user.findUnique({ where: { email: '15294745236@163.com' } })
  if (user) {
    await prisma.user.update({
      where: { email: '15294745236@163.com' },
      data: { role: 'admin' },
    })
  }
}


