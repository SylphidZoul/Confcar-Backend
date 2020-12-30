"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Response {
}
Response.success = (res, data, status) => {
    const statusCode = status || 200;
    res.status(statusCode).send({
        error: false,
        status,
        body: data
    });
};
Response.error = (res, message, status, err) => {
    const statusCode = status || 500;
    const statusMessage = message || 'Internal server error';
    if (err)
        console.error(err);
    res.status(statusCode).send({
        error: true,
        status,
        body: statusMessage
    });
};
exports.default = Response;
//# sourceMappingURL=response.js.map