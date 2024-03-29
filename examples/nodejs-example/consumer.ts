import { Consumer } from '../../packages/kafka-glue/src';

async function main() {
  const consumer = new Consumer({
    schema: {
      region: 'us-east-1',
      valueParserProtocol: 'avro',
      keyParserProtocol: 'string',
      valueSchemaConfig: {
        SchemaId: {
          RegistryName: '----',
          SchemaName: '----'
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
      topics: ['test'],
      topicConfig: {
        'auto.offset.reset': 'earliest'
      },
      globalConfig: {
        'enable.auto.offset.store': false,
        'enable.auto.commit': false,
        'group.id': 'a',
        'security.protocol': 'ssl',
        'metadata.broker.list': 'kafka.us-east-1.amazonaws.com:9094'
      }
    }
  });

  // set callback that will be fired once kafkaClient is ready to subscribe
  consumer.onReady = (info, metadata) => {
    consumer.kafkaClient.assign([{ topic: 'test', partition: 0, offset: 1 }]);
  };

  await consumer.init();
  consumer.logs$.subscribe(log => {
    // console.log(log.message);
  });
  consumer.errors$.subscribe(err => {
    console.error(err);
  });
  consumer.messages$.subscribe(msg => {
    console.log(msg);
  });
  consumer.consume();

}

main();
