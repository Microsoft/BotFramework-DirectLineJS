import * as DirectLineExport from "./directLine";
import * as DirectLineMock from './directLine.mock';
import { TestScheduler, Observable, Subscription } from "rxjs";

declare var process: {
    arch: string;
    env: {
        VERSION: string;
    };
    platform: string;
    release: string;
    version: string;
};

test("#setConnectionStatusFallback", () => {
    const { DirectLine } = DirectLineExport;
    expect(typeof DirectLine.prototype.setConnectionStatusFallback).toBe("function")
    const { setConnectionStatusFallback } = DirectLine.prototype;
    const testFallback = setConnectionStatusFallback(0, 1);
    let idx = 4;
    while (idx--) {
        expect(testFallback(0)).toBe(0);
    }
    // fallback will be triggered
    expect(testFallback(0)).toBe(1);
    idx = 4;
    while (idx--) {
        expect(testFallback(0)).toBe(0);
    }
    expect(testFallback(0)).toBe(1);
});

describe("#commonHeaders", () => {
    const botAgent = "DirectLine/3.0 (directlinejs; custom-bot-agent)";
    let botConnection;

    beforeEach(() => {
        global.process.env.VERSION = "test-version";
        const { DirectLine } = DirectLineExport;
        botConnection = new DirectLine({ token: "secret-token", botAgent: "custom-bot-agent" });
    });

    test('appends browser user agent when in a browser', () => {
        // @ts-ignore
        expect(botConnection.commonHeaders()).toEqual({
            "Authorization": "Bearer secret-token",
            "x-ms-bot-agent": botAgent
        });
    })

    test.skip('appends node environment agent when in node', () => {
        // @ts-ignore
        delete window.navigator
        // @ts-ignore
        const os = require('os');
        const { arch, platform, version } = process;

        // @ts-ignore
        expect(botConnection.commonHeaders()).toEqual({
            "Authorization": "Bearer secret-token",
            "User-Agent": `${botAgent} (Node.js,Version=${version}; ${platform} ${os.release()}; ${arch})`,
            "x-ms-bot-agent": botAgent
        });
    })
});

describe("MockSuite", () => {

    const lazyConcat = <T>(items: Iterable<Observable<T>>): Observable<T> =>
        new Observable<T>(subscriber => {
            const iterator = items[Symbol.iterator]();
            let inner: Subscription | undefined;

            const pump = () => {
                try {
                    const result = iterator.next();
                    if (result.done === true) {
                        subscriber.complete();
                    }
                    else {
                        inner = result.value.subscribe(
                            value => subscriber.next(value),
                            error => subscriber.error(error),
                            pump);
                    }
                }
                catch (error) {
                    subscriber.error(error);
                }
            };

            pump();

            return () => {
                if (inner !== undefined) {
                    inner.unsubscribe();
                }
            };
        });

    let scheduler: TestScheduler;
    let server: DirectLineMock.Server;
    let services: DirectLineExport.Services;
    let subscriptions: Array<Subscription>;
    let directline: DirectLineExport.DirectLine;

    beforeEach(() => {
        scheduler = new TestScheduler((actual, expected) => expect(expected).toBe(actual));
        scheduler.maxFrames = 60 * 1000;
        server = DirectLineMock.mockServer(scheduler);
        services = DirectLineMock.mockServices(server, scheduler);
        directline = new DirectLineExport.DirectLine(services);
        subscriptions = [];
    });

    afterEach(() => {
        for (const subscription of subscriptions) {
            subscription.unsubscribe();
        }
    })

    const expected = {
        x: DirectLineMock.mockActivity('x'),
        y: DirectLineMock.mockActivity('y'),
        z: DirectLineMock.mockActivity('z'),
    };

    test('HappyPath', () => {
        // arrange

        const scenario = function* (): IterableIterator<Observable<unknown>> {
            yield Observable.timer(200, scheduler);
            yield directline.postActivity(expected.x);
            yield Observable.timer(200, scheduler);
            yield directline.postActivity(expected.y);
            yield Observable.timer(200, scheduler);
        };

        subscriptions.push(lazyConcat(scenario()).observeOn(scheduler).subscribe());

        const actual: Array<DirectLineExport.Activity> = [];
        subscriptions.push(directline.activity$.subscribe(a => actual.push(a)));

        // act

        scheduler.flush();

        // assert

        expect(actual).toStrictEqual([expected.x, expected.y]);
    });

    test('ReconnectOnClose', () => {
        // arrange

        const scenario = function* (): IterableIterator<Observable<unknown>> {
            yield Observable.timer(200, scheduler);
            yield directline.postActivity(expected.x);
            DirectLineMock.injectClose(server);
            yield Observable.timer(200, scheduler);
            yield directline.postActivity(expected.y);
            yield Observable.timer(200, scheduler);
        };

        subscriptions.push(lazyConcat(scenario()).observeOn(scheduler).subscribe());

        const actual: Array<DirectLineExport.Activity> = [];
        subscriptions.push(directline.activity$.subscribe(a => actual.push(a)));

        // act

        scheduler.flush();

        // assert

        expect(actual).toStrictEqual([expected.x, expected.y]);
    });
});