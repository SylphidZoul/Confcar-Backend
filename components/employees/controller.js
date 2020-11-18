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

const signup = async (body) => {
  const requiredFields = ['fullname', 'dni', 'password', 'mobile', 'hourly_pay']
  const employee = requiredFields.reduce((employee, key) => {
    if (body[key] === '') throw Error('Datos faltantes.')
    return { ...employee, [key]: body[key] }
  }, {})

  try {
    const newEmployee = await store.upsert(table, employee)
    return newEmployee
  } catch (error) {
    console.log(error)
    throw Error('El DNI debe ser único.')
  }
}

const upsert = (body) => {
  if (body.newEmployee) return signup(body)
  return login(body)
}

const update = async (body) => {
  if (!body.id) throw Error('Id faltante.')

  const employeeExist = await store.get(table, body.id, true)

  if (employeeExist.length === 0) throw Error('No se encontro ese empleado.')

  const updateEmployee = await store.upsert(table, body)

  return updateEmployee
}

const remove = async (id) => {
  const employeeExist = await store.get(table, id, true)

  if (employeeExist.length === 0) throw Error('No se encontro ese empleado.')

  return store.remove(table, `employee_id = ${id}`)
}

module.exports = {
  list,
  login,
  signup,
  upsert,
  update,
  remove
}
