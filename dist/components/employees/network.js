"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = __importDefault(require("./controller"));
const querystring_1 = __importDefault(require("querystring"));
const response_1 = __importDefault(require("../../utils/response"));
const router = express_1.default.Router();
router.get('/', (req, res) => {
    controller_1.default.list()
        .then((data) => {
        response_1.default.success(res, data, 200);
    })
        .catch((err) => {
        response_1.default.error(res, 'Error en el servidor', 504, err);
    });
});
router.get('/:query', (req, res) => {
    const query = querystring_1.default.parse(req.params.query);
    controller_1.default.getByQuery(query)
        .then((data) => {
        response_1.default.success(res, data, 200);
    })
        .catch((err) => {
        response_1.default.error(res, err.message, err.status, err);
    });
});
router.post('/', (req, res) => {
    controller_1.default.upsert(req.body)
        .then((data) => {
        response_1.default.success(res, data, 201);
    })
        .catch((err) => {
        response_1.default.error(res, err.message, 400, err);
    });
});
router.put('/', (req, res) => {
    controller_1.default.update(req.body)
        .then((data) => {
        response_1.default.success(res, data, 201);
    })
        .catch((err) => {
        response_1.default.error(res, err.message, 400, err);
    });
});
router.delete('/:id', (req, res) => {
    controller_1.default.remove(req.params.id)
        .then((data) => {
        response_1.default.success(res, data, 201);
    })
        .catch((err) => {
        response_1.default.error(res, err.message, 400, err);
    });
});
exports.default = router;
//# sourceMappingURL=network.js.map