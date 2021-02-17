import { GetSchemaVersionInput } from 'aws-sdk/clients/glue';
import { ConsumerGlobalConfig, ConsumerTopicConfig } from 'node-rdkafka/config';


export interface ConsumerConfig {
  glue: {
    region?: string;
    valueSchemaConfig?: GetSchemaVersionInput,
    keySchemaConfig?: GetSchemaVersionInput,
    reloadInterval?: number;
  }
  kafka: {
    topics: string[],
    topicConfig: ConsumerTopicConfig,
    globalConfig: ConsumerGlobalConfig
  }
}
