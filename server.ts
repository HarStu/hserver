import { Elysia, status } from 'elysia'
import { swagger } from '@elysiajs/swagger'
const PORT = 3001

const users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', secret: "admin-secret-123" },
  { id: 2, username: 'user', password: 'user123', role: 'basic', secret: "user-secret-456" }
]

const adminRoutes = new Elysia()
  .onBeforeHandle({ as: 'local' }, (request) => { // pass a function that is going to run before any requests which follow in the chain
    const { authorization } = request.headers
    console.log(`req with the following headers: ${JSON.stringify(request.headers)}`)
    if (authorization === undefined) {
      console.log(`You don't even have the right header, doofus`)
      return status(401)
    }

    const checkAdmin = (secret: string): boolean => {
      const reqUser = users.find((usr) => secret.includes(usr.secret))
      if (reqUser && reqUser.role === 'admin') {
        return true
      } else {
        return false
      }
    }
    if (!checkAdmin(authorization)) {
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