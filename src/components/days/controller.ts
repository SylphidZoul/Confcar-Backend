import { DateTime, Duration } from 'luxon'
import querystring from 'querystring'
import { logger } from '../../utils/log4js'
import store from '../../store/mysql'

const scheduleKeys = ['day_start', 'lunch_start', 'lunch_end', 'day_end', 'extraPause_start', 'extraPause_end']

const getHoursPerDay = (rawDay: Array<DateTime>) => {
  const [dayStart, lunchStart, lunchEnd, dayEnd, pauseStart, pauseEnd] = rawDay

  if ((dayStart && !lunchStart) || (lunchEnd && !dayEnd)) {
    const today = DateTime.local()
    if (today.day !== dayStart.day || today.hour > 19) {
      logger.error(dayStart.toISODate())
      return Duration.fromMillis(0)
    }
  }

  let pauseInterval: Duration = null
  if (pauseStart && pauseEnd) {
    pauseInterval = pauseStart.diff(pauseEnd)
  }

  let firstInterval: Duration
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

  let secondInterval: Duration
  if (!dayEnd) {
    secondInterval = lunchEnd.diffNow()
  } else {
    secondInterval = lunchEnd.diff(dayEnd)
  }

  const dayTotalHours = firstInterval.plus(secondInterval)

  if (pauseInterval) return dayTotalHours.minus(pauseInterval).negate()

  return dayTotalHours.negate()
}

const getHoursPerWeek = async (id: number, week: number, year: number) => {
  const workedWeek = await store.instance.query(
    'days',
    'day_start, lunch_start, lunch_end, day_end, extraPause_start, extraPause_end',
    `employee_id = ${id} and week = ${week} AND year(day_date) = ${year}`
  ) as Array<DayDetails>

  if (workedWeek.length === 0) return Duration.fromMillis(0)

  const luxonDates = workedWeek.map(day => {
    return Object.keys(day).map((key: keyof DayDetails) => {
      if (!day[key]) return null
      return DateTime.fromJSDate(day[key])
    })
  })

  const totalTimePerDay = luxonDates.map(day => getHoursPerDay(day))
  const totalTimePerWeek = totalTimePerDay.reduce((a, b) => a.plus(b))

  return totalTimePerWeek
}

const getDateDetails = async (date: string | DateTime, id: string) => {
  const dbResponse = await store.instance.query(
    'days',
    'day_date, day_start, lunch_start, lunch_end, day_end, extraPause_start, extraPause_end, week, employees.fullname',
    `day_date='${date}' and days.employee_id=${id}`,
    { employees: 'employee_id' }) as Array<DayData>

  if (dbResponse.length === 0) throw Error('No se ha podido encontrar la fecha de ese empleado.')

  const details = dbResponse[0]

  const luxonDates = Object.keys(details)
    .filter(key => scheduleKeys.includes(key))
    .map((key: keyof DayDetails) => {
      if (!details[key]) return null
      return DateTime.fromJSDate(details[key])
    })

  const rawHours = getHoursPerDay(luxonDates)
  const workedHours = rawHours.toFormat('hh:mm')

  const formatedAccumulator = {
    day_date: '',
    day_start: '',
    lunch_start: '',
    lunch_end: '',
    day_end: '',
    extraPause_start: '',
    extraPause_end: '',
    week: 0,
    fullname: ''
  }

  const formatedDetails = Object.keys(details).reduce((acc, key: keyof DayData) => {
    if (!scheduleKeys.includes(key)) {
      if (key === 'day_date') {
        const formatedDate = DateTime.fromJSDate(details.day_date).toLocaleString(DateTime.DATE_SHORT)
        return { ...acc, [key]: formatedDate }
      }
      return { ...acc, [key]: details[key] }
    }
    if (!details[key]) return { ...acc, [key]: 0 }
    const formatedTime = DateTime.fromJSDate(details[key] as Date).toLocaleString(DateTime.TIME_24_SIMPLE)
    return { ...acc, [key]: formatedTime }
  }, formatedAccumulator)

  return { ...formatedDetails, workedHours, rawHours }
}

const getEmployeeSummary = async (id: string, weekNumber: number, year: number) => {
  const rawHours = await getHoursPerWeek(parseInt(id), weekNumber, year)
  const weekHours = rawHours.toFormat('hh:mm')
  const [{ fullname, hourly_pay: hourlyPay }] = await store.instance.query(
    'employees', 'fullname, hourly_pay', `employee_id = ${id}`
  ) as Array<EmployeeData> // or fetch /employees
  const weekPay = Math.ceil(rawHours.as('hours') * hourlyPay)

  const weekDates = await store.instance.query(
    'days', 'day_date', `week = ${weekNumber} and employee_id = ${id} and year(day_date) = ${year}`
  ) as Array<DayData>

  const detailedDays = await Promise.all(weekDates.map(async (day) => {
    const formatedDate = DateTime.fromJSDate(day.day_date).toSQLDate()
    return await getDateDetails(formatedDate, id.toString())
  }))

  return { weekHours, weekPay, fullname, rawHours, detailedDays, weekNumber }
}

const getWeekTotalSummary = async (weekDate?: string) => {
  let weekNumber: number
  let yearNumber: number
  if (!weekDate) {
    weekNumber = DateTime.local().weekNumber
    yearNumber = DateTime.local().year
  } else {
    weekNumber = DateTime.fromJSDate(new Date(weekDate)).weekNumber
    yearNumber = DateTime.fromJSDate(new Date(weekDate)).year
  }

  const employeesId = await store.instance.query(
    'employees', 'employee_id', 'active = 1'
  ) as Array<EmployeeData> // or fetch /employees

  const detailsPerEmployee = await Promise.all(employeesId.map(async (employee) => {
    const employeeHours = await getEmployeeSummary(employee.employee_id.toString(), weekNumber, yearNumber)
    return employeeHours
  }))

  const total = detailsPerEmployee.reduce((a, b) => {
    return { rawHours: a.rawHours.plus(b.rawHours), weekPay: a.weekPay + b.weekPay }
  }, { rawHours: Duration.fromMillis(0), weekPay: 0})

  const hours = total.rawHours.toFormat('hh:mm')

  return { hours, pay: total.weekPay, detailsPerEmployee, weekNumber }
}

const getLargePeriodSummary = async (query: DaysParams) => {
  let selectedYear: number
  if (!query.year) {
    selectedYear = DateTime.local().year
  } else {
    selectedYear = DateTime.fromJSDate(new Date(query.date)).year
  }

  const employeesData = await store.instance.list(
    'employees', 'employee_id, fullname, hourly_pay'
  ) as Array<EmployeeData> // or fetch /employees

  const workedDaysPerEmployee = await Promise.all(employeesData.map(async (employee) => {
    let where = `employee_id = ${employee.employee_id} and year(day_date) = ${selectedYear}`
    if (query.month) {
      where += ` and month(day_date) = ${DateTime.fromJSDate(new Date(query.date)).month}`
    }
    const days = await store.instance.query('days', 'day_date', where) as Array<DayData>
    return { ...employee, days }
  }))

  const detailedPeriodPerEmployee = await Promise.all(workedDaysPerEmployee.map(async (employee) => {
    const dayDetail = await Promise.all(employee.days.map(async (day) => {
      const formatedDate = DateTime.fromJSDate(day.day_date).toSQLDate()
      const details = await getDateDetails(formatedDate, employee.employee_id.toString())
      return details
    }))
    return { ...employee, dayDetail }
  }))

  const periodSummary = detailedPeriodPerEmployee.map((employee) => {
    const employeePeriod = employee.dayDetail.reduce((acc, day) => {
      const pay = Math.ceil(day.rawHours.as('hours') * employee.hourly_pay)
      return { hours: acc.hours.plus(day.rawHours), pay: acc.pay + (pay) }
    }, { hours: Duration.fromMillis(0), pay: 0 })
    return { fullname: employee.fullname, ...employeePeriod, hours: employeePeriod.hours.toFormat('h:m'), rawHours: employeePeriod.hours }
  })

  const periodTotal = periodSummary.reduce((acc, employee) => {
    return { hours: acc.hours.plus(employee.rawHours), pay: acc.pay + employee.pay }
  }, { hours: Duration.fromMillis(0), pay: 0 })

  // need to be renamed to periodDate
  const periodNumber = query.month ? `${DateTime.fromJSDate(new Date(query.date)).month}/${selectedYear}` : selectedYear.toString()

  return { ...periodTotal, hours: periodTotal.hours.toFormat('h:m'), detailsPerEmployee: periodSummary, periodNumber }
}

const getByQuery = async (params: string) => {
  const query: DaysParams = querystring.parse(params)
  
  if (query.date && query.employee_id) return getDateDetails(DateTime.fromJSDate(new Date(query.date)), query.employee_id as string)
  if (query.employee_id) return getEmployeeSummary(query.employee_id as string, DateTime.local().weekNumber, DateTime.local().year)
  if (query.week) return getWeekTotalSummary(query.week)
  if (query.year || query.month) return getLargePeriodSummary(query)

  throw Error('Parametros inválidos')
}

const markSchedules = async (body: DaysParams) => {
  if (!body.id) throw Error('No se encontro el id.')

  const today = DateTime.local()
  const dayName = today.get('weekdayShort') as any
  if (dayName === 'Sat' || dayName === 'Sun') throw Error('Día no laboral.')
  if (today.hour <= 7 || today.hour >= 19) throw Error('Horario no laboral.')

  const startedDay = await store.instance.query(
    'days', '*', `employee_id = ${body.id} AND day_date = '${today.toSQLDate()}'`
  ) as Array<DayData>

  if (startedDay.length === 0) {
    const newDay = {
      day_date: DateTime.local().toSQLDate(),
      employee_id: body.id,
      week: DateTime.local().weekNumber
    }
    const newData = await store.instance.upsert('days', newDay) as DayData
    const hour = DateTime.fromJSDate(newData.day_start).toLocaleString(DateTime.TIME_24_SIMPLE)

    return { day_start: hour }
  }

  const day = startedDay[0]
  let scheduleToMark: keyof DayDetails

  if (body.extraPause) {
    scheduleToMark = day.extraPause_start ? 'extraPause_end' : 'extraPause_start'
  } else {
    const basicSchedule = scheduleKeys.slice(1, 4)
    scheduleToMark = Object.keys(day).find((key: keyof DayDetails) => {
      return (basicSchedule.includes(key) && !day[key])
    }) as keyof DayDetails
  }

  if (!scheduleToMark) throw Error('Día laboral finalizado.')

  const dayUpdate = {
    id: day.id,
    [scheduleToMark]: DateTime.local()
  }
  const newData = await store.instance.upsert('days', dayUpdate) as DayData
  const hour = DateTime.fromJSDate(newData[scheduleToMark]).toLocaleString(DateTime.TIME_24_SIMPLE)

  return { [scheduleToMark]: hour }
}

const updateDate = async (body: DaysParams) => {
  if (!body.date || !body.employee_id) throw Error('Datos faltantes')

  const dayExist = await store.instance.query('days', 'id',
    `day_date = '${DateTime.fromJSDate(new Date(body.date))}' and employee_id = ${body.employee_id}`
  ) as Array<DayData>

  if (dayExist.length === 0) throw Error('No se encontro esa fecha.')

  const dayUpdate = scheduleKeys.reduce((update, key: keyof DayDetails) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      update[key] = new Date(`${body.date} ${body[key]}`)
    }
    return update
  }, { id: dayExist[0].id } as DayData)

  const updatedData = await store.instance.upsert('days', dayUpdate) as DayData
  const formatedDate = DateTime.fromJSDate(updatedData.day_date).toSQLDate()

  return getDateDetails(formatedDate, updatedData.employee_id.toString())
}

const deleteDate = async (params: string) => {
  const query: DaysParams = querystring.parse(params)

  const dayExist = await store.instance.query('days', 'id',
    `day_date = '${query.date}' and employee_id = ${query.employee_id}`
  ) as Array<DayData>

  if (dayExist.length === 0) throw Error('No se encontro esa fecha.')

  const removedDay = await store.instance.remove('days', `id = ${dayExist[0].id}`)
  if (!removedDay) throw Error('No se ha podido borrar esa fila.')

  return { message: 'Día eliminado correctamente.', date: query.date, employee_id: query.employee_id }
}

export default {
  getWeekTotalSummary,
  getByQuery,
  markSchedules,
  updateDate,
  deleteDate
}
