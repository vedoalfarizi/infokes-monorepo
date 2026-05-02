// App entry point — mounts ElysiaJS modules and starts the server
// Full implementation in task 5
import { Elysia } from 'elysia'

const app = new Elysia()
  .get('/', () => ({ status: 'ok' }))

app.listen(3000)

console.log(`File Explorer API running at http://localhost:${app.server?.port}`)

export { app }
