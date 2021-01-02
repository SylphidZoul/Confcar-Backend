"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const log4js_1 = __importDefault(require("log4js"));
const luxon_1 = require("luxon");
log4js_1.default.addLayout('date', () => {
    return (logEvent) => {
        return `[${luxon_1.DateTime.local().toFormat('yyyy/MM/dd hh:mm')}] - El día ${logEvent.data} de algún empleado no fue cerrado correctamente.`;
    };
});
log4js_1.default.configure({
    appenders: {
        Dia: {
            type: 'file',
            filename: 'Días_No_Cerrados.log',
            layout: {
                type: 'date'
            }
        }
    },
    categories: {
        default: {
            appenders: ['Dia'],
            level: 'error'
        }
    }
});
exports.logger = log4js_1.default.getLogger();
//# sourceMappingURL=log4js.js.map