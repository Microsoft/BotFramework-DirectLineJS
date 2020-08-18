import * as DirectLineExport from "./directLine";
import { Observable } from "rxjs";
import { TestScheduler } from "rxjs/testing"
import { AjaxCreationMethod, AjaxRequest, AjaxResponse } from "rxjs/observable/dom/AjaxObservable";
import { URL, URLSearchParams } from 'url';

// MOCK helpers

const notImplemented = (): never => { throw new Error('not implemented') };

// MOCK Activity

export const mockActivity = (text: string): DirectLineExport.Activity => ({ type: 'message', from: { id: 'sender' }, text });

// MOCK DirectLine Server (shared state used by Observable.ajax and WebSocket mocks)

interface ActivitySocket {
  play: (start: number, after: number) => void;
}

export type Socket = WebSocket & ActivitySocket;

export interface Conversation {
  sockets: Set<Socket>;
  conversationId: string;
  history: Array<DirectLineExport.Activity>;
  token: string;
}

export interface Server {
  scheduler: TestScheduler;
  conversation: Conversation;
}

const tokenPrefix = 'token';

export const mockServer = (scheduler: TestScheduler): Server => ({
  scheduler,
  conversation: {
    sockets: new Set<Socket>(),
    conversationId: 'OneConversation',
    history: [],
    token: tokenPrefix + '1',
  }
});

const tokenResponse = (server: Server, request: AjaxRequest): AjaxResponse | null => {
  const { headers } = request;
  const authorization = headers['Authorization'];
  if (authorization === `Bearer ${server.conversation.token}`) {
    return null;
  }

  const response: Partial<AjaxResponse> = {
    status: 403,
  }

  return response as AjaxResponse;
}

export const injectClose = (server: Server): void =>
  server.conversation.sockets.forEach(s => s.onclose(new CloseEvent('close')));

export const injectNewToken = (server: Server): void => {
  const { conversation } = server;
  const suffix = Number.parseInt(conversation.token.substring(tokenPrefix.length), 10) + 1
  conversation.token = tokenPrefix + suffix;
}

const keyWatermark = 'watermark';

type ajaxType = (urlOrRequest: string | AjaxRequest) => AjaxResponse;

// MOCK Observable.ajax (uses shared state in Server)

export const mockAjax = (server: Server, customAjax?: ajaxType): AjaxCreationMethod => {

  const uriBase = new URL('https://directline.botframework.com/v3/directline/');
  const createStreamUrl = (watermark: number): string => {
    const uri = new URL('conversations/stream', uriBase);
    if (watermark > 0) {
      const params = new URLSearchParams();
      params.append(keyWatermark, watermark.toString(10));
      uri.search = params.toString();
    }

    return uri.toString();
  }

  const jax = customAjax || ((urlOrRequest: string | AjaxRequest): AjaxResponse => {
    if (typeof urlOrRequest === 'string') {
      throw new Error();
    }

    const uri = new URL(urlOrRequest.url);

    const { pathname, searchParams } = uri;

    const parts = pathname.split('/');

    if (parts[3] === 'tokens' && parts[4] === 'refresh') {

      const response: Partial<AjaxResponse> = {
        response: { token: server.conversation.token }
      };

      return response as AjaxResponse;
    }

    if (parts[3] !== 'conversations') {
      throw new Error();
    }

    if (parts.length === 4) {
      const conversation: DirectLineExport.Conversation = {
        conversationId: server.conversation.conversationId,
        token: server.conversation.token,
        streamUrl: createStreamUrl(0),
      };

      const response: Partial<AjaxResponse> = {
        response: conversation,
      }

      return response as AjaxResponse;
    }

    if (parts[4] !== server.conversation.conversationId) {
      throw new Error();
    }

    if (parts[5] === 'activities') {
      const responseToken = tokenResponse(server, urlOrRequest);
      if (responseToken !== null) {
        return responseToken;
      }

      const activity: DirectLineExport.Activity = urlOrRequest.body;

      const after = server.conversation.history.push(activity);
      const start = after - 1;

      for (const socket of server.conversation.sockets) {
        socket.play(start, after);
      }

      const response: Partial<AjaxResponse> = {
        response: { id: 'messageId' },
      }

      return response as AjaxResponse;
    }
    else if (parts.length === 5) {
      const responseToken = tokenResponse(server, urlOrRequest);
      if (responseToken !== null) {
        return responseToken;
      }

      const watermark = searchParams.get('watermark');
      const start = Number.parseInt(watermark, 10);

      const conversation: DirectLineExport.Conversation = {
        conversationId: server.conversation.conversationId,
        token: server.conversation.token,
        streamUrl: createStreamUrl(start),
      };

      const response: Partial<AjaxResponse> = {
        response: conversation,
      }

      return response as AjaxResponse;
    }

    throw new Error();
  });

  const method = (urlOrRequest: string | AjaxRequest): Observable<AjaxResponse> =>
    new Observable<AjaxResponse>(subscriber => {
      try {
        subscriber.next(jax(urlOrRequest));
        subscriber.complete();
      }
      catch (error) {
        subscriber.error(error);
      }
    });

  type ValueType<T, V> = {
    [K in keyof T]: T[K] extends V ? T[K] : never;
  }

  type Properties = ValueType<AjaxCreationMethod, Function>;

  const properties: Properties = {
    get: (url: string, headers?: Object): Observable<AjaxResponse> => notImplemented(),
    post: (url: string, body?: any, headers?: Object): Observable<AjaxResponse> => notImplemented(),
    put: (url: string, body?: any, headers?: Object): Observable<AjaxResponse> => notImplemented(),
    patch: (url: string, body?: any, headers?: Object): Observable<AjaxResponse> => notImplemented(),
    delete: (url: string, headers?: Object): Observable<AjaxResponse> => notImplemented(),
    getJSON: (url: string, headers?: Object) => notImplemented(),
  };

  return Object.assign(method, properties);
}

// MOCK WebSocket (uses shared state in Server)

type WebSocketConstructor = typeof WebSocket;
type EventHandler<E extends Event> = (this: WebSocket, ev: E) => any;

export const mockWebSocket = (server: Server): WebSocketConstructor =>
  class MockWebSocket implements WebSocket, ActivitySocket {
    constructor(url: string, protocols?: string | string[]) {

      server.scheduler.schedule(() => {
        this.readyState = WebSocket.CONNECTING;
        server.conversation.sockets.add(this);
        this.onopen(new Event('open'));
        this.readyState = WebSocket.OPEN;
        const uri = new URL(url);
        const watermark = uri.searchParams.get(keyWatermark)
        if (watermark !== null) {
          const start = Number.parseInt(watermark, 10);
          this.play(start, server.conversation.history.length);
        }
      });
    }

    play(start: number, after: number) {

      const { conversation: { history } } = server;
      const activities = history.slice(start, after);
      const watermark = history.length.toString();
      const activityGroup: DirectLineExport.ActivityGroup = {
        activities,
        watermark,
      }

      const message = new MessageEvent('type', { data: JSON.stringify(activityGroup) });

      this.onmessage(message);
    }

    binaryType: BinaryType = 'arraybuffer';
    readonly bufferedAmount: number = 0;
    readonly extensions: string = '';
    readonly protocol: string = 'https';
    readyState: number = WebSocket.CLOSED;
    readonly url: string = '';
    readonly CLOSED: number = WebSocket.CLOSED;
    readonly CLOSING: number = WebSocket.CLOSING;
    readonly CONNECTING: number = WebSocket.CONNECTING;
    readonly OPEN: number = WebSocket.OPEN;

    onclose: EventHandler<CloseEvent>;
    onerror: EventHandler<Event>;
    onmessage: EventHandler<MessageEvent>;
    onopen: EventHandler<Event>;

    close(code?: number, reason?: string): void {
      this.readyState = WebSocket.CLOSING;
      this.onclose(new CloseEvent('close'))
      server.conversation.sockets.delete(this);
      this.readyState = WebSocket.CLOSED;
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    }

    addEventListener() { throw new Error(); }
    removeEventListener() { throw new Error(); }
    dispatchEvent(): boolean { throw new Error(); }

    static CLOSED = WebSocket.CLOSED;
    static CLOSING = WebSocket.CLOSING;
    static CONNECTING = WebSocket.CONNECTING;
    static OPEN = WebSocket.OPEN;
  };

// MOCK services (top-level aggregation of all mocks)

export const mockServices = (server: Server, scheduler: TestScheduler): DirectLineExport.Services => ({
  scheduler,
  WebSocket: mockWebSocket(server),
  ajax: mockAjax(server),
  random: () => 0,
});
