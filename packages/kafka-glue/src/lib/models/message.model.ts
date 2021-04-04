import { Message } from 'node-rdkafka';

export interface KafkaMessage<T1, T2> extends Message {
  parsedValue: T1;
  parsedKey: T2;
}
