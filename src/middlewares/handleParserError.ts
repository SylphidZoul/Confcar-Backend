import { Request, Response, NextFunction } from 'express'
import response from '../utils/response'

const handleParserError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError) {
      return response.error(res, 'Invalid JSON body', 400, err)
  }
  next()
}

export default handleParserError