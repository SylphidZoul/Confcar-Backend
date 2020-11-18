const mysql = require('mysql')
const config = require('../config')

const dbconf = {
  host: config.mysql.host,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database
}

let connection

const handleConnection = () => {
  connection = mysql.createConnection(dbconf)

  connection.connect((err) => {
    if (err) {
      console.log('[db error]', err)
      setTimeout(() => handleConnection, 2000)
    } else {
      console.log('DB connected!')
    }
  })

  connection.on('error', err => {
    console.log('[db error]', err)
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleConnection()
    } else {
      throw err
    }
  })
}

handleConnection()

const list = (table, select) => {
  return new Promise((resolve, reject) => {
    connection.query(`SELECT ${select} FROM ${table}`, (err, data) => {
      if (err) return reject(err)
      resolve(data)
    })
  })
}

const get = (table, id) => {
  const where = (table === 'employees') ? 'employee_id' : 'id'
  return new Promise((resolve, reject) => {
    connection.query(`SELECT * FROM ${table} WHERE ?? = ?`, [where, id], (err, data) => {
      if (err) return reject(err)
      resolve(data[0])
    })
  })
}

const insert = (table, data) => {
  return new Promise((resolve, reject) => {
    connection.query(`INSERT INTO ${table} SET ?`, data, (err, data) => {
      if (err) return reject(err)
      resolve(get(table, data.insertId))
    })
  })
}

const update = (table, data) => {
  const where = (table === 'employees') ? 'employee_id' : 'id'
  const { id, ...update } = data
  return new Promise((resolve, reject) => {
    connection.query(`UPDATE ${table} SET ? WHERE ?? = ?`, [update, where, id], (err, result) => {
      if (err) return reject(err)
      resolve(get(table, data.id))
    })
  })
}

const upsert = async (table, data) => {
  if (data.id) {
    return update(table, data)
  } else {
    return insert(table, data)
  }
}

const query = (table, select, query, join) => {
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
    connection.query(string, (err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}

const remove = (table, query) => {
  return new Promise((resolve, reject) => {
    connection.query(`DELETE FROM ${table} WHERE ${query} LIMIT 1`, (err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}

module.exports = {
  connection,
  list,
  get,
  upsert,
  query,
  remove
}
