"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = require("mysql");
const config_1 = require("../config");
const _a = config_1.config.mysql, { port } = _a, dbconf = __rest(_a, ["port"]);
class Store {
    constructor() {
        this.handleConnection = () => {
            this.connection = mysql_1.createConnection(dbconf);
            this.connection.connect((err) => {
                if (err) {
                    console.log('[db error]', err);
                    setTimeout(() => this.handleConnection, 2000);
                }
                else {
                    console.log('[DB connected!]');
                }
            });
            this.connection.on('error', (err) => {
                console.log('[db error]', err);
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    this.handleConnection();
                }
                else {
                    throw err;
                }
            });
        };
        this.list = (table, select) => {
            return new Promise((resolve, reject) => {
                this.connection.query(`SELECT ${select} FROM ${table}`, (err, data) => {
                    if (err)
                        return reject(err);
                    resolve(data);
                });
            });
        };
        this.get = (table, id) => {
            const where = (table === 'employees') ? 'employee_id' : 'id';
            return new Promise((resolve, reject) => {
                this.connection.query(`SELECT * FROM ${table} WHERE ?? = ?`, [where, id], (err, data) => {
                    if (err)
                        return reject(err);
                    resolve(data[0]);
                });
            });
        };
        this.insert = (table, data) => {
            return new Promise((resolve, reject) => {
                this.connection.query(`INSERT INTO ${table} SET ?`, data, (err, data) => {
                    if (err)
                        return reject(err);
                    resolve(this.get(table, data.insertId));
                });
            });
        };
        this.update = (table, data) => {
            const where = (table === 'employees') ? 'employee_id' : 'id';
            const { id } = data, update = __rest(data, ["id"]);
            return new Promise((resolve, reject) => {
                this.connection.query(`UPDATE ${table} SET ? WHERE ?? = ?`, [update, where, id], (err, result) => {
                    if (err)
                        return reject(err);
                    resolve(this.get(table, data.id));
                });
            });
        };
        this.upsert = (table, data) => __awaiter(this, void 0, void 0, function* () {
            if (data.id) {
                return this.update(table, data);
            }
            else {
                return this.insert(table, data);
            }
        });
        this.query = (table, select, query, join) => {
            let joinQuery = '';
            if (join) {
                let left = '';
                if (join.left)
                    left = 'LEFT ';
                const key = Object.keys(join)[0];
                const val = join[key];
                joinQuery = `${left}JOIN ${key} ON ${table}.${val} = ${key}.${val}`;
            }
            return new Promise((resolve, reject) => {
                const string = `SELECT ${select} FROM ${table} ${joinQuery} WHERE ${table}.${query}`;
                this.connection.query(string, (err, res) => {
                    if (err)
                        return reject(err);
                    resolve(res);
                });
            });
        };
        this.remove = (table, query) => {
            return new Promise((resolve, reject) => {
                this.connection.query(`DELETE FROM ${table} WHERE ${query} LIMIT 1`, (err, res) => {
                    if (err)
                        return reject(err);
                    resolve(res);
                });
            });
        };
    }
}
Store.instance = new Store();
exports.default = Store;
//# sourceMappingURL=mysql.js.map