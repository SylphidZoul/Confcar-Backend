import express from 'express'
import Store from './store/mysql'
import employees from './components/employees/network'
/* import days from './components/days/network'
 */import { config } from './config'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/employees', employees)
/* app.use('/days', days)
 */
Store.instance.handleConnection()
app.listen(config.api.port, () => {
  console.log('Escuchando puerto: ', config.api.port)
})

