import { Elysia, status } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cookie } from '@elysiajs/cookie'
import { jwt } from '@elysiajs/jwt'
const PORT = 3001

const users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', secret: "admin-secret-123" },
  { id: 2, username: 'user', password: 'user123', role: 'basic', secret: "user-secret-456" }
]

const SECRETKEY = 'Top Secret Harrison'

const jwtPlugin = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: SECRETKEY
    })
  )

const cookiePlugin = new Elysia()
  .use(cookie({
    secure: false,
    httpOnly: true,
  }))

// logs in and stores a JWT cookie for the user's login
const login = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .derive({ as: 'local' }, (request) => {
    const { username, password } = request.headers
    if (username === undefined || password === undefined) {
      return status(400, `Username or password missing`)
    } else {
      const user = users.find((usr) => usr.username === username && usr.password === password)
      if (!user) {
        return status(400, `User not found`)
      } else {
        return { user: user }
      }
    }
  })
  .post('/api/login', async ({ cookie, jwt, user }) => {
    // create JWT token payload
    const tokenPayload = {
      id: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60)
    }
    // sign JWT token
    const token = await jwt.sign(tokenPayload)

    // set authToken cookie
    cookie.authToken?.set({
      value: token,
      maxAge: 60 * 60,
      path: '/'
    })

    // return JWT token
    return token
  })

const authUser = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .derive(({ as: 'global' }), async ({ jwt, cookie, headers }) => {
    // Grab cookie token if available, header token if not
    const token = cookie.authToken?.value ?? headers.auth

    // throw error if not token available at all
    if (!token) {
      console.log(`User is not logged in`)
      return status(400, `User is not logged in`);
    }

    try {
      const payload = await jwt.verify(token)

      // throw error on bad payload
      if (!payload) {
        console.log(`User token invalid. Please try again.`)
        cookie.authToken?.remove()
        return status(400, `User token invalid. Please try again.`);
      }

      // throw error if token expired or no expiry set
      if (payload.exp === undefined || payload.exp < Math.floor(Date.now() / 1000)) {
        console.log(`Invalid payload in user token`)
        cookie.authToken?.remove()
        return status(400, `Invalid payload in user token`)
      }

      // find the user
      const user = users.find(usr => usr.id === payload.id)
      if (!user) {
        console.log(`User does not exist`)
        return status(400, `User does not exist`);
      }

      console.log(`Here is your profile: ${JSON.stringify(user)} `)

      // return the user
      return { user }

    } catch {
      console.log(`JWT token verification error`)
      cookie.authToken?.remove()
      return status(400, `Error while validating user identity`);
    }
  })

const profile = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .use(authUser)
  .get('/api/profile', async ({ user }) => {
    console.log(`Visiting / profile`)
    return `Here is your profile: ${JSON.stringify(user)} `
  })

const protectedRoutes = new Elysia()
  .use(authUser)
  .onBeforeHandle(({ user }) => {
    if (!user) {
      return status(400, {
        message: "Error: Not logged in",
      })
    }
    if (user.role !== 'admin') {
      return status(400, {
        message: "Permission Denied: This path is admin-only",
      })
    }
  })
  .get('/api/private', () => {
    return status(200, {
      message: "Top secret, admins only!!!",
    })
  })

const chatRoutes = new Elysia()
  .use(authUser)
  .onBeforeHandle(({ user }) => {
    if (!user) {
      return status(400, `Login error. Please try to log in again`)
    }
  })
  .post('/api/chat', ({ user }) => {
    return status(200, {
      message: `placeholder for chat POST`
    })
  })
  .get('/api/chat/history', ({ user }) => {
    return status(200, {
      message: `placeholder for chat history`
    })
  })
  .delete('/api/chat/history', ({ user }) => {
    return status(200, {
      message: `placeholder for clearing chat history`
    })
  })


const app = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .use(swagger({ path: '/api-docs' }))
  .get('/api/public', () => {
    return status(200, {
      message: "This is public information",
    })
  })
  .use(login)
  .use(profile)
  .use(chatRoutes)
  .listen(PORT, () => console.log(`server listening at http://localhost:${PORT}`))