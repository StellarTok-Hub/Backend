import { EventEmitter } from 'events';

const fakeSubscriber = Object.assign(new EventEmitter(), {
  subscribe: jest.fn().mockResolvedValue(1),
});

jest.mock('../src/redis/client', () => ({
  createSubscriber: () => fakeSubscriber,
  TIP_EVENTS_CHANNEL: 'tips:events',
}));

import { ensureTipEventSubscription, tipEventBus } from '../src/redis/tipEventBus';

describe('tipEventBus', () => {
  it(
    'subscribes to redis exactly once no matter how many clients connect, and ' +
      'fans each message out to every listening SSE client',
    async () => {
      await ensureTipEventSubscription();
      await ensureTipEventSubscription();
      await ensureTipEventSubscription();

      expect(fakeSubscriber.subscribe).toHaveBeenCalledTimes(1);

      const received: string[] = [];
      const listenerA = (msg: string) => received.push(`A:${msg}`);
      const listenerB = (msg: string) => received.push(`B:${msg}`);

      tipEventBus.on('tip', listenerA);
      tipEventBus.on('tip', listenerB);

      fakeSubscriber.emit('message', 'tips:events', '{"amount":1}');

      tipEventBus.off('tip', listenerA);
      tipEventBus.off('tip', listenerB);

      expect(received.sort()).toEqual(['A:{"amount":1}', 'B:{"amount":1}']);
    },
  );
});
