# kafka-glue

Kafka Glue is a collection of libraries for kafka consumers and producers integrated with AWS Glue schema registry with RXJS to expose streaming of the kafka messages.

## Usage Examples
### Producer

#### Create the instance
```ts
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
```
#### (Optional) Set callback for the on ready event
```ts
producer.onReady = (info, metadata) => {
    // console.log(info, metadata);
  };
```
#### Initialize the instance (make sure to use await as this is an async function)
```ts
  await producer.init();
```
#### Add subscribers for errors, logs, and delivery reports
```ts
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
```
#### Produce messages! 🥳
```ts
producer.produce({type: 'test'}, 'test', Date.now());
producer.produce({type: 'test2'}, 'test', Date.now());
```
please refer [Node JS Producer Example](../../examples/nodejs-example/producer.ts) for the full example.

---

### Consumer

#### Create the instance
```ts
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
        'group.id': '<id>',
        'security.protocol': 'ssl',
        'metadata.broker.list': '<list>'
      }
    }
  });
```
#### (Optional) Set callback for the on ready event
```ts
// set callback that will be fired once kafkaClient is ready to subscribe
  consumer.onReady = (info, metadata) => {
    consumer.kafkaClient.assign([{ topic: 'test', partition: 0, offset: 1 }]);
  };
```
#### Initialize the instance (make sure to use await as this is an async function)
```ts
  await consumer.init();
```
#### Add subscribers for errors, logs, and incoming messages
```ts
consumer.logs$.subscribe(log => {
    // console.log(log.message);
  });
  consumer.errors$.subscribe(err => {
    console.error(err);
  });
  consumer.messages$.subscribe(msg => {
    console.log(msg);
  });
```
#### Start the consumer 🥳
```ts
consumer.consume();
```
please refer [Node JS Consumer Example](../../examples/nodejs-example/consumer.ts) for the full example.
