import express from 'express'
import controller from './controller'
import querystring from 'querystring'
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
  const query = querystring.parse(req.params.query) as EmployeeData
  controller.getByQuery(query)
    .then((data: Array<EmployeeData>) => {
      Response.success(res, data, 200)
    })
    .catch((err) => {
      Response.error(res, err.message, err.status, err)
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
