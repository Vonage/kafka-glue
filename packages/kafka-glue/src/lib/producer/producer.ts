import {
  ClientMetrics,
  DeliveryReport,
  HighLevelProducer,
  LibrdKafkaError,
  Metadata,
  NumberNullUndefined,
} from 'node-rdkafka';
import { Subject, Observable } from 'rxjs';
import { Log } from '../models/log.model';
import { SchemaHandler } from '../schema-handler/schema-handler';
import { ProducerConfig } from '../models/producer-config';

export class Producer<ValueInterface, KeyInterface> {
  config: ProducerConfig;
  kafkaClient: HighLevelProducer;
  schemaHandler: SchemaHandler<any, any>;
  _offsetReport: Subject<number> = new Subject<number>();
  _deliveryReport: Subject<DeliveryReport> = new Subject<DeliveryReport>();
  _logs: Subject<Log> = new Subject<Log>();
  _errors: Subject<LibrdKafkaError> = new Subject<LibrdKafkaError>();

  onReadyCallback: (info, metadata) => void;

  constructor(config: ProducerConfig) {
    this.config = { ...config };
    this.kafkaClient = new HighLevelProducer(
      this.config.kafka.globalConfig,
      this.config.kafka.topicConfig
    );
    this.schemaHandler = new SchemaHandler<ValueInterface, KeyInterface>(
      this.config.schema
    );
  }

  async init() {
    /*
    Load schema and init consumer
    * */
    await this.schemaHandler.init();
    if (!this.schemaHandler.hasKeyParser()) {
      throw new Error(
        'You are missing key parser, please make sure you init the consumer and that you have provided a valid keySchemaConfig'
      );
    }
    if (!this.schemaHandler.hasValueParser()) {
      throw new Error(
        'You are missing value parser, please make sure you init the consumer and that you have provided a valid valueSchemaConfig'
      );
    }
    this.kafkaClient.setValueSerializer((v) => {
      return this.schemaHandler.encodeWithValueSchema(v);
    });
    this.kafkaClient.setKeySerializer((k) => {
      return this.schemaHandler.encodeWithKeySchema(k);
    });

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
    });
    this.kafkaClient.on('delivery-report', (err, report: DeliveryReport) => {
      if (err) {
        this._errors.next(err);
      }
      if (report) {
        this._deliveryReport.next(report);
      }
    });
    this.kafkaClient.on('disconnected', (arg: ClientMetrics) => {
      const log: Log = {
        severity: 0,
        fac: 'DISCONNECTED',
        message: 'Disconnected connection: ' + arg.connectionOpened,
      };
      this._logs.next(log);
      this._logs.complete();
      this._errors.complete();
      this._deliveryReport.complete();
      this._offsetReport.complete();
    });
    await this.connect();
    this.kafkaClient.setPollInterval(this.config.kafka.pullInterval);
  }

  private async connect() {
    return new Promise<Metadata>((resolve, reject) => {
      this.kafkaClient.connect(
        { topic: this.config.kafka.topic },
        (err: LibrdKafkaError, data: Metadata) => {
          if (err) reject(err);
          resolve(data);
        }
      );
    });
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

  get deliveryReport$(): Observable<any> {
    return this._deliveryReport.asObservable();
  }

  set onReady(func: (info, metadata) => void) {
    this.onReadyCallback = func;
  }

  produce(
    message: ValueInterface,
    key: KeyInterface,
    timestamp: NumberNullUndefined = null,
    partition = null
  ) {
    this.kafkaClient.produce(
      this.config.kafka.topic,
      partition,
      message,
      key,
      timestamp,
      (err, offset) => {
        if (err) {
          this._errors.next(err);
        }
        if (offset) {
          this._offsetReport.next(offset);
        }
      }
    );
  }
}
