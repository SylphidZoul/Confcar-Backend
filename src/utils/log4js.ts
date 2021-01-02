import log4js from 'log4js'
import { DateTime } from 'luxon'

log4js.addLayout('date', () => {
  return (logEvent) => {
    return `[${DateTime.local().toFormat('yyyy/MM/dd hh:mm')}] - El día ${logEvent.data} de algún empleado no fue cerrado correctamente.`
  }
})

log4js.configure({
  appenders: {
    Dia: {
      type: 'file',
      filename: 'Días_No_Cerrados.log',
      layout: {
        type: 'date'
      }
    }
  },
  categories: {
    default: {
      appenders: ['Dia'],
      level: 'error'
    }
  }
})

export const logger = log4js.getLogger()

