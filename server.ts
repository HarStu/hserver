import { Elysia, status } from 'elysia'
import { swagger } from '@elysiajs/swagger'
const PORT = 3001

const users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'user', password: 'user123', role: 'basic' }
]

const adminRoutes = new Elysia()
  .onBeforeHandle({ as: 'local' }, (request) => { // pass a function that is going to run before any requests which follow in the chain
    const { username, password } = request.headers
    if (username === undefined || password === undefined) {
      return status(401)
    }

    const checkAdmin = (username: string, password: string): boolean => {
      return users.filter((usr) => usr.username === username && usr.password === password && usr.role === 'admin').length === 1
    }
    if (checkAdmin(username, password)) {
      return status(401)
    }
  })
  .get('/api/protected', () => {
    return {
      message: "This is private information",
    }
  })

const app = new Elysia()
  .get('/api/public', () => {
    return {
      message: "This is public information",
    }
  })
  .get('/api/whoAmI', ({ headers }) => {
    const { username } = headers
    if (username) {
      return `This request was send by ${username}`
    } else {
      return `No user associated with this request`
    }
  })
  .use(adminRoutes)
  .use(swagger({ path: '/api-docs' }))
  .listen(PORT, () => console.log(`server listening at http://localhost:${PORT}`))