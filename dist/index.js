var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as deepmerge from 'deepmerge';
import { isBoolean, isEmpty, isFunction, isNumber, isPlainObject, isString, orderBy } from 'lodash';
import * as io from 'socket.io-client';
import { parse } from 'url';
import { default as wretcher } from 'wretch';
const isArray = Array.isArray;
const isNonEmptyPlainObject = (arg) => isPlainObject(arg) && !isEmpty(arg);
const merge = (t1, t2) => (deepmerge.default || deepmerge)(t1 || {}, t2 || {}, {
    arrayMerge: (_dest, src) => src,
});
const modes = ['tse-sem', 'tpex-otc', 'tpex-emg'];
const fugleRealtime = ({ token, environment = 'production', issuer = 'realtime', namespace = 'realtime', socketIo = true, url = 'https://realtime.fugle.tw/api', version = 'latest', fetch, }) => {
    const headers = {
        'Fugle-Realtime-Auth-Issuer': issuer,
        'Fugle-Realtime-Auth-Environment': environment,
    };
    const wretch = (fetch && isFunction(fetch) ? wretcher().polyfills({ fetch }) : wretcher())
        .url(`${url}/${version}/${namespace}`)
        .options({ credentials: 'include', mode: 'cors' })
        .headers(headers)
        .content('application/json')
        .auth(`Bearer ${token}`);
    const modifyToken = (token) => wretch.auth(`Bearer ${token}`);
    const meta = ({ mode, symbolId, date }) => wretch
        .url('/meta')
        .json({ mode, symbolId, date })
        .post()
        .json();
    const tick = ({ mode, symbolId, date }) => wretch
        .url('/tick')
        .json({ mode, symbolId, date })
        .post()
        .json();
    const trading = ({ mode, date }) => wretch
        .url('/trading')
        .json({ mode, date })
        .post()
        .json();
    const { hostname = 'realtime.fugle.tw', pathname = '/api', protocol = 'https' } = parse(url);
    const socket = io.connect(`${protocol}//${hostname}/${namespace}`, {
        autoConnect: socketIo,
        path: `${pathname}/socket.io/${version}`,
        transportOptions: {
            polling: { extraHeaders: Object.assign({}, headers, { Authorization: `Bearer ${token}` }) },
        },
    });
    const ticks = {};
    const cbs = {};
    const join = ({ mode: m, symbolId }, cb = (arg) => arg, errCb = (err) => err) => __awaiter(this, void 0, void 0, function* () {
        const doc = merge(yield meta({ mode: m, symbolId }).catch(errCb), yield tick({ mode: m, symbolId }).catch(errCb));
        if (!isArray(doc.ticks)) {
            doc.ticks = [];
        }
        const mode = m || doc.mode;
        if (isString(mode) && modes.includes(mode)) {
            ticks[symbolId] = doc;
            cbs[symbolId] = cb;
            cb(doc);
            socket.emit('join', { mode, symbolId });
        }
        return;
    });
    const leave = ({ mode, symbolId }) => socket.emit('leave', { mode, symbolId });
    const clean = ({ symbolId }) => {
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
    socket.on('reconnect', () => Object.keys(ticks).forEach((symbolId) => __awaiter(this, void 0, void 0, function* () {
        const mode = ticks[symbolId].mode;
        const doc = merge(yield meta({ mode, symbolId }).catch(() => ({})), yield tick({ mode, symbolId }).catch(() => ({})));
        ticks[symbolId] = doc;
        cbs[symbolId](doc);
        return;
    })));
    socket.on('tick', ({ doc = {}, ops = [] }) => {
        if (!isNonEmptyPlainObject(doc)) {
            return;
        }
        const symbolId = doc.symbol.id;
        const tickDoc = ticks[symbolId];
        if (!isNonEmptyPlainObject(tickDoc)) {
            return;
        }
        ['buy5', 'sell5', 'buy1Firms', 'sell1Firms'].forEach((bs) => {
            const arr = doc[bs];
            if (isArray(arr)) {
                tickDoc[bs] = doc[bs];
            }
            return;
        });
        let bigO;
        if (isNonEmptyPlainObject(doc.tick) && isArray(doc.tick.status)) {
            ops.forEach(({ method, by, from, to }) => {
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
                }
                else if (method === 'update' && isString(by) && isString(from) && isString(to)) {
                    tickDoc[to] = tickDoc[to].map((child) => child[by] === doc[from] ? doc : child);
                    tickDoc[to] = orderBy(tickDoc[to], ['time'], ['asc']);
                    bigO = true;
                }
                else if (method === 'pull' && isString(by) && isString(from) && isString(to)) {
                    tickDoc[to] = tickDoc[to].filter((child) => (child[by] === doc[from] ? false : true));
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
                }
                else if (isArray(doc.tick.total) &&
                    doc.tick.total.length === 2 &&
                    isNumber(doc.tick.total[1])) {
                    tickDoc.volume.total = doc.tick.total[1];
                }
                ['in', 'out'].forEach((status) => {
                    if (doc.tick.status.includes(status) &&
                        isNonEmptyPlainObject(doc.volume) &&
                        isNumber(doc.volume[status])) {
                        tickDoc.volume[status] = doc.volume[status];
                    }
                    return;
                });
                ['open', 'close', 'highest', 'lowest', 'up', 'down'].forEach((status) => {
                    if (doc.tick.status.includes(status)) {
                        if (isArray(doc.tick.value) &&
                            doc.tick.value.length === 2 &&
                            isNumber(doc.tick.value[0])) {
                            if (!isNonEmptyPlainObject(tickDoc.price)) {
                                tickDoc.price = {};
                            }
                            tickDoc.price[status] = doc.tick.value[0];
                        }
                        else if (isNumber(doc.tick.index)) {
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
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
            const tradingDoc = yield trading({}).catch(() => ({}));
            if (isNonEmptyPlainObject(tradingDoc)) {
                Object.keys(ticks).forEach((symbolId) => __awaiter(this, void 0, void 0, function* () {
                    const mode = ticks[symbolId].mode;
                    if (isNonEmptyPlainObject(tradingDoc[mode]) &&
                        isBoolean(tradingDoc[mode].today) &&
                        tradingDoc[mode].today) {
                        yield join({ symbolId }, cbs[symbolId]);
                    }
                    return;
                }));
            }
        }
        return;
    }), 60000);
    return { modifyToken, api: { meta, tick }, socket: { io: socket, join, leave, ticks } };
};
fugleRealtime.default = fugleRealtime;
export default fugleRealtime;
//# sourceMappingURL=index.js.map