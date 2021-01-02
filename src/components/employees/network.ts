import express from 'express'
import controller from './controller'
import Response from '../../utils/response'
const router = express.Router()

router.get('/', (req, res) => {
  controller.list()
    .then((data) => {
      Response.success(res, data, 200)
    })
    .catch((err) => {
      Response.error(res, 'Error en el servidor', 504, err)
    })
})

router.get('/:query', (req, res) => {
  controller.getByQuery(req.params.query)
    .then((data) => {
      Response.success(res, data, 200)
    })
    .catch((err) => {
      Response.error(res, err.message, 400, err)
    })
})

router.post('/', (req, res) => {
  controller.upsert(req.body)
    .then((data) => {
      Response.success(res, data, 201)
    })
    .catch((err) => {
      Response.error(res, err.message, 400, err)
    })
})

router.put('/', (req, res) => {
  controller.update(req.body)
    .then((data) => {
      Response.success(res, data, 201)
    })
    .catch((err) => {
      Response.error(res, err.message, 400, err)
    })
})

router.delete('/:id', (req, res) => {
  controller.remove(req.params.id)
    .then((data) => {
      Response.success(res, data, 201)
    })
    .catch((err) => {
      Response.error(res, err.message, 400, err)
    })
})

export default router
