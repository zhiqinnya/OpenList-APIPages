"use strict";

// node_modules/hono-edgeone-pages-adapter/esm/handler.js
var handle = (app2) => {
  return (context) => {
    return app2.fetch(context.request, {
      params: context.params
    });
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf(
    "/",
    url.charCodeAt(9) === 58 ? 13 : 8
  );
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param ? /\%/.test(param) ? tryDecodeURIComponent(param) : param : void 0;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  json() {
    return this.#cachedBody("json");
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var Context = class {
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  setLayout = (layout) => this.#layout = layout;
  getLayout = () => this.#layout;
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  redirect = (location, status) => {
    this.header("Location", String(location));
    return this.newResponse(null, status ?? 302);
  };
  notFound = () => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          if (!part) {
            continue;
          }
          const [key, name, matcher] = pattern;
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/utils/compress.js
var COMPRESSIBLE_CONTENT_TYPE_REGEX = /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i;

// node_modules/hono/dist/utils/filepath.js
var getFilePath = (options) => {
  let filename = options.filename;
  const defaultDocument = options.defaultDocument || "index.html";
  if (filename.endsWith("/")) {
    filename = filename.concat(defaultDocument);
  } else if (!filename.match(/\.[a-zA-Z0-9_-]+$/)) {
    filename = filename.concat("/" + defaultDocument);
  }
  const path = getFilePathWithoutDefaultDocument({
    root: options.root,
    filename
  });
  return path;
};
var getFilePathWithoutDefaultDocument = (options) => {
  let root = options.root || "";
  let filename = options.filename;
  if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
    return;
  }
  filename = filename.replace(/^\.?[\/\\]/, "");
  filename = filename.replace(/\\/, "/");
  root = root.replace(/\/$/, "");
  let path = root ? root + "/" + filename : filename;
  path = path.replace(/^\.?\//, "");
  if (root[0] !== "/" && path[0] === "/") {
    return;
  }
  return path;
};

// node_modules/hono/dist/utils/mime.js
var getMimeType = (filename, mimes = baseMimes) => {
  const regexp = /\.([a-zA-Z0-9]+?)$/;
  const match = filename.match(regexp);
  if (!match) {
    return;
  }
  let mimeType = mimes[match[1]];
  if (mimeType && mimeType.startsWith("text")) {
    mimeType += "; charset=utf-8";
  }
  return mimeType;
};
var _baseMimes = {
  aac: "audio/aac",
  avi: "video/x-msvideo",
  avif: "image/avif",
  av1: "video/av1",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  css: "text/css",
  csv: "text/csv",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gif: "image/gif",
  gz: "application/gzip",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  ics: "text/calendar",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  wasm: "application/wasm",
  webm: "video/webm",
  weba: "audio/webm",
  webmanifest: "application/manifest+json",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xml: "application/xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary"
};
var baseMimes = _baseMimes;

// node_modules/hono/dist/middleware/serve-static/index.js
var ENCODINGS = {
  br: ".br",
  zstd: ".zst",
  gzip: ".gz"
};
var ENCODINGS_ORDERED_KEYS = Object.keys(ENCODINGS);
var DEFAULT_DOCUMENT = "index.html";
var defaultPathResolve = (path) => path;
var serveStatic = (options) => {
  let isAbsoluteRoot = false;
  let root;
  if (options.root) {
    if (options.root.startsWith("/")) {
      isAbsoluteRoot = true;
      root = new URL(`file://${options.root}`).pathname;
    } else {
      root = options.root;
    }
  }
  return async (c, next) => {
    if (c.finalized) {
      await next();
      return;
    }
    let filename = options.path ?? decodeURI(c.req.path);
    filename = options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename;
    if (!filename.endsWith("/") && options.isDir) {
      const path2 = getFilePathWithoutDefaultDocument({
        filename,
        root
      });
      if (path2 && await options.isDir(path2)) {
        filename += "/";
      }
    }
    let path = getFilePath({
      filename,
      root,
      defaultDocument: DEFAULT_DOCUMENT
    });
    if (!path) {
      return await next();
    }
    if (isAbsoluteRoot) {
      path = "/" + path;
    }
    const getContent = options.getContent;
    const pathResolve = options.pathResolve ?? defaultPathResolve;
    path = pathResolve(path);
    let content = await getContent(path, c);
    if (!content) {
      let pathWithoutDefaultDocument = getFilePathWithoutDefaultDocument({
        filename,
        root
      });
      if (!pathWithoutDefaultDocument) {
        return await next();
      }
      pathWithoutDefaultDocument = pathResolve(pathWithoutDefaultDocument);
      if (pathWithoutDefaultDocument !== path) {
        content = await getContent(pathWithoutDefaultDocument, c);
        if (content) {
          path = pathWithoutDefaultDocument;
        }
      }
    }
    if (content instanceof Response) {
      return c.newResponse(content.body, content);
    }
    if (content) {
      const mimeType = options.mimes && getMimeType(path, options.mimes) || getMimeType(path);
      c.header("Content-Type", mimeType || "application/octet-stream");
      if (options.precompressed && (!mimeType || COMPRESSIBLE_CONTENT_TYPE_REGEX.test(mimeType))) {
        const acceptEncodingSet = new Set(
          c.req.header("Accept-Encoding")?.split(",").map((encoding) => encoding.trim())
        );
        for (const encoding of ENCODINGS_ORDERED_KEYS) {
          if (!acceptEncodingSet.has(encoding)) {
            continue;
          }
          const compressedContent = await getContent(path + ENCODINGS[encoding], c);
          if (compressedContent) {
            content = compressedContent;
            c.header("Content-Encoding", encoding);
            c.header("Vary", "Accept-Encoding", { append: true });
            break;
          }
        }
      }
      await options.onFound?.(path, c);
      return c.body(content);
    }
    await options.onNotFound?.(path, c);
    await next();
    return;
  };
};

// node_modules/hono/dist/adapter/cloudflare-workers/utils.js
var getContentFromKVAsset = async (path, options) => {
  let ASSET_MANIFEST;
  if (options && options.manifest) {
    if (typeof options.manifest === "string") {
      ASSET_MANIFEST = JSON.parse(options.manifest);
    } else {
      ASSET_MANIFEST = options.manifest;
    }
  } else {
    if (typeof __STATIC_CONTENT_MANIFEST === "string") {
      ASSET_MANIFEST = JSON.parse(__STATIC_CONTENT_MANIFEST);
    } else {
      ASSET_MANIFEST = __STATIC_CONTENT_MANIFEST;
    }
  }
  let ASSET_NAMESPACE;
  if (options && options.namespace) {
    ASSET_NAMESPACE = options.namespace;
  } else {
    ASSET_NAMESPACE = __STATIC_CONTENT;
  }
  const key = ASSET_MANIFEST[path] || path;
  if (!key) {
    return null;
  }
  const content = await ASSET_NAMESPACE.get(key, { type: "stream" });
  if (!content) {
    return null;
  }
  return content;
};

// node_modules/hono/dist/adapter/cloudflare-workers/serve-static.js
var serveStatic2 = (options) => {
  return async function serveStatic22(c, next) {
    const getContent = async (path) => {
      return getContentFromKVAsset(path, {
        manifest: options.manifest,
        namespace: options.namespace ? options.namespace : c.env ? c.env.__STATIC_CONTENT : void 0
      });
    };
    return serveStatic({
      ...options,
      getContent
    })(c, next);
  };
};

// node_modules/hono/dist/adapter/cloudflare-workers/serve-static-module.js
var module2 = (options) => {
  return serveStatic2(options);
};

// node_modules/hono/dist/helper/websocket/index.js
var WSContext = class {
  #init;
  constructor(init) {
    this.#init = init;
    this.raw = init.raw;
    this.url = init.url ? new URL(init.url) : null;
    this.protocol = init.protocol ?? null;
  }
  send(source, options) {
    this.#init.send(source, options ?? {});
  }
  raw;
  binaryType = "arraybuffer";
  get readyState() {
    return this.#init.readyState;
  }
  url;
  protocol;
  close(code, reason) {
    this.#init.close(code, reason);
  }
};
var defineWebSocketHelper = (handler) => {
  return (...args) => {
    if (typeof args[0] === "function") {
      const [createEvents, options] = args;
      return async function upgradeWebSocket2(c, next) {
        const events = await createEvents(c);
        const result = await handler(c, events, options);
        if (result) {
          return result;
        }
        await next();
      };
    } else {
      const [c, events, options] = args;
      return (async () => {
        const upgraded = await handler(c, events, options);
        if (!upgraded) {
          throw new Error("Failed to upgrade WebSocket");
        }
        return upgraded;
      })();
    }
  };
};

// node_modules/hono/dist/adapter/cloudflare-workers/websocket.js
var upgradeWebSocket = defineWebSocketHelper(async (c, events) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return;
  }
  const webSocketPair = new WebSocketPair();
  const client = webSocketPair[0];
  const server = webSocketPair[1];
  const wsContext = new WSContext({
    close: (code, reason) => server.close(code, reason),
    get protocol() {
      return server.protocol;
    },
    raw: server,
    get readyState() {
      return server.readyState;
    },
    url: server.url ? new URL(server.url) : null,
    send: (source) => server.send(source)
  });
  if (events.onClose) {
    server.addEventListener("close", (evt) => events.onClose?.(evt, wsContext));
  }
  if (events.onMessage) {
    server.addEventListener("message", (evt) => events.onMessage?.(evt, wsContext));
  }
  if (events.onError) {
    server.addEventListener("error", (evt) => events.onError?.(evt, wsContext));
  }
  server.accept?.();
  return new Response(null, {
    status: 101,
    webSocket: client
  });
});

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = (cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = decodeURIComponent_(cookieValue);
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) {
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) {
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
};
var setCookie = (c, name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = serialize(name, value, { path: "/", ...opt });
  }
  c.header("Set-Cookie", cookie, { append: true });
};
var deleteCookie = (c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
};

// src/shares/secrets.ts
function encodeCallbackData(data) {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  return btoa(String.fromCharCode(...bytes));
}

// src/shares/message.ts
function showErr(error, client_uid, client_key) {
  const message_err = "\u6388\u6743\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5:\n1\u3001\u5E94\u7528ID\u548C\u5E94\u7528\u673A\u5BC6\u662F\u5426\u6B63\u786E\n2\u3001\u767B\u5F55\u8D26\u53F7\u662F\u5426\u5177\u6709\u5E94\u7528\u6743\u9650\n3\u3001\u56DE\u8C03\u5730\u5740\u662F\u5426\u5305\u62EC\u4E0A\u9762\u5730\u5740\n\u9519\u8BEF\u4FE1\u606F: " + error;
  const callbackData = {
    message_err,
    client_uid,
    client_key
  };
  return "/#" + encodeCallbackData(callbackData);
}

// src/shares/configs.ts
function getInfo(c) {
  const client_uid = c.req.query("client_uid");
  const client_key = c.req.query("client_key");
  const secret_key = c.req.query("secret_key");
  const driver_txt = c.req.query("driver_txt");
  const server_use = c.req.query("server_use");
  if (!server_use || server_use === "false") {
    if (!driver_txt || !client_key)
      return void 0;
  }
  return {
    app_uid: client_uid === void 0 ? "" : client_uid,
    app_key: client_key === void 0 ? "" : client_key,
    secrets: secret_key === void 0 ? "" : secret_key,
    drivers: driver_txt === void 0 ? "" : driver_txt,
    servers: !server_use ? false : server_use == "true"
  };
}

// src/shares/refresh.ts
async function pubRenew(c, APIUrl, Params, Method = "GET", access_name = "access_token", refresh_name = "refresh_token", error_name = "error_description") {
  const parma_str = new URLSearchParams(Params).toString();
  const parma_url = new URL(APIUrl);
  Object.keys(Params).forEach((key) => {
    parma_url.searchParams.append(key, Params[key]);
  });
  try {
    const header_data = { "Content-Type": "application/x-www-form-urlencoded" };
    const result_data = await fetch(
      Method == "GET" ? parma_url.href : APIUrl,
      {
        method: Method,
        body: Method == "GET" ? void 0 : parma_str,
        headers: Method == "GET" ? void 0 : header_data
      }
    );
    const result_json = await result_data.json();
    if (getDynamicValue(result_json, refresh_name, Params.refresh_token))
      return c.json({
        refresh_token: getDynamicValue(result_json, refresh_name, Params.refresh_token),
        access_token: getDynamicValue(result_json, access_name, "")
      }, 200);
    return c.json({ text: result_json[error_name] }, 500);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
function getDynamicValue(resultJson, path, origin_text) {
  if (path === "none") return "";
  if (path === "copy") return origin_text;
  const properties = path.split(".");
  let currentValue = resultJson;
  for (const prop of properties) {
    if (currentValue && typeof currentValue === "object" && prop in currentValue) {
      currentValue = currentValue[prop];
    } else {
      return void 0;
    }
  }
  return currentValue;
}

// src/driver/onedrive_oa.ts
var driver_map = {
  "onedrive_pr": [
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.com/common/oauth2/v2.0/token"
  ],
  "onedrive_go": [
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "https://login.microsoftonline.com/common/oauth2/v2.0/token"
  ],
  "onedrive_cn": [
    "https://login.chinacloudapi.cn/common/oauth2/v2.0/authorize",
    "https://login.chinacloudapi.cn/common/oauth2/token"
  ],
  "onedrive_de": [
    "https://login.microsoftonline.de/common/oauth2/v2.0/authorize",
    "https://graph.microsoft.de/common/oauth2/v2.0/token"
  ],
  "onedrive_us": [
    "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
    "https://graph.microsoft.us/common/oauth2/v2.0/token"
  ]
};
async function oneLogin(c) {
  const client_uid = c.req.query("client_uid");
  const client_key = c.req.query("client_key");
  const driver_txt = c.req.query("driver_txt");
  const server_use = c.req.query("server_use");
  if (server_use == "false") {
    if (!driver_txt || !client_uid || !client_key)
      return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
  }
  const scopes_all = "offline_access Files.ReadWrite.All";
  const client_url = driver_map[driver_txt][0];
  const redirector = "https://" + c.env.MAIN_URLS + "/onedrive/callback";
  const params_all = {
    client_id: server_use == "true" ? c.env.onedrive_uid : client_uid,
    scope: scopes_all,
    response_type: "code",
    redirect_uri: redirector
  };
  const urlWithParams = new URL(client_url);
  Object.keys(params_all).forEach((key) => {
    urlWithParams.searchParams.append(key, params_all[key]);
  });
  try {
    const response = await fetch(urlWithParams.href, {
      method: "GET"
    });
    if (server_use == "false") {
      setCookie(c, "client_uid", client_uid);
      setCookie(c, "client_key", client_key);
    }
    setCookie(c, "driver_txt", driver_txt);
    setCookie(c, "server_use", server_use);
    return c.json({ text: response.url }, 200);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
async function oneToken(c) {
  let login_data, client_uid, client_key, driver_txt, client_url, server_use, params_all;
  try {
    login_data = c.req.query("code");
    server_use = getCookie(c, "server_use");
    driver_txt = getCookie(c, "driver_txt");
    client_uid = client_key = "";
    if (server_use == "false") {
      client_uid = getCookie(c, "client_uid");
      client_key = getCookie(c, "client_key");
    }
    client_url = driver_map[driver_txt][1];
    params_all = {
      client_id: server_use == "true" ? c.env.onedrive_uid : client_uid,
      client_secret: server_use == "true" ? c.env.onedrive_key : client_key,
      redirect_uri: "https://" + c.env.MAIN_URLS + "/onedrive/callback",
      code: login_data,
      grant_type: "authorization_code"
    };
  } catch (error) {
    return c.redirect(showErr("\u53C2\u6570\u9519\u8BEF", "", ""));
  }
  if (server_use == "true") {
    client_uid = "";
    client_key = "";
  }
  try {
    const paramsString = new URLSearchParams(params_all).toString();
    const response = await fetch(client_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: paramsString
    });
    if (server_use == "false") {
      deleteCookie(c, "client_uid");
      deleteCookie(c, "client_key");
    }
    deleteCookie(c, "driver_txt");
    deleteCookie(c, "server_use");
    if (!response.ok)
      return c.redirect(showErr("\u8BF7\u6C42\u5931\u8D25", client_uid, client_key));
    const json = await response.json();
    if (json.token_type === "Bearer") {
      const callbackData = {
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        client_uid,
        client_key,
        driver_txt,
        server_use
      };
      return c.redirect("/#" + encodeCallbackData(callbackData));
    }
  } catch (error) {
    return c.redirect(showErr(error, client_uid, client_key));
  }
}
async function genToken(c) {
  const driver_txt = c.req.query("driver_txt");
  const clients_info = getInfo(c);
  const refresh_text = c.req.query("refresh_ui");
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params = {
    client_id: clients_info.servers ? c.env.onedrive_uid : clients_info.app_uid,
    client_secret: clients_info.servers ? c.env.onedrive_key : clients_info.app_key,
    redirect_uri: "https://" + c.env.MAIN_URLS + "/onedrive/callback",
    grant_type: "refresh_token",
    refresh_token: refresh_text
  };
  return await pubRenew(c, driver_map[driver_txt][1], params, "POST");
}

// src/driver/alicloud_oa.ts
var driver_map2 = [
  "https://openapi.aliyundrive.com/oauth/authorize/qrcode",
  "https://openapi.aliyundrive.com/oauth/access_token",
  "https://openapi.aliyundrive.com/oauth/qrcode"
];
async function alyLogin(c) {
  try {
    const client_uid = c.req.query("client_uid");
    const client_key = c.req.query("client_key");
    const driver_txt = c.req.query("driver_txt");
    const server_use = c.req.query("server_use");
    if (server_use == "false" && (!driver_txt || !client_uid || !client_key))
      return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
    const req = {
      client_id: server_use == "true" ? c.env.alicloud_uid : client_uid,
      client_secret: server_use == "true" ? c.env.alicloud_key : client_key,
      scopes: ["user:base", "file:all:read", "file:all:write"]
    };
    const response = await fetch(driver_map2[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (!response.ok) {
      const error = await response.json();
      return c.json({ text: `${error.code}: ${error.message}` }, 403);
    }
    setCookie(c, "driver_txt", driver_txt);
    setCookie(c, "server_use", server_use);
    const data = await response.json();
    return c.json({
      "text": data.qrCodeUrl,
      "sid": data.sid
    }, 200);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
async function alyToken(c) {
  let server_use = getCookie(c, "server_use");
  const req = {
    client_id: server_use == "true" ? c.env.alicloud_uid : c.req.query("client_id"),
    client_secret: server_use == "true" ? c.env.alicloud_key : c.req.query("client_secret"),
    grant_type: c.req.query("grant_type"),
    code: c.req.query("code"),
    refresh_token: c.req.query("refresh_token")
  };
  if (req.grant_type !== "authorization_code" && req.grant_type !== "refresh_token")
    return c.json({ text: "Incorrect GrantType" }, 400);
  if (req.grant_type === "authorization_code" && !req.code)
    return c.json({ text: "Code missed" }, 400);
  if (req.grant_type === "refresh_token" && req.refresh_token.split(".").length !== 3)
    return c.json({ text: "Incorrect refresh_token or missed" }, 400);
  if (req.grant_type === "authorization_code") {
    let code_urls = "https://openapi.aliyundrive.com/oauth/qrcode/" + req.code + "/status";
    let auth_post = await fetch(code_urls, { method: "GET" });
    let code_data = await auth_post.json();
    if (!auth_post.ok || code_data.status !== "LoginSuccess") {
      return c.json({ text: "Login failed:" + code_data.status }, 401);
    }
    req.code = code_data.authCode;
  }
  deleteCookie(c, "driver_txt");
  deleteCookie(c, "server_use");
  try {
    const response = await fetch(driver_map2[1], {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req)
    });
    if (!response.ok) {
      const error = await response.json();
      return c.json({ text: `${error.code}: ${error.message}` }, 403);
    }
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    return c.json(
      { text: error },
      500
    );
  }
}
async function genToken2(c) {
  const clients_info = getInfo(c);
  const refresh_text = c.req.query("refresh_ui");
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params = {
    client_id: clients_info.servers ? c.env.alicloud_uid : clients_info.app_uid,
    client_secret: clients_info.servers ? c.env.alicloud_key : clients_info.app_key,
    grant_type: "refresh_token",
    refresh_token: refresh_text
  };
  return await pubRenew(
    c,
    driver_map2[1],
    params,
    "POST",
    "access_token",
    "refresh_token",
    "message"
  );
}

// src/driver/alicloud_qr.ts
var AlipanQRLogin = class {
  session_id;
  csrf_token;
  umid_token;
  qr_code_data = null;
  access_token = null;
  refresh_token = null;
  constructor() {
    this.session_id = this.generateUUID();
    this.csrf_token = "MuSysYVxW5AMGblcOTSKb3";
    this.umid_token = this.generateUUID().replace(/-/g, "");
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "Referer": "https://passport.alipan.com/",
      "Origin": "https://passport.alipan.com"
    };
  }
  // 获取OAuth认证URL
  async getOAuthUrl() {
    try {
      const authUrl = "https://auth.alipan.com/v2/oauth/authorize";
      const params = new URLSearchParams({
        "client_id": "25dzX3vbYqktVxyX",
        "redirect_uri": "https://www.alipan.com/sign/callback",
        "response_type": "code",
        "login_type": "custom",
        "state": '{"origin":"https://www.alipan.com"}'
      });
      const response = await fetch(`${authUrl}?${params}`, {
        method: "GET",
        headers: this.getHeaders()
      });
      if (response.ok) {
        return response.url;
      }
      return null;
    } catch (error) {
      console.error("\u83B7\u53D6OAuth URL\u5931\u8D25:", error);
      return null;
    }
  }
  // 获取登录页面信息
  async getLoginPage() {
    try {
      const loginUrl = "https://passport.alipan.com/mini_login.htm";
      const params = new URLSearchParams({
        "lang": "zh_cn",
        "appName": "aliyun_drive",
        "appEntrance": "web_default",
        "styleType": "auto",
        "bizParams": "",
        "notLoadSsoView": "false",
        "notKeepLogin": "false",
        "isMobile": "false",
        "ad__pass__q__rememberLogin": "true",
        "ad__pass__q__rememberLoginDefaultValue": "true",
        "ad__pass__q__forgotPassword": "true",
        "ad__pass__q__licenseMargin": "true",
        "ad__pass__q__loginType": "normal",
        "hidePhoneCode": "true",
        "rnd": Date.now().toString()
      });
      const response = await fetch(`${loginUrl}?${params}`, {
        method: "GET",
        headers: this.getHeaders()
      });
      if (response.ok) {
        const content = await response.text();
        const csrfMatch = content.match(/_csrf_token["']?\s*[:=]\s*["']([^"']+)["']/);
        if (csrfMatch) {
          this.csrf_token = csrfMatch[1];
        }
        const umidMatch = content.match(/umidToken["']?\s*[:=]\s*["']([^"']+)["']/);
        if (umidMatch) {
          this.umid_token = umidMatch[1];
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("\u83B7\u53D6\u767B\u5F55\u9875\u9762\u5931\u8D25:", error);
      return false;
    }
  }
  // 生成二维码
  async generateQRCode() {
    try {
      const qrUrl = "https://passport.alipan.com/newlogin/qrcode/generate.do";
      const params = new URLSearchParams({
        "appName": "aliyun_drive",
        "fromSite": "52",
        "appEntrance": "web_default",
        "_csrf_token": this.csrf_token,
        "umidToken": this.umid_token,
        "hsiz": "115d9f5f2cf2f87850a93a793aaaecb4",
        "bizParams": "taobaoBizLoginFrom=web_default&renderRefer=https%3A%2F%2Fauth.alipan.com%2F",
        "mainPage": "false",
        "isMobile": "false",
        "lang": "zh_CN",
        "returnUrl": "",
        "umidTag": "SERVER"
      });
      const headers = {
        ...this.getHeaders(),
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      };
      const response = await fetch(`${qrUrl}?${params}`, {
        method: "GET",
        headers
      });
      if (response.ok) {
        const result = await response.json();
        if (!result.hasError) {
          const content = result.content || {};
          if (content.success) {
            const data = content.data || {};
            const codeContent = data.codeContent;
            if (codeContent) {
              this.qr_code_data = {
                qrCodeUrl: codeContent,
                ck: data.ck,
                t: data.t,
                resultCode: data.resultCode,
                processFinished: data.processFinished
              };
              return this.qr_code_data;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error("\u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25:", error);
      return null;
    }
  }
  // 查询二维码状态
  async queryQRStatus() {
    try {
      if (!this.qr_code_data) {
        return null;
      }
      const queryUrl = "https://passport.alipan.com/newlogin/qrcode/query.do";
      const formData = new URLSearchParams({
        "appName": "aliyun_drive",
        "fromSite": "52"
      });
      if (this.qr_code_data.ck) {
        formData.append("ck", this.qr_code_data.ck);
      }
      if (this.qr_code_data.t) {
        formData.append("t", this.qr_code_data.t);
      }
      const headers = {
        ...this.getHeaders(),
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      };
      const response = await fetch(queryUrl, {
        method: "POST",
        headers,
        body: formData
      });
      if (response.ok) {
        const result = await response.json();
        if (!result.hasError) {
          const content = result.content || {};
          if (content.success) {
            const data = content.data || {};
            const apiQrStatus = data.qrCodeStatus || "NEW";
            const resultCode = data.resultCode || 0;
            const statusMapping = {
              "NEW": "WAITING",
              "SCANED": "SCANED",
              "CONFIRMED": "CONFIRMED",
              "EXPIRED": "EXPIRED"
            };
            const qrCodeStatus = statusMapping[apiQrStatus] || "WAITING";
            return {
              success: true,
              content: {
                qrCodeStatus,
                resultCode,
                bizExt: data.bizExt || {},
                data
              }
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error("\u67E5\u8BE2\u4E8C\u7EF4\u7801\u72B6\u6001\u5931\u8D25:", error);
      return null;
    }
  }
  // 获取访问令牌
  async getAccessToken(bizExt) {
    try {
      let decodedBizExt;
      if (typeof bizExt === "string") {
        try {
          const decodedString = atob(bizExt);
          decodedBizExt = JSON.parse(decodedString);
        } catch (decodeError) {
          console.error("\u89E3\u7801 bizExt \u5931\u8D25:", decodeError);
          return null;
        }
      } else {
        decodedBizExt = bizExt;
      }
      if (!decodedBizExt || !decodedBizExt.pds_login_result) {
        return null;
      }
      const loginResult = decodedBizExt.pds_login_result;
      this.access_token = loginResult.accessToken;
      this.refresh_token = loginResult.refreshToken;
      return this.access_token;
    } catch (error) {
      console.error("\u83B7\u53D6\u8BBF\u95EE\u4EE4\u724C\u5931\u8D25:", error);
      return null;
    }
  }
  // 获取用户信息
  async getUserInfo() {
    try {
      if (!this.access_token) {
        return null;
      }
      const userUrl = "https://user.aliyundrive.com/v2/user/get";
      const headers = {
        "Authorization": `Bearer ${this.access_token}`,
        "Content-Type": "application/json"
      };
      const response = await fetch(userUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25:", error);
      return null;
    }
  }
  // 获取网盘信息
  async getDriveInfo() {
    try {
      if (!this.access_token) {
        return null;
      }
      const driveUrl = "https://api.aliyundrive.com/adrive/v1/user/driveCapacityDetails";
      const headers = {
        "Authorization": `Bearer ${this.access_token}`,
        "Content-Type": "application/json"
      };
      const response = await fetch(driveUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("\u83B7\u53D6\u7F51\u76D8\u4FE1\u606F\u5931\u8D25:", error);
      return null;
    }
  }
  // 检查是否已登录
  isLoggedIn() {
    return !!this.access_token;
  }
  // 获取访问令牌（用于返回给前端）
  getToken() {
    return this.access_token;
  }
  // 获取刷新令牌
  getRefreshToken() {
    return this.refresh_token;
  }
};
var loginSessions = /* @__PURE__ */ new Map();
var SESSION_TIMEOUT = 30 * 60 * 1e3;
function generateSecureSessionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, sessionData] of loginSessions.entries()) {
    if (now - sessionData.lastAccess > SESSION_TIMEOUT) {
      loginSessions.delete(sessionId);
    }
  }
}
function getOrCreateSession(sessionId, clientFingerprint) {
  const now = Date.now();
  if (sessionId && loginSessions.has(sessionId)) {
    const sessionData = loginSessions.get(sessionId);
    if (now - sessionData.lastAccess > SESSION_TIMEOUT) {
      loginSessions.delete(sessionId);
    } else {
      sessionData.lastAccess = now;
      return { sessionId, sessionData };
    }
  }
  const newSessionId = generateSecureSessionId();
  const newSessionData = {
    instance: new AlipanQRLogin(),
    createdAt: now,
    lastAccess: now,
    clientFingerprint
  };
  loginSessions.set(newSessionId, newSessionData);
  return { sessionId: newSessionId, sessionData: newSessionData };
}
function validateSessionOwnership(sessionId, clientFingerprint) {
  const sessionData = loginSessions.get(sessionId);
  if (!sessionData) return false;
  if (sessionData.clientFingerprint && clientFingerprint) {
    return sessionData.clientFingerprint === clientFingerprint;
  }
  return true;
}
async function generateQR(c) {
  try {
    cleanupExpiredSessions();
    const requestedSessionId = c.req.query("session_id");
    const clientFingerprint = c.req.header("X-Client-Fingerprint") || c.req.header("User-Agent");
    const { sessionId, sessionData } = getOrCreateSession(requestedSessionId, clientFingerprint);
    const alipan = sessionData.instance;
    const oauthUrl = await alipan.getOAuthUrl();
    if (!oauthUrl) {
      return c.json({ error: "\u83B7\u53D6OAuth URL\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5" }, 500);
    }
    const loginPageResult = await alipan.getLoginPage();
    if (!loginPageResult) {
      return c.json({ error: "\u83B7\u53D6\u767B\u5F55\u9875\u9762\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5" }, 500);
    }
    const qrData = await alipan.generateQRCode();
    if (!qrData) {
      return c.json({ error: "\u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25\uFF0C\u53EF\u80FD\u662F\u7F51\u7EDC\u95EE\u9898\u6216API\u53D8\u5316\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" }, 500);
    }
    return c.json({
      success: true,
      session_id: sessionId,
      qr_code_url: qrData.qrCodeUrl,
      message: "\u4E8C\u7EF4\u7801\u751F\u6210\u6210\u529F\uFF0C\u8BF7\u4F7F\u7528\u963F\u91CC\u4E91\u76D8App\u626B\u7801\u767B\u5F55",
      expires_in: SESSION_TIMEOUT / 1e3
      // 返回过期时间（秒）
    });
  } catch (error) {
    console.error("\u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25:", error);
    return c.json({ error: "\u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25" }, 500);
  }
}
async function checkLogin(c) {
  try {
    const sessionId = c.req.query("session_id");
    if (!sessionId) {
      return c.json({ error: "\u7F3A\u5C11session_id\u53C2\u6570" }, 400);
    }
    const clientFingerprint = c.req.header("X-Client-Fingerprint") || c.req.header("User-Agent");
    if (!validateSessionOwnership(sessionId, clientFingerprint)) {
      return c.json({ error: "\u4F1A\u8BDD\u9A8C\u8BC1\u5931\u8D25" }, 403);
    }
    const sessionData = loginSessions.get(sessionId);
    if (!sessionData) {
      return c.json({ error: "\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F" }, 404);
    }
    sessionData.lastAccess = Date.now();
    const alipan = sessionData.instance;
    const statusResult = await alipan.queryQRStatus();
    if (!statusResult) {
      return c.json({ error: "\u67E5\u8BE2\u767B\u5F55\u72B6\u6001\u5931\u8D25" }, 500);
    }
    const status = statusResult.content.qrCodeStatus;
    if (status === "CONFIRMED") {
      const accessToken = await alipan.getAccessToken(statusResult.content.bizExt);
      if (accessToken) {
        return c.json({
          success: true,
          status: "CONFIRMED",
          message: "\u767B\u5F55\u6210\u529F",
          access_token: accessToken
        });
      }
    }
    const statusMessages = {
      "WAITING": "\u7B49\u5F85\u626B\u63CF",
      "SCANED": "\u5DF2\u626B\u63CF\uFF0C\u7B49\u5F85\u786E\u8BA4",
      "CONFIRMED": "\u767B\u5F55\u6210\u529F",
      "EXPIRED": "\u4E8C\u7EF4\u7801\u5DF2\u8FC7\u671F"
    };
    return c.json({
      success: true,
      status,
      message: statusMessages[status] || "\u672A\u77E5\u72B6\u6001"
    });
  } catch (error) {
    console.error("\u68C0\u67E5\u767B\u5F55\u72B6\u6001\u5931\u8D25:", error);
    return c.json({ error: "\u68C0\u67E5\u767B\u5F55\u72B6\u6001\u5931\u8D25" }, 500);
  }
}
async function getUserInfo(c) {
  try {
    const sessionId = c.req.query("session_id");
    if (!sessionId) {
      return c.json({ error: "\u7F3A\u5C11session_id\u53C2\u6570" }, 400);
    }
    const clientFingerprint = c.req.header("X-Client-Fingerprint") || c.req.header("User-Agent");
    if (!validateSessionOwnership(sessionId, clientFingerprint)) {
      return c.json({ error: "\u4F1A\u8BDD\u9A8C\u8BC1\u5931\u8D25" }, 403);
    }
    const sessionData = loginSessions.get(sessionId);
    if (!sessionData) {
      return c.json({ error: "\u4F1A\u8BDD\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F" }, 404);
    }
    sessionData.lastAccess = Date.now();
    const alipan = sessionData.instance;
    if (!alipan.isLoggedIn()) {
      return c.json({ error: "\u7528\u6237\u5C1A\u672A\u767B\u5F55\u6210\u529F\uFF0C\u8BF7\u5148\u5B8C\u6210\u626B\u7801\u767B\u5F55" }, 400);
    }
    const userInfo = await alipan.getUserInfo();
    if (!userInfo) {
      return c.json({ error: "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25\uFF0C\u53EF\u80FD\u662Ftoken\u5DF2\u8FC7\u671F" }, 500);
    }
    const driveInfo = await alipan.getDriveInfo();
    return c.json({
      success: true,
      user_info: userInfo,
      drive_info: driveInfo,
      access_token: alipan.getToken(),
      refresh_token: alipan.getRefreshToken()
    });
  } catch (error) {
    console.error("\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25:", error);
    return c.json({ error: "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25" }, 500);
  }
}
async function logout(c) {
  try {
    const sessionId = c.req.query("session_id");
    if (!sessionId) {
      return c.json({ error: "\u7F3A\u5C11session_id\u53C2\u6570" }, 400);
    }
    const clientFingerprint = c.req.header("X-Client-Fingerprint") || c.req.header("User-Agent");
    if (!validateSessionOwnership(sessionId, clientFingerprint)) {
      return c.json({ error: "\u4F1A\u8BDD\u9A8C\u8BC1\u5931\u8D25" }, 403);
    }
    const deleted = loginSessions.delete(sessionId);
    return c.json({
      success: true,
      message: "\u9000\u51FA\u767B\u5F55\u6210\u529F"
    });
  } catch (error) {
    console.error("\u9000\u51FA\u767B\u5F55\u5931\u8D25:", error);
    return c.json({ error: "\u9000\u51FA\u767B\u5F55\u5931\u8D25" }, 500);
  }
}
async function genToken3(c) {
  const refresh_text = c.req.query("refresh_ui");
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params = {
    grant_type: "refresh_token",
    refresh_token: refresh_text
  };
  const post_url = "https://openapi.aliyundrive.com/oauth/access_token";
  return await pubRenew(
    c,
    post_url,
    params,
    "POST",
    "access_token",
    "refresh_token",
    "message"
  );
}

// src/driver/115cloud_oa.ts
var driver_map3 = [
  "https://passportapi.115.com/open/authorize",
  "https://passportapi.115.com/open/authCodeToToken",
  "https://passportapi.115.com/open/refreshToken"
];
async function oneLogin2(c) {
  const client_uid = c.req.query("client_uid");
  const client_key = c.req.query("client_key");
  const driver_txt = c.req.query("driver_txt");
  const server_use = c.req.query("server_use");
  if (server_use == "false" && (!driver_txt || !client_uid || !client_key))
    return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
  const random_key = getRandomString(64);
  const params_all = {
    client_id: server_use == "true" ? c.env.cloud115_uid : client_uid,
    state: random_key,
    response_type: "code",
    redirect_uri: "https://" + c.env.MAIN_URLS + "/115cloud/callback"
  };
  const urlWithParams = new URL(driver_map3[0]);
  Object.keys(params_all).forEach((key) => {
    urlWithParams.searchParams.append(key, params_all[key]);
  });
  try {
    const response = await fetch(urlWithParams.href, { method: "GET" });
    if (server_use == "false") {
      setCookie(c, "client_uid", client_uid);
      setCookie(c, "client_key", client_key);
    }
    setCookie(c, "driver_txt", driver_txt);
    setCookie(c, "random_key", random_key);
    setCookie(c, "server_use", server_use);
    return c.json({ text: response.url }, 200);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
async function oneToken2(c) {
  let login_data, client_uid, client_key, random_key, client_url;
  let server_use, params_all, random_uid, driver_txt;
  try {
    login_data = c.req.query("code");
    random_uid = c.req.query("state");
    server_use = getCookie(c, "server_use");
    random_key = getCookie(c, "random_key");
    driver_txt = getCookie(c, "driver_txt");
    if (server_use == "false") {
      client_uid = getCookie(c, "client_uid");
      client_key = getCookie(c, "client_key");
      if (!random_uid || !random_key || random_uid !== random_key || !driver_txt || !login_data || !client_uid || !client_key)
        return c.redirect(showErr("Cookie\u65E0\u6548", "", ""));
    }
    client_url = driver_map3[1];
    params_all = {
      client_id: server_use == "true" ? c.env.cloud115_uid : client_uid,
      client_secret: server_use == "true" ? c.env.cloud115_key : client_key,
      redirect_uri: "https://" + c.env.MAIN_URLS + "/115cloud/callback",
      code: login_data,
      grant_type: "authorization_code"
    };
  } catch (error) {
    return c.redirect(showErr(error, "", ""));
  }
  if (server_use == "true") {
    client_uid = "";
    client_key = "";
  }
  try {
    const paramsString = new URLSearchParams(params_all).toString();
    const response = await fetch(client_url, {
      method: "POST",
      body: paramsString,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    if (server_use == "false") {
      deleteCookie(c, "client_uid");
      deleteCookie(c, "client_key");
    }
    deleteCookie(c, "random_key");
    deleteCookie(c, "driver_txt");
    deleteCookie(c, "server_use");
    let json = await response.json();
    if (json.state == 1) {
      const callbackData = {
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
        client_uid,
        client_key,
        driver_txt,
        server_use
      };
      return c.redirect("/#" + encodeCallbackData(callbackData));
    }
    return c.redirect(showErr(json.message, client_uid, client_key));
  } catch (error) {
    return c.redirect(showErr(error, client_uid, client_key));
  }
}
async function genToken4(c) {
  const refresh_text = c.req.query("refresh_ui");
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params = {
    refresh_token: refresh_text
  };
  return await pubRenew(
    c,
    driver_map3[2],
    params,
    "POST",
    "data.access_token",
    "data.refresh_token",
    "error"
  );
}
function getRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// src/shares/request.ts
async function Requests(c, Params, APIUrl = "/api/login", Method = "GET", Direct = false) {
  const parma_str = new URLSearchParams(Params).toString();
  const parma_url = new URL(APIUrl);
  Object.keys(Params).forEach((key) => {
    parma_url.searchParams.append(key, Params[key]);
  });
  try {
    const header_data = { "Content-Type": "application/x-www-form-urlencoded" };
    if (Direct) return { url: Method == "GET" ? parma_url.href : APIUrl };
    const result_data = await fetch(
      Method == "GET" ? parma_url.href : APIUrl,
      {
        method: Method,
        body: Method == "GET" ? void 0 : parma_str,
        headers: Method == "GET" ? void 0 : header_data
      }
    );
    return await result_data.json();
  } catch (error) {
    return { text: error };
  }
}
function setCookie2(c, client_info) {
  setCookie(c, "driver_txt", client_info.drivers ? client_info.drivers : "");
  setCookie(c, "server_use", client_info.servers ? client_info.servers.toString() : "");
  if (!client_info.servers) {
    setCookie(c, "client_uid", client_info.app_uid ? client_info.app_uid : "");
    setCookie(c, "client_key", client_info.app_key ? client_info.app_key : "");
  }
}
function getCookie2(c) {
  return {
    app_uid: getCookie(c, "client_uid"),
    app_key: getCookie(c, "client_key"),
    secrets: getCookie(c, "secret_key"),
    drivers: getCookie(c, "driver_txt"),
    servers: getCookie(c, "server_use") == "true"
  };
}

// src/shares/oauthv2.ts
async function pubLogin(c, Params, APIUrl = "/api/login", Direct = false, Method = "GET", Finder = "url") {
  const result_json = await Requests(c, Params, APIUrl, Method, Direct);
  if (result_json.text) return c.json(result_json, 500);
  if (Direct) return c.json({ text: result_json.url }, 200);
  if (result_json[Finder]) return c.json({ text: result_json[Finder] }, 200);
  return c.json("Error login POST", 500);
}

// src/driver/123cloud_oa.ts
var driver_map4 = [
  "https://open-api.123pan.com/api/v1/access_token",
  "https://open-api.123pan.com/api/v1/access_token"
];
async function oneLogin3(c) {
  const clients_info = getInfo(c);
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  const params_info = {
    client_id: clients_info.app_uid,
    clientSecret: clients_info.app_uid
  };
  if (!clients_info.servers)
    setCookie2(c, clients_info);
  return await pubLogin(c, params_info, driver_map4[0], true);
  const client_uid = c.req.query("client_uid");
  const client_key = c.req.query("client_key");
  const driver_txt = c.req.query("driver_txt");
  const server_use = c.req.query("server_use");
  if (server_use == "false" && (!driver_txt || !client_uid || !client_key))
    return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
  const params_all = {};
  try {
    const paramsString = new URLSearchParams(params_all).toString();
    const response = await fetch(driver_map4[0], {
      method: "POST",
      body: paramsString,
      headers: {
        "Platform": "open_platform",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const json = await response.json();
    setCookie(c, "driver_txt", driver_txt);
    return c.json({ text: json.data.accessToken }, 200);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
async function oneToken3(c) {
  return await oneLogin3(c);
}
async function genToken5(c) {
  return c.json({ text: "\u6B64\u7F51\u76D8\u4E0D\u652F\u6301" }, 500);
}

// src/driver/baiduyun_oa.ts
var driver_map5 = [
  "https://openapi.baidu.com/oauth/2.0/authorize",
  "https://openapi.baidu.com/oauth/2.0/token"
];
async function oneLogin4(c) {
  const client_key = c.req.query("client_key");
  const secret_key = c.req.query("secret_key");
  const driver_txt = c.req.query("driver_txt");
  const server_use = c.req.query("server_use");
  const redirector = "https://" + c.env.MAIN_URLS + "/baiduyun/callback";
  if (server_use == "false") {
    if (!driver_txt || !client_key || !secret_key)
      return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
  }
  const params_all = {
    client_id: server_use == "true" ? c.env.baiduyun_key : client_key,
    scope: "basic,netdisk",
    response_type: "code",
    redirect_uri: driver_txt === "baiduyun_ob" ? "oob" : redirector
  };
  const urlWithParams = new URL(driver_map5[0]);
  Object.keys(params_all).forEach((key) => {
    urlWithParams.searchParams.append(key, params_all[key]);
  });
  try {
    const response = await fetch(urlWithParams.href, {
      method: "GET"
    });
    if (server_use == "false") {
      setCookie(c, "client_key", client_key);
      setCookie(c, "secret_key", secret_key);
    }
    setCookie(c, "driver_txt", driver_txt);
    setCookie(c, "server_use", server_use);
    return c.json({ text: response.url }, 200);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
async function oneToken4(c) {
  let login_data, client_key, secret_key, client_url, server_oob;
  let driver_txt, server_use, params_all;
  const redirector = "https://" + c.env.MAIN_URLS + "/baiduyun/callback";
  try {
    server_oob = c.req.query("server_oob");
    login_data = c.req.query("code");
    client_key = secret_key = "";
    server_use = getCookie(c, "server_use");
    driver_txt = getCookie(c, "driver_txt");
    if (server_oob && server_oob == "true") {
      client_key = c.req.query("client_key");
      secret_key = c.req.query("secret_key");
      server_use = "false";
    } else if (server_use == "false") {
      client_key = getCookie(c, "client_key");
      secret_key = getCookie(c, "secret_key");
      if (!login_data || !client_key || !secret_key)
        return c.redirect(showErr("Cookie\u7F3A\u5C11", "", ""));
    }
    client_url = driver_map5[1];
    params_all = {
      client_id: server_use == "true" ? c.env.baiduyun_key : client_key,
      client_secret: server_use == "true" ? c.env.baiduyun_ext : secret_key,
      code: login_data,
      grant_type: "authorization_code",
      redirect_uri: server_oob && server_oob == "true" ? "oob" : redirector
    };
  } catch (error) {
    return c.redirect(showErr(error, "", ""));
  }
  if (server_use == "true") {
    client_key = "";
    secret_key = "";
  }
  try {
    const urlWithParams = new URL(client_url);
    Object.keys(params_all).forEach((key) => {
      urlWithParams.searchParams.append(key, params_all[key]);
    });
    const response = await fetch(urlWithParams, { method: "GET" });
    if (server_use == "false") {
      deleteCookie(c, "client_key");
      deleteCookie(c, "secret_key");
    }
    deleteCookie(c, "driver_txt");
    deleteCookie(c, "server_use");
    const json = await response.json();
    if (response.ok) {
      const callbackData = {
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        client_key,
        secret_key,
        driver_txt
      };
      return c.redirect("/#" + encodeCallbackData(callbackData));
    }
    return c.redirect(showErr(json.error_description, "", client_key));
  } catch (error) {
    return c.redirect(showErr(error, "", client_key));
  }
}
async function genToken6(c) {
  const clients_info = getInfo(c);
  const refresh_text = c.req.query("refresh_ui");
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params = {
    client_id: clients_info.servers ? c.env.baiduyun_key : clients_info.app_key,
    client_secret: clients_info.servers ? c.env.baiduyun_ext : clients_info.secrets,
    grant_type: "refresh_token",
    refresh_token: refresh_text
  };
  return await pubRenew(c, driver_map5[1], params, "GET");
}

// src/driver/googleui_oa.ts
var driver_map6 = [
  "https://accounts.google.com/o/oauth2/v2/auth",
  "https://oauth2.googleapis.com/token"
];
async function oneLogin5(c) {
  const client_uid = c.req.query("client_uid");
  const client_key = c.req.query("client_key");
  const driver_txt = c.req.query("driver_txt");
  const server_use = c.req.query("server_use");
  if (server_use == "false" && (!driver_txt || !client_uid || !client_key))
    return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
  const random_key = getRandomString2(32);
  const params_all = {
    "client_id": server_use == "true" ? c.env.googleui_uid : client_uid,
    "redirect_uri": "https://" + c.env.MAIN_URLS + "/googleui/callback",
    "scope": "https://www.googleapis.com/auth/drive",
    "response_type": "code",
    "state": random_key,
    "access_type": "offline",
    "prompt": "consent"
  };
  if (server_use == "false") {
    setCookie(c, "client_uid", client_uid);
    setCookie(c, "client_key", client_key);
  }
  setCookie(c, "driver_txt", driver_txt);
  setCookie(c, "random_key", random_key);
  setCookie(c, "server_use", server_use);
  const urlWithParams = new URL(driver_map6[0]);
  Object.keys(params_all).forEach((key) => {
    urlWithParams.searchParams.append(key, params_all[key]);
  });
  try {
    return c.json({ text: urlWithParams }, 200);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
async function oneToken5(c) {
  let login_data, client_uid, client_key, random_key, server_use;
  let driver_txt, params_all, random_uid;
  try {
    login_data = c.req.query("code");
    random_uid = c.req.query("state");
    server_use = getCookie(c, "server_use");
    driver_txt = getCookie(c, "driver_txt");
    random_key = getCookie(c, "random_key");
    client_uid = client_key = "";
    if (server_use == "false") {
      client_uid = getCookie(c, "client_uid");
      client_key = getCookie(c, "client_key");
      if (!client_uid || !client_key || random_uid !== random_key || !client_uid || !client_key)
        return c.redirect(showErr("Cookie\u65E0\u6548", "", ""));
    }
    driver_txt = getCookie(c, "driver_txt");
    params_all = {
      "client_id": server_use == "true" ? c.env.googleui_uid : client_uid,
      "client_secret": server_use == "true" ? c.env.googleui_key : client_key,
      "code": login_data,
      "grant_type": "authorization_code",
      "redirect_uri": "https://" + c.env.MAIN_URLS + "/googleui/callback"
    };
  } catch (error) {
    return c.redirect(showErr(error, "", ""));
  }
  if (server_use == "true") {
    client_uid = "";
    client_key = "";
  }
  try {
    const paramsString = new URLSearchParams(params_all).toString();
    const response = await fetch(driver_map6[1], {
      method: "POST",
      body: paramsString,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    if (server_use == "false") {
      deleteCookie(c, "client_uid");
      deleteCookie(c, "client_key");
    }
    deleteCookie(c, "random_key");
    deleteCookie(c, "driver_txt");
    deleteCookie(c, "server_use");
    let json = await response.json();
    if (json.token_type == "Bearer") {
      const callbackData = {
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        client_uid,
        client_key,
        driver_txt,
        server_use
      };
      return c.redirect("/#" + encodeCallbackData(callbackData));
    }
    return c.redirect(showErr(json.message, client_uid, client_key));
  } catch (error) {
    return c.redirect(showErr(error, client_uid, client_key));
  }
}
function getRandomString2(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
async function genToken7(c) {
  const clients_info = getInfo(c);
  const refresh_text = c.req.query("refresh_ui");
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params = {
    client_id: clients_info.servers ? c.env.googleui_uid : clients_info.app_uid,
    client_secret: clients_info.servers ? c.env.googleui_key : clients_info.app_key,
    grant_type: "refresh_token",
    refresh_token: refresh_text
  };
  return await pubRenew(c, driver_map6[1], params, "POST", "access_token", "copy", "none");
}

// src/driver/yandexui_oa.ts
async function yandexLogin(c) {
  const env = c.env;
  let client_uid = c.req.query("client_uid");
  let client_key = c.req.query("client_key");
  let server_use = c.req.query("server_use");
  if (!server_use)
    return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
  if (!client_uid || !client_key) {
    if (server_use == "false")
      return c.json({ text: "\u53C2\u6570\u7F3A\u5C11" }, 500);
  }
  client_uid = client_key = "";
  const params_all = {
    response_type: "code",
    client_id: server_use == "true" ? env.yandexui_uid : client_uid
  };
  if (server_use == "false") {
    setCookie(c, "client_uid", client_uid);
    setCookie(c, "client_key", client_key);
  }
  setCookie(c, "server_use", server_use);
  const urlWithParams = new URL("https://oauth.yandex.com/authorize");
  Object.keys(params_all).forEach((key) => {
    urlWithParams.searchParams.append(key, params_all[key]);
  });
  try {
    return c.json({ text: urlWithParams.href }, 200);
  } catch (error) {
    return c.json({ text: error }, 500);
  }
}
async function yandexCallBack(c) {
  let client_uid, client_key;
  const env = c.env;
  const code = c.req.query("code");
  const error = c.req.query("error");
  const server_use = getCookie(c, "server_use");
  if (server_use && server_use == "true") {
    client_uid = getCookie(c, "client_uid");
    client_key = getCookie(c, "client_key");
  }
  const error_description = c.req.query("error_description");
  const getToken = async () => {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", server_use == "true" ? env.yandexui_uid : env.client_uid);
    params.append("client_secret", server_use == "true" ? env.yandexui_key : env.client_key);
    params.append("code", code);
    const resp = await fetch("https://oauth.yandex.com/token", {
      method: "POST",
      body: params
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    return await resp.json();
  };
  if (error) {
    return c.redirect(showErr(error_description || error, "", ""));
  }
  if (!code) {
    return c.redirect(showErr("Authorization code missing", "", ""));
  }
  try {
    const token = await getToken();
    if (!token.error && token.access_token) {
      const server_use2 = getCookie(c, "server_use");
      const client_uid2 = getCookie(c, "client_uid");
      const client_key2 = getCookie(c, "client_key");
      deleteCookie(c, "server_use");
      deleteCookie(c, "client_uid");
      deleteCookie(c, "client_key");
      const callbackData = {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        client_uid: client_uid2,
        client_key: client_key2,
        driver_txt: "yandexui_go",
        server_use: server_use2
      };
      return c.redirect("/#" + encodeCallbackData(callbackData));
    } else {
      return c.redirect(showErr(token.error_description || token.error || "Token request failed", "", ""));
    }
  } catch (error2) {
    console.error("Token request error:", error2);
    return c.redirect(showErr("Failed to get access token", "", ""));
  }
}
async function genToken8(c) {
  const clients_info = getInfo(c);
  const refresh_text = c.req.query("refresh_ui");
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params = {
    grant_type: "refresh_token",
    refresh_token: refresh_text,
    client_id: clients_info.servers ? c.env.alicloud_uid : clients_info.app_uid,
    client_secret: clients_info.servers ? c.env.alicloud_key : clients_info.app_key
  };
  return await pubRenew(
    c,
    "https://oauth.yandex.com/token",
    params,
    "POST",
    "data.access_token",
    "data.refresh_token",
    "error"
  );
}

// src/shares/urlback.ts
async function pubParse(c, Client, Params, APIUrl = "/api/login", Method = "GET", error_name = "error_description", access_name = "access_token", refresh_name = "refresh_token") {
  const result_json = await Requests(c, Params, APIUrl, Method);
  let result_data = {
    access_token: "",
    message_err: "",
    refresh_token: "",
    client_uid: Client.app_uid,
    client_key: Client.app_key,
    secret_key: Client.secrets,
    driver_txt: Client.drivers,
    server_use: Client.servers ? "true" : "false"
  };
  if (result_json[error_name]) result_data.message_err = result_json[error_name];
  if (result_json[access_name] || result_json[refresh_name]) {
    result_data.access_token = result_json[access_name] ? result_json[access_name] : "";
    result_data.refresh_token = result_json[refresh_name] ? result_json[refresh_name] : "";
  }
  return c.redirect("/#" + encodeCallbackData(result_data));
}

// src/driver/dropboxs_oa.ts
var driver_map7 = [
  "https://www.dropbox.com/oauth2/authorize",
  "https://api.dropboxapi.com/oauth2/token"
];
async function getLogin(c) {
  const clients_info = getInfo(c);
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  const params_info = {
    client_id: clients_info.servers ? c.env.dropboxs_uid : clients_info.app_uid,
    response_type: "code",
    token_access_type: "offline",
    redirect_uri: "https://" + c.env.MAIN_URLS + "/dropboxs/callback"
  };
  if (!clients_info.servers)
    setCookie2(c, clients_info);
  return await pubLogin(c, params_info, driver_map7[0], true);
}
async function urlParse(c) {
  const clients_info = getCookie2(c);
  const login_data = c.req.query("code");
  if (!clients_info.app_uid) return c.json({ text: "Cookie\u7F3A\u5C11" }, 500);
  if (!clients_info.app_uid) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  const params_info = {
    client_id: clients_info.servers ? c.env.dropboxs_uid : clients_info.app_uid,
    client_secret: clients_info.servers ? c.env.dropboxs_key : clients_info.app_key,
    grant_type: "authorization_code",
    code: login_data,
    redirect_uri: "https://" + c.env.MAIN_URLS + "/dropboxs/callback"
  };
  return await pubParse(c, clients_info, params_info, driver_map7[1], "POST");
}
async function apiRenew(c) {
  const refresh_text = c.req.query("refresh_ui");
  const clients_info = getInfo(c);
  if (!clients_info) return c.json({ text: "\u4F20\u5165\u53C2\u6570\u7F3A\u5C11" }, 500);
  if (!refresh_text) return c.json({ text: "\u7F3A\u5C11\u5237\u65B0\u4EE4\u724C" }, 500);
  const params_info = {
    client_id: clients_info.servers ? c.env.dropboxs_uid : clients_info.app_uid,
    client_secret: clients_info.servers ? c.env.dropboxs_key : clients_info.app_key,
    grant_type: "refresh_token",
    refresh_token: refresh_text
  };
  return await pubRenew(c, driver_map7[1], params_info, "POST", "access_token", "copy");
}

// src/index.ts
var app = new Hono2();
app.use("*", module2({ manifest, root: "./" }));
app.get("/dropboxs/requests", async (c) => {
  return getLogin(c);
});
app.get("/dropboxs/callback", async (c) => {
  return urlParse(c);
});
app.get("/dropboxs/renewapi", async (c) => {
  return apiRenew(c);
});
app.get("/onedrive/requests", async (c) => {
  return oneLogin(c);
});
app.get("/onedrive/callback", async (c) => {
  return oneToken(c);
});
app.get("/onedrive/renewapi", async (c) => {
  return genToken(c);
});
app.get("/alicloud/requests", async (c) => {
  return alyLogin(c);
});
app.get("/alicloud/callback", async (c) => {
  return alyToken(c);
});
app.get("/alicloud/renewapi", async (c) => {
  return genToken2(c);
});
app.get("/alicloud2/generate_qr", async (c) => {
  return generateQR(c);
});
app.get("/alicloud2/check_login", async (c) => {
  return checkLogin(c);
});
app.get("/alicloud2/renewapi", async (c) => {
  return genToken3(c);
});
app.get("/alicloud2/get_user_info", async (c) => {
  return getUserInfo(c);
});
app.get("/alicloud2/logout", async (c) => {
  return logout(c);
});
app.get("/baiduyun/requests", async (c) => {
  return oneLogin4(c);
});
app.get("/baiduyun/callback", async (c) => {
  return oneToken4(c);
});
app.get("/baiduyun/renewapi", async (c) => {
  return genToken6(c);
});
app.get("/115cloud/requests", async (c) => {
  return oneLogin2(c);
});
app.get("/115cloud/callback", async (c) => {
  return oneToken2(c);
});
app.get("/115cloud/renewapi", async (c) => {
  return genToken4(c);
});
app.get("/123cloud/requests", async (c) => {
  return oneLogin3(c);
});
app.get("/123cloud/callback", async (c) => {
  return oneToken3(c);
});
app.get("/123cloud/renewapi", async (c) => {
  return genToken5(c);
});
app.get("/googleui/requests", async (c) => {
  return oneLogin5(c);
});
app.get("/googleui/callback", async (c) => {
  return oneToken5(c);
});
app.get("/googleui/renewapi", async (c) => {
  return genToken7(c);
});
app.get("/yandexui/requests", async (c) => {
  return yandexLogin(c);
});
app.get("/yandexui/callback", async (c) => {
  return yandexCallBack(c);
});
app.get("/yandexui/renewapi", async (c) => {
  return genToken8(c);
});

// src/eoapp.ts
var onRequest = handle(app);
