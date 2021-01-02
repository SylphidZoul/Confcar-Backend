"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mysql_1 = __importDefault(require("./store/mysql"));
const handleParserError_1 = __importDefault(require("./middlewares/handleParserError"));
const network_1 = __importDefault(require("./components/employees/network"));
const network_2 = __importDefault(require("./components/days/network"));
const config_1 = require("./config");
const app = express_1.default();
app.use(cors_1.default());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use(handleParserError_1.default);
app.use('/employees', network_1.default);
app.use('/days', network_2.default);
mysql_1.default.instance.handleConnection();
app.listen(config_1.config.api.port, () => {
    console.log('Escuchando puerto: ', config_1.config.api.port);
});
//# sourceMappingURL=app.js.map