import { GetSchemaVersionInput } from 'aws-sdk/clients/glue';
import { ConsumerGlobalConfig, ConsumerTopicConfig } from 'node-rdkafka/config';

export interface StringParserConfig {
  encoding: 'utf-8' | 'ascii' | 'ucs2' | 'base64' | 'hex' | 'binary'
}

export type SchemaConfigOption = StringParserConfig | GetSchemaVersionInput
export type ParseProtocols = 'avro' | 'string' | 'none';

export interface ConsumerConfig {
  schema  : {
    region?: string;
    valueParserProtocol: ParseProtocols;
    keyParserProtocol: ParseProtocols;
    valueSchemaConfig?: SchemaConfigOption,
    keySchemaConfig?: SchemaConfigOption,
    reloadInterval?: number;
  }
  kafka: {
    topics: string[],
    topicConfig: ConsumerTopicConfig,
    globalConfig: ConsumerGlobalConfig
  }
}

Buffer.from('').toString();
