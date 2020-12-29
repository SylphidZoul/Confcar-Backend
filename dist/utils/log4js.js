const log4js = require('log4js');
const { DateTime } = require('luxon');
log4js.addLayout('date', () => {
    return (logEvent) => {
        return `[${DateTime.local().toFormat('yyyy/MM/dd hh:mm')}] - El día ${logEvent.data} de algún empleado no fue cerrado correctamente.`;
    };
});
log4js.configure({
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
const logger = log4js.getLogger();
module.exports = logger;
//# sourceMappingURL=log4js.js.map