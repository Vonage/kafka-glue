import { SchemaHandler } from './schema-handler';
import { SchemaConfig } from '../models/consumer-config';
import { Glue } from 'aws-sdk';

let defaultConfig: SchemaConfig;

beforeEach(() => {
  defaultConfig = {
    region: 'test',
    valueParserProtocol: 'none',
    keyParserProtocol: 'none'
  };
});
describe('schema handler', () => {
  it('should create new instance', function() {
    const s = new SchemaHandler<any, any>(defaultConfig);
    expect(s).toBeDefined();
    expect(s.config).toEqual(defaultConfig);
    expect(s.glueClient).toBeInstanceOf(Glue);
    expect(s.keySchemaDefinition).toEqual(undefined);
    expect(s.keySchemaParser).toEqual(undefined);
    expect(s.valueSchemaDefinition).toEqual(undefined);
    expect(s.valueSchemaParser).toEqual(undefined);
  });
});
