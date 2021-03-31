"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Producer = void 0;
var node_rdkafka_1 = require("node-rdkafka");
var rxjs_1 = require("rxjs");
var schema_handler_1 = require("../schema-handler/schema-handler");
var Producer = /** @class */ (function () {
    function Producer(config) {
        this._offsetReport = new rxjs_1.Subject();
        this._deliveryReport = new rxjs_1.Subject();
        this._logs = new rxjs_1.Subject();
        this._errors = new rxjs_1.Subject();
        this.config = __assign({}, config);
        this.kafkaClient = new node_rdkafka_1.HighLevelProducer(this.config.kafka.globalConfig, this.config.kafka.topicConfig);
        this.schemaHandler = new schema_handler_1.SchemaHandler(this.config.schema);
    }
    Producer.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    /*
                    Load schema and init consumer
                    * */
                    return [4 /*yield*/, this.schemaHandler.init()];
                    case 1:
                        /*
                        Load schema and init consumer
                        * */
                        _a.sent();
                        if (!this.schemaHandler.hasKeyParser()) {
                            throw new Error('You are missing key parser, please make sure you init the consumer and that you have provided a valid keySchemaConfig');
                        }
                        if (!this.schemaHandler.hasValueParser()) {
                            throw new Error('You are missing value parser, please make sure you init the consumer and that you have provided a valid valueSchemaConfig');
                        }
                        this.kafkaClient.setValueSerializer(function (v) {
                            return _this.schemaHandler.encodeWithValueSchema(v);
                        });
                        this.kafkaClient.setKeySerializer(function (k) {
                            return _this.schemaHandler.encodeWithKeySchema(k);
                        });
                        this.kafkaClient.on('event.log', function (eventData) {
                            _this._logs.next(eventData);
                        });
                        this.kafkaClient.on('event.error', function (err) {
                            _this._errors.next(err);
                        });
                        this.kafkaClient.on('ready', function (info, metadata) {
                            if (_this.onReadyCallback) {
                                _this.onReadyCallback(info, metadata);
                            }
                        });
                        this.kafkaClient.on('delivery-report', function (err, report) {
                            if (err) {
                                _this._errors.next(err);
                            }
                            if (report) {
                                _this._deliveryReport.next(report);
                            }
                        });
                        this.kafkaClient.on('disconnected', function (arg) {
                            var log = {
                                severity: 0,
                                fac: 'DISCONNECTED',
                                message: 'Disconnected connection: ' + arg.connectionOpened
                            };
                            _this._logs.next(log);
                            _this._logs.complete();
                            _this._errors.complete();
                            _this._deliveryReport.complete();
                            _this._offsetReport.complete();
                        });
                        return [4 /*yield*/, this.connect()];
                    case 2:
                        _a.sent();
                        this.kafkaClient.setPollInterval(this.config.kafka.pullInterval);
                        return [2 /*return*/];
                }
            });
        });
    };
    Producer.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.kafkaClient.connect({ topic: _this.config.kafka.topic }, function (err, data) {
                            if (err)
                                reject(err);
                            resolve(data);
                        });
                    })];
            });
        });
    };
    Object.defineProperty(Producer.prototype, "logs$", {
        get: function () {
            return this._logs.asObservable();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Producer.prototype, "errors$", {
        get: function () {
            /*
            Subscribe errors to get all consumer related errors
            */
            return this._errors.asObservable();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Producer.prototype, "deliveryReport$", {
        get: function () {
            return this._deliveryReport.asObservable();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Producer.prototype, "onReady", {
        set: function (func) {
            this.onReadyCallback = func;
        },
        enumerable: false,
        configurable: true
    });
    Producer.prototype.produce = function (message, key, timestamp, partition) {
        var _this = this;
        if (timestamp === void 0) { timestamp = null; }
        if (partition === void 0) { partition = null; }
        this.kafkaClient.produce(this.config.kafka.topic, partition, message, key, timestamp, function (err, offset) {
            if (err) {
                _this._errors.next(err);
            }
            if (offset) {
                _this._offsetReport.next(offset);
            }
        });
    };
    return Producer;
}());
exports.Producer = Producer;
