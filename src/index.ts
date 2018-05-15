import * as deepmerge from 'deepmerge';
import { isBoolean, isEmpty, isFunction, isNumber, isPlainObject, isString, orderBy } from 'lodash';
import * as io from 'socket.io-client';
import { parse } from 'url';
import { default as wretcher } from 'wretch';

export interface IObjStrToAnyOrT<T = any> {
  [index: string]: T;
}
/*export*/ interface IObjStrRoToAnyOrT<T = any> {
  readonly [index: string]: T;
}
export type Mode = 'tse-sem' | 'tpex-otc' | 'tpex-emg';
export type SymbolId = string;
export type Date = number;
export interface IArgMode {
  readonly mode?: Mode;
}
export interface IArgDate {
  readonly date?: Date;
}
export interface IArgSocketIo extends IArgMode {
  readonly symbolId: SymbolId;
}
export interface IArgApi extends IArgDate, IArgSocketIo {}
export interface IArgApiTrading extends IArgMode, IArgDate {}
export type ApiDoc = IObjStrToAnyOrT;
export type Api = (arg: IArgApi) => Promise<ApiDoc>;
export type Environment = 'development' | 'production';
export type Namespace = 'delay' | 'realtime';
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
export type Ticks = IObjStrToAnyOrT<ApiDoc>;
export type Cb = (arg: ApiDoc, bigO?: boolean) => any;
export type ErrCb = (err: Error) => any;
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
  readonly modifyToken: (token: string) => void;
  readonly api: IFugleRealtimeApiDoc;
  readonly socket: IFugleRealtimeSocketDoc;
}
type Cbs = IObjStrToAnyOrT<Cb>;
type ErrCbs = IObjStrToAnyOrT<ErrCb>;
type OpMethod = 'push' | 'update' | 'pull';
interface IOp {
  readonly method: OpMethod;
  readonly by: string;
  readonly from: string;
  readonly to: string;
}
interface IOnTick {
  readonly doc: ApiDoc;
  readonly ops: IOp[];
}

const isArray = Array.isArray;
const isNonEmptyPlainObject = <T = any>(arg: any): arg is IObjStrToAnyOrT<T> =>
  isPlainObject(arg) && !isEmpty(arg);
const merge = <T1 = {}, T2 = {}>(t1: T1, t2: T2): T1 & T2 =>
  ((deepmerge as any).default || deepmerge)(t1 || {}, t2 || {}, {
    arrayMerge: (_dest: any[], src: any[]): any[] => src,
  });
const modes: Mode[] = ['tse-sem', 'tpex-otc', 'tpex-emg'];
const fugleRealtime = ({
  token,
  environment = 'production',
  issuer = 'realtime',
  namespace = 'realtime',
  socketIo = true,
  url = 'https://realtime.fugle.tw/api',
  version = 'latest',
  fetch,
}: IArgFugleRealtime): IFugleRealtimeDoc => {
  const headers = {
    'Fugle-Realtime-Auth-Issuer': issuer,
    'Fugle-Realtime-Auth-Environment': environment,
  };
  let wretch = (fetch && isFunction(fetch) ? wretcher().polyfills({ fetch }) : wretcher())
    .url(`${url}/${version}/${namespace}`)
    .options({ credentials: 'include', mode: 'cors' })
    .headers(headers)
    .content('application/json')
    .auth(`Bearer ${token}`);
  const modifyToken = (token: string): void => {
    wretch = wretch.auth(`Bearer ${token}`);
    return undefined;
  };
  const meta = ({ mode, symbolId, date }: IArgApi): Promise<ApiDoc> =>
    wretch
      .url('/meta')
      .json({ mode, symbolId, date })
      .post()
      .json();
  const tick = ({ mode, symbolId, date }: IArgApi): Promise<ApiDoc> =>
    wretch
      .url('/tick')
      .json({ mode, symbolId, date })
      .post()
      .json();
  const trading = ({ mode, date }: IArgApiTrading): Promise<ApiDoc> =>
    wretch
      .url('/trading')
      .json({ mode, date })
      .post()
      .json();
  const { hostname = 'realtime.fugle.tw', pathname = '/api', protocol = 'https' } = parse(url);
  const socket = io.connect(`${protocol}//${hostname}/${namespace}`, {
    autoConnect: socketIo,
    path: `${pathname}/socket.io/${version}`,
    transportOptions: {
      polling: { extraHeaders: { ...headers, Authorization: `Bearer ${token}` } },
    },
  });
  const ticks: Ticks = {};
  const cbs: Cbs = {};
  const errCbs: ErrCbs = {};
  const join = async (
    { mode: m, symbolId }: IArgSocketIo,
    cb: Cb = (arg: ApiDoc): ApiDoc => arg,
    errCb: ErrCb = (err: Error) => err,
  ): Promise<void | SocketIOClient.Socket> => {
    const doc: ApiDoc = merge(
      await meta({ mode: m, symbolId }).catch(errCb),
      await tick({ mode: m, symbolId }).catch(errCb),
    );
    if (!isArray(doc.ticks)) {
      doc.ticks = [];
    }
    const mode: Mode = m || doc.mode;
    if (isString(mode) && modes.includes(mode)) {
      ticks[symbolId] = doc;
      cbs[symbolId] = cb;
      cb(doc);
      socket.emit('join', { mode, symbolId });
      errCbs[symbolId] = errCb;
    }
    return;
  };
  const leave = ({ mode, symbolId }: IArgSocketIo): SocketIOClient.Socket =>
    socket.emit('leave', { mode, symbolId });
  const clean = ({ symbolId }: IArgSocketIo): void => {
    const tickDoc = ticks[symbolId];
    const cb = cbs[symbolId];
    if (isNonEmptyPlainObject(tickDoc)) {
      delete ticks[symbolId];
    }
    if (isFunction(cb)) {
      delete cbs[symbolId];
    }
    return;
  };
  socket.on('joinFailed', clean);
  socket.on('left', clean);
  socket.on('reconnect', (): void =>
    Object.keys(ticks).forEach(async (symbolId: string): Promise<void> => {
      const mode = ticks[symbolId].mode;
      const doc: ApiDoc = merge(
        await meta({ mode, symbolId }).catch((): ApiDoc => ({})),
        await tick({ mode, symbolId }).catch((): ApiDoc => ({})),
      );
      ticks[symbolId] = doc;
      cbs[symbolId](doc);
      return;
    }),
  );
  socket.on('tick', ({ doc = {}, ops = [] }: IOnTick): void => {
    if (!isNonEmptyPlainObject(doc)) {
      return;
    }
    const symbolId = doc.symbol.id;
    const tickDoc = ticks[symbolId];
    if (!isNonEmptyPlainObject(tickDoc)) {
      return;
    }
    ['buy5', 'sell5', 'buy1Firms', 'sell1Firms'].forEach((bs: string): void => {
      const arr = doc[bs];
      if (isArray(arr)) {
        tickDoc[bs] = doc[bs];
      }
      return;
    });
    let bigO;
    if (isNonEmptyPlainObject(doc.tick) && isArray(doc.tick.status)) {
      ops.forEach(({ method, by, from, to }: IOp): void => {
        if (!isString(method)) {
          return;
        }
        if (method === 'push' && isString(from) && isString(to)) {
          if (!isArray(tickDoc[to])) {
            tickDoc[to] = [];
          }
          tickDoc[to].push(doc[from]);
          tickDoc[to] = orderBy(tickDoc[to], ['time'], ['asc']);
          tickDoc.tick = doc.tick;
          bigO = false;
        } else if (method === 'update' && isString(by) && isString(from) && isString(to)) {
          tickDoc[to] = tickDoc[to].map(
            (child: IObjStrRoToAnyOrT): IObjStrRoToAnyOrT =>
              child[by] === doc[from] ? doc : child,
          );
          tickDoc[to] = orderBy(tickDoc[to], ['time'], ['asc']);
          bigO = true;
        } else if (method === 'pull' && isString(by) && isString(from) && isString(to)) {
          tickDoc[to] = tickDoc[to].filter(
            (child: IObjStrRoToAnyOrT): boolean => (child[by] === doc[from] ? false : true),
          );
          tickDoc[to] = orderBy(tickDoc[to], ['time'], ['asc']);
          bigO = true;
        }
      });
      if (!doc.tick.status.includes('trial')) {
        if (!isNonEmptyPlainObject(tickDoc.volume)) {
          tickDoc.volume = {};
        }
        if (isNonEmptyPlainObject(doc.volume) && isNumber(doc.volume.total)) {
          tickDoc.volume.total = doc.volume.total;
        } else if (
          isArray(doc.tick.total) &&
          doc.tick.total.length === 2 &&
          isNumber(doc.tick.total[1])
        ) {
          tickDoc.volume.total = doc.tick.total[1];
        }
        ['in', 'out'].forEach((status: string): void => {
          if (
            doc.tick.status.includes(status) &&
            isNonEmptyPlainObject(doc.volume) &&
            isNumber(doc.volume[status])
          ) {
            tickDoc.volume[status] = doc.volume[status];
          }
          return;
        });
        ['open', 'close', 'highest', 'lowest', 'up', 'down'].forEach((status: string): void => {
          if (doc.tick.status.includes(status)) {
            if (
              isArray(doc.tick.value) &&
              doc.tick.value.length === 2 &&
              isNumber(doc.tick.value[0])
            ) {
              if (!isNonEmptyPlainObject(tickDoc.price)) {
                tickDoc.price = {};
              }
              tickDoc.price[status] = doc.tick.value[0];
            } else if (isNumber(doc.tick.index)) {
              if (!isNonEmptyPlainObject(tickDoc.index)) {
                tickDoc.index = {};
              }
              tickDoc.index[status] = doc.tick.index;
            }
          }
        });
      }
    }
    ticks[symbolId] = tickDoc;
    cbs[symbolId](tickDoc, bigO);
    return;
  });
  setInterval(async (): Promise<void> => {
    const now = new Date();
    if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
      const tradingDoc = await trading({}).catch((): ApiDoc => ({}));
      if (isNonEmptyPlainObject(tradingDoc)) {
        Object.keys(ticks).forEach(async (symbolId: SymbolId): Promise<void> => {
          const mode: Mode = ticks[symbolId].mode;
          if (
            isNonEmptyPlainObject(tradingDoc[mode]) &&
            isBoolean(tradingDoc[mode].today) &&
            tradingDoc[mode].today
          ) {
            await join({ symbolId }, cbs[symbolId]);
          }
          return;
        });
      }
    }
    return;
  }, 60000);
  return { modifyToken, api: { meta, tick }, socket: { io: socket, join, leave, ticks } };
};
(fugleRealtime as any).default = fugleRealtime;

export default fugleRealtime;
