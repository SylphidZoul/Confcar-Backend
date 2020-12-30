interface EmployeeData {
  employee_id?: number
  fullname?: string
  dni?: number
  password?: string
  mobile?: number
  hourly_pay?: number
  active?: number
}

interface EmployeeParams extends EmployeeData {
  id?: number
}

type DBResponse = Array<EmployeeData>