import { ClientMetrics, KafkaConsumer, LibrdKafkaError, Message } from 'node-rdkafka';
import { ConsumerConfig } from './models/config';
import { Glue } from 'aws-sdk';
import { GetSchemaVersionResponse } from 'aws-sdk/clients/glue';
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
    this.glueClient = new Glue({ region: this.config.glue.region });
    this.kafkaClient = new KafkaConsumer(this.config.kafka.globalConfig, this.config.kafka.topicConfig);
  }

  async init() {
    /*
    Load schema and init consumer
    * */
    await this.updateSchemaDefinitions();
    if (this.config.glue.reloadInterval && this.config.glue.reloadInterval !== 0) {
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


  consume() {
    if (!this.valueSchemaDefinition) {
      throw new Error('Please make sure you init the consumer before consuming messages');
    }

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
      msg.parsedValue = this.valueSchemaParser.fromBuffer(msg.value);
      msg.parsedKey = this.valueSchemaParser.fromBuffer(msg.key);
      this._messages.next(msg);
    });

    this.kafkaClient.on('disconnected', (arg: ClientMetrics) => {
      const log: Log = {
        severity: 0,
        fac: 'DISCONNECTED',
        message: 'Disconnected connection: ' + arg.connectionOpened
      };
      this._logs.complete();
      this._errors.complete();
      this._messages.complete();
    });

    this.kafkaClient.connect();
  }

  async updateValueSchemaDefinition() {
    const res: GetSchemaVersionResponse = await this.glueClient.getSchemaVersion(this.config.glue.valueSchemaConfig).promise();
    this.valueSchemaDefinition = res.SchemaDefinition;
    this.valueSchemaParser = avro.parse(this.valueSchemaDefinition);
  }

  async updateKeySchemaDefinition() {
    const res: GetSchemaVersionResponse = await this.glueClient.getSchemaVersion(this.config.glue.keySchemaConfig).promise();
    this.keySchemaDefinition = res.SchemaDefinition;
    this.keySchemaParser = avro.parse(this.keySchemaDefinition);
  }

  async updateSchemaDefinitions() {
    await Promise.all([this.updateValueSchemaDefinition(), this.updateKeySchemaDefinition()]);
  }

  registerSchemaReLoader() {
    interval(this.config.glue.reloadInterval).subscribe(async (_) => {
      console.log('Updating schema');
      await this.updateSchemaDefinitions();
    });
  }
}
