import { Response as Res } from 'express'

class Response {
  static success = (res: Res, message: string, status: number): void => {
    const statusCode = status || 200
    const statusMessage = message || ''
  
    res.status(statusCode).send({
      error: false,
      status: status,
      body: statusMessage
    })
  }

  static error = (res: Res, message: string, status: number, err: any): void => {
    const statusCode = status || 500
    const statusMessage = message || 'Internal server error'
    if (err) console.error(err)
  
    res.status(statusCode).send({
      error: true,
      status: status,
      body: statusMessage
    })
  }
}

export default Response
