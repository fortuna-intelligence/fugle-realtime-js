/// <reference types="socket.io-client" />
export interface IObjStrToAnyOrT<T = any> {
    [index: string]: T;
}
export declare type Mode = 'tse-sem' | 'tpex-otc' | 'tpex-emg';
export declare type SymbolId = string;
export declare type Date = number;
export interface IArgMode {
    readonly mode?: Mode;
}
export interface IArgDate {
    readonly date?: Date;
}
export interface IArgSocketIo extends IArgMode {
    readonly symbolId: SymbolId;
}
export interface IArgApi extends IArgDate, IArgSocketIo {
}
export interface IArgApiTrading extends IArgMode, IArgDate {
}
export declare type ApiDoc = IObjStrToAnyOrT;
export declare type Api = (arg: IArgApi) => Promise<ApiDoc>;
export declare type Environment = 'development' | 'production';
export declare type Namespace = 'delay' | 'realtime';
export interface IArgFugleRealtime {
    readonly token: string;
    readonly environment?: Environment;
    readonly issuer?: string;
    readonly namespace?: Namespace;
    readonly socketIo?: boolean;
    readonly url?: string;
    readonly version?: string;
    readonly fetch?: (url: string | Request, init?: RequestInit) => Promise<Response>;
}
export declare type Ticks = IObjStrToAnyOrT<ApiDoc>;
export declare type Cb = (arg: ApiDoc, bigO?: boolean) => any;
export interface IFugleRealtimeApiDoc {
    readonly meta: Api;
    readonly tick: Api;
}
export interface IFugleRealtimeSocketDoc {
    readonly io: SocketIOClient.Socket;
    readonly join: (arg: IArgSocketIo, cb?: Cb) => Promise<void | SocketIOClient.Socket>;
    readonly leave: (arg: IArgSocketIo) => SocketIOClient.Socket;
    readonly ticks: Ticks;
}
export interface IFugleRealtimeDoc {
    readonly api: IFugleRealtimeApiDoc;
    readonly socket: IFugleRealtimeSocketDoc;
}
declare const fugleRealtime: ({ token, environment, issuer, namespace, socketIo, url, version, fetch, }: IArgFugleRealtime) => IFugleRealtimeDoc;
export default fugleRealtime;
