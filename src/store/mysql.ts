import { Connection, createConnection } from 'mysql'
import { config } from '../config'

const { port, ...dbconf } = config.mysql

class Store {
  private connection: Connection
  static instance = new Store()

  handleConnection = () => {
    this.connection = createConnection(dbconf)

    this.connection.connect((err) => {
      if (err) {
        console.log('[db error]', err)
        setTimeout(() => this.handleConnection, 2000)
      } else {
        console.log('[DB connected!]')
      }
    })

    this.connection.on('error', (err) => {
      console.log('[db error]', err)
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        this.handleConnection()
      } else {
        throw err
      }
    })
  }

  list = (table: string, select: string) => {
    return new Promise((resolve, reject) => {
      this.connection.query(`SELECT ${select} FROM ${table}`, (err, data) => {
        if (err) return reject(err)
        resolve(data)
      })
    })
  }

  get = (table: string, id: number): Promise<DBResponse> => {
    const where = (table === 'employees') ? 'employee_id' : 'id'
    return new Promise((resolve, reject) => {
      this.connection.query(`SELECT * FROM ${table} WHERE ?? = ?`, [where, id], (err, data) => {
        if (err) return reject(err)
        resolve(data[0])
      })
    })
  }

  insert = (table: string, data: any): Promise<DBResponse> => {
    return new Promise((resolve, reject) => {
      this.connection.query(`INSERT INTO ${table} SET ?`, data, (err, data) => {
        if (err) return reject(err)
        resolve(this.get(table, data.insertId))
      })
    })
  }

  update = (table: string, data: any): Promise<DBResponse> => {
    const where = (table === 'employees') ? 'employee_id' : 'id'
    const { id, ...update } = data
    return new Promise((resolve, reject) => {
      this.connection.query(`UPDATE ${table} SET ? WHERE ?? = ?`, [update, where, id], (err, result) => {
        if (err) return reject(err)
        resolve(this.get(table, data.id))
      })
    })
  }

  upsert = async (table: string, data: any) => {
    if (data.id) {
      return this.update(table, data)
    } else {
      return this.insert(table, data)
    }
  }

  query = (table: string, select: string, query: string, join?: any): Promise<DBListResponse> => {
    let joinQuery = ''
    if (join) {
      let left = ''
      if (join.left) left = 'LEFT '
      const key = Object.keys(join)[0]
      const val = join[key]
      joinQuery = `${left}JOIN ${key} ON ${table}.${val} = ${key}.${val}`
    }

    return new Promise((resolve, reject) => {
      const string = `SELECT ${select} FROM ${table} ${joinQuery} WHERE ${table}.${query}`
      this.connection.query(string, (err, res) => {
        if (err) return reject(err)
        resolve(res)
      })
    })
  }

  remove = (table: string, query: string) => {
    return new Promise((resolve, reject) => {
      this.connection.query(`DELETE FROM ${table} WHERE ${query} LIMIT 1`, (err, res) => {
        if (err) return reject(err)
        resolve(res)
      })
    })
  }
}

export default Store
