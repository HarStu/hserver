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
      exp: Math.floor(Date.now() / 1000) + (30)
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

const profile = new Elysia()
  .use(cookiePlugin)
  .use(jwtPlugin)
  .get('/api/profile', async ({ jwt, cookie }) => {
    console.log(`Visiting /profile`)
    const authToken = cookie.authToken!.value
    if (!authToken) {
      console.log(`No authToken found in cookie`)
      return status(401)
    } else {
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

        const user_profile = users.find(usr => usr.id === payload.id)

        console.log(`Here is your profile: ${JSON.stringify(user_profile)}`)

      } catch {
        console.log(`JWT token verification error`)
        cookie.authToken?.remove()
        return status(401)
      }
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
  .listen(PORT, () => console.log(`server listening at http://localhost:${PORT}`))