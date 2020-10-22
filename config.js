module.exports = {
  api: {
    port: process.env.PORT || 3004
  },
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.MYSQL_PORT || '3306',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PW || 'Olazabal3805',
    database: process.env.MYSQL_DB || 'Confcar'
  }
}
