// In order to keep file size down, only import the parts of rxjs that we use

import 'core-js/features/promise';
import 'url-search-params-polyfill';
import { throwError, BehaviorSubject, Observable, Subscriber, Subscription, interval, timer, SchedulerLike, scheduled, EMPTY, asyncScheduler } from 'rxjs';
import { Activity, DirectLineOptions, Conversation, Message, Media, ActivityGroup, IBotConnection } from './directLine';
import { mergeMap, filter, take, map, retryWhen, delay, catchError, tap, count, share } from 'rxjs/operators';
import { ajax, AjaxResponse } from 'rxjs/ajax';
import { ConnectionStatus } from './directline.enum';
import dedupeFilenames from './dedupeFilenames';
import { AjaxCreationMethod, AjaxRequest } from 'rxjs/internal/observable/dom/AjaxObservable';
import { Services } from './directline.interface';
import jwtDecode, { JwtPayload, InvalidTokenError } from 'jwt-decode';

export * from './directline.interface';
export * from './directline.enum';

import { DirectLineStreaming } from './directLineStreaming';
export { DirectLineStreaming };

const DIRECT_LINE_VERSION = 'DirectLine/3.0';

declare var process: {
    arch: string;
    env: {
        VERSION: string;
        npm_package_version: string;
    };
    platform: string;
    release: string;
    version: string;
};

const wrapAjaxWithRetry = (source: AjaxCreationMethod, scheduler: SchedulerLike): AjaxCreationMethod => {

    const notImplemented = (): never => { throw new Error('not implemented'); };

    const inner = (response$: Observable<AjaxResponse>) => {
        return response$
            .pipe(
                catchError(err => {
                    if (err.status === 429) {
                        const retryAfterValue = err.xhr.getResponseHeader('Retry-After');
                        const retryAfter = Number(retryAfterValue);
                        if (!isNaN(retryAfter)) {
                            return timer(retryAfter, scheduler)
                                .pipe(
                                    mergeMap(_ => throwError(err, scheduler))
                                );
                        }
                    }

                    return throwError(err, scheduler);
                })
            );
    };

    const outer = (urlOrRequest: string | AjaxRequest) => {
        return inner(source(urlOrRequest));
    };

    return Object.assign(outer, {
        get: (url: string, headers?: Object): Observable<AjaxResponse> => notImplemented(),
        post: (url: string, body?: any, headers?: Object): Observable<AjaxResponse> => notImplemented(),
        put: (url: string, body?: any, headers?: Object): Observable<AjaxResponse> => notImplemented(),
        patch: (url: string, body?: any, headers?: Object): Observable<AjaxResponse> => notImplemented(),
        delete: (url: string, headers?: Object): Observable<AjaxResponse> => notImplemented(),
        getJSON: <T>(url: string, headers?: Object): Observable<T> => notImplemented()
    });
}

const makeServices = (services: Partial<Services>): Services => {
    const scheduler = services.scheduler || asyncScheduler;
    return {
        scheduler,
        ajax: wrapAjaxWithRetry(services.ajax || ajax, scheduler),
        WebSocket: services.WebSocket || WebSocket,
        random: services.random || Math.random,
    }
}

const lifetimeRefreshToken = 30 * 60 * 1000;
const intervalRefreshToken = lifetimeRefreshToken / 2;

const POLLING_INTERVAL_LOWER_BOUND: number = 200; // ms

const errorExpiredToken = new Error("expired token");
const errorConversationEnded = new Error("conversation ended");
const errorFailedToConnect = new Error("failed to connect");

const konsole = {
    log: (message?: any, ... optionalParams: any[]) => {
        if (typeof window !== 'undefined' && (window as any)["botchatDebug"] && message)
            console.log(message, ... optionalParams);
    }
}

export class DirectLine implements IBotConnection {
    public connectionStatus$ = new BehaviorSubject(ConnectionStatus.Uninitialized);
    public activity$: Observable<Activity>;

    private domain = "https://directline.botframework.com/v3/directline";
    private webSocket: boolean;

    public conversationId: string;
    private expiredTokenExhaustion: Function;
    private secret: string;
    private token: string;
    private watermark = '';
    private streamUrl: string;
    private _botAgent = '';
    private services: Services;
    private _userAgent: string;
    public referenceGrammarId: string;
    private timeout = 20 * 1000;
    private retries: number;

    private localeOnStartConversation: string;
    private userIdOnStartConversation: string;

    private pollingInterval: number = 1000; // ms

    private tokenRefreshSubscription: Subscription;

    constructor(options: DirectLineOptions & Partial<Services>) {
        this.secret = options.secret;
        this.token = options.secret || options.token;
        this.webSocket = (options.webSocket === undefined ? true : options.webSocket) && typeof WebSocket !== 'undefined' && WebSocket !== undefined;

        if (options.conversationStartProperties && options.conversationStartProperties.locale) {
            if (Object.prototype.toString.call(options.conversationStartProperties.locale) === '[object String]') {
                this.localeOnStartConversation = options.conversationStartProperties.locale;
            } else {
                console.warn('DirectLineJS: conversationStartProperties.locale was ignored: the locale name may be a BCP 47 language tag');
            }
        }

        if (options.domain) {
            this.domain = options.domain;
        }

        if (options.conversationId) {
            this.conversationId = options.conversationId;
        }

        if (options.watermark) {
            this.watermark =  options.watermark;
        }

        if (options.streamUrl) {
            if (options.token && options.conversationId) {
                this.streamUrl = options.streamUrl;
            } else {
                console.warn('DirectLineJS: streamUrl was ignored: you need to provide a token and a conversationid');
            }
        }

        if (options.timeout !== undefined) {
            this.timeout = options.timeout;
        }

        this.retries = (lifetimeRefreshToken - intervalRefreshToken) / this.timeout;

        this._botAgent = this.getBotAgent(options.botAgent);

        this.services = makeServices(options);

        const parsedPollingInterval = options.pollingInterval || 0;

        if (parsedPollingInterval < POLLING_INTERVAL_LOWER_BOUND) {
            if (typeof options.pollingInterval !== 'undefined') {
                console.warn(`DirectLineJS: provided pollingInterval (${ options.pollingInterval }) is under lower bound (200ms), using default of 1000ms`);
            }
        } else {
            this.pollingInterval = parsedPollingInterval;
        }

        this.expiredTokenExhaustion = this.setConnectionStatusFallback(
            ConnectionStatus.ExpiredToken,
            ConnectionStatus.FailedToConnect,
            5
        );

        this.activity$ = (this.webSocket
            ? this.webSocketActivity$()
            : this.pollingGetActivity$()
        )
        .pipe(
            share()
        );
    }

    // Every time we're about to make a Direct Line REST call, we call this first to see check the current connection status.
    // Either throws an error (indicating an error state) or emits a null, indicating a (presumably) healthy connection
    private checkConnection(once = false) {
        let obs =  this.connectionStatus$
            .pipe(
                mergeMap(connectionStatus => {
                    if (connectionStatus === ConnectionStatus.Uninitialized) {
                        this.connectionStatus$.next(ConnectionStatus.Connecting);

                        // if token and streamUrl are defined it means reconnect has already been done. Skipping it.
                        if (this.token && this.streamUrl) {
                            this.connectionStatus$.next(ConnectionStatus.Online);
                            return scheduled([connectionStatus], this.services.scheduler);
                        } else {
                            return this.startConversation()
                                .pipe(
                                    tap(conversation => {
                                        this.conversationId = conversation.conversationId;
                                        this.token = this.secret || conversation.token;
                                        this.streamUrl = conversation.streamUrl;
                                        this.referenceGrammarId = conversation.referenceGrammarId;
                                        if (!this.secret)
                                            this.refreshTokenLoop();

                                        this.connectionStatus$.next(ConnectionStatus.Online);
                                    }, error => {
                                        this.connectionStatus$.next(ConnectionStatus.FailedToConnect);
                                    }),
                                    map(_ => connectionStatus)
                                );
                        }
                    } else {
                        return scheduled([connectionStatus], this.services.scheduler);
                    }
                }),
                filter(connectionStatus =>
                    connectionStatus != ConnectionStatus.Uninitialized &&
                    connectionStatus != ConnectionStatus.Connecting
                ),
                mergeMap(connectionStatus => {
                    switch (connectionStatus) {
                        case ConnectionStatus.Ended:
                            return throwError(errorConversationEnded, this.services.scheduler);

                        case ConnectionStatus.FailedToConnect:
                            return throwError(errorFailedToConnect, this.services.scheduler);

                        case ConnectionStatus.ExpiredToken:
                            return scheduled([connectionStatus], this.services.scheduler);

                        default:
                            return scheduled([connectionStatus], this.services.scheduler);
                    }
                })
            )
        return once ? obs.pipe(take(1)) : obs;
    }

    setConnectionStatusFallback(
        connectionStatusFrom: ConnectionStatus,
        connectionStatusTo: ConnectionStatus,
        maxAttempts = 5
    ) {
        maxAttempts--;
        let attempts = 0;
        let currStatus = null;
        return (status: ConnectionStatus): ConnectionStatus => {
            if (status === connectionStatusFrom && currStatus === status && attempts >= maxAttempts) {
                attempts = 0
                return connectionStatusTo;
            }
            attempts++;
            currStatus = status;
            return status;
        };
    }

    private expiredToken() {
        const connectionStatus = this.connectionStatus$.getValue();
        if (connectionStatus != ConnectionStatus.Ended && connectionStatus != ConnectionStatus.FailedToConnect)
            this.connectionStatus$.next(ConnectionStatus.ExpiredToken);

        const protectedConnectionStatus = this.expiredTokenExhaustion(this.connectionStatus$.getValue());
        this.connectionStatus$.next(protectedConnectionStatus);
    }

    private startConversation() {
        // if conversationid is set here, it means we need to call the reconnect api, else it is a new conversation
        const url = this.conversationId
            ? `${this.domain}/conversations/${this.conversationId}?watermark=${this.watermark}`
            : `${this.domain}/conversations`;
        const method = this.conversationId ? "GET" : "POST";
        const body = this.conversationId
            ? undefined
            : {
                user: {
                    id: this.userIdOnStartConversation
                },
                locale: this.localeOnStartConversation
              };

        return this.services.ajax({
            method,
            url,
            body,
            timeout: this.timeout,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                ...this.commonHeaders()
            }
        })
        .pipe(
            map(ajaxResponse => ajaxResponse.response as Conversation),
            retryWhen(error$ =>
                // for now we deem 4xx and 5xx errors as unrecoverable
                // for everything else (timeouts), retry for a while
                error$
                    .pipe(
                        mergeMap(error => error.status >= 400 && error.status < 600
                            ? throwError([error], this.services.scheduler)
                            : scheduled([error], this.services.scheduler)
                        ),
                        delay(this.timeout, this.services.scheduler),
                        take(this.retries)
                    )
            )
        )
    }

    private refreshTokenLoop() {
        this.tokenRefreshSubscription = interval(intervalRefreshToken, this.services.scheduler)
            .pipe(
                mergeMap(_ => this.refreshToken())
            )
            .subscribe((token) => {
                konsole.log("refreshing token", token, "at", new Date());
                this.token = token;
            });
    }

    private refreshToken() {
        return this.checkConnection(true)
            .pipe(
                mergeMap(_ =>
                    this.services.ajax({
                        method: "POST",
                        url: `${this.domain}/tokens/refresh`,
                        timeout: this.timeout,
                        headers: {
                            ...this.commonHeaders()
                        }
                    })
                    .pipe(
                        map((ajaxResponse: any) => ajaxResponse.response.token as string),
                        retryWhen(error$ => error$
                            .pipe(
                                mergeMap(error => {
                                    if (error.status === 403) {
                                        // if the token is expired there's no reason to keep trying
                                        this.expiredToken();
                                        return throwError(error, this.services.scheduler);
                                    } else if (error.status === 404) {
                                        throwError(error, this.services.scheduler);
                                    }

                                    return scheduled([error], this.services.scheduler);
                                }),
                                delay(this.timeout, this.services.scheduler),
                                take(this.retries)
                            )
                        )
                    )
                )
            );
    }

    public reconnect(conversation: Conversation) {
        this.token = conversation.token;
        this.streamUrl = conversation.streamUrl;
        if (this.connectionStatus$.getValue() === ConnectionStatus.ExpiredToken)
            this.connectionStatus$.next(ConnectionStatus.Online);
    }

    end() {
        if (this.tokenRefreshSubscription)
            this.tokenRefreshSubscription.unsubscribe();
        try {
            this.connectionStatus$.next(ConnectionStatus.Ended);
        } catch (e) {
            if (e === errorConversationEnded)
                return;
            throw(e);
        }
    }

    getSessionId(): Observable<string> {
        // If we're not connected to the bot, get connected
        // Will throw an error if we are not connected
        konsole.log("getSessionId");
        return this.checkConnection(true)
            .pipe(
                mergeMap(_ =>
                    this.services.ajax({
                        method: "GET",
                        url: `${this.domain}/session/getsessionid`,
                        withCredentials: true,
                        timeout: this.timeout,
                        headers: {
                            "Content-Type": "application/json",
                            ...this.commonHeaders()
                        }
                    })
                    .pipe(
                        map((ajaxResponse: any) => {
                            if (ajaxResponse && ajaxResponse.response && ajaxResponse.response.sessionId) {
                                konsole.log("getSessionId response: " + ajaxResponse.response.sessionId);
                                return ajaxResponse.response.sessionId as string;
                            }
                            return '';
                        }),
                        catchError((error: any) => {
                            konsole.log("getSessionId error: " + error.status);
                            return scheduled([], this.services.scheduler);
                        })
                    )
                ),
                catchError(error => this.catchExpiredToken(error))
            );
    }

    postActivity(activity: Activity) {
        // If user id is set, check if it match activity.from.id and always override it in activity
        if (this.userIdOnStartConversation && activity.from && activity.from.id !== this.userIdOnStartConversation) {
            console.warn('DirectLineJS: Activity.from.id does not match with user id, ignoring activity.from.id');
            activity.from.id = this.userIdOnStartConversation;
        }
        // Use postMessageWithAttachments for messages with attachments that are local files (e.g. an image to upload)
        // Technically we could use it for *all* activities, but postActivity is much lighter weight
        // So, since WebChat is partially a reference implementation of Direct Line, we implement both.
        if (activity.type === "message" && activity.attachments && activity.attachments.length > 0)
            return this.postMessageWithAttachments(activity);

        // If we're not connected to the bot, get connected
        // Will throw an error if we are not connected
        konsole.log("postActivity", activity);
        return this.checkConnection(true)
            .pipe(
                mergeMap(_ =>
                    this.services.ajax({
                        method: "POST",
                        url: `${this.domain}/conversations/${this.conversationId}/activities`,
                        body: activity,
                        timeout: this.timeout,
                        headers: {
                            "Content-Type": "application/json",
                            ...this.commonHeaders()
                        }
                    })
                    .pipe(
                        map((ajaxResponse: any) => ajaxResponse.response.id as string),
                        catchError((error: AjaxResponse) => this.catchPostError(error))
                    )
                ),
                catchError(error => this.catchExpiredToken(error))
            );
    }

    private postMessageWithAttachments(message: Message) {
        const { attachments } = message;
        // We clean the attachments but making sure every attachment has unique name.
        // If the file do not have a name, Chrome will assign "blob" when it is appended to FormData.
        const attachmentNames: string[] = dedupeFilenames(attachments.map((media: Media) => media.name || 'blob'));
        const cleansedAttachments = attachments.map((attachment: Media, index: number) => ({
            ...attachment,
            name: attachmentNames[index]
        }));
        let formData: FormData;

        // If we're not connected to the bot, get connected
        // Will throw an error if we are not connected
        return this.checkConnection(true)
            .pipe(
                mergeMap(_ => {
                    // To send this message to DirectLine we need to deconstruct it into a "template" activity
                    // and one blob for each attachment.
                    formData = new FormData();
                    formData.append('activity', new Blob([JSON.stringify({
                        ...message,
                        // Removing contentUrl from attachment, we will send it via multipart
                        attachments: cleansedAttachments.map(({ contentUrl: string, ...others }) => ({ ...others }))
                    })], { type: 'application/vnd.microsoft.activity' }));

                    return scheduled(cleansedAttachments, this.services.scheduler)
                        .pipe(
                            mergeMap((media: Media) =>
                                ajax({
                                    method: "GET",
                                    url: media.contentUrl,
                                    responseType: 'arraybuffer'
                                })
                                .pipe(
                                    tap(ajaxResponse =>
                                        formData.append('file', new Blob([ajaxResponse.response], { type: media.contentType }), media.name)
                                    )
                                )
                            ),
                            count()
                        )
                }),
                mergeMap(_ =>
                    this.services.ajax({
                        method: "POST",
                        url: `${this.domain}/conversations/${this.conversationId}/upload?userId=${message.from.id}`,
                        body: formData,
                        timeout: this.timeout,
                        headers: {
                            ...this.commonHeaders()
                        }
                    })
                    .pipe(
                        map(ajaxResponse => ajaxResponse.response.id as string),
                        catchError(error => this.catchPostError(error))
                    )
                ),
                catchError(error => this.catchPostError(error))
            );
    }

    private catchPostError(error: AjaxResponse) {
        if (error.status === 403)
            // token has expired (will fall through to return "retry")
            this.expiredToken();
        else if (error.status >= 400 && error.status < 500)
            // more unrecoverable errors
            return throwError(error, this.services.scheduler);
        return scheduled(["retry"], this.services.scheduler);
    }

    private catchExpiredToken(error: any) {
        return error === errorExpiredToken
        ? scheduled(["retry"], this.services.scheduler)
        : throwError(error, this.services.scheduler);
    }

    private pollingGetActivity$() {
        const poller$: Observable<AjaxResponse> = new Observable((subscriber: Subscriber<any>) => {
            // A BehaviorSubject to trigger polling. Since it is a BehaviorSubject
            // the first event is produced immediately.
            const trigger$ = new BehaviorSubject<any>({});

            // TODO: remove Date.now, use reactive interval to space out every request

            trigger$.subscribe(() => {
                if (this.connectionStatus$.getValue() === ConnectionStatus.Online) {
                    const startTimestamp = Date.now();

                    this.services.ajax({
                        headers: {
                            Accept: 'application/json',
                            ...this.commonHeaders()
                        },
                        method: 'GET',
                        url: `${ this.domain }/conversations/${ this.conversationId }/activities?watermark=${ this.watermark }`,
                        timeout: this.timeout
                    }).subscribe(
                        (result: AjaxResponse) => {
                            subscriber.next(result);
                            setTimeout(() => trigger$.next(null), Math.max(0, this.pollingInterval - Date.now() + startTimestamp));
                        },
                        (error: any) => {
                            switch (error.status) {
                                case 403:
                                    this.connectionStatus$.next(ConnectionStatus.ExpiredToken);
                                    setTimeout(() => trigger$.next(null), this.pollingInterval);
                                    break;

                                case 404:
                                    this.connectionStatus$.next(ConnectionStatus.Ended);
                                    break;

                                default:
                                    // propagate the error
                                    subscriber.error(error);
                                    break;
                            }
                        }
                    );
                }
            });
        });

        return this.checkConnection()
            .pipe(
                mergeMap(_ =>
                    poller$
                        .pipe(
                            catchError(() => EMPTY),
                            map(ajaxResponse => ajaxResponse.response as ActivityGroup),
                            mergeMap(activityGroup => this.observableFromActivityGroup(activityGroup))
                        )
                )
            );
    }

    private observableFromActivityGroup(activityGroup: ActivityGroup) {
        if (activityGroup.watermark)
            this.watermark = activityGroup.watermark;
        return scheduled(activityGroup.activities, this.services.scheduler);
    }

    private webSocketActivity$(): Observable<Activity> {
        return this.checkConnection()
            .pipe(
                mergeMap(_ =>
                    this.observableWebSocket<ActivityGroup>()
                    // WebSockets can be closed by the server or the browser. In the former case we need to
                    // retrieve a new streamUrl. In the latter case we could first retry with the current streamUrl,
                    // but it's simpler just to always fetch a new one.
                    .pipe(
                        retryWhen(error$ => error$.pipe(
                            delay(this.getRetryDelay(), this.services.scheduler),
                            mergeMap(error => this.reconnectToConversation()
                        )))
                    )
                ),
                mergeMap((activityGroup: ActivityGroup) => this.observableFromActivityGroup(activityGroup))
            );
    }

    // Returns the delay duration in milliseconds
    private getRetryDelay() {
        return Math.floor(3000 + this.services.random() * 12000);
    }

    // Originally we used Observable.webSocket, but it's fairly opinionated  and I ended up writing
    // a lot of code to work around their implementation details. Since WebChat is meant to be a reference
    // implementation, I decided roll the below, where the logic is more purposeful. - @billba
    private observableWebSocket<T>() {
        return new Observable((subscriber: Subscriber<T>) => {
            konsole.log("creating WebSocket", this.streamUrl);
            const ws = new this.services.WebSocket(this.streamUrl);
            let sub: Subscription;
            let closed: boolean;

            ws.onopen = open => {
                konsole.log("WebSocket open", open);
                // Chrome is pretty bad at noticing when a WebSocket connection is broken.
                // If we periodically ping the server with empty messages, it helps Chrome
                // realize when connection breaks, and close the socket. We then throw an
                // error, and that give us the opportunity to attempt to reconnect.
                sub = interval(this.timeout, this.services.scheduler).subscribe(_ => {
                    try {
                        ws.send("");
                    } catch (e) {
                        konsole.log("Ping error", e);
                    }
                });
            }

            ws.onclose = close => {
                konsole.log("WebSocket close", close);
                if (sub) sub.unsubscribe();

                // RxJS.retryWhen has a bug that would cause "error" signal to be sent after the observable is completed/errored.
                // We need to guard against extraneous "error" signal to workaround the bug.
                closed || subscriber.error(close);
                closed = true;
            }

            ws.onerror = error => {
                konsole.log("WebSocket error", error);
                if (sub) sub.unsubscribe();

                // RxJS.retryWhen has a bug that would cause "error" signal to be sent after the observable is completed/errored.
                // We need to guard against extraneous "error" signal to workaround the bug.
                closed || subscriber.error(error);
                closed = true;
            }

            ws.onmessage = message => message.data && subscriber.next(JSON.parse(message.data));

            // This is the 'unsubscribe' method, which is called when this observable is disposed.
            // When the WebSocket closes itself, we throw an error, and this function is eventually called.
            // When the observable is closed first (e.g. when tearing down a WebChat instance) then
            // we need to manually close the WebSocket.
            return () => {
                if (ws.readyState === 0 || ws.readyState === 1) ws.close();
            }
        }) as Observable<T>
    }

    private reconnectToConversation() {
        return this.checkConnection(true)
            .pipe(
                mergeMap(_ =>
                    this.services.ajax({
                        method: "GET",
                        url: `${this.domain}/conversations/${this.conversationId}?watermark=${this.watermark}`,
                        timeout: this.timeout,
                        headers: {
                            "Accept": "application/json",
                            ...this.commonHeaders()
                        }
                    })
                    .pipe(
                        tap((result: any) => {
                            if (!this.secret)
                                this.token = result.response.token;
                            this.streamUrl = result.response.streamUrl;
                        }),
                        map(() => null),
                        retryWhen(error$ => error$
                            .pipe(
                                mergeMap(error => {
                                    if (error.status === 403) {
                                        // token has expired. We can't recover from this here, but the embedding
                                        // website might eventually call reconnect() with a new token and streamUrl.
                                        this.expiredToken();
                                    } else if (error.status === 404) {
                                        throwError(errorConversationEnded, this.services.scheduler);
                                    }

                                    return scheduled([error], this.services.scheduler);
                                }),
                                delay(this.timeout, this.services.scheduler),
                                take(this.retries)
                            )
                        )
                    )
                )
            )
    }

    private commonHeaders() {
        return {
            "Authorization": `Bearer ${this.token}`,
            "x-ms-bot-agent": this._botAgent
        };
    }

    private getBotAgent(customAgent: string = ''): string {
        let clientAgent = 'directlinejs'

        if (customAgent) {
            clientAgent += `; ${customAgent}`
        }

        const packageVersion = process.env.npm_package_version;
        return `${DIRECT_LINE_VERSION} (${clientAgent} ${packageVersion})`;
    }

    setUserId(userId: string) {
        if (this.connectionStatus$.getValue() === ConnectionStatus.Online) {
            throw new Error('DirectLineJS: It is connected, we cannot set user id.');
        }

        const userIdFromToken = this.parseToken(this.token);
        if (userIdFromToken) {
            return console.warn('DirectLineJS: user id is already set in token, will ignore this user id.');
        }

        if (/^dl_/u.test(userId)) {
            return console.warn('DirectLineJS: user id prefixed with "dl_" is reserved and must be embedded into the Direct Line token to prevent forgery.');
        }

        this.userIdOnStartConversation = userId;
    }

    private parseToken(token: string) {
        try {
            const { user } = jwtDecode<JwtPayload>(token) as { [key: string]: any; };
            return user;
        } catch (e) {
            if (e instanceof InvalidTokenError) {
                return undefined;
            }
        }
    }

}
