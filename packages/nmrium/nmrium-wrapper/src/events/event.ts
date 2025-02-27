import { EventType, EventData } from './types';

const namespace = 'nmr-wrapper';

function trigger<T extends EventType>(type: T, data: EventData<T>) {
  window.parent.postMessage({ type: `${namespace}:${type}`, data }, '*');
}

function on<T extends EventType>(
  type: T,
  dataListener: (data: EventData<T>) => void,
  options: {
    eventOptions?: boolean | AddEventListenerOptions;
    allowedOrigins?: string[];
  } = {},
) {
  const { eventOptions, allowedOrigins = [] } = options;
  const allowedHostnames = new Set(
    allowedOrigins.map(getHostName).filter(Boolean),
  );

  function listener(event: MessageEvent) {
    const {
      origin,
      data: { type: targetType, data },
    } = event;

    const url = new URL(origin);

    const skipOriginCheck =
      allowedOrigins.length === 0 || allowedOrigins.includes('*');

    if (!skipOriginCheck && !allowedHostnames.has(getHostName(url.origin))) {
      throw new Error(`Invalid Origin ${origin}`);
    }

    if (`${namespace}:${type}` === targetType) {
      dataListener?.(data);
    }
  }
  window.addEventListener(`message`, listener, eventOptions);

  return () => window.removeEventListener(`message`, listener);
}

function getHostName(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return hostname;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    // return null If the URL is invalid
    return null;
  }
}

export default { trigger, on };
