import { SchemaHandler } from './schema-handler';
import { SchemaConfig } from '../models/consumer-config';
import { Glue } from 'aws-sdk';

let defaultConfig: SchemaConfig;

beforeEach(() => {
  defaultConfig = {
    region: 'test',
    valueParserProtocol: 'none',
    keyParserProtocol: 'none',
  };
});
describe('schema handler', () => {
  it('should create new instance', function () {
    const s = new SchemaHandler<any, any>({ ...defaultConfig });
    expect(s).toBeDefined();
    expect(s.config).toEqual(defaultConfig);
    expect(s.glueClient).toBeInstanceOf(Glue);
    expect(s.keySchemaDefinition).toEqual(undefined);
    expect(s.keySchemaParser).toEqual(undefined);
    expect(s.valueSchemaDefinition).toEqual(undefined);
    expect(s.valueSchemaParser).toEqual(undefined);
  });
  it('should return true for hasKeyParser when keyParserProtocol is none', function () {
    const s = new SchemaHandler<any, any>({ ...defaultConfig });
    expect(s.hasKeyParser()).toEqual(true);
  });
  it('should return true for hasValueParser when valueParserProtocol is none', function () {
    const s = new SchemaHandler<any, any>({ ...defaultConfig });
    expect(s.hasValueParser()).toEqual(true);
  });
  it('should not update the schemaDef when protocol is string or none', async () => {
    const s = new SchemaHandler<any, any>({ ...defaultConfig });
    await s.updateValueSchemaDefinition();
    await s.updateKeySchemaDefinition();
    expect(s.valueSchemaDefinition).toEqual(undefined);
    expect(s.keySchemaDefinition).toEqual(undefined);
  });
});
