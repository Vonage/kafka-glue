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
exports.SchemaHandler = void 0;
var aws_sdk_1 = require("aws-sdk");
var avro_js_1 = require("avro-js");
var rxjs_1 = require("rxjs");
var SchemaHandler = /** @class */ (function () {
    function SchemaHandler(config) {
        this.config = __assign({}, config);
        this.glueClient = new aws_sdk_1.Glue({ region: this.config.region });
    }
    SchemaHandler.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    /*
                    Load schema and init consumer
                    * */
                    return [4 /*yield*/, this.updateSchemaDefinitions()];
                    case 1:
                        /*
                        Load schema and init consumer
                        * */
                        _a.sent();
                        if (this.config.reloadInterval && this.config.reloadInterval !== 0) {
                            this.registerSchemaReLoader(this.config.reloadInterval);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    SchemaHandler.prototype.hasKeyParser = function () {
        return !(this.config.keyParserProtocol === 'avro' && !this.keySchemaParser);
    };
    SchemaHandler.prototype.hasValueParser = function () {
        return !(this.config.valueParserProtocol === 'avro' && !this.valueSchemaParser);
    };
    SchemaHandler.prototype.decodeWithValueSchema = function (msgValue) {
        switch (this.config.valueParserProtocol) {
            case 'string':
                var encoding = this.config.valueSchemaConfig.encoding;
                return msgValue.toString(encoding);
            case 'avro':
                return this.valueSchemaParser.fromBuffer(msgValue);
            case 'none':
                break;
        }
    };
    SchemaHandler.prototype.decodeWithKeySchema = function (msgKey) {
        switch (this.config.keyParserProtocol) {
            case 'string':
                var encoding = this.config.keySchemaConfig.encoding;
                return msgKey.toString(encoding);
            case 'avro':
                return this.keySchemaParser.fromBuffer(msgKey);
            case 'none':
                break;
        }
    };
    SchemaHandler.prototype.encodeWithValueSchema = function (msgValue) {
        switch (this.config.valueParserProtocol) {
            case 'avro':
                return this.valueSchemaParser.toBuffer(msgValue);
            default:
                return Buffer.from(msgValue);
        }
    };
    SchemaHandler.prototype.encodeWithKeySchema = function (msgKey) {
        switch (this.config.keyParserProtocol) {
            case 'avro':
                return this.keySchemaParser.toBuffer(msgKey);
            default:
                return Buffer.from(msgKey);
        }
    };
    SchemaHandler.prototype.updateValueSchemaDefinition = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.config.valueParserProtocol === 'avro')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.glueClient.getSchemaVersion(this.config.valueSchemaConfig).promise()];
                    case 1:
                        res = _a.sent();
                        this.valueSchemaDefinition = res.SchemaDefinition;
                        this.valueSchemaParser = avro_js_1.parse(this.valueSchemaDefinition);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    SchemaHandler.prototype.updateKeySchemaDefinition = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.config.keyParserProtocol === 'avro')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.glueClient.getSchemaVersion(this.config.keySchemaConfig).promise()];
                    case 1:
                        res = _a.sent();
                        this.keySchemaDefinition = res.SchemaDefinition;
                        this.keySchemaParser = avro_js_1.parse(this.keySchemaDefinition);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    SchemaHandler.prototype.updateSchemaDefinitions = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([this.updateValueSchemaDefinition(), this.updateKeySchemaDefinition()])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SchemaHandler.prototype.registerSchemaReLoader = function (i) {
        var _this = this;
        rxjs_1.interval(i).subscribe(function (_) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.updateSchemaDefinitions()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    return SchemaHandler;
}());
exports.SchemaHandler = SchemaHandler;
