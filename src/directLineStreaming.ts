// In order to keep file size down, only import the parts of rxjs that we use

import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { Subscriber } from 'rxjs';
import {
    ContentStream,
    HttpContent,
    IReceiveRequest,
    RequestHandler,
    StreamingRequest,
    StreamingResponse,
    SubscribableStream,
    WebSocketClient
} from 'botframework-streaming';
import fetch from 'cross-fetch';

import {
    Activity,
    ConnectionStatus,
    Conversation,
    IBotConnection,
    Media,
    Message
} from './directLine';
import { share } from 'rxjs/operators';

const DIRECT_LINE_VERSION = 'DirectLine/3.0';
const MAX_RETRY_COUNT = 3;
const refreshTokenLifetime = 30 * 60 * 1000;
//const refreshTokenLifetime = 5000;
const timeout = 20 * 1000;
const refreshTokenInterval = refreshTokenLifetime / 2;

interface DirectLineStreamingOptions {
    token: string,
    conversationId?: string,
    domain: string,
    // Attached to all requests to identify requesting agent.
    botAgent?: string
}

class StreamHandler implements RequestHandler {
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

    async processRequest(request: IReceiveRequest, logger?: any): Promise<StreamingResponse> {
        const streams = [...request.streams];
        const stream0 = streams.shift();
        const activitySetJson = await stream0.readAsString();
        const activitySet = JSON.parse(activitySetJson);

        if (activitySet.activities.length !== 1) {
            // Only one activity is expected in a set in streaming
            this.subscriber.error(new Error('there should be exactly one activity'));
            return StreamingResponse.create(500);
        }

        const activity = activitySet.activities[0];

        if (streams.length > 0) {
            const attachments = [...activity.attachments];

            let stream: ContentStream;
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

        return StreamingResponse.create(200);
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

    private domain: string;

    private conversationId: string;
    private token: string;
    private streamConnection: WebSocketClient;
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
        this.activity$ = new Observable((subscriber: Subscriber<Activity>) => {
            this.activitySubscriber = subscriber;
            this.theStreamHandler = new StreamHandler(subscriber, this.connectionStatus$, () => this.queueActivities);
            this.connectWithRetryAsync();
        }).pipe(share());
    }

    public reconnect({ conversationId, token }: Conversation) {
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
        await this.waitUntilOnline();

        let numberOfAttempts = 0;
        while (numberOfAttempts < MAX_RETRY_COUNT) {
            numberOfAttempts++;
            await new Promise(r => setTimeout(r, refreshTokenInterval));
            try {
                const res = await fetch(`${this.domain}/tokens/refresh`, { method: "POST", headers: this.commonHeaders() });
                if (res.ok) {
                    numberOfAttempts = 0;
                    const { token } = await res.json();
                    this.token = token;
                } else {
                    if (res.status === 403 || res.status === 403) {
                        console.error(`Fatal error while refreshing the token: ${res.status} ${res.statusText}`);
                        this.streamConnection.disconnect();
                    } else {
                        console.warn(`Refresh attempt #${numberOfAttempts} failed: ${res.status} ${res.statusText}`);
                    }
                }
            } catch (e) {
                console.warn(`Refresh attempt #${numberOfAttempts} threw an exception: ${e}`);
            }
        }

        console.error("Retries exhausted");
        this.streamConnection.disconnect();
    }

    postActivity(activity: Activity) {
        if (activity.type === "message" && activity.attachments && activity.attachments.length > 0) {
            return this.postMessageWithAttachments(activity);
        }

        return new Observable((subscriber: Subscriber<string>) => {
          (async () => {
            const request = StreamingRequest.create('POST', '/v3/directline/conversations/' + this.conversationId + '/activities');
            request.setBody(JSON.stringify(activity));
            const resp = await this.streamConnection.send(request);

            try {
                if (resp.statusCode !== 200) throw new Error("PostActivity returned " + resp.statusCode);
                const numberOfStreams = resp.streams.length;
                if (numberOfStreams !== 1) throw new Error("Expected one stream but got " + numberOfStreams)
                const idString = await resp.streams[0].readAsString();
                const { Id: id } = JSON.parse(idString);
                return subscriber.next(id);
            } catch (e) {
                // If there is a network issue then its handled by
                // the disconnectionHandler. Everything else can
                // be retried
                console.warn(e);
                this.streamConnection.disconnect();
                return subscriber.error(e);
            }
          })();
        });
    }

    private postMessageWithAttachments(message: Message) {
        const { attachments, ...messageWithoutAttachments } = message;

        return new Observable((subscriber: Subscriber<string>) => {
            const httpContentList = [];
            (async () => {
                try {
                    const arrayBuffers = await Promise.all(attachments.map(async attachment => {
                        const media = attachment as Media;
                        const res = await fetch(media.contentUrl);
                        if (res.ok) {
                            return { arrayBuffer: await res.arrayBuffer(), media };
                        } else {
                            throw new Error('...');
                        }
                    }));

                    arrayBuffers.forEach(({ arrayBuffer, media }) => {
                        const buffer = Buffer.from(arrayBuffer);
                        console.log(buffer);
                        const stream = new SubscribableStream();
                        stream.write(buffer);
                        const httpContent = new HttpContent({ type: media.contentType, contentLength: buffer.length }, stream);
                        httpContentList.push(httpContent);
                    });

                    const url = `/v3/directline/conversations/${this.conversationId}/users/${messageWithoutAttachments.from.id}/upload`;
                    const request = StreamingRequest.create('PUT', url);
                    const activityStream = new SubscribableStream();
                    activityStream.write(JSON.stringify(messageWithoutAttachments), 'utf-8');
                    request.addStream(new HttpContent({ type: "application/vnd.microsoft.activity", contentLength: activityStream.length }, activityStream));
                    httpContentList.forEach(e => request.addStream(e));

                    const resp = await this.streamConnection.send(request);
                    if (resp.streams && resp.streams.length !== 1) {
                        subscriber.error(new Error(`Invalid stream count ${resp.streams.length}`));
                    } else {
                        const { Id: id } = await resp.streams[0].readAsJson();
                        subscriber.next(id);
                    }
                } catch (e) {
                    subscriber.error(e);
                }
            })();
        });
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
        const re = new RegExp('^http(s?)');
        if (!re.test(this.domain)) throw ("Domain must begin with http or https");
        const params = { token: this.token };
        if (this.conversationId) params['conversationId'] = this.conversationId;
        const urlSearchParams = new URLSearchParams(params).toString();
        const wsUrl = `${this.domain.replace(re, 'ws$1')}/conversations/connect?${urlSearchParams}`;

        return new Promise(async (resolve, reject) => {
            try {
                this.streamConnection = new WebSocketClient({
                    url: wsUrl,
                    requestHandler: this.theStreamHandler,
                    disconnectionHandler: (e) => resolve(e)
                });

                this.queueActivities = true;
                await this.streamConnection.connect();
                const request = StreamingRequest.create('POST', '/v3/directline/conversations');
                const response = await this.streamConnection.send(request);
                if (response.statusCode !== 200) throw new Error("Connection response code " + response.statusCode);
                if (response.streams.length !== 1) throw new Error("Expected 1 stream but got " + response.streams.length);
                const responseString = await response.streams[0].readAsString();
                const conversation = JSON.parse(responseString);
                this.conversationId = conversation.conversationId;
                this.connectionStatus$.next(ConnectionStatus.Online);

                // Wait until DL consumers have had a chance to be notified
                // of the connection status change.
                await this.waitUntilOnline();
                this.theStreamHandler.flush();
                this.queueActivities = false;
            } catch (e) {
                reject(e);
            }
        });
    }

    private async connectWithRetryAsync() {
        let numRetries = MAX_RETRY_COUNT;
        while (numRetries > 0) {
            numRetries--;
            const start = Date.now();
            try {
                this.connectionStatus$.next(ConnectionStatus.Connecting);
                const res = await this.connectAsync();
                console.warn(`Retrying connection ${res}`);
                if (60000 < Date.now() - start) {
                    // reset the retry counter and retry immediately
                    // if the connection lasted for more than a minute
                    numRetries = MAX_RETRY_COUNT;
                    continue;
                }
            } catch (err) {
                console.error(`Failed to connect ${err}`);
                throw (err);
            }

            await new Promise(r => setTimeout(r, this.getRetryDelay()));
        }
    }

    // Returns the delay duration in milliseconds
    private getRetryDelay() {
        return Math.floor(3000 + Math.random() * 12000);
    }
}