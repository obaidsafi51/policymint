import { describe, expect, it } from 'vitest';
import { Writable } from 'node:stream';
import { logger, createLogger } from './logger';

describe('logger', () => {
  it('instantiates and exposes core log methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.fatal).toBe('function');
  });

  it('includes base service and env fields', () => {
    let output = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      }
    });

    const testLogger = createLogger(destination);
    testLogger.info('test message');

    const parsed = JSON.parse(output.trim());
    expect(parsed).toMatchObject({
      service: 'policymint-backend',
      env: process.env.NODE_ENV,
      msg: 'test message'
    });
  });
});
