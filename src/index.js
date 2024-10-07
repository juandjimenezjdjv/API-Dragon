
import e from 'express'
import app from './app.js'
import {createTestTable, executeTables,alterTables, getConnection, listDatabases, showTables} from './database/connection.js'

getConnection()
// listDatabases()
// createTestTable()
// // executeTables()
showTables()
alterTables()
app.listen(5005)

console.log("Conexion ...")

