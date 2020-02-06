// In order to keep file size down, only import the parts of rxjs that we use

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import * as BFSE from 'botframework-streaming';

import {
  Activity,
  ConnectionStatus,
  Conversation,
  IBotConnection,
  Media,
  Message
} from './directLine';

const DIRECT_LINE_VERSION = 'DirectLine/3.0';
const MAX_RETRY_COUNT = 3;
const refreshTokenLifetime = 30 * 60 * 1000;
const timeout = 20 * 1000;
const refreshTokenInterval = refreshTokenLifetime / 2;

interface DirectLineStreamingOptions {
  token: string,
  conversationId?: string,
  domain: string,
  // Attached to all requests to identify requesting agent.
  botAgent?: string
}

class StreamHandler implements BFSE.RequestHandler {
  private connectionStatus$;
  private subscriber: Subscriber<Activity>;
  private shouldQueue: () => boolean;
  private activityQueue: Array<Activity> = [];

  constructor(s: Subscriber<Activity>, c$: Observable<ConnectionStatus>, sq: () => boolean) {
    this.subscriber = s;
    this.connectionStatus$ = c$;
    this.shouldQueue = sq;
  }

  public setSubscriber(s: Subscriber<Activity>) {
    this.subscriber = s;
  }

  async processRequest(request: BFSE.IReceiveRequest, logger?: any): Promise<BFSE.StreamingResponse> {
    const streams = [...request.streams];
    const stream0 = streams.shift();
    const activitySetJson = await stream0.readAsString();
    const activitySet = JSON.parse(activitySetJson);

    if (activitySet.activities.length !== 1) {
      // Only one activity is expected in a set in streaming
      this.subscriber.error(new Error('there should be exactly one activity'));
      return BFSE.StreamingResponse.create(500);
    }

    const activity = activitySet.activities[0];

    if (streams.length > 0) {
      let attachments = [...activity.attachments];

      let stream: BFSE.ContentStream;
      while (stream = streams.shift()) {
        const attachment = await stream.readAsString();
        const dataUri = "data:text/plain;base64," + attachment;
        attachments.push({ contentType: stream.contentType, contentUrl: dataUri });
      }

      activity.attachments = attachments;
    }

    if (this.shouldQueue()) {
      this.activityQueue.push(activity);
    } else {
      this.subscriber.next(activity);
    }

    return BFSE.StreamingResponse.create(200);
  }

  public flush() {
    this.connectionStatus$.subscribe(cs => { })
    this.activityQueue.forEach((a) => this.subscriber.next(a));
    this.activityQueue = [];
  }
}

export class DirectLineStreaming implements IBotConnection {
  public connectionStatus$ = new BehaviorSubject(ConnectionStatus.Uninitialized);
  public activity$: Observable<Activity>;

  private activitySubscriber: Subscriber<Activity>;
  private theStreamHandler: StreamHandler;

  private retryCount = MAX_RETRY_COUNT;

  private domain: string;

  private conversationId: string;
  private token: string;
  private streamConnection: BFSE.WebSocketClient;
  private queueActivities: boolean;

  private _botAgent = '';

  constructor(options: DirectLineStreamingOptions) {
    this.token = options.token;

    this.refreshToken();

    this.domain = options.domain;

    if (options.conversationId) {
      this.conversationId = options.conversationId;
    }

    this._botAgent = this.getBotAgent(options.botAgent);

    this.queueActivities = true;
    this.activity$ = Observable.create(async (subscriber: Subscriber<Activity>) => {
      this.activitySubscriber = subscriber;
      this.theStreamHandler = new StreamHandler(subscriber, this.connectionStatus$, () => this.queueActivities);
      this.connectAsync();
    }).share();
  }

  public reconnect({ conversationId, token } : Conversation) {
    this.conversationId = conversationId;
    this.token = token;
    this.connectAsync();
  }

  end() {
    this.connectionStatus$.next(ConnectionStatus.Ended);
    this.streamConnection.disconnect();
  }

  private commonHeaders() {
    return {
      "Authorization": `Bearer ${this.token}`,
      "x-ms-bot-agent": this._botAgent
    };
  }

  private getBotAgent(customAgent: string = ''): string {
    let clientAgent = 'directlineStreaming'

    if (customAgent) {
      clientAgent += `; ${customAgent}`
    }

    return `${DIRECT_LINE_VERSION} (${clientAgent})`;
  }

  private async refreshToken(firstCall = true, retryCount = 0) {
    if (firstCall) {
      setTimeout(async () => await this.refreshToken(false, 0), refreshTokenInterval);
      return;
    }

    if (this.connectionStatus$.value === ConnectionStatus.Ended) {
      return;
    }

    await this.waitUntilOnline();

    Observable.ajax({
      method: "POST",
      url: `${this.domain}/tokens/refresh`,
      timeout,
      headers: {
        ...this.commonHeaders()
      }
    })
      .subscribe(
        (ajaxResponse) => {
          this.token = ajaxResponse.response.token as string;
          setTimeout(() => this.refreshToken(false, MAX_RETRY_COUNT), refreshTokenInterval);
        },
        (e) => {
          if (e.status === 403 || e.status === 404) {
            console.error("Fatal error while refreshing token " + e.status);
            this.streamConnection.disconnect();
          }else{
            if (retryCount > 0) {
              console.warn("Error refreshing token " + e.status + " " + retryCount + " retries left");
              this.refreshToken(false, retryCount-1);
            }else{
              this.token = null;
              console.warn("Error refreshing token " + e.status + " Retries exhausted");
              this.streamConnection.disconnect();
            }
          }
        })
  }

  postActivity(activity: Activity) {
    if (activity.type === "message" && activity.attachments && activity.attachments.length > 0) {
      return this.postMessageWithAttachments(activity);
    }

    let resp$ = Observable.create(async subscriber => {
      const request = BFSE.StreamingRequest.create('POST', '/v3/directline/conversations/' + this.conversationId + '/activities');
      request.setBody(JSON.stringify(activity));
      const resp = await this.streamConnection.send(request);

      try {
        if (resp.statusCode !== 200) throw new Error("PostActivity returned " + resp.statusCode);
        const numberOfStreams = resp.streams.length;
        if (numberOfStreams !== 1) throw new Error("Expected one stream but got " + numberOfStreams)
        const idString = await resp.streams[0].readAsString();
        const {Id : id} = JSON.parse(idString);
        return subscriber.next(id);
      } catch(e) {
          // If there is a network issue then its handled by
          // the disconnectionHandler. Everything else can
          // be retried
          console.warn(e);
          this.streamConnection.disconnect();
          return subscriber.error(e);
      }
    });
    return resp$;
  }

  private postMessageWithAttachments(message: Message) {
    const { attachments, ...messageWithoutAttachments } = message;

    let httpContentList = [];
    return Observable.create(subscriber => {
      return Observable.from(attachments || [])
        .flatMap((media: Media) =>
          Observable.ajax({
            method: "GET",
            url: media.contentUrl,
            responseType: 'arraybuffer'
          })
            .do(ajaxResponse => {
              let buffer = new Buffer(ajaxResponse.response);
              let stream = new BFSE.SubscribableStream();
              stream.write(buffer);
              let httpContent = new BFSE.HttpContent({ type: media.contentType, contentLength: buffer.length }, stream);
              httpContentList.push(httpContent);
            }))
        .count()
        .flatMap(_ => {
          let url = `/v3/directline/conversations/${this.conversationId}/users/${messageWithoutAttachments.from.id}/upload`;
          let request = BFSE.StreamingRequest.create('PUT', url);
          let activityStream = new BFSE.SubscribableStream();
          activityStream.write(JSON.stringify(messageWithoutAttachments), 'utf-8');
          request.addStream(new BFSE.HttpContent({ type: "application/vnd.microsoft.activity", contentLength: activityStream.length }, activityStream));
          httpContentList.forEach(e => request.addStream(e));
          return this.streamConnection.send(request);
        })
        .do(resp => {
          if (resp.streams && resp.streams.length !== 1) {
            subscriber.error(new Error(`Invalid stream count ${resp.streams.length}`));
          } else {
            resp.streams[0].readAsJson()
              .then(({Id: id}) => {
                subscriber.next(id)
              })
          }
        })
        .subscribe(_ => _) // force execution
    })
  }

  private disconnectionHandler(e: any) {
    if (this.connectionStatus$.value === ConnectionStatus.Ended) {
      return;
    }

    if (!this.token) {
      this.activitySubscriber.error("Token unavailable");
      return;
    }

    this.retryCount--;
    if (this.retryCount > 0) {
      this.connectionStatus$.next(ConnectionStatus.Connecting);
      setTimeout(() => {
        this.theStreamHandler.setSubscriber(this.activitySubscriber);
        this.connectAsync();
      }, this.getRetryDelay());
    } else {
      console.warn("Exhausted retries");
      this.activitySubscriber.error(e);
    }
  }

  private async waitUntilOnline() {
    return new Promise<void>((resolve, reject) => {
      this.connectionStatus$.subscribe((cs) => {
        if (cs === ConnectionStatus.Online) return resolve();
      },
        (e) => reject(e));
    })
  }

  private async connectAsync() {
    let re = new RegExp('^http(s?)');
    if (!re.test(this.domain)) throw ("Domain must begin with http or https");
    const params = {token: this.token};
    if (this.conversationId) params['conversationId'] = this.conversationId;
    let urlSearchParams = new URLSearchParams(params).toString();
    let wsUrl = `${this.domain.replace(re, 'ws$1')}/conversations/connect?${urlSearchParams}`;
    try {
      this.streamConnection = new BFSE.WebSocketClient({
        url: wsUrl,
        requestHandler: this.theStreamHandler,
        disconnectionHandler: this.disconnectionHandler.bind(this)
      });

      this.queueActivities = true;
      await this.streamConnection.connect();
      let request = BFSE.StreamingRequest.create('POST', '/v3/directline/conversations');
      let response = await this.streamConnection.send(request);
      if (response.statusCode !== 200) throw new Error("Connection response code " + response.statusCode);
      if (response.streams.length !== 1) throw new Error("Expected 1 stream but got " + response.streams.length);
      let responseString = await response.streams[0].readAsString();
      let conversation = JSON.parse(responseString);
      this.conversationId = conversation.conversationId;
      this.connectionStatus$.next(ConnectionStatus.Online);

      // Wait until DL consumers have had a chance to be notified
      // of the connection status change.
      await this.waitUntilOnline();
      this.theStreamHandler.flush();
      this.queueActivities = false;

      this.retryCount = MAX_RETRY_COUNT;
    } catch (e) {
      console.warn(e);
      this.streamConnection.disconnect();
    }
  }

  // Returns the delay duration in milliseconds
  private getRetryDelay() {
    return Math.floor(3000 + Math.random() * 12000);
  }
}