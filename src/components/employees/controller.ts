import store from '../../store/mysql'
import querystring from 'querystring'

const table = 'employees'
const employeeFields = 'employee_id, fullname, dni, password, mobile, hourly_pay'

const list = async () => {
  const employeesList = await store.instance.query(
    table, employeeFields, 'active = 1'
  ) as Array<EmployeeData>

  return employeesList
}

const getByQuery = async (query: string) => {
  const parsedQuery = querystring.parse(query)

  if (Object.prototype.hasOwnProperty.call(parsedQuery, 'active')) {
    const inactiveEmployees = await store.instance.query(
      table, employeeFields, 'active = 0'
    ) as Array<EmployeeData>

    return inactiveEmployees
  }

  throw new Error('Parametros inválidos')
}

const login = async (body: EmployeeData) => {
  if (!body.dni || !body.password) throw Error('Datos faltantes')

  const [ employeeId ] = await store.instance.query(
    table, 'employee_id', `dni = ${body.dni} and password = '${body.password}'`
  ) as Array<EmployeeData>

  if (!employeeId) throw Error('Datos incorrectos')

  return employeeId
}

const signup = async (body: any) => {
  const requiredFields = ['fullname', 'dni', 'password', 'mobile', 'hourly_pay']
  const employee = requiredFields.reduce((employee, key) => {
    if (body[key] === '') throw Error('Datos faltantes.')
    return { ...employee, [key]: body[key] }
  }, {})

  try {
    const newEmployee = await store.instance.upsert(table, employee) as EmployeeData
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

  const { active, ...rest } = await store.instance.upsert(table, body) as EmployeeData
  const updatedEmployee: EmployeeData = rest
  
  return updatedEmployee
}

const remove = async (id: string) => {
  const employeeExist = await store.instance.get(table, parseInt(id)) as EmployeeData

  if (!employeeExist) throw Error('No se encontro ese empleado.')

  const update =  { id, active: !employeeExist.active }
  const deletedEmployee = await store.instance.upsert(table, update) as EmployeeData

  return deletedEmployee
}

export default {
  list,
  getByQuery,
  upsert,
  update,
  remove
}
