const express = require('express')
const path = require('path')
const employees = require('./components/employees/network')
const days = require('./components/days/network')
const config = require('./config')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.use('/employees', employees)
app.use('/days', days)

app.listen(config.api.port, () => {
  console.log('Escuchando puerto: ', config.api.port)
})

module.exports = app
