import { kafkaGlue } from './kafka-glue';

describe('kafkaGlue', () => {
  it('should work', () => {
    expect(kafkaGlue()).toEqual('kafka-glue');
  });
});
