type DBResponse = EmployeeData | DayData
type DBListResponse = Array<EmployeeData> | Array<DayData>

interface EmployeeData {
  employee_id: number
  fullname: string
  dni: number
  password: string
  mobile: number
  hourly_pay: number
  active?: number
}

interface DayDetails {
  day_start: Date
  lunch_start: Date
  lunch_end: Date
  day_end: Date
  extraPause_start: Date
  extraPause_end: Date
}

interface DayData extends DayDetails{
  id: number
  day_date: Date
  employee_id: number
  week: number
}

interface DaysParams {
  date?: string
  employee_id?: string | number
  extraPause?: boolean
  id?: number
  month?: string
  week?: string
  year?: string
  day_start?: string
  lunch_start?: string
  lunch_end?: string
  day_end?: string
  extraPause_start?: string
  extraPause_end?: string
}
