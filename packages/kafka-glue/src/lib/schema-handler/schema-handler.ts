import { SchemaConfig, StringParserConfig } from '../models/consumer-config';
import { Glue } from 'aws-sdk';
import { parse } from 'avro-js';
import {
  GetSchemaVersionInput,
  GetSchemaVersionResponse,
} from 'aws-sdk/clients/glue';
import { interval } from 'rxjs';

export class SchemaHandler<ParsedValueInterface, ParsedKeyInterface> {
  config: SchemaConfig;
  glueClient: Glue;
  valueSchemaDefinition: string;
  valueSchemaParser;

  keySchemaDefinition: string;
  keySchemaParser;

  constructor(config: SchemaConfig) {
    this.config = { ...config };
    this.glueClient = new Glue({ region: this.config.region });
  }

  async init() {
    /*
    Load schema and init consumer
    * */
    await this.updateSchemaDefinitions();
    if (this.config.reloadInterval && this.config.reloadInterval !== 0) {
      this.registerSchemaReLoader(this.config.reloadInterval);
    }
  }

  public hasKeyParser() {
    return !(this.config.keyParserProtocol === 'avro' && !this.keySchemaParser);
  }

  public hasValueParser() {
    return !(
      this.config.valueParserProtocol === 'avro' && !this.valueSchemaParser
    );
  }

  public decodeWithValueSchema(msgValue: Buffer) {
    const encoding = (this.config.valueSchemaConfig as StringParserConfig)
      .encoding;

    switch (this.config.valueParserProtocol) {
      case 'string':
        return (msgValue.toString(encoding) as unknown) as ParsedValueInterface;
      case 'avro':
        return this.valueSchemaParser.fromBuffer(
          msgValue
        ) as ParsedValueInterface;
      case 'none':
        break;
    }
  }

  public decodeWithKeySchema(msgKey: Buffer) {
    const encoding = (this.config.keySchemaConfig as StringParserConfig)
      .encoding;

    switch (this.config.keyParserProtocol) {
      case 'string':
        return (msgKey.toString(encoding) as unknown) as ParsedKeyInterface;
      case 'avro':
        return this.keySchemaParser.fromBuffer(msgKey) as ParsedKeyInterface;
      case 'none':
        break;
    }
  }

  public encodeWithValueSchema(msgValue: string): string | Buffer {
    switch (this.config.valueParserProtocol) {
      case 'avro':
        return this.valueSchemaParser.toBuffer(msgValue) as Buffer;
      default:
        return Buffer.from(msgValue) as Buffer;
    }
  }

  public encodeWithKeySchema(msgKey: string): string | Buffer {
    switch (this.config.keyParserProtocol) {
      case 'avro':
        return this.keySchemaParser.toBuffer(msgKey) as Buffer;
      default:
        return Buffer.from(msgKey) as Buffer;
    }
  }

  async updateValueSchemaDefinition() {
    if (this.config.valueParserProtocol === 'avro') {
      const res: GetSchemaVersionResponse = await this.glueClient
        .getSchemaVersion(
          this.config.valueSchemaConfig as GetSchemaVersionInput
        )
        .promise();
      this.valueSchemaDefinition = res.SchemaDefinition;
      this.valueSchemaParser = parse(this.valueSchemaDefinition);
    }
  }

  async updateKeySchemaDefinition() {
    if (this.config.keyParserProtocol === 'avro') {
      const res: GetSchemaVersionResponse = await this.glueClient
        .getSchemaVersion(this.config.keySchemaConfig as GetSchemaVersionInput)
        .promise();
      this.keySchemaDefinition = res.SchemaDefinition;
      this.keySchemaParser = parse(this.keySchemaDefinition);
    }
  }

  async updateSchemaDefinitions() {
    await Promise.all([
      this.updateValueSchemaDefinition(),
      this.updateKeySchemaDefinition(),
    ]);
  }

  registerSchemaReLoader(i: number) {
    interval(i).subscribe(async () => {
      await this.updateSchemaDefinitions();
    });
  }
}
