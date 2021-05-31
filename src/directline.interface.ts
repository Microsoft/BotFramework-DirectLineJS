import { BehaviorSubject, Observable, SchedulerLike } from "rxjs";
import { ConnectionStatus } from './directline.enum';
import { AjaxCreationMethod } from "rxjs/internal/observable/dom/AjaxObservable";

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

export interface UnknownMedia {
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

export interface InvokeActivity extends IActivity {
    type: 'invoke',
    name: 'adaptiveCard/action',
    value: {
        action: {
            type: 'Action.Execute',
            id: string;
            verb: string;
            data: any;
        },
        trigger: 'automatic' | 'manual'
    }
}

export type Activity = Message | Typing | EventActivity | InvokeActivity;

export interface ActivityGroup {
    activities: Activity[],
    watermark: string
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

export interface IBotConnection {
    connectionStatus$: BehaviorSubject<ConnectionStatus>,
    referenceGrammarId?: string,
    getSessionId?: () => Observable<string>
    activity$: Observable<Activity>,
    end(): void,
    postActivity(activity: Activity): Observable<string>,
}

export interface Services {
    scheduler: SchedulerLike;
    WebSocket: typeof WebSocket;
    ajax: AjaxCreationMethod;
    random: () => number;
}
