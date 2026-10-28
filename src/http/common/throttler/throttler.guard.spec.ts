import { Reflector } from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from './throttler.guard';

describe('ThrottlerBehindProxyGuard', () => {
  const guard = new ThrottlerBehindProxyGuard({ throttlers: [] } as any, {} as any, new Reflector());

  const tracker = (headers: Record<string, string | string[]>, ip = '10.0.0.1') =>
    (guard as any).getTracker({ headers, ip }) as Promise<string>;

  it('falls back to the socket address without a CF-Connecting-IP header', async () => {
    await expect(tracker({})).resolves.toBe('10.0.0.1');
  });

  it('uses CF-Connecting-IP when present', async () => {
    await expect(tracker({ 'cf-connecting-ip': '203.0.113.9' })).resolves.toBe('203.0.113.9');
    await expect(tracker({ 'cf-connecting-ip': '  203.0.113.9 ' })).resolves.toBe('203.0.113.9');
  });

  it('ignores a CF-Connecting-IP value that is not an IP address', async () => {
    await expect(tracker({ 'cf-connecting-ip': 'not-an-ip' })).resolves.toBe('10.0.0.1');
    await expect(tracker({ 'cf-connecting-ip': '203.0.113' })).resolves.toBe('10.0.0.1');
    await expect(tracker({ 'cf-connecting-ip': ['203.0.113.9', '203.0.113.10'] })).resolves.toBe('10.0.0.1');
  });

  it('groups IPv6 clients by their /64 prefix', async () => {
    const prefix = '2001:db8:85a3:1234::/64';

    await expect(tracker({ 'cf-connecting-ip': '2001:db8:85a3:1234:abcd:ef01:2345:6789' })).resolves.toBe(prefix);
    await expect(tracker({ 'cf-connecting-ip': '2001:db8:85a3:1234::1' })).resolves.toBe(prefix);
    await expect(tracker({ 'cf-connecting-ip': '2001:db8:85a3:1235::1' })).resolves.not.toBe(prefix);
  });

  it('normalizes the socket address too', async () => {
    await expect(tracker({}, '2001:db8::1')).resolves.toBe('2001:db8::/64');
  });

  it('reduces an IPv4-mapped IPv6 address to the IPv4 address', async () => {
    await expect(tracker({ 'cf-connecting-ip': '::ffff:203.0.113.9' })).resolves.toBe('203.0.113.9');
    await expect(tracker({}, '::ffff:10.0.0.1')).resolves.toBe('10.0.0.1');
  });
});
