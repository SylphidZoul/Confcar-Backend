const express = require('express')
const controller = require('./controller')
const querystring = require('querystring')
const response = require('../../utils/response')

const router = express.Router()

router.get('/', (req, res) => {
  controller.getWeekTotalSummary()
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
      response.error(res, err.message, 404, err)
    })
})

router.post('/', (req, res) => {
  controller.markSchedules(req.body)
    .then((data) => {
      response.success(res, data, 201)
    })
    .catch((err) => {
      response.error(res, err.message, 400, err)
    })
})

router.put('/', (req, res) => {
  controller.updateDate(req.body)
    .then((data) => {
      response.success(res, data, 201)
    })
    .catch((err) => {
      response.error(res, err.message, 400, err)
    })
})

router.delete('/:query', (req, res) => {
  const query = querystring.parse(req.params.query)
  controller.deleteDate(query)
    .then((data) => {
      response.success(res, data, 201)
    })
    .catch((err) => {
      response.error(res, err.message, 400, err)
    })
})

module.exports = router
