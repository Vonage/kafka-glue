import {
  ProducerGlobalConfig,
  ProducerTopicConfig
} from 'node-rdkafka/config';
import { SchemaConfig } from './consumer-config';

export interface ProducerConfig {
  schema: SchemaConfig,
  kafka: {
    topic: string,
    pullInterval: number;
    topicConfig: ProducerTopicConfig
    globalConfig: ProducerGlobalConfig
  }
}
