"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = __importDefault(require("../utils/response"));
const handleParserError = (err, req, res, next) => {
    if (err instanceof SyntaxError) {
        return response_1.default.error(res, 'Invalid JSON body', 400, err);
    }
    next();
};
exports.default = handleParserError;
//# sourceMappingURL=handleParserError.js.map