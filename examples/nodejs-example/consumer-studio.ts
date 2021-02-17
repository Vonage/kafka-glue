import { Consumer } from '../../packages/kafka-glue/src';
function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
async function main() {

  const consumer = new Consumer<{type : string}, string>({
    schema: {
      region: 'us-east-1',
      valueParserProtocol: 'avro',
      keyParserProtocol: 'string',
      valueSchemaConfig: {
        SchemaId: {
          RegistryName: 'StudioKafkaSchemaRegistry',
          SchemaName: 'flow-executed-node-message'
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
        // 'debug': 'consumer,cgrp,topic,fetch',
        'log_level': 3,
        'enable.auto.offset.store': false,
        'enable.auto.commit': false,
        'group.id': makeid(10),
        'security.protocol': 'ssl',
        'metadata.broker.list': 'b-1.studio-msk.do7ef5.c11.kafka.us-east-1.amazonaws.com:9094,b-2.studio-msk.do7ef5.c11.kafka.us-east-1.amazonaws.com:9094,b-3.studio-msk.do7ef5.c11.kafka.us-east-1.amazonaws.com:9094'
      }
    }
  });
  consumer.onReady = (info, metadata) => {
    // consumer.kafkaClient.assign([{ topic: 'test', partition: 0, offset: 1 }]);
  };
  await consumer.init();
  consumer.logs$.subscribe(log => {
    console.warn(log);
  });
  consumer.errors$.subscribe(err => {
    console.error(err);
  });
  consumer.messages$.subscribe(msg => {
    console.log(msg)
  });
  consumer.consume();
}

main();
