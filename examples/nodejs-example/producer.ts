import { Producer } from '../../packages/kafka-glue/src';

async function main() {

  const producer = new Producer<{type: string}, string>({
    schema: {
      region: 'us-east-1',
      valueParserProtocol: 'avro',
      keyParserProtocol: 'string',
      valueSchemaConfig: {
        SchemaId: {
          RegistryName: '<name>',
          SchemaName: '<name>'
        },
        SchemaVersionNumber: {
          LatestVersion: true
        }
      },
      keySchemaConfig: {
        encoding: 'utf-8'
      }
    },
    kafka: {
      topic: '<name>',
      pullInterval: 300,
      topicConfig: {},
      globalConfig: {
        // 'debug': 'producer,cgrp,topic,fetch',
        'log_level': 3,
        'security.protocol': 'ssl',
        'metadata.broker.list': '<list>'
      }
    }
  });
  producer.onReady = (info, metadata) => {
    // console.log(info, metadata);
  };
  await producer.init();
  producer.logs$.subscribe(log => {
    console.warn({ log });
  });
  producer.errors$.subscribe(err => {
    console.error(err);
  });
  producer._deliveryReport.subscribe(report => {
    console.log({ report });
  });
  producer._offsetReport.subscribe(offset => {
    console.log(`Offset: ${offset}`);
  });
  producer.produce({type: 'test'}, 'test', Date.now());
}

main();
