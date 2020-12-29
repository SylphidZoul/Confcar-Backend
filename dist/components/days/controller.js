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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const luxon_1 = require("luxon");
const mysql_1 = __importDefault(require("../../store/mysql"));
const log4js_1 = __importDefault(require("../../utils/log4js"));
const scheduleKeys = ['day_start', 'lunch_start', 'lunch_end', 'day_end', 'extraPause_start', 'extraPause_end'];
const getHoursPerDay = (rawDay) => {
    const [dayStart, lunchStart, lunchEnd, dayEnd, pauseStart, pauseEnd] = rawDay;
    if ((dayStart && !lunchStart) || (lunchEnd && !dayEnd)) {
        const today = luxon_1.DateTime.local();
        if (today.day !== dayStart.day || today.hour > 19) {
            log4js_1.default.error(dayStart.toISODate());
            return luxon_1.Duration.fromMillis(0);
        }
    }
    let pauseInterval = null;
    if (pauseStart && pauseEnd) {
        pauseInterval = pauseStart.diff(pauseEnd);
    }
    let firstInterval;
    if (!lunchStart) {
        firstInterval = dayStart.diffNow();
        if (pauseInterval)
            return firstInterval.minus(pauseInterval).negate();
        return firstInterval.negate();
    }
    firstInterval = dayStart.diff(lunchStart);
    if (!lunchEnd) {
        if (pauseInterval)
            return firstInterval.minus(pauseInterval).negate();
        return firstInterval.negate();
    }
    let secondInterval;
    if (!dayEnd) {
        secondInterval = lunchEnd.diffNow();
    }
    else {
        secondInterval = lunchEnd.diff(dayEnd);
    }
    const dayTotalHours = firstInterval.plus(secondInterval);
    if (pauseInterval)
        return dayTotalHours.minus(pauseInterval).negate();
    return dayTotalHours.negate();
};
const getHoursPerWeek = (id, week) => __awaiter(void 0, void 0, void 0, function* () {
    const workedWeek = yield mysql_1.default.query('days', 'day_start, lunch_start, lunch_end, day_end, extraPause_start, extraPause_end', `employee_id = ${id} and week = ${week} AND year(day_date) = ${luxon_1.DateTime.local().year}`);
    if (workedWeek.length === 0)
        return luxon_1.Duration.fromMillis(0);
    const luxonDates = workedWeek.map(day => {
        return Object.keys(day).map(key => {
            if (!day[key])
                return null;
            return luxon_1.DateTime.fromJSDate(day[key]);
        });
    });
    const totalTimePerDay = luxonDates.map(day => getHoursPerDay(day));
    const totalTimePerWeek = totalTimePerDay.reduce((a, b) => a.plus(b));
    return totalTimePerWeek;
});
const getDateDetails = (date, id) => __awaiter(void 0, void 0, void 0, function* () {
    const dbResponse = yield mysql_1.default.query('days', 'day_date, day_start, lunch_start, lunch_end, day_end, extraPause_start, extraPause_end, week, employees.fullname', `day_date='${date}' and days.employee_id=${id}`, { employees: 'employee_id' });
    if (dbResponse.length === 0)
        throw Error('No se ha podido encontrar la fecha de ese empleado.');
    const details = dbResponse[0];
    const luxonDates = Object.keys(details)
        .filter(key => scheduleKeys.includes(key))
        .map(key => {
        if (!details[key])
            return null;
        return luxon_1.DateTime.fromJSDate(details[key]);
    });
    const rawHours = getHoursPerDay(luxonDates);
    const workedHours = rawHours.toFormat('hh:mm');
    const formatedDetails = Object.keys(details).reduce((acc, key) => {
        if (!scheduleKeys.includes(key)) {
            if (key === 'day_date') {
                const formatedDate = luxon_1.DateTime.fromJSDate(details.day_date).toLocaleString(luxon_1.DateTime.DATE_SHORT);
                return Object.assign(Object.assign({}, acc), { [key]: formatedDate });
            }
            return Object.assign(Object.assign({}, acc), { [key]: details[key] });
        }
        if (!details[key])
            return Object.assign(Object.assign({}, acc), { [key]: 0 });
        const formatedTime = luxon_1.DateTime.fromJSDate(details[key]).toLocaleString(luxon_1.DateTime.TIME_24_SIMPLE);
        return Object.assign(Object.assign({}, acc), { [key]: formatedTime });
    }, {});
    return Object.assign(Object.assign({}, formatedDetails), { workedHours, rawHours });
});
const getEmployeeSummary = (id, weekNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const rawHours = yield getHoursPerWeek(id, weekNumber);
    const weekHours = rawHours.toFormat('hh:mm');
    const [{ fullname, hourly_pay: hourlyPay }] = yield mysql_1.default.query('employees', 'fullname, hourly_pay', `employee_id = ${id}`); // or fetch /employees
    const weekPay = Math.ceil(rawHours.as('hours') * hourlyPay);
    const weekDates = yield mysql_1.default.query('days', 'day_date', `week = ${weekNumber} and employee_id = ${id}`);
    const detailedDays = yield Promise.all(weekDates.map((day) => __awaiter(void 0, void 0, void 0, function* () {
        const formatedDate = luxon_1.DateTime.fromJSDate(day.day_date).toSQLDate();
        return yield getDateDetails(formatedDate, id);
    })));
    return { weekHours, weekPay, fullname, rawHours, detailedDays, weekNumber };
});
const getWeekTotalSummary = (week) => __awaiter(void 0, void 0, void 0, function* () {
    let weekNumber;
    if (!week) {
        weekNumber = luxon_1.DateTime.local().weekNumber;
    }
    else {
        weekNumber = luxon_1.DateTime.fromJSDate(new Date(week)).weekNumber;
    }
    const employeesId = yield mysql_1.default.query('employees', 'employee_id', 'active = 1'); // or fetch /employees
    const detailsPerEmployee = yield Promise.all(employeesId.map((employee) => __awaiter(void 0, void 0, void 0, function* () {
        const employeeHours = yield getEmployeeSummary(employee.employee_id, weekNumber);
        return employeeHours;
    })));
    const total = detailsPerEmployee.reduce((a, b) => {
        return { rawHours: a.rawHours.plus(b.rawHours), weekPay: a.weekPay + b.weekPay };
    });
    const hours = total.rawHours.toFormat('h:m');
    return { hours, pay: total.weekPay, detailsPerEmployee, weekNumber };
});
const getLargePeriodSummary = (query) => __awaiter(void 0, void 0, void 0, function* () {
    let selectedYear = 0;
    if (!query.year) {
        selectedYear = luxon_1.DateTime.local().year;
    }
    else {
        selectedYear = luxon_1.DateTime.fromJSDate(new Date(query.date)).year;
    }
    const employeesData = yield mysql_1.default.list('employees', 'employee_id, fullname, hourly_pay'); // or fetch /employees
    const workedDaysPerEmployee = yield Promise.all(employeesData.map((employee) => __awaiter(void 0, void 0, void 0, function* () {
        let where = `employee_id = ${employee.employee_id} and year(day_date) = ${selectedYear}`;
        if (query.month) {
            where += ` and month(day_date) = ${luxon_1.DateTime.fromJSDate(new Date(query.date)).month}`;
        }
        const days = yield mysql_1.default.query('days', 'day_date', where);
        return Object.assign(Object.assign({}, employee), { days });
    })));
    const detailedPeriodPerEmployee = yield Promise.all(workedDaysPerEmployee.map((employee) => __awaiter(void 0, void 0, void 0, function* () {
        const dayDetail = yield Promise.all(employee.days.map((day) => __awaiter(void 0, void 0, void 0, function* () {
            const formatedDate = luxon_1.DateTime.fromJSDate(day.day_date).toSQLDate();
            const details = yield getDateDetails(formatedDate, employee.employee_id);
            return details;
        })));
        return Object.assign(Object.assign({}, employee), { dayDetail });
    })));
    const periodSummary = detailedPeriodPerEmployee.map((employee) => {
        const employeePeriod = employee.dayDetail.reduce((acc, day) => {
            const pay = Math.ceil(day.rawHours.as('hours') * employee.hourly_pay);
            return { hours: acc.hours.plus(day.rawHours), pay: acc.pay + (pay) };
        }, { hours: luxon_1.Duration.fromMillis(0), pay: 0 });
        return Object.assign(Object.assign({ fullname: employee.fullname }, employeePeriod), { hours: employeePeriod.hours.toFormat('h:m'), rawHours: employeePeriod.hours });
    });
    const periodTotal = periodSummary.reduce((acc, employee) => {
        return { hours: acc.hours.plus(employee.rawHours), pay: acc.pay + employee.pay };
    }, { hours: luxon_1.Duration.fromMillis(0), pay: 0 });
    const periodNumber = query.month ? `${luxon_1.DateTime.fromJSDate(new Date(query.date)).month}/${selectedYear}` : selectedYear;
    return Object.assign(Object.assign({}, periodTotal), { hours: periodTotal.hours.toFormat('h:m'), detailsPerEmployee: periodSummary, periodNumber });
});
const getByQuery = (query) => __awaiter(void 0, void 0, void 0, function* () {
    if (query.date && query.employee_id)
        return getDateDetails(luxon_1.DateTime.fromJSDate(new Date(query.date)), query.employee_id);
    if (query.employee_id)
        return getEmployeeSummary(query.employee_id, luxon_1.DateTime.local().weekNumber);
    if (query.week)
        return getWeekTotalSummary(query.week);
    if (query.year || query.month)
        return getLargePeriodSummary(query);
    throw Error('Parametros inválidos');
});
const markSchedules = (body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!body.id)
        throw Error('No se encontro el id.');
    const today = luxon_1.DateTime.local();
    const dayName = today.get('weekdayShort');
    if (dayName === 'Sat' || dayName === 'Sun')
        throw Error('Día no laboral.');
    if (today.hour <= 7 || today.hour >= 19)
        throw Error('Horario no laboral.');
    const startedDay = yield mysql_1.default.query('days', '*', `employee_id = ${body.id} AND day_date = '${today.toSQLDate()}'`);
    if (startedDay.length === 0) {
        const newDay = {
            day_date: luxon_1.DateTime.local().toSQLDate(),
            employee_id: body.id,
            week: luxon_1.DateTime.local().weekNumber
        };
        const newData = yield mysql_1.default.upsert('days', newDay);
        const hour = luxon_1.DateTime.fromJSDate(newData.day_start).toLocaleString(luxon_1.DateTime.TIME_24_SIMPLE);
        return { day_start: hour };
    }
    const day = startedDay[0];
    let scheduleToMark;
    if (body.extraPause) {
        scheduleToMark = day.extraPause_start ? 'extraPause_end' : 'extraPause_start';
    }
    else {
        const basicSchedule = scheduleKeys.slice(1, 4);
        scheduleToMark = Object.keys(day).find((key) => {
            return (basicSchedule.includes(key) && !day[key]);
        });
    }
    if (!scheduleToMark)
        throw Error('Día laboral finalizado.');
    const dayUpdate = {
        id: day.id,
        [scheduleToMark]: luxon_1.DateTime.local()
    };
    const newData = yield mysql_1.default.upsert('days', dayUpdate);
    const hour = luxon_1.DateTime.fromJSDate(newData[scheduleToMark]).toLocaleString(luxon_1.DateTime.TIME_24_SIMPLE);
    return { [scheduleToMark]: hour };
});
const updateDate = (body) => __awaiter(void 0, void 0, void 0, function* () {
    if (!body.date || !body.employee_id)
        throw Error('Datos faltantes');
    const dayExist = yield mysql_1.default.query('days', 'id', `day_date = '${luxon_1.DateTime.fromJSDate(new Date(body.date))}' and employee_id = ${body.employee_id}`);
    if (dayExist.length === 0)
        throw Error('No se encontro esa fecha.');
    const dayUpdate = scheduleKeys.reduce((update, key) => {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            update[key] = luxon_1.DateTime.fromJSDate(new Date(`${body.date} ${body[key]}`));
        }
        return update;
    }, { id: dayExist[0].id });
    if (Object.keys(dayUpdate).length === 0)
        throw Error('No hay ningún valor a cambiar.');
    const updatedData = yield mysql_1.default.upsert('days', dayUpdate);
    const formatedDate = luxon_1.DateTime.fromJSDate(updatedData.day_date).toSQLDate();
    return getDateDetails(formatedDate, updatedData.employee_id);
});
const deleteDate = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const dayExist = yield mysql_1.default.query('days', 'id', `day_date = '${query.date}' and employee_id = ${query.employee_id}`);
    if (dayExist.length === 0)
        throw Error('No se encontro esa fecha.');
    const removedDay = yield mysql_1.default.remove('days', `id = ${dayExist[0].id}`);
    if (!removedDay)
        throw Error('No se ha podido borrar esa fila.');
    return { message: 'Día eliminado correctamente.', date: query.date, employee_id: query.employee_id };
});
module.exports = {
    getWeekTotalSummary,
    getByQuery,
    markSchedules,
    updateDate,
    deleteDate
};
//# sourceMappingURL=controller.js.map