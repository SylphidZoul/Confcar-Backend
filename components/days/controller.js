const { DateTime, Duration } = require('luxon')
const scheduleKeys = ['day_start', 'lunch_start', 'lunch_end', 'day_end', 'extraPause_start', 'extraPause_end']
const store = require('../../store/mysql')

const getHoursPerDay = (rawDay) => {
  const [dayStart, lunchStart, lunchEnd, dayEnd, pauseStart, pauseEnd] = rawDay

  if ((dayStart && !lunchStart) || (lunchEnd && !dayEnd)) {
    const today = DateTime.local()
    if (today.day !== dayStart.day || today.hour > 19) {
      console.error(`Día ${dayStart.toISODate()} no cerrado correctamente`)
      return Duration.fromMillis(0)
    }
  }

  let pauseInterval = null
  if (pauseStart && pauseEnd) {
    pauseInterval = pauseStart.diff(pauseEnd)
  }

  let firstInterval
  if (!lunchStart) {
    firstInterval = dayStart.diffNow()
    if (pauseInterval) return firstInterval.minus(pauseInterval).negate()
    return firstInterval.negate()
  }
  firstInterval = dayStart.diff(lunchStart)

  if (!lunchEnd) {
    if (pauseInterval) return firstInterval.minus(pauseInterval).negate()
    return firstInterval.negate()
  }

  let secondInterval
  if (!dayEnd) {
    secondInterval = lunchEnd.diffNow()
  } else {
    secondInterval = lunchEnd.diff(dayEnd)
  }

  const dayTotalHours = firstInterval.plus(secondInterval)

  if (pauseInterval) return dayTotalHours.minus(pauseInterval).negate()

  return dayTotalHours.negate()
}

const getHoursPerWeek = async (id, week) => {
  const workedWeek = await store.query('days',
    'day_start, lunch_start, lunch_end, day_end, extraPause_start, extraPause_end',
    `employee_id = ${id} AND week = ${week}`
  )
  if (workedWeek.length === 0) return Duration.fromMillis(0)

  const luxonDates = workedWeek.map(day => {
    return Object.keys(day).map(key => {
      if (!day[key]) return null
      return DateTime.fromJSDate(day[key])
    })
  }
  )

  const totalTimePerDay = luxonDates.map(day => getHoursPerDay(day))
  const totalTimePerWeek = totalTimePerDay.reduce((a, b) => a.plus(b))

  return totalTimePerWeek
}

const getDateDetails = async (date, id) => {
  const dbResponse = await store.query('days',
    'day_date, day_start, lunch_start, lunch_end, day_end, extraPause_start, extraPause_end, week, employees.fullname',
    `day_date='${date}' and days.employee_id=${id}`,
    { employees: 'employee_id' })

  if (dbResponse.length === 0) throw Error('No se ha podido encontrar esa fecha')

  const details = dbResponse[0]

  const luxonDates = Object.keys(details)
    .filter(key => scheduleKeys.includes(key))
    .map(key => {
      if (!details[key]) return null
      return DateTime.fromJSDate(details[key])
    })

  const workedHours = getHoursPerDay(luxonDates).toFormat('hh:mm')

  const formatedDetails = Object.keys(details).reduce((acc, key) => {
    if (!scheduleKeys.includes(key)) {
      if (key === 'day_date') {
        const formatedDate = DateTime.fromJSDate(details.day_date).toLocaleString(DateTime.DATE_SHORT)
        return { ...acc, [key]: formatedDate }
      }
      return { ...acc, [key]: details[key] }
    }
    if (!details[key]) return { ...acc, [key]: 0 }
    const formatedTime = DateTime.fromJSDate(details[key]).toLocaleString(DateTime.TIME_24_SIMPLE)
    return { ...acc, [key]: formatedTime }
  }, {})

  return { ...formatedDetails, workedHours }
}

const getEmployeeSummary = async (id, week) => {
  let weekNumber
  if (!week) {
    weekNumber = DateTime.local().weekNumber
  } else {
    weekNumber = week
  }
  const rawHours = await getHoursPerWeek(id, weekNumber)
  const weekHours = rawHours.toFormat('hh:mm')
  const [{ fullname, hourly_pay: hourlyPay }] = await store.query('employees', 'fullname, hourly_pay', `employee_id = ${id}`)
  const weekPay = Math.ceil(rawHours.as('hours') * hourlyPay)

  const weekDates = await store.query('days', 'day_date', `week = ${weekNumber} and employee_id = ${id}`)
  const detailedDays = await Promise.all(weekDates.map(async (day) => {
    const formatedDate = DateTime.fromJSDate(day.day_date).toSQLDate()
    return await getDateDetails(formatedDate, id)
  }))

  return { weekHours, weekPay, fullname, rawHours, detailedDays }
}

const getWeekTotalSummary = async () => {
  const employeesId = await store.list('employees', 'employee_id')

  const detailsPerEmployee = await Promise.all(employeesId.map(async (employee) => {
    const employeeHours = await getEmployeeSummary(employee.employee_id)
    return employeeHours
  }))

  const total = detailsPerEmployee.reduce((a, b) => {
    return { rawHours: a.rawHours.plus(b.rawHours), weekPay: a.weekPay + b.weekPay }
  })
  const hours = total.rawHours.toFormat('h:m')

  return { hours, pay: total.weekPay, detailsPerEmployee }
}

const getByQuery = async (query) => {
  if (query.date && query.employee_id) return getDateDetails(query.date, query.employee_id)
  if (query.employee_id) return getEmployeeSummary(query.employee_id, query.week)

  throw Error('Parametros inválidos')
}

const markSchedules = async (body) => {
  if (!body.id) throw Error('No se encontro el id.')
  const today = DateTime.local()
  const dayName = today.get('weekdayShort')
  if (dayName === 'Sat' || dayName === 'Sun') throw Error('Día no laboral.')
  /* if (today.hour <= 7 || today.hour >= 19) throw Error('Horario no laboral.') */

  const startedDay = await store.query('days', '*', `employee_id = ${body.id} AND day_date = '${today.toSQLDate()}'`)

  if (startedDay.length === 0) {
    const newDay = {
      day_date: DateTime.local().toSQLDate(),
      employee_id: body.id,
      week: DateTime.local().weekNumber
    }
    const newData = await store.upsert('days', newDay)
    const hour = DateTime.fromJSDate(newData.day_start).toLocaleString(DateTime.TIME_24_SIMPLE)

    return { day_start: hour }
  }

  const day = startedDay[0]
  let scheduleToMark

  if (body.extraPause) {
    scheduleToMark = day.extraPause_start ? 'extraPause_end' : 'extraPause_start'
  } else {
    const basicSchedule = scheduleKeys.slice(1, 4)
    scheduleToMark = Object.keys(day).find((key) => {
      return (basicSchedule.includes(key) && !day[key])
    })
  }

  if (!scheduleToMark) throw Error('Día laboral finalizado.')

  const dayUpdate = {
    id: day.id,
    [scheduleToMark]: DateTime.local()
  }
  const newData = await store.upsert('days', dayUpdate)
  const hour = DateTime.fromJSDate(newData[scheduleToMark]).toLocaleString(DateTime.TIME_24_SIMPLE)

  return { [scheduleToMark]: hour }
}

const updateDate = async (body) => {
  if (!body.date || !body.employee_id) throw Error('Datos faltantes')

  const dayExist = await store.query('days', 'id',
    `day_date = '${body.date}' and employee_id = ${body.employee_id}`
  )

  if (dayExist.length === 0) throw Error('No se encontro esa fecha.')

  const dayUpdate = scheduleKeys.reduce((update, key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      update[key] = body[key]
    }
    return update
  }, { id: dayExist[0].id })

  if (Object.keys(dayUpdate).length === 0) throw Error('No hay ningún valor a cambiar.')

  const updatedData = await store.upsert('days', dayUpdate)
  const formatedDate = DateTime.fromJSDate(updatedData.day_date).toSQLDate()

  return getDateDetails(formatedDate, updatedData.employee_id)
}

const deleteDate = async (query) => {
  const dayExist = await store.query('days', 'id',
    `day_date = '${query.date}' and employee_id = ${query.employee_id}`
  )

  if (dayExist.length === 0) throw Error('No se encontro esa fecha.')

  const removedDay = await store.remove('days', `id = ${dayExist[0].id}`)
  if (!removedDay) throw Error('No se ha podido borrar esa fila.')

  return { message: 'Día eliminado correctamente.', date: query.date, employee_id: query.employee_id }
}

module.exports = {
  getWeekTotalSummary,
  getByQuery,
  markSchedules,
  updateDate,
  deleteDate
}
