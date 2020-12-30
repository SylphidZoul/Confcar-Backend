exports.success = (res, message, status) => {
  const statusCode = status || 200
  const statusMessage = message || ''

  res.status(statusCode).send({
    error: false,
    status: status,
    body: statusMessage
  })
}
exports.error = (res, message, status, err) => {
  const statusCode = status || 500
  const statusMessage = message || 'Internal server error'
  if (err) console.error(err)

  res.status(statusCode).send({
    error: true,
    status: status,
    body: statusMessage
  })
}
