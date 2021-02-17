import { GetSchemaVersionInput } from 'aws-sdk/clients/glue';
import { ConsumerGlobalConfig, ConsumerTopicConfig } from 'node-rdkafka/config';
import { Metadata, ReadyInfo } from 'node-rdkafka';

export interface ConsumerConfig {
  glue: {
    region?: string;
    schemaConfig?: GetSchemaVersionInput,
    reloadInterval?: number;
  }
  kafka: {
    topics: string[],
    topicConfig: ConsumerTopicConfig,
    globalConfig: ConsumerGlobalConfig
  }
}
