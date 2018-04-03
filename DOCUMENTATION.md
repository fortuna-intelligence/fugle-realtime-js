# Fugle Realtime

Fugle Realtime provides APIs and libraries for getting realtime securities data of major exchanges in Taiwan with in-place update.

* Simple REST APIs: Request with any preferred HTTP client.
* Libraries of various programming languages: JavaScript, Python, Swift, etc.
* Major exchanges in Taiwan: TWSE, TPEX and TAIFEX.
* In-place update: Drastically increases data retrieval speed with server push.

# Documentation (v0.1.0-alpha.1)

### Table of Contents

* [Authorization](#authorization)
* [Version](#version)
* [`mode`](#mode)
* [`symbolId`](#symbolid)
* [APIs](#apis)
  * [REST](#rest)
    * [Partial Responses](#partial-responses)
    * [`/versions`](#versions)
    * [`/trading`](#trading)
    * [`/daily`](#daily)
  * [Socket.IO](#socket.io)
* [Libraries](#libraries)
  * [JavaScript](#javascript)
  * [Python](#python)
  * [Swift](#swift)
* [Contact Us](#contact-us)
* [License](#license)
* [Appendix](#appendix)
  * [`symbol.id`](#symbol.id)
  * [`symbol.industry`](#symbol.industry)
  * [`symbol.category`](#symbol.category)
  * [`symbol.problem`](#symbol.problem)
  * [`note.abnormal.status`](#note.abnormal.status)
  * [`warrant.style`](#warrant.style)
  * [`warrant.right`](#warrant.right)
  * [`warrant.contract`](#warrant.contract)
  * [`tick.status`](#tick.status)

# Authorization

Both the APIs and libraries will require a user-generated token to be authorized. Be sure to generate the token from [Fugle Developer](https://developer.fugle.tw/realtime) before you start. Also, make sure to login [Fugle](https://www.fugle.tw) before you can generate your developer token.

For any direct REST request, the generated token should be included in the request header as shown below:

```bash
Authorization: Bearer ${token}
```

# Version

For the sake of getting consistent responses from our servers, we highly recommend you to provide an API version, no matter which APIs or libraries you're using. Else, the latest version of our API implementations will be used instead.

For detailed information on getting active API versions, please refer to [`/versions`](#versions).

# `mode`

In the context of Fugle Realtime, `mode` refer to the abbreviated symbol of supported exchange in Taiwan, along with its abbreviated market name, connected by a dash (`-`). Below is the mapping table:

| `mode` | Exchange | Active |
| - | - | - |
| `tse-sem` | 證交所 - 上市 | `true`
| `tpex-otc` | 櫃買中心 - 上櫃 | `true`
| `tpex-emg` | 櫃買中心 - 興櫃 | `true`
| `tpex-bond` | 櫃買中心 - 債券 | `false`
| `taifex-fut` | 期交所 - 期貨 | `false`
| `taifex-opt` | 期交所 - 選擇權 | `false`

When a `mode` is `true` under active in the table above, it means that Fugle Realtime is currently supporting it. Else when it is `false`, it means that the particular `mode` is planned and will be supported in the future.

Be sure to familiarize yourself with these `mode`s, as they will be mentioned frequently in this documentation.

# `symbolId`

In the context of Fugle Realtime, `symbolId` refers to the symbol of a particular security or index, usually unique across all exchanges in Taiwan, with the exception of some indexes which is commonly shared between exchanges, such as `IX0103` which is shared between `tse-sem` and `tpex-otc`.

For such exception of commonly shared `symbolId` across `mode`s such as `IX0103`, `IX0103` of `tse-sem` is preferred over `tpex-otc` according to the order from the table under [`mode`](#mode). If you still insist on querying `IX0103` from `tpex-otc` however, its `symbolId` is defined as `IX0103/TPEX_OTC`, and the same pattern could be applied to any other shared `symbolId` across `mode`s.

While most of the `symbolId` is defined by its accompanying exchanges, which means that it is universal, such as `2330` (台積電), some of it are not defined by exchanges and thus must be defined by ourselves (mostly indexes), such as `TSE_SEM_INDEX_1` (加權指數). For such, please refer to [Appendix - `symbol.id`](#symbol.id).

Similarly to `mode`, please suit yourself with the concept of `symbolId` since it will also be mentioned frequently in this documentation.

# APIs

The APIs contains 2 parts:

* REST in JSON form, mostly HTTP POST.
* Socket.IO for in-place updates of realtime quotations.

For REST, you can request with any preferred HTTP client of your own.

For Socket.IO however, you can either connect with any Socket.IO client of your preferred language and manually deal with the raw data, or you can connect with any of the [libraries](#libraries) provided by us, and we'll process the raw data for you, which is the recommended way, unless the programming language of your application is not supported by our libraries. If so, feel free to [contact us](#contact-us) on which programming language you would like to see us supporting in the future.

## REST

The REST API can be requested using any preferred HTTP client of your own. But for simplicity sake, [HTTPie](https://httpie.org/) will be defaulted for any direct REST operation mentioned in this documentation.

The base URL of Fugle Realtime API is `https://realtime.fugle.tw/api`.

### Partial Responses

By default, all REST APIs assume that you need every field from a response and return all of it to you. However, you can select only the fields you need with the `fields` parameter as defined by [Partial Responses from Google+ API](https://developers.google.com/+/web/api/rest/#partial-responses). Please refer to the link aforementioned if you need the documentation for technical implementation.

### `/versions`

Both the API URLs of REST and Socket.IO is versioned, of which the versions can be retrieved using HTTPie, also remember to substitute in your generated token as shown in the command below:

```bash
http POST https://realtime.fugle.tw/api/versions Authorization:Bearer\ ${token}
```

You'll get a response in JSON similar to:

```json
{
  "active": ["v0.1.1", "v0.1.2", "latest"],
  "deprecated": ["v0.1.0"],
  "deprecating": ["v0.1.1"],
  "deprecatingAt": {
    "v0.1.1": 20180314
  },
  "latest": "v0.1.2"
}
```

For all endpoints other than `/versions`, we highly recommend you to include the desired API version in your request header as shown below:

```bash
Fugle-Realtime-Version: ${version}
```

Else `latest` will be used as the default version instead.

### `/trading`

The endpoint provides you if today is a trading day or not in boolean, and the date in number of previous, next and next 2 trading days, of all supported `mode`s. Issue the command below with  `mode` and `date` as optional keys in the request body:

```bash
http POST https://realtime.fugle.tw/api/trading mode=tse-sem date=20180314 Authorization:Bearer\ ${token} Fugle-Realtime-Version:${version}
```

The returned response:

```json
{
  "date": 20180314,
  "tse-sem": {
    "today": true,
    "prev": 20180313,
    "next": 20180315,
    "next2": 20180316
  }
}
```

If `date` is not provided in the request body, the date of today will be used as default. Additionally, if `mode` is not provided, all supported `mode`s will be returned in the response, with resemblance to the key-value pair of `tse-sem` above.

Tradings hours of each `mode` is planned to be provided by this endpoint in the near future.

### `/daily`

This is the core endpoint in Fugle Realtime. It provides all possibly available information of a provided `symbolId`, in the sense that `symbolId` is required in the request body, along with optional `mode` and `date`.

```bash
http POST https://realtime.fugle.tw/api/daily symbolId=2330 mode=tse-sem date=20180314 Authorization:Bearer\ ${token} Fugle-Realtime-Version:${version}
```

The response in JSON:

```json
{
  "time": "2018-03-14T05:36:11.197Z",
  "date": 20180314,
  "mode": "tse-sem",
  "symbol": {
    "name": {
      "zh": "台積電"
    },
    "id": "2330",
    "industry": "24",
    "category": "",
    "index": false,
    "informal": false
  },
  "volume": {
    "total": 23735,
    "in": 10385,
    "out": 13331
  },
  "price": {
    "ref": 259,
    "up": 284.5,
    "down": 233.5,
    "open": 256.5,
    "close": 257,
    "highest": 257.5,
    "lowest": 255.5
  },
  "note": {
    "abnormal": {
      "bool": false,
      "status": "0",
      "intro": false,
      "special": false
    },
    "ten": true,
    "day": {
      "buySell": true,
      "sellBuy": true
    },
    "short": true,
    "lend": true,
    "duration": 5
  },
  "other": {
    "foreign": false,
    "trade": {
      "unit": 1000,
      "currency": "TWD"
    }
  },
  "buy5": [[256.5, 120], [256, 488], [255.5, 598], [255, 2135], [254.5, 671]],
  "sell5": [[257, 26], [257.5, 852], [258, 581], [258.5, 365], [259, 638]],
  "tick": {
    "time": "2018-03-14T05:30:00.000Z",
    "status": ["close", "out"],
    "value": [257, 2016],
    "total": [0, 23735]
  },
  "ticks": [
    {
      "time": "2018-03-14T00:30:00.969Z",
      "status": ["trial"],
      "value": [255.5, 304],
      "total": [0, 0]
    },
    ...
    {
      "time": "2018-03-14T01:00:00.948Z",
      "status": ["open", "highest", "lowest", "in"],
      "value": [256.5, 1758],
      "total": [0, 1758]
    },
    ...
    {
      "time": "2018-03-14T05:30:00.000Z",
      "status": ["close", "out"],
      "value": [257, 2016],
      "total": [0, 23735]
    }
  ]
}
```

Definitions of each field are as follows (If any defined field below is missing from the response, it simply means that the particular field is irrelevant to the request):

* `time`: **Date** → 最後更新時間
* `date`: **Number** → 資料所屬日期
* `mode`: **String** → [`mode`](#mode)
* `symbol.name.zh`: **String** → 中文簡稱
* `symbol.name.en`: **String** → 英文簡稱
* `symbol.id`: **String** → [`symbolId`](#symbolid) → [Appendix - `symbol.id`](#symbol.id)
* `symbol.industry`: **String** → 產業別 - [Appendix - `symbol.industry`](#symbol.industry)
* `symbol.category`: **String** → 證券別 - [Appendix - `symbol.category`](#symbol.category)
* `symbol.sme`: **Boolean** → 是否為中小企業
* `symbol.index`: **Boolean** → 是否為指數
* `symbol.informal`: **Boolean** → 是否為非指數和非證券 - e.g. 加權指數成交統計: `TSE_SEM_DEALT_1`
* `symbol.problem`: **String** → 暫停交易註記 - [Appendix - `symbol.problem`](#symbol.problem)
* `volume.total`: **Number** → 總成交量
* `volume.in`: **Number** → 總成交內盤量
* `volume.out`: **Number** → 總成交外盤量
* `price.ref`: **Number** → 參考價
* `price.up`: **Number** → 漲停價
* `price.down`: **Number** → 跌停價
* `price.open`: **Number** → 開盤價
* `price.close`: **Number** → 收盤價
* `price.highest`: **Number** → 最高價
* `price.lowest`: **Number** → 最低價
* `note.index`: **Boolean** → 是否為指數採樣樣本
* `note.abnormal.bool`: **Boolean** → 是否為異常
* `note.abnormal.status`: **String** → 異常代碼 - [Appendix - `note.abnormal.status`](#note.abnormal.status)
* `note.abnormal.intro`: **Boolean** → 是否為異常推介個股
* `note.abnormal.special`: **Boolean** → 是否為特殊異常證券
* `note.abnormal.since`: **Date** → 異常發生時間
* `note.ten`: **Boolean** → 是否為十元面額
* `note.day.buySell`: **Boolean** → 可否先買後賣
* `note.day.sellBuy`: **Boolean** → 可否先賣後買
* `note.short`: **Boolean** → 是否豁免平盤下融券賣出
* `note.lend`: **Boolean** → 是否豁免平盤下借券賣出
* `note.duration`: **Number** → 撮合循環秒數
* `warrant.price.exer`: **Number** → 權證履約價格
* `warrant.price.upper`: **Number** → 權證上限價格
* `warrant.price.lower`: **Number** → 權證下限價格
* `warrant.volume.ytd.exer`: **Number** → 權證前一營業日履約數量
* `warrant.volume.ytd.cancel`: **Number** → 權證前一營業日註銷數量
* `warrant.volume.bal`: **Number** → 權證發行餘額量
* `warrant.ratio`: **Number** → 權證行使比率
* `warrant.expiry`: **Date** → 權證到期日
* `warrant.symbol.name.zh`: **String** → 權證標的中文簡稱
* `warrant.symbol.name.en`: **String** → 權證標的英文簡稱
* `warrant.style`: **String** → 權證形式 - [Appendix - `warrant.style`](#warrant.style)
* `warrant.right`: **String** → 權證種類 - [Appendix - `warrant.right`](#warrant.right)
* `warrant.contract`: **String** → 權證類型 - [Appendix - `warrant.contract`](#warrant.contract)
* `other.foreign`: **Boolean** → 是否為外國股票
* `other.trade.unit`: **Number** → 交易單位
* `other.trade.currency`: **String** → 交易幣別
* `index.ref`: **Number** → 參考指數
* `index.open`: **Number** → 開盤指數
* `index.close`: **Number** → 收盤指數
* `index.highest`: **Number** → 最高指數
* `index.lowest`: **Number** → 最低指數
* `dealt.sum`: **Number** → 成交統計總額
* `dealt.lot`: **Number** → 成交統計數量
* `dealt.order`: **Number** → 成交統計筆數
* `buy5`: **[Number, Number][]** → 最佳買進五檔價量 - `[價, 量][]`
* `sell5`: **[Number, Number][]** → 最佳賣出五檔價量 - `[價, 量][]`
* `buy1Firms`: **[String, Number][]** → 最佳買進一檔推薦證券商代號與量 - `[證券商代號, 量][]`
* `sell1Firms`: **[String, Number][]** → 最佳賣出一檔推薦證券商代號與量 - `[證券商代號, 量][]`
* `tick.time`: **Date** → 最後成交時間
* `tick.status`: **String[]** → 最後成交狀態 - [Appendix - `tick.status`](#tick.status)
* `tick.value`: **[Number, Number]** → 最後成交價量 - `[價, 量]`
* `tick.total`: **[Number, Number]** → 最後成交總價總量 - `[總價, 總量]`
* `tick.serial`: **String** → 最後成交序號
* `tick.index`: **Number** → 最後成交指數
* `tick.dealt.sum`: **Number** → 最後成交總額
* `tick.dealt.lot`: **Number** → 最後成交數量
* `tick.dealt.order`: **Number** → 最後成交筆數
* `ticks`: **`tick`[]** → 所有於`date`成交的`tick`

**During trading hours, `ticks` will be in its most possibly updated condition at the time of request.**

## Socket.IO

With Socket.IO, you can get the newest and fastest possible in-place stock quote update of the `symbolId` you subscribed to, supported by the server push feature of Socket.IO. With this realtimeness, it is possible for you to plot a stock quote graph and have it updated in real time, or having a data model that can react as fast as possible with your investment strategy in real time.

In the meantime however, raw Socket.IO implementation is somewhat complicated and thus not recommended. Instead, we recommend you to try out our [libraries](#libraries) which solve this very issue.

# Libraries

We offer libraries in various programming languages, with JavaScript as the core implementation. If anyone of you seek to port the library into other unofficially supported languages, please refer to the JavaScript source code since it is the most updated one.

The main purpose of libraries is to solve the complexity of implementing Socket.IO, which results from differing strategies among exchanges in their implementation of updating stock quote.

**If the use case of yours is solely requesting REST APIs and not requiring realtime update feature of Socket.IO, please consider not using the libraries.**

## JavaScript

First, install [`fugle-realtime`](https://www.npmjs.com/package/fugle-realtime) from npm:

```bash
npm install fugle-realtime
```

Because the JavaScript library is bundled using the UMD format alongside ES6 module and TypeScript definition, that means out of the box, you can import it either using `<script>` tag, CommonJS-styled `require` or ES6-styled `import`, along with native TypeScript support if you are using TypeScript.

```js
// ES6 Module
import fugleRealtime from 'fugle-realtime';

// CommonJS
const fugleRealtime = require('fugle-realtime');
```

```html
<!-- "fugleRealtime" will be attached to the global window object. -->
<script src="https://unpkg.com/fugle-realtime"></script>
```

`fugle-realtime` is compatible with most modern browsers out of the box. For older browsers without `fetch` support, consider [polyfill](https://github.com/github/fetch).

For those who are using Node.js, install [`node-fetch`](https://www.npmjs.com/package/node-fetch):

```bash
npm install node-fetch
```

Then, initialize `fugle-realtime` with your API [`version`](#version) and `token` from [Authorization](#authorization):

```js
import fugleRealtime from 'fugle-realtime';
import nodeFetch from 'node-fetch'; // Node.js only

const { api, socket } = fugleRealtime({
  version: 'latest', // If absent, default to 'latest'
  token: 'fugle', // Required to gain access
  socketIo: true, // If set to false, Socket.IO will not be initialized
  fetch: nodeFetch, // Node.js only, polyfilling fetch
});
```

Under `api`, there are `versions`, `trading` and `daily`, which are just `Promise` wrapper functions corresponding to [`/versions`](#versions), [`/trading`](#trading) and [`/daily`](#daily) respectively. Each of these functions take an object as the first and sole argument, with their corresponding parameters as keys of the object literal.

```js
const { versions, trading, daily } = api;
daily({ symbolId: '2330', mode: 'tse-sem', date: 20180314 }).then(console.log).catch(console.error);

// Lazy way
api.daily({ symbolId: '2330' }).then(console.log).catch(console.error);
```

Under `socket` though, there are functions `join` and `leave`, as well as empty object `docs`:

```js
const { join, leave, docs } = socket;

console.log(docs); // {}

join({ symbolId: '2330' }, callback);
console.log(docs); // { 2330: { ... } }
join({ symbolId: '3008', mode: 'tse-sem' }, callback);
console.log(docs); // { 2330: { ... }, 3008: { ... } }

leave({ symbolId: '2330' });
console.log(docs); // { 3008: { ... } }
```

Both `socket.join` and `socket.leave` take the same argument of object literal as `api.daily` above, which are [`symbolId`](#symbolId) and [`mode`](#mode), except for `date` which just does not make sense here.

The callback function that you supplied to `socket.join` as the second parameter will be invoked every time an in-place update happens during trading hour. This is where the magic happens, you can do whatever you want with the callback function, such as redrawing graph or notifying users.

As seen in the sample code above, invoking `socket.join` with a particular [`symbolId`](#symbolid) will register it as a key in `socket.docs`, also leaving it with `socket.leave` will erase it from `socket.docs`.

The interface of those objects under `socket.docs` is always the same as seen in [`/daily`](#daily).

## Python

Coming soon...

## Swift

Coming soon...

# Contact Us

Coming Soon...

# License

[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)

# Appendix

## `symbol.id`

```json
{
  "tse-sem": {
    "index": { // 產業指數
      "TSE_SEM_INDEX_1": "加權指數",
      "TSE_SEM_INDEX_2": "不含金融指數",
      "TSE_SEM_INDEX_3": "不含電子指數",
      "TSE_SEM_INDEX_4": "化學工業",
      "TSE_SEM_INDEX_5": "生技醫療業",
      "TSE_SEM_INDEX_6": "水泥窯製",
      "TSE_SEM_INDEX_7": "食品",
      "TSE_SEM_INDEX_8": "塑膠化工",
      "TSE_SEM_INDEX_9": "紡織纖維",
      "TSE_SEM_INDEX_10": "機電",
      "TSE_SEM_INDEX_11": "造紙",
      "TSE_SEM_INDEX_12": "營造建材",
      "TSE_SEM_INDEX_13": "雜項",
      "TSE_SEM_INDEX_14": "金融保險",
      "TSE_SEM_INDEX_15": "水泥工業",
      "TSE_SEM_INDEX_16": "食品工業",
      "TSE_SEM_INDEX_17": "塑膠工業",
      "TSE_SEM_INDEX_18": "紡織纖維",
      "TSE_SEM_INDEX_19": "電機機械",
      "TSE_SEM_INDEX_20": "電器電纜",
      "TSE_SEM_INDEX_21": "化學生技醫療",
      "TSE_SEM_INDEX_22": "玻璃陶瓷",
      "TSE_SEM_INDEX_23": "造紙工業",
      "TSE_SEM_INDEX_24": "鋼鐵工業",
      "TSE_SEM_INDEX_25": "橡膠工業",
      "TSE_SEM_INDEX_26": "汽車工業",
      "TSE_SEM_INDEX_27": "電子工業",
      "TSE_SEM_INDEX_28": "建材營造",
      "TSE_SEM_INDEX_29": "航運業",
      "TSE_SEM_INDEX_30": "觀光事業",
      "TSE_SEM_INDEX_31": "金融保險",
      "TSE_SEM_INDEX_32": "貿易百貨",
      "TSE_SEM_INDEX_33": "其他",
      "TSE_SEM_INDEX_34": "未含金電股發行量加權股價指數",
      "TSE_SEM_INDEX_35": "油電燃氣業",
      "TSE_SEM_INDEX_36": "半導體業",
      "TSE_SEM_INDEX_37": "電腦及週邊設備業",
      "TSE_SEM_INDEX_38": "光電業",
      "TSE_SEM_INDEX_39": "通信網路業",
      "TSE_SEM_INDEX_40": "電子零組件業",
      "TSE_SEM_INDEX_41": "電子通路業",
      "TSE_SEM_INDEX_42": "資訊服務業",
      "TSE_SEM_INDEX_43": "其他電子業"
    },
    "dealt": { // 成交統計
      "TSE_SEM_DEALT_1": "整體市場",
      "TSE_SEM_DEALT_2": "基金",
      "TSE_SEM_DEALT_3": "股票",
      "TSE_SEM_DEALT_4": "認購權證",
      "TSE_SEM_DEALT_5": "認售權證"
    }
  },
  "tpex-otc": {
    "index": { // 產業指數
      "TPEX_OTC_INDEX_1": "櫃檯買賣發行量加權股價指數",
      "TPEX_OTC_INDEX_2": "電子工業類指數",
      "TPEX_OTC_INDEX_3": "食品工業類指數",
      "TPEX_OTC_INDEX_4": "塑膠工業類指數",
      "TPEX_OTC_INDEX_5": "紡織纖維類指數",
      "TPEX_OTC_INDEX_6": "電機機械類指數",
      "TPEX_OTC_INDEX_7": "電器電纜類指數",
      "TPEX_OTC_INDEX_8": "玻璃陶瓷類指數",
      "TPEX_OTC_INDEX_9": "鋼鐵工業類指數",
      "TPEX_OTC_INDEX_10": "橡膠工業類指數",
      "TPEX_OTC_INDEX_11": "建材營造類指數",
      "TPEX_OTC_INDEX_12": "航運業指數",
      "TPEX_OTC_INDEX_13": "觀光事業類指數",
      "TPEX_OTC_INDEX_14": "金融業指數",
      "TPEX_OTC_INDEX_15": "貿易百貨類指數",
      "TPEX_OTC_INDEX_16": "化學工業類指數",
      "TPEX_OTC_INDEX_17": "生技醫療類指數",
      "TPEX_OTC_INDEX_18": "油電燃氣業指數",
      "TPEX_OTC_INDEX_19": "半導體業指數",
      "TPEX_OTC_INDEX_20": "電腦及週邊設備業指數",
      "TPEX_OTC_INDEX_21": "光電業指數",
      "TPEX_OTC_INDEX_22": "通信網路業指數",
      "TPEX_OTC_INDEX_23": "電子零組件業指數",
      "TPEX_OTC_INDEX_24": "電子通路業指數",
      "TPEX_OTC_INDEX_25": "資訊服務業指數",
      "TPEX_OTC_INDEX_26": "文化創意業類指數",
      "TPEX_OTC_INDEX_27": "其他電子類指數",
      "TPEX_OTC_INDEX_28": "其他類指數"
    },
    "dealt": { // 成交統計
      "TPEX_OTC_DEALT_1": "整體市場",
      "TPEX_OTC_DEALT_2": "基金",
      "TPEX_OTC_DEALT_3": "股票",
      "TPEX_OTC_DEALT_4": "認購權證",
      "TPEX_OTC_DEALT_5": "認售權證"
    }
  }
}
```

## `symbol.industry`

```json
{
  "01": "水泥工業",
  "02": "食品工業",
  "03": "塑膠工業",
  "04": "紡織纖維",
  "05": "電機機械",
  "06": "電器電纜",
  "08": "玻璃陶瓷",
  "09": "造紙工業",
  "10": "鋼鐵工業",
  "11": "橡膠工業",
  "12": "汽車工業",
  "14": "建材營造",
  "15": "航運業",
  "16": "觀光事業",
  "17": "金融業",
  "18": "貿易百貨",
  "19": "綜合",
  "20": "其他",
  "21": "化學工業",
  "22": "生技醫療業",
  "23": "油電燃氣業",
  "24": "半導體業",
  "25": "電腦及週邊設備業",
  "26": "光電業",
  "27": "通信網路業",
  "28": "電子零組件業",
  "29": "電子通路業",
  "30": "資訊服務業",
  "31": "其他電子業",
  "32": "文化創意業",
  "33": "農業科技業",
  "34": "電子商務業",
  "80": "管理股票"
}
```

## `symbol.category`

```json
{
  "W1": "等比例發行認購權證",
  "W2": "不等比例發行認購權證",
  "W3": "等比例發行認售權證",
  "W4": "不等比例發行認售權證",
  "BS": "本國企業上市櫃屬證券股",
  "FB": "本國企業上市櫃屬銀行股",
  "": "其他本國企業上市櫃證券",
  "RR": "其它外國企業上市櫃證券",
  "RS": "外國企業上市櫃屬證券股",
  "RB": "外國企業上市櫃屬銀行股"
}
```

## `symbol.problem`

```json
{
  "terminated": "終止上市",
  "suspended": "暫停買賣", // 當日無法恢復交易
  "paused": "暫停交易", // 當日可能恢復交易
  "resumed": "恢復交易"
}
```

## `note.abnormal.status`

```json
{
  "tse-sem": {
    "0": "正常",
    "1": "注意",
    "2": "處置",
    "3": "注意及處置",
    "4": "再次處置",
    "5": "注意及再次處置",
    "6": "彈性處置",
    "7": "注意及彈性處置"
  },
  "tpex-otc": {
    "0": "正常",
    "1": "注意",
    "2": "處置",
    "3": "注意及處置",
    "4": "再次處置",
    "5": "注意及再次處置",
    "6": "彈性調整處置",
    "7": "注意及彈性調整處置"
  },
  "tpex-emg": {
    "1": "開始交易",
    "2": "暫停交易",
    "3": "恢復交易",
    "4": "終止交易"
  }
}
```

## `warrant.style`

```json
{
  "eu": "歐式",
  "us": "美式"
}
```

## `warrant.right`

```json
{
  "call": "認購",
  "put": "認售"
}
```

## `warrant.contract`

```json
{
  "normal": "一般型",
  "upper": "上限型認購權證",
  "lower": "下限型認售權證",
  "bull": "牛證【下限型認購權證】",
  "bear": "熊證【上限型認售權證】"
}
```

## `tick.status`

```json
{
  "down": "跌停成交",
  "up": "漲停成交",
  "downBuy": "跌停買進",
  "upBuy": "漲停買進",
  "downSell": "跌停賣出",
  "upSell": "漲停賣出",
  "pauseRise": "暫緩撮合且瞬間趨跌",
  "pauseDrop": "暫緩撮合且瞬間趨漲",
  // "trade": "一般揭示",
  "trial": "試算揭示",
  "delayOpen": "試算後延後開盤",
  "delayClose": "試算後延後收盤",
  // "call": "集合競價",
  // "continuous": "逐筆撮合",
  "open": "開盤",
  "close": "收盤",
  "buy": "投資人（委託）買進",
  "sell": "投資人（委託）賣出",
  "highest": "最高成交",
  "lowest": "最低成交",
  "in": "內盤成交",
  "out": "外盤成交"
}
```

**Currently, as long as `trial` is absent from `tick.status`, it implicitly means that `trade` is present.**
