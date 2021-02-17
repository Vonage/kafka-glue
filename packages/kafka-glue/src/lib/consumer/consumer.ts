import { ClientMetrics, KafkaConsumer, LibrdKafkaError, Message } from 'node-rdkafka';
import { ConsumerConfig, StringParserConfig } from './models/config';
import { Glue } from 'aws-sdk';
import { GetSchemaVersionInput, GetSchemaVersionResponse } from 'aws-sdk/clients/glue';
import { interval, Subject, Observable } from 'rxjs';
import * as avro from 'avro-js';
import { Log } from './models/log.model';
import { KafkaMessage } from './models/message.model';

export class Consumer<ParsedValueInterface, ParsedKeyInterface> {
  config: ConsumerConfig;
  glueClient: Glue;
  kafkaClient: KafkaConsumer;

  valueSchemaDefinition: string;
  valueSchemaParser;

  keySchemaDefinition: string;
  keySchemaParser;

  _messages: Subject<KafkaMessage<ParsedValueInterface, ParsedKeyInterface>> = new Subject<KafkaMessage<ParsedValueInterface, ParsedKeyInterface>>();
  _logs: Subject<Log> = new Subject<Log>();
  _errors: Subject<LibrdKafkaError> = new Subject<LibrdKafkaError>();

  onReadyCallback: (info, metadata) => void;

  constructor(config: ConsumerConfig) {
    this.config = config;
    this.glueClient = new Glue({ region: this.config.schema.region });
    this.kafkaClient = new KafkaConsumer(this.config.kafka.globalConfig, this.config.kafka.topicConfig);
  }

  async init() {
    /*
    Load schema and init consumer
    * */
    await this.updateSchemaDefinitions();
    if (this.config.schema.reloadInterval && this.config.schema.reloadInterval !== 0) {
      this.registerSchemaReLoader();
    }
  }

  get logs$(): Observable<Log> {
    return this._logs.asObservable();
  }

  get errors$(): Observable<LibrdKafkaError> {
    /*
    Subscribe errors to get all consumer related errors
    */
    return this._errors.asObservable();
  }

  get messages$(): Observable<KafkaMessage<ParsedValueInterface, ParsedKeyInterface>> {
    return this._messages.asObservable();
  }

  set onReady(func: (info, metadata) => void) {
    this.onReadyCallback = func;
  }

  canStartConsumer() {
    if (this.config.schema.keyParserProtocol === 'avro' && !this.keySchemaParser) {
      throw new Error('You are missing key parser, please make sure you init the consumer and that you have provided a valid keySchemaConfig');
    }
    if (this.config.schema.valueParserProtocol === 'avro' && !this.valueSchemaParser) {
      throw new Error('You are missing value parser, please make sure you init the consumer and that you have provided a valid valueSchemaConfig');
    }
  }

  consume() {
    this.canStartConsumer();

    this.kafkaClient.on('event.log', (eventData: Log) => {
      this._logs.next(eventData);
    });

    this.kafkaClient.on('event.error', (err: LibrdKafkaError) => {
      this._errors.next(err);
    });

    this.kafkaClient.on('ready', (info, metadata) => {
      if (this.onReadyCallback) {
        this.onReadyCallback(info, metadata);
      }
      this.kafkaClient.subscribe(this.config.kafka.topics);
      this.kafkaClient.consume();
    });
    this.kafkaClient.on('data', (msg: KafkaMessage<ParsedValueInterface, ParsedKeyInterface>) => {
      try {
        switch (this.config.schema.valueParserProtocol) {
          case 'string':
            const encoding = (this.config.schema.valueSchemaConfig as StringParserConfig).encoding;
            msg.parsedValue = msg.value.toString(encoding) as unknown as ParsedValueInterface;
            break;
          case 'avro':
            msg.parsedValue = this.valueSchemaParser.fromBuffer(msg.value) as ParsedValueInterface;
            break;
          case 'none':
            break;
        }
      } catch (e) {
        const error: LibrdKafkaError = {
          message: 'Failed to parse value according to valueParserProtocol',
          code: 43,
          errno: 43,
          origin: 'ValueParser'
        };
        this._errors.next(error);
      }
      try {
        switch (this.config.schema.keyParserProtocol) {
          case 'string':
            const encoding = (this.config.schema.keySchemaConfig as StringParserConfig).encoding;
            msg.parsedKey = msg.key.toString(encoding) as unknown as ParsedKeyInterface;
            break;
          case 'avro':
            msg.parsedKey = this.keySchemaParser.fromBuffer(msg.key) as ParsedKeyInterface;
            break;
          case 'none':
            break;
        }
      } catch (e) {
        const error: LibrdKafkaError = {
          message: 'Failed to parse key according to keyParserProtocol',
          code: 43,
          errno: 43,
          origin: 'ValueParser',
          stack: e.stack,
        };
        this._errors.next(error);
      }

      this._messages.next(msg);
    });

    this.kafkaClient.on('disconnected', (arg: ClientMetrics) => {
      const log: Log = {
        severity: 0,
        fac: 'DISCONNECTED',
        message: 'Disconnected connection: ' + arg.connectionOpened
      };
      this._logs.next(log)
      this._logs.complete();
      this._errors.complete();
      this._messages.complete();
    });

    this.kafkaClient.connect();
  }

  async updateValueSchemaDefinition() {
    if (this.config.schema.valueParserProtocol === 'avro') {
      const res: GetSchemaVersionResponse = await this.glueClient.getSchemaVersion(this.config.schema.valueSchemaConfig as GetSchemaVersionInput).promise();
      this.valueSchemaDefinition = res.SchemaDefinition;
      this.valueSchemaParser = avro.parse(this.valueSchemaDefinition);
    }
  }

  async updateKeySchemaDefinition() {
    if (this.config.schema.keyParserProtocol === 'avro') {
      const res: GetSchemaVersionResponse = await this.glueClient.getSchemaVersion(this.config.schema.keySchemaConfig as GetSchemaVersionInput).promise();
      this.keySchemaDefinition = res.SchemaDefinition;
      this.keySchemaParser = avro.parse(this.keySchemaDefinition);
    }
  }

  async updateSchemaDefinitions() {
    await Promise.all([this.updateValueSchemaDefinition(), this.updateKeySchemaDefinition()]);
  }

  registerSchemaReLoader() {
    interval(this.config.schema.reloadInterval).subscribe(async (_) => {
      console.log('Updating schema');
      await this.updateSchemaDefinitions();
    });
  }
}
