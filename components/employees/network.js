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
      console.log(err.message)
      response.error(req, res, err.message, 400, err)
    })
})

router.put('/', (req, res) => {
  controller.update(req.body)
    .then((data) => {
      console.log(data)
      response.success(req, res, data, 201)
    })
    .catch((err) => {
      console.log(err.message)
      response.error(req, res, err.message, 400, err)
    })
})

router.delete('/:id', (req, res) => {
  controller.remove(req.params.id)
    .then((data) => {
      console.log(data)
      response.success(req, res, data, 201)
    })
    .catch((err) => {
      console.log(err.message)
      response.error(req, res, err.message, 400, err)
    })
})

module.exports = router
