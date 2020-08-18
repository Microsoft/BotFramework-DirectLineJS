// In order to keep file size down, only import the parts of rxjs that we use

import 'core-js/features/promise';
import 'url-search-params-polyfill';
import { AjaxResponse, AjaxCreationMethod, AjaxRequest, AjaxError } from 'rxjs/observable/dom/AjaxObservable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { IScheduler } from 'rxjs/Scheduler';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';
import { async as AsyncScheduler } from 'rxjs/scheduler/async';

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/combineLatest';
import 'rxjs/add/operator/count';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/retryWhen';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/take';

import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/timer';

import dedupeFilenames from './dedupeFilenames';

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

// Direct Line 3.0 types

export interface Conversation {
    conversationId: string,
    token: string,
    eTag?: string,
    streamUrl?: string,
    referenceGrammarId?: string
}

export type MediaType = "image/png" | "image/jpg" | "image/jpeg" | "image/gif" | "image/svg+xml" | "audio/mpeg" | "audio/mp4" | "video/mp4";

export interface Media {
    contentType: MediaType,
    contentUrl: string,
    name?: string,
    thumbnailUrl?: string
}

export interface UnknownMedia{
    contentType: string,
    contentUrl: string,
    name?: string,
    thumbnailUrl?: string
}

export type CardActionTypes = "call" | "downloadFile"| "imBack" | "messageBack" | "openUrl" | "playAudio" | "playVideo" | "postBack" | "signin" | "showImage";

export type CardAction = CallCardAction | DownloadFileCardAction | IMBackCardAction | MessageBackCardAction | OpenURLCardAction | PlayAudioCardAction | PlayVideoCardAction | PostBackCardAction | SignInCardAction | ShowImageCardAction;

export interface CallCardAction {
    image?: string,
    title: string,
    type: "call",
    value: any
}

export interface DownloadFileCardAction {
    image?: string,
    title: string,
    type: "downloadFile",
    value: any
}

export interface IMBackCardAction {
    image?: string,
    title?: string,
    type: "imBack",
    value: string
}

export type MessageBackCardAction = MessageBackWithImage | MessageBackWithTitle

export interface MessageBackWithImage {
    displayText?: string,
    image: string,
    text?: string,
    title?: string,
    type: "messageBack",
    value?: any
}

export interface MessageBackWithTitle {
    displayText?: string,
    image?: string,
    text?: string,
    title: string,
    type: "messageBack",
    value?: any
}

export interface OpenURLCardAction {
    image?: string,
    title: string,
    type: "openUrl",
    value: any
}

export interface PlayAudioCardAction {
    image?: string,
    title: string,
    type: "playAudio",
    value: any
}

export interface PlayVideoCardAction {
    image?: string,
    title: string,
    type: "playVideo",
    value: any
}

export interface PostBackCardAction {
    image?: string,
    title?: string,
    type: "postBack",
    value: any
}

export interface ShowImageCardAction {
    image?: string,
    title: string,
    type: "showImage",
    value: any
}

export interface SignInCardAction {
    image?: string,
    title: string,
    type: "signin",
    value: any
}

export interface CardImage {
    alt?: string,
    url: string,
    tap?: CardAction
}

export interface HeroCard {
    contentType: "application/vnd.microsoft.card.hero",
    content: {
        title?: string,
        subtitle?: string,
        text?: string,
        images?: CardImage[],
        buttons?: CardAction[],
        tap?: CardAction
    }
}

export interface Thumbnail {
    contentType: "application/vnd.microsoft.card.thumbnail",
    content: {
        title?: string,
        subtitle?: string,
        text?: string,
        images?: CardImage[],
        buttons?: CardAction[],
        tap?: CardAction
    }
}

export interface Signin {
    contentType: "application/vnd.microsoft.card.signin",
    content: {
        text?: string,
        buttons?: CardAction[]
    }
}

export interface OAuth {
    contentType: "application/vnd.microsoft.card.oauth",
    content: {
        text?: string,
        connectionname: string,
        buttons?: CardAction[]
    }
}

export interface ReceiptItem {
    title?: string,
    subtitle?: string,
    text?: string,
    image?: CardImage,
    price?: string,
    quantity?: string,
    tap?: CardAction
}

export interface Receipt {
    contentType: "application/vnd.microsoft.card.receipt",
    content: {
        title?: string,
        facts?: { key: string, value: string }[],
        items?: ReceiptItem[],
        tap?: CardAction,
        tax?: string,
        vat?: string,
        total?: string,
        buttons?: CardAction[]
    }
}

// Deprecated format for Skype channels. For testing legacy bots in Emulator only.
export interface FlexCard {
    contentType: "application/vnd.microsoft.card.flex",
    content: {
        title?: string,
        subtitle?: string,
        text?: string,
        images?: CardImage[],
        buttons?: CardAction[],
        aspect?: string
    }
}

export interface AudioCard {
    contentType: "application/vnd.microsoft.card.audio",
    content: {
        title?: string,
        subtitle?: string,
        text?: string,
        media?: { url: string, profile?: string }[],
        buttons?: CardAction[],
        autoloop?: boolean,
        autostart?: boolean
    }
}

export interface VideoCard {
    contentType: "application/vnd.microsoft.card.video",
    content: {
        title?: string,
        subtitle?: string,
        text?: string,
        media?: { url: string, profile?: string }[],
        buttons?: CardAction[],
        image?: { url: string, alt?: string },
        autoloop?: boolean,
        autostart?: boolean
    }
}

export interface AdaptiveCard {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: any;
}

export interface AnimationCard {
    contentType: "application/vnd.microsoft.card.animation",
    content: {
        title?: string,
        subtitle?: string,
        text?: string,
        media?: { url: string, profile?: string }[],
        buttons?: CardAction[],
        image?: { url: string, alt?: string },
        autoloop?: boolean,
        autostart?: boolean
    }
}

export type KnownMedia = Media | HeroCard | Thumbnail | Signin | OAuth | Receipt | AudioCard | VideoCard | AnimationCard | FlexCard | AdaptiveCard;
export type Attachment = KnownMedia | UnknownMedia;

export type UserRole = "bot" | "channel" | "user";

export interface User {
    id: string,
    name?: string,
    iconUrl?: string,
    role?: UserRole
}

export interface IActivity {
    type: string,
    channelData?: any,
    channelId?: string,
    conversation?: { id: string },
    eTag?: string,
    from: User,
    id?: string,
    timestamp?: string
}

export type AttachmentLayout = "list" | "carousel";

export interface Message extends IActivity {
    type: "message",
    text?: string,
    locale?: string,
    textFormat?: "plain" | "markdown" | "xml",
    attachmentLayout?: AttachmentLayout,
    attachments?: Attachment[],
    entities?: any[],
    suggestedActions?: { actions: CardAction[], to?: string[] },
    speak?: string,
    inputHint?: string,
    value?: object
}

export interface Typing extends IActivity {
    type: "typing"
}

export interface EventActivity extends IActivity {
    type: "event",
    name: string,
    value: any
}

export type Activity = Message | Typing | EventActivity;

export interface ActivityGroup {
    activities: Activity[],
    watermark: string
}

// These types are specific to this client library, not to Direct Line 3.0

export enum ConnectionStatus {
    Uninitialized,              // the status when the DirectLine object is first created/constructed
    Connecting,                 // currently trying to connect to the conversation
    Online,                     // successfully connected to the conversation. Connection is healthy so far as we know.
    ExpiredToken,               // last operation errored out with an expired token. Possibly waiting for someone to supply a new one.
    FailedToConnect,            // the initial attempt to connect to the conversation failed. No recovery possible.
    Ended                       // the bot ended the conversation
}

export interface DirectLineOptions {
    secret?: string,
    token?: string,
    conversationId?: string,
    watermark?: string,
    domain?: string,
    webSocket?: boolean,
    pollingInterval?: number,
    streamUrl?: string,
    timeout?: number,
    // Attached to all requests to identify requesting agent.
    botAgent?: string,
    conversationStartProperties?: any
}

export interface Services {
    scheduler: IScheduler;
    WebSocket: typeof WebSocket;
    ajax: AjaxCreationMethod;
    random: () => number;
}

const wrapAjaxWithRetry = (source: AjaxCreationMethod, scheduler: IScheduler): AjaxCreationMethod =>{

    const notImplemented = (): never => { throw new Error('not implemented'); };

    const inner = (response$ : Observable<AjaxResponse>) => {
        return response$
        .catch<AjaxResponse, AjaxResponse>((err) => {
            if(err.status === 429){
                const retryAfterValue = err.xhr.getResponseHeader('Retry-After');
                const retryAfter = Number(retryAfterValue);
                if(!isNaN(retryAfter)){
                    return Observable.timer(retryAfter, scheduler)
                    .flatMap(_ => Observable.throw(err, scheduler));
                }
            }

            return Observable.throw(err, scheduler);
        });
    };

    const outer = (urlOrRequest: string| AjaxRequest) => {
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
    const scheduler = services.scheduler || AsyncScheduler;
    return {
        scheduler,
        ajax: wrapAjaxWithRetry(services.ajax || Observable.ajax, scheduler),
        WebSocket: services.WebSocket || WebSocket,
        random: services.random || Math.random,
    }
}

const lifetimeRefreshToken = 30 * 60 * 1000;
const intervalRefreshToken = lifetimeRefreshToken / 2;

const POLLING_INTERVAL_LOWER_BOUND: number = 200; //ms

const errorExpiredToken = new Error("expired token");
const errorConversationEnded = new Error("conversation ended");
const errorFailedToConnect = new Error("failed to connect");

const konsole = {
    log: (message?: any, ... optionalParams: any[]) => {
        if (typeof window !== 'undefined' && (window as any)["botchatDebug"] && message)
            console.log(message, ... optionalParams);
    }
}

export interface IBotConnection {
    connectionStatus$: BehaviorSubject<ConnectionStatus>,
    activity$: Observable<Activity>,
    end(): void,
    referenceGrammarId?: string,
    postActivity(activity: Activity): Observable<string>,
    getSessionId? : () => Observable<string>
}

export class DirectLine implements IBotConnection {
    public connectionStatus$ = new BehaviorSubject(ConnectionStatus.Uninitialized);
    public activity$: Observable<Activity>;

    private domain = "https://directline.botframework.com/v3/directline";
    private webSocket: boolean;

    private conversationId: string;
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

    private pollingInterval: number = 1000; //ms

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

        const parsedPollingInterval = ~~options.pollingInterval;

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
        ).share();
    }

    // Every time we're about to make a Direct Line REST call, we call this first to see check the current connection status.
    // Either throws an error (indicating an error state) or emits a null, indicating a (presumably) healthy connection
    private checkConnection(once = false) {
        let obs =  this.connectionStatus$
        .flatMap(connectionStatus => {
            if (connectionStatus === ConnectionStatus.Uninitialized) {
                this.connectionStatus$.next(ConnectionStatus.Connecting);

                //if token and streamUrl are defined it means reconnect has already been done. Skipping it.
                if (this.token && this.streamUrl) {
                    this.connectionStatus$.next(ConnectionStatus.Online);
                    return Observable.of(connectionStatus, this.services.scheduler);
                } else {
                    return this.startConversation().do(conversation => {
                        this.conversationId = conversation.conversationId;
                        this.token = this.secret || conversation.token;
                        this.streamUrl = conversation.streamUrl;
                        this.referenceGrammarId = conversation.referenceGrammarId;
                        if (!this.secret)
                            this.refreshTokenLoop();

                        this.connectionStatus$.next(ConnectionStatus.Online);
                    }, error => {
                        this.connectionStatus$.next(ConnectionStatus.FailedToConnect);
                    })
                    .map(_ => connectionStatus);
                }
            }
            else {
                return Observable.of(connectionStatus, this.services.scheduler);
            }
        })
        .filter(connectionStatus => connectionStatus != ConnectionStatus.Uninitialized && connectionStatus != ConnectionStatus.Connecting)
        .flatMap(connectionStatus => {
            switch (connectionStatus) {
                case ConnectionStatus.Ended:
                    return Observable.throw(errorConversationEnded, this.services.scheduler);

                case ConnectionStatus.FailedToConnect:
                    return Observable.throw(errorFailedToConnect, this.services.scheduler);

                case ConnectionStatus.ExpiredToken:
                    return Observable.of(connectionStatus, this.services.scheduler);

                default:
                    return Observable.of(connectionStatus, this.services.scheduler);
            }
        })

        return once ? obs.take(1) : obs;
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
        //if conversationid is set here, it means we need to call the reconnect api, else it is a new conversation
        const url = this.conversationId
            ? `${this.domain}/conversations/${this.conversationId}?watermark=${this.watermark}`
            : `${this.domain}/conversations`;
        const method = this.conversationId ? "GET" : "POST";
        const body = this.conversationId
            ? undefined
            : {
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
//      .do(ajaxResponse => konsole.log("conversation ajaxResponse", ajaxResponse.response))
        .map(ajaxResponse => ajaxResponse.response as Conversation)
        .retryWhen(error$ =>
            // for now we deem 4xx and 5xx errors as unrecoverable
            // for everything else (timeouts), retry for a while
            error$.mergeMap((error) => {
                return error.status >= 400 && error.status < 600
                ? Observable.throw(error, this.services.scheduler)
                : Observable.of(error, this.services.scheduler)
            })
            .delay(this.timeout, this.services.scheduler)
            .take(this.retries)
        )
    }

    private refreshTokenLoop() {
        this.tokenRefreshSubscription = Observable.interval(intervalRefreshToken, this.services.scheduler)
        .flatMap(_ => this.refreshToken())
        .subscribe(token => {
            konsole.log("refreshing token", token, "at", new Date());
            this.token = token;
        });
    }

    private refreshToken() {
        return this.checkConnection(true)
        .flatMap(_ =>
            this.services.ajax({
                method: "POST",
                url: `${this.domain}/tokens/refresh`,
                timeout: this.timeout,
                headers: {
                    ...this.commonHeaders()
                }
            })
            .map(ajaxResponse => ajaxResponse.response.token as string)
            .retryWhen(error$ => error$
                .mergeMap(error => {
                    if (error.status === 403) {
                        // if the token is expired there's no reason to keep trying
                        this.expiredToken();
                        return Observable.throw(error, this.services.scheduler);
                    } else if (error.status === 404) {
                        // If the bot is gone, we should stop retrying
                        return Observable.throw(error, this.services.scheduler);
                    }

                    return Observable.of(error, this.services.scheduler);
                })
                .delay(this.timeout, this.services.scheduler)
                .take(this.retries)
            )
        )
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
            .flatMap(_ =>
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
                .map(ajaxResponse => {
                    if (ajaxResponse && ajaxResponse.response && ajaxResponse.response.sessionId) {
                        konsole.log("getSessionId response: " + ajaxResponse.response.sessionId);
                        return ajaxResponse.response.sessionId as string;
                    }
                    return '';
                })
                .catch(error => {
                    konsole.log("getSessionId error: " + error.status);
                    return Observable.of('', this.services.scheduler);
                })
            )
            .catch(error => this.catchExpiredToken(error));
    }

    postActivity(activity: Activity) {
        // Use postMessageWithAttachments for messages with attachments that are local files (e.g. an image to upload)
        // Technically we could use it for *all* activities, but postActivity is much lighter weight
        // So, since WebChat is partially a reference implementation of Direct Line, we implement both.
        if (activity.type === "message" && activity.attachments && activity.attachments.length > 0)
            return this.postMessageWithAttachments(activity);

        // If we're not connected to the bot, get connected
        // Will throw an error if we are not connected
        konsole.log("postActivity", activity);
        return this.checkConnection(true)
        .flatMap(_ =>
            this.services.ajax({
                method: "POST",
                url: `${this.domain}/conversations/${this.conversationId}/activities`,
                body: activity,
                timeout: this.timeout,
                headers: {
                    "Content-Type": "application/json",
                    ...this.commonHeaders()
                },
            })
            .map(ajaxResponse => ajaxResponse.response.id as string)
            .catch(error => this.catchPostError(error))
        )
        .catch(error => this.catchExpiredToken(error));
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
        .flatMap(_ => {
            // To send this message to DirectLine we need to deconstruct it into a "template" activity
            // and one blob for each attachment.
            formData = new FormData();
            formData.append('activity', new Blob([JSON.stringify({
                ...message,
                // Removing contentUrl from attachment, we will send it via multipart
                attachments: cleansedAttachments.map(({ contentUrl: string, ...others }) => ({ ...others }))
            })], { type: 'application/vnd.microsoft.activity' }));

            return Observable.from(cleansedAttachments, this.services.scheduler)
            .flatMap((media: Media) =>
                this.services.ajax({
                    method: "GET",
                    url: media.contentUrl,
                    responseType: 'arraybuffer'
                })
                .do(ajaxResponse =>
                    formData.append('file', new Blob([ajaxResponse.response], { type: media.contentType }), media.name)
                )
            )
            .count()
        })
        .flatMap(_ =>
            this.services.ajax({
                method: "POST",
                url: `${this.domain}/conversations/${this.conversationId}/upload?userId=${message.from.id}`,
                body: formData,
                timeout: this.timeout,
                headers: {
                    ...this.commonHeaders()
                }
            })
            .map(ajaxResponse => ajaxResponse.response.id as string)
            .catch(error => this.catchPostError(error))
        )
        .catch(error => this.catchPostError(error));
    }

    private catchPostError(error: any) {
        if (error.status === 403)
            // token has expired (will fall through to return "retry")
            this.expiredToken();
        else if (error.status >= 400 && error.status < 500)
            // more unrecoverable errors
            return Observable.throw(error, this.services.scheduler);
        return Observable.of("retry", this.services.scheduler);
    }

    private catchExpiredToken(error: any) {
        return error === errorExpiredToken
        ? Observable.of("retry", this.services.scheduler)
        : Observable.throw(error, this.services.scheduler);
    }

    private pollingGetActivity$() {
        const poller$: Observable<AjaxResponse> = Observable.create((subscriber: Subscriber<any>) => {
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
        .flatMap(_ => poller$
            .catch(() => Observable.empty())
            .map(ajaxResponse => ajaxResponse.response as ActivityGroup)
            .flatMap(activityGroup => this.observableFromActivityGroup(activityGroup)));
    }

    private observableFromActivityGroup(activityGroup: ActivityGroup) {
        if (activityGroup.watermark)
            this.watermark = activityGroup.watermark;
        return Observable.from(activityGroup.activities, this.services.scheduler);
    }

    private webSocketActivity$(): Observable<Activity> {
        return this.checkConnection()
        .flatMap(_ =>
            this.observableWebSocket<ActivityGroup>()
            // WebSockets can be closed by the server or the browser. In the former case we need to
            // retrieve a new streamUrl. In the latter case we could first retry with the current streamUrl,
            // but it's simpler just to always fetch a new one.
            .retryWhen(error$ => error$.delay(this.getRetryDelay(), this.services.scheduler).mergeMap(error => this.reconnectToConversation()))
        )
        .flatMap(activityGroup => this.observableFromActivityGroup(activityGroup))
    }

    // Returns the delay duration in milliseconds
    private getRetryDelay() {
        return Math.floor(3000 + this.services.random() * 12000);
    }

    // Originally we used Observable.webSocket, but it's fairly opinionated and I ended up writing
    // a lot of code to work around their implementation details. Since WebChat is meant to be a reference
    // implementation, I decided roll the below, where the logic is more purposeful. - @billba
    private observableWebSocket<T>() {
        return Observable.create((subscriber: Subscriber<T>) => {
            konsole.log("creating WebSocket", this.streamUrl);
            const ws = new this.services.WebSocket(this.streamUrl);
            let sub: Subscription;

            ws.onopen = open => {
                konsole.log("WebSocket open", open);
                // Chrome is pretty bad at noticing when a WebSocket connection is broken.
                // If we periodically ping the server with empty messages, it helps Chrome
                // realize when connection breaks, and close the socket. We then throw an
                // error, and that give us the opportunity to attempt to reconnect.
                sub = Observable.interval(this.timeout, this.services.scheduler).subscribe(_ => {
                    try {
                        ws.send("")
                    } catch(e) {
                        konsole.log("Ping error", e);
                    }
                });
            }

            ws.onclose = close => {
                konsole.log("WebSocket close", close);
                if (sub) sub.unsubscribe();
                subscriber.error(close);
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
        .flatMap(_ =>
            this.services.ajax({
                method: "GET",
                url: `${this.domain}/conversations/${this.conversationId}?watermark=${this.watermark}`,
                timeout: this.timeout,
                headers: {
                    "Accept": "application/json",
                    ...this.commonHeaders()
                }
            })
            .do(result => {
                if (!this.secret)
                    this.token = result.response.token;
                this.streamUrl = result.response.streamUrl;
            })
            .map(_ => null)
            .retryWhen(error$ => error$
                .mergeMap(error => {
                    if (error.status === 403) {
                        // token has expired. We can't recover from this here, but the embedding
                        // website might eventually call reconnect() with a new token and streamUrl.
                        this.expiredToken();
                    } else if (error.status === 404) {
                        return Observable.throw(errorConversationEnded, this.services.scheduler);
                    }

                    return Observable.of(error, this.services.scheduler);
                })
                .delay(this.timeout, this.services.scheduler)
                .take(this.retries)
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

        return `${DIRECT_LINE_VERSION} (${clientAgent} ${process.env.npm_package_version})`;
    }


}
