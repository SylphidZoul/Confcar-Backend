const express = require('express')
const router = express.Router()
const controller = require('./controller')
const response = require('../../utils/response')

router.get('/', (req, res) => {
  controller.list()
    .then((data) => {
      response.success(req, res, data, 200)
    })
    .catch((err) => {
      response.error(req, res, 'Error en el servidor', 504, err)
    })
})

router.post('/', (req, res) => {
  controller.upsert(req.body)
    .then((data) => {
      response.success(req, res, data, 201)
    })
    .catch((err) => {
      response.error(req, res, err.message, 504, err)
    })
})

module.exports = router
