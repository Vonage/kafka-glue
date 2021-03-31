import { ClientMetrics, KafkaConsumer, LibrdKafkaError } from 'node-rdkafka';
import { ConsumerConfig } from '../..';
import { Subject, Observable } from 'rxjs';
import { Log } from '../models/log.model';
import { KafkaMessage } from '../models/message.model';
import { SchemaHandler } from '../schema-handler/schema-handler';

export class Consumer<ParsedValueInterface, ParsedKeyInterface> {
  config: ConsumerConfig;
  kafkaClient: KafkaConsumer;
  schemaHandler: SchemaHandler<ParsedValueInterface, ParsedKeyInterface>;
  _messages: Subject<KafkaMessage<ParsedValueInterface, ParsedKeyInterface>> = new Subject<KafkaMessage<ParsedValueInterface, ParsedKeyInterface>>();
  _logs: Subject<Log> = new Subject<Log>();
  _errors: Subject<LibrdKafkaError> = new Subject<LibrdKafkaError>();

  onReadyCallback: (info, metadata) => void;

  constructor(config: ConsumerConfig) {
    this.config = { ...config };
    this.kafkaClient = new KafkaConsumer(this.config.kafka.globalConfig, this.config.kafka.topicConfig);
    this.schemaHandler = new SchemaHandler<ParsedValueInterface, ParsedKeyInterface>(this.config.schema);
  }

  async init() {

    /*
    Load schema and init consumer
    * */
    await this.schemaHandler.init();
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
    if (!this.schemaHandler.hasKeyParser()) {
      throw new Error('You are missing key parser, please make sure you init the consumer and that you have provided a valid keySchemaConfig');
    }
    if (!this.schemaHandler.hasValueParser()) {
      throw new Error('You are missing value parser, please make sure you init the consumer and that you have provided a valid valueSchemaConfig');
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
      try {
        msg.parsedValue = this.schemaHandler.decodeWithValueSchema(<Buffer>msg.value);
      } catch (e) {
        const error: LibrdKafkaError = {
          message: 'Failed to parse value according to valueParserProtocol',
          code: 43,
          errno: 43,
          origin: 'ValueParser'
        };
        this._errors.next(error);
        return;
      }
      try {
        msg.parsedKey = this.schemaHandler.decodeWithKeySchema(<Buffer>msg.key);
      } catch (e) {
        const error: LibrdKafkaError = {
          message: 'Failed to parse key according to keyParserProtocol',
          code: 43,
          errno: 43,
          origin: 'KeyParser',
          stack: e.stack
        };
        this._errors.next(error);
        return;
      }

      this._messages.next(msg);
    });

    this.kafkaClient.on('disconnected', (arg: ClientMetrics) => {
      const log: Log = {
        severity: 0,
        fac: 'DISCONNECTED',
        message: 'Disconnected connection: ' + arg.connectionOpened
      };
      this._logs.next(log);
      this._logs.complete();
      this._errors.complete();
      this._messages.complete();
    });

    this.kafkaClient.connect();
  }
}
