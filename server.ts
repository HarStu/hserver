import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
const PORT = 3001

new Elysia()
  .get('/api/public', () => {
    return {
      message: "This is public information",
    }
  })
  .get('/api/protected', () => {
    return {
      message: "Only admin should bea able to see this",
    }
  })
  .use(swagger({ path: '/api-docs' }))
  .listen(PORT, () => console.log(`server listening at http://localhost:${PORT}`))