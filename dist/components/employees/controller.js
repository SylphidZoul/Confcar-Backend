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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = __importDefault(require("../../store/mysql"));
const table = 'employees';
const list = () => __awaiter(void 0, void 0, void 0, function* () {
    const employeesList = yield mysql_1.default.instance.query(table, 'employee_id, fullname, dni, password, mobile, hourly_pay', 'active = 1');
    return employeesList;
});
const getByQuery = (query) => {
    if (Object.prototype.hasOwnProperty.call(query, 'active')) {
        return mysql_1.default.instance.query(table, 'employee_id, fullname, dni, password, mobile, hourly_pay', 'active = 0');
    }
    return Promise.reject({ status: 400, message: 'Parametros inválidos' });
};
const login = (body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!body.dni || !body.password)
        throw Error('Datos faltantes');
    const employeeId = yield mysql_1.default.instance.query(table, 'employee_id', `dni = ${body.dni} and password = '${body.password}'`);
    if (!employeeId)
        throw Error('Datos incorrectos');
    return employeeId[0];
});
const signup = (body) => __awaiter(void 0, void 0, void 0, function* () {
    const requiredFields = ['fullname', 'dni', 'password', 'mobile', 'hourly_pay'];
    const employee = requiredFields.reduce((employee, key) => {
        if (body[key] === '')
            throw Error('Datos faltantes.');
        return Object.assign(Object.assign({}, employee), { [key]: body[key] });
    }, {});
    try {
        const newEmployee = yield mysql_1.default.instance.upsert(table, employee);
        return newEmployee;
    }
    catch (error) {
        throw Error('El DNI debe ser único.');
    }
});
const upsert = (body) => {
    if (body.newEmployee)
        return signup(body);
    return login(body);
};
const update = (body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!body.id)
        throw Error('Id faltante.');
    const employeeExist = yield mysql_1.default.instance.get(table, body.id);
    if (!employeeExist)
        throw Error('No se encontro ese empleado.');
    const _a = yield mysql_1.default.instance.upsert(table, body), { active } = _a, updatedEmployee = __rest(_a, ["active"]);
    return updatedEmployee;
});
const remove = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const employeeExist = yield mysql_1.default.instance.get(table, parseInt(id));
    if (!employeeExist)
        throw Error('No se encontro ese empleado.');
    return mysql_1.default.instance.upsert(table, { id, active: !employeeExist.active });
});
exports.default = {
    list,
    getByQuery,
    login,
    signup,
    upsert,
    update,
    remove
};
//# sourceMappingURL=controller.js.map