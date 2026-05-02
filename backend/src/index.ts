// App entry point — mounts ElysiaJS modules and starts the server
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { NotFoundError } from './shared/errors.js'
import { foldersModule } from './modules/folders/index.js'

const app = new Elysia()
  // Enable CORS for the Vite frontend dev server
  .use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    })
  )
  // Mount the folders feature module
  .use(foldersModule)
  // Global error handler
  .onError(({ code, error, set }) => {
    if (error instanceof NotFoundError) {
      set.status = 404
      return { error: { code: 'NOT_FOUND', message: error.message } }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: { code: 'INVALID_UUID', message: 'Invalid UUID parameter' } }
    }
    // Log and return 500 for all unhandled errors
    console.error(error)
    set.status = 500
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  })

app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000)

console.log(`File Explorer API running at http://localhost:${app.server?.port}`)

export { app }
