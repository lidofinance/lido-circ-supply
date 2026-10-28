import { Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ServerErrorNoStoreFilter } from './server-error-no-store.filter';

describe('ServerErrorNoStoreFilter', () => {
  let header: jest.Mock;
  let reply: jest.Mock;
  let filter: ServerErrorNoStoreFilter;
  const response = { header: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({}) }),
    getArgByIndex: () => response,
  } as any;

  // the base filter logs every unknown error; keep the expected ones out of the test output
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  beforeEach(() => {
    header = response.header = jest.fn();
    reply = jest.fn();
    filter = new ServerErrorNoStoreFilter({ reply, isHeadersSent: () => false } as any);
  });

  it('marks a 503 as not cacheable', () => {
    filter.catch(new ServiceUnavailableException('no data yet'), host);

    expect(header).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ statusCode: 503 }), 503);
  });

  it('marks an unexpected error as not cacheable', () => {
    filter.catch(new Error('boom'), host);

    expect(header).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ statusCode: 500 }), 500);
  });

  it('marks a 5xx http error from the server as not cacheable', () => {
    filter.catch({ statusCode: 502, message: 'bad gateway' }, host);

    expect(header).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('leaves client errors untouched', () => {
    filter.catch(new NotFoundException(), host);
    filter.catch({ statusCode: 400, message: 'bad request' }, host);

    expect(header).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ statusCode: 404 }), 404);
  });
});
