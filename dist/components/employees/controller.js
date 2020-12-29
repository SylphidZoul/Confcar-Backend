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
const table = 'employees';
const store = require('../../store/mysql');
const list = () => {
    return store.query(table, 'employee_id, fullname, dni, password, mobile, hourly_pay', 'active = 1');
};
const getByQuery = (query) => {
    if (Object.prototype.hasOwnProperty.call(query, 'active')) {
        return store.query(table, 'employee_id, fullname, dni, password, mobile, hourly_pay', 'active = 0');
    }
    throw Error('Parametros inválidos');
};
const login = (body) => __awaiter(this, void 0, void 0, function* () {
    if (!body.dni || !body.password)
        throw Error('Datos faltantes');
    const employeeId = yield store.query(table, 'employee_id', `dni = ${body.dni} and password = '${body.password}'`);
    if (employeeId.length === 0)
        throw Error('Datos incorrectos');
    return employeeId[0];
});
const signup = (body) => __awaiter(this, void 0, void 0, function* () {
    const requiredFields = ['fullname', 'dni', 'password', 'mobile', 'hourly_pay'];
    const employee = requiredFields.reduce((employee, key) => {
        if (body[key] === '')
            throw Error('Datos faltantes.');
        return Object.assign(Object.assign({}, employee), { [key]: body[key] });
    }, {});
    try {
        const newEmployee = yield store.upsert(table, employee);
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
const update = (body) => __awaiter(this, void 0, void 0, function* () {
    if (!body.id)
        throw Error('Id faltante.');
    const employeeExist = yield store.get(table, body.id, true);
    if (employeeExist.length === 0)
        throw Error('No se encontro ese empleado.');
    const _a = yield store.upsert(table, body), { active } = _a, updatedEmployee = __rest(_a, ["active"]);
    return updatedEmployee;
});
const remove = (id) => __awaiter(this, void 0, void 0, function* () {
    const employeeExist = yield store.get(table, id, true);
    if (employeeExist.length === 0)
        throw Error('No se encontro ese empleado.');
    return store.upsert(table, { id, active: !employeeExist.active });
});
module.exports = {
    list,
    getByQuery,
    login,
    signup,
    upsert,
    update,
    remove
};
//# sourceMappingURL=controller.js.map