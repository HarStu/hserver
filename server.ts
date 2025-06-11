import express from 'express'
import cors from 'cors'

const PORT = 3001
const app = express()

app.use(express.json())
app.use(cors())

app.get('/api/public', (req, res) => {
  res.status(200).json({ message: 'This is public information' })
})

app.get('/api/protected', (req, res) => {
  res.status(200).json({ message: 'Only admin should be able to see this' })
})


app.listen(PORT, () => console.log(`Server is now listening at http://localhost:${PORT}`))
