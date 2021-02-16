import { Consumer } from '../src/index';

async function main() {
  const consumer = new Consumer({
    glue: {
      region: 'us-east-1',
      schemaConfig: {
        SchemaId: {
          RegistryName: '----',
          SchemaName: '----'
        },
        SchemaVersionNumber: {
          LatestVersion: true
        }
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
        'group.id': 'test',
        'security.protocol': 'ssl',
        'metadata.broker.list': '----'
      }
    }
  });
  consumer.onReady = (info, metadata) => {
    consumer.kafkaClient.assign([{ topic: 'test', partition: 0, offset: 1 }]);
  };
  await consumer.init();
  consumer.logs$.subscribe(log => {
    console.log(log);
  });
  consumer.errors$.subscribe(err => {
    console.error(err);
  });
  consumer.messages$.subscribe(log => {
    console.log(log);
  });
  consumer.consume();

}

main();
