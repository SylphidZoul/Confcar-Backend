const table = 'employees'
const store = require('../../store/mysql')

const list = () => {
  return store.list(table, '*')
}

const login = async (body) => {
  if (!body.dni || !body.password) throw Error('Datos faltantes')

  const employeeId = await store.query(table, 'employee_id', `dni = ${body.dni} and password = '${body.password}'`)

  if (employeeId.length === 0) throw Error('Datos incorrectos')

  return employeeId[0]
}

const signup = (body) => {
  const employee = {
    fullname: body.fullname,
    dni: body.dni,
    password: body.password,
    mobile: body.mobile,
    hourly_pay: body.hourly_pay
  }
  return store.upsert(table, employee)
}

const upsert = (body) => {
  if (body.newEmployee) return signup(body)
  return login(body)
}

const updateEmployee = async (body) => {
  if (!body.employee_id) throw Error('Id faltante.')

  const employeeExist = await store.get(table, body.employee_id, true)

  if (employeeExist.length === 0) throw Error('No se encontro ese empleado.')
}

module.exports = {
  list,
  login,
  signup,
  upsert
}
