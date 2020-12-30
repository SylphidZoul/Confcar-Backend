import store from '../../store/mysql'
const table = 'employees'

const list = async () => {
  const employeesList: Array<EmployeeData> = await store.instance.query(table, 'employee_id, fullname, dni, password, mobile, hourly_pay', 'active = 1')
  return employeesList
}

const getByQuery = (query: EmployeeData) => {
  if (Object.prototype.hasOwnProperty.call(query, 'active')) {
    return store.instance.query(table, 'employee_id, fullname, dni, password, mobile, hourly_pay', 'active = 0')
  }
  return Promise.reject({ status: 400, message: 'Parametros inválidos'})
}

const login = async (body: any) => {
  if (!body.dni || !body.password) throw Error('Datos faltantes')

  const employeeId = await store.instance.query(table, 'employee_id', `dni = ${body.dni} and password = '${body.password}'`)

  if (!employeeId) throw Error('Datos incorrectos')

  return employeeId[0]
}

const signup = async (body: any) => {
  const requiredFields = ['fullname', 'dni', 'password', 'mobile', 'hourly_pay']
  const employee = requiredFields.reduce((employee, key) => {
    if (body[key] === '') throw Error('Datos faltantes.')
    return { ...employee, [key]: body[key] }
  }, {})

  try {
    const newEmployee = await store.instance.upsert(table, employee)
    return newEmployee
  } catch (error) {
    throw Error('El DNI debe ser único.')
  }
}

const upsert = (body: any) => {
  if (body.newEmployee) return signup(body)
  return login(body)
}

const update = async (body: any) => {
  if (!body.id) throw Error('Id faltante.')

  const employeeExist = await store.instance.get(table, body.id)

  if (!employeeExist) throw Error('No se encontro ese empleado.')

  const { active, ...updatedEmployee } = await store.instance.upsert(table, body)

  return updatedEmployee
}

const remove = async (id: string) => {
  const employeeExist = await store.instance.get(table, parseInt(id))

  if (!employeeExist) throw Error('No se encontro ese empleado.')

  return store.instance.upsert(table, { id, active: !employeeExist.active })
}

export default {
  list,
  getByQuery,
  login,
  signup,
  upsert,
  update,
  remove
}
