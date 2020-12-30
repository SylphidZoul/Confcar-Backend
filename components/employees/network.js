const express = require('express')
const controller = require('./controller')
const querystring = require('querystring')
const response = require('../../utils/response')

const router = express.Router()

router.get('/', (req, res) => {
  controller.list()
    .then((data) => {
      response.success(res, data, 200)
    })
    .catch((err) => {
      response.error(res, 'Error en el servidor', 504, err)
    })
})

router.get('/:query', (req, res) => {
  const query = querystring.parse(req.params.query)
  controller.getByQuery(query)
    .then((data) => {
      response.success(res, data, 200)
    })
    .catch((err) => {
      response.error(res, err.message, 400, err)
    })
})

router.post('/', (req, res) => {
  controller.upsert(req.body)
    .then((data) => {
      response.success(res, data, 201)
    })
    .catch((err) => {
      response.error(res, err.message, 400, err)
    })
})

router.put('/', (req, res) => {
  controller.update(req.body)
    .then((data) => {
      response.success(res, data, 201)
    })
    .catch((err) => {
      response.error(res, err.message, 400, err)
    })
})

router.delete('/:id', (req, res) => {
  controller.remove(req.params.id)
    .then((data) => {
      response.success(res, data, 201)
    })
    .catch((err) => {
      response.error(res, err.message, 400, err)
    })
})

module.exports = router
