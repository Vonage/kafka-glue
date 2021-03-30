import { GetSchemaVersionInput } from 'aws-sdk/clients/glue';
import { ConsumerGlobalConfig, ConsumerTopicConfig } from 'node-rdkafka/config';

export interface StringParserConfig {
  encoding: 'utf-8' | 'ascii' | 'ucs2' | 'base64' | 'hex' | 'binary'
}

export type SchemaConfigOption = StringParserConfig | GetSchemaVersionInput
export type ParseProtocols = 'avro' | 'string' | 'none';

export interface SchemaConfig {
  region?: string;
  valueParserProtocol: ParseProtocols;
  keyParserProtocol: ParseProtocols;
  valueSchemaConfig?: SchemaConfigOption,
  keySchemaConfig?: SchemaConfigOption,
  reloadInterval?: number;
}

export interface ConsumerConfig {
  schema: SchemaConfig,
  kafka: {
    topics: string[],
    topicConfig: ConsumerTopicConfig,
    globalConfig: ConsumerGlobalConfig
  }
}
