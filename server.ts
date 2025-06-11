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
      return status(401)
    } else {
      const user = users.find((usr) => usr.username === username && usr.password === password)
      if (!user) {
        return status(401)
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

// obtains a user's information from an auth header or cookie
const retrieveUser = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .derive(({ as: 'global' }), async ({ jwt, cookie, headers }) => {
    const authToken = cookie.authToken!.value
    if (!authToken) {
      console.log(`No authToken found in cookie`)
      return status(401)
    }

    try {
      const payload = await jwt.verify(authToken)

      // throw error on bad payload
      if (!payload) {
        console.log(`JWT token not valid`)
        cookie.authToken?.remove()
        return status(401)
      }

      // throw error if token expired or no expiry set
      if (payload.exp === undefined || payload.exp < Math.floor(Date.now() / 1000)) {
        console.log(`Token expired or invalid`)
        cookie.authToken?.remove()
        return status(401)
      }

      // find the user
      const user = users.find(usr => usr.id === payload.id)
      if (!user) {
        console.log(`User does not exist`)
        return status(401)
      }

      console.log(`Here is your profile: ${JSON.stringify(user)}`)

      // return the user
      return { user }

    } catch {
      console.log(`JWT token verification error`)
      cookie.authToken?.remove()
      return status(401)
    }
  })

const profile = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .use(retrieveUser)
  .get('/api/profile', async ({ user }) => {
    console.log(`Visiting /profile`)
    return `Here is your profile: ${JSON.stringify(user)}`
  })

const protectedRoutes = new Elysia()
  .use(retrieveUser)
  .onBeforeHandle(({ user }) => {
    if (user.role !== 'admin') {
      return {
        message: "Permission Denied: This path is admin-only",
        status: 400
      }
    }
  })
  .get('/api/private', () => {
    return {
      message: "Top secret, admins only!!!",
      status: 200
    }
  })

const app = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .use(swagger({ path: '/api-docs' }))
  .get('/api/public', () => {
    console.log('PLEASE OH MY GOD')
    return {
      message: "This is public information",
    }
  })
  .use(login)
  .use(profile)
  .use(protectedRoutes)
  .listen(PORT, () => console.log(`server listening at http://localhost:${PORT}`))