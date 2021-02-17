import { KafkaConsumer, LibrdKafkaError, Message } from 'node-rdkafka';
import { ConsumerConfig } from './models/config';
import { Glue } from 'aws-sdk';
import { GetSchemaVersionResponse } from 'aws-sdk/clients/glue';
import { interval, BehaviorSubject, Subject, Observable } from 'rxjs';
import * as avro from 'avro-js';
import { Log } from './models/log.model';

export class Consumer {
  config: ConsumerConfig;
  glueClient: Glue;
  kafkaClient: KafkaConsumer;
  schemaDefinition: string;
  schemaParser;

  _messages: Subject<any> = new Subject<any>();
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
    await this.updateSchemaDefinition();
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

  get messages$(): Observable<Message> {
    return this._messages.asObservable();
  }

  set onReady(func: (info, metadata) => void) {
    this.onReadyCallback = func;
  }


  consume() {
    if (!this.schemaDefinition) {
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
    this.kafkaClient.on('data', (msg: Message) => {
      msg.value = this.schemaParser.fromBuffer(msg.value);
      this._messages.next(msg);
    });

    this.kafkaClient.on('disconnected', function(arg) {
      console.log('consumer disconnected. ' + JSON.stringify(arg));
    });

    this.kafkaClient.connect();
  }

  async updateSchemaDefinition() {
    await this.glueClient.getSchemaVersion(this.config.glue.schemaConfig).promise().then((res: GetSchemaVersionResponse) => {
      this.schemaDefinition = res.SchemaDefinition;
      this.schemaParser = avro.parse(this.schemaDefinition);
    });
  }

  registerSchemaReLoader() {
    interval(this.config.glue.reloadInterval).subscribe(async (_) => {
      console.log('Updating schema');
      await this.updateSchemaDefinition();
    });
  }
}
