//#region \0rolldown/runtime.js
var e = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), t = /* @__PURE__ */ e(((e) => {
	function t(e, t) {
		var n = e.length;
		e.push(t);
		a: for (; 0 < n;) {
			var r = n - 1 >>> 1, a = e[r];
			if (0 < i(a, t)) e[r] = t, e[n] = a, n = r;
			else break a;
		}
	}
	function n(e) {
		return e.length === 0 ? null : e[0];
	}
	function r(e) {
		if (e.length === 0) return null;
		var t = e[0], n = e.pop();
		if (n !== t) {
			e[0] = n;
			a: for (var r = 0, a = e.length, o = a >>> 1; r < o;) {
				var s = 2 * (r + 1) - 1, c = e[s], l = s + 1, u = e[l];
				if (0 > i(c, n)) l < a && 0 > i(u, c) ? (e[r] = u, e[l] = n, r = l) : (e[r] = c, e[s] = n, r = s);
				else if (l < a && 0 > i(u, n)) e[r] = u, e[l] = n, r = l;
				else break a;
			}
		}
		return t;
	}
	function i(e, t) {
		var n = e.sortIndex - t.sortIndex;
		return n === 0 ? e.id - t.id : n;
	}
	if (e.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
		var a = performance;
		e.unstable_now = function() {
			return a.now();
		};
	} else {
		var o = Date, s = o.now();
		e.unstable_now = function() {
			return o.now() - s;
		};
	}
	var c = [], l = [], u = 1, d = null, f = 3, p = !1, m = !1, h = !1, g = !1, _ = typeof setTimeout == "function" ? setTimeout : null, v = typeof clearTimeout == "function" ? clearTimeout : null, y = typeof setImmediate < "u" ? setImmediate : null;
	function b(e) {
		for (var i = n(l); i !== null;) {
			if (i.callback === null) r(l);
			else if (i.startTime <= e) r(l), i.sortIndex = i.expirationTime, t(c, i);
			else break;
			i = n(l);
		}
	}
	function x(e) {
		if (h = !1, b(e), !m) {
			if (n(c) !== null) m = !0, S || (S = !0, O());
			else {
				var t = n(l);
				t !== null && A(x, t.startTime - e);
			}
		}
	}
	var S = !1, C = -1, w = 5, T = -1;
	function E() {
		return g ? !0 : !(e.unstable_now() - T < w);
	}
	function D() {
		if (g = !1, S) {
			var t = e.unstable_now();
			T = t;
			var i = !0;
			try {
				a: {
					m = !1, h && (h = !1, v(C), C = -1), p = !0;
					var a = f;
					try {
						b: {
							for (b(t), d = n(c); d !== null && !(d.expirationTime > t && E());) {
								var o = d.callback;
								if (typeof o == "function") {
									d.callback = null, f = d.priorityLevel;
									var s = o(d.expirationTime <= t);
									if (t = e.unstable_now(), typeof s == "function") {
										d.callback = s, b(t), i = !0;
										break b;
									}
									d === n(c) && r(c), b(t);
								} else r(c);
								d = n(c);
							}
							if (d !== null) i = !0;
							else {
								var u = n(l);
								u !== null && A(x, u.startTime - t), i = !1;
							}
						}
						break a;
					} finally {
						d = null, f = a, p = !1;
					}
					i = void 0;
				}
			} finally {
				i ? O() : S = !1;
			}
		}
	}
	var O;
	if (typeof y == "function") O = function() {
		y(D);
	};
	else if (typeof MessageChannel < "u") {
		var ee = new MessageChannel(), k = ee.port2;
		ee.port1.onmessage = D, O = function() {
			k.postMessage(null);
		};
	} else O = function() {
		_(D, 0);
	};
	function A(t, n) {
		C = _(function() {
			t(e.unstable_now());
		}, n);
	}
	e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(e) {
		e.callback = null;
	}, e.unstable_forceFrameRate = function(e) {
		0 > e || 125 < e ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : w = 0 < e ? Math.floor(1e3 / e) : 5;
	}, e.unstable_getCurrentPriorityLevel = function() {
		return f;
	}, e.unstable_next = function(e) {
		switch (f) {
			case 1:
			case 2:
			case 3:
				var t = 3;
				break;
			default: t = f;
		}
		var n = f;
		f = t;
		try {
			return e();
		} finally {
			f = n;
		}
	}, e.unstable_requestPaint = function() {
		g = !0;
	}, e.unstable_runWithPriority = function(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: e = 3;
		}
		var n = f;
		f = e;
		try {
			return t();
		} finally {
			f = n;
		}
	}, e.unstable_scheduleCallback = function(r, i, a) {
		var o = e.unstable_now();
		switch (typeof a == "object" && a ? (a = a.delay, a = typeof a == "number" && 0 < a ? o + a : o) : a = o, r) {
			case 1:
				var s = -1;
				break;
			case 2:
				s = 250;
				break;
			case 5:
				s = 1073741823;
				break;
			case 4:
				s = 1e4;
				break;
			default: s = 5e3;
		}
		return s = a + s, r = {
			id: u++,
			callback: i,
			priorityLevel: r,
			startTime: a,
			expirationTime: s,
			sortIndex: -1
		}, a > o ? (r.sortIndex = a, t(l, r), n(c) === null && r === n(l) && (h ? (v(C), C = -1) : h = !0, A(x, a - o))) : (r.sortIndex = s, t(c, r), m || p || (m = !0, S || (S = !0, O()))), r;
	}, e.unstable_shouldYield = E, e.unstable_wrapCallback = function(e) {
		var t = f;
		return function() {
			var n = f;
			f = t;
			try {
				return e.apply(this, arguments);
			} finally {
				f = n;
			}
		};
	};
})), n = /* @__PURE__ */ e(((e, n) => {
	n.exports = t();
})), r = /* @__PURE__ */ e(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.portal"), r = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), o = Symbol.for("react.consumer"), s = Symbol.for("react.context"), c = Symbol.for("react.forward_ref"), l = Symbol.for("react.suspense"), u = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), f = Symbol.for("react.activity"), p = Symbol.for("react.view_transition"), m = Symbol.iterator;
	function h(e) {
		return typeof e != "object" || !e ? null : (e = m && e[m] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var g = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	}, _ = Object.assign, v = {};
	function y(e, t, n) {
		this.props = e, this.context = t, this.refs = v, this.updater = n || g;
	}
	y.prototype.isReactComponent = {}, y.prototype.setState = function(e, t) {
		if (typeof e != "object" && typeof e != "function" && e != null) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, e, t, "setState");
	}, y.prototype.forceUpdate = function(e) {
		this.updater.enqueueForceUpdate(this, e, "forceUpdate");
	};
	function b() {}
	b.prototype = y.prototype;
	function x(e, t, n) {
		this.props = e, this.context = t, this.refs = v, this.updater = n || g;
	}
	var S = x.prototype = new b();
	S.constructor = x, _(S, y.prototype), S.isPureReactComponent = !0;
	var C = Array.isArray;
	function w() {}
	var T = {
		H: null,
		A: null,
		T: null,
		S: null
	}, E = Object.prototype.hasOwnProperty;
	function D(e, n, r) {
		var i = r.ref;
		return {
			$$typeof: t,
			type: e,
			key: n,
			ref: i === void 0 ? null : i,
			props: r
		};
	}
	function O(e, t) {
		return D(e.type, t, e.props);
	}
	function ee(e) {
		return typeof e == "object" && !!e && e.$$typeof === t;
	}
	function k(e) {
		var t = {
			"=": "=0",
			":": "=2"
		};
		return "$" + e.replace(/[=:]/g, function(e) {
			return t[e];
		});
	}
	var A = /\/+/g;
	function j(e, t) {
		return typeof e == "object" && e && e.key != null ? k("" + e.key) : t.toString(36);
	}
	function M(e) {
		switch (e.status) {
			case "fulfilled": return e.value;
			case "rejected": throw e.reason;
			default: switch (typeof e.status == "string" ? e.then(w, w) : (e.status = "pending", e.then(function(t) {
				e.status === "pending" && (e.status = "fulfilled", e.value = t);
			}, function(t) {
				e.status === "pending" && (e.status = "rejected", e.reason = t);
			})), e.status) {
				case "fulfilled": return e.value;
				case "rejected": throw e.reason;
			}
		}
		throw e;
	}
	function te(e, r, i, a, o) {
		var s = typeof e;
		(s === "undefined" || s === "boolean") && (e = null);
		var c = !1;
		if (e === null) c = !0;
		else switch (s) {
			case "bigint":
			case "string":
			case "number":
				c = !0;
				break;
			case "object": switch (e.$$typeof) {
				case t:
				case n:
					c = !0;
					break;
				case d: return c = e._init, te(c(e._payload), r, i, a, o);
			}
		}
		if (c) return o = o(e), c = a === "" ? "." + j(e, 0) : a, C(o) ? (i = "", c != null && (i = c.replace(A, "$&/") + "/"), te(o, r, i, "", function(e) {
			return e;
		})) : o != null && (ee(o) && (o = O(o, i + (o.key == null || e && e.key === o.key ? "" : ("" + o.key).replace(A, "$&/") + "/") + c)), r.push(o)), 1;
		c = 0;
		var l = a === "" ? "." : a + ":";
		if (C(e)) for (var u = 0; u < e.length; u++) a = e[u], s = l + j(a, u), c += te(a, r, i, s, o);
		else if (u = h(e), typeof u == "function") for (e = u.call(e), u = 0; !(a = e.next()).done;) a = a.value, s = l + j(a, u++), c += te(a, r, i, s, o);
		else if (s === "object") {
			if (typeof e.then == "function") return te(M(e), r, i, a, o);
			throw r = String(e), Error("Objects are not valid as a React child (found: " + (r === "[object Object]" ? "object with keys {" + Object.keys(e).join(", ") + "}" : r) + "). If you meant to render a collection of children, use an array instead.");
		}
		return c;
	}
	function N(e, t, n) {
		if (e == null) return e;
		var r = [], i = 0;
		return te(e, r, "", "", function(e) {
			return t.call(n, e, i++);
		}), r;
	}
	function ne(e) {
		if (e._status === -1) {
			var t = e._result, n = t();
			n.then(function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 1, e._result = t, n.status === void 0 && (n.status = "fulfilled", n.value = t));
			}, function(t) {
				(e._status === 0 || e._status === -1) && (e._status = 2, e._result = t, n.status === void 0 && (n.status = "rejected", n.reason = t));
			}), e._status === -1 && (e._status = 0, e._result = n);
		}
		if (e._status === 1) return e._result.default;
		throw e._result;
	}
	var re = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	};
	function ie(e) {
		var t = T.T, n = {};
		n.types = t === null ? null : t.types, T.T = n;
		try {
			var r = e(), i = T.S;
			i !== null && i(n, r), typeof r == "object" && r && typeof r.then == "function" && r.then(w, re);
		} catch (e) {
			re(e);
		} finally {
			t !== null && n.types !== null && (t.types = n.types), T.T = t;
		}
	}
	function ae(e) {
		var t = T.T;
		if (t !== null) {
			var n = t.types;
			n === null ? t.types = [e] : n.indexOf(e) === -1 && n.push(e);
		} else ie(ae.bind(null, e));
	}
	var oe = {
		map: N,
		forEach: function(e, t, n) {
			N(e, function() {
				t.apply(this, arguments);
			}, n);
		},
		count: function(e) {
			var t = 0;
			return N(e, function() {
				t++;
			}), t;
		},
		toArray: function(e) {
			return N(e, function(e) {
				return e;
			}) || [];
		},
		only: function(e) {
			if (!ee(e)) throw Error("React.Children.only expected to receive a single React element child.");
			return e;
		}
	};
	e.Activity = f, e.Children = oe, e.Component = y, e.Fragment = r, e.Profiler = a, e.PureComponent = x, e.StrictMode = i, e.Suspense = l, e.ViewTransition = p, e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = T, e.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(e) {
			return T.H.useMemoCache(e);
		}
	}, e.addTransitionType = ae, e.cache = function(e) {
		return function() {
			return e.apply(null, arguments);
		};
	}, e.cacheSignal = function() {
		return null;
	}, e.cloneElement = function(e, t, n) {
		if (e == null) throw Error("The argument must be a React element, but you passed " + e + ".");
		var r = _({}, e.props), i = e.key;
		if (t != null) for (a in t.key !== void 0 && (i = "" + t.key), t) !E.call(t, a) || a === "key" || a === "__self" || a === "__source" || a === "ref" && t.ref === void 0 || (r[a] = t[a]);
		var a = arguments.length - 2;
		if (a === 1) r.children = n;
		else if (1 < a) {
			for (var o = Array(a), s = 0; s < a; s++) o[s] = arguments[s + 2];
			r.children = o;
		}
		return D(e.type, i, r);
	}, e.createContext = function(e) {
		return e = {
			$$typeof: s,
			_currentValue: e,
			_currentValue2: e,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		}, e.Provider = e, e.Consumer = {
			$$typeof: o,
			_context: e
		}, e;
	}, e.createElement = function(e, t, n) {
		var r, i = {}, a = null;
		if (t != null) for (r in t.key !== void 0 && (a = "" + t.key), t) E.call(t, r) && r !== "key" && r !== "__self" && r !== "__source" && (i[r] = t[r]);
		var o = arguments.length - 2;
		if (o === 1) i.children = n;
		else if (1 < o) {
			for (var s = Array(o), c = 0; c < o; c++) s[c] = arguments[c + 2];
			i.children = s;
		}
		if (e && e.defaultProps) for (r in o = e.defaultProps, o) i[r] === void 0 && (i[r] = o[r]);
		return D(e, a, i);
	}, e.createRef = function() {
		return { current: null };
	}, e.forwardRef = function(e) {
		return {
			$$typeof: c,
			render: e
		};
	}, e.isValidElement = ee, e.lazy = function(e) {
		return {
			$$typeof: d,
			_payload: {
				_status: -1,
				_result: e
			},
			_init: ne
		};
	}, e.memo = function(e, t) {
		return {
			$$typeof: u,
			type: e,
			compare: t === void 0 ? null : t
		};
	}, e.startTransition = ie, e.unstable_useCacheRefresh = function() {
		return T.H.useCacheRefresh();
	}, e.use = function(e) {
		return T.H.use(e);
	}, e.useActionState = function(e, t, n) {
		return T.H.useActionState(e, t, n);
	}, e.useCallback = function(e, t) {
		return T.H.useCallback(e, t);
	}, e.useContext = function(e) {
		return T.H.useContext(e);
	}, e.useDebugValue = function() {}, e.useDeferredValue = function(e, t) {
		return T.H.useDeferredValue(e, t);
	}, e.useEffect = function(e, t) {
		return T.H.useEffect(e, t);
	}, e.useEffectEvent = function(e) {
		return T.H.useEffectEvent(e);
	}, e.useId = function() {
		return T.H.useId();
	}, e.useImperativeHandle = function(e, t, n) {
		return T.H.useImperativeHandle(e, t, n);
	}, e.useInsertionEffect = function(e, t) {
		return T.H.useInsertionEffect(e, t);
	}, e.useLayoutEffect = function(e, t) {
		return T.H.useLayoutEffect(e, t);
	}, e.useMemo = function(e, t) {
		return T.H.useMemo(e, t);
	}, e.useOptimistic = function(e, t) {
		return T.H.useOptimistic(e, t);
	}, e.useReducer = function(e, t, n) {
		return T.H.useReducer(e, t, n);
	}, e.useRef = function(e) {
		return T.H.useRef(e);
	}, e.useState = function(e) {
		return T.H.useState(e);
	}, e.useSyncExternalStore = function(e, t, n) {
		return T.H.useSyncExternalStore(e, t, n);
	}, e.useTransition = function() {
		return T.H.useTransition();
	}, e.version = "19.3.0";
})), i = /* @__PURE__ */ e(((e, t) => {
	t.exports = r();
})), a = /* @__PURE__ */ e(((e) => {
	var t = i();
	function n(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function r() {}
	var a = {
		d: {
			f: r,
			r: function() {
				throw Error(n(522));
			},
			D: r,
			C: r,
			L: r,
			m: r,
			X: r,
			S: r,
			M: r
		},
		p: 0,
		findDOMNode: null
	}, o = Symbol.for("react.portal"), s = Symbol.for("react.recoverable"), c = Symbol.for("react.optimistic_key");
	function l(e, t, n) {
		var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
		return {
			$$typeof: o,
			key: r == null ? null : r === c ? c : "" + r,
			children: e,
			containerInfo: t,
			implementation: n
		};
	}
	var u = t.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function d(e, t) {
		if (e === "font") return "";
		if (typeof t == "string") return t === "use-credentials" ? t : "";
	}
	e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = a, e.browser = function(e) {
		return {
			$$typeof: s,
			_reason: e
		};
	}, e.createPortal = function(e, t) {
		var r = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
		if (!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11) throw Error(n(299));
		return l(e, t, null, r);
	}, e.flushSync = function(e) {
		var t = u.T, n = a.p;
		try {
			if (u.T = null, a.p = 2, e) return e();
		} finally {
			u.T = t, a.p = n, a.d.f();
		}
	}, e.preconnect = function(e, t) {
		typeof e == "string" && (t ? (t = t.crossOrigin, t = typeof t == "string" ? t === "use-credentials" ? t : "" : void 0) : t = null, a.d.C(e, t));
	}, e.prefetchDNS = function(e) {
		typeof e == "string" && a.d.D(e);
	}, e.preinit = function(e, t) {
		if (typeof e == "string" && t && typeof t.as == "string") {
			var n = t.as, r = d(n, t.crossOrigin), i = typeof t.integrity == "string" ? t.integrity : void 0, o = typeof t.fetchPriority == "string" ? t.fetchPriority : void 0;
			n === "style" ? a.d.S(e, typeof t.precedence == "string" ? t.precedence : void 0, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o
			}) : n === "script" && a.d.X(e, {
				crossOrigin: r,
				integrity: i,
				fetchPriority: o,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0
			});
		}
	}, e.preinitModule = function(e, t) {
		if (typeof e == "string") {
			if (typeof t == "object" && t) {
				if (t.as == null || t.as === "script") {
					var n = d(t.as, t.crossOrigin);
					a.d.M(e, {
						crossOrigin: n,
						integrity: typeof t.integrity == "string" ? t.integrity : void 0,
						nonce: typeof t.nonce == "string" ? t.nonce : void 0,
						fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
					});
				}
			} else t ?? a.d.M(e);
		}
	}, e.preload = function(e, t) {
		if (typeof e == "string" && typeof t == "object" && t && typeof t.as == "string") {
			var n = t.as, r = d(n, t.crossOrigin);
			a.d.L(e, n, {
				crossOrigin: r,
				integrity: typeof t.integrity == "string" ? t.integrity : void 0,
				nonce: typeof t.nonce == "string" ? t.nonce : void 0,
				type: typeof t.type == "string" ? t.type : void 0,
				fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0,
				referrerPolicy: typeof t.referrerPolicy == "string" ? t.referrerPolicy : void 0,
				imageSrcSet: typeof t.imageSrcSet == "string" ? t.imageSrcSet : void 0,
				imageSizes: typeof t.imageSizes == "string" ? t.imageSizes : void 0,
				media: typeof t.media == "string" ? t.media : void 0
			});
		}
	}, e.preloadModule = function(e, t) {
		if (typeof e == "string") {
			if (t) {
				var n = d(t.as, t.crossOrigin);
				a.d.m(e, {
					as: typeof t.as == "string" && t.as !== "script" ? t.as : void 0,
					crossOrigin: n,
					integrity: typeof t.integrity == "string" ? t.integrity : void 0,
					nonce: typeof t.nonce == "string" ? t.nonce : void 0,
					fetchPriority: typeof t.fetchPriority == "string" ? t.fetchPriority : void 0
				});
			} else a.d.m(e);
		}
	}, e.requestFormReset = function(e) {
		a.d.r(e);
	}, e.unstable_batchedUpdates = function(e, t) {
		return e(t);
	}, e.useFormState = function(e, t, n) {
		return u.H.useFormState(e, t, n);
	}, e.useFormStatus = function() {
		return u.H.useHostTransitionStatus();
	}, e.version = "19.3.0";
})), o = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = a();
})), s = /* @__PURE__ */ e(((e) => {
	var t = n(), r = i(), a = o();
	function s(e) {
		var t = "https://react.dev/errors/" + e;
		if (1 < arguments.length) {
			t += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var n = 2; n < arguments.length; n++) t += "&args[]=" + encodeURIComponent(arguments[n]);
		}
		return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function c(e) {
		return !(!e || e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11);
	}
	function l(e) {
		for (var t = e, n = t; n && !n.alternate;) t = n, t.flags & 4098 && (e = t.return), n = t.return;
		for (; t.return;) t = t.return;
		return t.tag === 3 ? e : null;
	}
	function u(e) {
		if (e.tag === 13) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function d(e) {
		if (e.tag === 31) {
			var t = e.memoizedState;
			if (t === null && (e = e.alternate, e !== null && (t = e.memoizedState)), t !== null) return t.dehydrated;
		}
		return null;
	}
	function f(e) {
		if (l(e) !== e) throw Error(s(188));
	}
	function p(e) {
		var t = e.alternate;
		if (!t) {
			if (t = l(e), t === null) throw Error(s(188));
			return t === e ? e : null;
		}
		for (var n = e, r = t;;) {
			var i = n.return;
			if (i === null) break;
			var a = i.alternate;
			if (a === null) {
				if (r = i.return, r !== null) {
					n = r;
					continue;
				}
				break;
			}
			if (i.child === a.child) {
				for (a = i.child; a;) {
					if (a === n) return f(i), e;
					if (a === r) return f(i), t;
					a = a.sibling;
				}
				throw Error(s(188));
			}
			if (n.return !== r.return) n = i, r = a;
			else {
				for (var o = !1, c = i.child; c;) {
					if (c === n) {
						o = !0, n = i, r = a;
						break;
					}
					if (c === r) {
						o = !0, r = i, n = a;
						break;
					}
					c = c.sibling;
				}
				if (!o) {
					for (c = a.child; c;) {
						if (c === n) {
							o = !0, n = a, r = i;
							break;
						}
						if (c === r) {
							o = !0, r = a, n = i;
							break;
						}
						c = c.sibling;
					}
					if (!o) throw Error(s(189));
				}
			}
			if (n.alternate !== r) throw Error(s(190));
		}
		if (n.tag !== 3) throw Error(s(188));
		return n.stateNode.current === n ? e : t;
	}
	function m(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e;
		for (e = e.child; e !== null;) {
			if (t = m(e), t !== null) return t;
			e = e.sibling;
		}
		return null;
	}
	function h(e, t, n, r, i, a) {
		for (; e !== null;) {
			if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && n(e, r, i, a) || (e.tag !== 22 || e.memoizedState === null) && (t || e.tag !== 5 && e.tag !== 27) && h(e.child, t, n, r, i, a)) return !0;
			e = e.sibling;
		}
		return !1;
	}
	function g(e) {
		for (e = e.return; e !== null;) {
			if (e.tag === 3 || e.tag === 5 || e.tag === 27) return e;
			e = e.return;
		}
		return null;
	}
	function _(e) {
		var t = !1;
		for (e = e.return; e !== null && (e.tag === 4 && (t = !0), e.tag !== 3 && e.tag !== 5 && e.tag !== 27);) e = e.return;
		return t;
	}
	function v(e) {
		var t = [null, null], n = g(e);
		return n === null || y(t, e, n.child, { foundSelf: !1 }), t;
	}
	function y(e, t, n, r) {
		for (; n !== null;) {
			if (n === t) r.foundSelf = !0;
			else if (n.tag === 5 || n.tag === 27 || n.tag === 6) {
				if (r.foundSelf) return e[1] = n, !0;
				e[0] = n;
			} else if ((n.tag !== 22 || n.memoizedState === null) && y(e, t, n.child, r)) return !0;
			n = n.sibling;
		}
		return !1;
	}
	function b(e) {
		switch (e.tag) {
			case 5:
			case 27:
			case 6: return e.stateNode;
			case 3: return e.stateNode.containerInfo;
			default: throw Error(s(559));
		}
	}
	var x = null, S = null;
	function C(e, t, n) {
		return e === n || e === t && (x = e, !0);
	}
	function w(e, t, n) {
		return e === n ? (S = e, !1) : e === t && (S !== null && (x = e), !0);
	}
	function T(e) {
		if (e === null) return null;
		do
			e = e === null ? null : e.return;
		while (e && e.tag !== 5 && e.tag !== 27 && e.tag !== 3);
		return e || null;
	}
	function E(e, t, n) {
		for (var r = 0, i = e; i; i = n(i)) r++;
		i = 0;
		for (var a = t; a; a = n(a)) i++;
		for (; 0 < r - i;) e = n(e), r--;
		for (; 0 < i - r;) t = n(t), i--;
		for (; r--;) {
			if (e === t || t !== null && e === t.alternate) return e;
			e = n(e), t = n(t);
		}
		return null;
	}
	var D = Object.assign, O = Symbol.for("react.element"), ee = Symbol.for("react.transitional.element"), k = Symbol.for("react.portal"), A = Symbol.for("react.fragment"), j = Symbol.for("react.strict_mode"), M = Symbol.for("react.profiler"), te = Symbol.for("react.consumer"), N = Symbol.for("react.context"), ne = Symbol.for("react.forward_ref"), re = Symbol.for("react.suspense"), ie = Symbol.for("react.suspense_list"), ae = Symbol.for("react.memo"), oe = Symbol.for("react.lazy"), se = Symbol.for("react.activity"), ce = Symbol.for("react.legacy_hidden"), le = Symbol.for("react.memo_cache_sentinel"), P = Symbol.for("react.view_transition"), ue = Symbol.for("react.recoverable"), de = Symbol.iterator;
	function fe(e) {
		return typeof e != "object" || !e ? null : (e = de && e[de] || e["@@iterator"], typeof e == "function" ? e : null);
	}
	var pe = Symbol.for("react.client.reference");
	function me(e) {
		if (e == null) return null;
		if (typeof e == "function") return e.$$typeof === pe ? null : e.displayName || e.name || null;
		if (typeof e == "string") return e;
		switch (e) {
			case A: return "Fragment";
			case M: return "Profiler";
			case j: return "StrictMode";
			case re: return "Suspense";
			case ie: return "SuspenseList";
			case se: return "Activity";
			case P: return "ViewTransition";
		}
		if (typeof e == "object") switch (e.$$typeof) {
			case k: return "Portal";
			case N: return e.displayName || "Context";
			case te: return (e._context.displayName || "Context") + ".Consumer";
			case ne:
				var t = e.render;
				return e = e.displayName, e ||= (e = t.displayName || t.name || "", e === "" ? "ForwardRef" : "ForwardRef(" + e + ")"), e;
			case ae: return t = e.displayName || null, t === null ? me(e.type) || "Memo" : t;
			case oe:
				t = e._payload, e = e._init;
				try {
					return me(e(t));
				} catch {}
		}
		return null;
	}
	var he = Array.isArray, F = r.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, I = a.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ge = {
		pending: !1,
		data: null,
		method: null,
		action: null
	}, _e = [], ve = -1;
	function ye(e) {
		return { current: e };
	}
	function be(e) {
		0 > ve || (e.current = _e[ve], _e[ve] = null, ve--);
	}
	function xe(e, t) {
		ve++, _e[ve] = e.current, e.current = t;
	}
	var Se = ye(null), Ce = ye(null), we = ye(null), Te = ye(null);
	function Ee(e, t) {
		switch (xe(we, t), xe(Ce, e), xe(Se, null), t.nodeType) {
			case 9:
			case 11:
				e = (e = t.documentElement) && (e = e.namespaceURI) ? up(e) : 0;
				break;
			default: if (e = t.tagName, t = t.namespaceURI) t = up(t), e = dp(t, e);
			else switch (e) {
				case "svg":
					e = 1;
					break;
				case "math":
					e = 2;
					break;
				default: e = 0;
			}
		}
		be(Se), xe(Se, e);
	}
	function De() {
		be(Se), be(Ce), be(we);
	}
	function Oe(e) {
		var t = e.memoizedState;
		t !== null && (sh._currentValue = t.memoizedState, xe(Te, e)), t = Se.current;
		var n = dp(t, e.type);
		t !== n && (xe(Ce, e), xe(Se, n));
	}
	function ke(e) {
		Ce.current === e && (be(Se), be(Ce)), Te.current === e && (be(Te), sh._currentValue = ge);
	}
	var Ae, je;
	function L(e) {
		if (Ae === void 0) try {
			throw Error();
		} catch (e) {
			var t = e.stack.trim().match(/\n( *(at )?)/);
			Ae = t && t[1] || "", je = -1 < e.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < e.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + Ae + e + je;
	}
	var Me = !1;
	function Ne(e, t) {
		if (!e || Me) return "";
		Me = !0;
		var n = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var r = { DetermineComponentFrameRoot: function() {
				try {
					if (t) {
						var n = function() {
							throw Error();
						};
						if (Object.defineProperty(n.prototype, "props", { set: function() {
							throw Error();
						} }), typeof Reflect == "object" && Reflect.construct) {
							try {
								Reflect.construct(n, []);
							} catch (e) {
								var r = e;
							}
							Reflect.construct(e, [], n);
						} else {
							try {
								n.call();
							} catch (e) {
								r = e;
							}
							n = !1;
							try {
								var i = Object.getOwnPropertyDescriptor(e.prototype, "props");
								Object.defineProperty(e.prototype, "props", {
									configurable: !0,
									set: function() {
										throw Error();
									}
								}), n = !0, new e();
							} finally {
								n && (i === void 0 ? delete e.prototype.props : Object.defineProperty(e.prototype, "props", i));
							}
						}
					} else {
						try {
							throw Error();
						} catch (e) {
							r = e;
						}
						(n = e()) && typeof n.catch == "function" && n.catch(function() {});
					}
				} catch (e) {
					if (e && r && typeof e.stack == "string") return [e.stack, r.stack];
				}
				return [null, null];
			} };
			r.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var i = Object.getOwnPropertyDescriptor(r.DetermineComponentFrameRoot, "name");
			i && i.configurable && Object.defineProperty(r.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
			var a = r.DetermineComponentFrameRoot(), o = a[0], s = a[1];
			if (o && s) {
				var c = o.split("\n"), l = s.split("\n");
				for (i = r = 0; r < c.length && !c[r].includes("DetermineComponentFrameRoot");) r++;
				for (; i < l.length && !l[i].includes("DetermineComponentFrameRoot");) i++;
				if (r === c.length || i === l.length) for (r = c.length - 1, i = l.length - 1; 1 <= r && 0 <= i && c[r] !== l[i];) i--;
				for (; 1 <= r && 0 <= i; r--, i--) if (c[r] !== l[i]) {
					if (r !== 1 || i !== 1) do
						if (r--, i--, 0 > i || c[r] !== l[i]) {
							var u = "\n" + c[r].replace(" at new ", " at ");
							return e.displayName && u.includes("<anonymous>") && (u = u.replace("<anonymous>", e.displayName)), u;
						}
					while (1 <= r && 0 <= i);
					break;
				}
			}
		} finally {
			Me = !1, Error.prepareStackTrace = n;
		}
		return (n = e ? e.displayName || e.name : "") ? L(n) : "";
	}
	function Pe(e, t) {
		switch (e.tag) {
			case 26:
			case 27:
			case 5: return L(e.type);
			case 16: return L("Lazy");
			case 13: return e.child !== t && t !== null ? L("Suspense Fallback") : L("Suspense");
			case 19: return L("SuspenseList");
			case 0:
			case 15: return Ne(e.type, !1);
			case 11: return Ne(e.type.render, !1);
			case 1: return Ne(e.type, !0);
			case 31: return L("Activity");
			case 30: return L("ViewTransition");
			default: return "";
		}
	}
	function R(e) {
		try {
			var t = "", n = null;
			do
				t += Pe(e, n), n = e, e = e.return;
			while (e);
			return t;
		} catch (e) {
			return "\nError generating stack: " + e.message + "\n" + e.stack;
		}
	}
	var Fe = Object.prototype.hasOwnProperty, z = t.unstable_scheduleCallback, Ie = t.unstable_cancelCallback, Le = t.unstable_shouldYield, Re = t.unstable_requestPaint, ze = t.unstable_now, Be = t.unstable_getCurrentPriorityLevel, Ve = t.unstable_ImmediatePriority, He = t.unstable_UserBlockingPriority, Ue = t.unstable_NormalPriority, We = t.unstable_LowPriority, Ge = t.unstable_IdlePriority, Ke = t.log, qe = t.unstable_setDisableYieldValue, Je = null, Ye = null;
	function Xe(e) {
		if (typeof Ke == "function" && qe(e), Ye && typeof Ye.setStrictMode == "function") try {
			Ye.setStrictMode(Je, e);
		} catch {}
	}
	var Ze = Math.clz32 ? Math.clz32 : et, Qe = Math.log, $e = Math.LN2;
	function et(e) {
		return e >>>= 0, e === 0 ? 32 : 31 - (Qe(e) / $e | 0) | 0;
	}
	var tt = 256, nt = 262144, rt = 4194304;
	function it(e) {
		var t = e & 42;
		if (t !== 0) return t;
		switch (e & -e) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64: return 64;
			case 128: return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072: return e & -e;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return e & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return e & 62914560;
			case 67108864: return 67108864;
			case 134217728: return 134217728;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 1073741824: return 0;
			default: return e;
		}
	}
	function at(e, t, n) {
		var r = e.pendingLanes;
		if (r === 0) return 0;
		var i = 0, a = e.suspendedLanes, o = e.pingedLanes;
		e = e.warmLanes;
		var s = r & 134217727;
		return s === 0 ? (s = r & ~a, s === 0 ? o === 0 ? n || (n = r & ~e, n !== 0 && (i = it(n))) : i = it(o) : i = it(s)) : (r = s & ~a, r === 0 ? (o &= s, o === 0 ? n || (n = s & ~e, n !== 0 && (i = it(n))) : i = it(o)) : i = it(r)), i === 0 ? 0 : t !== 0 && t !== i && (t & a) === 0 && (a = i & -i, n = t & -t, a >= n || a === 32 && n & 4194048) ? t : i;
	}
	function ot(e, t) {
		return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
	}
	function B(e, t) {
		t & 8 && (t |= t & 32);
		var n = e.entangledLanes;
		if (n !== 0) for (e = e.entanglements, n &= t; 0 < n;) {
			var r = 31 - Ze(n), i = 1 << r;
			t |= e[r], n &= ~i;
		}
		return t;
	}
	function V(e, t) {
		switch (e) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64: return t + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return t + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return -1;
			case 67108864:
			case 134217728:
			case 268435456:
			case 536870912:
			case 1073741824: return -1;
			default: return -1;
		}
	}
	function st() {
		var e = rt;
		return rt <<= 1, !(rt & 62914560) && (rt = 4194304), e;
	}
	function ct(e) {
		for (var t = [], n = 0; 31 > n; n++) t.push(e);
		return t;
	}
	function lt(e, t) {
		e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
	}
	function ut(e, t, n, r, i, a) {
		var o = e.pendingLanes;
		e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
		var s = e.entanglements, c = e.expirationTimes, l = e.hiddenUpdates;
		for (n = o & ~n; 0 < n;) {
			var u = 31 - Ze(n), d = 1 << u;
			s[u] = 0, c[u] = -1;
			var f = l[u];
			if (f !== null) for (l[u] = null, u = 0; u < f.length; u++) {
				var p = f[u];
				p !== null && (p.lane &= -536870913);
			}
			n &= ~d;
		}
		r !== 0 && dt(e, r, 0), a !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= a & ~(o & ~t));
	}
	function dt(e, t, n) {
		e.pendingLanes |= t, e.suspendedLanes &= ~t;
		var r = 31 - Ze(t);
		e.entangledLanes |= t, e.entanglements[r] = e.entanglements[r] | 1073741824 | n & 261930;
	}
	function ft(e, t) {
		var n = e.entangledLanes |= t;
		for (e = e.entanglements; n;) {
			var r = 31 - Ze(n), i = 1 << r;
			i & t | e[r] & t && (e[r] |= t), n &= ~i;
		}
	}
	function pt(e, t) {
		var n = t & -t;
		return n = n & 42 ? 1 : mt(n), (n & (e.suspendedLanes | t)) === 0 ? n : 0;
	}
	function mt(e) {
		switch (e) {
			case 2:
				e = 1;
				break;
			case 8:
				e = 4;
				break;
			case 32:
				e = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				e = 128;
				break;
			case 268435456:
				e = 134217728;
				break;
			default: e = 0;
		}
		return e;
	}
	function ht(e) {
		return e &= -e, 2 < e ? 8 < e ? e & 134217727 ? 32 : 268435456 : 8 : 2;
	}
	function gt() {
		var e = I.p;
		return e === 0 ? (e = window.event, e === void 0 ? 32 : Ch(e.type)) : e;
	}
	function _t(e, t) {
		var n = I.p;
		try {
			return I.p = e, t();
		} finally {
			I.p = n;
		}
	}
	var vt = Math.random().toString(36).slice(2), H = "__reactFiber$" + vt, U = "__reactProps$" + vt, yt = "__reactContainer$" + vt, W = "__reactEvents$" + vt, bt = "__reactListeners$" + vt, xt = "__reactHandles$" + vt, G = "__reactResources$" + vt, St = "__reactMarker$" + vt, Ct = "__reactLoad$" + vt;
	function wt(e) {
		delete e[H], delete e[U], delete e[bt], delete e[xt];
	}
	function Tt(e) {
		var t;
		if (t = e[H]) return t;
		for (var n = e.parentNode; n;) {
			if (t = n[yt] || n[H]) {
				if (n = t.alternate, t.child !== null || n !== null && n.child !== null) for (e = fm(e); e !== null;) {
					if (n = e[H]) return n;
					e = fm(e);
				}
				return t;
			}
			e = n, n = e.parentNode;
		}
		return null;
	}
	function K(e) {
		if (e = e[H] || e[yt]) {
			var t = e.tag;
			if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3) return e;
		}
		return null;
	}
	function Et(e) {
		var t = e.tag;
		if (t === 5 || t === 26 || t === 27 || t === 6) return e.stateNode;
		throw Error(s(33));
	}
	function Dt(e) {
		var t = e[G];
		return t ||= e[G] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		}, t;
	}
	function Ot(e) {
		e[St] = !0;
	}
	function kt(e) {
		e[Ct] = void 0;
	}
	var At = /* @__PURE__ */ new Set(), jt = {};
	function Mt(e, t) {
		Nt(e, t), Nt(e + "Capture", t);
	}
	function Nt(e, t) {
		for (jt[e] = t, e = 0; e < t.length; e++) At.add(t[e]);
	}
	var Pt = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"), Ft = {}, It = {};
	function Lt(e) {
		return Fe.call(It, e) ? !0 : Fe.call(Ft, e) ? !1 : Pt.test(e) ? It[e] = !0 : (Ft[e] = !0, !1);
	}
	var q = !1;
	function Rt() {
		var e = q;
		return q = !1, e;
	}
	function zt(e, t, n) {
		if (Lt(t)) {
			if (n === null) e.removeAttribute(t);
			else {
				switch (typeof n) {
					case "undefined":
					case "function":
					case "symbol":
						e.removeAttribute(t);
						return;
					case "boolean":
						var r = t.toLowerCase().slice(0, 5);
						if (r !== "data-" && r !== "aria-") {
							e.removeAttribute(t);
							return;
						}
				}
				e.setAttribute(t, n);
			}
		}
	}
	function Bt(e, t, n) {
		if (n === null) e.removeAttribute(t);
		else {
			switch (typeof n) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(t);
					return;
			}
			e.setAttribute(t, n);
		}
	}
	function Vt(e, t, n, r) {
		if (r === null) e.removeAttribute(n);
		else {
			switch (typeof r) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					e.removeAttribute(n);
					return;
			}
			e.setAttributeNS(t, n, r);
		}
	}
	function Ht(e) {
		switch (typeof e) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined": return e;
			case "object": return e;
			default: return "";
		}
	}
	function Ut(e) {
		var t = e.type;
		return (e = e.nodeName) && e.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
	}
	function Wt(e, t, n) {
		var r = Object.getOwnPropertyDescriptor(e.constructor.prototype, t);
		if (!e.hasOwnProperty(t) && r !== void 0 && typeof r.get == "function" && typeof r.set == "function") {
			var i = r.get, a = r.set;
			return Object.defineProperty(e, t, {
				configurable: !0,
				get: function() {
					return i.call(this);
				},
				set: function(e) {
					n = "" + e, a.call(this, e);
				}
			}), Object.defineProperty(e, t, { enumerable: r.enumerable }), {
				getValue: function() {
					return n;
				},
				setValue: function(e) {
					n = "" + e;
				},
				stopTracking: function() {
					e._valueTracker = null, delete e[t];
				}
			};
		}
	}
	function Gt(e) {
		if (!e._valueTracker) {
			var t = Ut(e) ? "checked" : "value";
			e._valueTracker = Wt(e, t, "" + e[t]);
		}
	}
	function Kt(e) {
		if (!e) return !1;
		var t = e._valueTracker;
		if (!t) return !0;
		var n = t.getValue(), r = "";
		return e && (r = Ut(e) ? e.checked ? "true" : "false" : e.value), e = r, e !== n && (t.setValue(e), !0);
	}
	var qt = /[\n"\\]/g;
	function Jt(e) {
		return e.replace(qt, function(e) {
			return "\\" + e.charCodeAt(0).toString(16) + " ";
		});
	}
	function Yt(e, t, n, r, i, a, o, s) {
		e.name = "", o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" ? e.type = o : e.removeAttribute("type"), t == null ? o !== "submit" && o !== "reset" || e.removeAttribute("value") : o === "number" ? (t === 0 && e.value === "" || e.value != t) && (e.value = "" + Ht(t)) : e.value !== "" + Ht(t) && (e.value = "" + Ht(t)), t == null ? n == null ? r != null && e.removeAttribute("value") : Zt(e, Ht(n)) : o === "number" && e.value == t ? Zt(e, Ht(e.value)) : Zt(e, Ht(t)), i == null && a != null && (e.defaultChecked = !!a), i != null && (e.checked = i && typeof i != "function" && typeof i != "symbol"), s != null && typeof s != "function" && typeof s != "symbol" && typeof s != "boolean" ? e.name = "" + Ht(s) : e.removeAttribute("name");
	}
	function Xt(e, t, n, r, i, a, o, s) {
		if (a != null && typeof a != "function" && typeof a != "symbol" && typeof a != "boolean" && (e.type = a), t != null || n != null) {
			if (!(a !== "submit" && a !== "reset" || t != null)) {
				Gt(e);
				return;
			}
			n = n == null ? "" : "" + Ht(n), t = t == null ? n : "" + Ht(t), s || t === e.value || (e.value = t), e.defaultValue = t;
		}
		r ??= i, r = typeof r != "function" && typeof r != "symbol" && !!r, e.checked = s ? e.checked : !!r, e.defaultChecked = !!r, o != null && typeof o != "function" && typeof o != "symbol" && typeof o != "boolean" && (e.name = o), Gt(e);
	}
	function Zt(e, t) {
		e.defaultValue !== "" + t && (e.defaultValue = "" + t);
	}
	function Qt(e, t, n, r) {
		if (e = e.options, t) {
			t = {};
			for (var i = 0; i < n.length; i++) t["$" + n[i]] = !0;
			for (n = 0; n < e.length; n++) i = t.hasOwnProperty("$" + e[n].value), e[n].selected !== i && (e[n].selected = i), i && r && (e[n].defaultSelected = !0);
		} else {
			for (n = "" + Ht(n), t = null, i = 0; i < e.length; i++) {
				if (e[i].value === n) {
					e[i].selected = !0, r && (e[i].defaultSelected = !0);
					return;
				}
				t !== null || e[i].disabled || (t = e[i]);
			}
			t !== null && (t.selected = !0);
		}
	}
	function $t(e, t, n) {
		t != null && (t = "" + Ht(t), t !== e.value && (e.value = t), n == null) ? e.defaultValue !== t && (e.defaultValue = t) : e.defaultValue = n == null ? "" : "" + Ht(n);
	}
	function en(e, t, n, r) {
		if (t == null) {
			if (r != null) {
				if (n != null) throw Error(s(92));
				if (he(r)) {
					if (1 < r.length) throw Error(s(93));
					r = r[0];
				}
				n = r;
			}
			n ??= "", t = n;
		}
		n = Ht(t), e.defaultValue = n, r = e.textContent, r === n && r !== "" && r !== null && (e.value = r), Gt(e);
	}
	function tn(e, t) {
		if (t) {
			var n = e.firstChild;
			if (n && n === e.lastChild && n.nodeType === 3) {
				n.nodeValue = t;
				return;
			}
		}
		e.textContent = t;
	}
	var nn = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function rn(e, t, n) {
		var r = t.indexOf("--") === 0;
		n == null || typeof n == "boolean" || n === "" ? r ? e.setProperty(t, "") : t === "float" ? e.cssFloat = "" : e[t] = "" : r ? e.setProperty(t, n) : typeof n != "number" || n === 0 || nn.has(t) ? t === "float" ? e.cssFloat = n : e[t] = ("" + n).trim() : e[t] = n + "px";
	}
	function an(e, t, n) {
		if (t != null && typeof t != "object") throw Error(s(62));
		if (e = e.style, n != null) {
			for (var r in n) !n.hasOwnProperty(r) || t != null && t.hasOwnProperty(r) || (r.indexOf("--") === 0 ? e.setProperty(r, "") : r === "float" ? e.cssFloat = "" : e[r] = "", q = !0);
			for (var i in t) r = t[i], t.hasOwnProperty(i) && n[i] !== r && (rn(e, i, r), q = !0);
		} else for (var a in t) t.hasOwnProperty(a) && rn(e, a, t[a]);
	}
	function on(e) {
		if (e.indexOf("-") === -1) return !1;
		switch (e) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var sn = /* @__PURE__ */ new Map([
		["acceptCharset", "accept-charset"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"],
		["crossOrigin", "crossorigin"],
		["accentHeight", "accent-height"],
		["alignmentBaseline", "alignment-baseline"],
		["arabicForm", "arabic-form"],
		["baselineShift", "baseline-shift"],
		["capHeight", "cap-height"],
		["clipPath", "clip-path"],
		["clipRule", "clip-rule"],
		["colorInterpolation", "color-interpolation"],
		["colorInterpolationFilters", "color-interpolation-filters"],
		["colorProfile", "color-profile"],
		["colorRendering", "color-rendering"],
		["dominantBaseline", "dominant-baseline"],
		["enableBackground", "enable-background"],
		["fillOpacity", "fill-opacity"],
		["fillRule", "fill-rule"],
		["floodColor", "flood-color"],
		["floodOpacity", "flood-opacity"],
		["fontFamily", "font-family"],
		["fontSize", "font-size"],
		["fontSizeAdjust", "font-size-adjust"],
		["fontStretch", "font-stretch"],
		["fontStyle", "font-style"],
		["fontVariant", "font-variant"],
		["fontWeight", "font-weight"],
		["glyphName", "glyph-name"],
		["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
		["glyphOrientationVertical", "glyph-orientation-vertical"],
		["horizAdvX", "horiz-adv-x"],
		["horizOriginX", "horiz-origin-x"],
		["imageRendering", "image-rendering"],
		["letterSpacing", "letter-spacing"],
		["lightingColor", "lighting-color"],
		["markerEnd", "marker-end"],
		["markerMid", "marker-mid"],
		["markerStart", "marker-start"],
		["maskType", "mask-type"],
		["overlinePosition", "overline-position"],
		["overlineThickness", "overline-thickness"],
		["paintOrder", "paint-order"],
		["panose-1", "panose-1"],
		["pointerEvents", "pointer-events"],
		["renderingIntent", "rendering-intent"],
		["shapeRendering", "shape-rendering"],
		["stopColor", "stop-color"],
		["stopOpacity", "stop-opacity"],
		["strikethroughPosition", "strikethrough-position"],
		["strikethroughThickness", "strikethrough-thickness"],
		["strokeDasharray", "stroke-dasharray"],
		["strokeDashoffset", "stroke-dashoffset"],
		["strokeLinecap", "stroke-linecap"],
		["strokeLinejoin", "stroke-linejoin"],
		["strokeMiterlimit", "stroke-miterlimit"],
		["strokeOpacity", "stroke-opacity"],
		["strokeWidth", "stroke-width"],
		["textAnchor", "text-anchor"],
		["textDecoration", "text-decoration"],
		["textRendering", "text-rendering"],
		["transformOrigin", "transform-origin"],
		["underlinePosition", "underline-position"],
		["underlineThickness", "underline-thickness"],
		["unicodeBidi", "unicode-bidi"],
		["unicodeRange", "unicode-range"],
		["unitsPerEm", "units-per-em"],
		["vAlphabetic", "v-alphabetic"],
		["vHanging", "v-hanging"],
		["vIdeographic", "v-ideographic"],
		["vMathematical", "v-mathematical"],
		["vectorEffect", "vector-effect"],
		["vertAdvY", "vert-adv-y"],
		["vertOriginX", "vert-origin-x"],
		["vertOriginY", "vert-origin-y"],
		["wordSpacing", "word-spacing"],
		["writingMode", "writing-mode"],
		["xmlnsXlink", "xmlns:xlink"],
		["xHeight", "x-height"]
	]), cn = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function ln(e) {
		return cn.test("" + e) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : e;
	}
	function un() {}
	var dn = null;
	function fn(e) {
		return e = e.target || e.srcElement || window, e.correspondingUseElement && (e = e.correspondingUseElement), e.nodeType === 3 ? e.parentNode : e;
	}
	var pn = null, mn = null;
	function hn(e) {
		var t = K(e);
		if (t && (e = t.stateNode)) {
			var n = e[U] || null;
			a: switch (e = t.stateNode, t.type) {
				case "input":
					if (Yt(e, n.value, n.defaultValue, n.defaultValue, n.checked, n.defaultChecked, n.type, n.name), t = n.name, n.type === "radio" && t != null) {
						for (n = e; n.parentNode;) n = n.parentNode;
						for (n = n.querySelectorAll("input[name=\"" + Jt("" + t) + "\"][type=\"radio\"]"), t = 0; t < n.length; t++) {
							var r = n[t];
							if (r !== e && r.form === e.form) {
								var i = r[U] || null;
								if (!i) throw Error(s(90));
								Yt(r, i.value, i.defaultValue, i.defaultValue, i.checked, i.defaultChecked, i.type, i.name);
							}
						}
						for (t = 0; t < n.length; t++) r = n[t], r.form === e.form && Kt(r);
					}
					break a;
				case "textarea":
					$t(e, n.value, n.defaultValue);
					break a;
				case "select": t = n.value, t != null && Qt(e, !!n.multiple, t, !1);
			}
		}
	}
	var gn = !1;
	function _n(e, t, n) {
		if (gn) return e(t, n);
		gn = !0;
		try {
			return e(t);
		} finally {
			if (gn = !1, (pn !== null || mn !== null) && (Id(), pn && (t = pn, e = mn, mn = pn = null, hn(t), e))) for (t = 0; t < e.length; t++) hn(e[t]);
		}
	}
	function vn(e, t) {
		var n = e.stateNode;
		if (n === null) return null;
		var r = n[U] || null;
		if (r === null) return null;
		n = r[t];
		a: switch (t) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(r = !r.disabled) || (e = e.type, r = e !== "button" && e !== "input" && e !== "select" && e !== "textarea"), e = !r;
				break a;
			default: e = !1;
		}
		if (e) return null;
		if (n && typeof n != "function") throw Error(s(231, t, typeof n));
		return n;
	}
	var yn = typeof window < "u" && window.document !== void 0 && window.document.createElement !== void 0, bn = !1;
	if (yn) try {
		var xn = {};
		Object.defineProperty(xn, "passive", { get: function() {
			bn = !0;
		} }), window.addEventListener("test", xn, xn), window.removeEventListener("test", xn, xn);
	} catch {
		bn = !1;
	}
	var J = null, Sn = null, Cn = null;
	function wn() {
		if (Cn) return Cn;
		var e, t = Sn, n = t.length, r, i = "value" in J ? J.value : J.textContent, a = i.length;
		for (e = 0; e < n && t[e] === i[e]; e++);
		var o = n - e;
		for (r = 1; r <= o && t[n - r] === i[a - r]; r++);
		return Cn = i.slice(e, 1 < r ? 1 - r : void 0);
	}
	function Tn(e) {
		var t = e.keyCode;
		return "charCode" in e ? (e = e.charCode, e === 0 && t === 13 && (e = 13)) : e = t, e === 10 && (e = 13), 32 <= e || e === 13 ? e : 0;
	}
	function En() {
		return !0;
	}
	function Dn() {
		return !1;
	}
	function On(e) {
		function t(t, n, r, i, a) {
			for (var o in this._reactName = t, this._targetInst = r, this.type = n, this.nativeEvent = i, this.target = a, this.currentTarget = null, e) e.hasOwnProperty(o) && (t = e[o], this[o] = t ? t(i) : i[o]);
			return this.isDefaultPrevented = (i.defaultPrevented == null ? !1 === i.returnValue : i.defaultPrevented) ? En : Dn, this.isPropagationStopped = Dn, this;
		}
		return D(t.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var e = this.nativeEvent;
				e && (e.preventDefault ? e.preventDefault() : typeof e.returnValue != "unknown" && (e.returnValue = !1), this.isDefaultPrevented = En);
			},
			stopPropagation: function() {
				var e = this.nativeEvent;
				e && (e.stopPropagation ? e.stopPropagation() : typeof e.cancelBubble != "unknown" && (e.cancelBubble = !0), this.isPropagationStopped = En);
			},
			persist: function() {},
			isPersistent: En
		}), t;
	}
	var kn = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(e) {
			return e.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	}, An = On(kn), jn = D({}, kn, {
		view: 0,
		detail: 0
	}), Mn = On(jn), Nn, Pn, Fn, In = D({}, jn, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: qn,
		button: 0,
		buttons: 0,
		relatedTarget: function(e) {
			return e.relatedTarget === void 0 ? e.fromElement === e.srcElement ? e.toElement : e.fromElement : e.relatedTarget;
		},
		movementX: function(e) {
			return "movementX" in e ? e.movementX : (e !== Fn && (Fn && e.type === "mousemove" ? (Nn = e.screenX - Fn.screenX, Pn = e.screenY - Fn.screenY) : Pn = Nn = 0, Fn = e), Nn);
		},
		movementY: function(e) {
			return "movementY" in e ? e.movementY : Pn;
		}
	}), Ln = On(In), Rn = On(D({}, In, { dataTransfer: 0 })), zn = On(D({}, jn, { relatedTarget: 0 })), Bn = On(D({}, kn, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), Vn = On(D({}, kn, { clipboardData: function(e) {
		return "clipboardData" in e ? e.clipboardData : window.clipboardData;
	} })), Hn = On(D({}, kn, { data: 0 })), Un = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	}, Wn = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	}, Gn = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function Kn(e) {
		var t = this.nativeEvent;
		return t.getModifierState ? t.getModifierState(e) : (e = Gn[e]) ? !!t[e] : !1;
	}
	function qn() {
		return Kn;
	}
	var Jn = On(D({}, jn, {
		key: function(e) {
			if (e.key) {
				var t = Un[e.key] || e.key;
				if (t !== "Unidentified") return t;
			}
			return e.type === "keypress" ? (e = Tn(e), e === 13 ? "Enter" : String.fromCharCode(e)) : e.type === "keydown" || e.type === "keyup" ? Wn[e.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: qn,
		charCode: function(e) {
			return e.type === "keypress" ? Tn(e) : 0;
		},
		keyCode: function(e) {
			return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		},
		which: function(e) {
			return e.type === "keypress" ? Tn(e) : e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
		}
	})), Yn = On(D({}, In, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	})), Xn = On(D({}, kn, { submitter: 0 })), Zn = On(D({}, jn, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: qn
	})), Qn = On(D({}, kn, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	})), $n = On(D({}, In, {
		deltaX: function(e) {
			return "deltaX" in e ? e.deltaX : "wheelDeltaX" in e ? -e.wheelDeltaX : 0;
		},
		deltaY: function(e) {
			return "deltaY" in e ? e.deltaY : "wheelDeltaY" in e ? -e.wheelDeltaY : "wheelDelta" in e ? -e.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	})), er = On(D({}, kn, {
		newState: 0,
		oldState: 0,
		source: 0
	})), tr = [
		9,
		13,
		27,
		32
	], nr = yn && "CompositionEvent" in window, rr = null;
	yn && "documentMode" in document && (rr = document.documentMode);
	var ir = yn && "TextEvent" in window && !rr, ar = yn && (!nr || rr && 8 < rr && 11 >= rr), or = " ", sr = !1;
	function cr(e, t) {
		switch (e) {
			case "keyup": return tr.indexOf(t.keyCode) !== -1;
			case "keydown": return t.keyCode !== 229;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function lr(e) {
		return e = e.detail, typeof e == "object" && "data" in e ? e.data : null;
	}
	var ur = !1;
	function dr(e, t) {
		switch (e) {
			case "compositionend": return lr(t);
			case "keypress": return t.which === 32 ? (sr = !0, or) : null;
			case "textInput": return e = t.data, e === or && sr ? null : e;
			default: return null;
		}
	}
	function fr(e, t) {
		if (ur) return e === "compositionend" || !nr && cr(e, t) ? (e = wn(), Cn = Sn = J = null, ur = !1, e) : null;
		switch (e) {
			case "paste": return null;
			case "keypress":
				if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
					if (t.char && 1 < t.char.length) return t.char;
					if (t.which) return String.fromCharCode(t.which);
				}
				return null;
			case "compositionend": return ar && t.locale !== "ko" ? null : t.data;
			default: return null;
		}
	}
	var pr = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function mr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t === "input" ? !!pr[e.type] : t === "textarea";
	}
	function hr(e, t, n, r) {
		pn ? mn ? mn.push(r) : mn = [r] : pn = r, t = qf(t, "onChange"), 0 < t.length && (n = new An("onChange", "change", null, n, r), e.push({
			event: n,
			listeners: t
		}));
	}
	var gr = null, _r = null;
	function vr(e) {
		zf(e, 0);
	}
	function yr(e) {
		if (Kt(Et(e))) return e;
	}
	function br(e, t) {
		if (e === "change") return t;
	}
	var xr = !1;
	if (yn) {
		var Sr;
		if (yn) {
			var Cr = "oninput" in document;
			if (!Cr) {
				var wr = document.createElement("div");
				wr.setAttribute("oninput", "return;"), Cr = typeof wr.oninput == "function";
			}
			Sr = Cr;
		} else Sr = !1;
		xr = Sr && (!document.documentMode || 9 < document.documentMode);
	}
	function Tr() {
		gr && (gr.detachEvent("onpropertychange", Er), _r = gr = null);
	}
	function Er(e) {
		if (e.propertyName === "value" && yr(_r)) {
			var t = [];
			hr(t, _r, e, fn(e)), _n(vr, t);
		}
	}
	function Dr(e, t, n) {
		e === "focusin" ? (Tr(), gr = t, _r = n, gr.attachEvent("onpropertychange", Er)) : e === "focusout" && Tr();
	}
	function Or(e) {
		if (e === "selectionchange" || e === "keyup" || e === "keydown") return yr(_r);
	}
	function kr(e, t) {
		if (e === "click") return yr(t);
	}
	function Ar(e, t) {
		if (e === "input" || e === "change") return yr(t);
	}
	function jr(e, t) {
		return e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
	}
	var Mr = typeof Object.is == "function" ? Object.is : jr;
	function Nr(e, t) {
		if (Mr(e, t)) return !0;
		if (typeof e != "object" || !e || typeof t != "object" || !t) return !1;
		var n = Object.keys(e), r = Object.keys(t);
		if (n.length !== r.length) return !1;
		for (r = 0; r < n.length; r++) {
			var i = n[r];
			if (!Fe.call(t, i) || !Mr(e[i], t[i])) return !1;
		}
		return !0;
	}
	function Pr(e) {
		if (e ||= typeof document < "u" ? document : void 0, e === void 0) return null;
		try {
			return e.activeElement || e.body;
		} catch {
			return e.body;
		}
	}
	function Fr(e) {
		for (; e && e.firstChild;) e = e.firstChild;
		return e;
	}
	function Ir(e, t) {
		var n = Fr(e);
		e = 0;
		for (var r; n;) {
			if (n.nodeType === 3) {
				if (r = e + n.textContent.length, e <= t && r >= t) return {
					node: n,
					offset: t - e
				};
				e = r;
			}
			a: {
				for (; n;) {
					if (n.nextSibling) {
						n = n.nextSibling;
						break a;
					}
					n = n.parentNode;
				}
				n = void 0;
			}
			n = Fr(n);
		}
	}
	function Lr(e, t) {
		return e && t ? e === t ? !0 : e && e.nodeType === 3 ? !1 : t && t.nodeType === 3 ? Lr(e, t.parentNode) : "contains" in e ? e.contains(t) : e.compareDocumentPosition ? !!(e.compareDocumentPosition(t) & 16) : !1 : !1;
	}
	function Rr(e) {
		e = e != null && e.ownerDocument != null && e.ownerDocument.defaultView != null ? e.ownerDocument.defaultView : window;
		for (var t = Pr(e.document); t instanceof e.HTMLIFrameElement;) {
			try {
				var n = typeof t.contentWindow.location.href == "string";
			} catch {
				n = !1;
			}
			if (n) e = t.contentWindow;
			else break;
			t = Pr(e.document);
		}
		return t;
	}
	function zr(e) {
		var t = e && e.nodeName && e.nodeName.toLowerCase();
		return t && (t === "input" && (e.type === "text" || e.type === "search" || e.type === "tel" || e.type === "url" || e.type === "password") || t === "textarea" || e.contentEditable === "true");
	}
	var Br = yn && "documentMode" in document && 11 >= document.documentMode, Vr = null, Hr = null, Ur = null, Wr = !1;
	function Gr(e, t, n) {
		var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
		Wr || Vr == null || Vr !== Pr(r) || (r = Vr, "selectionStart" in r && zr(r) ? r = {
			start: r.selectionStart,
			end: r.selectionEnd
		} : (r = (r.ownerDocument && r.ownerDocument.defaultView || window).getSelection(), r = {
			anchorNode: r.anchorNode,
			anchorOffset: r.anchorOffset,
			focusNode: r.focusNode,
			focusOffset: r.focusOffset
		}), Ur && Nr(Ur, r) || (Ur = r, r = qf(Hr, "onSelect"), 0 < r.length && (t = new An("onSelect", "select", null, t, n), e.push({
			event: t,
			listeners: r
		}), t.target = Vr)));
	}
	function Kr(e, t) {
		var n = {};
		return n[e.toLowerCase()] = t.toLowerCase(), n["Webkit" + e] = "webkit" + t, n["Moz" + e] = "moz" + t, n;
	}
	var qr = {
		animationend: Kr("Animation", "AnimationEnd"),
		animationiteration: Kr("Animation", "AnimationIteration"),
		animationstart: Kr("Animation", "AnimationStart"),
		transitionrun: Kr("Transition", "TransitionRun"),
		transitionstart: Kr("Transition", "TransitionStart"),
		transitioncancel: Kr("Transition", "TransitionCancel"),
		transitionend: Kr("Transition", "TransitionEnd")
	}, Jr = {}, Yr = {};
	yn && (Yr = document.createElement("div").style, "AnimationEvent" in window || (delete qr.animationend.animation, delete qr.animationiteration.animation, delete qr.animationstart.animation), "TransitionEvent" in window || delete qr.transitionend.transition);
	function Xr(e) {
		if (Jr[e]) return Jr[e];
		if (!qr[e]) return e;
		var t = qr[e], n;
		for (n in t) if (t.hasOwnProperty(n) && n in Yr) return Jr[e] = t[n];
		return e;
	}
	var Zr = Xr("animationend"), Qr = Xr("animationiteration"), $r = Xr("animationstart"), ei = Xr("transitionrun"), ti = Xr("transitionstart"), ni = Xr("transitioncancel"), ri = Xr("transitionend"), ii = /* @__PURE__ */ new Map(), ai = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	ai.push("scrollEnd");
	function oi(e, t) {
		ii.set(e, t), Mt(t, [e]);
	}
	var si = 0;
	function ci(e, t) {
		if (e.name != null && e.name !== "auto") return e.name;
		if (t.autoName !== null) return t.autoName;
		e = _d.identifierPrefix;
		var n = si++;
		return e = "_" + e + "t_" + n.toString(32) + "_", t.autoName = e;
	}
	function li(e) {
		if (e == null || typeof e == "string") return e;
		var t = null, n = Td;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = e[n[r]];
			if (i != null) {
				if (i === "none") return "none";
				t = t == null ? i : t + (" " + i);
			}
		}
		return t ?? e.default;
	}
	function ui(e, t) {
		return e = li(e), t = li(t), t == null ? e === "auto" ? null : e : t === "auto" ? null : t;
	}
	var di = typeof reportError == "function" ? reportError : function(e) {
		if (typeof window == "object" && typeof window.ErrorEvent == "function") {
			var t = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: typeof e == "object" && e && typeof e.message == "string" ? String(e.message) : String(e),
				error: e
			});
			if (!window.dispatchEvent(t)) return;
		} else if (typeof process == "object" && typeof process.emit == "function") {
			process.emit("uncaughtException", e);
			return;
		}
		console.error(e);
	}, fi = [], pi = 0, mi = 0;
	function hi() {
		for (var e = pi, t = mi = pi = 0; t < e;) {
			var n = fi[t];
			fi[t++] = null;
			var r = fi[t];
			fi[t++] = null;
			var i = fi[t];
			fi[t++] = null;
			var a = fi[t];
			if (fi[t++] = null, r !== null && i !== null) {
				var o = r.pending;
				o === null ? i.next = i : (i.next = o.next, o.next = i), r.pending = i;
			}
			a !== 0 && yi(n, i, a);
		}
	}
	function gi(e, t, n, r) {
		fi[pi++] = e, fi[pi++] = t, fi[pi++] = n, fi[pi++] = r, mi |= r, e.lanes |= r, e = e.alternate, e !== null && (e.lanes |= r);
	}
	function _i(e, t, n, r) {
		return gi(e, t, n, r), bi(e);
	}
	function vi(e, t) {
		return gi(e, null, null, t), bi(e);
	}
	function yi(e, t, n) {
		e.lanes |= n;
		var r = e.alternate;
		r !== null && (r.lanes |= n);
		for (var i = !1, a = e.return; a !== null;) a.childLanes |= n, r = a.alternate, r !== null && (r.childLanes |= n), a.tag === 22 && (e = a.stateNode, e === null || e._visibility & 1 || (i = !0)), e = a, a = a.return;
		return e.tag === 3 ? (a = e.stateNode, i && t !== null && (i = 31 - Ze(n), e = a.hiddenUpdates, r = e[i], r === null ? e[i] = [t] : r.push(t), t.lane = n | 536870912), a) : null;
	}
	function bi(e) {
		if (50 < Ed) throw Ed = 0, Dd = null, Error(s(185));
		for (var t = e.return; t !== null;) e = t, t = e.return;
		return e.tag === 3 ? e.stateNode : null;
	}
	var xi = {};
	function Si(e, t, n, r) {
		this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = r, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
	}
	function Ci(e, t, n, r) {
		return new Si(e, t, n, r);
	}
	function wi(e) {
		return e = e.prototype, !(!e || !e.isReactComponent);
	}
	function Ti(e, t) {
		var n = e.alternate;
		return n === null ? (n = Ci(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 1206910976, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
	}
	function Ei(e, t) {
		e.flags &= 1206910978;
		var n = e.alternate;
		return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
			lanes: t.lanes,
			firstContext: t.firstContext
		}), e;
	}
	function Di(e, t, n, r, i, a) {
		var o = 0;
		if (r = e, typeof r == "function") wi(r) && (o = 1);
		else if (typeof r == "string") o = qm(e, n, Se.current) ? 26 : e === "html" || e === "head" || e === "body" ? 27 : 5;
		else a: switch (r) {
			case se: return e = Ci(31, n, t, i), e.elementType = se, e.lanes = a, e;
			case A: return Oi(n.children, i, a, t);
			case j:
				o = 8, i |= 24;
				break;
			case M: return e = Ci(12, n, t, i | 2), e.elementType = M, e.lanes = a, e;
			case re: return e = Ci(13, n, t, i), e.elementType = re, e.lanes = a, e;
			case ie: return e = Ci(19, n, t, i), e.elementType = ie, e.lanes = a, e;
			case ce:
			case P: return e = i | 32, e = Ci(30, n, t, e), e.elementType = P, e.lanes = a, e.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}, e;
			default:
				if (typeof r == "object" && r) switch (r.$$typeof) {
					case N:
						o = 10;
						break a;
					case te:
						o = 9;
						break a;
					case ne:
						o = 11;
						break a;
					case ae:
						o = 14;
						break a;
					case oe:
						o = 16, r = null;
						break a;
				}
				o = 29, n = Error(s(130, e === null ? "null" : typeof e, "")), r = null;
		}
		return t = Ci(o, n, t, i), t.elementType = e, t.type = r, t.lanes = a, t;
	}
	function Oi(e, t, n, r) {
		return e = Ci(7, e, r, t), e.lanes = n, e;
	}
	function ki(e, t, n) {
		return e = Ci(6, e, null, t), e.lanes = n, e;
	}
	function Ai(e) {
		var t = Ci(18, null, null, 0);
		return t.stateNode = e, t;
	}
	function ji(e, t, n) {
		return t = Ci(4, e.children === null ? [] : e.children, e.key, t), t.lanes = n, t.stateNode = {
			containerInfo: e.containerInfo,
			pendingChildren: null,
			implementation: e.implementation
		}, t;
	}
	var Mi = /* @__PURE__ */ new WeakMap();
	function Ni(e, t) {
		if (typeof e == "object" && e) {
			var n = Mi.get(e);
			return n === void 0 ? (t = {
				value: e,
				source: t,
				stack: R(t)
			}, Mi.set(e, t), t) : n;
		}
		return {
			value: e,
			source: t,
			stack: R(t)
		};
	}
	var Pi = [], Fi = 0, Ii = null, Li = 0, Ri = [], zi = 0, Bi = null, Vi = 1, Hi = "";
	function Ui(e, t) {
		Pi[Fi++] = Li, Pi[Fi++] = Ii, Ii = e, Li = t;
	}
	function Wi(e, t, n) {
		Ri[zi++] = Vi, Ri[zi++] = Hi, Ri[zi++] = Bi, Bi = e;
		var r = Vi;
		e = Hi;
		var i = 32 - Ze(r) - 1;
		r &= ~(1 << i), n += 1;
		var a = 32 - Ze(t) + i;
		if (30 < a) {
			var o = i - i % 5;
			a = (r & (1 << o) - 1).toString(32), r >>= o, i -= o, Vi = 1 << 32 - Ze(t) + i | n << i | r, Hi = a + e;
		} else Vi = 1 << a | n << i | r, Hi = e;
	}
	function Gi(e) {
		e.return !== null && (Ui(e, 1), Wi(e, 1, 0));
	}
	function Ki(e) {
		for (; e === Ii;) Ii = Pi[--Fi], Pi[Fi] = null, Li = Pi[--Fi], Pi[Fi] = null;
		for (; e === Bi;) Bi = Ri[--zi], Ri[zi] = null, Hi = Ri[--zi], Ri[zi] = null, Vi = Ri[--zi], Ri[zi] = null;
	}
	function qi(e, t) {
		Ri[zi++] = Vi, Ri[zi++] = Hi, Ri[zi++] = Bi, Vi = t.id, Hi = t.overflow, Bi = e;
	}
	var Ji = null, Yi = null, Y = !1, Xi = null, Zi = !1, Qi = Error(s(519));
	function $i(e) {
		throw aa(Ni(Error(s(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", "")), e)), Qi;
	}
	function ea(e) {
		var t = e.stateNode, n = e.type, r = e.memoizedProps;
		switch (t[H] = e, t[U] = r, n) {
			case "dialog":
				Bf("cancel", t), Bf("close", t);
				break;
			case "iframe":
			case "object":
			case "embed":
				Bf("load", t);
				break;
			case "video":
			case "audio":
				for (n = 0; n < Lf.length; n++) Bf(Lf[n], t);
				break;
			case "source":
				Bf("error", t);
				break;
			case "img":
			case "image":
			case "link":
				Bf("error", t), Bf("load", t);
				break;
			case "details":
				Bf("toggle", t);
				break;
			case "input":
				Bf("invalid", t), Xt(t, r.value, r.defaultValue, r.checked, r.defaultChecked, r.type, r.name, !0);
				break;
			case "select":
				Bf("invalid", t);
				break;
			case "textarea": Bf("invalid", t), en(t, r.value, r.defaultValue, r.children);
		}
		n = r.children, typeof n != "string" && typeof n != "number" && typeof n != "bigint" || t.textContent === "" + n || !0 === r.suppressHydrationWarning || $f(t.textContent, n) ? (r.popover != null && (Bf("beforetoggle", t), Bf("toggle", t)), r.onScroll != null && Bf("scroll", t), r.onScrollEnd != null && Bf("scrollend", t), r.onClick != null && (t.onclick = un), t = !0) : t = !1, t || $i(e, !0);
	}
	function ta(e) {
		for (Ji = e.return; Ji;) switch (Ji.tag) {
			case 5:
			case 31:
			case 13:
				Zi = !1;
				return;
			case 27:
			case 3:
				Zi = !0;
				return;
			default: Ji = Ji.return;
		}
	}
	function na(e) {
		if (e !== Ji) return !1;
		if (!Y) return ta(e), Y = !0, !1;
		var t = e.tag, n;
		if ((n = t !== 3 && t !== 27) && ((n = t === 5) && (n = e.type, n = n === "form" || n === "button" || pp(e.type, e.memoizedProps)), n = !n), n && Yi && $i(e), ta(e), t === 13) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			Yi = dm(e);
		} else if (t === 31) {
			if (e = e.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(317));
			Yi = dm(e);
		} else t === 27 ? (t = Yi, Sp(e.type) ? (e = um, um = null, Yi = e) : Yi = t) : Yi = Ji ? lm(e.stateNode.nextSibling) : null;
		return !0;
	}
	function ra() {
		Yi = Ji = null, Y = !1;
	}
	function ia() {
		var e = Xi;
		return e !== null && (ld === null ? ld = e : ld.push.apply(ld, e), Xi = null), e;
	}
	function aa(e) {
		Xi === null ? Xi = [e] : Xi.push(e);
	}
	var oa = ye(null), sa = null, ca = null;
	function la(e, t, n) {
		xe(oa, t._currentValue), t._currentValue = n;
	}
	function ua(e) {
		e._currentValue = oa.current, be(oa);
	}
	function da(e, t, n) {
		for (; e !== null;) {
			var r = e.alternate;
			if ((e.childLanes & t) === t ? r !== null && (r.childLanes & t) !== t && (r.childLanes |= t) : (e.childLanes |= t, r !== null && (r.childLanes |= t)), e === n) break;
			e = e.return;
		}
	}
	function fa(e, t, n, r) {
		var i = e.child;
		for (i !== null && (i.return = e); i !== null;) {
			var a = i.dependencies;
			if (a !== null) {
				var o = i.child;
				a = a.firstContext;
				a: for (; a !== null;) {
					var c = a;
					a = i;
					for (var l = 0; l < t.length; l++) if (c.context === t[l]) {
						a.lanes |= n, c = a.alternate, c !== null && (c.lanes |= n), da(a.return, n, e), r || (o = null);
						break a;
					}
					a = c.next;
				}
			} else if (i.tag === 18) {
				if (o = i.return, o === null) throw Error(s(341));
				o.lanes |= n, a = o.alternate, a !== null && (a.lanes |= n), da(o, n, e), o = null;
			} else i.tag === 13 && i.memoizedState !== null && i.memoizedState.dehydrated === null ? (i.lanes |= n, o = i.alternate, o !== null && (o.lanes |= n), da(i.return, n, e), o = i.child, o = o === null ? null : o.sibling) : o = i.child;
			if (o !== null) o.return = i;
			else for (o = i; o !== null;) {
				if (o === e) {
					o = null;
					break;
				}
				if (i = o.sibling, i !== null) {
					i.return = o.return, o = i;
					break;
				}
				o = o.return;
			}
			i = o;
		}
	}
	function pa(e, t, n, r) {
		e = null;
		for (var i = t, a = !1; i !== null;) {
			if (!a) {
				if (i.flags & 524288) a = !0;
				else if (i.flags & 262144) break;
			}
			if (i.tag === 10) {
				var o = i.alternate;
				if (o === null) throw Error(s(387));
				if (o = o.memoizedProps, o !== null) {
					var c = i.type;
					Mr(i.pendingProps.value, o.value) || (e === null ? e = [c] : e.push(c));
				}
			} else if (i === Te.current) {
				if (o = i.alternate, o === null) throw Error(s(387));
				o.memoizedState.memoizedState !== i.memoizedState.memoizedState && (e === null ? e = [sh] : e.push(sh));
			}
			i = i.return;
		}
		return e !== null && fa(t, e, n, r), t.flags |= 262144, e !== null;
	}
	function ma(e) {
		for (e = e.firstContext; e !== null;) {
			if (!Mr(e.context._currentValue, e.memoizedValue)) return !0;
			e = e.next;
		}
		return !1;
	}
	function ha(e) {
		sa = e, ca = null, e = e.dependencies, e !== null && (e.firstContext = null);
	}
	function ga(e) {
		return va(sa, e);
	}
	function _a(e, t) {
		return sa === null && ha(e), va(e, t);
	}
	function va(e, t) {
		var n = t._currentValue;
		if (t = {
			context: t,
			memoizedValue: n,
			next: null
		}, ca === null) {
			if (e === null) throw Error(s(308));
			ca = t, e.dependencies = {
				lanes: 0,
				firstContext: t
			}, e.flags |= 524288;
		} else ca = ca.next = t;
		return n;
	}
	var ya = typeof AbortController < "u" ? AbortController : function() {
		var e = [], t = this.signal = {
			aborted: !1,
			addEventListener: function(t, n) {
				e.push(n);
			}
		};
		this.abort = function() {
			t.aborted = !0, e.forEach(function(e) {
				return e();
			});
		};
	}, ba = t.unstable_scheduleCallback, xa = t.unstable_NormalPriority, Sa = {
		$$typeof: N,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function Ca() {
		return {
			controller: new ya(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function wa(e) {
		e.refCount--, e.refCount === 0 && ba(xa, function() {
			e.controller.abort();
		});
	}
	function Ta(e, t) {
		if (e.pendingLanes & 4194048) {
			var n = e.transitionTypes;
			for (n === null && (n = e.transitionTypes = []), e = 0; e < t.length; e++) {
				var r = t[e];
				n.indexOf(r) === -1 && n.push(r);
			}
		}
	}
	var Ea = null;
	function Da(e) {
		var t = e.transitionTypes;
		return e.transitionTypes = null, t;
	}
	var Oa = null, ka = 0, Aa = 0, ja = null;
	function Ma(e, t) {
		if (Oa === null) {
			var n = Oa = [];
			ka = 0, Aa = Mf(), ja = {
				status: "pending",
				value: void 0,
				then: function(e) {
					n.push(e);
				}
			};
		}
		return ka++, t.then(Na, Na), t;
	}
	function Na() {
		if (--ka === 0 && (Ea = null, Oa !== null)) {
			ja !== null && (ja.status = "fulfilled");
			var e = Oa;
			Oa = null, Aa = 0, ja = null;
			for (var t = 0; t < e.length; t++) (0, e[t])();
		}
	}
	function Pa(e, t) {
		var n = [], r = {
			status: "pending",
			value: null,
			reason: null,
			then: function(e) {
				n.push(e);
			}
		};
		return e.then(function() {
			r.status = "fulfilled", r.value = t;
			for (var e = 0; e < n.length; e++) (0, n[e])(t);
		}, function(e) {
			for (r.status = "rejected", r.reason = e, e = 0; e < n.length; e++) (0, n[e])(void 0);
		}), r;
	}
	var Fa = F.S;
	F.S = function(e, t) {
		if (fd = ze(), typeof t == "object" && t && typeof t.then == "function" && Ma(e, t), Ea !== null) for (var n = vf; n !== null;) Ta(n, Ea), n = n.next;
		if (n = e.types, n !== null) {
			for (var r = vf; r !== null;) Ta(r, n), r = r.next;
			if (Aa !== 0) {
				r = Ea, r === null && (r = Ea = []);
				for (var i = 0; i < n.length; i++) {
					var a = n[i];
					r.indexOf(a) === -1 && r.push(a);
				}
			}
		}
		Fa !== null && Fa(e, t);
	};
	var Ia = ye(null);
	function La() {
		var e = Ia.current;
		return e === null ? qu.pooledCache : e;
	}
	function Ra(e, t) {
		t === null ? xe(Ia, Ia.current) : xe(Ia, t.pool);
	}
	function za() {
		var e = La();
		return e === null ? null : {
			parent: Sa._currentValue,
			pool: e
		};
	}
	var Ba = Error(s(460)), X = Error(s(474)), Z = Error(s(542)), Va = { then: function() {} };
	function Ha(e) {
		return e = e.status, e === "fulfilled" || e === "rejected";
	}
	function Ua(e, t, n) {
		switch (n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(un, un), t = n), t.status) {
			case "fulfilled": return t.value;
			case "rejected": throw e = t.reason, qa(e), e === void 0 && !("reason" in t) ? Error(s(600)) : e;
			default:
				if (typeof t.status == "string") t.then(un, un);
				else {
					if (e = qu, e !== null && 100 < e.shellSuspendCounter) throw Error(s(482));
					e = t, e.status = "pending", e.then(function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "fulfilled", n.value = e;
						}
					}, function(e) {
						if (t.status === "pending") {
							var n = t;
							n.status = "rejected", n.reason = e;
						}
					});
				}
				switch (t.status) {
					case "fulfilled": return t.value;
					case "rejected": throw e = t.reason, qa(e), e;
				}
				throw Ga = t, Ba;
		}
	}
	function Wa(e) {
		try {
			var t = e._init;
			return t(e._payload);
		} catch (e) {
			throw typeof e == "object" && e && typeof e.then == "function" ? (Ga = e, Ba) : e;
		}
	}
	var Ga = null;
	function Ka() {
		if (Ga === null) throw Error(s(459));
		var e = Ga;
		return Ga = null, e;
	}
	function qa(e) {
		if (e === Ba || e === Z) throw Error(s(483));
	}
	var Ja = null, Ya = 0;
	function Xa(e) {
		var t = Ya;
		return Ya += 1, Ja === null && (Ja = []), Ua(Ja, e, t);
	}
	function Za(e, t) {
		t = t.props.ref, e.ref = t === void 0 ? null : t;
	}
	function Qa(e, t) {
		throw t.$$typeof === O ? Error(s(525)) : (e = Object.prototype.toString.call(t), Error(s(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
	}
	function $a(e) {
		function t(t, n) {
			if (e) {
				var r = t.deletions;
				r === null ? (t.deletions = [n], t.flags |= 16) : r.push(n);
			}
		}
		function n(n, r) {
			if (!e) return null;
			for (; r !== null;) t(n, r), r = r.sibling;
			return null;
		}
		function r(e) {
			for (var t = /* @__PURE__ */ new Map(); e !== null;) e.key === null ? t.set(e.index, e) : t.set(e.key, e), e = e.sibling;
			return t;
		}
		function i(e, t) {
			return e = Ti(e, t), e.index = 0, e.sibling = null, e;
		}
		function a(t, n, r) {
			return t.index = r, e ? (r = t.alternate, r === null ? (t.flags |= 134217730, n) : (r = r.index, r < n ? (t.flags |= 2, n) : r)) : (t.flags |= 1048576, n);
		}
		function o(t) {
			return e && t.alternate === null && (t.flags |= 134217730), t;
		}
		function c(e, t, n, r) {
			return t === null || t.tag !== 6 ? (t = ki(n, e.mode, r), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function l(e, t, n, r) {
			var a = n.type;
			return a === A ? (e = d(e, t, n.props.children, r, n.key), Za(e, n), e) : t !== null && (t.elementType === a || typeof a == "object" && a && a.$$typeof === oe && Wa(a) === t.type) ? (t = i(t, n.props), Za(t, n), t.return = e, t) : (t = Di(n.type, n.key, n.props, null, e.mode, r), Za(t, n), t.return = e, t);
		}
		function u(e, t, n, r) {
			return t === null || t.tag !== 4 || t.stateNode.containerInfo !== n.containerInfo || t.stateNode.implementation !== n.implementation ? (t = ji(n, e.mode, r), t.return = e, t) : (t = i(t, n.children || []), t.return = e, t);
		}
		function d(e, t, n, r, a) {
			return t === null || t.tag !== 7 ? (t = Oi(n, e.mode, r, a), t.return = e, t) : (t = i(t, n), t.return = e, t);
		}
		function f(e, t, n) {
			if (typeof t == "string" && t !== "" || typeof t == "number" || typeof t == "bigint") return t = ki("" + t, e.mode, n), t.return = e, t;
			if (typeof t == "object" && t) {
				switch (t.$$typeof) {
					case ee: return n = Di(t.type, t.key, t.props, null, e.mode, n), Za(n, t), n.return = e, n;
					case k: return t = ji(t, e.mode, n), t.return = e, t;
					case oe: return t = Wa(t), f(e, t, n);
				}
				if (he(t) || fe(t)) return t = Oi(t, e.mode, n, null), t.return = e, t;
				if (typeof t.then == "function") return f(e, Xa(t), n);
				if (t.$$typeof === N) return f(e, _a(e, t), n);
				Qa(e, t);
			}
			return null;
		}
		function p(e, t, n, r) {
			var i = t === null ? null : t.key;
			if (typeof n == "string" && n !== "" || typeof n == "number" || typeof n == "bigint") return i === null ? c(e, t, "" + n, r) : null;
			if (typeof n == "object" && n) {
				switch (n.$$typeof) {
					case ee: return n.key === i ? l(e, t, n, r) : null;
					case k: return n.key === i ? u(e, t, n, r) : null;
					case oe: return n = Wa(n), p(e, t, n, r);
				}
				if (he(n) || fe(n)) return i === null ? d(e, t, n, r, null) : null;
				if (typeof n.then == "function") return p(e, t, Xa(n), r);
				if (n.$$typeof === N) return p(e, t, _a(e, n), r);
				Qa(e, n);
			}
			return null;
		}
		function m(e, t, n, r, i) {
			if (typeof r == "string" && r !== "" || typeof r == "number" || typeof r == "bigint") return e = e.get(n) || null, c(t, e, "" + r, i);
			if (typeof r == "object" && r) {
				switch (r.$$typeof) {
					case ee: return e = e.get(r.key === null ? n : r.key) || null, l(t, e, r, i);
					case k: return e = e.get(r.key === null ? n : r.key) || null, u(t, e, r, i);
					case oe: return r = Wa(r), m(e, t, n, r, i);
				}
				if (he(r) || fe(r)) return e = e.get(n) || null, d(t, e, r, i, null);
				if (typeof r.then == "function") return m(e, t, n, Xa(r), i);
				if (r.$$typeof === N) return m(e, t, n, _a(t, r), i);
				Qa(t, r);
			}
			return null;
		}
		function h(i, o, s, c) {
			for (var l = null, u = null, d = o, h = o = 0, g = null; d !== null && h < s.length; h++) {
				d.index > h ? (g = d, d = null) : g = d.sibling;
				var _ = p(i, d, s[h], c);
				if (_ === null) {
					d === null && (d = g);
					break;
				}
				e && d && _.alternate === null && t(i, d), o = a(_, o, h), u === null ? l = _ : u.sibling = _, u = _, d = g;
			}
			if (h === s.length) return n(i, d), Y && Ui(i, h), l;
			if (d === null) {
				for (; h < s.length; h++) d = f(i, s[h], c), d !== null && (o = a(d, o, h), u === null ? l = d : u.sibling = d, u = d);
				return Y && Ui(i, h), l;
			}
			for (d = r(d); h < s.length; h++) g = m(d, i, h, s[h], c), g !== null && (e && (_ = g.alternate, _ !== null && d.delete(_.key === null ? h : _.key)), o = a(g, o, h), u === null ? l = g : u.sibling = g, u = g);
			return e && d.forEach(function(e) {
				return t(i, e);
			}), Y && Ui(i, h), l;
		}
		function g(i, o, c, l) {
			if (c == null) throw Error(s(151));
			for (var u = null, d = null, h = o, g = o = 0, _ = null, v = c.next(); h !== null && !v.done; g++, v = c.next()) {
				h.index > g ? (_ = h, h = null) : _ = h.sibling;
				var y = p(i, h, v.value, l);
				if (y === null) {
					h === null && (h = _);
					break;
				}
				e && h && y.alternate === null && t(i, h), o = a(y, o, g), d === null ? u = y : d.sibling = y, d = y, h = _;
			}
			if (v.done) return n(i, h), Y && Ui(i, g), u;
			if (h === null) {
				for (; !v.done; g++, v = c.next()) v = f(i, v.value, l), v !== null && (o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
				return Y && Ui(i, g), u;
			}
			for (h = r(h); !v.done; g++, v = c.next()) v = m(h, i, g, v.value, l), v !== null && (e && (_ = v.alternate, _ !== null && h.delete(_.key === null ? g : _.key)), o = a(v, o, g), d === null ? u = v : d.sibling = v, d = v);
			return e && h.forEach(function(e) {
				return t(i, e);
			}), Y && Ui(i, g), u;
		}
		function _(e, r, a, c) {
			if (typeof a == "object" && a && a.type === A && a.key === null && a.props.ref === void 0 && (a = a.props.children), typeof a == "object" && a) {
				switch (a.$$typeof) {
					case ee:
						a: {
							for (var l = a.key; r !== null;) {
								if (r.key === l) {
									if (l = a.type, l === A) {
										if (r.tag === 7) {
											n(e, r.sibling), c = i(r, a.props.children), Za(c, a), c.return = e, e = c;
											break a;
										}
									} else if (r.elementType === l || typeof l == "object" && l && l.$$typeof === oe && Wa(l) === r.type) {
										n(e, r.sibling), c = i(r, a.props), Za(c, a), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							a.type === A ? (c = Oi(a.props.children, e.mode, c, a.key), Za(c, a), c.return = e, e = c) : (c = Di(a.type, a.key, a.props, null, e.mode, c), Za(c, a), c.return = e, e = c);
						}
						return o(e);
					case k:
						a: {
							for (l = a.key; r !== null;) {
								if (r.key === l) {
									if (r.tag === 4 && r.stateNode.containerInfo === a.containerInfo && r.stateNode.implementation === a.implementation) {
										n(e, r.sibling), c = i(r, a.children || []), c.return = e, e = c;
										break a;
									}
									n(e, r);
									break;
								}
								t(e, r), r = r.sibling;
							}
							c = ji(a, e.mode, c), c.return = e, e = c;
						}
						return o(e);
					case oe: return a = Wa(a), _(e, r, a, c);
				}
				if (he(a)) return h(e, r, a, c);
				if (fe(a)) {
					if (l = fe(a), typeof l != "function") throw Error(s(150));
					return a = l.call(a), g(e, r, a, c);
				}
				if (typeof a.then == "function") return _(e, r, Xa(a), c);
				if (a.$$typeof === N) return _(e, r, _a(e, a), c);
				Qa(e, a);
			}
			return typeof a == "string" && a !== "" || typeof a == "number" || typeof a == "bigint" ? (a = "" + a, r !== null && r.tag === 6 ? (n(e, r.sibling), c = i(r, a), c.return = e, e = c) : (n(e, r), c = ki(a, e.mode, c), c.return = e, e = c), o(e)) : n(e, r);
		}
		return function(e, t, n, r) {
			try {
				Ya = 0;
				var i = _(e, t, n, r);
				return Ja = null, i;
			} catch (t) {
				if (t === Ba || t === Z) throw t;
				var a = Ci(29, t, null, e.mode);
				return a.lanes = r, a.return = e, a;
			}
		};
	}
	var eo = $a(!0), to = $a(!1), no = !1;
	function ro(e) {
		e.updateQueue = {
			baseState: e.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				lanes: 0,
				hiddenCallbacks: null
			},
			callbacks: null
		};
	}
	function io(e, t) {
		e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
			baseState: e.baseState,
			firstBaseUpdate: e.firstBaseUpdate,
			lastBaseUpdate: e.lastBaseUpdate,
			shared: e.shared,
			callbacks: null
		});
	}
	function ao(e) {
		return {
			lane: e,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function oo(e, t, n) {
		var r = e.updateQueue;
		if (r === null) return null;
		if (r = r.shared, Ku & 2) {
			var i = r.pending;
			return i === null ? t.next = t : (t.next = i.next, i.next = t), r.pending = t, t = bi(e), yi(e, null, n), t;
		}
		return gi(e, r, t, n), bi(e);
	}
	function so(e, t, n) {
		if (t = t.updateQueue, t !== null && (t = t.shared, n & 4194048)) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, ft(e, n);
		}
	}
	function co(e, t) {
		var n = e.updateQueue, r = e.alternate;
		if (r !== null && (r = r.updateQueue, n === r)) {
			var i = null, a = null;
			if (n = n.firstBaseUpdate, n !== null) {
				do {
					var o = {
						lane: n.lane,
						tag: n.tag,
						payload: n.payload,
						callback: null,
						next: null
					};
					a === null ? i = a = o : a = a.next = o, n = n.next;
				} while (n !== null);
				a === null ? i = a = t : a = a.next = t;
			} else i = a = t;
			n = {
				baseState: r.baseState,
				firstBaseUpdate: i,
				lastBaseUpdate: a,
				shared: r.shared,
				callbacks: r.callbacks
			}, e.updateQueue = n;
		} else e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
	}
	var lo = !1;
	function uo() {
		if (lo) {
			var e = ja;
			if (e !== null) throw e;
		}
	}
	function fo(e, t, n, r) {
		lo = !1;
		var i = e.updateQueue;
		no = !1;
		var a = i.firstBaseUpdate, o = i.lastBaseUpdate, s = i.shared.pending;
		if (s !== null) {
			i.shared.pending = null;
			var c = s, l = c.next;
			c.next = null, o === null ? a = l : o.next = l, o = c;
			var u = e.alternate;
			u !== null && (u = u.updateQueue, s = u.lastBaseUpdate, s !== o && (s === null ? u.firstBaseUpdate = l : s.next = l, u.lastBaseUpdate = c));
		}
		if (a !== null) {
			var d = i.baseState;
			o = 0, u = l = c = null, s = a;
			do {
				var f = s.lane & -536870913, p = f !== s.lane;
				if (p ? (Yu & f) === f : (r & f) === f) {
					f !== 0 && f === Aa && (lo = !0), u !== null && (u = u.next = {
						lane: 0,
						tag: s.tag,
						payload: s.payload,
						callback: null,
						next: null
					});
					a: {
						var m = e, h = s;
						f = t;
						var g = n;
						switch (h.tag) {
							case 1:
								if (m = h.payload, typeof m == "function") {
									d = m.call(g, d, f);
									break a;
								}
								d = m;
								break a;
							case 3: m.flags = m.flags & -65537 | 128;
							case 0:
								if (m = h.payload, f = typeof m == "function" ? m.call(g, d, f) : m, f == null) break a;
								d = D({}, d, f);
								break a;
							case 2: no = !0;
						}
					}
					f = s.callback, f !== null && (e.flags |= 64, p && (e.flags |= 8192), p = i.callbacks, p === null ? i.callbacks = [f] : p.push(f));
				} else p = {
					lane: f,
					tag: s.tag,
					payload: s.payload,
					callback: s.callback,
					next: null
				}, u === null ? (l = u = p, c = d) : u = u.next = p, o |= f;
				if (s = s.next, s === null) {
					if (s = i.shared.pending, s === null) break;
					p = s, s = p.next, p.next = null, i.lastBaseUpdate = p, i.shared.pending = null;
				}
			} while (1);
			u === null && (c = d), i.baseState = c, i.firstBaseUpdate = l, i.lastBaseUpdate = u, a === null && (i.shared.lanes = 0), rd |= o, e.lanes = o, e.memoizedState = d;
		}
	}
	function po(e, t) {
		if (typeof e != "function") throw Error(s(191, e));
		e.call(t);
	}
	function mo(e, t) {
		var n = e.callbacks;
		if (n !== null) for (e.callbacks = null, e = 0; e < n.length; e++) po(n[e], t);
	}
	var ho = ye(null), go = ye(0);
	function _o(e, t) {
		e = td, xe(go, e), xe(ho, t), td = e | t.baseLanes;
	}
	function vo() {
		xe(go, td), xe(ho, ho.current);
	}
	function yo() {
		td = go.current, be(ho), be(go);
	}
	var bo = ye(null), xo = null;
	function So(e) {
		var t = e.alternate;
		xe(Do, Do.current & 1), xe(bo, e), xo === null && (t === null || ho.current !== null || t.memoizedState !== null) && (xo = e);
	}
	function Co(e) {
		xe(Do, Do.current), xe(bo, e), xo === null && (xo = e);
	}
	function wo(e) {
		e.tag === 22 ? (xe(Do, Do.current), xe(bo, e), xo === null && (xo = e)) : To();
	}
	function To() {
		xe(Do, Do.current), xe(bo, bo.current);
	}
	function Eo(e) {
		be(bo), xo === e && (xo = null), be(Do);
	}
	var Do = ye(0);
	function Oo(e, t) {
		xe(bo, bo.current), xe(Do, t);
	}
	function ko(e) {
		be(Do), be(bo), xo === e && (xo = null);
	}
	function Ao(e) {
		for (var t = e; t !== null;) {
			if (t.tag === 13) {
				var n = t.memoizedState;
				if (n !== null && (n = n.dehydrated, n === null || om(n) || sm(n))) return t;
			} else if (t.tag === 19 && t.memoizedProps.revealOrder !== "independent") {
				if (t.flags & 128) return t;
			} else if (t.child !== null) {
				t.child.return = t, t = t.child;
				continue;
			}
			if (t === e) break;
			for (; t.sibling === null;) {
				if (t.return === null || t.return === e) return null;
				t = t.return;
			}
			t.sibling.return = t.return, t = t.sibling;
		}
		return null;
	}
	var jo = 0, Q = null, Mo = null, No = null, Po = !1, Fo = !1, Io = !1, Lo = 0, Ro = 0, zo = null, Bo = 0;
	function Vo() {
		throw Error(s(321));
	}
	function Ho(e, t) {
		if (t === null) return !1;
		for (var n = 0; n < t.length && n < e.length; n++) if (!Mr(e[n], t[n])) return !1;
		return !0;
	}
	function Uo(e, t, n, r, i, a) {
		return jo = a, Q = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, F.H = e === null || e.memoizedState === null ? oc : sc, Io = !1, a = n(r, i), Io = !1, Fo && (a = Go(t, n, r, i)), Wo(e), a;
	}
	function Wo(e) {
		F.H = ac;
		var t = Mo !== null && Mo.next !== null;
		if (jo = 0, No = Mo = Q = null, Po = !1, Ro = 0, zo = null, t) throw Error(s(300));
		e === null || wc || (e = e.dependencies, e !== null && ma(e) && (wc = !0));
	}
	function Go(e, t, n, r) {
		Q = e;
		var i = 0;
		do {
			if (Fo && (zo = null), Ro = 0, Fo = !1, 25 <= i) throw Error(s(301));
			if (i += 1, No = Mo = null, e.updateQueue != null) {
				var a = e.updateQueue;
				a.lastEffect = null, a.events = null, a.stores = null, a.memoCache != null && (a.memoCache.index = 0);
			}
			F.H = cc, a = t(n, r);
		} while (Fo);
		return a;
	}
	function Ko() {
		var e = F.H, t = e.useState()[0];
		return t = typeof t.then == "function" ? $o(t) : t, e = e.useState()[0], (Mo === null ? null : Mo.memoizedState) !== e && (Q.flags |= 1024), t;
	}
	function qo() {
		var e = Lo !== 0;
		return Lo = 0, e;
	}
	function Jo(e, t, n) {
		t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
	}
	function Yo(e) {
		if (Po) {
			for (e = e.memoizedState; e !== null;) {
				var t = e.queue;
				t !== null && (t.pending = null), e = e.next;
			}
			Po = !1;
		}
		jo = 0, No = Mo = Q = null, Fo = !1, Ro = Lo = 0, zo = null;
	}
	function Xo() {
		var e = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		return No === null ? Q.memoizedState = No = e : No = No.next = e, No;
	}
	function Zo() {
		if (Mo === null) {
			var e = Q.alternate;
			e = e === null ? null : e.memoizedState;
		} else e = Mo.next;
		var t = No === null ? Q.memoizedState : No.next;
		if (t !== null) No = t, Mo = e;
		else {
			if (e === null) throw Q.alternate === null ? Error(s(467)) : Error(s(310));
			Mo = e, e = {
				memoizedState: Mo.memoizedState,
				baseState: Mo.baseState,
				baseQueue: Mo.baseQueue,
				queue: Mo.queue,
				next: null
			}, No === null ? Q.memoizedState = No = e : No = No.next = e;
		}
		return No;
	}
	function Qo() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function $o(e) {
		var t = Ro;
		return Ro += 1, zo === null && (zo = []), e = Ua(zo, e, t), t = Q, (No === null ? t.memoizedState : No.next) === null && (t = t.alternate, F.H = t === null || t.memoizedState === null ? oc : sc), e;
	}
	function es(e) {
		if (typeof e == "object" && e) {
			if (typeof e.then == "function") return $o(e);
			if (e.$$typeof === ue) return;
			if (e.$$typeof === N) return ga(e);
		}
		throw Error(s(438, String(e)));
	}
	function ts(e) {
		var t = null, n = Q.updateQueue;
		if (n !== null && (t = n.memoCache), t == null) {
			var r = Q.alternate;
			r !== null && (r = r.updateQueue, r !== null && (r = r.memoCache, r != null && (t = {
				data: r.data.map(function(e) {
					return e.slice();
				}),
				index: 0
			})));
		}
		if (t ??= {
			data: [],
			index: 0
		}, n === null && (n = Qo(), Q.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for (n = t.data[t.index] = Array(e), r = 0; r < e; r++) n[r] = le;
		return t.index++, n;
	}
	function ns(e, t) {
		return typeof t == "function" ? t(e) : t;
	}
	function rs(e) {
		return is(Zo(), Mo, e);
	}
	function is(e, t, n) {
		var r = e.queue;
		if (r === null) throw Error(s(311));
		r.lastRenderedReducer = n;
		var i = e.baseQueue, a = r.pending;
		if (a !== null) {
			if (i !== null) {
				var o = i.next;
				i.next = a.next, a.next = o;
			}
			t.baseQueue = i = a, r.pending = null;
		}
		if (a = e.baseState, i === null) e.memoizedState = a;
		else {
			t = i.next;
			var c = o = null, l = null, u = t, d = !1;
			do {
				var f = u.lane & -536870913;
				if (f === u.lane ? (jo & f) === f : (Yu & f) === f) {
					var p = u.revertLane;
					if (p === 0) l !== null && (l = l.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}), f === Aa && (d = !0);
					else if ((jo & p) === p) {
						u = u.next, p === Aa && (d = !0);
						continue;
					} else f = {
						lane: 0,
						revertLane: u.revertLane,
						gesture: null,
						action: u.action,
						hasEagerState: u.hasEagerState,
						eagerState: u.eagerState,
						next: null
					}, l === null ? (c = l = f, o = a) : l = l.next = f, Q.lanes |= p, rd |= p;
					f = u.action, Io && n(a, f), a = u.hasEagerState ? u.eagerState : n(a, f);
				} else p = {
					lane: f,
					revertLane: u.revertLane,
					gesture: u.gesture,
					action: u.action,
					hasEagerState: u.hasEagerState,
					eagerState: u.eagerState,
					next: null
				}, l === null ? (c = l = p, o = a) : l = l.next = p, Q.lanes |= f, rd |= f;
				u = u.next;
			} while (u !== null && u !== t);
			if (l === null ? o = a : l.next = c, !Mr(a, e.memoizedState) && (wc = !0, d && (n = ja, n !== null))) throw n;
			e.memoizedState = a, e.baseState = o, e.baseQueue = l, r.lastRenderedState = a;
		}
		return i === null && (r.lanes = 0), [e.memoizedState, r.dispatch];
	}
	function as(e) {
		var t = Zo(), n = t.queue;
		if (n === null) throw Error(s(311));
		n.lastRenderedReducer = e;
		var r = n.dispatch, i = n.pending, a = t.memoizedState;
		if (i !== null) {
			n.pending = null;
			var o = i = i.next;
			do
				a = e(a, o.action), o = o.next;
			while (o !== i);
			Mr(a, t.memoizedState) || (wc = !0), t.memoizedState = a, t.baseQueue === null && (t.baseState = a), n.lastRenderedState = a;
		}
		return [a, r];
	}
	function os(e, t, n) {
		var r = Q, i = Zo(), a = Y;
		if (a) {
			if (n === void 0) throw Error(s(407));
			n = n();
		} else n = t();
		var o = !Mr((Mo || i).memoizedState, n);
		if (o && (i.memoizedState = n, wc = !0), i = i.queue, js(ls.bind(null, r, i, e), [e]), e = i.getSnapshot !== t || o || No !== null && !!(No.memoizedState.tag & 1), Es(e ? 9 : 8, { destroy: void 0 }, cs.bind(null, r, i, n, t), null), e) {
			if (r.flags |= 2048, qu === null) throw Error(s(349));
			a || jo & 127 || ss(r, t, n);
		}
		return n;
	}
	function ss(e, t, n) {
		e.flags |= 16384, e = {
			getSnapshot: t,
			value: n
		}, t = Q.updateQueue, t === null ? (t = Qo(), Q.updateQueue = t, t.stores = [e]) : (n = t.stores, n === null ? t.stores = [e] : n.push(e));
	}
	function cs(e, t, n, r) {
		t.value = n, t.getSnapshot = r, us(t) && ds(e);
	}
	function ls(e, t, n) {
		return n(function() {
			us(t) && ds(e);
		});
	}
	function us(e) {
		var t = e.getSnapshot;
		e = e.value;
		try {
			var n = t();
			return !Mr(e, n);
		} catch {
			return !0;
		}
	}
	function ds(e) {
		var t = vi(e, 2);
		t !== null && jd(t, e, 2);
	}
	function fs(e) {
		var t = Xo();
		if (typeof e == "function") {
			var n = e;
			if (e = n(), Io) {
				Xe(!0);
				try {
					n();
				} finally {
					Xe(!1);
				}
			}
		}
		return t.memoizedState = t.baseState = e, t.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: ns,
			lastRenderedState: e
		}, t;
	}
	function ps(e, t, n, r) {
		return e.baseState = n, is(e, Mo, typeof r == "function" ? r : ns);
	}
	function ms(e, t, n, r, i) {
		if (nc(e)) throw Error(s(485));
		if (e = t.action, e !== null) {
			var a = {
				payload: i,
				action: e,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: function(e) {
					a.listeners.push(e);
				}
			};
			F.T === null ? a.isTransition = !1 : n(!0), r(a), n = t.pending, n === null ? (a.next = t.pending = a, hs(t, a)) : (a.next = n.next, t.pending = n.next = a);
		}
	}
	function hs(e, t) {
		var n = t.action, r = t.payload, i = e.state;
		if (t.isTransition) {
			var a = F.T, o = {};
			o.types = a === null ? null : a.types, F.T = o;
			try {
				var s = n(i, r), c = F.S;
				c !== null && c(o, s), gs(e, t, s);
			} catch (n) {
				vs(e, t, n);
			} finally {
				a !== null && o.types !== null && (a.types = o.types), F.T = a;
			}
		} else try {
			a = n(i, r), gs(e, t, a);
		} catch (n) {
			vs(e, t, n);
		}
	}
	function gs(e, t, n) {
		typeof n == "object" && n && typeof n.then == "function" ? n.then(function(n) {
			_s(e, t, n);
		}, function(n) {
			return vs(e, t, n);
		}) : _s(e, t, n);
	}
	function _s(e, t, n) {
		t.status = "fulfilled", t.value = n, ys(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, hs(e, n)));
	}
	function vs(e, t, n) {
		var r = e.pending;
		if (e.pending = null, r !== null) {
			r = r.next;
			do
				t.status = "rejected", t.reason = n, ys(t), t = t.next;
			while (t !== r);
		}
		e.action = null;
	}
	function ys(e) {
		e = e.listeners;
		for (var t = 0; t < e.length; t++) (0, e[t])();
	}
	function bs(e, t) {
		return t;
	}
	function xs(e, t) {
		if (Y) {
			var n = qu.formState;
			if (n !== null) {
				a: {
					var r = Q;
					if (Y) {
						if (Yi) {
							b: {
								for (var i = Yi, a = Zi; i.nodeType !== 8;) if (!a || (i = lm(i.nextSibling), i === null)) {
									i = null;
									break b;
								}
								a = i.data, i = a === "F!" || a === "F" ? i : null;
							}
							if (i) {
								Yi = lm(i.nextSibling), r = i.data === "F!";
								break a;
							}
						}
						$i(r);
					}
					r = !1;
				}
				r && (t = n[0]);
			}
		}
		return n = Xo(), n.memoizedState = n.baseState = t, r = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: bs,
			lastRenderedState: t
		}, n.queue = r, n = $s.bind(null, Q, r), r.dispatch = n, r = fs(!1), a = tc.bind(null, Q, !1, r.queue), r = Xo(), i = {
			state: t,
			dispatch: null,
			action: e,
			pending: null
		}, r.queue = i, n = ms.bind(null, Q, i, a, n), i.dispatch = n, r.memoizedState = e, [
			t,
			n,
			!1
		];
	}
	function Ss(e) {
		return Cs(Zo(), Mo, e);
	}
	function Cs(e, t, n) {
		if (t = is(e, t, bs)[0], e = rs(ns)[0], typeof t == "object" && t && typeof t.then == "function") try {
			var r = $o(t);
		} catch (e) {
			throw e === Ba ? Z : e;
		}
		else r = t;
		t = Zo();
		var i = t.queue, a = i.dispatch;
		return n !== t.memoizedState && (Q.flags |= 2048, Es(9, { destroy: void 0 }, ws.bind(null, i, n), null)), [
			r,
			a,
			e
		];
	}
	function ws(e, t) {
		e.action = t;
	}
	function Ts(e) {
		var t = Zo(), n = Mo;
		if (n !== null) return Cs(t, n, e);
		Zo(), t = t.memoizedState, n = Zo();
		var r = n.queue.dispatch;
		return n.memoizedState = e, [
			t,
			r,
			!1
		];
	}
	function Es(e, t, n, r) {
		return e = {
			tag: e,
			create: n,
			deps: r,
			inst: t,
			next: null
		}, t = Q.updateQueue, t === null && (t = Qo(), Q.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (r = n.next, n.next = e, e.next = r, t.lastEffect = e), e;
	}
	function Ds() {
		return Zo().memoizedState;
	}
	function Os(e, t, n, r) {
		var i = Xo();
		Q.flags |= e, i.memoizedState = Es(1 | t, { destroy: void 0 }, n, r === void 0 ? null : r);
	}
	function ks(e, t, n, r) {
		var i = Zo();
		r = r === void 0 ? null : r;
		var a = i.memoizedState.inst;
		Mo !== null && r !== null && Ho(r, Mo.memoizedState.deps) ? i.memoizedState = Es(t, a, n, r) : (Q.flags |= e, i.memoizedState = Es(1 | t, a, n, r));
	}
	function As(e, t) {
		Os(8390656, 8, e, t);
	}
	function js(e, t) {
		ks(2048, 8, e, t);
	}
	function Ms(e) {
		Q.flags |= 4;
		var t = Q.updateQueue;
		if (t === null) t = Qo(), Q.updateQueue = t, t.events = [e];
		else {
			var n = t.events;
			n === null ? t.events = [e] : n.push(e);
		}
	}
	function Ns(e) {
		var t = Zo().memoizedState;
		return Ms({
			ref: t,
			nextImpl: e
		}), function() {
			if (Ku & 2) throw Error(s(440));
			return t.impl.apply(void 0, arguments);
		};
	}
	function Ps(e, t) {
		return ks(4, 2, e, t);
	}
	function Fs(e, t) {
		return ks(4, 4, e, t);
	}
	function Is(e, t) {
		if (typeof t == "function") {
			e = e();
			var n = t(e);
			return function() {
				typeof n == "function" ? n() : t(null);
			};
		}
		if (t != null) return e = e(), t.current = e, function() {
			t.current = null;
		};
	}
	function Ls(e, t, n) {
		n = n == null ? null : n.concat([e]), ks(4, 4, Is.bind(null, t, e), n);
	}
	function Rs() {}
	function zs(e, t) {
		var n = Zo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		return t !== null && Ho(t, r[1]) ? r[0] : (n.memoizedState = [e, t], e);
	}
	function Bs(e, t) {
		var n = Zo();
		t = t === void 0 ? null : t;
		var r = n.memoizedState;
		if (t !== null && Ho(t, r[1])) return r[0];
		if (r = e(), Io) {
			Xe(!0);
			try {
				e();
			} finally {
				Xe(!1);
			}
		}
		return n.memoizedState = [r, t], r;
	}
	function Vs(e, t, n) {
		return n === void 0 || jo & 1073741824 && !(Yu & 261930) ? e.memoizedState = t : (e.memoizedState = n, e = kd(), Q.lanes |= e, rd |= e, n);
	}
	function Hs(e, t, n, r) {
		return Mr(n, t) ? n : ho.current === null ? !(jo & 106) || jo & 1073741824 && !(Yu & 261930) ? (wc = !0, e.memoizedState = n) : (e = kd(), Q.lanes |= e, rd |= e, t) : (e = Vs(e, n, r), Mr(e, t) || (wc = !0), e);
	}
	function Us(e, t, n, r, i) {
		var a = I.p;
		I.p = a !== 0 && 8 > a ? a : 8;
		var o = F.T, s = {};
		s.types = o === null ? null : o.types, F.T = s, tc(e, !1, t, n);
		try {
			var c = i(), l = F.S;
			l !== null && l(s, c), typeof c == "object" && c && typeof c.then == "function" ? ec(e, t, Pa(c, r), Od(e)) : ec(e, t, r, Od(e));
		} catch (n) {
			ec(e, t, {
				then: function() {},
				status: "rejected",
				reason: n
			}, Od());
		} finally {
			I.p = a, o !== null && s.types !== null && (o.types = s.types), F.T = o;
		}
	}
	function Ws() {}
	function Gs(e, t, n, r) {
		if (e.tag !== 5) throw Error(s(476));
		var i = Ks(e).queue;
		Us(e, i, t, ge, n === null ? Ws : function() {
			return qs(e), n(r);
		});
	}
	function Ks(e) {
		var t = e.memoizedState;
		if (t !== null) return t;
		t = {
			memoizedState: ge,
			baseState: ge,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: ns,
				lastRenderedState: ge
			},
			next: null
		};
		var n = {};
		return t.next = {
			memoizedState: n,
			baseState: n,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: ns,
				lastRenderedState: n
			},
			next: null
		}, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
	}
	function qs(e) {
		var t = Ks(e);
		t.next === null && (t = e.alternate.memoizedState), ec(e, t.next.queue, {}, Od());
	}
	function Js() {
		return ga(sh);
	}
	function Ys() {
		return Zo().memoizedState;
	}
	function Xs() {
		return Zo().memoizedState;
	}
	function Zs(e) {
		for (var t = e.return; t !== null;) {
			switch (t.tag) {
				case 24:
				case 3:
					var n = Od();
					e = ao(n);
					var r = oo(t, e, n);
					r !== null && (jd(r, t, n), so(r, t, n)), t = { cache: Ca() }, e.payload = t;
					return;
			}
			t = t.return;
		}
	}
	function Qs(e, t, n) {
		var r = Od();
		n = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, nc(e) ? rc(t, n) : (n = _i(e, t, n, r), n !== null && (jd(n, e, r), ic(n, t, r)));
	}
	function $s(e, t, n) {
		ec(e, t, n, Od());
	}
	function ec(e, t, n, r) {
		var i = {
			lane: r,
			revertLane: 0,
			gesture: null,
			action: n,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (nc(e)) rc(t, i);
		else {
			var a = e.alternate;
			if (e.lanes === 0 && (a === null || a.lanes === 0) && (a = t.lastRenderedReducer, a !== null)) try {
				var o = t.lastRenderedState, s = a(o, n);
				if (i.hasEagerState = !0, i.eagerState = s, Mr(s, o)) return gi(e, t, i, 0), qu === null && hi(), !1;
			} catch {}
			if (n = _i(e, t, i, r), n !== null) return jd(n, e, r), ic(n, t, r), !0;
		}
		return !1;
	}
	function tc(e, t, n, r) {
		if (r = {
			lane: 2,
			revertLane: Mf(),
			gesture: null,
			action: r,
			hasEagerState: !1,
			eagerState: null,
			next: null
		}, nc(e)) {
			if (t) throw Error(s(479));
		} else t = _i(e, n, r, 2), t !== null && jd(t, e, 2);
	}
	function nc(e) {
		var t = e.alternate;
		return e === Q || t !== null && t === Q;
	}
	function rc(e, t) {
		Fo = Po = !0;
		var n = e.pending;
		n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
	}
	function ic(e, t, n) {
		if (n & 4194048) {
			var r = t.lanes;
			r &= e.pendingLanes, n |= r, t.lanes = n, ft(e, n);
		}
	}
	var ac = {
		readContext: ga,
		use: es,
		useCallback: Vo,
		useContext: Vo,
		useEffect: Vo,
		useImperativeHandle: Vo,
		useLayoutEffect: Vo,
		useInsertionEffect: Vo,
		useMemo: Vo,
		useReducer: Vo,
		useRef: Vo,
		useState: Vo,
		useDebugValue: Vo,
		useDeferredValue: Vo,
		useTransition: Vo,
		useSyncExternalStore: Vo,
		useId: Vo,
		useHostTransitionStatus: Vo,
		useFormState: Vo,
		useActionState: Vo,
		useOptimistic: Vo,
		useMemoCache: Vo,
		useCacheRefresh: Vo,
		useEffectEvent: Vo
	}, oc = {
		readContext: ga,
		use: es,
		useCallback: function(e, t) {
			return Xo().memoizedState = [e, t === void 0 ? null : t], e;
		},
		useContext: ga,
		useEffect: As,
		useImperativeHandle: function(e, t, n) {
			n = n == null ? null : n.concat([e]), Os(4194308, 4, Is.bind(null, t, e), n);
		},
		useLayoutEffect: function(e, t) {
			return Os(4194308, 4, e, t);
		},
		useInsertionEffect: function(e, t) {
			Os(4, 2, e, t);
		},
		useMemo: function(e, t) {
			var n = Xo();
			t = t === void 0 ? null : t;
			var r = e();
			if (Io) {
				Xe(!0);
				try {
					e();
				} finally {
					Xe(!1);
				}
			}
			return n.memoizedState = [r, t], r;
		},
		useReducer: function(e, t, n) {
			var r = Xo();
			if (n !== void 0) {
				var i = n(t);
				if (Io) {
					Xe(!0);
					try {
						n(t);
					} finally {
						Xe(!1);
					}
				}
			} else i = t;
			return r.memoizedState = r.baseState = i, e = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: e,
				lastRenderedState: i
			}, r.queue = e, e = e.dispatch = Qs.bind(null, Q, e), [r.memoizedState, e];
		},
		useRef: function(e) {
			var t = Xo();
			return e = { current: e }, t.memoizedState = e;
		},
		useState: function(e) {
			e = fs(e);
			var t = e.queue, n = $s.bind(null, Q, t);
			return t.dispatch = n, [e.memoizedState, n];
		},
		useDebugValue: Rs,
		useDeferredValue: function(e, t) {
			return Vs(Xo(), e, t);
		},
		useTransition: function() {
			var e = fs(!1);
			return e = Us.bind(null, Q, e.queue, !0, !1), Xo().memoizedState = e, [!1, e];
		},
		useSyncExternalStore: function(e, t, n) {
			var r = Q, i = Xo();
			if (Y) {
				if (n === void 0) throw Error(s(407));
				n = n();
			} else {
				if (n = t(), qu === null) throw Error(s(349));
				Yu & 127 || ss(r, t, n);
			}
			i.memoizedState = n;
			var a = {
				value: n,
				getSnapshot: t
			};
			return i.queue = a, As(ls.bind(null, r, a, e), [e]), r.flags |= 2048, Es(9, { destroy: void 0 }, cs.bind(null, r, a, n, t), null), n;
		},
		useId: function() {
			var e = Xo(), t = qu.identifierPrefix;
			if (Y) {
				var n = Hi, r = Vi;
				n = (r & ~(1 << 32 - Ze(r) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = Lo++, 0 < n && (t += "H" + n.toString(32)), t += "_";
			} else n = Bo++, t = "_" + t + "r_" + n.toString(32) + "_";
			return e.memoizedState = t;
		},
		useHostTransitionStatus: Js,
		useFormState: xs,
		useActionState: xs,
		useOptimistic: function(e) {
			var t = Xo();
			t.memoizedState = t.baseState = e;
			var n = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			return t.queue = n, t = tc.bind(null, Q, !0, n), n.dispatch = t, [e, t];
		},
		useMemoCache: ts,
		useCacheRefresh: function() {
			return Xo().memoizedState = Zs.bind(null, Q);
		},
		useEffectEvent: function(e) {
			var t = Xo(), n = { impl: e };
			return t.memoizedState = n, function() {
				if (Ku & 2) throw Error(s(440));
				return n.impl.apply(void 0, arguments);
			};
		}
	}, sc = {
		readContext: ga,
		use: es,
		useCallback: zs,
		useContext: ga,
		useEffect: js,
		useImperativeHandle: Ls,
		useInsertionEffect: Ps,
		useLayoutEffect: Fs,
		useMemo: Bs,
		useReducer: rs,
		useRef: Ds,
		useState: function() {
			return rs(ns);
		},
		useDebugValue: Rs,
		useDeferredValue: function(e, t) {
			return Hs(Zo(), Mo.memoizedState, e, t);
		},
		useTransition: function() {
			var e = rs(ns)[0], t = Zo().memoizedState;
			return [typeof e == "boolean" ? e : $o(e), t];
		},
		useSyncExternalStore: os,
		useId: Ys,
		useHostTransitionStatus: Js,
		useFormState: Ss,
		useActionState: Ss,
		useOptimistic: function(e, t) {
			return ps(Zo(), Mo, e, t);
		},
		useMemoCache: ts,
		useCacheRefresh: Xs,
		useEffectEvent: Ns
	}, cc = {
		readContext: ga,
		use: es,
		useCallback: zs,
		useContext: ga,
		useEffect: js,
		useImperativeHandle: Ls,
		useInsertionEffect: Ps,
		useLayoutEffect: Fs,
		useMemo: Bs,
		useReducer: as,
		useRef: Ds,
		useState: function() {
			return as(ns);
		},
		useDebugValue: Rs,
		useDeferredValue: function(e, t) {
			var n = Zo();
			return Mo === null ? Vs(n, e, t) : Hs(n, Mo.memoizedState, e, t);
		},
		useTransition: function() {
			var e = as(ns)[0], t = Zo().memoizedState;
			return [typeof e == "boolean" ? e : $o(e), t];
		},
		useSyncExternalStore: os,
		useId: Ys,
		useHostTransitionStatus: Js,
		useFormState: Ts,
		useActionState: Ts,
		useOptimistic: function(e, t) {
			var n = Zo();
			return Mo === null ? (n.baseState = e, [e, n.queue.dispatch]) : ps(n, Mo, e, t);
		},
		useMemoCache: ts,
		useCacheRefresh: Xs,
		useEffectEvent: Ns
	};
	function lc(e, t, n, r) {
		t = e.memoizedState, n = n(r, t), n = n == null ? t : D({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
	}
	var uc = {
		enqueueSetState: function(e, t, n) {
			e = e._reactInternals;
			var r = Od(), i = ao(r);
			i.payload = t, n != null && (i.callback = n), t = oo(e, i, r), t !== null && (jd(t, e, r), so(t, e, r));
		},
		enqueueReplaceState: function(e, t, n) {
			e = e._reactInternals;
			var r = Od(), i = ao(r);
			i.tag = 1, i.payload = t, n != null && (i.callback = n), t = oo(e, i, r), t !== null && (jd(t, e, r), so(t, e, r));
		},
		enqueueForceUpdate: function(e, t) {
			e = e._reactInternals;
			var n = Od(), r = ao(n);
			r.tag = 2, t != null && (r.callback = t), t = oo(e, r, n), t !== null && (jd(t, e, n), so(t, e, n));
		}
	};
	function dc(e, t, n, r, i, a, o) {
		return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(r, a, o) : t.prototype && t.prototype.isPureReactComponent ? !Nr(n, r) || !Nr(i, a) : !0;
	}
	function fc(e, t, n, r) {
		e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, r), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, r), t.state !== e && uc.enqueueReplaceState(t, t.state, null);
	}
	function pc(e, t) {
		var n = t;
		if ("ref" in t) for (var r in n = {}, t) r !== "ref" && (n[r] = t[r]);
		if (e = e.defaultProps) for (var i in n === t && (n = D({}, n)), e) n[i] === void 0 && (n[i] = e[i]);
		return n;
	}
	function mc(e) {
		di(e);
	}
	function hc(e) {
		console.error(e);
	}
	function gc(e) {
		di(e);
	}
	function _c(e, t) {
		try {
			var n = e.onUncaughtError;
			n(t.value, { componentStack: t.stack });
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function vc(e, t, n) {
		try {
			var r = e.onCaughtError;
			r(n.value, {
				componentStack: n.stack,
				errorBoundary: t.tag === 1 ? t.stateNode : null
			});
		} catch (e) {
			setTimeout(function() {
				throw e;
			});
		}
	}
	function yc(e, t, n) {
		return n = ao(n), n.tag = 3, n.payload = { element: null }, n.callback = function() {
			_c(e, t);
		}, n;
	}
	function bc(e) {
		return e = ao(e), e.tag = 3, e;
	}
	function xc(e, t, n, r) {
		var i = n.type.getDerivedStateFromError;
		if (typeof i == "function") {
			var a = r.value;
			e.payload = function() {
				return i(a);
			}, e.callback = function() {
				vc(t, n, r);
			};
		}
		var o = n.stateNode;
		o !== null && typeof o.componentDidCatch == "function" && (e.callback = function() {
			vc(t, n, r), typeof i != "function" && (hd === null ? hd = /* @__PURE__ */ new Set([this]) : hd.add(this));
			var e = r.stack;
			this.componentDidCatch(r.value, { componentStack: e === null ? "" : e });
		});
	}
	function Sc(e, t, n, r, i) {
		if (n.flags |= 32768, typeof r == "object" && r && typeof r.then == "function") {
			if (t = n.alternate, t !== null && pa(t, n, i, !0), n = bo.current, n !== null) {
				switch (n.tag) {
					case 31:
					case 13:
					case 19: return xo === null ? Ud() : n.alternate === null && nd === 0 && (nd = 3), n.flags &= -257, n.flags |= 65536, n.lanes = i, r === Va ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = /* @__PURE__ */ new Set([r]) : t.add(r), ff(e, r, i)), !1;
					case 22: return n.flags |= 65536, r === Va ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([r])
					}, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = /* @__PURE__ */ new Set([r]) : n.add(r)), ff(e, r, i)), !1;
				}
				throw Error(s(435, n.tag));
			}
			return ff(e, r, i), Ud(), !1;
		}
		if (Y) return t = bo.current, t === null ? (r !== Qi && (t = Error(s(423), { cause: r }), aa(Ni(t, n))), e = e.current.alternate, e.flags |= 65536, i &= -i, e.lanes |= i, r = Ni(r, n), i = yc(e.stateNode, r, i), co(e, i), nd !== 4 && (nd = 2)) : (!(t.flags & 65536) && (t.flags |= 256), t.flags |= 65536, t.lanes = i, r !== Qi && (e = Error(s(422), { cause: r }), aa(Ni(e, n)))), !1;
		var a = Error(s(520), { cause: r });
		if (a = Ni(a, n), cd === null ? cd = [a] : cd.push(a), nd !== 4 && (nd = 2), t === null) return !0;
		r = Ni(r, n), n = t;
		do {
			switch (n.tag) {
				case 3: return n.flags |= 65536, e = i & -i, n.lanes |= e, e = yc(n.stateNode, r, e), co(n, e), !1;
				case 1:
					if (t = n.type, a = n.stateNode, !(n.flags & 128) && (typeof t.getDerivedStateFromError == "function" || a !== null && typeof a.componentDidCatch == "function" && (hd === null || !hd.has(a)))) return n.flags |= 65536, i &= -i, n.lanes |= i, i = bc(i), xc(i, e, n, r), co(n, i), !1;
					break;
				case 22: if (n.memoizedState !== null) return n.flags |= 65536, !1;
			}
			n = n.return;
		} while (n !== null);
		return !1;
	}
	var Cc = Error(s(461)), wc = !1;
	function Tc(e, t, n, r) {
		t.child = e === null ? to(t, null, n, r) : eo(t, e.child, n, r);
	}
	function Ec(e, t, n, r, i) {
		n = n.render;
		var a = t.ref;
		if ("ref" in r) {
			var o = {};
			for (var s in r) s !== "ref" && (o[s] = r[s]);
		} else o = r;
		return ha(t), r = Uo(e, t, n, o, a, i), s = qo(), e !== null && !wc ? (Jo(e, t, i), el(e, t, i)) : (Y && s && Gi(t), t.flags |= 1, Tc(e, t, r, i), t.child);
	}
	function Dc(e, t, n, r, i) {
		if (e === null) {
			var a = n.type;
			return typeof a == "function" && !wi(a) && a.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = a, Oc(e, t, a, r, i)) : (e = Di(n.type, null, r, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
		}
		if (a = e.child, !tl(e, i)) {
			var o = a.memoizedProps;
			if (n = n.compare, n = n === null ? Nr : n, n(o, r) && e.ref === t.ref) return el(e, t, i);
		}
		return t.flags |= 1, e = Ti(a, r), e.ref = t.ref, e.return = t, t.child = e;
	}
	function Oc(e, t, n, r, i) {
		if (e !== null) {
			var a = e.memoizedProps;
			if (Nr(a, r) && e.ref === t.ref) {
				if (wc = !1, t.pendingProps = r = a, tl(e, i)) e.flags & 131072 && (wc = !0);
				else return t.lanes = e.lanes, el(e, t, i);
			}
		}
		return Ic(e, t, n, r, i);
	}
	function kc(e, t, n, r) {
		var i = r.children, a = e === null ? null : e.memoizedState;
		if (e === null && t.stateNode === null && (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), r.mode === "hidden") {
			if (t.flags & 128) {
				if (a = a === null ? n : a.baseLanes | n, e !== null) {
					for (r = t.child = e.child, i = 0; r !== null;) i = i | r.lanes | r.childLanes, r = r.sibling;
					r = i & ~a;
				} else r = 0, t.child = null;
				return jc(e, t, a, n, r);
			}
			if (n & 536870912) t.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, e !== null && Ra(t, a === null ? null : a.cachePool), a === null ? vo() : _o(t, a), wo(t);
			else return r = t.lanes = 536870912, jc(e, t, a === null ? n : a.baseLanes | n, n, r);
		} else a === null ? (e !== null && Ra(t, null), vo(), To()) : (Ra(t, a.cachePool), _o(t, a), To(), t.memoizedState = null);
		return Tc(e, t, i, n), t.child;
	}
	function Ac(e, t) {
		return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		}), t.sibling;
	}
	function jc(e, t, n, r, i) {
		var a = La();
		return a = a === null ? null : {
			parent: Sa._currentValue,
			pool: a
		}, t.memoizedState = {
			baseLanes: n,
			cachePool: a
		}, e !== null && Ra(t, null), vo(), wo(t), e !== null && pa(e, t, r, !0), t.childLanes = i, null;
	}
	function Mc(e, t) {
		return t = Gc({
			mode: t.mode,
			children: t.children
		}, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
	}
	function Nc(e, t, n) {
		return eo(t, e.child, null, n), e = Mc(t, t.pendingProps), e.flags |= 2, Eo(t), t.memoizedState = null, e;
	}
	function Pc(e, t, n) {
		var r = t.pendingProps, i = !!(t.flags & 128);
		if (t.flags &= -129, e === null) {
			if (Y) {
				if (r.mode === "hidden") return e = Mc(t, r), t.lanes = 536870912, e.memoizedState = {
					baseLanes: 0,
					cachePool: null
				}, Ac(null, e);
				if (Co(t), (e = Yi) ? (e = am(e, Zi), e = e !== null && e.data === "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Bi === null ? null : {
						id: Vi,
						overflow: Hi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = Ai(e), n.return = t, t.child = n, Ji = t, Yi = null)) : e = null, e === null) throw $i(t);
				return t.lanes = 536870912, null;
			}
			return Mc(t, r);
		}
		var a = e.memoizedState;
		if (a !== null) {
			var o = a.dehydrated;
			if (Co(t), i) {
				if (t.flags & 256) t.flags &= -257, t = Nc(e, t, n);
				else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
				else throw Error(s(558));
			} else if (wc || pa(e, t, n, !1), i = (n & e.childLanes) !== 0, wc || i) {
				if (ho.current === null) {
					if (r = qu, r !== null && (o = pt(r, n), o !== 0 && o !== a.retryLane)) throw a.retryLane = o, vi(e, o), jd(r, e, o), Cc;
					Ud();
				}
				t = Nc(e, t, n);
			} else e = a.treeContext, Yi = lm(o.nextSibling), Ji = t, Y = !0, Xi = null, Zi = !1, e !== null && qi(t, e), t = Mc(t, r), t.flags |= 134221824;
			return t;
		}
		return e = Ti(e.child, {
			mode: r.mode,
			children: r.children
		}), e.ref = t.ref, t.child = e, e.return = t, e;
	}
	function Fc(e, t) {
		var n = t.ref;
		if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
		else {
			if (typeof n != "function" && typeof n != "object") throw Error(s(284));
			(e === null || e.ref !== n) && (t.flags |= 4194816);
		}
	}
	function Ic(e, t, n, r, i) {
		return ha(t), n = Uo(e, t, n, r, void 0, i), r = qo(), e !== null && !wc ? (Jo(e, t, i), el(e, t, i)) : (Y && r && Gi(t), t.flags |= 1, Tc(e, t, n, i), t.child);
	}
	function Lc(e, t, n, r, i, a) {
		return ha(t), t.updateQueue = null, n = Go(t, r, n, i), Wo(e), r = qo(), e !== null && !wc ? (Jo(e, t, a), el(e, t, a)) : (Y && r && Gi(t), t.flags |= 1, Tc(e, t, n, a), t.child);
	}
	function Rc(e, t, n, r, i) {
		if (ha(t), t.stateNode === null) {
			var a = xi, o = n.contextType;
			typeof o == "object" && o && (a = ga(o)), a = new n(r, a), t.memoizedState = a.state !== null && a.state !== void 0 ? a.state : null, a.updater = uc, t.stateNode = a, a._reactInternals = t, a = t.stateNode, a.props = r, a.state = t.memoizedState, a.refs = {}, ro(t), o = n.contextType, a.context = typeof o == "object" && o ? ga(o) : xi, a.state = t.memoizedState, o = n.getDerivedStateFromProps, typeof o == "function" && (lc(t, n, o, r), a.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof a.getSnapshotBeforeUpdate == "function" || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (o = a.state, typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount(), o !== a.state && uc.enqueueReplaceState(a, a.state, null), fo(t, r, a, i), uo(), a.state = t.memoizedState), typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !0;
		} else if (e === null) {
			a = t.stateNode;
			var s = t.memoizedProps, c = pc(n, s);
			a.props = c;
			var l = a.context, u = n.contextType;
			o = xi, typeof u == "object" && u && (o = ga(u));
			var d = n.getDerivedStateFromProps;
			u = typeof d == "function" || typeof a.getSnapshotBeforeUpdate == "function", s = t.pendingProps !== s, u || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (s || l !== o) && fc(t, a, r, o), no = !1;
			var f = t.memoizedState;
			a.state = f, fo(t, r, a, i), uo(), l = t.memoizedState, s || f !== l || no ? (typeof d == "function" && (lc(t, n, d, r), l = t.memoizedState), (c = no || dc(t, n, c, r, f, l, o)) ? (u || typeof a.UNSAFE_componentWillMount != "function" && typeof a.componentWillMount != "function" || (typeof a.componentWillMount == "function" && a.componentWillMount(), typeof a.UNSAFE_componentWillMount == "function" && a.UNSAFE_componentWillMount()), typeof a.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = r, t.memoizedState = l), a.props = r, a.state = l, a.context = o, r = c) : (typeof a.componentDidMount == "function" && (t.flags |= 4194308), r = !1);
		} else {
			a = t.stateNode, io(e, t), o = t.memoizedProps, u = pc(n, o), a.props = u, d = t.pendingProps, f = a.context, l = n.contextType, c = xi, typeof l == "object" && l && (c = ga(l)), s = n.getDerivedStateFromProps, (l = typeof s == "function" || typeof a.getSnapshotBeforeUpdate == "function") || typeof a.UNSAFE_componentWillReceiveProps != "function" && typeof a.componentWillReceiveProps != "function" || (o !== d || f !== c) && fc(t, a, r, c), no = !1, f = t.memoizedState, a.state = f, fo(t, r, a, i), uo();
			var p = t.memoizedState;
			o !== d || f !== p || no || e !== null && e.dependencies !== null && ma(e.dependencies) ? (typeof s == "function" && (lc(t, n, s, r), p = t.memoizedState), (u = no || dc(t, n, u, r, f, p, c) || e !== null && e.dependencies !== null && ma(e.dependencies)) ? (l || typeof a.UNSAFE_componentWillUpdate != "function" && typeof a.componentWillUpdate != "function" || (typeof a.componentWillUpdate == "function" && a.componentWillUpdate(r, p, c), typeof a.UNSAFE_componentWillUpdate == "function" && a.UNSAFE_componentWillUpdate(r, p, c)), typeof a.componentDidUpdate == "function" && (t.flags |= 4), typeof a.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), t.memoizedProps = r, t.memoizedState = p), a.props = r, a.state = p, a.context = c, r = u) : (typeof a.componentDidUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 4), typeof a.getSnapshotBeforeUpdate != "function" || o === e.memoizedProps && f === e.memoizedState || (t.flags |= 1024), r = !1);
		}
		return a = r, Fc(e, t), r = !!(t.flags & 128), a || r ? (a = t.stateNode, n = r && typeof n.getDerivedStateFromError != "function" ? null : a.render(), t.flags |= 1, e !== null && r ? (t.child = eo(t, e.child, null, i), t.child = eo(t, null, n, i)) : Tc(e, t, n, i), t.memoizedState = a.state, e = t.child) : e = el(e, t, i), e;
	}
	function zc(e, t, n, r) {
		return ra(), t.flags |= 256, Tc(e, t, n, r), t.child;
	}
	var Bc = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function Vc(e) {
		return {
			baseLanes: e,
			cachePool: za()
		};
	}
	function Hc(e, t, n) {
		return e = e === null ? 0 : e.childLanes & ~n, t && (e |= od), e;
	}
	function Uc(e, t, n) {
		var r = t.pendingProps, i = !1, a = !!(t.flags & 128), o;
		if ((o = a) || (o = e !== null && e.memoizedState === null ? !1 : !!(Do.current & 2)), o && (i = !0, t.flags &= -129), o = !!(t.flags & 32), t.flags &= -33, e === null) {
			if (Y) {
				if (i ? So(t) : To(), (e = Yi) ? (e = am(e, Zi), e = e !== null && e.data !== "&" ? e : null, e !== null && (t.memoizedState = {
					dehydrated: e,
					treeContext: Bi === null ? null : {
						id: Vi,
						overflow: Hi
					},
					retryLane: 536870912,
					hydrationErrors: null
				}, n = Ai(e), n.return = t, t.child = n, Ji = t, Yi = null)) : e = null, e === null) throw $i(t);
				return t.lanes = sm(e) ? 32 : 536870912, null;
			}
			return a = r.children, r = r.fallback, i ? (To(), i = t.mode, a = Gc({
				mode: "hidden",
				children: a
			}, i), r = Oi(r, i, n, null), a.return = t, r.return = t, a.sibling = r, t.child = a, r = t.child, r.memoizedState = Vc(n), r.childLanes = Hc(e, o, n), t.memoizedState = Bc, Ac(null, r)) : (So(t), Wc(t, a));
		}
		var s = e.memoizedState;
		if (s !== null) {
			var c = s.dehydrated;
			if (c !== null) return qc(e, t, a, o, r, c, s, n);
		}
		return i ? (To(), i = r.fallback, a = t.mode, s = e.child, c = s.sibling, r = Ti(s, {
			mode: "hidden",
			children: r.children
		}), r.subtreeFlags = s.subtreeFlags & 1206910976, c === null ? (i = Oi(i, a, n, null), i.flags |= 2) : i = Ti(c, i), i.return = t, r.return = t, r.sibling = i, t.child = r, Ac(null, r), r = t.child, i = e.child.memoizedState, i === null ? i = Vc(n) : (a = i.cachePool, a === null ? a = za() : (s = Sa._currentValue, a = a.parent === s ? a : {
			parent: s,
			pool: s
		}), i = {
			baseLanes: i.baseLanes | n,
			cachePool: a
		}), r.memoizedState = i, r.childLanes = Hc(e, o, n), t.memoizedState = Bc, Ac(e.child, r)) : (So(t), n = e.child, e = n.sibling, n = Ti(n, {
			mode: "visible",
			children: r.children
		}), n.return = t, n.sibling = null, e !== null && (o = t.deletions, o === null ? (t.deletions = [e], t.flags |= 16) : o.push(e)), t.child = n, t.memoizedState = null, n);
	}
	function Wc(e, t) {
		return t = Gc({
			mode: "visible",
			children: t
		}, e.mode), t.return = e, e.child = t;
	}
	function Gc(e, t) {
		return e = Ci(22, e, null, t), e.lanes = 0, e;
	}
	function Kc(e, t, n) {
		return eo(t, e.child, null, n), e = Wc(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
	}
	function qc(e, t, n, r, i, a, o, c) {
		if (n) return t.flags & 256 ? (So(t), t.flags &= -257, Kc(e, t, c)) : t.memoizedState === null ? (To(), a = i.fallback, o = t.mode, i = Gc({
			mode: "visible",
			children: i.children
		}, o), a = Oi(a, o, c, null), a.flags |= 2, i.return = t, a.return = t, i.sibling = a, t.child = i, eo(t, e.child, null, c), i = t.child, i.memoizedState = Vc(c), i.childLanes = Hc(e, r, c), t.memoizedState = Bc, Ac(null, i)) : (To(), t.child = e.child, t.flags |= 128, null);
		if (So(t), sm(a)) {
			if (r = a.nextSibling && a.nextSibling.dataset, r) var l = r.dgst;
			return r = l, r !== "" && (i = Error(s(419)), i.stack = "", i.digest = r, aa({
				value: i,
				source: null,
				stack: null
			})), Kc(e, t, c);
		}
		if (wc || pa(e, t, c, !1), r = (c & e.childLanes) !== 0, wc || r) {
			if (ho.current !== null) return Kc(e, t, c);
			if (r = qu, r !== null && (i = pt(r, c), i !== 0 && i !== o.retryLane)) throw o.retryLane = i, vi(e, i), jd(r, e, i), Cc;
			return om(a) || Ud(), Kc(e, t, c);
		}
		return om(a) ? (t.flags |= 192, t.child = e.child, null) : (e = o.treeContext, Yi = lm(a.nextSibling), Ji = t, Y = !0, Xi = null, Zi = !1, e !== null && qi(t, e), t = Wc(t, i.children), t.flags |= 134221824, t);
	}
	function Jc(e, t, n) {
		e.lanes |= t;
		var r = e.alternate;
		r !== null && (r.lanes |= t), da(e.return, t, n);
	}
	function Yc(e) {
		for (var t = null; e !== null;) {
			var n = e.alternate;
			n !== null && Ao(n) === null && (t = e), e = e.sibling;
		}
		return t;
	}
	function Xc(e, t, n, r, i, a) {
		var o = e.memoizedState;
		o === null ? e.memoizedState = {
			isBackwards: t,
			rendering: null,
			renderingStartTime: 0,
			last: r,
			tail: n,
			tailMode: i,
			treeForkCount: a
		} : (o.isBackwards = t, o.rendering = null, o.renderingStartTime = 0, o.last = r, o.tail = n, o.tailMode = i, o.treeForkCount = a);
	}
	function Zc(e) {
		var t = e.child;
		for (e.child = null; t !== null;) {
			var n = t.sibling;
			t.sibling = e.child, e.child = t, t = n;
		}
	}
	function Qc(e, t, n) {
		var r = t.pendingProps, i = r.revealOrder, a = r.tail;
		r = r.children;
		var o = Do.current;
		if (t.flags & 128) return Oo(t, o), null;
		var s = !!(o & 2);
		if (s ? (o = o & 1 | 2, t.flags |= 128) : o &= 1, Oo(t, o), i === "backwards" && e !== null ? (Zc(e), Tc(e, t, r, n), Zc(e)) : Tc(e, t, r, n), r = Y ? Li : 0, !s && e !== null && e.flags & 128) a: for (e = t.child; e !== null;) {
			if (e.tag === 13) e.memoizedState !== null && Jc(e, n, t);
			else if (e.tag === 19) Jc(e, n, t);
			else if (e.child !== null) {
				e.child.return = e, e = e.child;
				continue;
			}
			if (e === t) break a;
			for (; e.sibling === null;) {
				if (e.return === null || e.return === t) break a;
				e = e.return;
			}
			e.sibling.return = e.return, e = e.sibling;
		}
		switch (i) {
			case "backwards":
				n = Yc(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null, Zc(t)), Xc(t, !0, i, null, a, r);
				break;
			case "unstable_legacy-backwards":
				for (n = null, i = t.child, t.child = null; i !== null;) {
					if (e = i.alternate, e !== null && Ao(e) === null) {
						t.child = i;
						break;
					}
					e = i.sibling, i.sibling = n, n = i, i = e;
				}
				Xc(t, !0, n, null, a, r);
				break;
			case "together":
				Xc(t, !1, null, null, void 0, r);
				break;
			case "independent":
				t.memoizedState = null;
				break;
			default: n = Yc(t.child), n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), Xc(t, !1, i, n, a, r);
		}
		return t.child;
	}
	function $c(e, t, n) {
		var r = t.pendingProps;
		return la(t, t.type, r.value), Tc(e, t, r.children, n), t.child;
	}
	function el(e, t, n) {
		if (e !== null && (t.dependencies = e.dependencies), rd |= t.lanes, (n & t.childLanes) === 0) {
			if (e !== null) {
				if (pa(e, t, n, !1), (n & t.childLanes) === 0) return null;
			} else return null;
		}
		if (e !== null && t.child !== e.child) throw Error(s(153));
		if (t.child !== null) {
			for (e = t.child, n = Ti(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;) e = e.sibling, n = n.sibling = Ti(e, e.pendingProps), n.return = t;
			n.sibling = null;
		}
		return t.child;
	}
	function tl(e, t) {
		return (e.lanes & t) !== 0 || (e = e.dependencies, !!(e !== null && ma(e)));
	}
	function nl(e, t, n) {
		switch (t.tag) {
			case 3:
				Ee(t, t.stateNode.containerInfo), la(t, Sa, e.memoizedState.cache), ra();
				break;
			case 27:
			case 5:
				Oe(t);
				break;
			case 4:
				Ee(t, t.stateNode.containerInfo);
				break;
			case 10:
				la(t, t.type, t.memoizedProps.value);
				break;
			case 31:
				if (t.memoizedState !== null) return t.flags |= 128, Co(t), null;
				break;
			case 13:
				var r = t.memoizedState;
				if (r !== null) {
					if (r.dehydrated !== null) return So(t), t.flags |= 128, null;
					r = pa(e, t, n, !1);
					var i = t.child.childLanes;
					return r || (n & i) !== 0 ? Uc(e, t, n) : (So(t), e = el(e, t, n), e === null ? null : e.sibling);
				}
				So(t);
				break;
			case 19:
				if (t.flags & 128) return Qc(e, t, n);
				if (i = !!(e.flags & 128), r = (n & t.childLanes) !== 0, r ||= (pa(e, t, n, !1), (n & t.childLanes) !== 0), i) {
					if (r) return Qc(e, t, n);
					t.flags |= 128;
				}
				if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), Oo(t, Do.current), r) break;
				return null;
			case 22: return t.lanes = 0, kc(e, t, n, t.pendingProps);
			case 24: la(t, Sa, e.memoizedState.cache);
		}
		return el(e, t, n);
	}
	function rl(e, t, n) {
		if (e !== null) {
			if (e.memoizedProps !== t.pendingProps) wc = !0;
			else {
				if (!tl(e, n) && !(t.flags & 128)) return wc = !1, nl(e, t, n);
				wc = !!(e.flags & 131072);
			}
		} else wc = !1, Y && t.flags & 1048576 && Wi(t, Li, t.index);
		switch (t.lanes = 0, t.tag) {
			case 16:
				a: {
					var r = t.pendingProps;
					if (e = Wa(t.elementType), t.type = e, typeof e == "function") wi(e) ? (r = pc(e, r), t.tag = 1, t = Rc(null, t, e, r, n)) : (t.tag = 0, t = Ic(null, t, e, r, n));
					else {
						if (e != null) {
							var i = e.$$typeof;
							if (i === ne) {
								t.tag = 11, t = Ec(null, t, e, r, n);
								break a;
							}
							if (i === ae) {
								t.tag = 14, t = Dc(null, t, e, r, n);
								break a;
							}
							if (i === N) {
								t.tag = 10, t.type = e, t = $c(null, t, n);
								break a;
							}
						}
						throw t = me(e) || e, Error(s(306, t, ""));
					}
				}
				return t;
			case 0: return Ic(e, t, t.type, t.pendingProps, n);
			case 1: return r = t.type, i = pc(r, t.pendingProps), Rc(e, t, r, i, n);
			case 3:
				a: {
					if (Ee(t, t.stateNode.containerInfo), e === null) throw Error(s(387));
					r = t.pendingProps;
					var a = t.memoizedState;
					i = a.element, io(e, t), fo(t, r, null, n);
					var o = t.memoizedState;
					if (r = o.cache, la(t, Sa, r), r !== a.cache && fa(t, [Sa], n, !0), uo(), r = o.element, a.isDehydrated) {
						if (a = {
							element: r,
							isDehydrated: !1,
							cache: o.cache
						}, t.updateQueue.baseState = a, t.memoizedState = a, t.flags & 256) {
							t = zc(e, t, r, n);
							break a;
						}
						if (r !== i) {
							i = Ni(Error(s(424)), t), aa(i), t = zc(e, t, r, n);
							break a;
						}
						switch (e = t.stateNode.containerInfo, e.nodeType) {
							case 9:
								e = e.body;
								break;
							default: e = e.nodeName === "HTML" ? e.ownerDocument.body : e;
						}
						for (Yi = lm(e.firstChild), Ji = t, Y = !0, Xi = null, Zi = !0, n = to(t, null, r, n), t.child = n; n;) n.flags = n.flags & -3 | 134221824, n = n.sibling;
					} else {
						if (ra(), r === i) {
							t = el(e, t, n);
							break a;
						}
						Tc(e, t, r, n);
					}
					t = t.child;
				}
				return t;
			case 26: return Fc(e, t), e === null ? (n = Nm(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : Y || (t.stateNode = fp(t.type, t.pendingProps, we.current, t)) : t.memoizedState = Nm(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
			case 27: return Oe(t), e === null && Y && (r = t.stateNode = hm(t.type, t.pendingProps, we.current), Ji = t, Zi = !0, i = Yi, Sp(t.type) ? (um = i, Yi = lm(r.firstChild)) : Yi = i), Tc(e, t, t.pendingProps.children, n), Fc(e, t), e === null && (t.flags |= 4194304), t.child;
			case 5: return e === null && Y && ((i = r = Yi) && (r = rm(r, t.type, t.pendingProps, Zi), r === null ? i = !1 : (t.stateNode = r, Ji = t, Yi = lm(r.firstChild), Zi = !1, i = !0)), i || $i(t)), Oe(t), i = t.type, a = t.pendingProps, o = e === null ? null : e.memoizedProps, r = a.children, pp(i, a) ? r = null : o !== null && pp(i, o) && (t.flags |= 32), t.memoizedState !== null && (i = Uo(e, t, Ko, null, null, n), sh._currentValue = i), Fc(e, t), Tc(e, t, r, n), t.child;
			case 6: return e === null && Y && ((e = n = Yi) && (n = im(n, t.pendingProps, Zi), n === null ? e = !1 : (t.stateNode = n, Ji = t, Yi = null, e = !0)), e || $i(t)), null;
			case 13: return Uc(e, t, n);
			case 4: return Ee(t, t.stateNode.containerInfo), r = t.pendingProps, e === null ? t.child = eo(t, null, r, n) : Tc(e, t, r, n), t.child;
			case 11: return Ec(e, t, t.type, t.pendingProps, n);
			case 7: return r = t.pendingProps, Fc(e, t), Tc(e, t, r, n), t.child;
			case 8: return Tc(e, t, t.pendingProps.children, n), t.child;
			case 12: return Tc(e, t, t.pendingProps.children, n), t.child;
			case 10: return $c(e, t, n);
			case 9: return i = t.type._context, r = t.pendingProps.children, ha(t), i = ga(i), r = r(i), t.flags |= 1, Tc(e, t, r, n), t.child;
			case 14: return Dc(e, t, t.type, t.pendingProps, n);
			case 15: return Oc(e, t, t.type, t.pendingProps, n);
			case 19: return Qc(e, t, n);
			case 31: return Pc(e, t, n);
			case 22: return kc(e, t, n, t.pendingProps);
			case 24: return ha(t), r = ga(Sa), e === null ? (i = La(), i === null && (i = qu, a = Ca(), i.pooledCache = a, a.refCount++, a !== null && (i.pooledCacheLanes |= n), i = a), t.memoizedState = {
				parent: r,
				cache: i
			}, ro(t), la(t, Sa, i)) : ((e.lanes & n) !== 0 && (io(e, t), fo(t, null, null, n), uo()), i = e.memoizedState, a = t.memoizedState, i.parent === r ? (r = a.cache, la(t, Sa, r), r !== i.cache && fa(t, [Sa], n, !0)) : (i = {
				parent: r,
				cache: r
			}, t.memoizedState = i, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = i), la(t, Sa, r))), Tc(e, t, t.pendingProps.children, n), t.child;
			case 30: return t.stateNode === null && (t.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}), r = t.pendingProps, r.name != null && r.name !== "auto" ? t.flags |= e === null ? 18882560 : 18874368 : Y && Gi(t), e !== null && e.memoizedProps.name !== r.name ? t.flags |= 4194816 : Fc(e, t), Tc(e, t, r.children, n), t.child;
			case 29: throw t.pendingProps;
		}
		throw Error(s(156, t.tag));
	}
	function il(e) {
		e.flags |= 4;
	}
	function al(e, t, n, r, i) {
		var a;
		if ((a = !!(e.mode & 32)) && (a = n === null ? Jm(t, r) : Jm(t, r) && (r.src !== n.src || r.srcSet !== n.srcSet)), a) {
			if (e.flags |= 16777216, (i & 335544128) === i) {
				if (e.stateNode.complete) e.flags |= 8192;
				else if (Bd()) e.flags |= 8192;
				else throw Ga = Va, X;
			}
		} else e.flags &= -16777217;
	}
	function ol(e, t) {
		if (t.type !== "stylesheet" || t.state.loading & 4) e.flags &= -16777217;
		else if (e.flags |= 16777216, !Ym(t)) {
			if (Bd()) e.flags |= 8192;
			else throw Ga = Va, X;
		}
	}
	function sl(e, t) {
		t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag === 22 ? 536870912 : st(), e.lanes |= t, sd |= t);
	}
	function cl(e, t) {
		if (!Y) switch (e.tailMode) {
			case "visible": break;
			case "collapsed":
				for (var n = e.tail, r = null; n !== null;) n.alternate !== null && (r = n), n = n.sibling;
				r === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : r.sibling = null;
				break;
			default:
				for (t = e.tail, n = null; t !== null;) t.alternate !== null && (n = t), t = t.sibling;
				n === null ? e.tail = null : n.sibling = null;
		}
	}
	function ll(e) {
		var t = e.alternate !== null && e.alternate.child === e.child, n = 0, r = 0;
		if (t) for (var i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags & 1206910976, r |= i.flags & 1206910976, i.return = e, i = i.sibling;
		else for (i = e.child; i !== null;) n |= i.lanes | i.childLanes, r |= i.subtreeFlags, r |= i.flags, i.return = e, i = i.sibling;
		return e.subtreeFlags |= r, e.childLanes = n, t;
	}
	function ul(e, t, n) {
		var r = t.pendingProps;
		switch (Ki(t), t.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return ll(t), null;
			case 1: return ll(t), null;
			case 3: return n = t.stateNode, r = null, e !== null && (r = e.memoizedState.cache), t.memoizedState.cache !== r && (t.flags |= 2048), ua(Sa), De(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (na(t) ? il(t) : e === null || e.memoizedState.isDehydrated && !(t.flags & 256) || (t.flags |= 1024, ia())), ll(t), null;
			case 26:
				var i = t.type, a = t.memoizedState;
				return e === null ? (il(t), a === null ? (ll(t), al(t, i, null, r, n)) : (ll(t), ol(t, a))) : a ? a === e.memoizedState ? (ll(t), t.flags &= -16777217) : (il(t), ll(t), ol(t, a)) : (e = e.memoizedProps, e !== r && il(t), ll(t), al(t, i, e, r, n)), null;
			case 27:
				if (ke(t), n = we.current, i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && il(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return ll(t), t.subtreeFlags &= -33554433, null;
					}
					e = Se.current, na(t) ? ea(t, e) : (e = hm(i, r, n), t.stateNode = e, il(t));
				}
				return ll(t), t.subtreeFlags &= -33554433, null;
			case 5:
				if (ke(t), i = t.type, e !== null && t.stateNode != null) e.memoizedProps !== r && il(t);
				else {
					if (!r) {
						if (t.stateNode === null) throw Error(s(166));
						return ll(t), t.subtreeFlags &= -33554433, null;
					}
					if (a = Se.current, na(t)) ea(t, a);
					else {
						var o = lp(we.current);
						switch (a) {
							case 1:
								a = o.createElementNS("http://www.w3.org/2000/svg", i);
								break;
							case 2:
								a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
								break;
							default: switch (i) {
								case "svg":
									a = o.createElementNS("http://www.w3.org/2000/svg", i);
									break;
								case "math":
									a = o.createElementNS("http://www.w3.org/1998/Math/MathML", i);
									break;
								case "script":
									a = o.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild);
									break;
								case "select":
									a = typeof r.is == "string" ? o.createElement("select", { is: r.is }) : o.createElement("select"), r.multiple ? a.multiple = !0 : r.size && (a.size = r.size);
									break;
								default: a = typeof r.is == "string" ? o.createElement(i, { is: r.is }) : o.createElement(i);
							}
						}
						a[H] = t, a[U] = r;
						a: for (o = t.child; o !== null;) {
							if (o.tag === 5 || o.tag === 6) a.appendChild(o.stateNode);
							else if (o.tag !== 4 && o.tag !== 27 && o.child !== null) {
								o.child.return = o, o = o.child;
								continue;
							}
							if (o === t) break a;
							for (; o.sibling === null;) {
								if (o.return === null || o.return === t) break a;
								o = o.return;
							}
							o.sibling.return = o.return, o = o.sibling;
						}
						t.stateNode = a;
						a: switch (np(a, i, r), i) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								r = !!r.autoFocus;
								break a;
							case "img":
								r = !0;
								break a;
							default: r = !1;
						}
						r && il(t);
					}
				}
				return ll(t), t.subtreeFlags &= -33554433, al(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
			case 6:
				if (e && t.stateNode != null) e.memoizedProps !== r && il(t);
				else {
					if (typeof r != "string" && t.stateNode === null) throw Error(s(166));
					if (e = we.current, na(t)) {
						if (e = t.stateNode, n = t.memoizedProps, r = null, i = Ji, i !== null) switch (i.tag) {
							case 27:
							case 5: r = i.memoizedProps;
						}
						e[H] = t, e = !!(e.nodeValue === n || r !== null && !0 === r.suppressHydrationWarning || $f(e.nodeValue, n)), e || $i(t, !0);
					} else e = lp(e).createTextNode(r), e[H] = t, t.stateNode = e;
				}
				return ll(t), null;
			case 31:
				if (n = t.memoizedState, e === null || e.memoizedState !== null) {
					if (r = na(t), n !== null) {
						if (e === null) {
							if (!r) throw Error(s(318));
							if (e = t.memoizedState, e = e === null ? null : e.dehydrated, !e) throw Error(s(557));
							e[H] = t;
						} else ra(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						ll(t), e = !1;
					} else n = ia(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
					if (!e) return t.flags & 256 ? (Eo(t), t) : (Eo(t), null);
					if (t.flags & 128) throw Error(s(558));
				}
				return ll(t), null;
			case 13:
				if (r = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
					if (i = na(t), r !== null && r.dehydrated !== null) {
						if (e === null) {
							if (!i) throw Error(s(318));
							if (i = t.memoizedState, i = i === null ? null : i.dehydrated, !i) throw Error(s(317));
							i[H] = t;
						} else ra(), !(t.flags & 128) && (t.memoizedState = null), t.flags |= 4;
						ll(t), i = !1;
					} else i = ia(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = i), i = !0;
					if (!i) return t.flags & 256 ? (Eo(t), t) : (Eo(t), null);
				}
				return Eo(t), t.flags & 128 ? (t.lanes = n, t) : (n = r !== null, e = e !== null && e.memoizedState !== null, n && (r = t.child, i = null, r.alternate !== null && r.alternate.memoizedState !== null && r.alternate.memoizedState.cachePool !== null && (i = r.alternate.memoizedState.cachePool.pool), a = null, r.memoizedState !== null && r.memoizedState.cachePool !== null && (a = r.memoizedState.cachePool.pool), a !== i && (r.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), sl(t, t.updateQueue), ll(t), null);
			case 4: return De(), e === null && Uf(t.stateNode.containerInfo), t.flags |= 67108864, ll(t), null;
			case 10: return ua(t.type), ll(t), null;
			case 19:
				if (ko(t), r = t.memoizedState, r === null) return ll(t), null;
				if (i = !!(t.flags & 128), a = r.rendering, a === null) {
					if (i) cl(r, !1);
					else {
						if (nd !== 0 || e !== null && e.flags & 128) for (e = t.child; e !== null;) {
							if (a = Ao(e), a !== null) {
								for (t.flags |= 128, cl(r, !1), e = a.updateQueue, t.updateQueue = e, sl(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;) Ei(n, e), n = n.sibling;
								return Oo(t, Do.current & 1 | 2), Y && Ui(t, r.treeForkCount), t.child;
							}
							e = e.sibling;
						}
						r.tail !== null && ze() > pd && (t.flags |= 128, i = !0, cl(r, !1), t.lanes = 4194304);
					}
				} else {
					if (!i) {
						if (e = Ao(a), e !== null) {
							if (t.flags |= 128, i = !0, e = e.updateQueue, t.updateQueue = e, sl(t, e), cl(r, !0), r.tail === null && r.tailMode !== "collapsed" && r.tailMode !== "visible" && !a.alternate && !Y) return ll(t), null;
						} else 2 * ze() - r.renderingStartTime > pd && n !== 536870912 && (t.flags |= 128, i = !0, cl(r, !1), t.lanes = 4194304);
					}
					r.isBackwards ? (a.sibling = t.child, t.child = a) : (e = r.last, e === null ? t.child = a : e.sibling = a, r.last = a);
				}
				if (r.tail !== null) {
					e = r.tail;
					a: {
						for (n = e; n !== null;) {
							if (n.alternate !== null) {
								n = !1;
								break a;
							}
							n = n.sibling;
						}
						n = !0;
					}
					return r.rendering = e, r.tail = e.sibling, r.renderingStartTime = ze(), e.sibling = null, a = Do.current, a = i ? a & 1 | 2 : a & 1, r.tailMode === "visible" || r.tailMode === "collapsed" || !n || Y ? Oo(t, a) : (n = a, xe(bo, t), xe(Do, n), xo === null && (xo = t)), Y && Ui(t, r.treeForkCount), e;
				}
				return ll(t), null;
			case 22:
			case 23: return Eo(t), yo(), r = t.memoizedState !== null, e === null ? r && (t.flags |= 8192) : e.memoizedState !== null !== r && (t.flags |= 8192), r ? n & 536870912 && !(t.flags & 128) && (ll(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : ll(t), n = t.updateQueue, n !== null && sl(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), r = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (r = t.memoizedState.cachePool.pool), r !== n && (t.flags |= 2048), e !== null && be(Ia), null;
			case 24: return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), ua(Sa), ll(t), null;
			case 25: return null;
			case 30: return t.flags |= 33554432, ll(t), null;
		}
		throw Error(s(156, t.tag));
	}
	function dl(e, t) {
		switch (Ki(t), t.tag) {
			case 1: return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 3: return ua(Sa), De(), e = t.flags, e & 65536 && !(e & 128) ? (t.flags = e & -65537 | 128, t) : null;
			case 26:
			case 27:
			case 5: return ke(t), null;
			case 31:
				if (t.memoizedState !== null) {
					if (Eo(t), t.alternate === null) throw Error(s(340));
					ra();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 13:
				if (Eo(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
					if (t.alternate === null) throw Error(s(340));
					ra();
				}
				return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 19: return ko(t), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null), t.flags |= 4, t) : null;
			case 4: return De(), null;
			case 10: return ua(t.type), null;
			case 22:
			case 23: return Eo(t), yo(), e !== null && be(Ia), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
			case 24: return ua(Sa), null;
			case 25: return null;
			default: return null;
		}
	}
	function fl(e, t) {
		switch (Ki(t), t.tag) {
			case 3:
				ua(Sa), De();
				break;
			case 26:
			case 27:
			case 5:
				ke(t);
				break;
			case 4:
				De();
				break;
			case 31:
				t.memoizedState !== null && Eo(t);
				break;
			case 13:
				Eo(t);
				break;
			case 19:
				ko(t);
				break;
			case 10:
				ua(t.type);
				break;
			case 22:
			case 23:
				Eo(t), yo(), e !== null && be(Ia);
				break;
			case 24: ua(Sa);
		}
	}
	function pl(e, t) {
		try {
			var n = t.updateQueue, r = n === null ? null : n.lastEffect;
			if (r !== null) {
				var i = r.next;
				n = i;
				do {
					if ((n.tag & e) === e) {
						r = void 0;
						var a = n.create, o = n.inst;
						r = a(), o.destroy = r;
					}
					n = n.next;
				} while (n !== i);
			}
		} catch (e) {
			df(t, t.return, e);
		}
	}
	function ml(e, t, n) {
		try {
			var r = t.updateQueue, i = r === null ? null : r.lastEffect;
			if (i !== null) {
				var a = i.next;
				r = a;
				do {
					if ((r.tag & e) === e) {
						var o = r.inst, s = o.destroy;
						if (s !== void 0) {
							o.destroy = void 0, i = t;
							var c = n, l = s;
							try {
								l();
							} catch (e) {
								df(i, c, e);
							}
						}
					}
					r = r.next;
				} while (r !== a);
			}
		} catch (e) {
			df(t, t.return, e);
		}
	}
	function hl(e) {
		var t = e.updateQueue;
		if (t !== null) {
			var n = e.stateNode;
			try {
				mo(t, n);
			} catch (t) {
				df(e, e.return, t);
			}
		}
	}
	function gl(e, t, n) {
		n.props = pc(e.type, e.memoizedProps), n.state = e.memoizedState;
		try {
			n.componentWillUnmount();
		} catch (n) {
			df(e, t, n);
		}
	}
	function _l(e, t) {
		try {
			var n = e.ref;
			if (n !== null) {
				switch (e.tag) {
					case 26:
					case 27:
					case 5:
						var r = e.stateNode;
						break;
					case 30:
						var i = e.stateNode, a = ci(e.memoizedProps, i);
						(i.ref === null || i.ref.name !== a) && (i.ref = Pp(a)), r = i.ref;
						break;
					case 7:
						if (e.stateNode === null) {
							var o = new Fp(e);
							h(e.child, !1, Qp, o, void 0, void 0), e.stateNode = o;
						}
						r = e.stateNode;
						break;
					default: r = e.stateNode;
				}
				typeof n == "function" ? e.refCleanup = n(r) : n.current = r;
			}
		} catch (n) {
			df(e, t, n);
		}
	}
	function vl(e, t) {
		var n = e.ref, r = e.refCleanup;
		if (n !== null) {
			if (typeof r == "function") try {
				r();
			} catch (n) {
				df(e, t, n);
			} finally {
				e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
			}
			else if (typeof n == "function") try {
				n(null);
			} catch (n) {
				df(e, t, n);
			}
			else n.current = null;
		}
	}
	function yl(e, t) {
		if ((e.tag === 5 || e.tag === 27 || e.tag === 6) && e.alternate === null && t !== null) for (var n = 0; n < t.length; n++) em(e.stateNode, t[n]);
	}
	function bl(e) {
		for (var t = e.return; t !== null && (Cl(t) && em(e.stateNode, t.stateNode), !Sl(t));) t = t.return;
	}
	function xl(e) {
		for (var t = e.return; t !== null && (Cl(t) && tm(e.stateNode, t.stateNode), !Sl(t));) t = t.return;
	}
	function Sl(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 27;
	}
	function Cl(e) {
		return e && e.tag === 7 && e.stateNode !== null;
	}
	function wl(e) {
		var t = e.type, n = e.memoizedProps, r = e.stateNode;
		try {
			a: switch (t) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					n.autoFocus && r.focus();
					break a;
				case "img": n.src ? r.src = n.src : n.srcSet && (r.srcset = n.srcSet);
			}
		} catch (t) {
			df(e, e.return, t);
		}
	}
	function Tl(e, t, n) {
		try {
			var r = e.stateNode;
			ip(r, e.type, n, t), r[U] = t;
		} catch (t) {
			df(e, e.return, t);
		}
	}
	function El(e) {
		return e.tag === 5 || e.tag === 3 || e.tag === 26 || e.tag === 27 && Sp(e.type) || e.tag === 4;
	}
	function $(e) {
		a: for (;;) {
			for (; e.sibling === null;) {
				if (e.return === null || El(e.return)) return null;
				e = e.return;
			}
			for (e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;) {
				if (e.tag === 27 && Sp(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue a;
				e.child.return = e, e = e.child;
			}
			if (!(e.flags & 2)) return e.stateNode;
		}
	}
	function Dl(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? (n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n).insertBefore(i, t) : (t = n.nodeType === 9 ? n.body : n.nodeName === "HTML" ? n.ownerDocument.body : n, t.appendChild(i), n = n._reactRootContainer, n != null || t.onclick !== null || (t.onclick = un)), yl(e, r), q = !0;
		else if (i !== 4 && (i === 27 && (yl(e, r), r = null, Sp(e.type) && (n = e.stateNode, t = null)), e = e.child, e !== null)) for (Dl(e, t, n, r), e = e.sibling; e !== null;) Dl(e, t, n, r), e = e.sibling;
	}
	function Ol(e, t, n, r) {
		var i = e.tag;
		if (i === 5 || i === 6) i = e.stateNode, t ? n.insertBefore(i, t) : n.appendChild(i), yl(e, r), q = !0;
		else if (i !== 4 && (i === 27 && (yl(e, r), r = null, Sp(e.type) && (n = e.stateNode)), e = e.child, e !== null)) for (Ol(e, t, n, r), e = e.sibling; e !== null;) Ol(e, t, n, r), e = e.sibling;
	}
	function kl(e) {
		var t = e.stateNode, n = e.memoizedProps;
		try {
			for (var r = e.type, i = t.attributes; i.length;) t.removeAttributeNode(i[0]);
			np(t, r, n), t[H] = e, t[U] = n;
		} catch (t) {
			df(e, e.return, t);
		}
	}
	var Al = !1, jl = null;
	function Ml(e) {
		(e.tag === 30 || e.subtreeFlags & 33554432) && (Al = !0);
	}
	var Nl = null;
	function Pl() {
		var e = Nl;
		return Nl = null, e;
	}
	var Fl = 0;
	function Il(e, t, n, r, i) {
		return Fl = 0, Ll(e.child, t, n, r, i);
	}
	function Ll(e, t, n, r, i) {
		for (var a = !1; e !== null;) {
			if (e.tag === 5) {
				var o = e.stateNode;
				if (r !== null) {
					var s = Op(o);
					r.push(s), s.view && (a = !0);
				} else a || Op(o).view && (a = !0);
				Al = !0, Tp(o, Fl === 0 ? t : t + "_" + Fl, n), Fl++;
			} else (e.tag !== 22 || e.memoizedState === null) && (e.tag === 30 && i || Ll(e.child, t, n, r, i) && (a = !0));
			e = e.sibling;
		}
		return a;
	}
	function Rl(e, t) {
		for (; e !== null;) e.tag === 5 ? Ep(e.stateNode, e.memoizedProps) : (e.tag !== 22 || e.memoizedState === null) && (e.tag === 30 && t || Rl(e.child, t)), e = e.sibling;
	}
	function zl(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if ((e.tag !== 22 || e.memoizedState === null) && (zl(e), e.tag === 30 && e.flags & 18874368 && e.stateNode.paired)) {
				var t = e.memoizedProps;
				if (t.name == null || t.name === "auto") throw Error(s(544));
				var n = t.name;
				t = ui(t.default, t.share), t !== "none" && (Il(e, n, t, null, !1) || Rl(e.child, !1));
			}
			e = e.sibling;
		}
	}
	function Bl(e, t) {
		if (e.tag === 30) {
			var n = e.stateNode, r = e.memoizedProps, i = ci(r, n), a = ui(r.default, n.paired ? r.share : r.enter);
			a === "none" ? zl(e) : Il(e, i, a, null, !1) ? (zl(e), n.paired || t || Ad(e, r.onEnter)) : Rl(e.child, !1);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Bl(e, t), e = e.sibling;
		else zl(e);
	}
	function Vl(e) {
		if (jl !== null && jl.size !== 0) {
			var t = jl;
			if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
				if (e.tag !== 22 || e.memoizedState === null) {
					if (e.tag === 30 && e.flags & 18874368) {
						var n = e.memoizedProps, r = n.name;
						if (r != null && r !== "auto") {
							var i = t.get(r);
							if (i !== void 0) {
								var a = ui(n.default, n.share);
								if (a !== "none" && (Il(e, r, a, null, !1) ? (a = e.stateNode, i.paired = a, a.paired = i, Ad(e, n.onShare)) : Rl(e.child, !1)), t.delete(r), t.size === 0) break;
							}
						}
					}
					Vl(e);
				}
				e = e.sibling;
			}
		}
	}
	function Hl(e) {
		if (e.tag === 30) {
			var t = e.memoizedProps, n = ci(t, e.stateNode), r = jl === null ? void 0 : jl.get(n), i = ui(t.default, r === void 0 ? t.exit : t.share);
			i !== "none" && (Il(e, n, i, null, !1) ? r === void 0 ? Ad(e, t.onExit) : (i = e.stateNode, r.paired = i, i.paired = r, jl.delete(n), Ad(e, t.onShare)) : Rl(e.child, !1)), jl !== null && Vl(e);
		} else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Hl(e), e = e.sibling;
		else jl !== null && Vl(e);
	}
	function Ul(e) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var t = e.memoizedProps, n = ci(t, e.stateNode);
				t = ui(t.default, t.update), e.flags &= -5, t !== "none" && Il(e, n, t, e.memoizedState = [], !1);
			} else e.subtreeFlags & 33554432 && Ul(e);
			e = e.sibling;
		}
	}
	function Wl(e) {
		if (e.subtreeFlags & 18874368) for (e = e.child; e !== null;) {
			if (e.tag !== 22 || e.memoizedState === null) {
				if (e.tag === 30 && e.flags & 18874368) {
					var t = e.stateNode;
					t.paired !== null && (t.paired = null, Rl(e.child, !1));
				}
				Wl(e);
			}
			e = e.sibling;
		}
	}
	function Gl(e) {
		if (e.tag === 30) e.stateNode.paired = null, Rl(e.child, !1), Wl(e);
		else if (e.subtreeFlags & 33554432) for (e = e.child; e !== null;) Gl(e), e = e.sibling;
		else Wl(e);
	}
	function Kl(e) {
		for (e = e.child; e !== null;) e.tag === 30 ? Rl(e.child, !1) : e.subtreeFlags & 33554432 && Kl(e), e = e.sibling;
	}
	function ql(e, t, n, r, i, a, o) {
		for (var s = !1; t !== null;) {
			if (t.tag === 5) {
				var c = t.stateNode;
				if (a !== null && Fl < a.length) {
					var l = a[Fl], u = Op(c);
					(l.view || u.view) && (s = !0);
					var d;
					if (d = !(e.flags & 4)) {
						if (u.clip) d = !0;
						else {
							d = l.rect;
							var f = u.rect;
							d = d.y !== f.y || d.x !== f.x || d.height !== f.height || d.width !== f.width;
						}
					}
					d && (e.flags |= 4), u.abs ? u = !l.abs : (l = l.rect, u = u.rect, u = l.height !== u.height || l.width !== u.width), u && (e.flags |= 32);
				} else e.flags |= 32;
				e.flags & 4 && Tp(c, Fl === 0 ? n : n + "_" + Fl, i), s && e.flags & 4 || (Nl === null && (Nl = []), Nl.push(c, Fl === 0 ? r : r + "_" + Fl, t.memoizedProps)), Fl++;
			} else (t.tag !== 22 || t.memoizedState === null) && (t.tag === 30 && o ? e.flags |= t.flags & 32 : ql(e, t.child, n, r, i, a, o) && (s = !0));
			t = t.sibling;
		}
		return s;
	}
	function Jl(e, t) {
		for (e = e.child; e !== null;) {
			if (e.tag === 30) {
				var n = e.memoizedProps, r = e.stateNode, i = ci(n, r), a = ui(n.default, n.update);
				if (t) {
					r = r.clones;
					var o = r === null ? null : r.map(kp);
				} else o = e.memoizedState, e.memoizedState = null;
				r = e;
				var s = e.child;
				Fl = 0, i = ql(r, s, i, i, a, o, !1), e.flags & 4 && i && (t || Ad(e, n.onUpdate));
			} else e.subtreeFlags & 33554432 && Jl(e, t);
			e = e.sibling;
		}
	}
	var Yl = !1, Xl = !1, Zl = !1, Ql = !1, $l = typeof WeakSet == "function" ? WeakSet : Set, eu = null, tu = !1, nu = !1, ru = !1, iu = !1;
	function au(e, t, n) {
		if (e = e.containerInfo, sp = gh, e = Rr(e), zr(e)) {
			if ("selectionStart" in e) var r = {
				start: e.selectionStart,
				end: e.selectionEnd
			};
			else a: {
				r = (r = e.ownerDocument) && r.defaultView || window;
				var i = r.getSelection && r.getSelection();
				if (i && i.rangeCount !== 0) {
					r = i.anchorNode;
					var a = i.anchorOffset, o = i.focusNode;
					i = i.focusOffset;
					try {
						r.nodeType, o.nodeType;
					} catch {
						r = null;
						break a;
					}
					var s = 0, c = -1, l = -1, u = 0, d = 0, f = e, p = null;
					b: for (;;) {
						for (var m; f !== r || a !== 0 && f.nodeType !== 3 || (c = s + a), f !== o || i !== 0 && f.nodeType !== 3 || (l = s + i), f.nodeType === 3 && (s += f.nodeValue.length), (m = f.firstChild) !== null;) p = f, f = m;
						for (;;) {
							if (f === e) break b;
							if (p === r && ++u === a && (c = s), p === o && ++d === i && (l = s), (m = f.nextSibling) !== null) break;
							f = p, p = f.parentNode;
						}
						f = m;
					}
					r = c === -1 || l === -1 ? null : {
						start: c,
						end: l
					};
				} else r = null;
			}
			r ||= {
				start: 0,
				end: 0
			};
		} else r = null;
		for (cp = {
			focusedElem: e,
			selectionRange: r
		}, gh = !1, n = (n & 335544064) === n, eu = t, t = n ? 9270 : 1024; eu !== null;) {
			if (e = eu, n && (r = e.deletions, r !== null)) for (a = 0; a < r.length; a++) n && Hl(r[a]);
			if (e.alternate === null && e.flags & 2) n && Ml(e), ou(n);
			else {
				if (e.tag === 22) {
					if (r = e.alternate, e.memoizedState !== null) {
						r !== null && r.memoizedState === null && n && Hl(r), ou(n);
						continue;
					}
					if (r !== null && r.memoizedState !== null) {
						n && Ml(e), ou(n);
						continue;
					}
				}
				r = e.child, (e.subtreeFlags & t) !== 0 && r !== null ? (r.return = e, eu = r) : (n && Ul(e), ou(n));
			}
		}
		jl = null;
	}
	function ou(e) {
		for (; eu !== null;) {
			var t = eu, n = e, r = t.alternate, i = t.flags;
			switch (t.tag) {
				case 0:
				case 11:
				case 15: break;
				case 1:
					if (i & 1024 && r !== null) {
						n = void 0, i = r.memoizedProps, r = r.memoizedState;
						var a = t.stateNode;
						try {
							var o = pc(t.type, i);
							n = a.getSnapshotBeforeUpdate(o, r), a.__reactInternalSnapshotBeforeUpdate = n;
						} catch (e) {
							df(t, t.return, e);
						}
					}
					break;
				case 3:
					if (i & 1024) {
						if (r = t.stateNode.containerInfo, n = r.nodeType, n === 9) nm(r);
						else if (n === 1) switch (r.nodeName) {
							case "HEAD":
							case "HTML":
							case "BODY":
								nm(r);
								break;
							default: r.textContent = "";
						}
					}
					break;
				case 5:
				case 26:
				case 27:
				case 6:
				case 4:
				case 17: break;
				case 30:
					n && r !== null && (n = ci(r.memoizedProps, r.stateNode), i = t.memoizedProps, i = ui(i.default, i.update), i !== "none" && Il(r, n, i, r.memoizedState = [], !0));
					break;
				default: if (i & 1024) throw Error(s(163));
			}
			if (r = t.sibling, r !== null) {
				r.return = t.return, eu = r;
				break;
			}
			eu = t.return;
		}
	}
	function su(e, t, n) {
		var r = n.flags;
		switch (n.tag) {
			case 0:
			case 11:
			case 15:
				Du(e, n), r & 4 && pl(5, n);
				break;
			case 1:
				if (Du(e, n), r & 4) {
					if (e = n.stateNode, t === null) try {
						e.componentDidMount();
					} catch (e) {
						df(n, n.return, e);
					}
					else {
						var i = pc(n.type, t.memoizedProps);
						t = t.memoizedState;
						try {
							e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
						} catch (e) {
							df(n, n.return, e);
						}
					}
				}
				r & 64 && hl(n), r & 512 && _l(n, n.return);
				break;
			case 3:
				if (Du(e, n), r & 64 && (e = n.updateQueue, e !== null)) {
					if (t = null, n.child !== null) switch (n.child.tag) {
						case 27:
						case 5:
							t = n.child.stateNode;
							break;
						case 1: t = n.child.stateNode;
					}
					try {
						mo(e, t);
					} catch (e) {
						df(n, n.return, e);
					}
				}
				break;
			case 27: t === null && r & 4 && kl(n);
			case 26:
			case 5:
				Du(e, n), t === null && r & 4 && wl(n), r & 512 && _l(n, n.return);
				break;
			case 12:
				Du(e, n);
				break;
			case 31:
				Du(e, n), r & 4 && gu(e, n);
				break;
			case 13:
				Du(e, n), r & 4 && _u(e, n), r & 64 && (e = n.memoizedState, e !== null && (e = e.dehydrated, e !== null && (n = hf.bind(null, n), cm(e, n))));
				break;
			case 22:
				if (r = n.memoizedState !== null || Yl, !r) {
					var a = t !== null && t.memoizedState !== null || Xl;
					t = Yl, i = Xl, Yl = r, (Xl = a) && !i ? (r = 2, n.subtreeFlags & 8772 && (r |= 1), ku(e, n, r)) : Du(e, n), Yl = t, Xl = i;
				}
				break;
			case 30:
				Du(e, n), r & 512 && _l(n, n.return);
				break;
			case 7: r & 512 && _l(n, n.return);
			default: Du(e, n);
		}
	}
	function cu(e, t) {
		for (e = e.child; e !== null;) lu(e, t), e = e.sibling;
	}
	function lu(e, t) {
		switch (e.tag) {
			case 5:
			case 26:
				try {
					var n = e.stateNode;
					if (t) {
						var r = n.style;
						typeof r.setProperty == "function" ? r.setProperty("display", "none", "important") : r.display = "none";
					} else {
						var i = e.stateNode, a = e.memoizedProps.style, o = a != null && a.hasOwnProperty("display") ? a.display : null;
						i.style.display = o == null || typeof o == "boolean" ? "" : ("" + o).trim();
					}
				} catch (t) {
					df(e, e.return, t);
				}
				uu(e, t);
				break;
			case 6:
				try {
					e.stateNode.nodeValue = t ? "" : e.memoizedProps, q = !0;
				} catch (t) {
					df(e, e.return, t);
				}
				break;
			case 18:
				try {
					var s = e.stateNode;
					t ? wp(s, !0) : wp(e.stateNode, !1);
				} catch (t) {
					df(e, e.return, t);
				}
				break;
			case 22:
			case 23:
				e.memoizedState === null && cu(e, t);
				break;
			default: cu(e, t);
		}
	}
	function uu(e, t) {
		if (e.subtreeFlags & 67108864) for (e = e.child; e !== null;) {
			a: {
				var n = e, r = t;
				switch (n.tag) {
					case 4:
						lu(n, r);
						break a;
					case 22:
						n.memoizedState === null && uu(n, r);
						break a;
					default: uu(n, r);
				}
			}
			e = e.sibling;
		}
	}
	function du(e) {
		var t = e.alternate;
		t !== null && (e.alternate = null, du(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && wt(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
	}
	var fu = null, pu = !1;
	function mu(e, t, n) {
		for (n = n.child; n !== null;) hu(e, t, n), n = n.sibling;
	}
	function hu(e, t, n) {
		if (Ye && typeof Ye.onCommitFiberUnmount == "function") try {
			Ye.onCommitFiberUnmount(Je, n);
		} catch {}
		switch (n.tag) {
			case 26:
				Xl || vl(n, t), mu(e, t, n), n.memoizedState ? n.memoizedState.count-- : n.stateNode && !Xl && (n = n.stateNode, n.parentNode.removeChild(n));
				break;
			case 27:
				Xl || vl(n, t), xl(n);
				var r = fu, i = pu;
				Sp(n.type) && (fu = n.stateNode, pu = !1), mu(e, t, n), gm(n.stateNode, n.type, n.memoizedProps), fu = r, pu = i;
				break;
			case 5: Xl || vl(n, t), xl(n);
			case 6:
				if (n.tag === 6 && xl(n), r = fu, i = pu, fu = null, mu(e, t, n), fu = r, pu = i, fu !== null) {
					if (pu) try {
						(fu.nodeType === 9 ? fu.body : fu.nodeName === "HTML" ? fu.ownerDocument.body : fu).removeChild(n.stateNode), q = !0;
					} catch (e) {
						df(n, t, e);
					}
					else try {
						fu.removeChild(n.stateNode), q = !0;
					} catch (e) {
						df(n, t, e);
					}
				}
				break;
			case 18:
				fu !== null && (pu ? (e = fu, Cp(e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, n.stateNode), Hh(e)) : Cp(fu, n.stateNode));
				break;
			case 4:
				r = fu, i = pu, fu = n.stateNode.containerInfo, pu = !0, mu(e, t, n), fu = r, pu = i;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				ml(2, n, t), Xl || ml(4, n, t), mu(e, t, n);
				break;
			case 1:
				Xl || (vl(n, t), r = n.stateNode, typeof r.componentWillUnmount == "function" && gl(n, t, r)), mu(e, t, n);
				break;
			case 21:
				mu(e, t, n);
				break;
			case 22:
				Xl = (r = Xl) || n.memoizedState !== null, mu(e, t, n), Xl = r;
				break;
			case 30:
				vl(n, t), mu(e, t, n);
				break;
			case 7:
				Xl || vl(n, t), mu(e, t, n);
				break;
			default: mu(e, t, n);
		}
	}
	function gu(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
			e = e.dehydrated;
			try {
				Hh(e);
			} catch (e) {
				df(t, t.return, e);
			}
		}
	}
	function _u(e, t) {
		if (t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
			Hh(e);
		} catch (e) {
			df(t, t.return, e);
		}
	}
	function vu(e) {
		switch (e.tag) {
			case 31:
			case 13:
			case 19:
				var t = e.stateNode;
				return t === null && (t = e.stateNode = new $l()), t;
			case 22: return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new $l()), t;
			default: throw Error(s(435, e.tag));
		}
	}
	function yu(e, t) {
		var n = vu(e);
		t.forEach(function(t) {
			if (!n.has(t)) {
				n.add(t);
				var r = gf.bind(null, e, t);
				t.then(r, r);
			}
		});
	}
	function bu(e, t, n) {
		var r = t.deletions;
		if (r !== null) for (var i = 0; i < r.length; i++) {
			var a = r[i], o = e, c = t, l = c;
			a: for (; l !== null;) {
				switch (l.tag) {
					case 27:
						if (Sp(l.type)) {
							fu = l.stateNode, pu = !1;
							break a;
						}
						break;
					case 5:
						fu = l.stateNode, pu = !1;
						break a;
					case 3:
					case 4:
						fu = l.stateNode.containerInfo, pu = !0;
						break a;
				}
				l = l.return;
			}
			if (fu === null) throw Error(s(160));
			hu(o, c, a), fu = null, pu = !1, o = a.alternate, o !== null && (o.return = null), a.return = null;
		}
		if (t.subtreeFlags & 13886) for (t = t.child; t !== null;) Su(t, e, n), t = t.sibling;
	}
	var xu = null;
	function Su(e, t, n) {
		var r = e.alternate, i = e.flags;
		switch (e.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				if (i & 4 && (r = e.updateQueue, r = r === null ? null : r.events, r !== null)) for (var a = 0; a < r.length; a++) {
					var o = r[a];
					o.ref.impl = o.nextImpl;
				}
				bu(t, e, n), Cu(e), i & 4 && (ml(3, e, e.return), pl(3, e), ml(5, e, e.return));
				break;
			case 1:
				bu(t, e, n), Cu(e), i & 512 && (Xl || r === null || vl(r, r.return)), i & 64 && Yl && (e = e.updateQueue, e !== null && (t = e.callbacks, t !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? t : n.concat(t))));
				break;
			case 26:
				if (a = xu, bu(t, e, n), Cu(e), i & 512 && (Xl || r === null || vl(r, r.return)), i & 4) {
					if (i = r === null ? null : r.memoizedState, n = e.memoizedState, r === null) {
						if (n === null) {
							if (e.stateNode === null) {
								if (Yl) e.stateNode = fp(e.type, e.memoizedProps, t.containerInfo, e);
								else {
									a: {
										t = e.type, n = e.memoizedProps, i = a.ownerDocument || a;
										b: switch (t) {
											case "title":
												r = i.getElementsByTagName("title")[0], (!r || r[St] || r[H] || r.namespaceURI === "http://www.w3.org/2000/svg" || r.hasAttribute("itemprop")) && (r = i.createElement(t), i.head.insertBefore(r, i.querySelector("head > title"))), np(r, t, n), r[H] = e, Ot(r), t = r;
												break a;
											case "link":
												if (a = Gm("link", "href", i).get(t + (n.href || ""))) {
													for (o = 0; o < a.length; o++) if (r = a[o], r.getAttribute("href") === (n.href == null || n.href === "" ? null : n.href) && r.getAttribute("rel") === (n.rel == null ? null : n.rel) && r.getAttribute("title") === (n.title == null ? null : n.title) && r.getAttribute("crossorigin") === (n.crossOrigin == null ? null : n.crossOrigin)) {
														a.splice(o, 1);
														break b;
													}
												}
												r = i.createElement(t), np(r, t, n), i.head.appendChild(r);
												break;
											case "meta":
												if (a = Gm("meta", "content", i).get(t + (n.content || ""))) {
													for (o = 0; o < a.length; o++) if (r = a[o], r.getAttribute("content") === (n.content == null ? null : "" + n.content) && r.getAttribute("name") === (n.name == null ? null : n.name) && r.getAttribute("property") === (n.property == null ? null : n.property) && r.getAttribute("http-equiv") === (n.httpEquiv == null ? null : n.httpEquiv) && r.getAttribute("charset") === (n.charSet == null ? null : n.charSet)) {
														a.splice(o, 1);
														break b;
													}
												}
												r = i.createElement(t), np(r, t, n), i.head.appendChild(r);
												break;
											default: throw Error(s(468, t));
										}
										r[H] = e, Ot(r), t = r;
									}
									e.stateNode = t;
								}
							} else Yl || Km(a, e.type, e.stateNode);
						} else e.stateNode = Bm(a, n, e.memoizedProps);
					} else i === n ? n === null && e.stateNode !== null && Tl(e, e.memoizedProps, r.memoizedProps) : (i === null ? (t = r.stateNode, t === null || Xl || t.parentNode.removeChild(t)) : i.count--, n === null ? Yl || Km(a, e.type, e.stateNode) : Bm(a, n, e.memoizedProps));
				}
				break;
			case 27:
				bu(t, e, n), Cu(e), i & 512 && (Xl || r === null || vl(r, r.return)), r !== null && i & 4 && Tl(e, e.memoizedProps, r.memoizedProps);
				break;
			case 5:
				if (a = Zl, Zl = !1, bu(t, e, n), Zl = a, Cu(e), i & 512 && (Xl || r === null || vl(r, r.return)), e.flags & 32) {
					t = e.stateNode;
					try {
						tn(t, ""), q = !0;
					} catch (t) {
						df(e, e.return, t);
					}
				}
				i & 4 && e.stateNode != null && (t = e.memoizedProps, Tl(e, t, r === null ? t : r.memoizedProps)), i & 1024 && (Ql = !0);
				break;
			case 6:
				if (bu(t, e, n), Cu(e), i & 4) {
					if (e.stateNode === null) throw Error(s(162));
					t = e.memoizedProps, n = e.stateNode;
					try {
						n.nodeValue = t, q = !0;
					} catch (t) {
						df(e, e.return, t);
					}
				}
				break;
			case 3:
				if (q = !1, Wm = null, a = xu, xu = bm(t.containerInfo), bu(t, e, n), xu = a, Cu(e), i & 4 && r !== null && r.memoizedState.isDehydrated) try {
					Hh(t.containerInfo);
				} catch (t) {
					df(e, e.return, t);
				}
				Ql && (Ql = !1, wu(e)), q = !1;
				break;
			case 4:
				i = Zl, Zl = Yl, r = Rt(), a = xu, xu = bm(e.stateNode.containerInfo), bu(t, e, n), Cu(e), xu = a, q && nu && (ru = !0), q = r, Zl = i;
				break;
			case 12:
				bu(t, e, n), Cu(e);
				break;
			case 31:
				bu(t, e, n), Cu(e), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, yu(e, t)));
				break;
			case 13:
				bu(t, e, n), Cu(e), e.child.flags & 8192 && e.memoizedState !== null != (r !== null && r.memoizedState !== null) && (dd = ze()), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, yu(e, t)));
				break;
			case 22:
				a = e.memoizedState !== null, o = r !== null && r.memoizedState !== null;
				var c = Yl, l = Xl, u = Zl;
				Yl = c || a, Zl = u || a, Xl = l || o, bu(t, e, n), Xl = l, Zl = u, Yl = c, Cu(e), i & 8192 && (t = e.stateNode, t._visibility = a ? t._visibility & -2 : t._visibility | 1, !a || r === null || o || Yl || Xl || (t = o || Xl, n = Yl, r = Xl, Yl = a || Yl, Xl = t, Ou(e, 2), Yl = n, Xl = r), !a && Zl || cu(e, a)), i & 4 && (t = e.updateQueue, t !== null && (n = t.retryQueue, n !== null && (t.retryQueue = null, yu(e, n))));
				break;
			case 19:
				bu(t, e, n), Cu(e), i & 4 && (t = e.updateQueue, t !== null && (e.updateQueue = null, yu(e, t)));
				break;
			case 30:
				i & 512 && (Xl || r === null || vl(r, r.return)), i = Rt(), a = nu, o = (n & 335544064) === n, c = e.memoizedProps, nu = o && ui(c.default, c.update) !== "none", bu(t, e, n), Cu(e), o && r !== null && q && (e.flags |= 4), nu = a, q = i;
				break;
			case 21: break;
			case 7: i & 512 && (Xl || r === null || vl(r, r.return)), r && r.stateNode !== null && (r.stateNode._fragmentFiber = e);
			default: bu(t, e, n), Cu(e);
		}
	}
	function Cu(e) {
		var t = e.flags;
		if (t & 2) {
			try {
				for (var n, r = e.return; r !== null;) {
					if (El(r)) {
						n = r;
						break;
					}
					r = r.return;
				}
				r = null;
				for (var i = e.return; i !== null;) {
					if (Cl(i)) {
						var a = i.stateNode;
						r === null ? r = [a] : r.push(a);
					}
					if (Sl(i)) break;
					i = i.return;
				}
				var o = r;
				if (n == null) throw Error(s(160));
				switch (n.tag) {
					case 27:
						var c = n.stateNode;
						Ol(e, $(e), c, o);
						break;
					case 5:
						var l = n.stateNode;
						n.flags & 32 && (tn(l, ""), n.flags &= -33), Ol(e, $(e), l, o);
						break;
					case 3:
					case 4:
						var u = n.stateNode.containerInfo;
						Dl(e, $(e), u, o);
						break;
					default: throw Error(s(161));
				}
			} catch (t) {
				df(e, e.return, t);
			}
			e.flags &= -3;
		}
		t & 4096 && (e.flags &= -4097);
	}
	function wu(e) {
		if (e.subtreeFlags & 1024) for (e = e.child; e !== null;) {
			var t = e;
			wu(t), t.tag === 5 && t.flags & 1024 && (t = t.stateNode, gh = !0, t.reset(), gh = !1), e = e.sibling;
		}
	}
	function Tu(e, t) {
		if (t.subtreeFlags & 9270) for (t = t.child; t !== null;) Eu(t, e), t = t.sibling;
		else Jl(t, !1);
	}
	function Eu(e, t) {
		var n = e.alternate;
		if (n === null) Bl(e, !1);
		else switch (e.tag) {
			case 3:
				if (iu = tu = !1, Pl(), Tu(t, e), !tu && !ru) {
					if (e = Nl, e !== null) for (var r = 0; r < e.length; r += 3) {
						n = e[r];
						var i = e[r + 1];
						Ep(n, e[r + 2]), n = n.ownerDocument.documentElement, n !== null && n.animate({
							opacity: [0, 0],
							pointerEvents: ["none", "none"]
						}, {
							duration: 0,
							fill: "forwards",
							pseudoElement: "::view-transition-group(" + i + ")"
						});
					}
					e = t.containerInfo, e = e.nodeType === 9 ? e.documentElement : e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "" && (e.style.viewTransitionName = "none", e.animate({
						opacity: [0, 0],
						pointerEvents: ["none", "none"]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition-group(root)"
					}), e.animate({
						width: [0, 0],
						height: [0, 0]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition"
					})), iu = !0;
				}
				Nl = null;
				break;
			case 5:
				Tu(t, e);
				break;
			case 4:
				r = tu, tu = !1, Tu(t, e), tu && (ru = !0), tu = r;
				break;
			case 22:
				e.memoizedState === null && (n.memoizedState === null ? Tu(t, e) : Bl(e, !1));
				break;
			case 30:
				r = tu, i = Pl(), tu = !1, Tu(t, e), tu && (e.flags |= 4);
				var a = e.memoizedProps, o = e.stateNode;
				t = ci(a, o), o = ci(n.memoizedProps, o);
				var s = ui(a.default, a.update);
				s === "none" ? t = !1 : (a = n.memoizedState, n.memoizedState = null, n = e.child, Fl = 0, t = ql(e, n, t, o, s, a, !0), Fl !== (a === null ? 0 : a.length) && (e.flags |= 32)), e.flags & 4 && t ? (Ad(e, e.memoizedProps.onUpdate), Nl = i) : i !== null && (i.push.apply(i, Nl), Nl = i), tu = e.flags & 32 ? !0 : r;
				break;
			default: Tu(t, e);
		}
	}
	function Du(e, t) {
		if (t.subtreeFlags & 8772) for (t = t.child; t !== null;) su(e, t.alternate, t), t = t.sibling;
	}
	function Ou(e, t) {
		for (e = e.child; e !== null;) {
			var n = e, r = t;
			switch (n.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					ml(4, n, n.return), Ou(n, r);
					break;
				case 1:
					vl(n, n.return);
					var i = n.stateNode;
					typeof i.componentWillUnmount == "function" && gl(n, n.return, i), Ou(n, r);
					break;
				case 27: r & 2 && gm(n.stateNode, n.type, n.memoizedProps);
				case 5:
					vl(n, n.return), n.tag !== 5 && n.tag !== 27 || xl(n), Ou(n, r);
					break;
				case 6:
					xl(n);
					break;
				case 26:
					vl(n, n.return), i = n.stateNode, n.memoizedState !== null || i === null || Xl || i.parentNode.removeChild(i), Ou(n, r);
					break;
				case 22:
					n.memoizedState === null && Ou(n, r);
					break;
				case 30:
					vl(n, n.return), Ou(n, r);
					break;
				case 7: vl(n, n.return);
				default: Ou(n, r);
			}
			e = e.sibling;
		}
	}
	function ku(e, t, n) {
		for (n = t.subtreeFlags & 8772 ? n : n & -2, t = t.child; t !== null;) {
			var r = t.alternate, i = e, a = t, o = a.flags, s = !!(n & 1);
			switch (a.tag) {
				case 0:
				case 11:
				case 15:
					ku(i, a, n), pl(4, a);
					break;
				case 1:
					if (ku(i, a, n), r = a, i = r.stateNode, typeof i.componentDidMount == "function") try {
						i.componentDidMount();
					} catch (e) {
						df(r, r.return, e);
					}
					if (r = a, i = r.updateQueue, i !== null) {
						var c = r.stateNode;
						try {
							var l = i.shared.hiddenCallbacks;
							if (l !== null) for (i.shared.hiddenCallbacks = null, i = 0; i < l.length; i++) po(l[i], c);
						} catch (e) {
							df(r, r.return, e);
						}
					}
					s && o & 64 && hl(a), _l(a, a.return);
					break;
				case 27: n & 2 && kl(a);
				case 5:
					a.tag !== 5 && a.tag !== 27 || bl(a), ku(i, a, n), s && r === null && o & 4 && wl(a), _l(a, a.return);
					break;
				case 6:
					bl(a);
					break;
				case 26:
					c = a.stateNode, a.memoizedState !== null || c === null || Yl || Km(bm(c.ownerDocument), a.type, c), ku(i, a, n), s && r === null && o & 4 && wl(a), _l(a, a.return);
					break;
				case 12:
					ku(i, a, n);
					break;
				case 31:
					ku(i, a, n), s && o & 4 && gu(i, a);
					break;
				case 13:
					ku(i, a, n), s && o & 4 && _u(i, a);
					break;
				case 22:
					a.memoizedState === null && ku(i, a, n), _l(a, a.return);
					break;
				case 30:
					ku(i, a, n), _l(a, a.return);
					break;
				case 7: _l(a, a.return);
				default: ku(i, a, n);
			}
			t = t.sibling;
		}
	}
	function Au(e, t) {
		var n = null;
		e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && wa(n));
	}
	function ju(e, t) {
		e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && wa(e));
	}
	function Mu(e, t, n, r) {
		var i = (n & 335544064) === n;
		if (t.subtreeFlags & (i ? 10262 : 10256)) for (t = t.child; t !== null;) Nu(e, t, n, r), t = t.sibling;
		else i && Kl(t);
	}
	function Nu(e, t, n, r) {
		var i = (n & 335544064) === n;
		i && t.alternate === null && t.return !== null && t.return.alternate !== null && Gl(t);
		var a = t.flags;
		switch (t.tag) {
			case 0:
			case 11:
			case 15:
				Mu(e, t, n, r), a & 2048 && pl(9, t);
				break;
			case 1:
				Mu(e, t, n, r);
				break;
			case 3:
				Mu(e, t, n, r), i && iu && (e = e.containerInfo, e = e.nodeType === 9 ? e.body : e.nodeName === "HTML" ? e.ownerDocument.body : e, e.style.viewTransitionName === "root" && (e.style.viewTransitionName = ""), e = e.ownerDocument.documentElement, e !== null && e.style.viewTransitionName === "none" && (e.style.viewTransitionName = "")), a & 2048 && (a = null, t.alternate !== null && (a = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== a && (t.refCount++, a != null && wa(a)));
				break;
			case 12:
				if (a & 2048) {
					Mu(e, t, n, r), a = t.stateNode;
					try {
						var o = t.memoizedProps, s = o.id, c = o.onPostCommit;
						typeof c == "function" && c(s, t.alternate === null ? "mount" : "update", a.passiveEffectDuration, -0);
					} catch (e) {
						df(t, t.return, e);
					}
				} else Mu(e, t, n, r);
				break;
			case 31:
				Mu(e, t, n, r);
				break;
			case 13:
				Mu(e, t, n, r);
				break;
			case 23: break;
			case 22:
				o = t.stateNode, s = t.alternate, t.memoizedState === null ? (i && s !== null && s.memoizedState !== null && Gl(t), o._visibility & 2 ? Mu(e, t, n, r) : (o._visibility |= 2, Pu(e, t, n, r, !!(t.subtreeFlags & 10256) || !1))) : (i && s !== null && s.memoizedState === null && Gl(s), o._visibility & 2 ? Mu(e, t, n, r) : Fu(e, t)), a & 2048 && Au(s, t);
				break;
			case 24:
				Mu(e, t, n, r), a & 2048 && ju(t.alternate, t);
				break;
			case 30:
				i && (a = t.alternate, a !== null && (Rl(a.child, !0), Rl(t.child, !0))), Mu(e, t, n, r);
				break;
			default: Mu(e, t, n, r);
		}
	}
	function Pu(e, t, n, r, i) {
		for (i &&= !!(t.subtreeFlags & 10256) || !1, t = t.child; t !== null;) {
			var a = e, o = t, s = n, c = r, l = o.flags;
			switch (o.tag) {
				case 0:
				case 11:
				case 15:
					Pu(a, o, s, c, i), pl(8, o);
					break;
				case 23: break;
				case 22:
					var u = o.stateNode;
					o.memoizedState === null ? (u._visibility |= 2, Pu(a, o, s, c, i)) : u._visibility & 2 ? Pu(a, o, s, c, i) : Fu(a, o), i && l & 2048 && Au(o.alternate, o);
					break;
				case 24:
					Pu(a, o, s, c, i), i && l & 2048 && ju(o.alternate, o);
					break;
				default: Pu(a, o, s, c, i);
			}
			t = t.sibling;
		}
	}
	function Fu(e, t) {
		if (t.subtreeFlags & 10256) for (t = t.child; t !== null;) {
			var n = e, r = t, i = r.flags;
			switch (r.tag) {
				case 22:
					Fu(n, r), i & 2048 && Au(r.alternate, r);
					break;
				case 24:
					Fu(n, r), i & 2048 && ju(r.alternate, r);
					break;
				default: Fu(n, r);
			}
			t = t.sibling;
		}
	}
	var Iu = 8192;
	function Lu(e, t, n) {
		if (e.subtreeFlags & Iu) for (e = e.child; e !== null;) Ru(e, t, n), e = e.sibling;
	}
	function Ru(e, t, n) {
		switch (e.tag) {
			case 26:
				Lu(e, t, n), e.flags & Iu && (e.memoizedState === null ? (e = e.stateNode, (t & 335544128) === t && Zm(n, e)) : Qm(n, xu, e.memoizedState, e.memoizedProps));
				break;
			case 5:
				Lu(e, t, n), e.flags & Iu && (e = e.stateNode, (t & 335544128) === t && Zm(n, e));
				break;
			case 3:
			case 4:
				var r = xu;
				xu = bm(e.stateNode.containerInfo), Lu(e, t, n), xu = r;
				break;
			case 22:
				e.memoizedState === null && (r = e.alternate, r !== null && r.memoizedState !== null ? (r = Iu, Iu = 16777216, Lu(e, t, n), Iu = r) : Lu(e, t, n));
				break;
			case 30:
				if ((e.flags & Iu) !== 0 && (r = e.memoizedProps.name, r != null && r !== "auto")) {
					var i = e.stateNode;
					i.paired = null, jl === null && (jl = /* @__PURE__ */ new Map()), jl.set(r, i);
				}
				Lu(e, t, n);
				break;
			default: Lu(e, t, n);
		}
	}
	function zu(e) {
		var t = e.alternate;
		if (t !== null && (e = t.child, e !== null)) {
			t.child = null;
			do
				t = e.sibling, e.sibling = null, e = t;
			while (e !== null);
		}
	}
	function Bu(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				eu = r, Uu(r, e);
			}
			zu(e);
		}
		if (e.subtreeFlags & 10256) for (e = e.child; e !== null;) Vu(e), e = e.sibling;
	}
	function Vu(e) {
		switch (e.tag) {
			case 0:
			case 11:
			case 15:
				Bu(e), e.flags & 2048 && ml(9, e, e.return);
				break;
			case 3:
				Bu(e);
				break;
			case 12:
				Bu(e);
				break;
			case 22:
				var t = e.stateNode;
				e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Hu(e)) : Bu(e);
				break;
			default: Bu(e);
		}
	}
	function Hu(e) {
		var t = e.deletions;
		if (e.flags & 16) {
			if (t !== null) for (var n = 0; n < t.length; n++) {
				var r = t[n];
				eu = r, Uu(r, e);
			}
			zu(e);
		}
		for (e = e.child; e !== null;) {
			switch (t = e, t.tag) {
				case 0:
				case 11:
				case 15:
					ml(8, t, t.return), Hu(t);
					break;
				case 22:
					n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, Hu(t));
					break;
				default: Hu(t);
			}
			e = e.sibling;
		}
	}
	function Uu(e, t) {
		for (; eu !== null;) {
			var n = eu;
			switch (n.tag) {
				case 0:
				case 11:
				case 15:
					ml(8, n, t);
					break;
				case 23:
				case 22:
					if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
						var r = n.memoizedState.cachePool.pool;
						r != null && r.refCount++;
					}
					break;
				case 24: wa(n.memoizedState.cache);
			}
			if (r = n.child, r !== null) r.return = n, eu = r;
			else a: for (n = e; eu !== null;) {
				r = eu;
				var i = r.sibling, a = r.return;
				if (du(r), r === n) {
					eu = null;
					break a;
				}
				if (i !== null) {
					i.return = a, eu = i;
					break a;
				}
				eu = a;
			}
		}
	}
	var Wu = {
		getCacheForType: function(e) {
			var t = ga(Sa), n = t.data.get(e);
			return n === void 0 && (n = e(), t.data.set(e, n)), n;
		},
		cacheSignal: function() {
			return ga(Sa).controller.signal;
		}
	}, Gu = typeof WeakMap == "function" ? WeakMap : Map, Ku = 0, qu = null, Ju = null, Yu = 0, Xu = 0, Zu = null, Qu = !1, $u = !1, ed = !1, td = 0, nd = 0, rd = 0, id = 0, ad = 0, od = 0, sd = 0, cd = null, ld = null, ud = !1, dd = 0, fd = 0, pd = Infinity, md = null, hd = null, gd = 0, _d = null, vd = null, yd = 0, bd = 0, xd = null, Sd = null, Cd = null, wd = null, Td = null, Ed = 0, Dd = null;
	function Od() {
		return Ku & 2 && Yu !== 0 ? Yu & -Yu : F.T === null ? gt() : Mf();
	}
	function kd() {
		if (od === 0) {
			if (!(Yu & 536870912) || Y) {
				var e = nt;
				nt <<= 1, !(nt & 3932160) && (nt = 262144), od = e;
			} else od = 536870912;
		}
		return e = bo.current, e !== null && (e.flags |= 32), od;
	}
	function Ad(e, t) {
		if (t != null) {
			var n = e.stateNode, r = n.ref;
			r === null && (r = n.ref = Pp(ci(e.memoizedProps, n))), wd === null && (wd = []), wd.push(t.bind(null, r));
		}
	}
	function jd(e, t, n) {
		(e === qu && (Xu === 2 || Xu === 9) || e.cancelPendingCommit !== null) && (Rd(e, 0), Fd(e, Yu, od, !1)), lt(e, n), (!(Ku & 2) || e !== qu) && (e === qu && (!(Ku & 2) && (id |= n), nd === 4 && Fd(e, Yu, od, !1)), wf(e));
	}
	function Md(e, t, n) {
		if (Ku & 6) throw Error(s(327));
		var r = !n && !(t & 127) && (t & e.expiredLanes) === 0 || ot(e, t), i = r ? Kd(e, t) : Wd(e, t, !0), a = r;
		do {
			if (i === 0) {
				$u && !r && Fd(e, t, 0, !1);
				break;
			}
			if (n = e.current.alternate, a && !Pd(n)) i = Wd(e, t, !1), a = !1;
			else {
				if (i === 2) {
					if (a = t, e.errorRecoveryDisabledLanes & a) var o = 0;
					else o = e.pendingLanes & -536870913, o = o === 0 ? o & 536870912 ? 536870912 : 0 : o;
					if (o !== 0) {
						t = o;
						a: {
							var c = e;
							i = cd;
							var l = c.current.memoizedState.isDehydrated;
							if (l && (Rd(c, o).flags |= 256), o = Wd(c, o, !1), o !== 2 && o !== 6) {
								if (ed && !l) {
									c.errorRecoveryDisabledLanes |= a, id |= a, i = 4;
									break a;
								}
								a = ld, ld = i, a !== null && (ld === null ? ld = a : ld.push.apply(ld, a));
							}
							i = o;
						}
						if (a = !1, i !== 2) continue;
					}
				}
				if (i === 1) {
					Rd(e, 0), Fd(e, t, 0, !0);
					break;
				}
				a: {
					switch (r = e, a = i, a) {
						case 0:
						case 1: throw Error(s(345));
						case 4: if ((t & 4194048) !== t && (t & 62914560) !== t) break;
						case 6:
							Fd(r, t, od, !Qu);
							break a;
						case 2:
							ld = null;
							break;
						case 3:
						case 5: break;
						default: throw Error(s(329));
					}
					if ((t & 62914560) === t && (i = dd + 300 - ze(), 10 < i)) {
						if (Fd(r, t, od, !Qu), at(r, 0, !0) !== 0) break a;
						yd = t, r.timeoutHandle = gp(Nd.bind(null, r, n, ld, md, ud, t, od, id, sd, Qu, a, "Throttled", -0, 0), i);
						break a;
					}
					Nd(r, n, ld, md, ud, t, od, id, sd, Qu, a, null, -0, 0);
				}
				break;
			}
		} while (1);
		wf(e);
	}
	function Nd(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
		e.timeoutHandle = -1;
		var m = t.subtreeFlags, h = (a & 335544064) === a;
		d = null, (h || m & 8192 || (m & 16785408) == 16785408) && (d = {
			stylesheets: null,
			count: 0,
			imgCount: 0,
			imgBytes: 0,
			suspenseyImages: [],
			waitingForImages: !0,
			waitingForViewTransition: !1,
			unsuspend: un
		}, jl = null, Ru(t, a, d), h && (m = d, h = e.containerInfo, h = (h.nodeType === 9 ? h : h.ownerDocument).__reactViewTransition, h != null && (m.count++, m.waitingForViewTransition = !0, m = nh.bind(m), h.finished.then(m, m))), m = (a & 62914560) === a ? dd - ze() : (a & 4194048) === a ? fd - ze() : 0, m = eh(d, m), m !== null) ? (yd = a, e.cancelPendingCommit = m($d.bind(null, e, t, a, n, r, i, o, s, c, l, u, d, null, f, p)), Fd(e, a, o, !l)) : $d(e, t, a, n, r, i, o, s, c, l, u, d);
	}
	function Pd(e) {
		for (var t = e;;) {
			var n = t.tag;
			if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null))) for (var r = 0; r < n.length; r++) {
				var i = n[r], a = i.getSnapshot;
				i = i.value;
				try {
					if (!Mr(a(), i)) return !1;
				} catch {
					return !1;
				}
			}
			if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
			else {
				if (t === e) break;
				for (; t.sibling === null;) {
					if (t.return === null || t.return === e) return !0;
					t = t.return;
				}
				t.sibling.return = t.return, t = t.sibling;
			}
		}
		return !0;
	}
	function Fd(e, t, n, r) {
		t = B(e, t), t &= ~ad, t &= ~id, e.suspendedLanes |= t, e.pingedLanes &= ~t, r && (e.warmLanes |= t), r = e.expirationTimes;
		for (var i = t; 0 < i;) {
			var a = 31 - Ze(i), o = 1 << a;
			r[a] = -1, i &= ~o;
		}
		n !== 0 && dt(e, n, t);
	}
	function Id() {
		return Ku & 6 ? !0 : (Tf(0, !1), !1);
	}
	function Ld() {
		if (Ju !== null) {
			if (Xu === 0) var e = Ju.return;
			else e = Ju, ca = sa = null, Yo(e), Ja = null, Ya = 0, e = Ju;
			for (; e !== null;) fl(e.alternate, e), e = e.return;
			Ju = null;
		}
	}
	function Rd(e, t) {
		var n = e.timeoutHandle;
		return n !== -1 && (e.timeoutHandle = -1, _p(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), yd = 0, Ld(), qu = e, Ju = n = Ti(e.current, null), Yu = t, Xu = 0, Zu = null, Qu = !1, $u = ot(e, t), ed = !1, sd = od = ad = id = rd = nd = 0, ld = cd = null, ud = !1, td = B(e, t), hi(), n;
	}
	function zd(e, t) {
		Q = null, F.H = ac, t === Ba || t === Z ? (t = Ka(), Xu = 3) : t === X ? (t = Ka(), Xu = 4) : Xu = t === Cc ? 8 : typeof t == "object" && t && typeof t.then == "function" ? 6 : 1, Zu = t, Ju === null && (nd = 1, _c(e, Ni(t, e.current)));
	}
	function Bd() {
		var e = bo.current;
		return e === null ? !0 : (Yu & 4194048) === Yu ? xo === null : (Yu & 62914560) === Yu || Yu & 536870912 ? e === xo : !1;
	}
	function Vd() {
		var e = F.H;
		return F.H = ac, e === null ? ac : e;
	}
	function Hd() {
		var e = F.A;
		return F.A = Wu, e;
	}
	function Ud() {
		nd = 4, Qu || (Yu & 4194048) !== Yu && bo.current !== null || ($u = !0), !(rd & 134217727) && !(id & 134217727) || qu === null || Fd(qu, Yu, od, !1);
	}
	function Wd(e, t, n) {
		var r = Ku;
		Ku |= 2;
		var i = Vd(), a = Hd();
		(qu !== e || Yu !== t) && (md = null, Rd(e, t)), t = !1;
		var o = nd;
		a: do
			try {
				if (Xu !== 0 && Ju !== null) {
					var s = Ju, c = Zu;
					switch (Xu) {
						case 8:
							Ld(), o = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							bo.current === null && (t = !0);
							var l = Xu;
							if (Xu = 0, Zu = null, Xd(e, s, c, l), n && $u) {
								o = 0;
								break a;
							}
							break;
						default: l = Xu, Xu = 0, Zu = null, Xd(e, s, c, l);
					}
				}
				Gd(), o = nd;
				break;
			} catch (t) {
				zd(e, t);
			}
		while (1);
		return t && e.shellSuspendCounter++, ca = sa = null, Ku = r, F.H = i, F.A = a, Ju === null && (qu = null, Yu = 0, hi()), o;
	}
	function Gd() {
		for (; Ju !== null;) Jd(Ju);
	}
	function Kd(e, t) {
		var n = Ku;
		Ku |= 2;
		var r = Vd(), i = Hd();
		qu !== e || Yu !== t ? (md = null, pd = ze() + 500, Rd(e, t)) : $u = ot(e, t);
		a: do
			try {
				if (Xu !== 0 && Ju !== null) {
					t = Ju;
					var a = Zu;
					b: switch (Xu) {
						case 1:
							Xu = 0, Zu = null, Xd(e, t, a, 1);
							break;
						case 2:
						case 9:
							if (Ha(a)) {
								Xu = 0, Zu = null, Yd(t);
								break;
							}
							t = function() {
								Xu !== 2 && Xu !== 9 || qu !== e || (Xu = 7), wf(e);
							}, a.then(t, t);
							break a;
						case 3:
							Xu = 7;
							break a;
						case 4:
							Xu = 5;
							break a;
						case 7:
							Ha(a) ? (Xu = 0, Zu = null, Yd(t)) : (Xu = 0, Zu = null, Xd(e, t, a, 7));
							break;
						case 5:
							var o = null;
							switch (Ju.tag) {
								case 26: o = Ju.memoizedState;
								case 5:
								case 27:
									var c = Ju;
									if (o ? Ym(o) : c.stateNode.complete) {
										Xu = 0, Zu = null;
										var l = c.sibling;
										if (l !== null) Ju = l;
										else {
											var u = c.return;
											u === null ? Ju = null : (Ju = u, Zd(u));
										}
										break b;
									}
							}
							Xu = 0, Zu = null, Xd(e, t, a, 5);
							break;
						case 6:
							Xu = 0, Zu = null, Xd(e, t, a, 6);
							break;
						case 8:
							Ld(), nd = 6;
							break a;
						default: throw Error(s(462));
					}
				}
				qd();
				break;
			} catch (t) {
				zd(e, t);
			}
		while (1);
		return ca = sa = null, F.H = r, F.A = i, Ku = n, Ju === null ? (qu = null, Yu = 0, hi(), nd) : 0;
	}
	function qd() {
		for (; Ju !== null && !Le();) Jd(Ju);
	}
	function Jd(e) {
		var t = rl(e.alternate, e, td);
		e.memoizedProps = e.pendingProps, t === null ? Zd(e) : Ju = t;
	}
	function Yd(e) {
		var t = e, n = t.alternate;
		switch (t.tag) {
			case 15:
			case 0:
				t = Lc(n, t, t.pendingProps, t.type, void 0, Yu);
				break;
			case 11:
				t = Lc(n, t, t.pendingProps, t.type.render, t.ref, Yu);
				break;
			case 5:
				Yo(t);
				var r = t;
				r === Ji && (Y ? (ta(r), r.tag === 5 && r.stateNode != null && (Yi = r.stateNode)) : (ta(r), Y = !0));
			default: fl(n, t), t = Ju = Ei(t, td), t = rl(n, t, td);
		}
		e.memoizedProps = e.pendingProps, t === null ? Zd(e) : Ju = t;
	}
	function Xd(e, t, n, r) {
		ca = sa = null, Yo(t), Ja = null, Ya = 0;
		var i = t.return;
		try {
			if (Sc(e, i, t, n, Yu)) {
				nd = 1, _c(e, Ni(n, e.current)), Ju = null;
				return;
			}
		} catch (t) {
			if (i !== null) throw Ju = i, t;
			nd = 1, _c(e, Ni(n, e.current)), Ju = null;
			return;
		}
		t.flags & 32768 ? (Y || r === 1 ? e = !0 : $u || Yu & 536870912 ? e = !1 : (Qu = e = !0, (r === 2 || r === 9 || r === 3 || r === 6) && (r = bo.current, r !== null && r.tag === 13 && (r.flags |= 16384))), Qd(t, e)) : Zd(t);
	}
	function Zd(e) {
		var t = e;
		do {
			if (t.flags & 32768) {
				Qd(t, Qu);
				return;
			}
			e = t.return;
			var n = ul(t.alternate, t, td);
			if (n !== null) {
				Ju = n;
				return;
			}
			if (t = t.sibling, t !== null) {
				Ju = t;
				return;
			}
			Ju = t = e;
		} while (t !== null);
		nd === 0 && (nd = 5);
	}
	function Qd(e, t) {
		do {
			var n = dl(e.alternate, e);
			if (n !== null) {
				n.flags &= 32767, Ju = n;
				return;
			}
			if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
				Ju = e;
				return;
			}
			Ju = e = n;
		} while (e !== null);
		nd = 6, Ju = null;
	}
	function $d(e, t, n, r, i, a, o, c, l, u, d, f) {
		e.cancelPendingCommit = null;
		do
			cf();
		while (gd !== 0);
		if (Ku & 6) throw Error(s(327));
		if (t !== null) {
			if (t === e.current) throw Error(s(177));
			e === qu && (Ju = qu = null, Yu = 0), vd = t, _d = e, yd = n, xd = i, Sd = r, ef(e, t, n, o, c, l, f);
		}
	}
	function ef(e, t, n, r, i, a, o) {
		var s = t.lanes | t.childLanes;
		if (bd = s, s |= mi, ut(e, n, s, r, i, a), wd = null, (n & 335544064) === n ? (Td = Da(e), r = 10262) : (Td = null, r = 10256), (t.subtreeFlags & r) !== 0 || (t.flags & r) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, _f(Ue, function() {
			return lf(), null;
		})) : (e.callbackNode = null, e.callbackPriority = 0), Al = !1, r = !!(t.flags & 13878), t.subtreeFlags & 13878 || r) {
			r = F.T, F.T = null, i = I.p, I.p = 2, a = Ku, Ku |= 4;
			try {
				au(e, t, n);
			} finally {
				Ku = a, I.p = i, F.T = r;
			}
		}
		gd = 1, Al ? Cd = Mp(o, e.containerInfo, Td, rf, af, nf, of, lf, tf, null, null) : (rf(), af(), of());
	}
	function tf(e) {
		if (gd !== 0) {
			var t = _d.onRecoverableError;
			t(e, { componentStack: null });
		}
	}
	function nf() {
		gd === 3 && (gd = 0, Eu(vd, _d), gd = 4);
	}
	function rf() {
		if (gd === 1) {
			gd = 0;
			var e = _d, t = vd, n = yd, r = !!(t.flags & 13878);
			if (t.subtreeFlags & 13878 || r) {
				r = F.T, F.T = null;
				var i = I.p;
				I.p = 2;
				var a = Ku;
				Ku |= 4;
				try {
					nu = ru = !1, Su(t, e, n), n = cp;
					var o = Rr(e.containerInfo), s = n.focusedElem, c = n.selectionRange;
					if (o !== s && s && s.ownerDocument && Lr(s.ownerDocument.documentElement, s)) {
						if (c !== null && zr(s)) {
							var l = c.start, u = c.end;
							if (u === void 0 && (u = l), "selectionStart" in s) s.selectionStart = l, s.selectionEnd = Math.min(u, s.value.length);
							else {
								var d = s.ownerDocument || document, f = d && d.defaultView || window;
								if (f.getSelection) {
									var p = f.getSelection(), m = s.textContent.length, h = Math.min(c.start, m), g = c.end === void 0 ? h : Math.min(c.end, m);
									!p.extend && h > g && (o = g, g = h, h = o);
									var _ = Ir(s, h), v = Ir(s, g);
									if (_ && v && (p.rangeCount !== 1 || p.anchorNode !== _.node || p.anchorOffset !== _.offset || p.focusNode !== v.node || p.focusOffset !== v.offset)) {
										var y = d.createRange();
										y.setStart(_.node, _.offset), p.removeAllRanges(), h > g ? (p.addRange(y), p.extend(v.node, v.offset)) : (y.setEnd(v.node, v.offset), p.addRange(y));
									}
								}
							}
						}
						for (d = [], p = s; p = p.parentNode;) p.nodeType === 1 && d.push({
							element: p,
							left: p.scrollLeft,
							top: p.scrollTop
						});
						for (typeof s.focus == "function" && s.focus(), s = 0; s < d.length; s++) {
							var b = d[s];
							b.element.scrollLeft = b.left, b.element.scrollTop = b.top;
						}
					}
					gh = !!sp, cp = sp = null;
				} finally {
					Ku = a, I.p = i, F.T = r;
				}
			}
			e.current = t, gd = 2;
		}
	}
	function af() {
		if (gd === 2) {
			gd = 0;
			var e = _d, t = vd, n = !!(t.flags & 8772);
			if (t.subtreeFlags & 8772 || n) {
				n = F.T, F.T = null;
				var r = I.p;
				I.p = 2;
				var i = Ku;
				Ku |= 4;
				try {
					su(e, t.alternate, t);
				} finally {
					Ku = i, I.p = r, F.T = n;
				}
			}
			gd = 3;
		}
	}
	function of() {
		if (gd === 4 || gd === 3) {
			gd = 0;
			var e = Cd;
			Cd = null, Re();
			var t = _d, n = vd, r = yd, i = Sd, a = (r & 335544064) === r ? 10262 : 10256;
			if ((n.subtreeFlags & a) !== 0 || (n.flags & a) !== 0 ? gd = 5 : (gd = 0, vd = _d = null, sf(t, t.pendingLanes)), a = t.pendingLanes, a === 0 && (hd = null), ht(r), n = n.stateNode, Ye && typeof Ye.onCommitFiberRoot == "function") try {
				Ye.onCommitFiberRoot(Je, n, void 0, (n.current.flags & 128) == 128);
			} catch {}
			if (i !== null) {
				n = F.T, a = I.p, I.p = 2, F.T = null;
				try {
					for (var o = t.onRecoverableError, s = 0; s < i.length; s++) {
						var c = i[s];
						o(c.value, { componentStack: c.stack });
					}
				} finally {
					F.T = n, I.p = a;
				}
			}
			if (i = wd, o = Td, Td = null, i !== null && (wd = null, o === null && (o = []), e !== null)) for (c = 0; c < i.length; c++) n = (0, i[c])(o), n !== void 0 && e.finished.finally(n);
			yd & 3 && cf(), wf(t), a = t.pendingLanes, r & 261930 && a & 42 ? t === Dd ? Ed++ : (Ed = 0, Dd = t) : (Ed = 0, Dd = null), Tf(0, !1);
		}
	}
	function sf(e, t) {
		(e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, wa(t)));
	}
	function cf() {
		return Cd !== null && (Cd.skipTransition(), Cd = null), rf(), af(), of(), lf();
	}
	function lf() {
		if (gd !== 5) return !1;
		var e = _d, t = bd;
		bd = 0;
		var n = ht(yd), r = F.T, i = I.p;
		try {
			I.p = 32 > n ? 32 : n, F.T = null, n = xd, xd = null;
			var a = _d, o = yd;
			if (gd = 0, vd = _d = null, yd = 0, Ku & 6) throw Error(s(331));
			var c = Ku;
			if (Ku |= 4, Vu(a.current), Nu(a, a.current, o, n), Ku = c, Tf(0, !1), Ye && typeof Ye.onPostCommitFiberRoot == "function") try {
				Ye.onPostCommitFiberRoot(Je, a);
			} catch {}
			return !0;
		} finally {
			I.p = i, F.T = r, sf(e, t);
		}
	}
	function uf(e, t, n) {
		t = Ni(n, t), t = yc(e.stateNode, t, 2), e = oo(e, t, 2), e !== null && (lt(e, 2), wf(e));
	}
	function df(e, t, n) {
		if (e.tag === 3) uf(e, e, n);
		else for (; t !== null;) {
			if (t.tag === 3) {
				uf(t, e, n);
				break;
			}
			if (t.tag === 1) {
				var r = t.stateNode;
				if (typeof t.type.getDerivedStateFromError == "function" || typeof r.componentDidCatch == "function" && (hd === null || !hd.has(r))) {
					e = Ni(n, e), n = bc(2), r = oo(t, n, 2), r !== null && (xc(n, r, t, e), lt(r, 2), wf(r));
					break;
				}
			}
			t = t.return;
		}
	}
	function ff(e, t, n) {
		var r = e.pingCache;
		if (r === null) {
			r = e.pingCache = new Gu();
			var i = /* @__PURE__ */ new Set();
			r.set(t, i);
		} else i = r.get(t), i === void 0 && (i = /* @__PURE__ */ new Set(), r.set(t, i));
		i.has(n) || (ed = !0, i.add(n), e = pf.bind(null, e, t, n), t.then(e, e));
	}
	function pf(e, t, n) {
		var r = e.pingCache;
		r !== null && r.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, qu === e && (Yu & n) === n && (nd === 4 || nd === 3 && (Yu & 62914560) === Yu && 300 > ze() - dd ? Ku & 2 ? ad |= n : Rd(e, 0) : ad |= n, sd === Yu && (sd = 0)), wf(e);
	}
	function mf(e, t) {
		t === 0 && (t = st()), e = vi(e, t), e !== null && (lt(e, t), wf(e));
	}
	function hf(e) {
		var t = e.memoizedState, n = 0;
		t !== null && (n = t.retryLane), mf(e, n);
	}
	function gf(e, t) {
		var n = 0;
		switch (e.tag) {
			case 31:
			case 13:
				var r = e.stateNode, i = e.memoizedState;
				i !== null && (n = i.retryLane);
				break;
			case 19:
				r = e.stateNode;
				break;
			case 22:
				r = e.stateNode._retryCache;
				break;
			default: throw Error(s(314));
		}
		r !== null && r.delete(t), mf(e, n);
	}
	function _f(e, t) {
		return z(e, t);
	}
	var vf = null, yf = null, bf = !1, xf = !1, Sf = !1, Cf = 0;
	function wf(e) {
		e !== yf && e.next === null && (yf === null ? vf = yf = e : yf = yf.next = e), xf = !0, bf || (bf = !0, jf());
	}
	function Tf(e, t) {
		if (!Sf && xf) {
			Sf = !0;
			do
				for (var n = !1, r = vf; r !== null;) {
					if (!t) {
						if (e !== 0) {
							var i = r.pendingLanes;
							if (i === 0) var a = 0;
							else {
								var o = r.suspendedLanes, s = r.pingedLanes;
								a = (1 << 31 - Ze(42 | e) + 1) - 1, a &= i & ~(o & ~s), a = a & 201326741 ? a & 201326741 | 1 : a ? a | 2 : 0;
							}
							a !== 0 && (n = !0, Af(r, a));
						} else a = Yu, a = at(r, r === qu ? a : 0, r.cancelPendingCommit !== null || r.timeoutHandle !== -1), !(a & 3) || ot(r, a) || (n = !0, Af(r, a));
					}
					r = r.next;
				}
			while (n);
			Sf = !1;
		}
	}
	function Ef() {
		Df();
	}
	function Df() {
		xf = bf = !1;
		var e = 0;
		Cf !== 0 && hp() && (e = Cf);
		for (var t = ze(), n = null, r = vf; r !== null;) {
			var i = r.next, a = Of(r, t);
			a === 0 ? (r.next = null, n === null ? vf = i : n.next = i, i === null && (yf = n)) : (n = r, (e !== 0 || a & 3) && (xf = !0)), r = i;
		}
		gd !== 0 && gd !== 5 || Tf(e, !1), Cf !== 0 && (Cf = 0);
	}
	function Of(e, t) {
		for (var n = e.suspendedLanes, r = e.pingedLanes, i = e.expirationTimes, a = e.pendingLanes & -62914561; 0 < a;) {
			var o = 31 - Ze(a), s = 1 << o, c = i[o];
			c === -1 ? ((s & n) === 0 || (s & r) !== 0) && (i[o] = V(s, t)) : c <= t && (e.expiredLanes |= s), a &= ~s;
		}
		if (t = qu, n = Yu, n = at(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r = e.callbackNode, n === 0 || e === t && (Xu === 2 || Xu === 9) || e.cancelPendingCommit !== null) return r !== null && r !== null && Ie(r), e.callbackNode = null, e.callbackPriority = 0;
		if (!(n & 3) || ot(e, n)) {
			if (t = n & -n, t === e.callbackPriority) return t;
			switch (r !== null && Ie(r), ht(n)) {
				case 2:
				case 8:
					n = He;
					break;
				case 32:
					n = Ue;
					break;
				case 268435456:
					n = Ge;
					break;
				default: n = Ue;
			}
			return r = kf.bind(null, e), n = z(n, r), e.callbackPriority = t, e.callbackNode = n, t;
		}
		return r !== null && r !== null && Ie(r), e.callbackPriority = 2, e.callbackNode = null, 2;
	}
	function kf(e, t) {
		if (gd !== 0 && gd !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
		var n = e.callbackNode;
		if (cf() && e.callbackNode !== n) return null;
		var r = Yu;
		return r = at(e, e === qu ? r : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== -1), r === 0 ? null : (Md(e, r, t), Of(e, ze()), e.callbackNode != null && e.callbackNode === n ? kf.bind(null, e) : null);
	}
	function Af(e, t) {
		if (cf()) return null;
		Md(e, t, !0);
	}
	function jf() {
		bp(function() {
			Ku & 6 ? z(Ve, Ef) : Df();
		});
	}
	function Mf() {
		if (Cf === 0) {
			var e = Aa;
			e === 0 && (e = tt, tt <<= 1, !(tt & 261888) && (tt = 256)), Cf = e;
		}
		return Cf;
	}
	function Nf(e) {
		return e == null || typeof e == "symbol" || typeof e == "boolean" ? null : typeof e == "function" ? e : ln(e);
	}
	function Pf(e, t, n, r, i) {
		if (t === "submit" && n && n.stateNode === i) {
			var a = Nf((i[U] || null).action), o = r.submitter;
			o && (t = (t = o[U] || null) ? Nf(t.formAction) : o.getAttribute("formAction"), t !== null && (a = t, o = null));
			var s = new An("action", "action", null, r, i);
			e.push({
				event: s,
				listeners: [{
					instance: null,
					listener: function() {
						if (r.defaultPrevented) {
							if (Cf !== 0) {
								var e = new FormData(i, o);
								Gs(n, {
									pending: !0,
									data: e,
									method: i.method,
									action: a
								}, null, e);
							}
						} else typeof a == "function" && (s.preventDefault(), e = new FormData(i, o), Gs(n, {
							pending: !0,
							data: e,
							method: i.method,
							action: a
						}, a, e));
					},
					currentTarget: i
				}]
			});
		}
	}
	for (var Ff = 0; Ff < ai.length; Ff++) {
		var If = ai[Ff];
		oi(If.toLowerCase(), "on" + (If[0].toUpperCase() + If.slice(1)));
	}
	oi(Zr, "onAnimationEnd"), oi(Qr, "onAnimationIteration"), oi($r, "onAnimationStart"), oi("dblclick", "onDoubleClick"), oi("focusin", "onFocus"), oi("focusout", "onBlur"), oi(ei, "onTransitionRun"), oi(ti, "onTransitionStart"), oi(ni, "onTransitionCancel"), oi(ri, "onTransitionEnd"), Nt("onMouseEnter", ["mouseout", "mouseover"]), Nt("onMouseLeave", ["mouseout", "mouseover"]), Nt("onPointerEnter", ["pointerout", "pointerover"]), Nt("onPointerLeave", ["pointerout", "pointerover"]), Mt("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), Mt("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), Mt("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]), Mt("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), Mt("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), Mt("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var Lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Rf = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Lf));
	function zf(e, t) {
		t = !!(t & 4);
		for (var n = 0; n < e.length; n++) {
			var r = e[n], i = r.event;
			r = r.listeners;
			a: {
				var a = void 0;
				if (t) for (var o = r.length - 1; 0 <= o; o--) {
					var s = r[o], c = s.instance, l = s.currentTarget;
					if (s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						di(e);
					}
					i.currentTarget = null, a = c;
				}
				else for (o = 0; o < r.length; o++) {
					if (s = r[o], c = s.instance, l = s.currentTarget, s = s.listener, c !== a && i.isPropagationStopped()) break a;
					a = s, i.currentTarget = l;
					try {
						a(i);
					} catch (e) {
						di(e);
					}
					i.currentTarget = null, a = c;
				}
			}
		}
	}
	function Bf(e, t) {
		var n = t[W];
		n === void 0 && (n = t[W] = /* @__PURE__ */ new Set());
		var r = e + "__bubble";
		n.has(r) || (Wf(t, e, 2, !1), n.add(r));
	}
	function Vf(e, t, n) {
		var r = 0;
		t && (r |= 4), Wf(n, e, r, t);
	}
	var Hf = "_reactListening" + Math.random().toString(36).slice(2);
	function Uf(e) {
		if (!e[Hf]) {
			e[Hf] = !0, At.forEach(function(t) {
				t !== "selectionchange" && (Rf.has(t) || Vf(t, !1, e), Vf(t, !0, e));
			});
			var t = e.nodeType === 9 ? e : e.ownerDocument;
			t === null || t[Hf] || (t[Hf] = !0, Vf("selectionchange", !1, t));
		}
	}
	function Wf(e, t, n, r) {
		switch (Ch(t)) {
			case 2:
				var i = _h;
				break;
			case 8:
				i = vh;
				break;
			default: i = yh;
		}
		n = i.bind(null, t, n, e), i = void 0, !bn || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (i = !0), r ? i === void 0 ? e.addEventListener(t, n, !0) : e.addEventListener(t, n, {
			capture: !0,
			passive: i
		}) : i === void 0 ? e.addEventListener(t, n, !1) : e.addEventListener(t, n, { passive: i });
	}
	function Gf(e, t, n, r, i) {
		var a = r;
		if (!(t & 1) && !(t & 2) && r !== null) a: for (;;) {
			if (r === null) return;
			var o = r.tag;
			if (o === 3 || o === 4) {
				var s = r.stateNode.containerInfo;
				if (s === i) break;
				if (o === 4) for (o = r.return; o !== null;) {
					var c = o.tag;
					if ((c === 3 || c === 4) && o.stateNode.containerInfo === i) return;
					o = o.return;
				}
				for (; s !== null;) {
					if (o = Tt(s), o === null) return;
					if (c = o.tag, c === 5 || c === 6 || c === 26 || c === 27) {
						r = a = o;
						continue a;
					}
					s = s.parentNode;
				}
			}
			r = r.return;
		}
		_n(function() {
			var r = a, i = fn(n), o = [];
			a: {
				var s = ii.get(e);
				if (s !== void 0) {
					var c = An, u = e;
					switch (e) {
						case "keypress": if (Tn(n) === 0) break a;
						case "keydown":
						case "keyup":
							c = Jn;
							break;
						case "focusin":
							u = "focus", c = zn;
							break;
						case "focusout":
							u = "blur", c = zn;
							break;
						case "beforeblur":
						case "afterblur":
							c = zn;
							break;
						case "click": if (n.button === 2) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							c = Ln;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							c = Rn;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							c = Zn;
							break;
						case Zr:
						case Qr:
						case $r:
							c = Bn;
							break;
						case ri:
							c = Qn;
							break;
						case "scroll":
						case "scrollend":
							c = Mn;
							break;
						case "wheel":
							c = $n;
							break;
						case "copy":
						case "cut":
						case "paste":
							c = Vn;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							c = Yn;
							break;
						case "submit":
							c = Xn;
							break;
						case "toggle":
						case "beforetoggle": c = er;
					}
					var d = !!(t & 4), f = !d && (e === "scroll" || e === "scrollend"), p = d ? s === null ? null : s + "Capture" : s;
					d = [];
					for (var m = r, h; m !== null;) {
						var g = m;
						if (h = g.stateNode, g = g.tag, g !== 5 && g !== 26 && g !== 27 || h === null || p === null || (g = vn(m, p), g != null && d.push(Kf(m, g, h))), f) break;
						m = m.return;
					}
					0 < d.length && (s = new c(s, u, null, n, i), o.push({
						event: s,
						listeners: d
					}));
				}
			}
			if (!(t & 7)) {
				a: {
					if (c = e === "mouseover" || e === "pointerover", s = e === "mouseout" || e === "pointerout", c && n !== dn && (u = n.relatedTarget || n.fromElement) && (Tt(u) || u[yt])) break a;
					(s || c) && (u = i.window === i ? i : (c = i.ownerDocument) ? c.defaultView || c.parentWindow : window, s ? (c = n.relatedTarget || n.toElement, s = r, c = c ? Tt(c) : null, c !== null && (f = l(c), d = c.tag, c !== f || d !== 5 && d !== 27 && d !== 6) && (c = null)) : (s = null, c = r), s !== c && (d = Ln, g = "onMouseLeave", p = "onMouseEnter", m = "mouse", (e === "pointerout" || e === "pointerover") && (d = Yn, g = "onPointerLeave", p = "onPointerEnter", m = "pointer"), f = s == null ? u : Et(s), h = c == null ? u : Et(c), u = new d(g, m + "leave", s, n, i), u.target = f, u.relatedTarget = h, g = null, Tt(i) === r && (d = new d(p, m + "enter", c, n, i), d.target = h, d.relatedTarget = f, g = d), f = g, d = s && c ? E(s, c, Jf) : null, s !== null && Yf(o, u, s, d, !1), c !== null && f !== null && Yf(o, f, c, d, !0)));
				}
				a: {
					if (s = r ? Et(r) : window, c = s.nodeName && s.nodeName.toLowerCase(), c === "select" || c === "input" && s.type === "file") var _ = br;
					else if (mr(s)) {
						if (xr) _ = Ar;
						else {
							_ = Or;
							var v = Dr;
						}
					} else c = s.nodeName, !c || c.toLowerCase() !== "input" || s.type !== "checkbox" && s.type !== "radio" ? r && on(r.elementType) && (_ = br) : _ = kr;
					if (_ &&= _(e, r)) {
						hr(o, _, n, i);
						break a;
					}
					v && v(e, s, r);
				}
				switch (v = r ? Et(r) : window, e) {
					case "focusin":
						(mr(v) || v.contentEditable === "true") && (Vr = v, Hr = r, Ur = null);
						break;
					case "focusout":
						Ur = Hr = Vr = null;
						break;
					case "mousedown":
						Wr = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						Wr = !1, Gr(o, n, i);
						break;
					case "selectionchange": if (Br) break;
					case "keydown":
					case "keyup": Gr(o, n, i);
				}
				var y;
				if (nr) b: {
					switch (e) {
						case "compositionstart":
							var b = "onCompositionStart";
							break b;
						case "compositionend":
							b = "onCompositionEnd";
							break b;
						case "compositionupdate":
							b = "onCompositionUpdate";
							break b;
					}
					b = void 0;
				}
				else ur ? cr(e, n) && (b = "onCompositionEnd") : e === "keydown" && n.keyCode === 229 && (b = "onCompositionStart");
				b && (ar && n.locale !== "ko" && (ur || b !== "onCompositionStart" ? b === "onCompositionEnd" && ur && (y = wn()) : (J = i, Sn = "value" in J ? J.value : J.textContent, ur = !0)), v = qf(r, b), 0 < v.length && (b = new Hn(b, e, null, n, i), o.push({
					event: b,
					listeners: v
				}), y ? b.data = y : (y = lr(n), y !== null && (b.data = y)))), (y = ir ? dr(e, n) : fr(e, n)) && (b = qf(r, "onBeforeInput"), 0 < b.length && (v = new Hn("onBeforeInput", "beforeinput", null, n, i), o.push({
					event: v,
					listeners: b
				}), v.data = y)), Pf(o, e, r, n, i);
			}
			zf(o, t);
		});
	}
	function Kf(e, t, n) {
		return {
			instance: e,
			listener: t,
			currentTarget: n
		};
	}
	function qf(e, t) {
		for (var n = t + "Capture", r = []; e !== null;) {
			var i = e, a = i.stateNode;
			if (i = i.tag, i !== 5 && i !== 26 && i !== 27 || a === null || (i = vn(e, n), i != null && r.unshift(Kf(e, i, a)), i = vn(e, t), i != null && r.push(Kf(e, i, a))), e.tag === 3) return r;
			e = e.return;
		}
		return [];
	}
	function Jf(e) {
		if (e === null) return null;
		do
			e = e.return;
		while (e && e.tag !== 5 && e.tag !== 27);
		return e || null;
	}
	function Yf(e, t, n, r, i) {
		for (var a = t._reactName, o = []; n !== null && n !== r;) {
			var s = n, c = s.alternate, l = s.stateNode;
			if (s = s.tag, c !== null && c === r) break;
			s !== 5 && s !== 26 && s !== 27 || l === null || (c = l, i ? (l = vn(n, a), l != null && o.unshift(Kf(n, l, c))) : i || (l = vn(n, a), l != null && o.push(Kf(n, l, c)))), n = n.return;
		}
		o.length !== 0 && e.push({
			event: t,
			listeners: o
		});
	}
	var Xf = /\r\n?/g, Zf = /\u0000|\uFFFD/g;
	function Qf(e) {
		return (typeof e == "string" ? e : "" + e).replace(Xf, "\n").replace(Zf, "");
	}
	function $f(e, t) {
		return t = Qf(t), Qf(e) === t;
	}
	function ep(e, t, n, r, i, a) {
		switch (n) {
			case "children":
				if (typeof r == "string") t === "body" || t === "textarea" && r === "" || tn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") t !== "body" && tn(e, "" + r);
				else return;
				break;
			case "className":
				Bt(e, "class", r);
				break;
			case "tabIndex":
				Bt(e, "tabindex", r);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				Bt(e, n, r);
				break;
			case "style":
				an(e, r, a);
				return;
			case "data": if (t !== "object") {
				Bt(e, "data", r);
				break;
			}
			case "src":
			case "href":
				if (r === "" && (t !== "a" || n !== "href") || r == null || typeof r == "function" || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = ln(r), e.setAttribute(n, r);
				break;
			case "action":
			case "formAction":
				if (typeof r == "function") {
					e.setAttribute(n, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
					break;
				}
				if (typeof a == "function" && (n === "formAction" ? (t !== "input" && ep(e, t, "name", i.name, i, null), ep(e, t, "formEncType", i.formEncType, i, null), ep(e, t, "formMethod", i.formMethod, i, null), ep(e, t, "formTarget", i.formTarget, i, null)) : (ep(e, t, "encType", i.encType, i, null), ep(e, t, "method", i.method, i, null), ep(e, t, "target", i.target, i, null))), r == null || typeof r == "symbol" || typeof r == "boolean") {
					e.removeAttribute(n);
					break;
				}
				r = ln(r), e.setAttribute(n, r);
				break;
			case "onClick":
				r != null && (e.onclick = un);
				return;
			case "onScroll":
				r != null && Bf("scroll", e);
				return;
			case "onScrollEnd":
				r != null && Bf("scrollend", e);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						a?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "multiple":
				e.multiple = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "muted":
				e.muted = r && typeof r != "function" && typeof r != "symbol";
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref": break;
			case "autoFocus": break;
			case "xlinkHref":
				if (r == null || typeof r == "function" || typeof r == "boolean" || typeof r == "symbol") {
					e.removeAttribute("xlink:href");
					break;
				}
				n = ln(r), e.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", n);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "credentialless":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				r && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, "") : e.removeAttribute(n);
				break;
			case "capture":
			case "download":
				!0 === r ? e.setAttribute(n, "") : !1 !== r && r != null && typeof r != "function" && typeof r != "symbol" ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				r != null && typeof r != "function" && typeof r != "symbol" && !isNaN(r) && 1 <= r ? e.setAttribute(n, r) : e.removeAttribute(n);
				break;
			case "rowSpan":
			case "start":
				r == null || typeof r == "function" || typeof r == "symbol" || isNaN(r) ? e.removeAttribute(n) : e.setAttribute(n, r);
				break;
			case "popover":
				Bf("beforetoggle", e), Bf("toggle", e), zt(e, "popover", r);
				break;
			case "xlinkActuate":
				Vt(e, "http://www.w3.org/1999/xlink", "xlink:actuate", r);
				break;
			case "xlinkArcrole":
				Vt(e, "http://www.w3.org/1999/xlink", "xlink:arcrole", r);
				break;
			case "xlinkRole":
				Vt(e, "http://www.w3.org/1999/xlink", "xlink:role", r);
				break;
			case "xlinkShow":
				Vt(e, "http://www.w3.org/1999/xlink", "xlink:show", r);
				break;
			case "xlinkTitle":
				Vt(e, "http://www.w3.org/1999/xlink", "xlink:title", r);
				break;
			case "xlinkType":
				Vt(e, "http://www.w3.org/1999/xlink", "xlink:type", r);
				break;
			case "xmlBase":
				Vt(e, "http://www.w3.org/XML/1998/namespace", "xml:base", r);
				break;
			case "xmlLang":
				Vt(e, "http://www.w3.org/XML/1998/namespace", "xml:lang", r);
				break;
			case "xmlSpace":
				Vt(e, "http://www.w3.org/XML/1998/namespace", "xml:space", r);
				break;
			case "is":
				zt(e, "is", r);
				break;
			case "innerText":
			case "textContent": return;
			default: if (!(2 < n.length) || n[0] !== "o" && n[0] !== "O" || n[1] !== "n" && n[1] !== "N") n = sn.get(n) || n, zt(e, n, r);
			else return;
		}
		q = !0;
	}
	function tp(e, t, n, r, i, a) {
		switch (n) {
			case "style":
				an(e, r, a);
				return;
			case "dangerouslySetInnerHTML":
				if (r != null) {
					if (typeof r != "object" || !("__html" in r)) throw Error(s(61));
					if (n = r.__html, n != null) {
						if (i.children != null) throw Error(s(60));
						a?.__html !== n && (e.innerHTML = n);
					}
				}
				break;
			case "children":
				if (typeof r == "string") tn(e, r);
				else if (typeof r == "number" || typeof r == "bigint") tn(e, "" + r);
				else return;
				break;
			case "onScroll":
				r != null && Bf("scroll", e);
				return;
			case "onScrollEnd":
				r != null && Bf("scrollend", e);
				return;
			case "onClick":
				r != null && (e.onclick = un);
				return;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": return;
			case "innerText":
			case "textContent": return;
			default:
				if (!jt.hasOwnProperty(n)) a: {
					if (n[0] === "o" && n[1] === "n" && (i = n.endsWith("Capture"), a = n.slice(2, i ? n.length - 7 : void 0), t = e[U] || null, t = t == null ? null : t[n], typeof t == "function" && e.removeEventListener(a, t, i), typeof r == "function")) {
						typeof t != "function" && t !== null && (n in e ? e[n] = null : e.hasAttribute(n) && e.removeAttribute(n)), e.addEventListener(a, r, i);
						break a;
					}
					q = !0, n in e ? e[n] = r : !0 === r ? e.setAttribute(n, "") : zt(e, n, r);
				}
				return;
		}
		q = !0;
	}
	function np(e, t, n) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "img":
				Bf("error", e), Bf("load", e);
				var r = !1, i = !1, a;
				for (a in n) if (n.hasOwnProperty(a)) {
					var o = n[a];
					if (o != null) switch (a) {
						case "src":
							r = !0;
							break;
						case "srcSet":
							i = !0;
							break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(s(137, t));
						default: ep(e, t, a, o, n, null);
					}
				}
				i && ep(e, t, "srcSet", n.srcSet, n, null), r && ep(e, t, "src", n.src, n, null);
				return;
			case "input":
				Bf("invalid", e);
				var c = a = o = i = null, l = null, u = null;
				for (r in n) if (n.hasOwnProperty(r)) {
					var d = n[r];
					if (d != null) switch (r) {
						case "name":
							i = d;
							break;
						case "type":
							o = d;
							break;
						case "checked":
							l = d;
							break;
						case "defaultChecked":
							u = d;
							break;
						case "value":
							a = d;
							break;
						case "defaultValue":
							c = d;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (d != null) throw Error(s(137, t));
							break;
						default: ep(e, t, r, d, n, null);
					}
				}
				Xt(e, a, c, l, u, o, i, !1);
				return;
			case "select":
				for (i in Bf("invalid", e), r = o = a = null, n) if (n.hasOwnProperty(i) && (c = n[i], c != null)) switch (i) {
					case "value":
						a = c;
						break;
					case "defaultValue":
						o = c;
						break;
					case "multiple": r = c;
					default: ep(e, t, i, c, n, null);
				}
				t = a, n = o, e.multiple = !!r, t == null ? n != null && Qt(e, !!r, n, !0) : Qt(e, !!r, t, !1);
				return;
			case "textarea":
				for (o in Bf("invalid", e), a = i = r = null, n) if (n.hasOwnProperty(o) && (c = n[o], c != null)) switch (o) {
					case "value":
						r = c;
						break;
					case "defaultValue":
						i = c;
						break;
					case "children":
						a = c;
						break;
					case "dangerouslySetInnerHTML":
						if (c != null) throw Error(s(91));
						break;
					default: ep(e, t, o, c, n, null);
				}
				en(e, r, i, a);
				return;
			case "option":
				for (l in n) if (n.hasOwnProperty(l) && (r = n[l], r != null)) switch (l) {
					case "selected":
						e.selected = r && typeof r != "function" && typeof r != "symbol";
						break;
					default: ep(e, t, l, r, n, null);
				}
				return;
			case "dialog":
				Bf("beforetoggle", e), Bf("toggle", e), Bf("cancel", e), Bf("close", e);
				break;
			case "iframe":
			case "object":
				Bf("load", e);
				break;
			case "video":
			case "audio":
				for (r = 0; r < Lf.length; r++) Bf(Lf[r], e);
				break;
			case "image":
				Bf("error", e), Bf("load", e);
				break;
			case "details":
				Bf("toggle", e);
				break;
			case "embed":
			case "source":
			case "link": Bf("error", e), Bf("load", e);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (u in n) if (n.hasOwnProperty(u) && (r = n[u], r != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(s(137, t));
					default: ep(e, t, u, r, n, null);
				}
				return;
			default: if (on(t)) {
				for (d in n) n.hasOwnProperty(d) && (r = n[d], r !== void 0 && tp(e, t, d, r, n, void 0));
				return;
			}
		}
		for (c in n) n.hasOwnProperty(c) && (r = n[c], r != null && ep(e, t, c, r, n, null));
	}
	var rp = {};
	function ip(e, t, n, r) {
		switch (t) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "input":
				var i = null, a = null, o = null, c = null, l = null, u = null, d = null;
				for (m in n) {
					var f = n[m];
					if (n.hasOwnProperty(m) && f != null) switch (m) {
						case "checked": break;
						case "value": break;
						case "defaultValue": l = f;
						default: r.hasOwnProperty(m) || ep(e, t, m, null, r, f);
					}
				}
				for (var p in r) {
					var m = r[p];
					if (f = n[p], r.hasOwnProperty(p) && (m != null || f != null)) switch (p) {
						case "type":
							m !== f && (q = !0), a = m;
							break;
						case "name":
							m !== f && (q = !0), i = m;
							break;
						case "checked":
							m !== f && (q = !0), u = m;
							break;
						case "defaultChecked":
							m !== f && (q = !0), d = m;
							break;
						case "value":
							m !== f && (q = !0), o = m;
							break;
						case "defaultValue":
							m !== f && (q = !0), c = m;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (m != null) throw Error(s(137, t));
							break;
						default: m !== f && ep(e, t, p, m, r, f);
					}
				}
				Yt(e, o, c, l, u, d, a, i);
				return;
			case "select":
				for (a in m = o = c = p = null, n) if (l = n[a], n.hasOwnProperty(a) && l != null) switch (a) {
					case "value": break;
					case "multiple": m = l;
					default: r.hasOwnProperty(a) || ep(e, t, a, null, r, l);
				}
				for (i in r) if (a = r[i], l = n[i], r.hasOwnProperty(i) && (a != null || l != null)) switch (i) {
					case "value":
						a !== l && (q = !0), p = a;
						break;
					case "defaultValue":
						a !== l && (q = !0), c = a;
						break;
					case "multiple": a !== l && (q = !0), o = a;
					default: a !== l && ep(e, t, i, a, r, l);
				}
				t = c, n = o, r = m, p == null ? !!r != !!n && (t == null ? Qt(e, !!n, n ? [] : "", !1) : Qt(e, !!n, t, !0)) : Qt(e, !!n, p, !1);
				return;
			case "textarea":
				for (c in m = p = null, n) if (i = n[c], n.hasOwnProperty(c) && i != null && !r.hasOwnProperty(c)) switch (c) {
					case "value": break;
					case "children": break;
					default: ep(e, t, c, null, r, i);
				}
				for (o in r) if (i = r[o], a = n[o], r.hasOwnProperty(o) && (i != null || a != null)) switch (o) {
					case "value":
						i !== a && (q = !0), p = i;
						break;
					case "defaultValue":
						i !== a && (q = !0), m = i;
						break;
					case "children": break;
					case "dangerouslySetInnerHTML":
						if (i != null) throw Error(s(91));
						break;
					default: i !== a && ep(e, t, o, i, r, a);
				}
				$t(e, p, m);
				return;
			case "option":
				for (var h in n) if (p = n[h], n.hasOwnProperty(h) && p != null && !r.hasOwnProperty(h)) switch (h) {
					case "selected":
						e.selected = !1;
						break;
					default: ep(e, t, h, null, r, p);
				}
				for (l in r) if (p = r[l], m = n[l], r.hasOwnProperty(l) && p !== m && (p != null || m != null)) switch (l) {
					case "selected":
						p !== m && (q = !0), e.selected = p && typeof p != "function" && typeof p != "symbol";
						break;
					default: ep(e, t, l, p, r, m);
				}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var g in n) p = n[g], n.hasOwnProperty(g) && p != null && !r.hasOwnProperty(g) && ep(e, t, g, null, r, p);
				for (u in r) if (p = r[u], m = n[u], r.hasOwnProperty(u) && p !== m && (p != null || m != null)) switch (u) {
					case "children":
					case "dangerouslySetInnerHTML":
						if (p != null) throw Error(s(137, t));
						break;
					default: ep(e, t, u, p, r, m);
				}
				return;
			default: if (on(t)) {
				for (var _ in n) p = n[_], n.hasOwnProperty(_) && p !== void 0 && !r.hasOwnProperty(_) && tp(e, t, _, void 0, r, p);
				for (d in r) p = r[d], m = n[d], !r.hasOwnProperty(d) || p === m || p === void 0 && m === void 0 || tp(e, t, d, p, r, m);
				return;
			}
		}
		for (var v in n) p = n[v], n.hasOwnProperty(v) && p != null && !r.hasOwnProperty(v) && ep(e, t, v, null, r, p);
		for (f in r) p = r[f], m = n[f], !r.hasOwnProperty(f) || p === m || p == null && m == null || ep(e, t, f, p, r, m);
	}
	function ap(e) {
		switch (e) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link": return !0;
			default: return !1;
		}
	}
	function op() {
		if (typeof performance.getEntriesByType == "function") {
			for (var e = 0, t = 0, n = performance.getEntriesByType("resource"), r = 0; r < n.length; r++) {
				var i = n[r], a = i.transferSize, o = i.initiatorType, s = i.duration;
				if (a && s && ap(o)) {
					for (o = 0, s = i.responseEnd, r += 1; r < n.length; r++) {
						var c = n[r], l = c.startTime;
						if (l > s) break;
						var u = c.transferSize, d = c.initiatorType;
						u && ap(d) && (c = c.responseEnd, o += u * (c < s ? 1 : (s - l) / (c - l)));
					}
					if (--r, t += 8 * (a + o) / (i.duration / 1e3), e++, 10 < e) break;
				}
			}
			if (0 < e) return t / e / 1e6;
		}
		return navigator.connection && (e = navigator.connection.downlink, typeof e == "number") ? e : 5;
	}
	var sp = null, cp = null;
	function lp(e) {
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	function up(e) {
		switch (e) {
			case "http://www.w3.org/2000/svg": return 1;
			case "http://www.w3.org/1998/Math/MathML": return 2;
			default: return 0;
		}
	}
	function dp(e, t) {
		if (e === 0) switch (t) {
			case "svg": return 1;
			case "math": return 2;
			default: return 0;
		}
		return e === 1 && t === "foreignObject" ? 0 : e;
	}
	function fp(e, t, n, r) {
		return n = lp(n).createElement(e), n[H] = r, n[U] = t, np(n, e, t), Ot(n), n;
	}
	function pp(e, t) {
		return e === "textarea" || e === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
	}
	var mp = null;
	function hp() {
		var e = window.event;
		return e && e.type === "popstate" ? e !== mp && (mp = e, !0) : (mp = null, !1);
	}
	var gp = typeof setTimeout == "function" ? setTimeout : void 0, _p = typeof clearTimeout == "function" ? clearTimeout : void 0, vp = typeof Promise == "function" ? Promise : void 0, yp = typeof requestAnimationFrame == "function" ? requestAnimationFrame : gp, bp = typeof queueMicrotask == "function" ? queueMicrotask : vp === void 0 ? gp : function(e) {
		return vp.resolve(null).then(e).catch(xp);
	};
	function xp(e) {
		setTimeout(function() {
			throw e;
		});
	}
	function Sp(e) {
		return e === "head";
	}
	function Cp(e, t) {
		var n = t, r = 0;
		do {
			var i = n.nextSibling;
			if (e.removeChild(n), i && i.nodeType === 8) {
				if (n = i.data, n === "/$" || n === "/&") {
					if (r === 0) {
						e.removeChild(i), Hh(t);
						return;
					}
					r--;
				} else if (n === "$" || n === "$?" || n === "$~" || n === "$!" || n === "&") r++;
				else if (n === "html") _m(e.ownerDocument.documentElement);
				else if (n === "head") {
					n = e.ownerDocument.head, _m(n);
					for (var a = n.firstChild; a;) {
						var o = a.nextSibling, s = a.nodeName;
						a[St] || s === "SCRIPT" || s === "STYLE" || s === "LINK" && a.rel.toLowerCase() === "stylesheet" || n.removeChild(a), a = o;
					}
				} else n === "body" && _m(e.ownerDocument.body);
			}
			n = i;
		} while (n);
		Hh(t);
	}
	function wp(e, t) {
		var n = e;
		e = 0;
		do {
			var r = n.nextSibling;
			if (n.nodeType === 1 ? t ? (n._stashedDisplay = n.style.display, n.style.display = "none") : (n.style.display = n._stashedDisplay || "", n.getAttribute("style") === "" && n.removeAttribute("style")) : n.nodeType === 3 && (t ? (n._stashedText = n.nodeValue, n.nodeValue = "") : n.nodeValue = n._stashedText || ""), r && r.nodeType === 8) {
				if (n = r.data, n === "/$") {
					if (e === 0) break;
					e--;
				} else n !== "$" && n !== "$?" && n !== "$~" && n !== "$!" || e++;
			}
			n = r;
		} while (n);
	}
	function Tp(e, t, n) {
		if (t = CSS.escape(t) === t ? t : "r-" + btoa(t).replace(/=/g, ""), e.style.viewTransitionName = t, n != null && (e.style.viewTransitionClass = n), n = getComputedStyle(e), n.display === "inline") {
			if (t = e.getClientRects(), t.length === 1) var r = 1;
			else for (var i = r = 0; i < t.length; i++) {
				var a = t[i];
				0 < a.width && 0 < a.height && r++;
			}
			r === 1 && (e = e.style, e.display = t.length === 1 ? "inline-block" : "block", e.marginTop = "-" + n.paddingTop, e.marginBottom = "-" + n.paddingBottom);
		}
	}
	function Ep(e, t) {
		e = e.style, t = t.style;
		var n = t == null ? null : t.hasOwnProperty("viewTransitionName") ? t.viewTransitionName : t.hasOwnProperty("view-transition-name") ? t["view-transition-name"] : null;
		e.viewTransitionName = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), n = t == null ? null : t.hasOwnProperty("viewTransitionClass") ? t.viewTransitionClass : t.hasOwnProperty("view-transition-class") ? t["view-transition-class"] : null, e.viewTransitionClass = n == null || typeof n == "boolean" ? "" : ("" + n).trim(), e.display === "inline-block" && (t == null ? e.display = e.margin = "" : (n = t.display, e.display = n == null || typeof n == "boolean" ? "" : n, n = t.margin, n == null ? (n = t.hasOwnProperty("marginTop") ? t.marginTop : t["margin-top"], e.marginTop = n == null || typeof n == "boolean" ? "" : n, t = t.hasOwnProperty("marginBottom") ? t.marginBottom : t["margin-bottom"], e.marginBottom = t == null || typeof t == "boolean" ? "" : t) : e.margin = n));
	}
	function Dp(e, t, n) {
		return n = n.ownerDocument.defaultView, {
			rect: e,
			abs: t.position === "absolute" || t.position === "fixed",
			clip: t.clipPath !== "none" || t.overflow !== "visible" || t.filter !== "none" || t.mask !== "none" || t.mask !== "none" || t.borderRadius !== "0px",
			view: 0 <= e.bottom && 0 <= e.right && e.top <= n.innerHeight && e.left <= n.innerWidth
		};
	}
	function Op(e) {
		return Dp(e.getBoundingClientRect(), getComputedStyle(e), e);
	}
	function kp(e) {
		var t = e.getBoundingClientRect();
		t = new DOMRect(t.x + 2e4, t.y + 2e4, t.width, t.height);
		var n = getComputedStyle(e);
		return Dp(t, n, e);
	}
	function Ap(e) {
		return e.documentElement.clientHeight;
	}
	function jp(e) {
		this.addEventListener("load", e), this.addEventListener("error", e);
	}
	function Mp(e, t, n, r, i, a, o, s, c) {
		var l = t.nodeType === 9 ? t : t.ownerDocument;
		try {
			var u = l.startViewTransition({
				update: function() {
					var t = l.defaultView, n = t.navigation && t.navigation.transition, o = l.fonts.status;
					r();
					var s = [];
					if (o === "loaded" && (Ap(l), l.fonts.status === "loading" && s.push(l.fonts.ready)), o = s.length, e !== null) for (var c = e.suspenseyImages, u = 0, d = 0; d < c.length; d++) {
						var f = c[d];
						if (!f.complete) {
							var p = f.getBoundingClientRect();
							if (0 < p.bottom && 0 < p.right && p.top < t.innerHeight && p.left < t.innerWidth) {
								if (u += Xm(f), u > $m) {
									s.length = o;
									break;
								}
								f = new Promise(jp.bind(f)), s.push(f);
							}
						}
					}
					if (0 < s.length) return t = Promise.race([Promise.all(s), new Promise(function(e) {
						return setTimeout(e, 500);
					})]).then(i, i), (n ? Promise.allSettled([n.finished, t]) : t).then(a, a);
					if (i(), n) return n.finished.then(a, a);
					a();
				},
				types: n
			});
			l.__reactViewTransition = u;
			var d = [];
			return u.ready.then(function() {
				for (var e = l.documentElement.getAnimations({ subtree: !0 }), t = 0; t < e.length; t++) {
					var n = e[t], r = n.effect, i = r.pseudoElement;
					if (i != null && i.startsWith("::view-transition")) {
						d.push(n), n = r.getKeyframes();
						for (var a = i = void 0, s = !0, c = 0; c < n.length; c++) {
							var u = n[c], f = u.width;
							if (i === void 0) i = f;
							else if (i !== f) {
								s = !1;
								break;
							}
							if (f = u.height, a === void 0) a = f;
							else if (a !== f) {
								s = !1;
								break;
							}
							delete u.width, delete u.height, u.transform === "none" && delete u.transform;
						}
						s && i !== void 0 && a !== void 0 && (r.setKeyframes(n), s = getComputedStyle(r.target, r.pseudoElement), s.width !== i || s.height !== a) && (s = n[0], s.width = i, s.height = a, s = n[n.length - 1], s.width = i, s.height = a, r.setKeyframes(n));
					}
				}
				o();
			}, function(e) {
				l.__reactViewTransition === u && (l.__reactViewTransition = null);
				try {
					if (typeof e == "object" && e) switch (e.name) {
						case "InvalidStateError": (e.message === "View transition was skipped because document visibility state is hidden." || e.message === "Skipping view transition because document visibility state has become hidden." || e.message === "Skipping view transition because viewport size changed." || e.message === "Transition was aborted because of invalid state") && (e = null);
					}
					e !== null && c(e);
				} finally {
					r(), i(), o();
				}
			}), u.finished.finally(function() {
				for (var e = 0; e < d.length; e++) d[e].cancel();
				l.__reactViewTransition === u && (l.__reactViewTransition = null), s();
			}), u;
		} catch {
			return r(), i(), o(), null;
		}
	}
	function Np(e, t) {
		this._scope = document.documentElement, this._selector = "::view-transition-" + e + "(" + t + ")";
	}
	Np.prototype.animate = function(e, t) {
		return t = typeof t == "number" ? { duration: t } : D({}, t), t.pseudoElement = this._selector, this._scope.animate(e, t);
	}, Np.prototype.getAnimations = function() {
		for (var e = this._scope, t = this._selector, n = e.getAnimations({ subtree: !0 }), r = [], i = 0; i < n.length; i++) {
			var a = n[i].effect;
			a !== null && a.target === e && a.pseudoElement === t && r.push(n[i]);
		}
		return r;
	}, Np.prototype.getComputedStyle = function() {
		return getComputedStyle(this._scope, this._selector);
	};
	function Pp(e) {
		return {
			name: e,
			group: new Np("group", e),
			imagePair: new Np("image-pair", e),
			old: new Np("old", e),
			new: new Np("new", e)
		};
	}
	function Fp(e) {
		this._fragmentFiber = e, this._observers = this._eventListeners = null;
	}
	Fp.prototype.addEventListener = function(e, t, n) {
		var r = null, i = null;
		if (!(n != null && typeof n != "boolean" && (r = n.signal || null, r !== null && r.aborted))) {
			this._eventListeners === null && (this._eventListeners = []);
			var a = this._eventListeners;
			if (Bp(a, e, t, n) === -1) {
				var o = this, s = t;
				n != null && typeof n != "boolean" && !0 === n.once && (s = function(r) {
					o.removeEventListener(e, t, n), typeof t == "function" ? t.call(this, r) : t.handleEvent(r);
				}), r !== null && (i = o.removeEventListener.bind(o, e, t, n), r.addEventListener("abort", i, { once: !0 }), i = r.removeEventListener.bind(r, "abort", i)), r = Rp(n), a.push({
					type: e,
					listener: t,
					optionsOrUseCapture: n,
					attachedListener: s,
					cleanup: i
				}), h(this._fragmentFiber.child, !1, Ip, e, s, r);
			}
			this._eventListeners = a;
		}
	};
	function Ip(e, t, n, r) {
		return b(e).addEventListener(t, n, r), !1;
	}
	Fp.prototype.removeEventListener = function(e, t, n) {
		var r = this._eventListeners;
		if (r !== null && (t = Bp(r, e, t, n), t !== -1)) {
			var i = r[t];
			n = i.attachedListener;
			var a = i.cleanup;
			i = Rp(i.optionsOrUseCapture), h(this._fragmentFiber.child, !1, Lp, e, n, i), r.splice(t, 1), a !== null && a();
		}
	};
	function Lp(e, t, n, r) {
		return b(e).removeEventListener(t, n, r), !1;
	}
	function Rp(e) {
		return e != null && typeof e != "boolean" && (!0 === e.once || e.signal instanceof AbortSignal) ? {
			capture: e.capture,
			passive: e.passive
		} : e;
	}
	function zp(e) {
		return e == null ? "c=0" : typeof e == "boolean" ? "c=" + (e ? "1" : "0") : "c=" + (e.capture ? "1" : "0");
	}
	function Bp(e, t, n, r) {
		if (e.length === 0) return -1;
		r = zp(r);
		for (var i = 0; i < e.length; i++) {
			var a = e[i];
			if (a.type === t && a.listener === n && zp(a.optionsOrUseCapture) === r) return i;
		}
		return -1;
	}
	Fp.prototype.dispatchEvent = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return !0;
		t = b(t);
		var n = this._eventListeners;
		if (n !== null && 0 < n.length || !e.bubbles) {
			var r = t.nodeType === 9 ? t.createComment("") : document.createTextNode("");
			if (n) for (var i = 0; i < n.length; i++) {
				var a = n[i];
				r.addEventListener(a.type, a.attachedListener, Rp(a.optionsOrUseCapture));
			}
			if (t.appendChild(r), e = r.dispatchEvent(e), n) for (i = 0; i < n.length; i++) a = n[i], r.removeEventListener(a.type, a.attachedListener, Rp(a.optionsOrUseCapture));
			return t.removeChild(r), e;
		}
		return t.dispatchEvent(e);
	}, Fp.prototype.focus = function(e) {
		h(this._fragmentFiber.child, !0, Vp, e, void 0, void 0);
	};
	function Vp(e, t) {
		return e.tag !== 6 && (e = b(e), pm(e, t));
	}
	Fp.prototype.focusLast = function(e) {
		var t = [];
		h(this._fragmentFiber.child, !0, Hp, t, void 0, void 0);
		for (var n = t.length - 1; 0 <= n && !Vp(t[n], e); n--);
	};
	function Hp(e, t) {
		return t.push(e), !1;
	}
	Fp.prototype.blur = function() {
		var e = g(this._fragmentFiber);
		e !== null && (e = b(e), e = lp(e).activeElement, e !== null && h(this._fragmentFiber.child, !1, Up, e, void 0, void 0));
	};
	function Up(e, t) {
		return e.tag !== 6 && (e = b(e), e === t || e.contains(t) ? (t.blur(), !0) : !1);
	}
	Fp.prototype.observeUsing = function(e) {
		this._observers === null && (this._observers = /* @__PURE__ */ new Set()), this._observers.add(e), h(this._fragmentFiber.child, !1, Wp, e, void 0, void 0);
	};
	function Wp(e, t) {
		return e.tag === 6 || (e = b(e), t.observe(e)), !1;
	}
	Fp.prototype.unobserveUsing = function(e) {
		var t = this._observers;
		if (t !== null && t.has(e)) {
			t.delete(e), h(this._fragmentFiber.child, !1, Gp, e, void 0, void 0);
			for (var n = t = 0; n < Kp.length; n++) {
				var r = Kp[n];
				r.fragmentInstance === this && r.observer === e ? e.unobserve(r.instance) : Kp[t++] = r;
			}
			Kp.length = t;
		}
	};
	function Gp(e, t) {
		return e.tag === 6 || (e = b(e), t.unobserve(e)), !1;
	}
	var Kp = [], qp = !1;
	function Jp(e, t, n) {
		Kp.push({
			fragmentInstance: e,
			observer: t,
			instance: n
		}), qp || (qp = !0, mm(function() {
			qp = !1;
			var e = Kp;
			Kp = [];
			for (var t = 0; t < e.length; t++) {
				var n = e[t];
				n.observer.unobserve(n.instance);
			}
		}));
	}
	Fp.prototype.getClientRects = function() {
		var e = [];
		return h(this._fragmentFiber.child, !1, Yp, e, void 0, void 0), e;
	};
	function Yp(e, t) {
		if (e.tag === 6) {
			e = e.stateNode;
			var n = e.ownerDocument.createRange();
			n.selectNodeContents(e), t.push.apply(t, n.getClientRects());
		} else e = b(e), t.push.apply(t, e.getClientRects());
		return !1;
	}
	Fp.prototype.getRootNode = function(e) {
		var t = g(this._fragmentFiber);
		return t === null ? this : b(t).getRootNode(e);
	}, Fp.prototype.compareDocumentPosition = function(e) {
		var t = g(this._fragmentFiber);
		if (t === null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		var n = [];
		h(this._fragmentFiber.child, !1, Hp, n, void 0, void 0);
		var r = b(t);
		if (n.length === 0) {
			if (n = r, _(this._fragmentFiber)) {
				a: {
					for (t = this._fragmentFiber.return; t !== null;) {
						if (t.tag === 4) {
							t = t.stateNode.containerInfo;
							break a;
						}
						if (t.tag === 3 || t.tag === 5 || t.tag === 27) break;
						t = t.return;
					}
					t = null;
				}
				t != null && (n = t);
			}
			t = this._fragmentFiber;
			var i = r = n.compareDocumentPosition(e);
			return n === e ? i = Node.DOCUMENT_POSITION_CONTAINS : r & Node.DOCUMENT_POSITION_CONTAINED_BY && (n = v(t)[1], n === null ? i = Node.DOCUMENT_POSITION_PRECEDING : (e = b(n).compareDocumentPosition(e), i = e === 0 || e & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING)), i |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
		}
		t = b(n[0]), i = b(n[n.length - 1]);
		var a = _(this._fragmentFiber) ? t.parentElement : r;
		if (a == null) return Node.DOCUMENT_POSITION_DISCONNECTED;
		r = a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_CONTAINED_BY, a = a.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_CONTAINED_BY;
		var o = t.compareDocumentPosition(e), s = i.compareDocumentPosition(e), c = o & Node.DOCUMENT_POSITION_CONTAINED_BY || s & Node.DOCUMENT_POSITION_CONTAINED_BY;
		return s = r && a && o & Node.DOCUMENT_POSITION_FOLLOWING && s & Node.DOCUMENT_POSITION_PRECEDING, t = r && t === e || a && i === e || c || s ? Node.DOCUMENT_POSITION_CONTAINED_BY : !r && t === e || !a && i === e ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : o, t & Node.DOCUMENT_POSITION_DISCONNECTED || t & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || Xp(t, this._fragmentFiber, n[0], n[n.length - 1], e) ? t : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
	};
	function Xp(e, t, n, r, i) {
		var a = Tt(i);
		if (e & Node.DOCUMENT_POSITION_CONTAINED_BY) {
			if (n = !!a) a: {
				for (; a !== null;) {
					if (a.tag === 7 && (a === t || a.alternate === t)) {
						n = !0;
						break a;
					}
					a = a.return;
				}
				n = !1;
			}
			return n;
		}
		if (e & Node.DOCUMENT_POSITION_CONTAINS) {
			if (a === null) return a = i.ownerDocument, i === a || i === a.documentElement || i === a.body;
			a: {
				for (a = t, t = g(t); a !== null;) {
					if (!(a.tag !== 5 && a.tag !== 3 && a.tag !== 27 || a !== t && a.alternate !== t)) {
						a = !0;
						break a;
					}
					a = a.return;
				}
				a = !1;
			}
			return a;
		}
		return e & Node.DOCUMENT_POSITION_PRECEDING ? ((t = !!a) && !(t = a === n) && (t = E(n, a, T), t === null ? t = !1 : (h(t, !0, C, a, n), a = x, x = null, t = a !== null)), t) : e & Node.DOCUMENT_POSITION_FOLLOWING ? ((t = !!a) && !(t = a === r) && (t = E(r, a, T), t === null ? t = !1 : (h(t, !0, w, a, r), a = x, S = x = null, t = a !== null)), t) : !1;
	}
	function Zp(e, t) {
		var n = e.ownerDocument.createRange();
		n.selectNodeContents(e), e = n.getBoundingClientRect(), window.scrollTo(window.scrollX + e.left, t ? window.scrollY + e.top : window.scrollY + e.bottom - window.innerHeight);
	}
	Fp.prototype.scrollIntoView = function(e) {
		if (typeof e == "object") throw Error(s(566));
		var t = [];
		h(this._fragmentFiber.child, !1, Hp, t, void 0, void 0);
		var n = !1 !== e;
		if (t.length === 0) {
			var r = v(this._fragmentFiber);
			if (r = n ? r[1] || r[0] || g(this._fragmentFiber) : r[0] || r[1], r === null) return;
			if (r.tag === 6) {
				e = b(r), Zp(e, n);
				return;
			}
			if (r = b(r), r.nodeType !== 9) {
				if (r.nodeType === 11) {
					n = "host" in r ? r.host : null, n !== null && n.scrollIntoView(e);
					return;
				}
				r.scrollIntoView(e);
			}
		}
		for (r = n ? t.length - 1 : 0; r !== (n ? -1 : t.length);) {
			var i = t[r];
			i.tag === 6 ? (i = b(i), Zp(i, n)) : b(i).scrollIntoView(e), r += n ? -1 : 1;
		}
	};
	function Qp(e, t) {
		return e = b(e), $p(e, t), !1;
	}
	function $p(e, t) {
		e.reactFragments ??= /* @__PURE__ */ new Set(), e.reactFragments.add(t);
	}
	function em(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.addEventListener(i.type, i.attachedListener, Rp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			for (var r = 0, i = 0; i < Kp.length; i++) {
				var a = Kp[i];
				(a.fragmentInstance !== t || a.observer !== n || a.instance !== e) && (Kp[r++] = a);
			}
			Kp.length = r, n.observe(e);
		}), $p(e, t));
	}
	function tm(e, t) {
		var n = t._eventListeners;
		if (n !== null) for (var r = 0; r < n.length; r++) {
			var i = n[r];
			e.removeEventListener(i.type, i.attachedListener, Rp(i.optionsOrUseCapture));
		}
		e.nodeType !== 3 && (n = t._observers, n !== null && n.forEach(function(n) {
			typeof n.rootMargin == "string" ? Jp(t, n, e) : n.unobserve(e);
		}), e.reactFragments != null && e.reactFragments.delete(t));
	}
	function nm(e) {
		var t = e.firstChild;
		for (t && t.nodeType === 10 && (t = t.nextSibling); t;) {
			var n = t;
			switch (t = t.nextSibling, n.nodeName) {
				case "HTML":
				case "HEAD":
				case "BODY":
					nm(n), wt(n);
					continue;
				case "SCRIPT":
				case "STYLE": continue;
				case "LINK": if (n.rel.toLowerCase() === "stylesheet") continue;
			}
			e.removeChild(n);
		}
	}
	function rm(e, t, n, r) {
		for (; e.nodeType === 1;) {
			var i = n;
			if (e.nodeName.toLowerCase() !== t.toLowerCase()) {
				if (!r && (e.nodeName !== "INPUT" || e.type !== "hidden")) break;
			} else if (!r) {
				if (t === "input" && e.type === "hidden") {
					var a = i.name == null ? null : "" + i.name;
					if (i.type === "hidden" && e.getAttribute("name") === a) return e;
				} else return e;
			} else if (!e[St]) switch (t) {
				case "meta":
					if (!e.hasAttribute("itemprop")) break;
					return e;
				case "link":
					if (a = e.getAttribute("rel"), a === "stylesheet" && e.hasAttribute("data-precedence") || a !== i.rel || e.getAttribute("href") !== (i.href == null || i.href === "" ? null : i.href) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin) || e.getAttribute("title") !== (i.title == null ? null : i.title)) break;
					return e;
				case "style":
					if (e.hasAttribute("data-precedence")) break;
					return e;
				case "script":
					if (a = e.getAttribute("src"), (a !== (i.src == null ? null : i.src) || e.getAttribute("type") !== (i.type == null ? null : i.type) || e.getAttribute("crossorigin") !== (i.crossOrigin == null ? null : i.crossOrigin)) && a && e.hasAttribute("async") && !e.hasAttribute("itemprop")) break;
					return e;
				default: return e;
			}
			if (e = lm(e.nextSibling), e === null) break;
		}
		return null;
	}
	function im(e, t, n) {
		if (t === "") return null;
		for (; e.nodeType !== 3;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !n || (e = lm(e.nextSibling), e === null)) return null;
		return e;
	}
	function am(e, t) {
		for (; e.nodeType !== 8;) if ((e.nodeType !== 1 || e.nodeName !== "INPUT" || e.type !== "hidden") && !t || (e = lm(e.nextSibling), e === null)) return null;
		return e;
	}
	function om(e) {
		return e.data === "$?" || e.data === "$~";
	}
	function sm(e) {
		return e.data === "$!" || e.data === "$?" && e.ownerDocument.readyState !== "loading";
	}
	function cm(e, t) {
		var n = e.ownerDocument;
		if (e.data === "$~") e._reactRetry = t;
		else if (e.data !== "$?" || n.readyState !== "loading") t();
		else {
			var r = function() {
				t(), n.removeEventListener("DOMContentLoaded", r);
			};
			n.addEventListener("DOMContentLoaded", r), e._reactRetry = r;
		}
	}
	function lm(e) {
		for (; e != null; e = e.nextSibling) {
			var t = e.nodeType;
			if (t === 1 || t === 3) break;
			if (t === 8) {
				if (t = e.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F") break;
				if (t === "/$" || t === "/&") return null;
			}
		}
		return e;
	}
	var um = null;
	function dm(e) {
		e = e.nextSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "/$" || n === "/&") {
					if (t === 0) return lm(e.nextSibling);
					t--;
				} else n !== "$" && n !== "$!" && n !== "$?" && n !== "$~" && n !== "&" || t++;
			}
			e = e.nextSibling;
		}
		return null;
	}
	function fm(e) {
		e = e.previousSibling;
		for (var t = 0; e;) {
			if (e.nodeType === 8) {
				var n = e.data;
				if (n === "$" || n === "$!" || n === "$?" || n === "$~" || n === "&") {
					if (t === 0) return e;
					t--;
				} else n !== "/$" && n !== "/&" || t++;
			}
			e = e.previousSibling;
		}
		return null;
	}
	function pm(e, t) {
		function n() {
			r = !0;
		}
		if (e.ownerDocument.activeElement === e) return !0;
		var r = !1;
		try {
			e.ownerDocument.addEventListener("focus", n, !0), (e.focus || HTMLElement.prototype.focus).call(e, t);
		} finally {
			e.ownerDocument.removeEventListener("focus", n, !0);
		}
		return r;
	}
	function mm(e) {
		yp(function() {
			yp(function(t) {
				return e(t);
			});
		});
	}
	function hm(e, t, n) {
		switch (t = lp(n), e) {
			case "html":
				if (e = t.documentElement, !e) throw Error(s(452));
				return e;
			case "head":
				if (e = t.head, !e) throw Error(s(453));
				return e;
			case "body":
				if (e = t.body, !e) throw Error(s(454));
				return e;
			default: throw Error(s(451));
		}
	}
	function gm(e, t, n) {
		for (var r in n) {
			var i = n[r];
			n.hasOwnProperty(r) && i != null && ep(e, t, r, null, rp, i);
		}
		n.dangerouslySetInnerHTML != null && (e.textContent = ""), e.onclick === un && (e.onclick = null), wt(e);
	}
	function _m(e) {
		for (var t = e.attributes; t.length;) e.removeAttributeNode(t[0]);
		wt(e);
	}
	var vm = /* @__PURE__ */ new Map(), ym = /* @__PURE__ */ new Set();
	function bm(e) {
		if (typeof e.getRootNode == "function") {
			var t = e.getRootNode();
			if (t.nodeType === 9 || t.nodeType === 11) return t;
		}
		return e.nodeType === 9 ? e : e.ownerDocument;
	}
	var xm = I.d;
	I.d = {
		f: Sm,
		r: Cm,
		D: Em,
		C: Dm,
		L: Om,
		m: km,
		X: jm,
		S: Am,
		M: Mm
	};
	function Sm() {
		var e = xm.f(), t = Id();
		return e || t;
	}
	function Cm(e) {
		var t = K(e);
		t !== null && t.tag === 5 && t.type === "form" ? qs(t) : xm.r(e);
	}
	var wm = typeof document > "u" ? null : document;
	function Tm(e, t, n) {
		var r = wm;
		if (r && typeof t == "string" && t) {
			var i = Jt(t);
			i = "link[rel=\"" + e + "\"][href=\"" + i + "\"]", typeof n == "string" && (i += "[crossorigin=\"" + n + "\"]"), ym.has(i) || (ym.add(i), e = {
				rel: e,
				crossOrigin: n,
				href: t
			}, r.querySelector(i) === null && (t = r.createElement("link"), np(t, "link", e), Ot(t), r.head.appendChild(t)));
		}
	}
	function Em(e) {
		xm.D(e), Tm("dns-prefetch", e, null);
	}
	function Dm(e, t) {
		xm.C(e, t), Tm("preconnect", e, t);
	}
	function Om(e, t, n) {
		xm.L(e, t, n);
		var r = wm;
		if (r && e && t) {
			var i = "link[rel=\"preload\"][as=\"" + Jt(t) + "\"]";
			t === "image" && n && n.imageSrcSet ? (i += "[imagesrcset=\"" + Jt(n.imageSrcSet) + "\"]", typeof n.imageSizes == "string" && (i += "[imagesizes=\"" + Jt(n.imageSizes) + "\"]")) : i += "[href=\"" + Jt(e) + "\"]";
			var a = i;
			switch (t) {
				case "style":
					a = Pm(e);
					break;
				case "script": a = Rm(e);
			}
			if (!(vm.has(a) || (e = D({
				rel: "preload",
				href: t === "image" && n && n.imageSrcSet ? void 0 : e,
				as: t
			}, n), vm.set(a, e), r.querySelector(i) !== null || t === "style" && r.querySelector(Fm(a)) || t === "script" && r.querySelector(zm(a))))) {
				var o = r.createElement("link");
				np(o, "link", e), t === "style" && (o[Ct] = !0, o.onload = o.onerror = function() {
					kt(o);
				}), Ot(o), r.head.appendChild(o);
			}
		}
	}
	function km(e, t) {
		xm.m(e, t);
		var n = wm;
		if (n && e) {
			var r = t && typeof t.as == "string" ? t.as : "script", i = "link[rel=\"modulepreload\"][as=\"" + Jt(r) + "\"][href=\"" + Jt(e) + "\"]", a = i;
			switch (r) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script": a = Rm(e);
			}
			if (!vm.has(a) && (e = D({
				rel: "modulepreload",
				href: e
			}, t), vm.set(a, e), n.querySelector(i) === null)) {
				switch (r) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script": if (n.querySelector(zm(a))) return;
				}
				r = n.createElement("link"), np(r, "link", e), Ot(r), n.head.appendChild(r);
			}
		}
	}
	function Am(e, t, n) {
		xm.S(e, t, n);
		var r = wm;
		if (r && e) {
			var i = Dt(r).hoistableStyles, a = Pm(e);
			t ||= "default";
			var o = i.get(a);
			if (!o) {
				var s = {
					loading: 0,
					preload: null
				};
				if (o = r.querySelector(Fm(a))) s.loading = 5;
				else {
					e = D({
						rel: "stylesheet",
						href: e,
						"data-precedence": t
					}, n), (n = vm.get(a)) && Hm(e, n);
					var c = o = r.createElement("link");
					Ot(c), np(c, "link", e), c._p = new Promise(function(e, t) {
						c.onload = e, c.onerror = t;
					}), c.addEventListener("load", function() {
						s.loading |= 1;
					}), c.addEventListener("error", function() {
						s.loading |= 2;
					}), s.loading |= 4, Vm(o, t, r);
				}
				o = {
					type: "stylesheet",
					instance: o,
					count: 1,
					state: s
				}, i.set(a, o);
			}
		}
	}
	function jm(e, t) {
		xm.X(e, t);
		var n = wm;
		if (n && e) {
			var r = Dt(n).hoistableScripts, i = Rm(e), a = r.get(i);
			a || (a = n.querySelector(zm(i)), a || (e = D({
				src: e,
				async: !0
			}, t), (t = vm.get(i)) && Um(e, t), a = n.createElement("script"), Ot(a), np(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Mm(e, t) {
		xm.M(e, t);
		var n = wm;
		if (n && e) {
			var r = Dt(n).hoistableScripts, i = Rm(e), a = r.get(i);
			a || (a = n.querySelector(zm(i)), a || (e = D({
				src: e,
				async: !0,
				type: "module"
			}, t), (t = vm.get(i)) && Um(e, t), a = n.createElement("script"), Ot(a), np(a, "link", e), n.head.appendChild(a)), a = {
				type: "script",
				instance: a,
				count: 1,
				state: null
			}, r.set(i, a));
		}
	}
	function Nm(e, t, n, r) {
		var i = (i = we.current) ? bm(i) : null;
		if (!i) throw Error(s(446));
		switch (e) {
			case "meta":
			case "title": return null;
			case "style": return typeof n.precedence == "string" && typeof n.href == "string" ? (n = Pm(n.href), t = Dt(i).hoistableStyles, r = t.get(n), r || (r = {
				type: "style",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			case "link":
				if (n.rel === "stylesheet" && typeof n.href == "string" && typeof n.precedence == "string") {
					e = Pm(n.href);
					var a = Dt(i).hoistableStyles, o = a.get(e);
					if (o || (i = i.ownerDocument || i, o = {
						type: "stylesheet",
						instance: null,
						count: 0,
						state: {
							loading: 0,
							preload: null
						}
					}, a.set(e, o), (a = i.querySelector(Fm(e))) ? a._p || (o.instance = a, o.state.loading = 5) : (a = vm.get(e), a || (a = {
						rel: "preload",
						as: "style",
						href: n.href,
						crossOrigin: n.crossOrigin,
						integrity: n.integrity,
						media: n.media,
						hrefLang: n.hrefLang,
						referrerPolicy: n.referrerPolicy
					}, vm.set(e, a)), Lm(i, e, a, o.state))), t && r === null) throw Error(s(528, ""));
					return o;
				}
				if (t && r !== null) throw Error(s(529, ""));
				return null;
			case "script": return t = n.async, n = n.src, typeof n == "string" && t && typeof t != "function" && typeof t != "symbol" ? (n = Rm(n), t = Dt(i).hoistableScripts, r = t.get(n), r || (r = {
				type: "script",
				instance: null,
				count: 0,
				state: null
			}, t.set(n, r)), r) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			default: throw Error(s(444, e));
		}
	}
	function Pm(e) {
		return "href=\"" + Jt(e) + "\"";
	}
	function Fm(e) {
		return "link[rel=\"stylesheet\"][" + e + "]";
	}
	function Im(e) {
		return D({}, e, {
			"data-precedence": e.precedence,
			precedence: null
		});
	}
	function Lm(e, t, n, r) {
		if (t = e.querySelector("link[rel=\"preload\"][as=\"style\"][" + t + "]")) {
			if (!0 !== t[Ct]) {
				r.loading = 1;
				return;
			}
		} else t = e.createElement("link"), t[Ct] = !0, t.onload = t.onerror = kt.bind(null, t), np(t, "link", n), Ot(t), e.head.appendChild(t);
		r.preload = t, t.addEventListener("load", function() {
			return r.loading |= 1;
		}), t.addEventListener("error", function() {
			return r.loading |= 2;
		});
	}
	function Rm(e) {
		return "[src=\"" + Jt(e) + "\"]";
	}
	function zm(e) {
		return "script[async]" + e;
	}
	function Bm(e, t, n) {
		if (t.count++, t.instance === null) switch (t.type) {
			case "style":
				var r = e.querySelector("style[data-href~=\"" + Jt(n.href) + "\"]");
				if (r) return t.instance = r, Ot(r), r;
				var i = D({}, n, {
					"data-href": n.href,
					"data-precedence": n.precedence,
					href: null,
					precedence: null
				});
				return r = (e.ownerDocument || e).createElement("style"), Ot(r), np(r, "style", i), Vm(r, n.precedence, e), t.instance = r;
			case "stylesheet":
				i = Pm(n.href);
				var a = e.querySelector(Fm(i));
				if (a) return t.state.loading |= 4, t.instance = a, Ot(a), a;
				r = Im(n), (i = vm.get(i)) && Hm(r, i), a = (e.ownerDocument || e).createElement("link"), Ot(a);
				var o = a;
				return o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), np(a, "link", r), t.state.loading |= 4, Vm(a, n.precedence, e), t.instance = a;
			case "script": return a = Rm(n.src), (i = e.querySelector(zm(a))) ? (t.instance = i, Ot(i), i) : (r = n, (i = vm.get(a)) && (r = D({}, n), Um(r, i)), e = e.ownerDocument || e, i = e.createElement("script"), Ot(i), np(i, "link", r), e.head.appendChild(i), t.instance = i);
			case "void": return null;
			default: throw Error(s(443, t.type));
		}
		else t.type === "stylesheet" && !(t.state.loading & 4) && (r = t.instance, t.state.loading |= 4, Vm(r, n.precedence, e));
		return t.instance;
	}
	function Vm(e, t, n) {
		for (var r = n.querySelectorAll("link[rel=\"stylesheet\"][data-precedence],style[data-precedence]"), i = r.length ? r[r.length - 1] : null, a = i, o = 0; o < r.length; o++) {
			var s = r[o];
			if (s.dataset.precedence === t) a = s;
			else if (a !== i) break;
		}
		a ? a.parentNode.insertBefore(e, a.nextSibling) : (t = n.nodeType === 9 ? n.head : n, t.insertBefore(e, t.firstChild));
	}
	function Hm(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.title ??= t.title;
	}
	function Um(e, t) {
		e.crossOrigin ??= t.crossOrigin, e.referrerPolicy ??= t.referrerPolicy, e.integrity ??= t.integrity;
	}
	var Wm = null;
	function Gm(e, t, n) {
		if (Wm === null) {
			var r = /* @__PURE__ */ new Map(), i = Wm = /* @__PURE__ */ new Map();
			i.set(n, r);
		} else i = Wm, r = i.get(n), r || (r = /* @__PURE__ */ new Map(), i.set(n, r));
		if (r.has(e)) return r;
		for (r.set(e, null), n = n.getElementsByTagName(e), i = 0; i < n.length; i++) {
			var a = n[i];
			if (!(a[St] || a[H] || e === "link" && a.getAttribute("rel") === "stylesheet") && a.namespaceURI !== "http://www.w3.org/2000/svg") {
				var o = a.getAttribute(t) || "";
				o = e + o;
				var s = r.get(o);
				s ? s.push(a) : r.set(o, [a]);
			}
		}
		return r;
	}
	function Km(e, t, n) {
		e = e.ownerDocument || e, e.head.insertBefore(n, t === "title" ? e.querySelector("head > title") : null);
	}
	function qm(e, t, n) {
		if (n === 1 || t.itemProp != null) return !1;
		switch (e) {
			case "meta":
			case "title": return !0;
			case "style":
				if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "") break;
				return !0;
			case "link":
				if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError) break;
				switch (t.rel) {
					case "stylesheet": return e = t.disabled, typeof t.precedence == "string" && e == null;
					default: return !0;
				}
			case "script": if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string") return !0;
		}
		return !1;
	}
	function Jm(e, t) {
		return e === "img" && t.src != null && t.src !== "" && t.onLoad == null && t.loading !== "lazy";
	}
	function Ym(e) {
		return !(e.type === "stylesheet" && !(e.state.loading & 3));
	}
	function Xm(e) {
		return (e.width || 100) * (e.height || 100) * (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) * .25;
	}
	function Zm(e, t) {
		typeof t.decode == "function" && (e.imgCount++, t.complete || (e.imgBytes += Xm(t), e.suspenseyImages.push(t)), e = rh.bind(e), t.decode().then(e, e));
	}
	function Qm(e, t, n, r) {
		if (n.type === "stylesheet" && (typeof r.media != "string" || !1 !== matchMedia(r.media).matches) && !(n.state.loading & 4)) {
			if (n.instance === null) {
				var i = Pm(r.href), a = t.querySelector(Fm(i));
				if (a) {
					t = a._p, typeof t == "object" && t && typeof t.then == "function" && (e.count++, e = nh.bind(e), t.then(e, e)), n.state.loading |= 4, n.instance = a, Ot(a);
					return;
				}
				a = t.ownerDocument || t, r = Im(r), (i = vm.get(i)) && Hm(r, i), a = a.createElement("link"), Ot(a);
				var o = a;
				o._p = new Promise(function(e, t) {
					o.onload = e, o.onerror = t;
				}), np(a, "link", r), n.instance = a;
			}
			e.stylesheets === null && (e.stylesheets = /* @__PURE__ */ new Map()), e.stylesheets.set(n, t), (t = n.state.preload) && !(n.state.loading & 3) && (e.count++, n = nh.bind(e), t.addEventListener("load", n), t.addEventListener("error", n));
		}
	}
	var $m = 0;
	function eh(e, t) {
		return e.stylesheets && e.count === 0 && ah(e, e.stylesheets), 0 < e.count || 0 < e.imgCount ? function(n) {
			var r = setTimeout(function() {
				if (e.stylesheets && ah(e, e.stylesheets), e.unsuspend) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, 6e4 + t);
			0 < e.imgBytes && $m === 0 && ($m = 62500 * op());
			var i = setTimeout(function() {
				if (e.waitingForImages = !1, e.count === 0 && (e.stylesheets && ah(e, e.stylesheets), e.unsuspend)) {
					var t = e.unsuspend;
					e.unsuspend = null, t();
				}
			}, (e.imgBytes > $m ? 50 : 800) + t);
			return e.unsuspend = n, function() {
				e.unsuspend = null, clearTimeout(r), clearTimeout(i);
			};
		} : null;
	}
	function th(e) {
		if (e.count === 0 && (e.imgCount === 0 || !e.waitingForImages)) {
			if (e.stylesheets) ah(e, e.stylesheets);
			else if (e.unsuspend) {
				var t = e.unsuspend;
				e.unsuspend = null, t();
			}
		}
	}
	function nh() {
		this.count--, th(this);
	}
	function rh() {
		this.imgCount--, th(this);
	}
	var ih = null;
	function ah(e, t) {
		e.stylesheets = null, e.unsuspend !== null && (e.count++, ih = /* @__PURE__ */ new Map(), t.forEach(oh, e), ih = null, nh.call(e));
	}
	function oh(e, t) {
		if (!(t.state.loading & 4)) {
			var n = ih.get(e);
			if (n) var r = n.get(null);
			else {
				n = /* @__PURE__ */ new Map(), ih.set(e, n);
				for (var i = e.querySelectorAll("link[data-precedence],style[data-precedence]"), a = 0; a < i.length; a++) {
					var o = i[a];
					(o.nodeName === "LINK" || o.getAttribute("media") !== "not all") && (n.set(o.dataset.precedence, o), r = o);
				}
				r && n.set(null, r);
			}
			i = t.instance, o = i.getAttribute("data-precedence"), a = n.get(o) || r, a === r && n.set(null, i), n.set(o, i), this.count++, r = nh.bind(this), i.addEventListener("load", r), i.addEventListener("error", r), a ? a.parentNode.insertBefore(i, a.nextSibling) : (e = e.nodeType === 9 ? e.head : e, e.insertBefore(i, e.firstChild)), t.state.loading |= 4;
		}
	}
	var sh = {
		$$typeof: N,
		Provider: null,
		Consumer: null,
		_currentValue: ge,
		_currentValue2: ge,
		_threadCount: 0
	};
	function ch(e, t, n, r, i, a, o, s, c) {
		this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = ct(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ct(0), this.hiddenUpdates = ct(null), this.identifierPrefix = r, this.onUncaughtError = i, this.onCaughtError = a, this.onRecoverableError = o, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.transitionTypes = null, this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function lh(e, t, n, r, i, a, o, s, c, l, u, d) {
		return e = new ch(e, t, n, o, c, l, u, d, s), t = 1, !0 === a && (t |= 24), a = Ci(3, null, null, t), e.current = a, a.stateNode = e, t = Ca(), t.refCount++, e.pooledCache = t, t.refCount++, a.memoizedState = {
			element: r,
			isDehydrated: n,
			cache: t
		}, ro(a), e;
	}
	function uh(e) {
		return e ? (e = xi, e) : xi;
	}
	function dh(e, t, n, r, i, a) {
		i = uh(i), r.context === null ? r.context = i : r.pendingContext = i, r = ao(t), r.payload = { element: n }, a = a === void 0 ? null : a, a !== null && (r.callback = a), n = oo(e, r, t), n !== null && (jd(n, e, t), so(n, e, t));
	}
	function fh(e, t) {
		if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
			var n = e.retryLane;
			e.retryLane = n !== 0 && n < t ? n : t;
		}
	}
	function ph(e, t) {
		fh(e, t), (e = e.alternate) && fh(e, t);
	}
	function mh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = vi(e, 67108864);
			t !== null && jd(t, e, 67108864), ph(e, 67108864);
		}
	}
	function hh(e) {
		if (e.tag === 13 || e.tag === 31) {
			var t = Od();
			t = mt(t);
			var n = vi(e, t);
			n !== null && jd(n, e, t), ph(e, t);
		}
	}
	var gh = !0;
	function _h(e, t, n, r) {
		var i = F.T;
		F.T = null;
		var a = I.p;
		try {
			I.p = 2, yh(e, t, n, r);
		} finally {
			I.p = a, F.T = i;
		}
	}
	function vh(e, t, n, r) {
		var i = F.T;
		F.T = null;
		var a = I.p;
		try {
			I.p = 8, yh(e, t, n, r);
		} finally {
			I.p = a, F.T = i;
		}
	}
	function yh(e, t, n, r) {
		if (gh) {
			var i = bh(r);
			if (i === null) Gf(e, t, r, xh, n), Mh(e, r);
			else if (Ph(i, e, t, n, r)) r.stopPropagation();
			else if (Mh(e, r), t & 4 && -1 < jh.indexOf(e)) {
				for (; i !== null;) {
					var a = K(i);
					if (a !== null) switch (a.tag) {
						case 3:
							if (a = a.stateNode, a.current.memoizedState.isDehydrated) {
								var o = it(a.pendingLanes);
								if (o !== 0) {
									var s = a;
									for (s.pendingLanes |= 2, s.entangledLanes |= 2; o;) {
										var c = 1 << 31 - Ze(o);
										s.entanglements[1] |= c, o &= ~c;
									}
									wf(a), !(Ku & 6) && (pd = ze() + 500, Tf(0, !1));
								}
							}
							break;
						case 31:
						case 13: s = vi(a, 2), s !== null && jd(s, a, 2), Id(), ph(a, 2);
					}
					if (a = bh(r), a === null && Gf(e, t, r, xh, n), a === i) break;
					i = a;
				}
				i !== null && r.stopPropagation();
			} else Gf(e, t, r, null, n);
		}
	}
	function bh(e) {
		return e = fn(e), Sh(e);
	}
	var xh = null;
	function Sh(e) {
		if (xh = null, e = Tt(e), e !== null) {
			var t = l(e);
			if (t === null) e = null;
			else {
				var n = t.tag;
				if (n === 13) {
					if (e = u(t), e !== null) return e;
					e = null;
				} else if (n === 31) {
					if (e = d(t), e !== null) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated) return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			}
		}
		return xh = e, null;
	}
	function Ch(e) {
		switch (e) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "fullscreenerror":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "resize":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 8;
			case "message": switch (Be()) {
				case Ve: return 2;
				case He: return 8;
				case Ue:
				case We: return 32;
				case Ge: return 268435456;
				default: return 32;
			}
			default: return 32;
		}
	}
	var wh = !1, Th = null, Eh = null, Dh = null, Oh = /* @__PURE__ */ new Map(), kh = /* @__PURE__ */ new Map(), Ah = [], jh = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
	function Mh(e, t) {
		switch (e) {
			case "focusin":
			case "focusout":
				Th = null;
				break;
			case "dragenter":
			case "dragleave":
				Eh = null;
				break;
			case "mouseover":
			case "mouseout":
				Dh = null;
				break;
			case "pointerover":
			case "pointerout":
				Oh.delete(t.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": kh.delete(t.pointerId);
		}
	}
	function Nh(e, t, n, r, i, a) {
		return e === null || e.nativeEvent !== a ? (e = {
			blockedOn: t,
			domEventName: n,
			eventSystemFlags: r,
			nativeEvent: a,
			targetContainers: [i]
		}, t !== null && (t = K(t), t !== null && mh(t)), e) : (e.eventSystemFlags |= r, t = e.targetContainers, i !== null && t.indexOf(i) === -1 && t.push(i), e);
	}
	function Ph(e, t, n, r, i) {
		switch (t) {
			case "focusin": return Th = Nh(Th, e, t, n, r, i), !0;
			case "dragenter": return Eh = Nh(Eh, e, t, n, r, i), !0;
			case "mouseover": return Dh = Nh(Dh, e, t, n, r, i), !0;
			case "pointerover":
				var a = i.pointerId;
				return Oh.set(a, Nh(Oh.get(a) || null, e, t, n, r, i)), !0;
			case "gotpointercapture": return a = i.pointerId, kh.set(a, Nh(kh.get(a) || null, e, t, n, r, i)), !0;
		}
		return !1;
	}
	function Fh(e) {
		var t = Tt(e.target);
		if (t !== null) {
			var n = l(t);
			if (n !== null) {
				if (t = n.tag, t === 13) {
					if (t = u(n), t !== null) {
						e.blockedOn = t, _t(e.priority, function() {
							hh(n);
						});
						return;
					}
				} else if (t === 31) {
					if (t = d(n), t !== null) {
						e.blockedOn = t, _t(e.priority, function() {
							hh(n);
						});
						return;
					}
				} else if (t === 3 && n.stateNode.current.memoizedState.isDehydrated) {
					e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
					return;
				}
			}
		}
		e.blockedOn = null;
	}
	function Ih(e) {
		if (e.blockedOn !== null) return !1;
		for (var t = e.targetContainers; 0 < t.length;) {
			var n = bh(e.nativeEvent);
			if (n === null) {
				n = e.nativeEvent;
				var r = new n.constructor(n.type, n);
				dn = r, n.target.dispatchEvent(r), dn = null;
			} else return t = K(n), t !== null && mh(t), e.blockedOn = n, !1;
			t.shift();
		}
		return !0;
	}
	function Lh(e, t, n) {
		Ih(e) && n.delete(t);
	}
	function Rh() {
		wh = !1, Th !== null && Ih(Th) && (Th = null), Eh !== null && Ih(Eh) && (Eh = null), Dh !== null && Ih(Dh) && (Dh = null), Oh.forEach(Lh), kh.forEach(Lh);
	}
	function zh(e, n) {
		e.blockedOn === n && (e.blockedOn = null, wh || (wh = !0, t.unstable_scheduleCallback(t.unstable_NormalPriority, Rh)));
	}
	var Bh = null;
	function Vh(e) {
		Bh !== e && (Bh = e, t.unstable_scheduleCallback(t.unstable_NormalPriority, function() {
			Bh === e && (Bh = null);
			for (var t = 0; t < e.length; t += 3) {
				var n = e[t], r = e[t + 1], i = e[t + 2];
				if (typeof r != "function") {
					if (Sh(r || n) === null) continue;
					break;
				}
				var a = K(n);
				a !== null && (e.splice(t, 3), t -= 3, Gs(a, {
					pending: !0,
					data: i,
					method: n.method,
					action: r
				}, r, i));
			}
		}));
	}
	function Hh(e) {
		function t(t) {
			return zh(t, e);
		}
		Th !== null && zh(Th, e), Eh !== null && zh(Eh, e), Dh !== null && zh(Dh, e), Oh.forEach(t), kh.forEach(t);
		for (var n = 0; n < Ah.length; n++) {
			var r = Ah[n];
			r.blockedOn === e && (r.blockedOn = null);
		}
		for (; 0 < Ah.length && (n = Ah[0], n.blockedOn === null);) Fh(n), n.blockedOn === null && Ah.shift();
		if (n = (e.ownerDocument || e).$$reactFormReplay, n != null) for (r = 0; r < n.length; r += 3) {
			var i = n[r], a = n[r + 1], o = i[U] || null;
			if (typeof a == "function") o || Vh(n);
			else if (o) {
				var s = null;
				if (a && a.hasAttribute("formAction")) {
					if (i = a, o = a[U] || null) s = o.formAction;
					else if (Sh(i) !== null) continue;
				} else s = o.action;
				typeof s == "function" ? n[r + 1] = s : (n.splice(r, 3), r -= 3), Vh(n);
			}
		}
	}
	function Uh() {
		function e(e) {
			e.canIntercept && e.info === "react-transition" && e.intercept({
				handler: function() {
					return new Promise(function(e) {
						return i = e;
					});
				},
				focusReset: "manual",
				scroll: "manual"
			});
		}
		function t() {
			i !== null && (i(), i = null), r || setTimeout(n, 20);
		}
		function n() {
			if (!r && !navigation.transition) {
				var e = navigation.currentEntry;
				e && e.url != null && navigation.navigate(e.url, {
					state: e.getState(),
					info: "react-transition",
					history: "replace"
				});
			}
		}
		if (typeof navigation == "object") {
			var r = !1, i = null;
			return navigation.addEventListener("navigate", e), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(n, 100), function() {
				r = !0, navigation.removeEventListener("navigate", e), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), i !== null && (i(), i = null);
			};
		}
	}
	function Wh(e) {
		this._internalRoot = e;
	}
	Gh.prototype.render = Wh.prototype.render = function(e) {
		var t = this._internalRoot;
		if (t === null) throw Error(s(409));
		var n = t.current;
		dh(n, Od(), e, t, null, null);
	}, Gh.prototype.unmount = Wh.prototype.unmount = function() {
		var e = this._internalRoot;
		if (e !== null) {
			this._internalRoot = null;
			var t = e.containerInfo;
			dh(e.current, 2, null, e, null, null), Id(), t[yt] = null;
		}
	};
	function Gh(e) {
		this._internalRoot = e;
	}
	Gh.prototype.unstable_scheduleHydration = function(e) {
		if (e) {
			var t = gt();
			e = {
				blockedOn: null,
				target: e,
				priority: t
			};
			for (var n = 0; n < Ah.length && t !== 0 && t < Ah[n].priority; n++);
			Ah.splice(n, 0, e), n === 0 && Fh(e);
		}
	};
	var Kh = r.version;
	if (Kh !== "19.3.0") throw Error(s(527, Kh, "19.3.0"));
	I.findDOMNode = function(e) {
		var t = e._reactInternals;
		if (t === void 0) throw typeof e.render == "function" ? Error(s(188)) : (e = Object.keys(e).join(","), Error(s(268, e)));
		return e = p(t), e = e === null ? null : m(e), e = e === null ? null : e.stateNode, e;
	};
	var qh = {
		bundleType: 0,
		version: "19.3.0",
		rendererPackageName: "react-dom",
		currentDispatcherRef: F,
		reconcilerVersion: "19.3.0"
	};
	if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
		var Jh = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!Jh.isDisabled && Jh.supportsFiber) try {
			Je = Jh.inject(qh), Ye = Jh;
		} catch {}
	}
	e.createRoot = function(e, t) {
		if (!c(e)) throw Error(s(299));
		var n = !1, r = "", i = mc, a = hc, o = gc;
		return t != null && (!0 === t.unstable_strictMode && (n = !0), t.identifierPrefix !== void 0 && (r = t.identifierPrefix), t.onUncaughtError !== void 0 && (i = t.onUncaughtError), t.onCaughtError !== void 0 && (a = t.onCaughtError), t.onRecoverableError !== void 0 && (o = t.onRecoverableError)), t = lh(e, 1, !1, null, null, n, r, null, i, a, o, Uh), e[yt] = t.current, Uf(e), new Wh(t);
	};
})), c = /* @__PURE__ */ e(((e, t) => {
	function n() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE == "function") try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(n);
		} catch (e) {
			console.error(e);
		}
	}
	n(), t.exports = s();
})), l = i(), u = c(), d = 1e3, f = 1001, p = 1002, m = 1003, h = 1004, g = 1005, _ = 1006, v = 1007, y = 1008, b = 1009, x = 1010, S = 1011, C = 1012, w = 1013, T = 1014, E = 1015, D = 1016, O = 1017, ee = 1018, k = 1020, A = 35902, j = 35899, M = 1021, te = 1022, N = 1023, ne = 1026, re = 1027, ie = 1028, ae = 1029, oe = 1030, se = 1031, ce = 1033, le = 33776, P = 33777, ue = 33778, de = 33779, fe = 35840, pe = 35841, me = 35842, he = 35843, F = 36196, I = 37492, ge = 37496, _e = 37488, ve = 37489, ye = 37490, be = 37491, xe = 37808, Se = 37809, Ce = 37810, we = 37811, Te = 37812, Ee = 37813, De = 37814, Oe = 37815, ke = 37816, Ae = 37817, je = 37818, L = 37819, Me = 37820, Ne = 37821, Pe = 36492, R = 36494, Fe = 36495, z = 36283, Ie = 36284, Le = 36285, Re = 36286, ze = 2300, Be = 2301, Ve = 2302, He = 2303, Ue = 2400, We = 2401, Ge = 2402, Ke = 3200, qe = "srgb", Je = "srgb-linear", Ye = "linear", Xe = "srgb", Ze = 7680, Qe = 35044, $e = 2e3;
function et(e) {
	for (let t = e.length - 1; t >= 0; --t) if (e[t] >= 65535) return !0;
	return !1;
}
function tt(e) {
	return ArrayBuffer.isView(e) && !(e instanceof DataView);
}
function nt(e) {
	return document.createElementNS("http://www.w3.org/1999/xhtml", e);
}
function rt() {
	let e = nt("canvas");
	return e.style.display = "block", e;
}
var it = {};
function at(...e) {
	let t = "THREE." + e.shift();
	console.log(t, ...e);
}
function ot(e) {
	let t = e[0];
	if (typeof t == "string" && t.startsWith("TSL:")) {
		let t = e[1];
		t && t.isStackTrace ? e[0] += " " + t.getLocation() : e[1] = "Stack trace not available. Enable \"THREE.Node.captureStackTrace\" to capture stack traces.";
	}
	return e;
}
function B(...e) {
	e = ot(e);
	let t = "THREE." + e.shift();
	{
		let n = e[0];
		n && n.isStackTrace ? console.warn(n.getError(t)) : console.warn(t, ...e);
	}
}
function V(...e) {
	e = ot(e);
	let t = "THREE." + e.shift();
	{
		let n = e[0];
		n && n.isStackTrace ? console.error(n.getError(t)) : console.error(t, ...e);
	}
}
function st(...e) {
	let t = e.join(" ");
	t in it || (it[t] = !0, B(...e));
}
function ct(e, t, n) {
	return new Promise(function(r, i) {
		function a() {
			switch (e.clientWaitSync(t, e.SYNC_FLUSH_COMMANDS_BIT, 0)) {
				case e.WAIT_FAILED:
					i();
					break;
				case e.TIMEOUT_EXPIRED:
					setTimeout(a, n);
					break;
				default: r();
			}
		}
		setTimeout(a, n);
	});
}
var lt = {
	0: 1,
	2: 6,
	4: 7,
	3: 5,
	1: 0,
	6: 2,
	7: 4,
	5: 3
}, ut = class {
	addEventListener(e, t) {
		this._listeners === void 0 && (this._listeners = {});
		let n = this._listeners;
		n[e] === void 0 && (n[e] = []), n[e].indexOf(t) === -1 && n[e].push(t);
	}
	hasEventListener(e, t) {
		let n = this._listeners;
		return n !== void 0 && n[e] !== void 0 && n[e].indexOf(t) !== -1;
	}
	removeEventListener(e, t) {
		let n = this._listeners;
		if (n === void 0) return;
		let r = n[e];
		if (r !== void 0) {
			let e = r.indexOf(t);
			e !== -1 && r.splice(e, 1);
		}
	}
	dispatchEvent(e) {
		let t = this._listeners;
		if (t === void 0) return;
		let n = t[e.type];
		if (n !== void 0) {
			e.target = this;
			let t = n.slice(0);
			for (let n = 0, r = t.length; n < r; n++) t[n].call(this, e);
			e.target = null;
		}
	}
}, dt = /* @__PURE__ */ "00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff".split("."), ft = Math.PI / 180, pt = 180 / Math.PI;
function mt() {
	let e = Math.random() * 4294967295 | 0, t = Math.random() * 4294967295 | 0, n = Math.random() * 4294967295 | 0, r = Math.random() * 4294967295 | 0;
	return (dt[e & 255] + dt[e >> 8 & 255] + dt[e >> 16 & 255] + dt[e >> 24 & 255] + "-" + dt[t & 255] + dt[t >> 8 & 255] + "-" + dt[t >> 16 & 15 | 64] + dt[t >> 24 & 255] + "-" + dt[n & 63 | 128] + dt[n >> 8 & 255] + "-" + dt[n >> 16 & 255] + dt[n >> 24 & 255] + dt[r & 255] + dt[r >> 8 & 255] + dt[r >> 16 & 255] + dt[r >> 24 & 255]).toLowerCase();
}
function ht(e, t, n) {
	return Math.max(t, Math.min(n, e));
}
function gt(e, t) {
	return (e % t + t) % t;
}
function _t(e, t, n) {
	return (1 - n) * e + n * t;
}
function vt(e, t) {
	switch (t.constructor) {
		case Float32Array: return e;
		case Uint32Array: return e / 4294967295;
		case Uint16Array: return e / 65535;
		case Uint8Array:
		case Uint8ClampedArray: return e / 255;
		case Int32Array: return Math.max(e / 2147483647, -1);
		case Int16Array: return Math.max(e / 32767, -1);
		case Int8Array: return Math.max(e / 127, -1);
		default: throw Error("THREE.MathUtils: Invalid component type.");
	}
}
function H(e, t) {
	switch (t.constructor) {
		case Float32Array: return e;
		case Uint32Array: return Math.round(e * 4294967295);
		case Uint16Array: return Math.round(e * 65535);
		case Uint8Array:
		case Uint8ClampedArray: return Math.round(e * 255);
		case Int32Array: return Math.round(e * 2147483647);
		case Int16Array: return Math.round(e * 32767);
		case Int8Array: return Math.round(e * 127);
		default: throw Error("THREE.MathUtils: Invalid component type.");
	}
}
var U = class e {
	static {
		e.prototype.isVector2 = !0;
	}
	constructor(e = 0, t = 0) {
		this.x = e, this.y = t;
	}
	get width() {
		return this.x;
	}
	set width(e) {
		this.x = e;
	}
	get height() {
		return this.y;
	}
	set height(e) {
		this.y = e;
	}
	set(e, t) {
		return this.x = e, this.y = t, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			default: throw Error("THREE.Vector2: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			default: throw Error("THREE.Vector2: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = e.elements;
		return this.x = r[0] * t + r[3] * n + r[6], this.y = r[1] * t + r[4] * n + r[7], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this;
	}
	clamp(e, t) {
		return this.x = ht(this.x, e.x, t.x), this.y = ht(this.y, e.y, t.y), this;
	}
	clampScalar(e, t) {
		return this.x = ht(this.x, e, t), this.y = ht(this.y, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(ht(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y;
	}
	cross(e) {
		return this.x * e.y - this.y * e.x;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	angle() {
		return Math.atan2(-this.y, -this.x) + Math.PI;
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(ht(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y;
		return t * t + n * n;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this;
	}
	rotateAround(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = this.x - e.x, a = this.y - e.y;
		return this.x = i * n - a * r + e.x, this.y = i * r + a * n + e.y, this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y;
	}
}, yt = class {
	constructor(e = 0, t = 0, n = 0, r = 1) {
		this.isQuaternion = !0, this._x = e, this._y = t, this._z = n, this._w = r;
	}
	static slerpFlat(e, t, n, r, i, a, o) {
		let s = n[r + 0], c = n[r + 1], l = n[r + 2], u = n[r + 3], d = i[a + 0], f = i[a + 1], p = i[a + 2], m = i[a + 3];
		if (u !== m || s !== d || c !== f || l !== p) {
			let e = s * d + c * f + l * p + u * m;
			e < 0 && (d = -d, f = -f, p = -p, m = -m, e = -e);
			let t = 1 - o;
			if (e < .9995) {
				let n = Math.acos(e), r = Math.sin(n);
				t = Math.sin(t * n) / r, o = Math.sin(o * n) / r, s = s * t + d * o, c = c * t + f * o, l = l * t + p * o, u = u * t + m * o;
			} else {
				s = s * t + d * o, c = c * t + f * o, l = l * t + p * o, u = u * t + m * o;
				let e = 1 / Math.sqrt(s * s + c * c + l * l + u * u);
				s *= e, c *= e, l *= e, u *= e;
			}
		}
		e[t] = s, e[t + 1] = c, e[t + 2] = l, e[t + 3] = u;
	}
	static multiplyQuaternionsFlat(e, t, n, r, i, a) {
		let o = n[r], s = n[r + 1], c = n[r + 2], l = n[r + 3], u = i[a], d = i[a + 1], f = i[a + 2], p = i[a + 3];
		return e[t] = o * p + l * u + s * f - c * d, e[t + 1] = s * p + l * d + c * u - o * f, e[t + 2] = c * p + l * f + o * d - s * u, e[t + 3] = l * p - o * u - s * d - c * f, e;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get w() {
		return this._w;
	}
	set w(e) {
		this._w = e, this._onChangeCallback();
	}
	set(e, t, n, r) {
		return this._x = e, this._y = t, this._z = n, this._w = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._w);
	}
	copy(e) {
		return this._x = e.x, this._y = e.y, this._z = e.z, this._w = e.w, this._onChangeCallback(), this;
	}
	setFromEuler(e, t = !0) {
		let n = e._x, r = e._y, i = e._z, a = e._order, o = Math.cos, s = Math.sin, c = o(n / 2), l = o(r / 2), u = o(i / 2), d = s(n / 2), f = s(r / 2), p = s(i / 2);
		switch (a) {
			case "XYZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "YXZ":
				this._x = d * l * u + c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "ZXY":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "ZYX":
				this._x = d * l * u - c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u + d * f * p;
				break;
			case "YZX":
				this._x = d * l * u + c * f * p, this._y = c * f * u + d * l * p, this._z = c * l * p - d * f * u, this._w = c * l * u - d * f * p;
				break;
			case "XZY":
				this._x = d * l * u - c * f * p, this._y = c * f * u - d * l * p, this._z = c * l * p + d * f * u, this._w = c * l * u + d * f * p;
				break;
			default: B("Quaternion: .setFromEuler() encountered an unknown order: " + a);
		}
		return t === !0 && this._onChangeCallback(), this;
	}
	setFromAxisAngle(e, t) {
		let n = t / 2, r = Math.sin(n);
		return this._x = e.x * r, this._y = e.y * r, this._z = e.z * r, this._w = Math.cos(n), this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e) {
		let t = e.elements, n = t[0], r = t[4], i = t[8], a = t[1], o = t[5], s = t[9], c = t[2], l = t[6], u = t[10], d = n + o + u;
		if (d > 0) {
			let e = .5 / Math.sqrt(d + 1);
			this._w = .25 / e, this._x = (l - s) * e, this._y = (i - c) * e, this._z = (a - r) * e;
		} else if (n > o && n > u) {
			let e = 2 * Math.sqrt(1 + n - o - u);
			this._w = (l - s) / e, this._x = .25 * e, this._y = (r + a) / e, this._z = (i + c) / e;
		} else if (o > u) {
			let e = 2 * Math.sqrt(1 + o - n - u);
			this._w = (i - c) / e, this._x = (r + a) / e, this._y = .25 * e, this._z = (s + l) / e;
		} else {
			let e = 2 * Math.sqrt(1 + u - n - o);
			this._w = (a - r) / e, this._x = (i + c) / e, this._y = (s + l) / e, this._z = .25 * e;
		}
		return this._onChangeCallback(), this;
	}
	setFromUnitVectors(e, t) {
		let n = e.dot(t) + 1;
		return n < 1e-8 ? (n = 0, Math.abs(e.x) > Math.abs(e.z) ? (this._x = -e.y, this._y = e.x, this._z = 0, this._w = n) : (this._x = 0, this._y = -e.z, this._z = e.y, this._w = n)) : (this._x = e.y * t.z - e.z * t.y, this._y = e.z * t.x - e.x * t.z, this._z = e.x * t.y - e.y * t.x, this._w = n), this.normalize();
	}
	angleTo(e) {
		return 2 * Math.acos(Math.abs(ht(this.dot(e), -1, 1)));
	}
	rotateTowards(e, t) {
		let n = this.angleTo(e);
		if (n === 0) return this;
		let r = Math.min(1, t / n);
		return this.slerp(e, r), this;
	}
	identity() {
		return this.set(0, 0, 0, 1);
	}
	invert() {
		return this.conjugate();
	}
	conjugate() {
		return this._x *= -1, this._y *= -1, this._z *= -1, this._onChangeCallback(), this;
	}
	dot(e) {
		return this._x * e._x + this._y * e._y + this._z * e._z + this._w * e._w;
	}
	lengthSq() {
		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
	}
	length() {
		return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
	}
	normalize() {
		let e = this.length();
		return e === 0 ? (this._x = 0, this._y = 0, this._z = 0, this._w = 1) : (e = 1 / e, this._x *= e, this._y *= e, this._z *= e, this._w *= e), this._onChangeCallback(), this;
	}
	multiply(e) {
		return this.multiplyQuaternions(this, e);
	}
	premultiply(e) {
		return this.multiplyQuaternions(e, this);
	}
	multiplyQuaternions(e, t) {
		let n = e._x, r = e._y, i = e._z, a = e._w, o = t._x, s = t._y, c = t._z, l = t._w;
		return this._x = n * l + a * o + r * c - i * s, this._y = r * l + a * s + i * o - n * c, this._z = i * l + a * c + n * s - r * o, this._w = a * l - n * o - r * s - i * c, this._onChangeCallback(), this;
	}
	slerp(e, t) {
		let n = e._x, r = e._y, i = e._z, a = e._w, o = this.dot(e);
		o < 0 && (n = -n, r = -r, i = -i, a = -a, o = -o);
		let s = 1 - t;
		if (o < .9995) {
			let e = Math.acos(o), c = Math.sin(e);
			s = Math.sin(s * e) / c, t = Math.sin(t * e) / c, this._x = this._x * s + n * t, this._y = this._y * s + r * t, this._z = this._z * s + i * t, this._w = this._w * s + a * t, this._onChangeCallback();
		} else this._x = this._x * s + n * t, this._y = this._y * s + r * t, this._z = this._z * s + i * t, this._w = this._w * s + a * t, this.normalize();
		return this;
	}
	slerpQuaternions(e, t, n) {
		return this.copy(e).slerp(t, n);
	}
	random() {
		let e = 2 * Math.PI * Math.random(), t = 2 * Math.PI * Math.random(), n = Math.random(), r = Math.sqrt(1 - n), i = Math.sqrt(n);
		return this.set(r * Math.sin(e), r * Math.cos(e), i * Math.sin(t), i * Math.cos(t));
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._w === this._w;
	}
	fromArray(e, t = 0) {
		return this._x = e[t], this._y = e[t + 1], this._z = e[t + 2], this._w = e[t + 3], this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._w, e;
	}
	fromBufferAttribute(e, t) {
		return this._x = e.getX(t), this._y = e.getY(t), this._z = e.getZ(t), this._w = e.getW(t), this._onChangeCallback(), this;
	}
	toJSON() {
		return this.toArray();
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._w;
	}
}, W = class e {
	static {
		e.prototype.isVector3 = !0;
	}
	constructor(e = 0, t = 0, n = 0) {
		this.x = e, this.y = t, this.z = n;
	}
	set(e, t, n) {
		return n === void 0 && (n = this.z), this.x = e, this.y = t, this.z = n, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			default: throw Error("THREE.Vector3: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw Error("THREE.Vector3: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this;
	}
	multiplyVectors(e, t) {
		return this.x = e.x * t.x, this.y = e.y * t.y, this.z = e.z * t.z, this;
	}
	applyEuler(e) {
		return this.applyQuaternion(xt.setFromEuler(e));
	}
	applyAxisAngle(e, t) {
		return this.applyQuaternion(xt.setFromAxisAngle(e, t));
	}
	applyMatrix3(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[3] * n + i[6] * r, this.y = i[1] * t + i[4] * n + i[7] * r, this.z = i[2] * t + i[5] * n + i[8] * r, this;
	}
	applyNormalMatrix(e) {
		return this.applyMatrix3(e).normalize();
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements, a = 1 / (i[3] * t + i[7] * n + i[11] * r + i[15]);
		return this.x = (i[0] * t + i[4] * n + i[8] * r + i[12]) * a, this.y = (i[1] * t + i[5] * n + i[9] * r + i[13]) * a, this.z = (i[2] * t + i[6] * n + i[10] * r + i[14]) * a, this;
	}
	applyQuaternion(e) {
		let t = this.x, n = this.y, r = this.z, i = e.x, a = e.y, o = e.z, s = e.w, c = 2 * (a * r - o * n), l = 2 * (o * t - i * r), u = 2 * (i * n - a * t);
		return this.x = t + s * c + a * u - o * l, this.y = n + s * l + o * c - i * u, this.z = r + s * u + i * l - a * c, this;
	}
	project(e) {
		return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix);
	}
	unproject(e) {
		return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld);
	}
	transformDirection(e) {
		let t = this.x, n = this.y, r = this.z, i = e.elements;
		return this.x = i[0] * t + i[4] * n + i[8] * r, this.y = i[1] * t + i[5] * n + i[9] * r, this.z = i[2] * t + i[6] * n + i[10] * r, this.normalize();
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this;
	}
	clamp(e, t) {
		return this.x = ht(this.x, e.x, t.x), this.y = ht(this.y, e.y, t.y), this.z = ht(this.z, e.z, t.z), this;
	}
	clampScalar(e, t) {
		return this.x = ht(this.x, e, t), this.y = ht(this.y, e, t), this.z = ht(this.z, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(ht(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this;
	}
	cross(e) {
		return this.crossVectors(this, e);
	}
	crossVectors(e, t) {
		let n = e.x, r = e.y, i = e.z, a = t.x, o = t.y, s = t.z;
		return this.x = r * s - i * o, this.y = i * a - n * s, this.z = n * o - r * a, this;
	}
	projectOnVector(e) {
		let t = e.lengthSq();
		if (t === 0) return this.set(0, 0, 0);
		let n = e.dot(this) / t;
		return this.copy(e).multiplyScalar(n);
	}
	projectOnPlane(e) {
		return bt.copy(this).projectOnVector(e), this.sub(bt);
	}
	reflect(e) {
		return this.sub(bt.copy(e).multiplyScalar(2 * this.dot(e)));
	}
	angleTo(e) {
		let t = Math.sqrt(this.lengthSq() * e.lengthSq());
		if (t === 0) return Math.PI / 2;
		let n = this.dot(e) / t;
		return Math.acos(ht(n, -1, 1));
	}
	distanceTo(e) {
		return Math.sqrt(this.distanceToSquared(e));
	}
	distanceToSquared(e) {
		let t = this.x - e.x, n = this.y - e.y, r = this.z - e.z;
		return t * t + n * n + r * r;
	}
	manhattanDistanceTo(e) {
		return Math.abs(this.x - e.x) + Math.abs(this.y - e.y) + Math.abs(this.z - e.z);
	}
	setFromSpherical(e) {
		return this.setFromSphericalCoords(e.radius, e.phi, e.theta);
	}
	setFromSphericalCoords(e, t, n) {
		let r = Math.sin(t) * e;
		return this.x = r * Math.sin(n), this.y = Math.cos(t) * e, this.z = r * Math.cos(n), this;
	}
	setFromCylindrical(e) {
		return this.setFromCylindricalCoords(e.radius, e.theta, e.y);
	}
	setFromCylindricalCoords(e, t, n) {
		return this.x = e * Math.sin(t), this.y = n, this.z = e * Math.cos(t), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this;
	}
	setFromMatrixScale(e) {
		let t = this.setFromMatrixColumn(e, 0).length(), n = this.setFromMatrixColumn(e, 1).length(), r = this.setFromMatrixColumn(e, 2).length();
		return this.x = t, this.y = n, this.z = r, this;
	}
	setFromMatrixColumn(e, t) {
		return this.fromArray(e.elements, t * 4);
	}
	setFromMatrix3Column(e, t) {
		return this.fromArray(e.elements, t * 3);
	}
	setFromEuler(e) {
		return this.x = e._x, this.y = e._y, this.z = e._z, this;
	}
	setFromColor(e) {
		return this.x = e.r, this.y = e.g, this.z = e.b, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this;
	}
	randomDirection() {
		let e = Math.random() * Math.PI * 2, t = Math.random() * 2 - 1, n = Math.sqrt(1 - t * t);
		return this.x = n * Math.cos(e), this.y = t, this.z = n * Math.sin(e), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y, yield this.z;
	}
}, bt = /*@__PURE__*/ new W(), xt = /*@__PURE__*/ new yt(), G = class e {
	static {
		e.prototype.isMatrix3 = !0;
	}
	constructor(e, t, n, r, i, a, o, s, c) {
		this.elements = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r, i, a, o, s, c);
	}
	set(e, t, n, r, i, a, o, s, c) {
		let l = this.elements;
		return l[0] = e, l[1] = r, l[2] = o, l[3] = t, l[4] = i, l[5] = s, l[6] = n, l[7] = a, l[8] = c, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 1, 0, 0, 0, 1), this;
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], this;
	}
	extractBasis(e, t, n) {
		return e.setFromMatrix3Column(this, 0), t.setFromMatrix3Column(this, 1), n.setFromMatrix3Column(this, 2), this;
	}
	setFromMatrix4(e) {
		let t = e.elements;
		return this.set(t[0], t[4], t[8], t[1], t[5], t[9], t[2], t[6], t[10]), this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[3], s = n[6], c = n[1], l = n[4], u = n[7], d = n[2], f = n[5], p = n[8], m = r[0], h = r[3], g = r[6], _ = r[1], v = r[4], y = r[7], b = r[2], x = r[5], S = r[8];
		return i[0] = a * m + o * _ + s * b, i[3] = a * h + o * v + s * x, i[6] = a * g + o * y + s * S, i[1] = c * m + l * _ + u * b, i[4] = c * h + l * v + u * x, i[7] = c * g + l * y + u * S, i[2] = d * m + f * _ + p * b, i[5] = d * h + f * v + p * x, i[8] = d * g + f * y + p * S, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[3] *= e, t[6] *= e, t[1] *= e, t[4] *= e, t[7] *= e, t[2] *= e, t[5] *= e, t[8] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8];
		return t * a * l - t * o * c - n * i * l + n * o * s + r * i * c - r * a * s;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = l * a - o * c, d = o * s - l * i, f = c * i - a * s, p = t * u + n * d + r * f;
		if (p === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
		let m = 1 / p;
		return e[0] = u * m, e[1] = (r * c - l * n) * m, e[2] = (o * n - r * a) * m, e[3] = d * m, e[4] = (l * t - r * s) * m, e[5] = (r * i - o * t) * m, e[6] = f * m, e[7] = (n * s - c * t) * m, e[8] = (a * t - n * i) * m, this;
	}
	transpose() {
		let e, t = this.elements;
		return e = t[1], t[1] = t[3], t[3] = e, e = t[2], t[2] = t[6], t[6] = e, e = t[5], t[5] = t[7], t[7] = e, this;
	}
	getNormalMatrix(e) {
		return this.setFromMatrix4(e).invert().transpose();
	}
	transposeIntoArray(e) {
		let t = this.elements;
		return e[0] = t[0], e[1] = t[3], e[2] = t[6], e[3] = t[1], e[4] = t[4], e[5] = t[7], e[6] = t[2], e[7] = t[5], e[8] = t[8], this;
	}
	setUvTransform(e, t, n, r, i, a, o) {
		let s = Math.cos(i), c = Math.sin(i);
		return this.set(n * s, n * c, -n * (s * a + c * o) + a + e, -r * c, r * s, -r * (-c * a + s * o) + o + t, 0, 0, 1), this;
	}
	scale(e, t) {
		return st("Matrix3: .scale() is deprecated. Use .makeScale() instead."), this.premultiply(St.makeScale(e, t)), this;
	}
	rotate(e) {
		return st("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."), this.premultiply(St.makeRotation(-e)), this;
	}
	translate(e, t) {
		return st("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."), this.premultiply(St.makeTranslation(e, t)), this;
	}
	makeTranslation(e, t) {
		return e.isVector2 ? this.set(1, 0, e.x, 0, 1, e.y, 0, 0, 1) : this.set(1, 0, e, 0, 1, t, 0, 0, 1), this;
	}
	makeRotation(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, n, t, 0, 0, 0, 1), this;
	}
	makeScale(e, t) {
		return this.set(e, 0, 0, 0, t, 0, 0, 0, 1), this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 9; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 9; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e;
	}
	clone() {
		return new this.constructor().fromArray(this.elements);
	}
}, St = /*@__PURE__*/ new G(), Ct = /*@__PURE__*/ new G().set(.4123908, .3575843, .1804808, .212639, .7151687, .0721923, .0193308, .1191948, .9505322), wt = /*@__PURE__*/ new G().set(3.2409699, -1.5373832, -.4986108, -.9692436, 1.8759675, .0415551, .0556301, -.203977, 1.0569715);
function Tt() {
	let e = {
		enabled: !0,
		workingColorSpace: Je,
		spaces: {},
		convert: function(e, t, n) {
			return this.enabled === !1 || t === n || !t || !n || (this.spaces[t].transfer === "srgb" && (e.r = Et(e.r), e.g = Et(e.g), e.b = Et(e.b)), this.spaces[t].primaries !== this.spaces[n].primaries && (e.applyMatrix3(this.spaces[t].toXYZ), e.applyMatrix3(this.spaces[n].fromXYZ)), this.spaces[n].transfer === "srgb" && (e.r = Dt(e.r), e.g = Dt(e.g), e.b = Dt(e.b))), e;
		},
		workingToColorSpace: function(e, t) {
			return this.convert(e, this.workingColorSpace, t);
		},
		colorSpaceToWorking: function(e, t) {
			return this.convert(e, t, this.workingColorSpace);
		},
		getPrimaries: function(e) {
			return this.spaces[e].primaries;
		},
		getTransfer: function(e) {
			return e === "" ? Ye : this.spaces[e].transfer;
		},
		getToneMappingMode: function(e) {
			return this.spaces[e].outputColorSpaceConfig.toneMappingMode || "standard";
		},
		getLuminanceCoefficients: function(e, t = this.workingColorSpace) {
			return e.fromArray(this.spaces[t].luminanceCoefficients);
		},
		define: function(e) {
			Object.assign(this.spaces, e);
		},
		_getMatrix: function(e, t, n) {
			return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ);
		},
		_getDrawingBufferColorSpace: function(e) {
			return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace;
		},
		_getUnpackColorSpace: function(e = this.workingColorSpace) {
			return this.spaces[e].workingColorSpaceConfig.unpackColorSpace;
		},
		fromWorkingColorSpace: function(t, n) {
			return st("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."), e.workingToColorSpace(t, n);
		},
		toWorkingColorSpace: function(t, n) {
			return st("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."), e.colorSpaceToWorking(t, n);
		}
	}, t = [
		.64,
		.33,
		.3,
		.6,
		.15,
		.06
	], n = [
		.2126,
		.7152,
		.0722
	], r = [.3127, .329];
	return e.define({
		[Je]: {
			primaries: t,
			whitePoint: r,
			transfer: Ye,
			toXYZ: Ct,
			fromXYZ: wt,
			luminanceCoefficients: n,
			workingColorSpaceConfig: { unpackColorSpace: qe },
			outputColorSpaceConfig: { drawingBufferColorSpace: qe }
		},
		[qe]: {
			primaries: t,
			whitePoint: r,
			transfer: Xe,
			toXYZ: Ct,
			fromXYZ: wt,
			luminanceCoefficients: n,
			outputColorSpaceConfig: { drawingBufferColorSpace: qe }
		}
	}), e;
}
var K = /*@__PURE__*/ Tt();
function Et(e) {
	return e < .04045 ? e * .0773993808 : (e * .9478672986 + .0521327014) ** 2.4;
}
function Dt(e) {
	return e < .0031308 ? e * 12.92 : 1.055 * e ** .41666 - .055;
}
var Ot, kt = class {
	static getDataURL(e, t = "image/png") {
		if (/^data:/i.test(e.src) || typeof HTMLCanvasElement > "u") return e.src;
		let n;
		if (e instanceof HTMLCanvasElement) n = e;
		else {
			Ot === void 0 && (Ot = nt("canvas")), Ot.width = e.width, Ot.height = e.height;
			let t = Ot.getContext("2d");
			e instanceof ImageData ? t.putImageData(e, 0, 0) : t.drawImage(e, 0, 0, e.width, e.height), n = Ot;
		}
		return n.toDataURL(t);
	}
	static sRGBToLinear(e) {
		if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap) {
			let t = nt("canvas");
			t.width = e.width, t.height = e.height;
			let n = t.getContext("2d");
			n.drawImage(e, 0, 0, e.width, e.height);
			let r = n.getImageData(0, 0, e.width, e.height), i = r.data;
			for (let e = 0; e < i.length; e++) i[e] = Et(i[e] / 255) * 255;
			return n.putImageData(r, 0, 0), t;
		}
		if (e.data) {
			let t = e.data.slice(0);
			for (let e = 0; e < t.length; e++) t instanceof Uint8Array || t instanceof Uint8ClampedArray ? t[e] = Math.floor(Et(t[e] / 255) * 255) : t[e] = Et(t[e]);
			return {
				data: t,
				width: e.width,
				height: e.height
			};
		}
		return B("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), e;
	}
}, At = 0, jt = class {
	constructor(e = null) {
		this.isTextureSource = !0, Object.defineProperty(this, "id", { value: At++ }), this.uuid = mt(), this.data = e, this.dataReady = !0, this.version = 0;
	}
	getSize(e) {
		let t = this.data;
		return typeof HTMLVideoElement < "u" && t instanceof HTMLVideoElement ? e.set(t.videoWidth, t.videoHeight, 0) : typeof VideoFrame < "u" && t instanceof VideoFrame ? e.set(t.displayWidth, t.displayHeight, 0) : t === null ? e.set(0, 0, 0) : e.set(t.width, t.height, t.depth || 0), e;
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.images[this.uuid] !== void 0) return e.images[this.uuid];
		let n = {
			uuid: this.uuid,
			url: ""
		}, r = this.data;
		if (r !== null) {
			let e;
			if (Array.isArray(r)) {
				e = [];
				for (let t = 0, n = r.length; t < n; t++) r[t].isDataTexture ? e.push(Mt(r[t].image)) : e.push(Mt(r[t]));
			} else e = Mt(r);
			n.url = e;
		}
		return t || (e.images[this.uuid] = n), n;
	}
};
function Mt(e) {
	return typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap ? kt.getDataURL(e) : e.data ? {
		data: Array.from(e.data),
		width: e.width,
		height: e.height,
		type: e.data.constructor.name
	} : (B("Texture: Unable to serialize Texture."), {});
}
var Nt = 0, Pt = /*@__PURE__*/ new W(), Ft = class e extends ut {
	constructor(t = e.DEFAULT_IMAGE, n = e.DEFAULT_MAPPING, r = f, i = f, a = _, o = y, s = N, c = b, l = e.DEFAULT_ANISOTROPY, u = "") {
		super(), this.isTexture = !0, Object.defineProperty(this, "id", { value: Nt++ }), this.uuid = mt(), this.name = "", this.source = new jt(t), this.mipmaps = [], this.mapping = n, this.channel = 0, this.wrapS = r, this.wrapT = i, this.magFilter = a, this.minFilter = o, this.anisotropy = l, this.format = s, this.internalFormat = null, this.type = c, this.offset = new U(0, 0), this.repeat = new U(1, 1), this.center = new U(0, 0), this.rotation = 0, this.matrixAutoUpdate = !0, this.matrix = new G(), this.generateMipmaps = !0, this.premultiplyAlpha = !1, this.flipY = !0, this.unpackAlignment = 4, this.colorSpace = u, this.userData = {}, this.updateRanges = [], this.version = 0, this.onUpdate = null, this.renderTarget = null, this.isRenderTargetTexture = !1, this.isArrayTexture = !!(t && t.depth && t.depth > 1), this.pmremVersion = 0, this.normalized = !1;
	}
	get width() {
		return this.source.getSize(Pt).x;
	}
	get height() {
		return this.source.getSize(Pt).y;
	}
	get depth() {
		return this.source.getSize(Pt).z;
	}
	get image() {
		return this.source.data;
	}
	set image(e) {
		this.source.data = e;
	}
	updateMatrix() {
		this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.name = e.name, this.source = e.source, this.mipmaps = e.mipmaps.slice(0), this.mapping = e.mapping, this.channel = e.channel, this.wrapS = e.wrapS, this.wrapT = e.wrapT, this.magFilter = e.magFilter, this.minFilter = e.minFilter, this.anisotropy = e.anisotropy, this.format = e.format, this.internalFormat = e.internalFormat, this.type = e.type, this.normalized = e.normalized, this.offset.copy(e.offset), this.repeat.copy(e.repeat), this.center.copy(e.center), this.rotation = e.rotation, this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrix.copy(e.matrix), this.generateMipmaps = e.generateMipmaps, this.premultiplyAlpha = e.premultiplyAlpha, this.flipY = e.flipY, this.unpackAlignment = e.unpackAlignment, this.colorSpace = e.colorSpace, this.renderTarget = e.renderTarget, this.isRenderTargetTexture = e.isRenderTargetTexture, this.isArrayTexture = e.isArrayTexture, this.userData = JSON.parse(JSON.stringify(e.userData)), this.needsUpdate = !0, this;
	}
	setValues(e) {
		for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				B(`Texture.setValues(): parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			r === void 0 ? B(`Texture.setValues(): property '${t}' does not exist.`) : r && n && r.isVector2 && n.isVector2 || r && n && r.isVector3 && n.isVector3 || r && n && r.isMatrix3 && n.isMatrix3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		if (!t && e.textures[this.uuid] !== void 0) return e.textures[this.uuid];
		let n = {
			metadata: {
				version: 4.7,
				type: "Texture",
				generator: "Texture.toJSON"
			},
			uuid: this.uuid,
			name: this.name,
			image: this.source.toJSON(e).uuid,
			mapping: this.mapping,
			channel: this.channel,
			repeat: [this.repeat.x, this.repeat.y],
			offset: [this.offset.x, this.offset.y],
			center: [this.center.x, this.center.y],
			rotation: this.rotation,
			wrap: [this.wrapS, this.wrapT],
			format: this.format,
			internalFormat: this.internalFormat,
			type: this.type,
			normalized: this.normalized,
			colorSpace: this.colorSpace,
			minFilter: this.minFilter,
			magFilter: this.magFilter,
			anisotropy: this.anisotropy,
			flipY: this.flipY,
			generateMipmaps: this.generateMipmaps,
			premultiplyAlpha: this.premultiplyAlpha,
			unpackAlignment: this.unpackAlignment
		};
		return Object.keys(this.userData).length > 0 && (n.userData = this.userData), t || (e.textures[this.uuid] = n), n;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	transformUv(e) {
		if (this.mapping !== 300) return e;
		if (e.applyMatrix3(this.matrix), e.x < 0 || e.x > 1) switch (this.wrapS) {
			case d:
				e.x -= Math.floor(e.x);
				break;
			case f:
				e.x = e.x < 0 ? 0 : 1;
				break;
			case p: Math.abs(Math.floor(e.x) % 2) === 1 ? e.x = Math.ceil(e.x) - e.x : e.x -= Math.floor(e.x);
		}
		if (e.y < 0 || e.y > 1) switch (this.wrapT) {
			case d:
				e.y -= Math.floor(e.y);
				break;
			case f:
				e.y = e.y < 0 ? 0 : 1;
				break;
			case p: Math.abs(Math.floor(e.y) % 2) === 1 ? e.y = Math.ceil(e.y) - e.y : e.y -= Math.floor(e.y);
		}
		return this.flipY && (e.y = 1 - e.y), e;
	}
	set needsUpdate(e) {
		e === !0 && (this.version++, this.source.needsUpdate = !0);
	}
	set needsPMREMUpdate(e) {
		e === !0 && this.pmremVersion++;
	}
};
Ft.DEFAULT_IMAGE = null, Ft.DEFAULT_MAPPING = 300, Ft.DEFAULT_ANISOTROPY = 1;
var It = class e {
	static {
		e.prototype.isVector4 = !0;
	}
	constructor(e = 0, t = 0, n = 0, r = 1) {
		this.x = e, this.y = t, this.z = n, this.w = r;
	}
	get width() {
		return this.z;
	}
	set width(e) {
		this.z = e;
	}
	get height() {
		return this.w;
	}
	set height(e) {
		this.w = e;
	}
	set(e, t, n, r) {
		return this.x = e, this.y = t, this.z = n, this.w = r, this;
	}
	setScalar(e) {
		return this.x = e, this.y = e, this.z = e, this.w = e, this;
	}
	setX(e) {
		return this.x = e, this;
	}
	setY(e) {
		return this.y = e, this;
	}
	setZ(e) {
		return this.z = e, this;
	}
	setW(e) {
		return this.w = e, this;
	}
	setComponent(e, t) {
		switch (e) {
			case 0:
				this.x = t;
				break;
			case 1:
				this.y = t;
				break;
			case 2:
				this.z = t;
				break;
			case 3:
				this.w = t;
				break;
			default: throw Error("THREE.Vector4: index is out of range: " + e);
		}
		return this;
	}
	getComponent(e) {
		switch (e) {
			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			case 3: return this.w;
			default: throw Error("THREE.Vector4: index is out of range: " + e);
		}
	}
	clone() {
		return new this.constructor(this.x, this.y, this.z, this.w);
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this.w = e.w === void 0 ? 1 : e.w, this;
	}
	add(e) {
		return this.x += e.x, this.y += e.y, this.z += e.z, this.w += e.w, this;
	}
	addScalar(e) {
		return this.x += e, this.y += e, this.z += e, this.w += e, this;
	}
	addVectors(e, t) {
		return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this.w = e.w + t.w, this;
	}
	addScaledVector(e, t) {
		return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this.w += e.w * t, this;
	}
	sub(e) {
		return this.x -= e.x, this.y -= e.y, this.z -= e.z, this.w -= e.w, this;
	}
	subScalar(e) {
		return this.x -= e, this.y -= e, this.z -= e, this.w -= e, this;
	}
	subVectors(e, t) {
		return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this.w = e.w - t.w, this;
	}
	multiply(e) {
		return this.x *= e.x, this.y *= e.y, this.z *= e.z, this.w *= e.w, this;
	}
	multiplyScalar(e) {
		return this.x *= e, this.y *= e, this.z *= e, this.w *= e, this;
	}
	applyMatrix4(e) {
		let t = this.x, n = this.y, r = this.z, i = this.w, a = e.elements;
		return this.x = a[0] * t + a[4] * n + a[8] * r + a[12] * i, this.y = a[1] * t + a[5] * n + a[9] * r + a[13] * i, this.z = a[2] * t + a[6] * n + a[10] * r + a[14] * i, this.w = a[3] * t + a[7] * n + a[11] * r + a[15] * i, this;
	}
	divide(e) {
		return this.x /= e.x, this.y /= e.y, this.z /= e.z, this.w /= e.w, this;
	}
	divideScalar(e) {
		return this.multiplyScalar(1 / e);
	}
	setAxisAngleFromQuaternion(e) {
		this.w = 2 * Math.acos(e.w);
		let t = Math.sqrt(1 - e.w * e.w);
		return t < 1e-4 ? (this.x = 1, this.y = 0, this.z = 0) : (this.x = e.x / t, this.y = e.y / t, this.z = e.z / t), this;
	}
	setAxisAngleFromRotationMatrix(e) {
		let t, n, r, i, a = .01, o = .1, s = e.elements, c = s[0], l = s[4], u = s[8], d = s[1], f = s[5], p = s[9], m = s[2], h = s[6], g = s[10];
		if (Math.abs(l - d) < a && Math.abs(u - m) < a && Math.abs(p - h) < a) {
			if (Math.abs(l + d) < o && Math.abs(u + m) < o && Math.abs(p + h) < o && Math.abs(c + f + g - 3) < o) return this.set(1, 0, 0, 0), this;
			t = Math.PI;
			let e = (c + 1) / 2, s = (f + 1) / 2, _ = (g + 1) / 2, v = (l + d) / 4, y = (u + m) / 4, b = (p + h) / 4;
			return e > s && e > _ ? e < a ? (n = 0, r = .707106781, i = .707106781) : (n = Math.sqrt(e), r = v / n, i = y / n) : s > _ ? s < a ? (n = .707106781, r = 0, i = .707106781) : (r = Math.sqrt(s), n = v / r, i = b / r) : _ < a ? (n = .707106781, r = .707106781, i = 0) : (i = Math.sqrt(_), n = y / i, r = b / i), this.set(n, r, i, t), this;
		}
		let _ = Math.sqrt((h - p) * (h - p) + (u - m) * (u - m) + (d - l) * (d - l));
		return Math.abs(_) < .001 && (_ = 1), this.x = (h - p) / _, this.y = (u - m) / _, this.z = (d - l) / _, this.w = Math.acos((c + f + g - 1) / 2), this;
	}
	setFromMatrixPosition(e) {
		let t = e.elements;
		return this.x = t[12], this.y = t[13], this.z = t[14], this.w = t[15], this;
	}
	min(e) {
		return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this.w = Math.min(this.w, e.w), this;
	}
	max(e) {
		return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this.w = Math.max(this.w, e.w), this;
	}
	clamp(e, t) {
		return this.x = ht(this.x, e.x, t.x), this.y = ht(this.y, e.y, t.y), this.z = ht(this.z, e.z, t.z), this.w = ht(this.w, e.w, t.w), this;
	}
	clampScalar(e, t) {
		return this.x = ht(this.x, e, t), this.y = ht(this.y, e, t), this.z = ht(this.z, e, t), this.w = ht(this.w, e, t), this;
	}
	clampLength(e, t) {
		let n = this.length();
		return this.divideScalar(n || 1).multiplyScalar(ht(n, e, t));
	}
	floor() {
		return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this.w = Math.floor(this.w), this;
	}
	ceil() {
		return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this.w = Math.ceil(this.w), this;
	}
	round() {
		return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this.w = Math.round(this.w), this;
	}
	roundToZero() {
		return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this.w = Math.trunc(this.w), this;
	}
	negate() {
		return this.x = -this.x, this.y = -this.y, this.z = -this.z, this.w = -this.w, this;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z + this.w * e.w;
	}
	lengthSq() {
		return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
	}
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
	}
	manhattanLength() {
		return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
	}
	normalize() {
		return this.divideScalar(this.length() || 1);
	}
	setLength(e) {
		return this.normalize().multiplyScalar(e);
	}
	lerp(e, t) {
		return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this.w += (e.w - this.w) * t, this;
	}
	lerpVectors(e, t, n) {
		return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this.w = e.w + (t.w - e.w) * n, this;
	}
	equals(e) {
		return e.x === this.x && e.y === this.y && e.z === this.z && e.w === this.w;
	}
	fromArray(e, t = 0) {
		return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this.w = e[t + 3], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e[t + 3] = this.w, e;
	}
	fromBufferAttribute(e, t) {
		return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this.w = e.getW(t), this;
	}
	random() {
		return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this.w = Math.random(), this;
	}
	*[Symbol.iterator]() {
		yield this.x, yield this.y, yield this.z, yield this.w;
	}
}, Lt = class extends ut {
	constructor(e = 1, t = 1, n = {}) {
		super(), n = Object.assign({
			generateMipmaps: !1,
			internalFormat: null,
			minFilter: _,
			depthBuffer: !0,
			stencilBuffer: !1,
			resolveColorBuffer: !0,
			resolveDepthBuffer: !0,
			resolveStencilBuffer: !0,
			storeMultisampledColorBuffer: !0,
			storeMultisampledDepthBuffer: !0,
			storeMultisampledStencilBuffer: !0,
			depthTexture: null,
			samples: 0,
			count: 1,
			depth: 1,
			multiview: !1,
			useArrayDepthTexture: !1
		}, n), this.isRenderTarget = !0, this.width = e, this.height = t, this.depth = n.depth, this.scissor = new It(0, 0, e, t), this.scissorTest = !1, this.viewport = new It(0, 0, e, t), this.textures = [];
		let r = new Ft({
			width: e,
			height: t,
			depth: n.depth
		}), i = n.count;
		for (let e = 0; e < i; e++) this.textures[e] = r.clone(), this.textures[e].isRenderTargetTexture = !0, this.textures[e].renderTarget = this;
		this._setTextureOptions(n), this.depthBuffer = n.depthBuffer, this.stencilBuffer = n.stencilBuffer, this.resolveColorBuffer = n.resolveColorBuffer, this.resolveDepthBuffer = n.resolveDepthBuffer, this.resolveStencilBuffer = n.resolveStencilBuffer, this.storeMultisampledColorBuffer = n.storeMultisampledColorBuffer, this.storeMultisampledDepthBuffer = n.storeMultisampledDepthBuffer, this.storeMultisampledStencilBuffer = n.storeMultisampledStencilBuffer, this._depthTexture = null, this.depthTexture = n.depthTexture, this.samples = n.samples, this.multiview = n.multiview, this.useArrayDepthTexture = n.useArrayDepthTexture;
	}
	_setTextureOptions(e = {}) {
		let t = {
			minFilter: _,
			generateMipmaps: !1,
			flipY: !1,
			internalFormat: null
		};
		e.mapping !== void 0 && (t.mapping = e.mapping), e.wrapS !== void 0 && (t.wrapS = e.wrapS), e.wrapT !== void 0 && (t.wrapT = e.wrapT), e.wrapR !== void 0 && (t.wrapR = e.wrapR), e.magFilter !== void 0 && (t.magFilter = e.magFilter), e.minFilter !== void 0 && (t.minFilter = e.minFilter), e.format !== void 0 && (t.format = e.format), e.type !== void 0 && (t.type = e.type), e.anisotropy !== void 0 && (t.anisotropy = e.anisotropy), e.colorSpace !== void 0 && (t.colorSpace = e.colorSpace), e.flipY !== void 0 && (t.flipY = e.flipY), e.generateMipmaps !== void 0 && (t.generateMipmaps = e.generateMipmaps), e.internalFormat !== void 0 && (t.internalFormat = e.internalFormat);
		for (let e = 0; e < this.textures.length; e++) this.textures[e].setValues(t);
	}
	get texture() {
		return this.textures[0];
	}
	set texture(e) {
		this.textures[0] = e;
	}
	set depthTexture(e) {
		this._depthTexture !== null && this._depthTexture.renderTarget === this && (this._depthTexture.renderTarget = null), e !== null && e.renderTarget === null && (e.renderTarget = this), this._depthTexture = e;
	}
	get depthTexture() {
		return this._depthTexture;
	}
	setSize(e, t, n = 1) {
		if (this.width !== e || this.height !== t || this.depth !== n) {
			this.width = e, this.height = t, this.depth = n;
			for (let r = 0, i = this.textures.length; r < i; r++) this.textures[r].image.width = e, this.textures[r].image.height = t, this.textures[r].image.depth = n, this.textures[r].isData3DTexture !== !0 && (this.textures[r].isArrayTexture = this.textures[r].image.depth > 1);
			this.dispose();
		}
		this.viewport.set(0, 0, e, t), this.scissor.set(0, 0, e, t);
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.width = e.width, this.height = e.height, this.depth = e.depth, this.scissor.copy(e.scissor), this.scissorTest = e.scissorTest, this.viewport.copy(e.viewport), this.textures.length = 0;
		for (let t = 0, n = e.textures.length; t < n; t++) {
			this.textures[t] = e.textures[t].clone(), this.textures[t].isRenderTargetTexture = !0, this.textures[t].renderTarget = this;
			let n = Object.assign({}, e.textures[t].image);
			this.textures[t].source = new jt(n);
		}
		if (this.depthBuffer = e.depthBuffer, this.stencilBuffer = e.stencilBuffer, this.resolveColorBuffer = e.resolveColorBuffer, this.resolveDepthBuffer = e.resolveDepthBuffer, this.resolveStencilBuffer = e.resolveStencilBuffer, this.storeMultisampledColorBuffer = e.storeMultisampledColorBuffer, this.storeMultisampledDepthBuffer = e.storeMultisampledDepthBuffer, this.storeMultisampledStencilBuffer = e.storeMultisampledStencilBuffer, e.depthTexture !== null) {
			if (e.depthTexture.renderTarget === e) {
				let t = e.depthTexture.clone();
				t.renderTarget = null, this.depthTexture = t;
			} else this.depthTexture = e.depthTexture;
		}
		return this.samples = e.samples, this.multiview = e.multiview, this.useArrayDepthTexture = e.useArrayDepthTexture, this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, q = class extends Lt {
	constructor(e = 1, t = 1, n = {}) {
		super(e, t, n), this.isWebGLRenderTarget = !0;
	}
}, Rt = class extends Ft {
	constructor(e = null, t = 1, n = 1, r = 1) {
		super(null), this.isDataArrayTexture = !0, this.image = {
			data: e,
			width: t,
			height: n,
			depth: r
		}, this.magFilter = m, this.minFilter = m, this.wrapR = f, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1, this.layerUpdates = /* @__PURE__ */ new Set();
	}
	copy(e) {
		return super.copy(e), this.wrapR = e.wrapR, this;
	}
	addLayerUpdate(e) {
		this.layerUpdates.add(e);
	}
	clearLayerUpdates() {
		this.layerUpdates.clear();
	}
}, zt = class extends Ft {
	constructor(e = null, t = 1, n = 1, r = 1) {
		super(null), this.isData3DTexture = !0, this.image = {
			data: e,
			width: t,
			height: n,
			depth: r
		}, this.magFilter = m, this.minFilter = m, this.wrapR = f, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
	}
	copy(e) {
		return super.copy(e), this.wrapR = e.wrapR, this;
	}
}, Bt = class e {
	static {
		e.prototype.isMatrix4 = !0;
	}
	constructor(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		this.elements = [
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h);
	}
	set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		let g = this.elements;
		return g[0] = e, g[4] = t, g[8] = n, g[12] = r, g[1] = i, g[5] = a, g[9] = o, g[13] = s, g[2] = c, g[6] = l, g[10] = u, g[14] = d, g[3] = f, g[7] = p, g[11] = m, g[15] = h, this;
	}
	identity() {
		return this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	clone() {
		return new e().fromArray(this.elements);
	}
	copy(e) {
		let t = this.elements, n = e.elements;
		return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], t[9] = n[9], t[10] = n[10], t[11] = n[11], t[12] = n[12], t[13] = n[13], t[14] = n[14], t[15] = n[15], this;
	}
	copyPosition(e) {
		let t = this.elements, n = e.elements;
		return t[12] = n[12], t[13] = n[13], t[14] = n[14], this;
	}
	setFromMatrix3(e) {
		let t = e.elements;
		return this.set(t[0], t[3], t[6], 0, t[1], t[4], t[7], 0, t[2], t[5], t[8], 0, 0, 0, 0, 1), this;
	}
	extractBasis(e, t, n) {
		return this.determinantAffine() === 0 ? (e.set(1, 0, 0), t.set(0, 1, 0), n.set(0, 0, 1), this) : (e.setFromMatrixColumn(this, 0), t.setFromMatrixColumn(this, 1), n.setFromMatrixColumn(this, 2), this);
	}
	makeBasis(e, t, n) {
		return this.set(e.x, t.x, n.x, 0, e.y, t.y, n.y, 0, e.z, t.z, n.z, 0, 0, 0, 0, 1), this;
	}
	extractRotation(e) {
		if (e.determinantAffine() === 0) return this.identity();
		let t = this.elements, n = e.elements, r = 1 / Vt.setFromMatrixColumn(e, 0).length(), i = 1 / Vt.setFromMatrixColumn(e, 1).length(), a = 1 / Vt.setFromMatrixColumn(e, 2).length();
		return t[0] = n[0] * r, t[1] = n[1] * r, t[2] = n[2] * r, t[3] = 0, t[4] = n[4] * i, t[5] = n[5] * i, t[6] = n[6] * i, t[7] = 0, t[8] = n[8] * a, t[9] = n[9] * a, t[10] = n[10] * a, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromEuler(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z, a = Math.cos(n), o = Math.sin(n), s = Math.cos(r), c = Math.sin(r), l = Math.cos(i), u = Math.sin(i);
		if (e.order === "XYZ") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = -s * u, t[8] = c, t[1] = n + r * c, t[5] = e - i * c, t[9] = -o * s, t[2] = i - e * c, t[6] = r + n * c, t[10] = a * s;
		} else if (e.order === "YXZ") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e + i * o, t[4] = r * o - n, t[8] = a * c, t[1] = a * u, t[5] = a * l, t[9] = -o, t[2] = n * o - r, t[6] = i + e * o, t[10] = a * s;
		} else if (e.order === "ZXY") {
			let e = s * l, n = s * u, r = c * l, i = c * u;
			t[0] = e - i * o, t[4] = -a * u, t[8] = r + n * o, t[1] = n + r * o, t[5] = a * l, t[9] = i - e * o, t[2] = -a * c, t[6] = o, t[10] = a * s;
		} else if (e.order === "ZYX") {
			let e = a * l, n = a * u, r = o * l, i = o * u;
			t[0] = s * l, t[4] = r * c - n, t[8] = e * c + i, t[1] = s * u, t[5] = i * c + e, t[9] = n * c - r, t[2] = -c, t[6] = o * s, t[10] = a * s;
		} else if (e.order === "YZX") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = i - e * u, t[8] = r * u + n, t[1] = u, t[5] = a * l, t[9] = -o * l, t[2] = -c * l, t[6] = n * u + r, t[10] = e - i * u;
		} else if (e.order === "XZY") {
			let e = a * s, n = a * c, r = o * s, i = o * c;
			t[0] = s * l, t[4] = -u, t[8] = c * l, t[1] = e * u + i, t[5] = a * l, t[9] = n * u - r, t[2] = r * u - n, t[6] = o * l, t[10] = i * u + e;
		}
		return t[3] = 0, t[7] = 0, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
	}
	makeRotationFromQuaternion(e) {
		return this.compose(Ut, e, Wt);
	}
	lookAt(e, t, n) {
		let r = this.elements;
		return qt.subVectors(e, t), qt.lengthSq() === 0 && (qt.z = 1), qt.normalize(), Gt.crossVectors(n, qt), Gt.lengthSq() === 0 && (Math.abs(n.z) === 1 ? qt.x += 1e-4 : qt.z += 1e-4, qt.normalize(), Gt.crossVectors(n, qt)), Gt.normalize(), Kt.crossVectors(qt, Gt), r[0] = Gt.x, r[4] = Kt.x, r[8] = qt.x, r[1] = Gt.y, r[5] = Kt.y, r[9] = qt.y, r[2] = Gt.z, r[6] = Kt.z, r[10] = qt.z, this;
	}
	multiply(e) {
		return this.multiplyMatrices(this, e);
	}
	premultiply(e) {
		return this.multiplyMatrices(e, this);
	}
	multiplyMatrices(e, t) {
		let n = e.elements, r = t.elements, i = this.elements, a = n[0], o = n[4], s = n[8], c = n[12], l = n[1], u = n[5], d = n[9], f = n[13], p = n[2], m = n[6], h = n[10], g = n[14], _ = n[3], v = n[7], y = n[11], b = n[15], x = r[0], S = r[4], C = r[8], w = r[12], T = r[1], E = r[5], D = r[9], O = r[13], ee = r[2], k = r[6], A = r[10], j = r[14], M = r[3], te = r[7], N = r[11], ne = r[15];
		return i[0] = a * x + o * T + s * ee + c * M, i[4] = a * S + o * E + s * k + c * te, i[8] = a * C + o * D + s * A + c * N, i[12] = a * w + o * O + s * j + c * ne, i[1] = l * x + u * T + d * ee + f * M, i[5] = l * S + u * E + d * k + f * te, i[9] = l * C + u * D + d * A + f * N, i[13] = l * w + u * O + d * j + f * ne, i[2] = p * x + m * T + h * ee + g * M, i[6] = p * S + m * E + h * k + g * te, i[10] = p * C + m * D + h * A + g * N, i[14] = p * w + m * O + h * j + g * ne, i[3] = _ * x + v * T + y * ee + b * M, i[7] = _ * S + v * E + y * k + b * te, i[11] = _ * C + v * D + y * A + b * N, i[15] = _ * w + v * O + y * j + b * ne, this;
	}
	multiplyScalar(e) {
		let t = this.elements;
		return t[0] *= e, t[4] *= e, t[8] *= e, t[12] *= e, t[1] *= e, t[5] *= e, t[9] *= e, t[13] *= e, t[2] *= e, t[6] *= e, t[10] *= e, t[14] *= e, t[3] *= e, t[7] *= e, t[11] *= e, t[15] *= e, this;
	}
	determinant() {
		let e = this.elements, t = e[0], n = e[4], r = e[8], i = e[12], a = e[1], o = e[5], s = e[9], c = e[13], l = e[2], u = e[6], d = e[10], f = e[14], p = e[3], m = e[7], h = e[11], g = e[15], _ = s * f - c * d, v = o * f - c * u, y = o * d - s * u, b = a * f - c * l, x = a * d - s * l, S = a * u - o * l;
		return t * (m * _ - h * v + g * y) - n * (p * _ - h * b + g * x) + r * (p * v - m * b + g * S) - i * (p * y - m * x + h * S);
	}
	determinantAffine() {
		let e = this.elements, t = e[0], n = e[4], r = e[8], i = e[1], a = e[5], o = e[9], s = e[2], c = e[6], l = e[10];
		return t * (a * l - o * c) - n * (i * l - o * s) + r * (i * c - a * s);
	}
	transpose() {
		let e = this.elements, t;
		return t = e[1], e[1] = e[4], e[4] = t, t = e[2], e[2] = e[8], e[8] = t, t = e[6], e[6] = e[9], e[9] = t, t = e[3], e[3] = e[12], e[12] = t, t = e[7], e[7] = e[13], e[13] = t, t = e[11], e[11] = e[14], e[14] = t, this;
	}
	setPosition(e, t, n) {
		let r = this.elements;
		return e.isVector3 ? (r[12] = e.x, r[13] = e.y, r[14] = e.z) : (r[12] = e, r[13] = t, r[14] = n), this;
	}
	invert() {
		let e = this.elements, t = e[0], n = e[1], r = e[2], i = e[3], a = e[4], o = e[5], s = e[6], c = e[7], l = e[8], u = e[9], d = e[10], f = e[11], p = e[12], m = e[13], h = e[14], g = e[15], _ = t * o - n * a, v = t * s - r * a, y = t * c - i * a, b = n * s - r * o, x = n * c - i * o, S = r * c - i * s, C = l * m - u * p, w = l * h - d * p, T = l * g - f * p, E = u * h - d * m, D = u * g - f * m, O = d * g - f * h, ee = _ * O - v * D + y * E + b * T - x * w + S * C;
		if (ee === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
		let k = 1 / ee;
		return e[0] = (o * O - s * D + c * E) * k, e[1] = (r * D - n * O - i * E) * k, e[2] = (m * S - h * x + g * b) * k, e[3] = (d * x - u * S - f * b) * k, e[4] = (s * T - a * O - c * w) * k, e[5] = (t * O - r * T + i * w) * k, e[6] = (h * y - p * S - g * v) * k, e[7] = (l * S - d * y + f * v) * k, e[8] = (a * D - o * T + c * C) * k, e[9] = (n * T - t * D - i * C) * k, e[10] = (p * x - m * y + g * _) * k, e[11] = (u * y - l * x - f * _) * k, e[12] = (o * w - a * E - s * C) * k, e[13] = (t * E - n * w + r * C) * k, e[14] = (m * v - p * b - h * _) * k, e[15] = (l * b - u * v + d * _) * k, this;
	}
	scale(e) {
		let t = this.elements, n = e.x, r = e.y, i = e.z;
		return t[0] *= n, t[4] *= r, t[8] *= i, t[1] *= n, t[5] *= r, t[9] *= i, t[2] *= n, t[6] *= r, t[10] *= i, t[3] *= n, t[7] *= r, t[11] *= i, this;
	}
	getMaxScaleOnAxis() {
		let e = this.elements, t = e[0] * e[0] + e[1] * e[1] + e[2] * e[2], n = e[4] * e[4] + e[5] * e[5] + e[6] * e[6], r = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
		return Math.sqrt(Math.max(t, n, r));
	}
	makeTranslation(e, t, n) {
		return e.isVector3 ? this.set(1, 0, 0, e.x, 0, 1, 0, e.y, 0, 0, 1, e.z, 0, 0, 0, 1) : this.set(1, 0, 0, e, 0, 1, 0, t, 0, 0, 1, n, 0, 0, 0, 1), this;
	}
	makeRotationX(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(1, 0, 0, 0, 0, t, -n, 0, 0, n, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationY(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, 0, n, 0, 0, 1, 0, 0, -n, 0, t, 0, 0, 0, 0, 1), this;
	}
	makeRotationZ(e) {
		let t = Math.cos(e), n = Math.sin(e);
		return this.set(t, -n, 0, 0, n, t, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this;
	}
	makeRotationAxis(e, t) {
		let n = Math.cos(t), r = Math.sin(t), i = 1 - n, a = e.x, o = e.y, s = e.z, c = i * a, l = i * o;
		return this.set(c * a + n, c * o - r * s, c * s + r * o, 0, c * o + r * s, l * o + n, l * s - r * a, 0, c * s - r * o, l * s + r * a, i * s * s + n, 0, 0, 0, 0, 1), this;
	}
	makeScale(e, t, n) {
		return this.set(e, 0, 0, 0, 0, t, 0, 0, 0, 0, n, 0, 0, 0, 0, 1), this;
	}
	makeShear(e, t, n, r, i, a) {
		return this.set(1, n, i, 0, e, 1, a, 0, t, r, 1, 0, 0, 0, 0, 1), this;
	}
	compose(e, t, n) {
		let r = this.elements, i = t._x, a = t._y, o = t._z, s = t._w, c = i + i, l = a + a, u = o + o, d = i * c, f = i * l, p = i * u, m = a * l, h = a * u, g = o * u, _ = s * c, v = s * l, y = s * u, b = n.x, x = n.y, S = n.z;
		return r[0] = (1 - (m + g)) * b, r[1] = (f + y) * b, r[2] = (p - v) * b, r[3] = 0, r[4] = (f - y) * x, r[5] = (1 - (d + g)) * x, r[6] = (h + _) * x, r[7] = 0, r[8] = (p + v) * S, r[9] = (h - _) * S, r[10] = (1 - (d + m)) * S, r[11] = 0, r[12] = e.x, r[13] = e.y, r[14] = e.z, r[15] = 1, this;
	}
	decompose(e, t, n) {
		let r = this.elements;
		e.x = r[12], e.y = r[13], e.z = r[14];
		let i = this.determinantAffine();
		if (i === 0) return n.set(1, 1, 1), t.identity(), this;
		let a = Vt.set(r[0], r[1], r[2]).length(), o = Vt.set(r[4], r[5], r[6]).length(), s = Vt.set(r[8], r[9], r[10]).length();
		i < 0 && (a = -a), Ht.copy(this);
		let c = 1 / a, l = 1 / o, u = 1 / s;
		return Ht.elements[0] *= c, Ht.elements[1] *= c, Ht.elements[2] *= c, Ht.elements[4] *= l, Ht.elements[5] *= l, Ht.elements[6] *= l, Ht.elements[8] *= u, Ht.elements[9] *= u, Ht.elements[10] *= u, t.setFromRotationMatrix(Ht), n.x = a, n.y = o, n.z = s, this;
	}
	makePerspective(e, t, n, r, i, a, o = $e, s = !1) {
		let c = this.elements, l = 2 * i / (t - e), u = 2 * i / (n - r), d = (t + e) / (t - e), f = (n + r) / (n - r), p, m;
		if (s) p = i / (a - i), m = a * i / (a - i);
		else if (o === 2e3) p = -(a + i) / (a - i), m = -2 * a * i / (a - i);
		else if (o === 2001) p = -a / (a - i), m = -a * i / (a - i);
		else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = d, c[12] = 0, c[1] = 0, c[5] = u, c[9] = f, c[13] = 0, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = -1, c[15] = 0, this;
	}
	makeOrthographic(e, t, n, r, i, a, o = $e, s = !1) {
		let c = this.elements, l = 2 / (t - e), u = 2 / (n - r), d = -(t + e) / (t - e), f = -(n + r) / (n - r), p, m;
		if (s) p = 1 / (a - i), m = a / (a - i);
		else if (o === 2e3) p = -2 / (a - i), m = -(a + i) / (a - i);
		else if (o === 2001) p = -1 / (a - i), m = -i / (a - i);
		else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + o);
		return c[0] = l, c[4] = 0, c[8] = 0, c[12] = d, c[1] = 0, c[5] = u, c[9] = 0, c[13] = f, c[2] = 0, c[6] = 0, c[10] = p, c[14] = m, c[3] = 0, c[7] = 0, c[11] = 0, c[15] = 1, this;
	}
	equals(e) {
		let t = this.elements, n = e.elements;
		for (let e = 0; e < 16; e++) if (t[e] !== n[e]) return !1;
		return !0;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 16; n++) this.elements[n] = e[n + t];
		return this;
	}
	toArray(e = [], t = 0) {
		let n = this.elements;
		return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e[t + 9] = n[9], e[t + 10] = n[10], e[t + 11] = n[11], e[t + 12] = n[12], e[t + 13] = n[13], e[t + 14] = n[14], e[t + 15] = n[15], e;
	}
}, Vt = /*@__PURE__*/ new W(), Ht = /*@__PURE__*/ new Bt(), Ut = /*@__PURE__*/ new W(0, 0, 0), Wt = /*@__PURE__*/ new W(1, 1, 1), Gt = /*@__PURE__*/ new W(), Kt = /*@__PURE__*/ new W(), qt = /*@__PURE__*/ new W(), Jt = /*@__PURE__*/ new Bt(), Yt = /*@__PURE__*/ new yt(), Xt = class e {
	constructor(t = 0, n = 0, r = 0, i = e.DEFAULT_ORDER) {
		this.isEuler = !0, this._x = t, this._y = n, this._z = r, this._order = i;
	}
	get x() {
		return this._x;
	}
	set x(e) {
		this._x = e, this._onChangeCallback();
	}
	get y() {
		return this._y;
	}
	set y(e) {
		this._y = e, this._onChangeCallback();
	}
	get z() {
		return this._z;
	}
	set z(e) {
		this._z = e, this._onChangeCallback();
	}
	get order() {
		return this._order;
	}
	set order(e) {
		this._order = e, this._onChangeCallback();
	}
	set(e, t, n, r = this._order) {
		return this._x = e, this._y = t, this._z = n, this._order = r, this._onChangeCallback(), this;
	}
	clone() {
		return new this.constructor(this._x, this._y, this._z, this._order);
	}
	copy(e) {
		return this._x = e._x, this._y = e._y, this._z = e._z, this._order = e._order, this._onChangeCallback(), this;
	}
	setFromRotationMatrix(e, t = this._order, n = !0) {
		let r = e.elements, i = r[0], a = r[4], o = r[8], s = r[1], c = r[5], l = r[9], u = r[2], d = r[6], f = r[10];
		switch (t) {
			case "XYZ":
				this._y = Math.asin(ht(o, -1, 1)), Math.abs(o) < .9999999 ? (this._x = Math.atan2(-l, f), this._z = Math.atan2(-a, i)) : (this._x = Math.atan2(d, c), this._z = 0);
				break;
			case "YXZ":
				this._x = Math.asin(-ht(l, -1, 1)), Math.abs(l) < .9999999 ? (this._y = Math.atan2(o, f), this._z = Math.atan2(s, c)) : (this._y = Math.atan2(-u, i), this._z = 0);
				break;
			case "ZXY":
				this._x = Math.asin(ht(d, -1, 1)), Math.abs(d) < .9999999 ? (this._y = Math.atan2(-u, f), this._z = Math.atan2(-a, c)) : (this._y = 0, this._z = Math.atan2(s, i));
				break;
			case "ZYX":
				this._y = Math.asin(-ht(u, -1, 1)), Math.abs(u) < .9999999 ? (this._x = Math.atan2(d, f), this._z = Math.atan2(s, i)) : (this._x = 0, this._z = Math.atan2(-a, c));
				break;
			case "YZX":
				this._z = Math.asin(ht(s, -1, 1)), Math.abs(s) < .9999999 ? (this._x = Math.atan2(-l, c), this._y = Math.atan2(-u, i)) : (this._x = 0, this._y = Math.atan2(o, f));
				break;
			case "XZY":
				this._z = Math.asin(-ht(a, -1, 1)), Math.abs(a) < .9999999 ? (this._x = Math.atan2(d, c), this._y = Math.atan2(o, i)) : (this._x = Math.atan2(-l, f), this._y = 0);
				break;
			default: B("Euler: .setFromRotationMatrix() encountered an unknown order: " + t);
		}
		return this._order = t, n === !0 && this._onChangeCallback(), this;
	}
	setFromQuaternion(e, t, n) {
		return Jt.makeRotationFromQuaternion(e), this.setFromRotationMatrix(Jt, t, n);
	}
	setFromVector3(e, t = this._order) {
		return this.set(e.x, e.y, e.z, t);
	}
	reorder(e) {
		return Yt.setFromEuler(this), this.setFromQuaternion(Yt, e);
	}
	equals(e) {
		return e._x === this._x && e._y === this._y && e._z === this._z && e._order === this._order;
	}
	fromArray(e) {
		return this._x = e[0], this._y = e[1], this._z = e[2], e[3] !== void 0 && (this._order = e[3]), this._onChangeCallback(), this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._order, e;
	}
	_onChange(e) {
		return this._onChangeCallback = e, this;
	}
	_onChangeCallback() {}
	*[Symbol.iterator]() {
		yield this._x, yield this._y, yield this._z, yield this._order;
	}
};
Xt.DEFAULT_ORDER = "XYZ";
var Zt = class {
	constructor() {
		this.mask = 1;
	}
	set(e) {
		this.mask = 1 << e >>> 0;
	}
	enable(e) {
		this.mask |= 1 << e;
	}
	enableAll() {
		this.mask = -1;
	}
	toggle(e) {
		this.mask ^= 1 << e;
	}
	disable(e) {
		this.mask &= ~(1 << e);
	}
	disableAll() {
		this.mask = 0;
	}
	test(e) {
		return (this.mask & e.mask) !== 0;
	}
	isEnabled(e) {
		return !!(this.mask & 1 << e);
	}
}, Qt = 0, $t = /*@__PURE__*/ new W(), en = /*@__PURE__*/ new yt(), tn = /*@__PURE__*/ new Bt(), nn = /*@__PURE__*/ new W(), rn = /*@__PURE__*/ new W(), an = /*@__PURE__*/ new W(), on = /*@__PURE__*/ new yt(), sn = /*@__PURE__*/ new W(1, 0, 0), cn = /*@__PURE__*/ new W(0, 1, 0), ln = /*@__PURE__*/ new W(0, 0, 1), un = { type: "added" }, dn = { type: "removed" }, fn = {
	type: "childadded",
	child: null
}, pn = {
	type: "childremoved",
	child: null
}, mn = class e extends ut {
	constructor() {
		super(), this.isObject3D = !0, Object.defineProperty(this, "id", { value: Qt++ }), this.uuid = mt(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = e.DEFAULT_UP.clone();
		let t = new W(), n = new Xt(), r = new yt(), i = new W(1, 1, 1);
		function a() {
			r.setFromEuler(n, !1);
		}
		function o() {
			n.setFromQuaternion(r, void 0, !1);
		}
		n._onChange(a), r._onChange(o), Object.defineProperties(this, {
			position: {
				configurable: !0,
				enumerable: !0,
				value: t
			},
			rotation: {
				configurable: !0,
				enumerable: !0,
				value: n
			},
			quaternion: {
				configurable: !0,
				enumerable: !0,
				value: r
			},
			scale: {
				configurable: !0,
				enumerable: !0,
				value: i
			},
			modelViewMatrix: { value: new Bt() },
			normalMatrix: { value: new G() }
		}), this.matrix = new Bt(), this.matrixWorld = new Bt(), this.matrixAutoUpdate = e.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = !1, this.layers = new Zt(), this.visible = !0, this.castShadow = !1, this.receiveShadow = !1, this.frustumCulled = !0, this.renderOrder = 0, this.animations = [], this.customDepthMaterial = void 0, this.customDistanceMaterial = void 0, this.static = !1, this.userData = {}, this.pivot = null;
	}
	onBeforeShadow() {}
	onAfterShadow() {}
	onBeforeRender() {}
	onAfterRender() {}
	applyMatrix4(e) {
		this.matrixAutoUpdate && this.updateMatrix(), this.matrix.premultiply(e), this.matrix.decompose(this.position, this.quaternion, this.scale);
	}
	applyQuaternion(e) {
		return this.quaternion.premultiply(e), this;
	}
	setRotationFromAxisAngle(e, t) {
		this.quaternion.setFromAxisAngle(e, t);
	}
	setRotationFromEuler(e) {
		this.quaternion.setFromEuler(e, !0);
	}
	setRotationFromMatrix(e) {
		this.quaternion.setFromRotationMatrix(e);
	}
	setRotationFromQuaternion(e) {
		this.quaternion.copy(e);
	}
	rotateOnAxis(e, t) {
		return en.setFromAxisAngle(e, t), this.quaternion.multiply(en), this;
	}
	rotateOnWorldAxis(e, t) {
		return en.setFromAxisAngle(e, t), this.quaternion.premultiply(en), this;
	}
	rotateX(e) {
		return this.rotateOnAxis(sn, e);
	}
	rotateY(e) {
		return this.rotateOnAxis(cn, e);
	}
	rotateZ(e) {
		return this.rotateOnAxis(ln, e);
	}
	translateOnAxis(e, t) {
		return $t.copy(e).applyQuaternion(this.quaternion), this.position.add($t.multiplyScalar(t)), this;
	}
	translateX(e) {
		return this.translateOnAxis(sn, e);
	}
	translateY(e) {
		return this.translateOnAxis(cn, e);
	}
	translateZ(e) {
		return this.translateOnAxis(ln, e);
	}
	localToWorld(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(this.matrixWorld);
	}
	worldToLocal(e) {
		return this.updateWorldMatrix(!0, !1), e.applyMatrix4(tn.copy(this.matrixWorld).invert());
	}
	lookAt(e, t, n) {
		e.isVector3 ? nn.copy(e) : nn.set(e, t, n);
		let r = this.parent;
		this.updateWorldMatrix(!0, !1), rn.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? tn.lookAt(rn, nn, this.up) : tn.lookAt(nn, rn, this.up), this.quaternion.setFromRotationMatrix(tn), r && (tn.extractRotation(r.matrixWorld), en.setFromRotationMatrix(tn), this.quaternion.premultiply(en.invert()));
	}
	add(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.add(arguments[e]);
			return this;
		}
		return e === this ? (V("Object3D.add: object can't be added as a child of itself.", e), this) : (e && e.isObject3D ? (e.removeFromParent(), e.parent = this, this.children.push(e), e.dispatchEvent(un), fn.child = e, this.dispatchEvent(fn), fn.child = null) : V("Object3D.add: object not an instance of THREE.Object3D.", e), this);
	}
	remove(e) {
		if (arguments.length > 1) {
			for (let e = 0; e < arguments.length; e++) this.remove(arguments[e]);
			return this;
		}
		let t = this.children.indexOf(e);
		return t !== -1 && (e.parent = null, this.children.splice(t, 1), e.dispatchEvent(dn), pn.child = e, this.dispatchEvent(pn), pn.child = null), this;
	}
	removeFromParent() {
		let e = this.parent;
		return e !== null && e.remove(this), this;
	}
	clear() {
		return this.remove(...this.children);
	}
	attach(e) {
		return this.updateWorldMatrix(!0, !1), tn.copy(this.matrixWorld).invert(), e.parent !== null && (e.parent.updateWorldMatrix(!0, !1), tn.multiply(e.parent.matrixWorld)), e.applyMatrix4(tn), e.removeFromParent(), e.parent = this, this.children.push(e), e.updateWorldMatrix(!1, !0), e.dispatchEvent(un), fn.child = e, this.dispatchEvent(fn), fn.child = null, this;
	}
	getObjectById(e) {
		return this.getObjectByProperty("id", e);
	}
	getObjectByName(e) {
		return this.getObjectByProperty("name", e);
	}
	getObjectByProperty(e, t) {
		if (this[e] === t) return this;
		for (let n = 0, r = this.children.length; n < r; n++) {
			let r = this.children[n].getObjectByProperty(e, t);
			if (r !== void 0) return r;
		}
	}
	getObjectsByProperty(e, t, n = []) {
		this[e] === t && n.push(this);
		let r = this.children;
		for (let i = 0, a = r.length; i < a; i++) r[i].getObjectsByProperty(e, t, n);
		return n;
	}
	getWorldPosition(e) {
		return this.updateWorldMatrix(!0, !1), e.setFromMatrixPosition(this.matrixWorld);
	}
	getWorldQuaternion(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(rn, e, an), e;
	}
	getWorldScale(e) {
		return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(rn, on, e), e;
	}
	getWorldDirection(e) {
		this.updateWorldMatrix(!0, !1);
		let t = this.matrixWorld.elements;
		return e.set(t[8], t[9], t[10]).normalize();
	}
	raycast() {}
	intersectsFrustum() {}
	traverse(e) {
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverse(e);
	}
	traverseVisible(e) {
		if (this.visible === !1) return;
		e(this);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].traverseVisible(e);
	}
	traverseAncestors(e) {
		let t = this.parent;
		t !== null && (e(t), t.traverseAncestors(e));
	}
	updateMatrix() {
		this.matrix.compose(this.position, this.quaternion, this.scale);
		let e = this.pivot;
		if (e !== null) {
			let t = e.x, n = e.y, r = e.z, i = this.matrix.elements;
			i[12] += t - i[0] * t - i[4] * n - i[8] * r, i[13] += n - i[1] * t - i[5] * n - i[9] * r, i[14] += r - i[2] * t - i[6] * n - i[10] * r;
		}
		this.matrixWorldNeedsUpdate = !0;
	}
	updateMatrixWorld(e) {
		this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || e) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, e = !0);
		let t = this.children;
		for (let n = 0, r = t.length; n < r; n++) t[n].updateMatrixWorld(e);
	}
	updateWorldMatrix(e, t, n = !1) {
		let r = this.parent;
		if (e === !0 && r !== null && r.updateWorldMatrix(!0, !1), this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || n) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, n = !0), t === !0) {
			let e = this.children;
			for (let t = 0, r = e.length; t < r; t++) e[t].updateWorldMatrix(!1, !0, n);
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string", n = {};
		t && (e = {
			geometries: {},
			materials: {},
			textures: {},
			images: {},
			shapes: {},
			skeletons: {},
			animations: {},
			nodes: {}
		}, n.metadata = {
			version: 4.7,
			type: "Object",
			generator: "Object3D.toJSON"
		});
		let r = {};
		r.uuid = this.uuid, r.type = this.type, r.name = this.name, r.castShadow = this.castShadow, r.receiveShadow = this.receiveShadow, r.visible = this.visible, r.frustumCulled = this.frustumCulled, r.renderOrder = this.renderOrder, r.static = this.static, r.matrixAutoUpdate = this.matrixAutoUpdate, Object.keys(this.userData).length > 0 && (r.userData = this.userData), r.layers = this.layers.mask, r.matrix = this.matrix.toArray(), r.up = this.up.toArray(), this.pivot !== null && (r.pivot = this.pivot.toArray()), this.morphTargetDictionary !== void 0 && (r.morphTargetDictionary = Object.assign({}, this.morphTargetDictionary)), this.morphTargetInfluences !== void 0 && (r.morphTargetInfluences = this.morphTargetInfluences.slice()), this.isInstancedMesh && (r.type = "InstancedMesh", r.count = this.count, r.instanceMatrix = this.instanceMatrix.toJSON(), this.instanceColor !== null && (r.instanceColor = this.instanceColor.toJSON())), this.isBatchedMesh && (r.type = "BatchedMesh", r.perObjectFrustumCulled = this.perObjectFrustumCulled, r.sortObjects = this.sortObjects, r.drawRanges = this._drawRanges, r.reservedRanges = this._reservedRanges, r.geometryInfo = this._geometryInfo.map((e) => ({
			...e,
			boundingBox: e.boundingBox ? e.boundingBox.toJSON() : void 0,
			boundingSphere: e.boundingSphere ? e.boundingSphere.toJSON() : void 0
		})), r.instanceInfo = this._instanceInfo.map((e) => ({ ...e })), r.availableInstanceIds = this._availableInstanceIds.slice(), r.availableGeometryIds = this._availableGeometryIds.slice(), r.nextIndexStart = this._nextIndexStart, r.nextVertexStart = this._nextVertexStart, r.geometryCount = this._geometryCount, r.maxInstanceCount = this._maxInstanceCount, r.maxVertexCount = this._maxVertexCount, r.maxIndexCount = this._maxIndexCount, r.geometryInitialized = this._geometryInitialized, r.matricesTexture = this._matricesTexture.toJSON(e), r.indirectTexture = this._indirectTexture.toJSON(e), this._colorsTexture !== null && (r.colorsTexture = this._colorsTexture.toJSON(e)), this.boundingSphere !== null && (r.boundingSphere = this.boundingSphere.toJSON()), this.boundingBox !== null && (r.boundingBox = this.boundingBox.toJSON()));
		function i(t, n) {
			return t[n.uuid] === void 0 && (t[n.uuid] = n.toJSON(e)), n.uuid;
		}
		if (this.isScene) this.background && (this.background.isColor ? r.background = this.background.toJSON() : this.background.isTexture && (r.background = this.background.toJSON(e).uuid)), this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== !0 && (r.environment = this.environment.toJSON(e).uuid);
		else if (this.isMesh || this.isLine || this.isPoints) {
			r.geometry = i(e.geometries, this.geometry);
			let t = this.geometry.parameters;
			if (t !== void 0 && t.shapes !== void 0) {
				let n = t.shapes;
				if (Array.isArray(n)) for (let t = 0, r = n.length; t < r; t++) {
					let r = n[t];
					i(e.shapes, r);
				}
				else i(e.shapes, n);
			}
		}
		if (this.isSkinnedMesh && (r.bindMode = this.bindMode, r.bindMatrix = this.bindMatrix.toArray(), this.skeleton !== void 0 && (i(e.skeletons, this.skeleton), r.skeleton = this.skeleton.uuid)), this.material !== void 0) {
			if (Array.isArray(this.material)) {
				let t = [];
				for (let n = 0, r = this.material.length; n < r; n++) t.push(i(e.materials, this.material[n]));
				r.material = t;
			} else r.material = i(e.materials, this.material);
		}
		if (this.children.length > 0) {
			r.children = [];
			for (let t = 0; t < this.children.length; t++) r.children.push(this.children[t].toJSON(e).object);
		}
		if (this.animations.length > 0) {
			r.animations = [];
			for (let t = 0; t < this.animations.length; t++) {
				let n = this.animations[t];
				r.animations.push(i(e.animations, n));
			}
		}
		if (t) {
			let t = a(e.geometries), r = a(e.materials), i = a(e.textures), o = a(e.images), s = a(e.shapes), c = a(e.skeletons), l = a(e.animations), u = a(e.nodes);
			t.length > 0 && (n.geometries = t), r.length > 0 && (n.materials = r), i.length > 0 && (n.textures = i), o.length > 0 && (n.images = o), s.length > 0 && (n.shapes = s), c.length > 0 && (n.skeletons = c), l.length > 0 && (n.animations = l), u.length > 0 && (n.nodes = u);
		}
		return n.object = r, n;
		function a(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
	}
	clone(e) {
		return new this.constructor().copy(this, e);
	}
	copy(e, t = !0) {
		if (this.name = e.name, this.up.copy(e.up), this.position.copy(e.position), this.rotation.order = e.rotation.order, this.quaternion.copy(e.quaternion), this.scale.copy(e.scale), this.pivot = e.pivot === null ? null : e.pivot.clone(), this.matrix.copy(e.matrix), this.matrixWorld.copy(e.matrixWorld), this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrixWorldAutoUpdate = e.matrixWorldAutoUpdate, this.matrixWorldNeedsUpdate = e.matrixWorldNeedsUpdate, this.layers.mask = e.layers.mask, this.visible = e.visible, this.castShadow = e.castShadow, this.receiveShadow = e.receiveShadow, this.frustumCulled = e.frustumCulled, this.renderOrder = e.renderOrder, this.static = e.static, this.animations = e.animations.slice(), this.userData = JSON.parse(JSON.stringify(e.userData)), t === !0) for (let t = 0; t < e.children.length; t++) {
			let n = e.children[t];
			this.add(n.clone());
		}
		return this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
};
mn.DEFAULT_UP = /*@__PURE__*/ new W(0, 1, 0), mn.DEFAULT_MATRIX_AUTO_UPDATE = !0, mn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0;
var hn = class extends mn {
	constructor() {
		super(), this.isGroup = !0, this.type = "Group";
	}
}, gn = { type: "move" }, _n = class {
	constructor() {
		this._targetRay = null, this._grip = null, this._hand = null;
	}
	getHandSpace() {
		return this._hand === null && (this._hand = new hn(), this._hand.matrixAutoUpdate = !1, this._hand.visible = !1, this._hand.joints = {}, this._hand.inputState = { pinching: !1 }), this._hand;
	}
	getTargetRaySpace() {
		return this._targetRay === null && (this._targetRay = new hn(), this._targetRay.matrixAutoUpdate = !1, this._targetRay.visible = !1, this._targetRay.hasLinearVelocity = !1, this._targetRay.linearVelocity = new W(), this._targetRay.hasAngularVelocity = !1, this._targetRay.angularVelocity = new W()), this._targetRay;
	}
	getGripSpace() {
		return this._grip === null && (this._grip = new hn(), this._grip.matrixAutoUpdate = !1, this._grip.visible = !1, this._grip.hasLinearVelocity = !1, this._grip.linearVelocity = new W(), this._grip.hasAngularVelocity = !1, this._grip.angularVelocity = new W(), this._grip.eventsEnabled = !1), this._grip;
	}
	dispatchEvent(e) {
		return this._targetRay !== null && this._targetRay.dispatchEvent(e), this._grip !== null && this._grip.dispatchEvent(e), this._hand !== null && this._hand.dispatchEvent(e), this;
	}
	connect(e) {
		if (e && e.hand) {
			let t = this._hand;
			if (t) for (let n of e.hand.values()) this._getHandJoint(t, n);
		}
		return this.dispatchEvent({
			type: "connected",
			data: e
		}), this;
	}
	disconnect(e) {
		return this.dispatchEvent({
			type: "disconnected",
			data: e
		}), this._targetRay !== null && (this._targetRay.visible = !1), this._grip !== null && (this._grip.visible = !1), this._hand !== null && (this._hand.visible = !1), this;
	}
	update(e, t, n) {
		let r = null, i = null, a = null, o = this._targetRay, s = this._grip, c = this._hand;
		if (e && t.session.visibilityState !== "visible-blurred") {
			if (c && e.hand) {
				a = !0;
				for (let r of e.hand.values()) {
					let e = t.getJointPose(r, n), i = this._getHandJoint(c, r);
					e !== null && (i.matrix.fromArray(e.transform.matrix), i.matrix.decompose(i.position, i.rotation, i.scale), i.matrixWorldNeedsUpdate = !0, i.jointRadius = e.radius), i.visible = e !== null;
				}
				let r = c.joints["index-finger-tip"], i = c.joints["thumb-tip"], o = r.position.distanceTo(i.position);
				c.inputState.pinching && o > .025 ? (c.inputState.pinching = !1, this.dispatchEvent({
					type: "pinchend",
					handedness: e.handedness,
					target: this
				})) : !c.inputState.pinching && o <= .015 && (c.inputState.pinching = !0, this.dispatchEvent({
					type: "pinchstart",
					handedness: e.handedness,
					target: this
				}));
			} else s !== null && e.gripSpace && (i = t.getPose(e.gripSpace, n), i !== null && (s.matrix.fromArray(i.transform.matrix), s.matrix.decompose(s.position, s.rotation, s.scale), s.matrixWorldNeedsUpdate = !0, i.linearVelocity ? (s.hasLinearVelocity = !0, s.linearVelocity.copy(i.linearVelocity)) : s.hasLinearVelocity = !1, i.angularVelocity ? (s.hasAngularVelocity = !0, s.angularVelocity.copy(i.angularVelocity)) : s.hasAngularVelocity = !1, s.eventsEnabled && s.dispatchEvent({
				type: "gripUpdated",
				data: e,
				target: this
			})));
			o !== null && (r = t.getPose(e.targetRaySpace, n), r === null && i !== null && (r = i), r !== null && (o.matrix.fromArray(r.transform.matrix), o.matrix.decompose(o.position, o.rotation, o.scale), o.matrixWorldNeedsUpdate = !0, r.linearVelocity ? (o.hasLinearVelocity = !0, o.linearVelocity.copy(r.linearVelocity)) : o.hasLinearVelocity = !1, r.angularVelocity ? (o.hasAngularVelocity = !0, o.angularVelocity.copy(r.angularVelocity)) : o.hasAngularVelocity = !1, this.dispatchEvent(gn)));
		}
		return o !== null && (o.visible = r !== null), s !== null && (s.visible = i !== null), c !== null && (c.visible = a !== null), this;
	}
	_getHandJoint(e, t) {
		if (e.joints[t.jointName] === void 0) {
			let n = new hn();
			n.matrixAutoUpdate = !1, n.visible = !1, e.joints[t.jointName] = n, e.add(n);
		}
		return e.joints[t.jointName];
	}
}, vn = {
	aliceblue: 15792383,
	antiquewhite: 16444375,
	aqua: 65535,
	aquamarine: 8388564,
	azure: 15794175,
	beige: 16119260,
	bisque: 16770244,
	black: 0,
	blanchedalmond: 16772045,
	blue: 255,
	blueviolet: 9055202,
	brown: 10824234,
	burlywood: 14596231,
	cadetblue: 6266528,
	chartreuse: 8388352,
	chocolate: 13789470,
	coral: 16744272,
	cornflowerblue: 6591981,
	cornsilk: 16775388,
	crimson: 14423100,
	cyan: 65535,
	darkblue: 139,
	darkcyan: 35723,
	darkgoldenrod: 12092939,
	darkgray: 11119017,
	darkgreen: 25600,
	darkgrey: 11119017,
	darkkhaki: 12433259,
	darkmagenta: 9109643,
	darkolivegreen: 5597999,
	darkorange: 16747520,
	darkorchid: 10040012,
	darkred: 9109504,
	darksalmon: 15308410,
	darkseagreen: 9419919,
	darkslateblue: 4734347,
	darkslategray: 3100495,
	darkslategrey: 3100495,
	darkturquoise: 52945,
	darkviolet: 9699539,
	deeppink: 16716947,
	deepskyblue: 49151,
	dimgray: 6908265,
	dimgrey: 6908265,
	dodgerblue: 2003199,
	firebrick: 11674146,
	floralwhite: 16775920,
	forestgreen: 2263842,
	fuchsia: 16711935,
	gainsboro: 14474460,
	ghostwhite: 16316671,
	gold: 16766720,
	goldenrod: 14329120,
	gray: 8421504,
	green: 32768,
	greenyellow: 11403055,
	grey: 8421504,
	honeydew: 15794160,
	hotpink: 16738740,
	indianred: 13458524,
	indigo: 4915330,
	ivory: 16777200,
	khaki: 15787660,
	lavender: 15132410,
	lavenderblush: 16773365,
	lawngreen: 8190976,
	lemonchiffon: 16775885,
	lightblue: 11393254,
	lightcoral: 15761536,
	lightcyan: 14745599,
	lightgoldenrodyellow: 16448210,
	lightgray: 13882323,
	lightgreen: 9498256,
	lightgrey: 13882323,
	lightpink: 16758465,
	lightsalmon: 16752762,
	lightseagreen: 2142890,
	lightskyblue: 8900346,
	lightslategray: 7833753,
	lightslategrey: 7833753,
	lightsteelblue: 11584734,
	lightyellow: 16777184,
	lime: 65280,
	limegreen: 3329330,
	linen: 16445670,
	magenta: 16711935,
	maroon: 8388608,
	mediumaquamarine: 6737322,
	mediumblue: 205,
	mediumorchid: 12211667,
	mediumpurple: 9662683,
	mediumseagreen: 3978097,
	mediumslateblue: 8087790,
	mediumspringgreen: 64154,
	mediumturquoise: 4772300,
	mediumvioletred: 13047173,
	midnightblue: 1644912,
	mintcream: 16121850,
	mistyrose: 16770273,
	moccasin: 16770229,
	navajowhite: 16768685,
	navy: 128,
	oldlace: 16643558,
	olive: 8421376,
	olivedrab: 7048739,
	orange: 16753920,
	orangered: 16729344,
	orchid: 14315734,
	palegoldenrod: 15657130,
	palegreen: 10025880,
	paleturquoise: 11529966,
	palevioletred: 14381203,
	papayawhip: 16773077,
	peachpuff: 16767673,
	peru: 13468991,
	pink: 16761035,
	plum: 14524637,
	powderblue: 11591910,
	purple: 8388736,
	rebeccapurple: 6697881,
	red: 16711680,
	rosybrown: 12357519,
	royalblue: 4286945,
	saddlebrown: 9127187,
	salmon: 16416882,
	sandybrown: 16032864,
	seagreen: 3050327,
	seashell: 16774638,
	sienna: 10506797,
	silver: 12632256,
	skyblue: 8900331,
	slateblue: 6970061,
	slategray: 7372944,
	slategrey: 7372944,
	snow: 16775930,
	springgreen: 65407,
	steelblue: 4620980,
	tan: 13808780,
	teal: 32896,
	thistle: 14204888,
	tomato: 16737095,
	turquoise: 4251856,
	violet: 15631086,
	wheat: 16113331,
	white: 16777215,
	whitesmoke: 16119285,
	yellow: 16776960,
	yellowgreen: 10145074
}, yn = {
	h: 0,
	s: 0,
	l: 0
}, bn = {
	h: 0,
	s: 0,
	l: 0
};
function xn(e, t, n) {
	return n < 0 && (n += 1), n > 1 && --n, n < 1 / 6 ? e + (t - e) * 6 * n : n < 1 / 2 ? t : n < 2 / 3 ? e + (t - e) * 6 * (2 / 3 - n) : e;
}
var J = class {
	constructor(e, t, n) {
		return this.isColor = !0, this.r = 1, this.g = 1, this.b = 1, this.set(e, t, n);
	}
	set(e, t, n) {
		if (t === void 0 && n === void 0) {
			let t = e;
			t && t.isColor ? this.copy(t) : typeof t == "number" ? this.setHex(t) : typeof t == "string" && this.setStyle(t);
		} else this.setRGB(e, t, n);
		return this;
	}
	setScalar(e) {
		return this.r = e, this.g = e, this.b = e, this;
	}
	setHex(e, t = qe) {
		return e = Math.floor(e), this.r = (e >> 16 & 255) / 255, this.g = (e >> 8 & 255) / 255, this.b = (e & 255) / 255, K.colorSpaceToWorking(this, t), this;
	}
	setRGB(e, t, n, r = K.workingColorSpace) {
		return this.r = e, this.g = t, this.b = n, K.colorSpaceToWorking(this, r), this;
	}
	setHSL(e, t, n, r = K.workingColorSpace) {
		if (e = gt(e, 1), t = ht(t, 0, 1), n = ht(n, 0, 1), t === 0) this.r = this.g = this.b = n;
		else {
			let r = n <= .5 ? n * (1 + t) : n + t - n * t, i = 2 * n - r;
			this.r = xn(i, r, e + 1 / 3), this.g = xn(i, r, e), this.b = xn(i, r, e - 1 / 3);
		}
		return K.colorSpaceToWorking(this, r), this;
	}
	setStyle(e, t = qe) {
		function n(t) {
			t !== void 0 && parseFloat(t) < 1 && B("Color: Alpha component of " + e + " will be ignored.");
		}
		let r;
		if (r = /^(\w+)\(([^\)]*)\)/.exec(e)) {
			let i, a = r[1], o = r[2];
			switch (a) {
				case "rgb":
				case "rgba":
					if (i = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(255, parseInt(i[1], 10)) / 255, Math.min(255, parseInt(i[2], 10)) / 255, Math.min(255, parseInt(i[3], 10)) / 255, t);
					if (i = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setRGB(Math.min(100, parseInt(i[1], 10)) / 100, Math.min(100, parseInt(i[2], 10)) / 100, Math.min(100, parseInt(i[3], 10)) / 100, t);
					break;
				case "hsl":
				case "hsla":
					if (i = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o)) return n(i[4]), this.setHSL(parseFloat(i[1]) / 360, parseFloat(i[2]) / 100, parseFloat(i[3]) / 100, t);
					break;
				default: B("Color: Unknown color model " + e);
			}
		} else if (r = /^\#([A-Fa-f\d]+)$/.exec(e)) {
			let n = r[1], i = n.length;
			if (i === 3) return this.setRGB(parseInt(n.charAt(0), 16) / 15, parseInt(n.charAt(1), 16) / 15, parseInt(n.charAt(2), 16) / 15, t);
			if (i === 6) return this.setHex(parseInt(n, 16), t);
			B("Color: Invalid hex color " + e);
		} else if (e && e.length > 0) return this.setColorName(e, t);
		return this;
	}
	setColorName(e, t = qe) {
		let n = vn[e.toLowerCase()];
		return n === void 0 ? B("Color: Unknown color " + e) : this.setHex(n, t), this;
	}
	clone() {
		return new this.constructor(this.r, this.g, this.b);
	}
	copy(e) {
		return this.r = e.r, this.g = e.g, this.b = e.b, this;
	}
	copySRGBToLinear(e) {
		return this.r = Et(e.r), this.g = Et(e.g), this.b = Et(e.b), this;
	}
	copyLinearToSRGB(e) {
		return this.r = Dt(e.r), this.g = Dt(e.g), this.b = Dt(e.b), this;
	}
	convertSRGBToLinear() {
		return this.copySRGBToLinear(this), this;
	}
	convertLinearToSRGB() {
		return this.copyLinearToSRGB(this), this;
	}
	getHex(e = qe) {
		return K.workingToColorSpace(Sn.copy(this), e), Math.round(ht(Sn.r * 255, 0, 255)) * 65536 + Math.round(ht(Sn.g * 255, 0, 255)) * 256 + Math.round(ht(Sn.b * 255, 0, 255));
	}
	getHexString(e = qe) {
		return ("000000" + this.getHex(e).toString(16)).slice(-6);
	}
	getHSL(e, t = K.workingColorSpace) {
		K.workingToColorSpace(Sn.copy(this), t);
		let n = Sn.r, r = Sn.g, i = Sn.b, a = Math.max(n, r, i), o = Math.min(n, r, i), s, c, l = (o + a) / 2;
		if (o === a) s = 0, c = 0;
		else {
			let e = a - o;
			switch (c = l <= .5 ? e / (a + o) : e / (2 - a - o), a) {
				case n:
					s = (r - i) / e + (r < i ? 6 : 0);
					break;
				case r:
					s = (i - n) / e + 2;
					break;
				case i: s = (n - r) / e + 4;
			}
			s /= 6;
		}
		return e.h = s, e.s = c, e.l = l, e;
	}
	getRGB(e, t = K.workingColorSpace) {
		return K.workingToColorSpace(Sn.copy(this), t), e.r = Sn.r, e.g = Sn.g, e.b = Sn.b, e;
	}
	getStyle(e = qe) {
		K.workingToColorSpace(Sn.copy(this), e);
		let t = Sn.r, n = Sn.g, r = Sn.b;
		return e === "srgb" ? `rgb(${Math.round(t * 255)},${Math.round(n * 255)},${Math.round(r * 255)})` : `color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`;
	}
	offsetHSL(e, t, n) {
		return this.getHSL(yn), this.setHSL(yn.h + e, yn.s + t, yn.l + n);
	}
	add(e) {
		return this.r += e.r, this.g += e.g, this.b += e.b, this;
	}
	addColors(e, t) {
		return this.r = e.r + t.r, this.g = e.g + t.g, this.b = e.b + t.b, this;
	}
	addScalar(e) {
		return this.r += e, this.g += e, this.b += e, this;
	}
	sub(e) {
		return this.r = Math.max(0, this.r - e.r), this.g = Math.max(0, this.g - e.g), this.b = Math.max(0, this.b - e.b), this;
	}
	multiply(e) {
		return this.r *= e.r, this.g *= e.g, this.b *= e.b, this;
	}
	multiplyScalar(e) {
		return this.r *= e, this.g *= e, this.b *= e, this;
	}
	lerp(e, t) {
		return this.r += (e.r - this.r) * t, this.g += (e.g - this.g) * t, this.b += (e.b - this.b) * t, this;
	}
	lerpColors(e, t, n) {
		return this.r = e.r + (t.r - e.r) * n, this.g = e.g + (t.g - e.g) * n, this.b = e.b + (t.b - e.b) * n, this;
	}
	lerpHSL(e, t) {
		this.getHSL(yn), e.getHSL(bn);
		let n = _t(yn.h, bn.h, t), r = _t(yn.s, bn.s, t), i = _t(yn.l, bn.l, t);
		return this.setHSL(n, r, i), this;
	}
	setFromVector3(e) {
		return this.r = e.x, this.g = e.y, this.b = e.z, this;
	}
	applyMatrix3(e) {
		let t = this.r, n = this.g, r = this.b, i = e.elements;
		return this.r = i[0] * t + i[3] * n + i[6] * r, this.g = i[1] * t + i[4] * n + i[7] * r, this.b = i[2] * t + i[5] * n + i[8] * r, this;
	}
	equals(e) {
		return e.r === this.r && e.g === this.g && e.b === this.b;
	}
	fromArray(e, t = 0) {
		return this.r = e[t], this.g = e[t + 1], this.b = e[t + 2], this;
	}
	toArray(e = [], t = 0) {
		return e[t] = this.r, e[t + 1] = this.g, e[t + 2] = this.b, e;
	}
	fromBufferAttribute(e, t) {
		return this.r = e.getX(t), this.g = e.getY(t), this.b = e.getZ(t), this;
	}
	toJSON() {
		return this.getHex();
	}
	*[Symbol.iterator]() {
		yield this.r, yield this.g, yield this.b;
	}
}, Sn = /*@__PURE__*/ new J();
J.NAMES = vn;
var Cn = class extends mn {
	constructor() {
		super(), this.isScene = !0, this.type = "Scene", this.background = null, this.environment = null, this.fog = null, this.backgroundBlurriness = 0, this.backgroundIntensity = 1, this.backgroundRotation = new Xt(), this.environmentIntensity = 1, this.environmentRotation = new Xt(), this.overrideMaterial = null, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	copy(e, t) {
		return super.copy(e, t), e.background !== null && (this.background = e.background.clone()), e.environment !== null && (this.environment = e.environment.clone()), e.fog !== null && (this.fog = e.fog.clone()), this.backgroundBlurriness = e.backgroundBlurriness, this.backgroundIntensity = e.backgroundIntensity, this.backgroundRotation.copy(e.backgroundRotation), this.environmentIntensity = e.environmentIntensity, this.environmentRotation.copy(e.environmentRotation), e.overrideMaterial !== null && (this.overrideMaterial = e.overrideMaterial.clone()), this.matrixAutoUpdate = e.matrixAutoUpdate, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return this.fog !== null && (t.object.fog = this.fog.toJSON()), t.object.backgroundBlurriness = this.backgroundBlurriness, t.object.backgroundIntensity = this.backgroundIntensity, t.object.backgroundRotation = this.backgroundRotation.toArray(), t.object.environmentIntensity = this.environmentIntensity, t.object.environmentRotation = this.environmentRotation.toArray(), t;
	}
}, wn = /*@__PURE__*/ new W(), Tn = /*@__PURE__*/ new W(), En = /*@__PURE__*/ new W(), Dn = /*@__PURE__*/ new W(), On = /*@__PURE__*/ new W(), kn = /*@__PURE__*/ new W(), An = /*@__PURE__*/ new W(), jn = /*@__PURE__*/ new W(), Mn = /*@__PURE__*/ new W(), Nn = /*@__PURE__*/ new W(), Pn = /*@__PURE__*/ new It(), Fn = /*@__PURE__*/ new It(), In = /*@__PURE__*/ new It(), Ln = class e {
	constructor(e = new W(), t = new W(), n = new W()) {
		this.a = e, this.b = t, this.c = n;
	}
	static getNormal(e, t, n, r) {
		r.subVectors(n, t), wn.subVectors(e, t), r.cross(wn);
		let i = r.lengthSq();
		return i > 0 ? r.multiplyScalar(1 / Math.sqrt(i)) : r.set(0, 0, 0);
	}
	static getBarycoord(e, t, n, r, i) {
		wn.subVectors(r, t), Tn.subVectors(n, t), En.subVectors(e, t);
		let a = wn.dot(wn), o = wn.dot(Tn), s = wn.dot(En), c = Tn.dot(Tn), l = Tn.dot(En), u = a * c - o * o;
		if (u === 0) return i.set(0, 0, 0), null;
		let d = 1 / u, f = (c * s - o * l) * d, p = (a * l - o * s) * d;
		return i.set(1 - f - p, p, f);
	}
	static containsPoint(e, t, n, r) {
		return this.getBarycoord(e, t, n, r, Dn) !== null && Dn.x >= 0 && Dn.y >= 0 && Dn.x + Dn.y <= 1;
	}
	static getInterpolation(e, t, n, r, i, a, o, s) {
		return this.getBarycoord(e, t, n, r, Dn) === null ? (s.x = 0, s.y = 0, "z" in s && (s.z = 0), "w" in s && (s.w = 0), null) : (s.setScalar(0), s.addScaledVector(i, Dn.x), s.addScaledVector(a, Dn.y), s.addScaledVector(o, Dn.z), s);
	}
	static getInterpolatedAttribute(e, t, n, r, i, a) {
		return Pn.setScalar(0), Fn.setScalar(0), In.setScalar(0), Pn.fromBufferAttribute(e, t), Fn.fromBufferAttribute(e, n), In.fromBufferAttribute(e, r), a.setScalar(0), a.addScaledVector(Pn, i.x), a.addScaledVector(Fn, i.y), a.addScaledVector(In, i.z), a;
	}
	static isFrontFacing(e, t, n, r) {
		return wn.subVectors(n, t), Tn.subVectors(e, t), wn.cross(Tn).dot(r) < 0;
	}
	set(e, t, n) {
		return this.a.copy(e), this.b.copy(t), this.c.copy(n), this;
	}
	setFromPointsAndIndices(e, t, n, r) {
		return this.a.copy(e[t]), this.b.copy(e[n]), this.c.copy(e[r]), this;
	}
	setFromAttributeAndIndices(e, t, n, r) {
		return this.a.fromBufferAttribute(e, t), this.b.fromBufferAttribute(e, n), this.c.fromBufferAttribute(e, r), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.a.copy(e.a), this.b.copy(e.b), this.c.copy(e.c), this;
	}
	getArea() {
		return wn.subVectors(this.c, this.b), Tn.subVectors(this.a, this.b), wn.cross(Tn).length() * .5;
	}
	getMidpoint(e) {
		return e.addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
	}
	getNormal(t) {
		return e.getNormal(this.a, this.b, this.c, t);
	}
	getPlane(e) {
		return e.setFromCoplanarPoints(this.a, this.b, this.c);
	}
	getBarycoord(t, n) {
		return e.getBarycoord(t, this.a, this.b, this.c, n);
	}
	getInterpolation(t, n, r, i, a) {
		return e.getInterpolation(t, this.a, this.b, this.c, n, r, i, a);
	}
	containsPoint(t) {
		return e.containsPoint(t, this.a, this.b, this.c);
	}
	isFrontFacing(t) {
		return e.isFrontFacing(this.a, this.b, this.c, t);
	}
	intersectsBox(e) {
		return e.intersectsTriangle(this);
	}
	closestPointToPoint(e, t) {
		let n = this.a, r = this.b, i = this.c, a, o;
		On.subVectors(r, n), kn.subVectors(i, n), jn.subVectors(e, n);
		let s = On.dot(jn), c = kn.dot(jn);
		if (s <= 0 && c <= 0) return t.copy(n);
		Mn.subVectors(e, r);
		let l = On.dot(Mn), u = kn.dot(Mn);
		if (l >= 0 && u <= l) return t.copy(r);
		let d = s * u - l * c;
		if (d <= 0 && s >= 0 && l <= 0) return a = s / (s - l), t.copy(n).addScaledVector(On, a);
		Nn.subVectors(e, i);
		let f = On.dot(Nn), p = kn.dot(Nn);
		if (p >= 0 && f <= p) return t.copy(i);
		let m = f * c - s * p;
		if (m <= 0 && c >= 0 && p <= 0) return o = c / (c - p), t.copy(n).addScaledVector(kn, o);
		let h = l * p - f * u;
		if (h <= 0 && u - l >= 0 && f - p >= 0) return An.subVectors(i, r), o = (u - l) / (u - l + (f - p)), t.copy(r).addScaledVector(An, o);
		let g = 1 / (h + m + d);
		return a = m * g, o = d * g, t.copy(n).addScaledVector(On, a).addScaledVector(kn, o);
	}
	equals(e) {
		return e.a.equals(this.a) && e.b.equals(this.b) && e.c.equals(this.c);
	}
}, Rn = class {
	constructor(e = new W(Infinity, Infinity, Infinity), t = new W(-Infinity, -Infinity, -Infinity)) {
		this.isBox3 = !0, this.min = e, this.max = t;
	}
	set(e, t) {
		return this.min.copy(e), this.max.copy(t), this;
	}
	setFromArray(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t += 3) this.expandByPoint(Bn.fromArray(e, t));
		return this;
	}
	setFromBufferAttribute(e) {
		this.makeEmpty();
		for (let t = 0, n = e.count; t < n; t++) this.expandByPoint(Bn.fromBufferAttribute(e, t));
		return this;
	}
	setFromPoints(e) {
		this.makeEmpty();
		for (let t = 0, n = e.length; t < n; t++) this.expandByPoint(e[t]);
		return this;
	}
	setFromCenterAndSize(e, t) {
		let n = Bn.copy(t).multiplyScalar(.5);
		return this.min.copy(e).sub(n), this.max.copy(e).add(n), this;
	}
	setFromObject(e, t = !1) {
		return this.makeEmpty(), this.expandByObject(e, t);
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		return this.min.copy(e.min), this.max.copy(e.max), this;
	}
	makeEmpty() {
		return this.min.x = this.min.y = this.min.z = Infinity, this.max.x = this.max.y = this.max.z = -Infinity, this;
	}
	isEmpty() {
		return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
	}
	getCenter(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.addVectors(this.min, this.max).multiplyScalar(.5);
	}
	getSize(e) {
		return this.isEmpty() ? e.set(0, 0, 0) : e.subVectors(this.max, this.min);
	}
	expandByPoint(e) {
		return this.min.min(e), this.max.max(e), this;
	}
	expandByVector(e) {
		return this.min.sub(e), this.max.add(e), this;
	}
	expandByScalar(e) {
		return this.min.addScalar(-e), this.max.addScalar(e), this;
	}
	expandByObject(e, t = !1) {
		e.updateWorldMatrix(!1, !1);
		let n = e.geometry;
		if (n !== void 0) {
			let r = n.getAttribute("position");
			if (t === !0 && r !== void 0 && e.isInstancedMesh !== !0) for (let t = 0, n = r.count; t < n; t++) e.isMesh === !0 ? e.getVertexPosition(t, Bn) : Bn.fromBufferAttribute(r, t), Bn.applyMatrix4(e.matrixWorld), this.expandByPoint(Bn);
			else e.boundingBox === void 0 ? (n.boundingBox === null && n.computeBoundingBox(), Vn.copy(n.boundingBox)) : (e.boundingBox === null && e.computeBoundingBox(), Vn.copy(e.boundingBox)), Vn.applyMatrix4(e.matrixWorld), this.union(Vn);
		}
		let r = e.children;
		for (let e = 0, n = r.length; e < n; e++) this.expandByObject(r[e], t);
		return this;
	}
	containsPoint(e) {
		return e.x >= this.min.x && e.x <= this.max.x && e.y >= this.min.y && e.y <= this.max.y && e.z >= this.min.z && e.z <= this.max.z;
	}
	containsBox(e) {
		return this.min.x <= e.min.x && e.max.x <= this.max.x && this.min.y <= e.min.y && e.max.y <= this.max.y && this.min.z <= e.min.z && e.max.z <= this.max.z;
	}
	getParameter(e, t) {
		return t.set((e.x - this.min.x) / (this.max.x - this.min.x), (e.y - this.min.y) / (this.max.y - this.min.y), (e.z - this.min.z) / (this.max.z - this.min.z));
	}
	intersectsBox(e) {
		return e.max.x >= this.min.x && e.min.x <= this.max.x && e.max.y >= this.min.y && e.min.y <= this.max.y && e.max.z >= this.min.z && e.min.z <= this.max.z;
	}
	intersectsSphere(e) {
		return this.clampPoint(e.center, Bn), Bn.distanceToSquared(e.center) <= e.radius * e.radius;
	}
	intersectsPlane(e) {
		let t, n;
		return e.normal.x > 0 ? (t = e.normal.x * this.min.x, n = e.normal.x * this.max.x) : (t = e.normal.x * this.max.x, n = e.normal.x * this.min.x), e.normal.y > 0 ? (t += e.normal.y * this.min.y, n += e.normal.y * this.max.y) : (t += e.normal.y * this.max.y, n += e.normal.y * this.min.y), e.normal.z > 0 ? (t += e.normal.z * this.min.z, n += e.normal.z * this.max.z) : (t += e.normal.z * this.max.z, n += e.normal.z * this.min.z), t <= -e.constant && n >= -e.constant;
	}
	intersectsTriangle(e) {
		if (this.isEmpty()) return !1;
		this.getCenter(Jn), Yn.subVectors(this.max, Jn), Hn.subVectors(e.a, Jn), Un.subVectors(e.b, Jn), Wn.subVectors(e.c, Jn), Gn.subVectors(Un, Hn), Kn.subVectors(Wn, Un), qn.subVectors(Hn, Wn);
		let t = [
			0,
			-Gn.z,
			Gn.y,
			0,
			-Kn.z,
			Kn.y,
			0,
			-qn.z,
			qn.y,
			Gn.z,
			0,
			-Gn.x,
			Kn.z,
			0,
			-Kn.x,
			qn.z,
			0,
			-qn.x,
			-Gn.y,
			Gn.x,
			0,
			-Kn.y,
			Kn.x,
			0,
			-qn.y,
			qn.x,
			0
		];
		return !Qn(t, Hn, Un, Wn, Yn) || (t = [
			1,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			1
		], !Qn(t, Hn, Un, Wn, Yn)) ? !1 : (Xn.crossVectors(Gn, Kn), t = [
			Xn.x,
			Xn.y,
			Xn.z
		], Qn(t, Hn, Un, Wn, Yn));
	}
	clampPoint(e, t) {
		return t.copy(e).clamp(this.min, this.max);
	}
	distanceToPoint(e) {
		return this.clampPoint(e, Bn).distanceTo(e);
	}
	getBoundingSphere(e) {
		return this.isEmpty() ? e.makeEmpty() : (this.getCenter(e.center), e.radius = this.getSize(Bn).length() * .5), e;
	}
	intersect(e) {
		return this.min.max(e.min), this.max.min(e.max), this.isEmpty() && this.makeEmpty(), this;
	}
	union(e) {
		return this.min.min(e.min), this.max.max(e.max), this;
	}
	applyMatrix4(e) {
		return this.isEmpty() || (zn[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(e), zn[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(e), zn[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(e), zn[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(e), zn[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(e), zn[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(e), zn[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(e), zn[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(e), this.setFromPoints(zn)), this;
	}
	translate(e) {
		return this.min.add(e), this.max.add(e), this;
	}
	equals(e) {
		return e.min.equals(this.min) && e.max.equals(this.max);
	}
	toJSON() {
		return {
			min: this.min.toArray(),
			max: this.max.toArray()
		};
	}
	fromJSON(e) {
		return this.min.fromArray(e.min), this.max.fromArray(e.max), this;
	}
}, zn = [
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W(),
	/*@__PURE__*/ new W()
], Bn = /*@__PURE__*/ new W(), Vn = /*@__PURE__*/ new Rn(), Hn = /*@__PURE__*/ new W(), Un = /*@__PURE__*/ new W(), Wn = /*@__PURE__*/ new W(), Gn = /*@__PURE__*/ new W(), Kn = /*@__PURE__*/ new W(), qn = /*@__PURE__*/ new W(), Jn = /*@__PURE__*/ new W(), Yn = /*@__PURE__*/ new W(), Xn = /*@__PURE__*/ new W(), Zn = /*@__PURE__*/ new W();
function Qn(e, t, n, r, i) {
	for (let a = 0, o = e.length - 3; a <= o; a += 3) {
		Zn.fromArray(e, a);
		let o = i.x * Math.abs(Zn.x) + i.y * Math.abs(Zn.y) + i.z * Math.abs(Zn.z), s = t.dot(Zn), c = n.dot(Zn), l = r.dot(Zn);
		if (Math.max(-Math.max(s, c, l), Math.min(s, c, l)) > o) return !1;
	}
	return !0;
}
var $n = /*@__PURE__*/ new W(), er = /*@__PURE__*/ new U(), tr = 0, nr = class extends ut {
	constructor(e, t, n = !1) {
		if (super(), Array.isArray(e)) throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");
		this.isBufferAttribute = !0, Object.defineProperty(this, "id", { value: tr++ }), this.name = "", this.array = e, this.itemSize = t, this.count = e === void 0 ? 0 : e.length / t, this.normalized = n, this.usage = Qe, this.updateRanges = [], this.gpuType = E, this.version = 0;
	}
	onUploadCallback() {}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	setUsage(e) {
		return this.usage = e, this;
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	copy(e) {
		return this.name = e.name, this.array = new e.array.constructor(e.array), this.itemSize = e.itemSize, this.count = e.count, this.normalized = e.normalized, this.usage = e.usage, this.gpuType = e.gpuType, this;
	}
	copyAt(e, t, n) {
		e *= this.itemSize, n *= t.itemSize;
		for (let r = 0, i = this.itemSize; r < i; r++) this.array[e + r] = t.array[n + r];
		return this;
	}
	copyArray(e) {
		return this.array.set(e), this;
	}
	applyMatrix3(e) {
		if (this.itemSize === 2) for (let t = 0, n = this.count; t < n; t++) er.fromBufferAttribute(this, t), er.applyMatrix3(e), this.setXY(t, er.x, er.y);
		else if (this.itemSize === 3) for (let t = 0, n = this.count; t < n; t++) $n.fromBufferAttribute(this, t), $n.applyMatrix3(e), this.setXYZ(t, $n.x, $n.y, $n.z);
		return this;
	}
	applyMatrix4(e) {
		for (let t = 0, n = this.count; t < n; t++) $n.fromBufferAttribute(this, t), $n.applyMatrix4(e), this.setXYZ(t, $n.x, $n.y, $n.z);
		return this;
	}
	applyNormalMatrix(e) {
		for (let t = 0, n = this.count; t < n; t++) $n.fromBufferAttribute(this, t), $n.applyNormalMatrix(e), this.setXYZ(t, $n.x, $n.y, $n.z);
		return this;
	}
	transformDirection(e) {
		for (let t = 0, n = this.count; t < n; t++) $n.fromBufferAttribute(this, t), $n.transformDirection(e), this.setXYZ(t, $n.x, $n.y, $n.z);
		return this;
	}
	set(e, t = 0) {
		return this.array.set(e, t), this;
	}
	getComponent(e, t) {
		let n = this.array[e * this.itemSize + t];
		return this.normalized && (n = vt(n, this.array)), n;
	}
	setComponent(e, t, n) {
		return this.normalized && (n = H(n, this.array)), this.array[e * this.itemSize + t] = n, this;
	}
	getX(e) {
		let t = this.array[e * this.itemSize];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	setX(e, t) {
		return this.normalized && (t = H(t, this.array)), this.array[e * this.itemSize] = t, this;
	}
	getY(e) {
		let t = this.array[e * this.itemSize + 1];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	setY(e, t) {
		return this.normalized && (t = H(t, this.array)), this.array[e * this.itemSize + 1] = t, this;
	}
	getZ(e) {
		let t = this.array[e * this.itemSize + 2];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	setZ(e, t) {
		return this.normalized && (t = H(t, this.array)), this.array[e * this.itemSize + 2] = t, this;
	}
	getW(e) {
		let t = this.array[e * this.itemSize + 3];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	setW(e, t) {
		return this.normalized && (t = H(t, this.array)), this.array[e * this.itemSize + 3] = t, this;
	}
	setXY(e, t, n) {
		return e *= this.itemSize, this.normalized && (t = H(t, this.array), n = H(n, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this;
	}
	setXYZ(e, t, n, r) {
		return e *= this.itemSize, this.normalized && (t = H(t, this.array), n = H(n, this.array), r = H(r, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this;
	}
	setXYZW(e, t, n, r, i) {
		return e *= this.itemSize, this.normalized && (t = H(t, this.array), n = H(n, this.array), r = H(r, this.array), i = H(i, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = r, this.array[e + 3] = i, this;
	}
	onUpload(e) {
		return this.onUploadCallback = e, this;
	}
	clone() {
		return new this.constructor(this.array, this.itemSize).copy(this);
	}
	toJSON() {
		let e = {
			itemSize: this.itemSize,
			type: this.array.constructor.name,
			array: Array.from(this.array),
			normalized: this.normalized
		};
		return e.name = this.name, e.usage = this.usage, e.gpuType = this.gpuType, e;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, rr = class extends nr {
	constructor(e, t, n) {
		super(new Uint16Array(e), t, n);
	}
}, ir = class extends nr {
	constructor(e, t, n) {
		super(new Uint32Array(e), t, n);
	}
}, ar = class extends nr {
	constructor(e, t, n) {
		super(new Float32Array(e), t, n);
	}
}, or = /*@__PURE__*/ new Rn(), sr = /*@__PURE__*/ new W(), cr = /*@__PURE__*/ new W(), lr = class {
	constructor(e = new W(), t = -1) {
		this.isSphere = !0, this.center = e, this.radius = t;
	}
	set(e, t) {
		return this.center.copy(e), this.radius = t, this;
	}
	setFromPoints(e, t) {
		let n = this.center;
		t === void 0 ? or.setFromPoints(e).getCenter(n) : n.copy(t);
		let r = 0;
		for (let t = 0, i = e.length; t < i; t++) r = Math.max(r, n.distanceToSquared(e[t]));
		return this.radius = Math.sqrt(r), this;
	}
	copy(e) {
		return this.center.copy(e.center), this.radius = e.radius, this;
	}
	isEmpty() {
		return this.radius < 0;
	}
	makeEmpty() {
		return this.center.set(0, 0, 0), this.radius = -1, this;
	}
	containsPoint(e) {
		return e.distanceToSquared(this.center) <= this.radius * this.radius;
	}
	distanceToPoint(e) {
		return e.distanceTo(this.center) - this.radius;
	}
	intersectsSphere(e) {
		let t = this.radius + e.radius;
		return e.center.distanceToSquared(this.center) <= t * t;
	}
	intersectsBox(e) {
		return e.intersectsSphere(this);
	}
	intersectsPlane(e) {
		return Math.abs(e.distanceToPoint(this.center)) <= this.radius;
	}
	clampPoint(e, t) {
		let n = this.center.distanceToSquared(e);
		return t.copy(e), n > this.radius * this.radius && (t.sub(this.center).normalize(), t.multiplyScalar(this.radius).add(this.center)), t;
	}
	getBoundingBox(e) {
		return this.isEmpty() ? (e.makeEmpty(), e) : (e.set(this.center, this.center), e.expandByScalar(this.radius), e);
	}
	applyMatrix4(e) {
		return this.center.applyMatrix4(e), this.radius *= e.getMaxScaleOnAxis(), this;
	}
	translate(e) {
		return this.center.add(e), this;
	}
	expandByPoint(e) {
		if (this.isEmpty()) return this.center.copy(e), this.radius = 0, this;
		sr.subVectors(e, this.center);
		let t = sr.lengthSq();
		if (t > this.radius * this.radius) {
			let e = Math.sqrt(t), n = (e - this.radius) * .5;
			this.center.addScaledVector(sr, n / e), this.radius += n;
		}
		return this;
	}
	union(e) {
		return e.isEmpty() ? this : this.isEmpty() ? (this.copy(e), this) : (this.center.equals(e.center) === !0 ? this.radius = Math.max(this.radius, e.radius) : (cr.subVectors(e.center, this.center).setLength(e.radius), this.expandByPoint(sr.copy(e.center).add(cr)), this.expandByPoint(sr.copy(e.center).sub(cr))), this);
	}
	equals(e) {
		return e.center.equals(this.center) && e.radius === this.radius;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		return {
			radius: this.radius,
			center: this.center.toArray()
		};
	}
	fromJSON(e) {
		return this.radius = e.radius, this.center.fromArray(e.center), this;
	}
}, ur = 0, dr = /*@__PURE__*/ new Bt(), fr = /*@__PURE__*/ new mn(), pr = /*@__PURE__*/ new W(), mr = /*@__PURE__*/ new Rn(), hr = /*@__PURE__*/ new Rn(), gr = /*@__PURE__*/ new W(), _r = class e extends ut {
	constructor() {
		super(), this.isBufferGeometry = !0, Object.defineProperty(this, "id", { value: ur++ }), this.uuid = mt(), this.name = "", this.type = "BufferGeometry", this.index = null, this.indirect = null, this.indirectOffset = 0, this.attributes = {}, this.morphAttributes = {}, this.morphTargetsRelative = !1, this.groups = [], this.boundingBox = null, this.boundingSphere = null, this.drawRange = {
			start: 0,
			count: Infinity
		}, this.userData = {}, this._transformed = !1;
	}
	getIndex() {
		return this.index;
	}
	setIndex(e) {
		return this.index = Array.isArray(e) ? new (et(e) ? ir : rr)(e, 1) : e, this;
	}
	setIndirect(e, t = 0) {
		return this.indirect = e, this.indirectOffset = t, this;
	}
	getIndirect() {
		return this.indirect;
	}
	getAttribute(e) {
		return this.attributes[e];
	}
	setAttribute(e, t) {
		return this.attributes[e] = t, this;
	}
	deleteAttribute(e) {
		return delete this.attributes[e], this;
	}
	hasAttribute(e) {
		return this.attributes[e] !== void 0;
	}
	addGroup(e, t, n = 0) {
		this.groups.push({
			start: e,
			count: t,
			materialIndex: n
		});
	}
	clearGroups() {
		this.groups = [];
	}
	setDrawRange(e, t) {
		this.drawRange.start = e, this.drawRange.count = t;
	}
	applyMatrix4(e) {
		let t = this.attributes.position;
		t !== void 0 && (t.applyMatrix4(e), t.needsUpdate = !0);
		let n = this.attributes.normal;
		if (n !== void 0) {
			let t = new G().getNormalMatrix(e);
			n.applyNormalMatrix(t), n.needsUpdate = !0;
		}
		let r = this.attributes.tangent;
		return r !== void 0 && (r.transformDirection(e), r.needsUpdate = !0), this.boundingBox !== null && this.computeBoundingBox(), this.boundingSphere !== null && this.computeBoundingSphere(), this._transformed = !0, this;
	}
	applyQuaternion(e) {
		return dr.makeRotationFromQuaternion(e), this.applyMatrix4(dr), this;
	}
	rotateX(e) {
		return dr.makeRotationX(e), this.applyMatrix4(dr), this;
	}
	rotateY(e) {
		return dr.makeRotationY(e), this.applyMatrix4(dr), this;
	}
	rotateZ(e) {
		return dr.makeRotationZ(e), this.applyMatrix4(dr), this;
	}
	translate(e, t, n) {
		return dr.makeTranslation(e, t, n), this.applyMatrix4(dr), this;
	}
	scale(e, t, n) {
		return dr.makeScale(e, t, n), this.applyMatrix4(dr), this;
	}
	lookAt(e) {
		return fr.lookAt(e), fr.updateMatrix(), this.applyMatrix4(fr.matrix), this;
	}
	center() {
		return this.computeBoundingBox(), this.boundingBox.getCenter(pr).negate(), this.translate(pr.x, pr.y, pr.z), this;
	}
	setFromPoints(e) {
		let t = this.getAttribute("position");
		if (t === void 0) {
			let t = [];
			for (let n = 0, r = e.length; n < r; n++) {
				let r = e[n];
				t.push(r.x, r.y, r.z || 0);
			}
			this.setAttribute("position", new ar(t, 3));
		} else {
			let n = Math.min(e.length, t.count);
			for (let r = 0; r < n; r++) {
				let n = e[r];
				t.setXYZ(r, n.x, n.y, n.z || 0);
			}
			e.length > t.count && B("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."), t.needsUpdate = !0;
		}
		return this;
	}
	computeBoundingBox() {
		this.boundingBox === null && (this.boundingBox = new Rn());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) V("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.", this), this.boundingBox.set(new W(-Infinity, -Infinity, -Infinity), new W(Infinity, Infinity, Infinity));
		else {
			if (e !== void 0) {
				if (this.boundingBox.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
					let n = t[e];
					mr.setFromBufferAttribute(n), this.morphTargetsRelative ? (gr.addVectors(this.boundingBox.min, mr.min), this.boundingBox.expandByPoint(gr), gr.addVectors(this.boundingBox.max, mr.max), this.boundingBox.expandByPoint(gr)) : (this.boundingBox.expandByPoint(mr.min), this.boundingBox.expandByPoint(mr.max));
				}
			} else this.boundingBox.makeEmpty();
			(isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) && V("BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The \"position\" attribute is likely to have NaN values.", this);
		}
	}
	computeBoundingSphere() {
		this.boundingSphere === null && (this.boundingSphere = new lr());
		let e = this.attributes.position, t = this.morphAttributes.position;
		if (e && e.isGLBufferAttribute) V("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.", this), this.boundingSphere.set(new W(), Infinity);
		else if (e) {
			let n = this.boundingSphere.center;
			if (mr.setFromBufferAttribute(e), t) for (let e = 0, n = t.length; e < n; e++) {
				let n = t[e];
				hr.setFromBufferAttribute(n), this.morphTargetsRelative ? (gr.addVectors(mr.min, hr.min), mr.expandByPoint(gr), gr.addVectors(mr.max, hr.max), mr.expandByPoint(gr)) : (mr.expandByPoint(hr.min), mr.expandByPoint(hr.max));
			}
			mr.getCenter(n);
			let r = 0;
			for (let t = 0, i = e.count; t < i; t++) gr.fromBufferAttribute(e, t), r = Math.max(r, n.distanceToSquared(gr));
			if (t) for (let i = 0, a = t.length; i < a; i++) {
				let a = t[i], o = this.morphTargetsRelative;
				for (let t = 0, i = a.count; t < i; t++) gr.fromBufferAttribute(a, t), o && (pr.fromBufferAttribute(e, t), gr.add(pr)), r = Math.max(r, n.distanceToSquared(gr));
			}
			this.boundingSphere.radius = Math.sqrt(r), isNaN(this.boundingSphere.radius) && V("BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The \"position\" attribute is likely to have NaN values.", this);
		}
	}
	computeTangents() {
		let e = this.index, t = this.attributes;
		if (e === null || t.position === void 0 || t.normal === void 0 || t.uv === void 0) {
			V("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");
			return;
		}
		let n = t.position, r = t.normal, i = t.uv, a = this.getAttribute("tangent");
		(a === void 0 || a.count !== n.count) && (a = new nr(new Float32Array(4 * n.count), 4), this.setAttribute("tangent", a));
		let o = [], s = [];
		for (let e = 0; e < n.count; e++) o[e] = new W(), s[e] = new W();
		let c = new W(), l = new W(), u = new W(), d = new U(), f = new U(), p = new U(), m = new W(), h = new W();
		function g(e, t, r) {
			c.fromBufferAttribute(n, e), l.fromBufferAttribute(n, t), u.fromBufferAttribute(n, r), d.fromBufferAttribute(i, e), f.fromBufferAttribute(i, t), p.fromBufferAttribute(i, r), l.sub(c), u.sub(c), f.sub(d), p.sub(d);
			let a = 1 / (f.x * p.y - p.x * f.y);
			isFinite(a) && (m.copy(l).multiplyScalar(p.y).addScaledVector(u, -f.y).multiplyScalar(a), h.copy(u).multiplyScalar(f.x).addScaledVector(l, -p.x).multiplyScalar(a), o[e].add(m), o[t].add(m), o[r].add(m), s[e].add(h), s[t].add(h), s[r].add(h));
		}
		let _ = this.groups;
		_.length === 0 && (_ = [{
			start: 0,
			count: e.count
		}]);
		for (let t = 0, n = _.length; t < n; ++t) {
			let n = _[t], r = n.start, i = n.count;
			for (let t = r, n = r + i; t < n; t += 3) g(e.getX(t + 0), e.getX(t + 1), e.getX(t + 2));
		}
		let v = new W(), y = new W(), b = new W(), x = new W();
		function S(e) {
			b.fromBufferAttribute(r, e), x.copy(b);
			let t = o[e];
			v.copy(t), v.sub(b.multiplyScalar(b.dot(t))).normalize(), y.crossVectors(x, t);
			let n = y.dot(s[e]) < 0 ? -1 : 1;
			a.setXYZW(e, v.x, v.y, v.z, n);
		}
		for (let t = 0, n = _.length; t < n; ++t) {
			let n = _[t], r = n.start, i = n.count;
			for (let t = r, n = r + i; t < n; t += 3) S(e.getX(t + 0)), S(e.getX(t + 1)), S(e.getX(t + 2));
		}
		this._transformed = !0;
	}
	computeVertexNormals() {
		let e = this.index, t = this.getAttribute("position");
		if (t !== void 0) {
			let n = this.getAttribute("normal");
			if (n === void 0 || n.count !== t.count) n = new nr(new Float32Array(t.count * 3), 3), this.setAttribute("normal", n);
			else for (let e = 0, t = n.count; e < t; e++) n.setXYZ(e, 0, 0, 0);
			let r = new W(), i = new W(), a = new W(), o = new W(), s = new W(), c = new W(), l = new W(), u = new W();
			if (e) for (let d = 0, f = e.count; d < f; d += 3) {
				let f = e.getX(d + 0), p = e.getX(d + 1), m = e.getX(d + 2);
				r.fromBufferAttribute(t, f), i.fromBufferAttribute(t, p), a.fromBufferAttribute(t, m), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), o.fromBufferAttribute(n, f), s.fromBufferAttribute(n, p), c.fromBufferAttribute(n, m), o.add(l), s.add(l), c.add(l), n.setXYZ(f, o.x, o.y, o.z), n.setXYZ(p, s.x, s.y, s.z), n.setXYZ(m, c.x, c.y, c.z);
			}
			else for (let e = 0, o = t.count; e < o; e += 3) r.fromBufferAttribute(t, e + 0), i.fromBufferAttribute(t, e + 1), a.fromBufferAttribute(t, e + 2), l.subVectors(a, i), u.subVectors(r, i), l.cross(u), n.setXYZ(e + 0, l.x, l.y, l.z), n.setXYZ(e + 1, l.x, l.y, l.z), n.setXYZ(e + 2, l.x, l.y, l.z);
			this.normalizeNormals(), n.needsUpdate = !0;
		}
	}
	normalizeNormals() {
		let e = this.attributes.normal;
		for (let t = 0, n = e.count; t < n; t++) gr.fromBufferAttribute(e, t), gr.normalize(), e.setXYZ(t, gr.x, gr.y, gr.z);
	}
	toNonIndexed() {
		function t(e, t) {
			let n = e.array, r = e.itemSize, i = e.normalized, a = new n.constructor(t.length * r), o = 0, s = 0;
			for (let i = 0, c = t.length; i < c; i++) {
				o = e.isInterleavedBufferAttribute ? t[i] * e.data.stride + e.offset : t[i] * r;
				for (let e = 0; e < r; e++) a[s++] = n[o++];
			}
			return new nr(a, r, i);
		}
		if (this.index === null) return B("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."), this;
		let n = new e(), r = this.index.array, i = this.attributes;
		for (let e in i) {
			let a = i[e], o = t(a, r);
			n.setAttribute(e, o);
		}
		let a = this.morphAttributes;
		for (let e in a) {
			let i = [], o = a[e];
			for (let e = 0, n = o.length; e < n; e++) {
				let n = o[e], a = t(n, r);
				i.push(a);
			}
			n.morphAttributes[e] = i;
		}
		n.morphTargetsRelative = this.morphTargetsRelative;
		let o = this.groups;
		for (let e = 0, t = o.length; e < t; e++) {
			let t = o[e];
			n.addGroup(t.start, t.count, t.materialIndex);
		}
		return n;
	}
	toJSON() {
		let e = { metadata: {
			version: 4.7,
			type: "BufferGeometry",
			generator: "BufferGeometry.toJSON"
		} };
		if (e.uuid = this.uuid, e.type = this.parameters !== void 0 && this._transformed === !0 ? "BufferGeometry" : this.type, e.name = this.name, Object.keys(this.userData).length > 0 && (e.userData = this.userData), this.parameters !== void 0 && this._transformed !== !0) {
			let t = this.parameters;
			for (let n in t) t[n] !== void 0 && (e[n] = t[n]);
			return e;
		}
		e.data = { attributes: {} };
		let t = this.index;
		t !== null && (e.data.index = {
			type: t.array.constructor.name,
			array: Array.prototype.slice.call(t.array)
		});
		let n = this.attributes;
		for (let t in n) {
			let r = n[t];
			e.data.attributes[t] = r.toJSON(e.data);
		}
		let r = {}, i = !1;
		for (let t in this.morphAttributes) {
			let n = this.morphAttributes[t], a = [];
			for (let t = 0, r = n.length; t < r; t++) {
				let r = n[t];
				a.push(r.toJSON(e.data));
			}
			a.length > 0 && (r[t] = a, i = !0);
		}
		i && (e.data.morphAttributes = r, e.data.morphTargetsRelative = this.morphTargetsRelative);
		let a = this.groups;
		a.length > 0 && (e.data.groups = JSON.parse(JSON.stringify(a)));
		let o = this.boundingSphere;
		return o !== null && (e.data.boundingSphere = o.toJSON()), e;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.index = null, this.attributes = {}, this.morphAttributes = {}, this.groups = [], this.boundingBox = null, this.boundingSphere = null;
		let t = {};
		this.name = e.name;
		let n = e.index;
		n !== null && this.setIndex(n.clone());
		let r = e.attributes;
		for (let e in r) {
			let n = r[e];
			this.setAttribute(e, n.clone(t));
		}
		let i = e.morphAttributes;
		for (let e in i) {
			let n = [], r = i[e];
			for (let e = 0, i = r.length; e < i; e++) n.push(r[e].clone(t));
			this.morphAttributes[e] = n;
		}
		this.morphTargetsRelative = e.morphTargetsRelative;
		let a = e.groups;
		for (let e = 0, t = a.length; e < t; e++) {
			let t = a[e];
			this.addGroup(t.start, t.count, t.materialIndex);
		}
		let o = e.boundingBox;
		o !== null && (this.boundingBox = o.clone());
		let s = e.boundingSphere;
		return s !== null && (this.boundingSphere = s.clone()), this.drawRange.start = e.drawRange.start, this.drawRange.count = e.drawRange.count, this.userData = e.userData, this._transformed = e._transformed, this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
}, vr = class {
	constructor(e, t) {
		this.isInterleavedBuffer = !0, this.array = e, this.stride = t, this.count = e === void 0 ? 0 : e.length / t, this.usage = Qe, this.updateRanges = [], this.version = 0, this.uuid = mt();
	}
	onUploadCallback() {}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
	setUsage(e) {
		return this.usage = e, this;
	}
	addUpdateRange(e, t) {
		this.updateRanges.push({
			start: e,
			count: t
		});
	}
	clearUpdateRanges() {
		this.updateRanges.length = 0;
	}
	copy(e) {
		return this.array = new e.array.constructor(e.array), this.count = e.count, this.stride = e.stride, this.usage = e.usage, this;
	}
	copyAt(e, t, n) {
		e *= this.stride, n *= t.stride;
		for (let r = 0, i = this.stride; r < i; r++) this.array[e + r] = t.array[n + r];
		return this;
	}
	set(e, t = 0) {
		return this.array.set(e, t), this;
	}
	clone(e) {
		e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = mt()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = this.array.slice(0).buffer);
		let t = new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]), n = new this.constructor(t, this.stride);
		return n.setUsage(this.usage), n;
	}
	onUpload(e) {
		return this.onUploadCallback = e, this;
	}
	toJSON(e) {
		e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = mt()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = Array.from(new Uint32Array(this.array.buffer)));
		let t = {
			uuid: this.uuid,
			buffer: this.array.buffer._uuid,
			type: this.array.constructor.name,
			stride: this.stride
		};
		return t.usage = this.usage, t;
	}
}, yr = /*@__PURE__*/ new W(), br = class e {
	constructor(e, t, n, r = !1) {
		this.isInterleavedBufferAttribute = !0, this.name = "", this.data = e, this.itemSize = t, this.offset = n, this.normalized = r;
	}
	get count() {
		return this.data.count;
	}
	get array() {
		return this.data.array;
	}
	set needsUpdate(e) {
		this.data.needsUpdate = e;
	}
	applyMatrix4(e) {
		for (let t = 0, n = this.data.count; t < n; t++) yr.fromBufferAttribute(this, t), yr.applyMatrix4(e), this.setXYZ(t, yr.x, yr.y, yr.z);
		return this;
	}
	applyNormalMatrix(e) {
		for (let t = 0, n = this.count; t < n; t++) yr.fromBufferAttribute(this, t), yr.applyNormalMatrix(e), this.setXYZ(t, yr.x, yr.y, yr.z);
		return this;
	}
	transformDirection(e) {
		for (let t = 0, n = this.count; t < n; t++) yr.fromBufferAttribute(this, t), yr.transformDirection(e), this.setXYZ(t, yr.x, yr.y, yr.z);
		return this;
	}
	getComponent(e, t) {
		let n = this.array[e * this.data.stride + this.offset + t];
		return this.normalized && (n = vt(n, this.array)), n;
	}
	setComponent(e, t, n) {
		return this.normalized && (n = H(n, this.array)), this.data.array[e * this.data.stride + this.offset + t] = n, this;
	}
	setX(e, t) {
		return this.normalized && (t = H(t, this.array)), this.data.array[e * this.data.stride + this.offset] = t, this;
	}
	setY(e, t) {
		return this.normalized && (t = H(t, this.array)), this.data.array[e * this.data.stride + this.offset + 1] = t, this;
	}
	setZ(e, t) {
		return this.normalized && (t = H(t, this.array)), this.data.array[e * this.data.stride + this.offset + 2] = t, this;
	}
	setW(e, t) {
		return this.normalized && (t = H(t, this.array)), this.data.array[e * this.data.stride + this.offset + 3] = t, this;
	}
	getX(e) {
		let t = this.data.array[e * this.data.stride + this.offset];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	getY(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 1];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	getZ(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 2];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	getW(e) {
		let t = this.data.array[e * this.data.stride + this.offset + 3];
		return this.normalized && (t = vt(t, this.array)), t;
	}
	setXY(e, t, n) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = H(t, this.array), n = H(n, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this;
	}
	setXYZ(e, t, n, r) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = H(t, this.array), n = H(n, this.array), r = H(r, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = r, this;
	}
	setXYZW(e, t, n, r, i) {
		return e = e * this.data.stride + this.offset, this.normalized && (t = H(t, this.array), n = H(n, this.array), r = H(r, this.array), i = H(i, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = r, this.data.array[e + 3] = i, this;
	}
	clone(t) {
		if (t === void 0) {
			at("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");
			let e = [];
			for (let t = 0; t < this.count; t++) {
				let n = t * this.data.stride + this.offset;
				for (let t = 0; t < this.itemSize; t++) e.push(this.data.array[n + t]);
			}
			return new nr(new this.array.constructor(e), this.itemSize, this.normalized);
		}
		return t.interleavedBuffers === void 0 && (t.interleavedBuffers = {}), t.interleavedBuffers[this.data.uuid] === void 0 && (t.interleavedBuffers[this.data.uuid] = this.data.clone(t)), new e(t.interleavedBuffers[this.data.uuid], this.itemSize, this.offset, this.normalized);
	}
	toJSON(e) {
		if (e === void 0) {
			at("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");
			let e = [];
			for (let t = 0; t < this.count; t++) {
				let n = t * this.data.stride + this.offset;
				for (let t = 0; t < this.itemSize; t++) e.push(this.data.array[n + t]);
			}
			return {
				itemSize: this.itemSize,
				type: this.array.constructor.name,
				array: e,
				normalized: this.normalized
			};
		}
		return e.interleavedBuffers === void 0 && (e.interleavedBuffers = {}), e.interleavedBuffers[this.data.uuid] === void 0 && (e.interleavedBuffers[this.data.uuid] = this.data.toJSON(e)), {
			isInterleavedBufferAttribute: !0,
			itemSize: this.itemSize,
			data: this.data.uuid,
			offset: this.offset,
			normalized: this.normalized
		};
	}
}, xr = /*@__PURE__*/ new W(), Sr = /*@__PURE__*/ new W(), Cr = /*@__PURE__*/ new G(), wr = class {
	constructor(e = new W(1, 0, 0), t = 0) {
		this.isPlane = !0, this.normal = e, this.constant = t;
	}
	set(e, t) {
		return this.normal.copy(e), this.constant = t, this;
	}
	setComponents(e, t, n, r) {
		return this.normal.set(e, t, n), this.constant = r, this;
	}
	setFromNormalAndCoplanarPoint(e, t) {
		return this.normal.copy(e), this.constant = -t.dot(this.normal), this;
	}
	setFromCoplanarPoints(e, t, n) {
		let r = xr.subVectors(n, t).cross(Sr.subVectors(e, t)).normalize();
		return this.setFromNormalAndCoplanarPoint(r, e), this;
	}
	copy(e) {
		return this.normal.copy(e.normal), this.constant = e.constant, this;
	}
	normalize() {
		let e = 1 / this.normal.length();
		return this.normal.multiplyScalar(e), this.constant *= e, this;
	}
	negate() {
		return this.constant *= -1, this.normal.negate(), this;
	}
	distanceToPoint(e) {
		return this.normal.dot(e) + this.constant;
	}
	distanceToSphere(e) {
		return this.distanceToPoint(e.center) - e.radius;
	}
	projectPoint(e, t) {
		return t.copy(e).addScaledVector(this.normal, -this.distanceToPoint(e));
	}
	intersectLine(e, t, n = !0) {
		let r = e.delta(xr), i = this.normal.dot(r);
		if (i === 0) return this.distanceToPoint(e.start) === 0 ? t.copy(e.start) : null;
		let a = -(e.start.dot(this.normal) + this.constant) / i;
		return n === !0 && (a < 0 || a > 1) ? null : t.copy(e.start).addScaledVector(r, a);
	}
	intersectsLine(e) {
		let t = this.distanceToPoint(e.start), n = this.distanceToPoint(e.end);
		return t < 0 && n > 0 || n < 0 && t > 0;
	}
	intersectsBox(e) {
		return e.intersectsPlane(this);
	}
	intersectsSphere(e) {
		return e.intersectsPlane(this);
	}
	coplanarPoint(e) {
		return e.copy(this.normal).multiplyScalar(-this.constant);
	}
	applyMatrix4(e, t) {
		let n = t || Cr.getNormalMatrix(e), r = this.coplanarPoint(xr).applyMatrix4(e), i = this.normal.applyMatrix3(n).normalize();
		return this.constant = -r.dot(i), this;
	}
	translate(e) {
		return this.constant -= e.dot(this.normal), this;
	}
	equals(e) {
		return e.normal.equals(this.normal) && e.constant === this.constant;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		return {
			normal: this.normal.toArray(),
			constant: this.constant
		};
	}
	fromJSON(e) {
		return this.normal.fromArray(e.normal), this.constant = e.constant, this;
	}
}, Tr = 0, Er = class extends ut {
	constructor() {
		super(), this.isMaterial = !0, Object.defineProperty(this, "id", { value: Tr++ }), this.uuid = mt(), this.name = "", this.type = "Material", this.blending = 1, this.side = 0, this.vertexColors = !1, this.opacity = 1, this.transparent = !1, this.alphaHash = !1, this.blendSrc = 204, this.blendDst = 205, this.blendEquation = 100, this.blendSrcAlpha = null, this.blendDstAlpha = null, this.blendEquationAlpha = null, this.blendColor = new J(0, 0, 0), this.blendAlpha = 0, this.depthFunc = 3, this.depthTest = !0, this.depthWrite = !0, this.stencilWriteMask = 255, this.stencilFunc = 519, this.stencilRef = 0, this.stencilFuncMask = 255, this.stencilFail = Ze, this.stencilZFail = Ze, this.stencilZPass = Ze, this.stencilWrite = !1, this.clippingPlanes = null, this.clipIntersection = !1, this.clipShadows = !1, this.shadowSide = null, this.colorWrite = !0, this.precision = null, this.polygonOffset = !1, this.polygonOffsetFactor = 0, this.polygonOffsetUnits = 0, this.dithering = !1, this.alphaToCoverage = !1, this.premultipliedAlpha = !1, this.forceSinglePass = !1, this.allowOverride = !0, this.visible = !0, this.toneMapped = !0, this.userData = {}, this.version = 0, this._alphaTest = 0;
	}
	get alphaTest() {
		return this._alphaTest;
	}
	set alphaTest(e) {
		this._alphaTest > 0 != e > 0 && this.version++, this._alphaTest = e;
	}
	onBeforeRender() {}
	onBeforeCompile() {}
	customProgramCacheKey() {
		return this.onBeforeCompile.toString();
	}
	setValues(e) {
		if (e !== void 0) for (let t in e) {
			let n = e[t];
			if (n === void 0) {
				B(`Material: parameter '${t}' has value of undefined.`);
				continue;
			}
			let r = this[t];
			r === void 0 ? B(`Material: '${t}' is not a property of THREE.${this.type}.`) : r && r.isColor ? r.set(n) : r && r.isVector2 && n && n.isVector2 || r && r.isEuler && n && n.isEuler || r && r.isVector3 && n && n.isVector3 ? r.copy(n) : this[t] = n;
		}
	}
	toJSON(e) {
		let t = e === void 0 || typeof e == "string";
		t && (e = {
			textures: {},
			images: {}
		});
		let n = { metadata: {
			version: 4.7,
			type: "Material",
			generator: "Material.toJSON"
		} };
		n.uuid = this.uuid, n.type = this.type, n.blending = this.blending, n.side = this.side, n.shadowSide = this.shadowSide, n.vertexColors = this.vertexColors, n.opacity = this.opacity, n.transparent = this.transparent, n.blendSrc = this.blendSrc, n.blendDst = this.blendDst, n.blendEquation = this.blendEquation, n.blendSrcAlpha = this.blendSrcAlpha, n.blendDstAlpha = this.blendDstAlpha, n.blendEquationAlpha = this.blendEquationAlpha, n.blendColor = this.blendColor.getHex(), n.blendAlpha = this.blendAlpha, n.depthFunc = this.depthFunc, n.depthTest = this.depthTest, n.depthWrite = this.depthWrite, n.colorWrite = this.colorWrite, n.clipIntersection = this.clipIntersection, n.clipShadows = this.clipShadows, n.stencilWriteMask = this.stencilWriteMask, n.stencilFunc = this.stencilFunc, n.stencilRef = this.stencilRef, n.stencilFuncMask = this.stencilFuncMask, n.stencilFail = this.stencilFail, n.stencilZFail = this.stencilZFail, n.stencilZPass = this.stencilZPass, n.stencilWrite = this.stencilWrite, n.polygonOffset = this.polygonOffset, n.polygonOffsetFactor = this.polygonOffsetFactor, n.polygonOffsetUnits = this.polygonOffsetUnits, n.dithering = this.dithering, n.alphaTest = this.alphaTest, n.alphaHash = this.alphaHash, n.alphaToCoverage = this.alphaToCoverage, n.premultipliedAlpha = this.premultipliedAlpha, n.forceSinglePass = this.forceSinglePass, n.allowOverride = this.allowOverride, n.visible = this.visible, n.toneMapped = this.toneMapped, n.name = this.name, this.color && this.color.isColor && (n.color = this.color.getHex()), this.roughness !== void 0 && (n.roughness = this.roughness), this.metalness !== void 0 && (n.metalness = this.metalness), this.sheen !== void 0 && (n.sheen = this.sheen), this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()), this.sheenRoughness !== void 0 && (n.sheenRoughness = this.sheenRoughness), this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()), this.emissiveIntensity !== void 0 && (n.emissiveIntensity = this.emissiveIntensity), this.specular && this.specular.isColor && (n.specular = this.specular.getHex()), this.specularIntensity !== void 0 && (n.specularIntensity = this.specularIntensity), this.specularColor && this.specularColor.isColor && (n.specularColor = this.specularColor.getHex()), this.shininess !== void 0 && (n.shininess = this.shininess), this.clearcoat !== void 0 && (n.clearcoat = this.clearcoat), this.clearcoatRoughness !== void 0 && (n.clearcoatRoughness = this.clearcoatRoughness), this.clearcoatMap && this.clearcoatMap.isTexture && (n.clearcoatMap = this.clearcoatMap.toJSON(e).uuid), this.clearcoatRoughnessMap && this.clearcoatRoughnessMap.isTexture && (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(e).uuid), this.clearcoatNormalMap && this.clearcoatNormalMap.isTexture && (n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(e).uuid, n.clearcoatNormalScale = this.clearcoatNormalScale.toArray()), this.sheenColorMap && this.sheenColorMap.isTexture && (n.sheenColorMap = this.sheenColorMap.toJSON(e).uuid), this.sheenRoughnessMap && this.sheenRoughnessMap.isTexture && (n.sheenRoughnessMap = this.sheenRoughnessMap.toJSON(e).uuid), this.dispersion !== void 0 && (n.dispersion = this.dispersion), this.retroreflectivity !== void 0 && (n.retroreflectivity = this.retroreflectivity), this.iridescence !== void 0 && (n.iridescence = this.iridescence), this.iridescenceIOR !== void 0 && (n.iridescenceIOR = this.iridescenceIOR), this.iridescenceThicknessRange !== void 0 && (n.iridescenceThicknessRange = this.iridescenceThicknessRange), this.iridescenceMap && this.iridescenceMap.isTexture && (n.iridescenceMap = this.iridescenceMap.toJSON(e).uuid), this.iridescenceThicknessMap && this.iridescenceThicknessMap.isTexture && (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(e).uuid), this.anisotropy !== void 0 && (n.anisotropy = this.anisotropy), this.anisotropyRotation !== void 0 && (n.anisotropyRotation = this.anisotropyRotation), this.anisotropyMap && this.anisotropyMap.isTexture && (n.anisotropyMap = this.anisotropyMap.toJSON(e).uuid), this.map && this.map.isTexture && (n.map = this.map.toJSON(e).uuid), this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(e).uuid), this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(e).uuid), this.lightMap && this.lightMap.isTexture && (n.lightMap = this.lightMap.toJSON(e).uuid, n.lightMapIntensity = this.lightMapIntensity), this.aoMap && this.aoMap.isTexture && (n.aoMap = this.aoMap.toJSON(e).uuid, n.aoMapIntensity = this.aoMapIntensity), this.bumpMap && this.bumpMap.isTexture && (n.bumpMap = this.bumpMap.toJSON(e).uuid, n.bumpScale = this.bumpScale), this.normalMap && this.normalMap.isTexture && (n.normalMap = this.normalMap.toJSON(e).uuid, n.normalMapType = this.normalMapType, n.normalScale = this.normalScale.toArray()), this.displacementMap && this.displacementMap.isTexture && (n.displacementMap = this.displacementMap.toJSON(e).uuid, n.displacementScale = this.displacementScale, n.displacementBias = this.displacementBias), this.roughnessMap && this.roughnessMap.isTexture && (n.roughnessMap = this.roughnessMap.toJSON(e).uuid), this.metalnessMap && this.metalnessMap.isTexture && (n.metalnessMap = this.metalnessMap.toJSON(e).uuid), this.emissiveMap && this.emissiveMap.isTexture && (n.emissiveMap = this.emissiveMap.toJSON(e).uuid), this.specularMap && this.specularMap.isTexture && (n.specularMap = this.specularMap.toJSON(e).uuid), this.specularIntensityMap && this.specularIntensityMap.isTexture && (n.specularIntensityMap = this.specularIntensityMap.toJSON(e).uuid), this.specularColorMap && this.specularColorMap.isTexture && (n.specularColorMap = this.specularColorMap.toJSON(e).uuid), this.envMap && this.envMap.isTexture && (n.envMap = this.envMap.toJSON(e).uuid, this.combine !== void 0 && (n.combine = this.combine)), this.envMapRotation !== void 0 && (n.envMapRotation = this.envMapRotation.toArray()), this.envMapIntensity !== void 0 && (n.envMapIntensity = this.envMapIntensity), this.reflectivity !== void 0 && (n.reflectivity = this.reflectivity), this.refractionRatio !== void 0 && (n.refractionRatio = this.refractionRatio), this.gradientMap && this.gradientMap.isTexture && (n.gradientMap = this.gradientMap.toJSON(e).uuid), this.transmission !== void 0 && (n.transmission = this.transmission), this.transmissionMap && this.transmissionMap.isTexture && (n.transmissionMap = this.transmissionMap.toJSON(e).uuid), this.thickness !== void 0 && (n.thickness = this.thickness), this.thicknessMap && this.thicknessMap.isTexture && (n.thicknessMap = this.thicknessMap.toJSON(e).uuid), this.attenuationDistance !== void 0 && (n.attenuationDistance = this.attenuationDistance), this.attenuationColor !== void 0 && (n.attenuationColor = this.attenuationColor.getHex()), this.size !== void 0 && (n.size = this.size), this.sizeAttenuation !== void 0 && (n.sizeAttenuation = this.sizeAttenuation), Array.isArray(this.clippingPlanes) && this.clippingPlanes.length > 0 && (n.clippingPlanes = this.clippingPlanes.map((e) => e.toJSON())), this.rotation !== void 0 && (n.rotation = this.rotation), this.depthPacking !== void 0 && (n.depthPacking = this.depthPacking), this.linewidth !== void 0 && (n.linewidth = this.linewidth), this.linecap !== void 0 && (n.linecap = this.linecap), this.linejoin !== void 0 && (n.linejoin = this.linejoin), this.dashSize !== void 0 && (n.dashSize = this.dashSize), this.gapSize !== void 0 && (n.gapSize = this.gapSize), this.scale !== void 0 && (n.scale = this.scale), this.wireframe !== void 0 && (n.wireframe = this.wireframe), this.wireframeLinewidth !== void 0 && (n.wireframeLinewidth = this.wireframeLinewidth), this.wireframeLinecap !== void 0 && (n.wireframeLinecap = this.wireframeLinecap), this.wireframeLinejoin !== void 0 && (n.wireframeLinejoin = this.wireframeLinejoin), this.flatShading !== void 0 && (n.flatShading = this.flatShading), this.fog !== void 0 && (n.fog = this.fog), Object.keys(this.userData).length > 0 && (n.userData = this.userData);
		function r(e) {
			let t = [];
			for (let n in e) {
				let r = e[n];
				delete r.metadata, t.push(r);
			}
			return t;
		}
		if (t) {
			let t = r(e.textures), i = r(e.images);
			t.length > 0 && (n.textures = t), i.length > 0 && (n.images = i);
		}
		return n;
	}
	fromJSON(e, t) {
		if (e.uuid !== void 0 && (this.uuid = e.uuid), e.name !== void 0 && (this.name = e.name), e.color !== void 0 && this.color !== void 0 && this.color.setHex(e.color), e.roughness !== void 0 && (this.roughness = e.roughness), e.metalness !== void 0 && (this.metalness = e.metalness), e.sheen !== void 0 && (this.sheen = e.sheen), e.sheenColor !== void 0 && (this.sheenColor = new J().setHex(e.sheenColor)), e.sheenRoughness !== void 0 && (this.sheenRoughness = e.sheenRoughness), e.emissive !== void 0 && this.emissive !== void 0 && this.emissive.setHex(e.emissive), e.specular !== void 0 && this.specular !== void 0 && this.specular.setHex(e.specular), e.specularIntensity !== void 0 && (this.specularIntensity = e.specularIntensity), e.specularColor !== void 0 && this.specularColor !== void 0 && this.specularColor.setHex(e.specularColor), e.shininess !== void 0 && (this.shininess = e.shininess), e.clearcoat !== void 0 && (this.clearcoat = e.clearcoat), e.clearcoatRoughness !== void 0 && (this.clearcoatRoughness = e.clearcoatRoughness), e.dispersion !== void 0 && (this.dispersion = e.dispersion), e.retroreflectivity !== void 0 && (this.retroreflectivity = e.retroreflectivity), e.iridescence !== void 0 && (this.iridescence = e.iridescence), e.iridescenceIOR !== void 0 && (this.iridescenceIOR = e.iridescenceIOR), e.iridescenceThicknessRange !== void 0 && (this.iridescenceThicknessRange = e.iridescenceThicknessRange), e.transmission !== void 0 && (this.transmission = e.transmission), e.thickness !== void 0 && (this.thickness = e.thickness), e.attenuationDistance !== void 0 && (this.attenuationDistance = e.attenuationDistance), e.attenuationColor !== void 0 && this.attenuationColor !== void 0 && this.attenuationColor.setHex(e.attenuationColor), e.anisotropy !== void 0 && (this.anisotropy = e.anisotropy), e.anisotropyRotation !== void 0 && (this.anisotropyRotation = e.anisotropyRotation), e.fog !== void 0 && (this.fog = e.fog), e.flatShading !== void 0 && (this.flatShading = e.flatShading), e.blending !== void 0 && (this.blending = e.blending), e.combine !== void 0 && (this.combine = e.combine), e.side !== void 0 && (this.side = e.side), e.shadowSide !== void 0 && (this.shadowSide = e.shadowSide), e.opacity !== void 0 && (this.opacity = e.opacity), e.transparent !== void 0 && (this.transparent = e.transparent), e.alphaTest !== void 0 && (this.alphaTest = e.alphaTest), e.alphaHash !== void 0 && (this.alphaHash = e.alphaHash), e.depthFunc !== void 0 && (this.depthFunc = e.depthFunc), e.depthTest !== void 0 && (this.depthTest = e.depthTest), e.depthWrite !== void 0 && (this.depthWrite = e.depthWrite), e.colorWrite !== void 0 && (this.colorWrite = e.colorWrite), e.clippingPlanes !== void 0 && (this.clippingPlanes = e.clippingPlanes.map((e) => new wr().fromJSON(e))), e.clipIntersection !== void 0 && (this.clipIntersection = e.clipIntersection), e.clipShadows !== void 0 && (this.clipShadows = e.clipShadows), e.depthPacking !== void 0 && (this.depthPacking = e.depthPacking), e.blendSrc !== void 0 && (this.blendSrc = e.blendSrc), e.blendDst !== void 0 && (this.blendDst = e.blendDst), e.blendEquation !== void 0 && (this.blendEquation = e.blendEquation), e.blendSrcAlpha !== void 0 && (this.blendSrcAlpha = e.blendSrcAlpha), e.blendDstAlpha !== void 0 && (this.blendDstAlpha = e.blendDstAlpha), e.blendEquationAlpha !== void 0 && (this.blendEquationAlpha = e.blendEquationAlpha), e.blendColor !== void 0 && this.blendColor !== void 0 && this.blendColor.setHex(e.blendColor), e.blendAlpha !== void 0 && (this.blendAlpha = e.blendAlpha), e.stencilWriteMask !== void 0 && (this.stencilWriteMask = e.stencilWriteMask), e.stencilFunc !== void 0 && (this.stencilFunc = e.stencilFunc), e.stencilRef !== void 0 && (this.stencilRef = e.stencilRef), e.stencilFuncMask !== void 0 && (this.stencilFuncMask = e.stencilFuncMask), e.stencilFail !== void 0 && (this.stencilFail = e.stencilFail), e.stencilZFail !== void 0 && (this.stencilZFail = e.stencilZFail), e.stencilZPass !== void 0 && (this.stencilZPass = e.stencilZPass), e.stencilWrite !== void 0 && (this.stencilWrite = e.stencilWrite), e.wireframe !== void 0 && (this.wireframe = e.wireframe), e.wireframeLinewidth !== void 0 && (this.wireframeLinewidth = e.wireframeLinewidth), e.wireframeLinecap !== void 0 && (this.wireframeLinecap = e.wireframeLinecap), e.wireframeLinejoin !== void 0 && (this.wireframeLinejoin = e.wireframeLinejoin), e.rotation !== void 0 && (this.rotation = e.rotation), e.linewidth !== void 0 && (this.linewidth = e.linewidth), e.linecap !== void 0 && (this.linecap = e.linecap), e.linejoin !== void 0 && (this.linejoin = e.linejoin), e.dashSize !== void 0 && (this.dashSize = e.dashSize), e.gapSize !== void 0 && (this.gapSize = e.gapSize), e.scale !== void 0 && (this.scale = e.scale), e.polygonOffset !== void 0 && (this.polygonOffset = e.polygonOffset), e.polygonOffsetFactor !== void 0 && (this.polygonOffsetFactor = e.polygonOffsetFactor), e.polygonOffsetUnits !== void 0 && (this.polygonOffsetUnits = e.polygonOffsetUnits), e.dithering !== void 0 && (this.dithering = e.dithering), e.alphaToCoverage !== void 0 && (this.alphaToCoverage = e.alphaToCoverage), e.premultipliedAlpha !== void 0 && (this.premultipliedAlpha = e.premultipliedAlpha), e.forceSinglePass !== void 0 && (this.forceSinglePass = e.forceSinglePass), e.allowOverride !== void 0 && (this.allowOverride = e.allowOverride), e.visible !== void 0 && (this.visible = e.visible), e.toneMapped !== void 0 && (this.toneMapped = e.toneMapped), e.userData !== void 0 && (this.userData = e.userData), e.vertexColors !== void 0 && (this.vertexColors = typeof e.vertexColors == "number" ? e.vertexColors > 0 : e.vertexColors), e.size !== void 0 && (this.size = e.size), e.sizeAttenuation !== void 0 && (this.sizeAttenuation = e.sizeAttenuation), e.map !== void 0 && (this.map = t[e.map] || null), e.matcap !== void 0 && (this.matcap = t[e.matcap] || null), e.alphaMap !== void 0 && (this.alphaMap = t[e.alphaMap] || null), e.bumpMap !== void 0 && (this.bumpMap = t[e.bumpMap] || null), e.bumpScale !== void 0 && (this.bumpScale = e.bumpScale), e.normalMap !== void 0 && (this.normalMap = t[e.normalMap] || null), e.normalMapType !== void 0 && (this.normalMapType = e.normalMapType), e.normalScale !== void 0) {
			let t = e.normalScale;
			Array.isArray(t) === !1 && (t = [t, t]), this.normalScale = new U().fromArray(t);
		}
		return e.displacementMap !== void 0 && (this.displacementMap = t[e.displacementMap] || null), e.displacementScale !== void 0 && (this.displacementScale = e.displacementScale), e.displacementBias !== void 0 && (this.displacementBias = e.displacementBias), e.roughnessMap !== void 0 && (this.roughnessMap = t[e.roughnessMap] || null), e.metalnessMap !== void 0 && (this.metalnessMap = t[e.metalnessMap] || null), e.emissiveMap !== void 0 && (this.emissiveMap = t[e.emissiveMap] || null), e.emissiveIntensity !== void 0 && (this.emissiveIntensity = e.emissiveIntensity), e.specularMap !== void 0 && (this.specularMap = t[e.specularMap] || null), e.specularIntensityMap !== void 0 && (this.specularIntensityMap = t[e.specularIntensityMap] || null), e.specularColorMap !== void 0 && (this.specularColorMap = t[e.specularColorMap] || null), e.envMap !== void 0 && (this.envMap = t[e.envMap] || null), e.envMapRotation !== void 0 && this.envMapRotation.fromArray(e.envMapRotation), e.envMapIntensity !== void 0 && (this.envMapIntensity = e.envMapIntensity), e.reflectivity !== void 0 && (this.reflectivity = e.reflectivity), e.refractionRatio !== void 0 && (this.refractionRatio = e.refractionRatio), e.lightMap !== void 0 && (this.lightMap = t[e.lightMap] || null), e.lightMapIntensity !== void 0 && (this.lightMapIntensity = e.lightMapIntensity), e.aoMap !== void 0 && (this.aoMap = t[e.aoMap] || null), e.aoMapIntensity !== void 0 && (this.aoMapIntensity = e.aoMapIntensity), e.gradientMap !== void 0 && (this.gradientMap = t[e.gradientMap] || null), e.clearcoatMap !== void 0 && (this.clearcoatMap = t[e.clearcoatMap] || null), e.clearcoatRoughnessMap !== void 0 && (this.clearcoatRoughnessMap = t[e.clearcoatRoughnessMap] || null), e.clearcoatNormalMap !== void 0 && (this.clearcoatNormalMap = t[e.clearcoatNormalMap] || null), e.clearcoatNormalScale !== void 0 && (this.clearcoatNormalScale = new U().fromArray(e.clearcoatNormalScale)), e.iridescenceMap !== void 0 && (this.iridescenceMap = t[e.iridescenceMap] || null), e.iridescenceThicknessMap !== void 0 && (this.iridescenceThicknessMap = t[e.iridescenceThicknessMap] || null), e.transmissionMap !== void 0 && (this.transmissionMap = t[e.transmissionMap] || null), e.thicknessMap !== void 0 && (this.thicknessMap = t[e.thicknessMap] || null), e.anisotropyMap !== void 0 && (this.anisotropyMap = t[e.anisotropyMap] || null), e.sheenColorMap !== void 0 && (this.sheenColorMap = t[e.sheenColorMap] || null), e.sheenRoughnessMap !== void 0 && (this.sheenRoughnessMap = t[e.sheenRoughnessMap] || null), this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	copy(e) {
		this.name = e.name, this.blending = e.blending, this.side = e.side, this.vertexColors = e.vertexColors, this.opacity = e.opacity, this.transparent = e.transparent, this.blendSrc = e.blendSrc, this.blendDst = e.blendDst, this.blendEquation = e.blendEquation, this.blendSrcAlpha = e.blendSrcAlpha, this.blendDstAlpha = e.blendDstAlpha, this.blendEquationAlpha = e.blendEquationAlpha, this.blendColor.copy(e.blendColor), this.blendAlpha = e.blendAlpha, this.depthFunc = e.depthFunc, this.depthTest = e.depthTest, this.depthWrite = e.depthWrite, this.stencilWriteMask = e.stencilWriteMask, this.stencilFunc = e.stencilFunc, this.stencilRef = e.stencilRef, this.stencilFuncMask = e.stencilFuncMask, this.stencilFail = e.stencilFail, this.stencilZFail = e.stencilZFail, this.stencilZPass = e.stencilZPass, this.stencilWrite = e.stencilWrite;
		let t = e.clippingPlanes, n = null;
		if (t !== null) {
			let e = t.length;
			n = Array(e);
			for (let r = 0; r !== e; ++r) n[r] = t[r].clone();
		}
		return this.clippingPlanes = n, this.clipIntersection = e.clipIntersection, this.clipShadows = e.clipShadows, this.shadowSide = e.shadowSide, this.colorWrite = e.colorWrite, this.precision = e.precision, this.polygonOffset = e.polygonOffset, this.polygonOffsetFactor = e.polygonOffsetFactor, this.polygonOffsetUnits = e.polygonOffsetUnits, this.dithering = e.dithering, this.alphaTest = e.alphaTest, this.alphaHash = e.alphaHash, this.alphaToCoverage = e.alphaToCoverage, this.premultipliedAlpha = e.premultipliedAlpha, this.forceSinglePass = e.forceSinglePass, this.allowOverride = e.allowOverride, this.visible = e.visible, this.toneMapped = e.toneMapped, this.userData = JSON.parse(JSON.stringify(e.userData)), this;
	}
	dispose() {
		this.dispatchEvent({ type: "dispose" });
	}
	set needsUpdate(e) {
		e === !0 && this.version++;
	}
}, Dr = class extends Er {
	constructor(e) {
		super(), this.isSpriteMaterial = !0, this.type = "SpriteMaterial", this.color = new J(16777215), this.map = null, this.alphaMap = null, this.rotation = 0, this.sizeAttenuation = !0, this.transparent = !0, this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.alphaMap = e.alphaMap, this.rotation = e.rotation, this.sizeAttenuation = e.sizeAttenuation, this.fog = e.fog, this;
	}
}, Or, kr = /*@__PURE__*/ new W(), Ar = /*@__PURE__*/ new W(), jr = /*@__PURE__*/ new W(), Mr = /*@__PURE__*/ new U(), Nr = /*@__PURE__*/ new U(), Pr = /*@__PURE__*/ new Bt(), Fr = /*@__PURE__*/ new W(), Ir = /*@__PURE__*/ new W(), Lr = /*@__PURE__*/ new W(), Rr = /*@__PURE__*/ new U(), zr = /*@__PURE__*/ new U(), Br = /*@__PURE__*/ new U(), Vr = class extends mn {
	constructor(e = new Dr()) {
		if (super(), this.isSprite = !0, this.type = "Sprite", Or === void 0) {
			Or = new _r();
			let e = new vr(new Float32Array([
				-.5,
				-.5,
				0,
				0,
				0,
				.5,
				-.5,
				0,
				1,
				0,
				.5,
				.5,
				0,
				1,
				1,
				-.5,
				.5,
				0,
				0,
				1
			]), 5);
			Or.setIndex([
				0,
				1,
				2,
				0,
				2,
				3
			]), Or.setAttribute("position", new br(e, 3, 0, !1)), Or.setAttribute("uv", new br(e, 2, 3, !1));
		}
		this.geometry = Or, this.material = e, this.center = new U(.5, .5), this.count = 1;
	}
	intersectsFrustum(e) {
		return e.intersectsSprite(this);
	}
	raycast(e, t) {
		e.camera === null && V("Sprite: \"Raycaster.camera\" needs to be set in order to raycast against sprites."), Ar.setFromMatrixScale(this.matrixWorld), Pr.copy(e.camera.matrixWorld), this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse, this.matrixWorld), jr.setFromMatrixPosition(this.modelViewMatrix), e.camera.isPerspectiveCamera && this.material.sizeAttenuation === !1 && Ar.multiplyScalar(-jr.z);
		let n = this.material.rotation, r, i;
		n !== 0 && (i = Math.cos(n), r = Math.sin(n));
		let a = this.center;
		Hr(Fr.set(-.5, -.5, 0), jr, a, Ar, r, i), Hr(Ir.set(.5, -.5, 0), jr, a, Ar, r, i), Hr(Lr.set(.5, .5, 0), jr, a, Ar, r, i), Rr.set(0, 0), zr.set(1, 0), Br.set(1, 1);
		let o = e.ray.intersectTriangle(Fr, Ir, Lr, !1, kr);
		if (o === null && (Hr(Ir.set(-.5, .5, 0), jr, a, Ar, r, i), zr.set(0, 1), o = e.ray.intersectTriangle(Fr, Lr, Ir, !1, kr), o === null)) return;
		let s = e.ray.origin.distanceTo(kr);
		s < e.near || s > e.far || t.push({
			distance: s,
			point: kr.clone(),
			uv: Ln.getInterpolation(kr, Fr, Ir, Lr, Rr, zr, Br, new U()),
			face: null,
			object: this
		});
	}
	copy(e, t) {
		return super.copy(e, t), e.center !== void 0 && this.center.copy(e.center), this.material = e.material, this;
	}
};
function Hr(e, t, n, r, i, a) {
	Mr.subVectors(e, n).addScalar(.5).multiply(r), i === void 0 ? Nr.copy(Mr) : (Nr.x = a * Mr.x - i * Mr.y, Nr.y = i * Mr.x + a * Mr.y), e.copy(t), e.x += Nr.x, e.y += Nr.y, e.applyMatrix4(Pr);
}
var Ur = /*@__PURE__*/ new W(), Wr = /*@__PURE__*/ new W(), Gr = /*@__PURE__*/ new W(), Kr = /*@__PURE__*/ new W(), qr = class {
	constructor(e = new W(), t = new W(0, 0, -1)) {
		this.origin = e, this.direction = t;
	}
	set(e, t) {
		return this.origin.copy(e), this.direction.copy(t), this;
	}
	copy(e) {
		return this.origin.copy(e.origin), this.direction.copy(e.direction), this;
	}
	at(e, t) {
		return t.copy(this.origin).addScaledVector(this.direction, e);
	}
	lookAt(e) {
		return this.direction.copy(e).sub(this.origin).normalize(), this;
	}
	recast(e) {
		return this.origin.copy(this.at(e, Ur)), this;
	}
	closestPointToPoint(e, t) {
		t.subVectors(e, this.origin);
		let n = t.dot(this.direction);
		return n < 0 ? t.copy(this.origin) : t.copy(this.origin).addScaledVector(this.direction, n);
	}
	distanceToPoint(e) {
		return Math.sqrt(this.distanceSqToPoint(e));
	}
	distanceSqToPoint(e) {
		let t = Ur.subVectors(e, this.origin).dot(this.direction);
		return t < 0 ? this.origin.distanceToSquared(e) : (Ur.copy(this.origin).addScaledVector(this.direction, t), Ur.distanceToSquared(e));
	}
	distanceSqToSegment(e, t, n, r) {
		Wr.copy(e).add(t).multiplyScalar(.5), Gr.copy(t).sub(e).normalize(), Kr.copy(this.origin).sub(Wr);
		let i = e.distanceTo(t) * .5, a = -this.direction.dot(Gr), o = Kr.dot(this.direction), s = -Kr.dot(Gr), c = Kr.lengthSq(), l = Math.abs(1 - a * a), u, d, f, p;
		if (l > 0) {
			if (u = a * s - o, d = a * o - s, p = i * l, u >= 0) {
				if (d >= -p) {
					if (d <= p) {
						let e = 1 / l;
						u *= e, d *= e, f = u * (u + a * d + 2 * o) + d * (a * u + d + 2 * s) + c;
					} else d = i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
				} else d = -i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
			} else d <= -p ? (u = Math.max(0, -(-a * i + o)), d = u > 0 ? -i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c) : d <= p ? (u = 0, d = Math.min(Math.max(-i, -s), i), f = d * (d + 2 * s) + c) : (u = Math.max(0, -(a * i + o)), d = u > 0 ? i : Math.min(Math.max(-i, -s), i), f = -u * u + d * (d + 2 * s) + c);
		} else d = a > 0 ? -i : i, u = Math.max(0, -(a * d + o)), f = -u * u + d * (d + 2 * s) + c;
		return n && n.copy(this.origin).addScaledVector(this.direction, u), r && r.copy(Wr).addScaledVector(Gr, d), f;
	}
	intersectSphere(e, t) {
		if (e.radius < 0) return null;
		Ur.subVectors(e.center, this.origin);
		let n = Ur.dot(this.direction), r = Ur.dot(Ur) - n * n, i = e.radius * e.radius;
		if (r > i) return null;
		let a = Math.sqrt(i - r), o = n - a, s = n + a;
		return s < 0 ? null : o < 0 ? this.at(s, t) : this.at(o, t);
	}
	intersectsSphere(e) {
		return e.radius < 0 ? !1 : this.distanceSqToPoint(e.center) <= e.radius * e.radius;
	}
	distanceToPlane(e) {
		let t = e.normal.dot(this.direction);
		if (t === 0) return e.distanceToPoint(this.origin) === 0 ? 0 : null;
		let n = -(this.origin.dot(e.normal) + e.constant) / t;
		return n >= 0 ? n : null;
	}
	intersectPlane(e, t) {
		let n = this.distanceToPlane(e);
		return n === null ? null : this.at(n, t);
	}
	intersectsPlane(e) {
		let t = e.distanceToPoint(this.origin);
		return t === 0 || e.normal.dot(this.direction) * t < 0;
	}
	intersectBox(e, t) {
		let n, r, i, a, o, s, c = 1 / this.direction.x, l = 1 / this.direction.y, u = 1 / this.direction.z, d = this.origin;
		return c >= 0 ? (n = (e.min.x - d.x) * c, r = (e.max.x - d.x) * c) : (n = (e.max.x - d.x) * c, r = (e.min.x - d.x) * c), l >= 0 ? (i = (e.min.y - d.y) * l, a = (e.max.y - d.y) * l) : (i = (e.max.y - d.y) * l, a = (e.min.y - d.y) * l), n > a || i > r || ((i > n || isNaN(n)) && (n = i), (a < r || isNaN(r)) && (r = a), u >= 0 ? (o = (e.min.z - d.z) * u, s = (e.max.z - d.z) * u) : (o = (e.max.z - d.z) * u, s = (e.min.z - d.z) * u), n > s || o > r) || ((o > n || n !== n) && (n = o), (s < r || r !== r) && (r = s), r < 0) ? null : this.at(n >= 0 ? n : r, t);
	}
	intersectsBox(e) {
		return this.intersectBox(e, Ur) !== null;
	}
	intersectTriangle(e, t, n, r, i) {
		let a = this.origin, o = this.direction, s = o.x, c = o.y, l = o.z, u = e.x - a.x, d = e.y - a.y, f = e.z - a.z, p = t.x - a.x, m = t.y - a.y, h = t.z - a.z, g = n.x - a.x, _ = n.y - a.y, v = n.z - a.z, y = Math.abs(s), b = Math.abs(c), x = Math.abs(l), S, C, w, T, E, D, O, ee, k, A, j, M;
		if (y >= b && y >= x ? (w = s, D = u, k = p, M = g, s >= 0 ? (S = c, C = l, T = d, E = f, O = m, ee = h, A = _, j = v) : (S = l, C = c, T = f, E = d, O = h, ee = m, A = v, j = _)) : b >= x ? (w = c, D = d, k = m, M = _, c >= 0 ? (S = l, C = s, T = f, E = u, O = h, ee = p, A = v, j = g) : (S = s, C = l, T = u, E = f, O = p, ee = h, A = g, j = v)) : (w = l, D = f, k = h, M = v, l >= 0 ? (S = s, C = c, T = u, E = d, O = p, ee = m, A = g, j = _) : (S = c, C = s, T = d, E = u, O = m, ee = p, A = _, j = g)), w === 0) return null;
		let te = S / w, N = C / w, ne = 1 / w, re = T - te * D, ie = E - N * D, ae = O - te * k, oe = ee - N * k, se = A - te * M, ce = j - N * M, le = se * oe - ce * ae, P = re * ce - ie * se, ue = ae * ie - oe * re;
		if (r) {
			if (le < 0 || P < 0 || ue < 0) return null;
		} else if ((le < 0 || P < 0 || ue < 0) && (le > 0 || P > 0 || ue > 0)) return null;
		let de = le + P + ue;
		if (de === 0) return null;
		let fe = ne * (le * D + P * k + ue * M);
		return (de > 0 ? fe < 0 : fe > 0) ? null : this.at(fe / de, i);
	}
	applyMatrix4(e) {
		return this.origin.applyMatrix4(e), this.direction.transformDirection(e), this;
	}
	equals(e) {
		return e.origin.equals(this.origin) && e.direction.equals(this.direction);
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, Jr = class extends Er {
	constructor(e) {
		super(), this.isMeshBasicMaterial = !0, this.type = "MeshBasicMaterial", this.color = new J(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new Xt(), this.combine = 0, this.reflectivity = 1, this.refractionRatio = .98, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.color.copy(e.color), this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.specularMap = e.specularMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.combine = e.combine, this.reflectivity = e.reflectivity, this.refractionRatio = e.refractionRatio, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.fog = e.fog, this;
	}
}, Yr = /*@__PURE__*/ new Bt(), Xr = /*@__PURE__*/ new qr(), Zr = /*@__PURE__*/ new lr(), Qr = /*@__PURE__*/ new W(), $r = /*@__PURE__*/ new W(), ei = /*@__PURE__*/ new W(), ti = /*@__PURE__*/ new W(), ni = /*@__PURE__*/ new W(), ri = /*@__PURE__*/ new W(), ii = /*@__PURE__*/ new W(), ai = /*@__PURE__*/ new W(), oi = class extends mn {
	constructor(e = new _r(), t = new Jr()) {
		super(), this.isMesh = !0, this.type = "Mesh", this.geometry = e, this.material = t, this.morphTargetDictionary = void 0, this.morphTargetInfluences = void 0, this.count = 1, this.updateMorphTargets();
	}
	copy(e, t) {
		return super.copy(e, t), e.morphTargetInfluences !== void 0 && (this.morphTargetInfluences = e.morphTargetInfluences.slice()), e.morphTargetDictionary !== void 0 && (this.morphTargetDictionary = Object.assign({}, e.morphTargetDictionary)), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
	}
	updateMorphTargets() {
		let e = this.geometry.morphAttributes, t = Object.keys(e);
		if (t.length > 0) {
			let n = e[t[0]];
			if (n !== void 0) {
				this.morphTargetInfluences = [], this.morphTargetDictionary = {};
				for (let e = 0, t = n.length; e < t; e++) {
					let t = n[e].name || String(e);
					this.morphTargetInfluences.push(0), this.morphTargetDictionary[t] = e;
				}
			}
		}
	}
	getVertexPosition(e, t) {
		let n = this.geometry, r = n.attributes.position, i = n.morphAttributes.position, a = n.morphTargetsRelative;
		t.fromBufferAttribute(r, e);
		let o = this.morphTargetInfluences;
		if (i && o) {
			ri.set(0, 0, 0);
			for (let n = 0, r = i.length; n < r; n++) {
				let r = o[n], s = i[n];
				r !== 0 && (ni.fromBufferAttribute(s, e), a ? ri.addScaledVector(ni, r) : ri.addScaledVector(ni.sub(t), r));
			}
			t.add(ri);
		}
		return t;
	}
	intersectsFrustum(e) {
		return e.intersectsObject(this);
	}
	raycast(e, t) {
		let n = this.geometry, r = this.material, i = this.matrixWorld;
		r !== void 0 && (n.boundingSphere === null && n.computeBoundingSphere(), Zr.copy(n.boundingSphere), Zr.applyMatrix4(i), Xr.copy(e.ray).recast(e.near), !(Zr.containsPoint(Xr.origin) === !1 && (Xr.intersectSphere(Zr, Qr) === null || Xr.origin.distanceToSquared(Qr) > (e.far - e.near) ** 2)) && (Yr.copy(i).invert(), Xr.copy(e.ray).applyMatrix4(Yr), (n.boundingBox === null || Xr.intersectsBox(n.boundingBox) !== !1) && this._computeIntersections(e, t, Xr)));
	}
	_computeIntersections(e, t, n) {
		let r, i = this.geometry, a = this.material, o = i.index, s = i.attributes.position, c = i.attributes.uv, l = i.attributes.uv1, u = i.attributes.normal, d = i.groups, f = i.drawRange;
		if (o !== null) {
			if (Array.isArray(a)) for (let i = 0, s = d.length; i < s; i++) {
				let s = d[i], p = a[s.materialIndex], m = Math.max(s.start, f.start), h = Math.min(o.count, Math.min(s.start + s.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = o.getX(i), d = o.getX(i + 1), f = o.getX(i + 2);
					r = ci(this, p, e, n, c, l, u, a, d, f), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = s.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), s = Math.min(o.count, f.start + f.count);
				for (let d = i, f = s; d < f; d += 3) {
					let i = o.getX(d), s = o.getX(d + 1), f = o.getX(d + 2);
					r = ci(this, a, e, n, c, l, u, i, s, f), r && (r.faceIndex = Math.floor(d / 3), t.push(r));
				}
			}
		} else if (s !== void 0) {
			if (Array.isArray(a)) for (let i = 0, o = d.length; i < o; i++) {
				let o = d[i], p = a[o.materialIndex], m = Math.max(o.start, f.start), h = Math.min(s.count, Math.min(o.start + o.count, f.start + f.count));
				for (let i = m, a = h; i < a; i += 3) {
					let a = i, s = i + 1, d = i + 2;
					r = ci(this, p, e, n, c, l, u, a, s, d), r && (r.faceIndex = Math.floor(i / 3), r.face.materialIndex = o.materialIndex, t.push(r));
				}
			}
			else {
				let i = Math.max(0, f.start), o = Math.min(s.count, f.start + f.count);
				for (let s = i, d = o; s < d; s += 3) {
					let i = s, o = s + 1, d = s + 2;
					r = ci(this, a, e, n, c, l, u, i, o, d), r && (r.faceIndex = Math.floor(s / 3), t.push(r));
				}
			}
		}
	}
};
function si(e, t, n, r, i, a, o, s) {
	let c;
	if (c = t.side === 1 ? r.intersectTriangle(o, a, i, !0, s) : r.intersectTriangle(i, a, o, t.side === 0, s), c === null) return null;
	ai.copy(s), ai.applyMatrix4(e.matrixWorld);
	let l = n.ray.origin.distanceTo(ai);
	return l < n.near || l > n.far ? null : {
		distance: l,
		point: ai.clone(),
		object: e
	};
}
function ci(e, t, n, r, i, a, o, s, c, l) {
	e.getVertexPosition(s, $r), e.getVertexPosition(c, ei), e.getVertexPosition(l, ti);
	let u = si(e, t, n, r, $r, ei, ti, ii);
	if (u) {
		let e = new W();
		Ln.getBarycoord(ii, $r, ei, ti, e), i && (u.uv = Ln.getInterpolatedAttribute(i, s, c, l, e, new U())), a && (u.uv1 = Ln.getInterpolatedAttribute(a, s, c, l, e, new U())), o && (u.normal = Ln.getInterpolatedAttribute(o, s, c, l, e, new W()), u.normal.dot(r.direction) > 0 && u.normal.multiplyScalar(-1));
		let t = {
			a: s,
			b: c,
			c: l,
			normal: new W(),
			materialIndex: 0
		};
		Ln.getNormal($r, ei, ti, t.normal), u.face = t, u.barycoord = e;
	}
	return u;
}
var li = class extends Ft {
	constructor(e = null, t = 1, n = 1, r, i, a, o, s, c = m, l = m, u, d) {
		super(null, a, o, s, c, l, r, i, u, d), this.isDataTexture = !0, this.image = {
			data: e,
			width: t,
			height: n
		}, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
	}
}, ui = /*@__PURE__*/ new lr(), di = /*@__PURE__*/ new U(.5, .5), fi = /*@__PURE__*/ new W(), pi = class {
	constructor(e = new wr(), t = new wr(), n = new wr(), r = new wr(), i = new wr(), a = new wr()) {
		this.planes = [
			e,
			t,
			n,
			r,
			i,
			a
		];
	}
	set(e, t, n, r, i, a) {
		let o = this.planes;
		return o[0].copy(e), o[1].copy(t), o[2].copy(n), o[3].copy(r), o[4].copy(i), o[5].copy(a), this;
	}
	copy(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) t[n].copy(e.planes[n]);
		return this;
	}
	setFromProjectionMatrix(e, t = $e, n = !1) {
		let r = this.planes, i = e.elements, a = i[0], o = i[1], s = i[2], c = i[3], l = i[4], u = i[5], d = i[6], f = i[7], p = i[8], m = i[9], h = i[10], g = i[11], _ = i[12], v = i[13], y = i[14], b = i[15];
		if (r[0].setComponents(c - a, f - l, g - p, b - _).normalize(), r[1].setComponents(c + a, f + l, g + p, b + _).normalize(), r[2].setComponents(c + o, f + u, g + m, b + v).normalize(), r[3].setComponents(c - o, f - u, g - m, b - v).normalize(), n) r[4].setComponents(s, d, h, y).normalize(), r[5].setComponents(c - s, f - d, g - h, b - y).normalize();
		else if (r[4].setComponents(c - s, f - d, g - h, b - y).normalize(), t === 2e3) r[5].setComponents(c + s, f + d, g + h, b + y).normalize();
		else if (t === 2001) r[5].setComponents(s, d, h, y).normalize();
		else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + t);
		return this;
	}
	intersectsObject(e) {
		if (e.boundingSphere !== void 0) e.boundingSphere === null && e.computeBoundingSphere(), ui.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);
		else {
			let t = e.geometry;
			t.boundingSphere === null && t.computeBoundingSphere(), ui.copy(t.boundingSphere).applyMatrix4(e.matrixWorld);
		}
		return this.intersectsSphere(ui);
	}
	intersectsSprite(e) {
		return ui.center.set(0, 0, 0), ui.radius = .7071067811865476 + di.distanceTo(e.center), ui.applyMatrix4(e.matrixWorld), this.intersectsSphere(ui);
	}
	intersectsSphere(e) {
		let t = this.planes, n = e.center, r = -e.radius;
		for (let e = 0; e < 6; e++) if (t[e].distanceToPoint(n) < r) return !1;
		return !0;
	}
	intersectsBox(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) {
			let r = t[n];
			if (fi.x = r.normal.x > 0 ? e.max.x : e.min.x, fi.y = r.normal.y > 0 ? e.max.y : e.min.y, fi.z = r.normal.z > 0 ? e.max.z : e.min.z, r.distanceToPoint(fi) < 0) return !1;
		}
		return !0;
	}
	containsPoint(e) {
		let t = this.planes;
		for (let n = 0; n < 6; n++) if (t[n].distanceToPoint(e) < 0) return !1;
		return !0;
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, mi = class extends Ft {
	constructor(e = [], t = 301, n, r, i, a, o, s, c, l) {
		super(e, t, n, r, i, a, o, s, c, l), this.isCubeTexture = !0, this.flipY = !1;
	}
	get images() {
		return this.image;
	}
	set images(e) {
		this.image = e;
	}
}, hi = class extends Ft {
	constructor(e, t, n, r, i, a, o, s, c) {
		super(e, t, n, r, i, a, o, s, c), this.isCanvasTexture = !0, this.needsUpdate = !0;
	}
}, gi = class extends Ft {
	constructor(e, t, n = T, r, i, a, o = m, s = m, c, l = ne, u = 1) {
		if (l !== 1026 && l !== 1027) throw Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
		super({
			width: e,
			height: t,
			depth: u
		}, r, i, a, o, s, l, n, c), this.isDepthTexture = !0, this.flipY = !1, this.generateMipmaps = !1, this.compareFunction = null;
	}
	copy(e) {
		return super.copy(e), this.source = new jt(Object.assign({}, e.image)), this.compareFunction = e.compareFunction, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.compareFunction = this.compareFunction, t;
	}
}, _i = class extends gi {
	constructor(e, t = T, n = 301, r, i, a = m, o = m, s, c = ne) {
		let l = {
			width: e,
			height: e,
			depth: 1
		}, u = [
			l,
			l,
			l,
			l,
			l,
			l
		];
		super(e, e, t, n, r, i, a, o, s, c), this.image = u, this.isCubeDepthTexture = !0, this.isCubeTexture = !0;
	}
	get images() {
		return this.image;
	}
	set images(e) {
		this.image = e;
	}
}, vi = class extends Ft {
	constructor(e = null) {
		super(), this.sourceTexture = e, this.isExternalTexture = !0;
	}
	copy(e) {
		return super.copy(e), this.sourceTexture = e.sourceTexture, this;
	}
}, yi = class e extends _r {
	constructor(e = 1, t = 1, n = 1, r = 1, i = 1, a = 1) {
		super(), this.type = "BoxGeometry", this.parameters = {
			width: e,
			height: t,
			depth: n,
			widthSegments: r,
			heightSegments: i,
			depthSegments: a
		};
		let o = this;
		r = Math.floor(r), i = Math.floor(i), a = Math.floor(a);
		let s = [], c = [], l = [], u = [], d = 0, f = 0;
		p("z", "y", "x", -1, -1, n, t, e, a, i, 0), p("z", "y", "x", 1, -1, n, t, -e, a, i, 1), p("x", "z", "y", 1, 1, e, n, t, r, a, 2), p("x", "z", "y", 1, -1, e, n, -t, r, a, 3), p("x", "y", "z", 1, -1, e, t, n, r, i, 4), p("x", "y", "z", -1, -1, e, t, -n, r, i, 5), this.setIndex(s), this.setAttribute("position", new ar(c, 3)), this.setAttribute("normal", new ar(l, 3)), this.setAttribute("uv", new ar(u, 2));
		function p(e, t, n, r, i, a, p, m, h, g, _) {
			let v = a / h, y = p / g, b = a / 2, x = p / 2, S = m / 2, C = h + 1, w = g + 1, T = 0, E = 0, D = new W();
			for (let a = 0; a < w; a++) {
				let o = a * y - x;
				for (let s = 0; s < C; s++) D[e] = (s * v - b) * r, D[t] = o * i, D[n] = S, c.push(D.x, D.y, D.z), D[e] = 0, D[t] = 0, D[n] = m > 0 ? 1 : -1, l.push(D.x, D.y, D.z), u.push(s / h), u.push(1 - a / g), T += 1;
			}
			for (let e = 0; e < g; e++) for (let t = 0; t < h; t++) {
				let n = d + t + C * e, r = d + t + C * (e + 1), i = d + (t + 1) + C * (e + 1), a = d + (t + 1) + C * e;
				s.push(n, r, a), s.push(r, i, a), E += 6;
			}
			o.addGroup(f, E, _), f += E, d += T;
		}
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.depth, t.widthSegments, t.heightSegments, t.depthSegments);
	}
}, bi = class e extends _r {
	constructor(e = 1, t = 1, n = 1, r = 32, i = 1, a = !1, o = 0, s = Math.PI * 2) {
		super(), this.type = "CylinderGeometry", this.parameters = {
			radiusTop: e,
			radiusBottom: t,
			height: n,
			radialSegments: r,
			heightSegments: i,
			openEnded: a,
			thetaStart: o,
			thetaLength: s
		};
		let c = this;
		r = Math.floor(r), i = Math.floor(i);
		let l = [], u = [], d = [], f = [], p = 0, m = [], h = n / 2, g = 0;
		_(), a === !1 && (e > 0 && v(!0), t > 0 && v(!1)), this.setIndex(l), this.setAttribute("position", new ar(u, 3)), this.setAttribute("normal", new ar(d, 3)), this.setAttribute("uv", new ar(f, 2));
		function _() {
			let a = new W(), _ = new W(), v = 0, y = (t - e) / n;
			for (let c = 0; c <= i; c++) {
				let l = [], g = c / i, v = g * (t - e) + e;
				for (let e = 0; e <= r; e++) {
					let t = e / r, i = t * s + o, c = Math.sin(i), m = Math.cos(i);
					_.x = v * c, _.y = -g * n + h, _.z = v * m, u.push(_.x, _.y, _.z), a.set(c, y, m).normalize(), d.push(a.x, a.y, a.z), f.push(t, 1 - g), l.push(p++);
				}
				m.push(l);
			}
			for (let n = 0; n < r; n++) for (let r = 0; r < i; r++) {
				let a = m[r][n], o = m[r + 1][n], s = m[r + 1][n + 1], c = m[r][n + 1];
				(e > 0 || r !== 0) && (l.push(a, o, c), v += 3), (t > 0 || r !== i - 1) && (l.push(o, s, c), v += 3);
			}
			c.addGroup(g, v, 0), g += v;
		}
		function v(n) {
			let i = p, a = new U(), m = new W(), _ = 0, v = n === !0 ? e : t, y = n === !0 ? 1 : -1;
			for (let e = 1; e <= r; e++) u.push(0, h * y, 0), d.push(0, y, 0), f.push(.5, .5), p++;
			let b = p;
			for (let e = 0; e <= r; e++) {
				let t = e / r * s + o, n = Math.cos(t), i = Math.sin(t);
				m.x = v * i, m.y = h * y, m.z = v * n, u.push(m.x, m.y, m.z), d.push(0, y, 0), a.x = n * .5 + .5, a.y = i * .5 * y + .5, f.push(a.x, a.y), p++;
			}
			for (let e = 0; e < r; e++) {
				let t = i + e, r = b + e;
				n === !0 ? l.push(r, r + 1, t) : l.push(r + 1, r, t), _ += 3;
			}
			c.addGroup(g, _, n === !0 ? 1 : 2), g += _;
		}
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.radiusTop, t.radiusBottom, t.height, t.radialSegments, t.heightSegments, t.openEnded, t.thetaStart, t.thetaLength);
	}
}, xi = class e extends bi {
	constructor(e = 1, t = 1, n = 32, r = 1, i = !1, a = 0, o = Math.PI * 2) {
		super(0, e, t, n, r, i, a, o), this.type = "ConeGeometry", this.parameters = {
			radius: e,
			height: t,
			radialSegments: n,
			heightSegments: r,
			openEnded: i,
			thetaStart: a,
			thetaLength: o
		};
	}
	static fromJSON(t) {
		return new e(t.radius, t.height, t.radialSegments, t.heightSegments, t.openEnded, t.thetaStart, t.thetaLength);
	}
}, Si = class e extends _r {
	constructor(e = 1, t = 1, n = 1, r = 1) {
		super(), this.type = "PlaneGeometry", this.parameters = {
			width: e,
			height: t,
			widthSegments: n,
			heightSegments: r
		};
		let i = e / 2, a = t / 2, o = Math.floor(n), s = Math.floor(r), c = o + 1, l = s + 1, u = e / o, d = t / s, f = [], p = [], m = [], h = [];
		for (let e = 0; e < l; e++) {
			let t = e * d - a;
			for (let n = 0; n < c; n++) {
				let r = n * u - i;
				p.push(r, -t, 0), m.push(0, 0, 1), h.push(n / o), h.push(1 - e / s);
			}
		}
		for (let e = 0; e < s; e++) for (let t = 0; t < o; t++) {
			let n = t + c * e, r = t + c * (e + 1), i = t + 1 + c * (e + 1), a = t + 1 + c * e;
			f.push(n, r, a), f.push(r, i, a);
		}
		this.setIndex(f), this.setAttribute("position", new ar(p, 3)), this.setAttribute("normal", new ar(m, 3)), this.setAttribute("uv", new ar(h, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.width, t.height, t.widthSegments, t.heightSegments);
	}
}, Ci = class e extends _r {
	constructor(e = 1, t = 32, n = 16, r = 0, i = Math.PI * 2, a = 0, o = Math.PI) {
		super(), this.type = "SphereGeometry", this.parameters = {
			radius: e,
			widthSegments: t,
			heightSegments: n,
			phiStart: r,
			phiLength: i,
			thetaStart: a,
			thetaLength: o
		}, t = Math.max(3, Math.floor(t)), n = Math.max(2, Math.floor(n));
		let s = Math.min(a + o, Math.PI), c = 0, l = [], u = new W(), d = new W(), f = [], p = [], m = [], h = [];
		for (let f = 0; f <= n; f++) {
			let g = [], _ = f / n, v = a + _ * o, y = e * Math.cos(v), b = Math.sqrt(e * e - y * y), x = 0;
			f === 0 && a === 0 ? x = .5 / t : f === n && s === Math.PI && (x = -.5 / t);
			for (let e = 0; e <= t; e++) {
				let n = e / t, a = r + n * i;
				u.x = -b * Math.cos(a), u.y = y, u.z = b * Math.sin(a), p.push(u.x, u.y, u.z), d.copy(u).normalize(), m.push(d.x, d.y, d.z), h.push(n + x, 1 - _), g.push(c++);
			}
			l.push(g);
		}
		for (let e = 0; e < n; e++) for (let r = 0; r < t; r++) {
			let t = l[e][r + 1], i = l[e][r], o = l[e + 1][r], c = l[e + 1][r + 1];
			(e !== 0 || a > 0) && f.push(t, i, c), (e !== n - 1 || s < Math.PI) && f.push(i, o, c);
		}
		this.setIndex(f), this.setAttribute("position", new ar(p, 3)), this.setAttribute("normal", new ar(m, 3)), this.setAttribute("uv", new ar(h, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.radius, t.widthSegments, t.heightSegments, t.phiStart, t.phiLength, t.thetaStart, t.thetaLength);
	}
}, wi = class e extends _r {
	constructor(e = 1, t = .4, n = 12, r = 48, i = Math.PI * 2, a = 0, o = Math.PI * 2) {
		super(), this.type = "TorusGeometry", this.parameters = {
			radius: e,
			tube: t,
			radialSegments: n,
			tubularSegments: r,
			arc: i,
			thetaStart: a,
			thetaLength: o
		}, n = Math.floor(n), r = Math.floor(r);
		let s = [], c = [], l = [], u = [], d = new W(), f = new W(), p = new W();
		for (let s = 0; s <= n; s++) {
			let m = a + s / n * o;
			for (let a = 0; a <= r; a++) {
				let o = a / r * i;
				f.x = (e + t * Math.cos(m)) * Math.cos(o), f.y = (e + t * Math.cos(m)) * Math.sin(o), f.z = t * Math.sin(m), c.push(f.x, f.y, f.z), d.x = e * Math.cos(o), d.y = e * Math.sin(o), p.subVectors(f, d).normalize(), l.push(p.x, p.y, p.z), u.push(a / r), u.push(s / n);
			}
		}
		for (let e = 1; e <= n; e++) for (let t = 1; t <= r; t++) {
			let n = (r + 1) * e + t - 1, i = (r + 1) * (e - 1) + t - 1, a = (r + 1) * (e - 1) + t, o = (r + 1) * e + t;
			s.push(n, i, o), s.push(i, a, o);
		}
		this.setIndex(s), this.setAttribute("position", new ar(c, 3)), this.setAttribute("normal", new ar(l, 3)), this.setAttribute("uv", new ar(u, 2));
	}
	copy(e) {
		return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
	}
	static fromJSON(t) {
		return new e(t.radius, t.tube, t.radialSegments, t.tubularSegments, t.arc, t.thetaStart, t.thetaLength);
	}
};
function Ti(e) {
	let t = {};
	for (let n in e) {
		t[n] = {};
		for (let r in e[n]) {
			let i = e[n][r];
			if (Di(i)) i.isRenderTargetTexture ? (B("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."), t[n][r] = null) : t[n][r] = i.clone();
			else if (Array.isArray(i)) {
				if (Di(i[0])) {
					let e = [];
					for (let t = 0, n = i.length; t < n; t++) e[t] = i[t].clone();
					t[n][r] = e;
				} else t[n][r] = i.slice();
			} else t[n][r] = i;
		}
	}
	return t;
}
function Ei(e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = Ti(e[n]);
		for (let e in r) t[e] = r[e];
	}
	return t;
}
function Di(e) {
	return e && (e.isColor || e.isMatrix3 || e.isMatrix4 || e.isVector2 || e.isVector3 || e.isVector4 || e.isTexture || e.isQuaternion);
}
function Oi(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) t.push(e[n].clone());
	return t;
}
function ki(e) {
	let t = e.getRenderTarget();
	return t === null ? e.outputColorSpace : t.isXRRenderTarget === !0 ? t.texture.colorSpace : K.workingColorSpace;
}
var Ai = {
	clone: Ti,
	merge: Ei
}, ji = "void main() {\n	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}", Mi = "void main() {\n	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );\n}", Ni = class extends Er {
	constructor(e) {
		super(), this.isShaderMaterial = !0, this.type = "ShaderMaterial", this.defines = {}, this.uniforms = {}, this.uniformsGroups = [], this.vertexShader = ji, this.fragmentShader = Mi, this.linewidth = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.fog = !1, this.lights = !1, this.clipping = !1, this.forceSinglePass = !0, this.extensions = {
			clipCullDistance: !1,
			multiDraw: !1
		}, this.defaultAttributeValues = {
			color: [
				1,
				1,
				1
			],
			uv: [0, 0],
			uv1: [0, 0]
		}, this.index0AttributeName = void 0, this.uniformsNeedUpdate = !1, this.glslVersion = null, e !== void 0 && this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.fragmentShader = e.fragmentShader, this.vertexShader = e.vertexShader, this.uniforms = Ti(e.uniforms), this.uniformsGroups = Oi(e.uniformsGroups), this.defines = Object.assign({}, e.defines), this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.fog = e.fog, this.lights = e.lights, this.clipping = e.clipping, this.extensions = Object.assign({}, e.extensions), this.glslVersion = e.glslVersion, this.defaultAttributeValues = Object.assign({}, e.defaultAttributeValues), this.index0AttributeName = e.index0AttributeName, this.uniformsNeedUpdate = e.uniformsNeedUpdate, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		t.glslVersion = this.glslVersion, t.uniforms = {};
		for (let n in this.uniforms) {
			let r = this.uniforms[n].value;
			r && r.isTexture ? t.uniforms[n] = {
				type: "t",
				value: r.toJSON(e).uuid
			} : r && r.isColor ? t.uniforms[n] = {
				type: "c",
				value: r.getHex()
			} : r && r.isVector2 ? t.uniforms[n] = {
				type: "v2",
				value: r.toArray()
			} : r && r.isVector3 ? t.uniforms[n] = {
				type: "v3",
				value: r.toArray()
			} : r && r.isVector4 ? t.uniforms[n] = {
				type: "v4",
				value: r.toArray()
			} : r && r.isMatrix3 ? t.uniforms[n] = {
				type: "m3",
				value: r.toArray()
			} : r && r.isMatrix4 ? t.uniforms[n] = {
				type: "m4",
				value: r.toArray()
			} : t.uniforms[n] = { value: r };
		}
		Object.keys(this.defines).length > 0 && (t.defines = this.defines), t.vertexShader = this.vertexShader, t.fragmentShader = this.fragmentShader, t.lights = this.lights, t.clipping = this.clipping;
		let n = {};
		for (let e in this.extensions) this.extensions[e] === !0 && (n[e] = !0);
		return Object.keys(n).length > 0 && (t.extensions = n), t;
	}
	fromJSON(e, t) {
		if (super.fromJSON(e, t), e.uniforms !== void 0) for (let n in e.uniforms) {
			let r = e.uniforms[n];
			switch (this.uniforms[n] = {}, r.type) {
				case "t":
					this.uniforms[n].value = t[r.value] || null;
					break;
				case "c":
					this.uniforms[n].value = new J().setHex(r.value);
					break;
				case "v2":
					this.uniforms[n].value = new U().fromArray(r.value);
					break;
				case "v3":
					this.uniforms[n].value = new W().fromArray(r.value);
					break;
				case "v4":
					this.uniforms[n].value = new It().fromArray(r.value);
					break;
				case "m3":
					this.uniforms[n].value = new G().fromArray(r.value);
					break;
				case "m4":
					this.uniforms[n].value = new Bt().fromArray(r.value);
					break;
				default: this.uniforms[n].value = r.value;
			}
		}
		if (e.defines !== void 0 && (this.defines = e.defines), e.vertexShader !== void 0 && (this.vertexShader = e.vertexShader), e.fragmentShader !== void 0 && (this.fragmentShader = e.fragmentShader), e.glslVersion !== void 0 && (this.glslVersion = e.glslVersion), e.extensions !== void 0) for (let t in e.extensions) this.extensions[t] = e.extensions[t];
		return e.lights !== void 0 && (this.lights = e.lights), e.clipping !== void 0 && (this.clipping = e.clipping), this;
	}
}, Pi = class extends Ni {
	constructor(e) {
		super(e), this.isRawShaderMaterial = !0, this.type = "RawShaderMaterial";
	}
}, Fi = class extends Er {
	constructor(e) {
		super(), this.isMeshStandardMaterial = !0, this.type = "MeshStandardMaterial", this.defines = { STANDARD: "" }, this.color = new J(16777215), this.roughness = 1, this.metalness = 0, this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.emissive = new J(0), this.emissiveIntensity = 1, this.emissiveMap = null, this.bumpMap = null, this.bumpScale = 1, this.normalMap = null, this.normalMapType = 0, this.normalScale = new U(1, 1), this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.roughnessMap = null, this.metalnessMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new Xt(), this.envMapIntensity = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.flatShading = !1, this.fog = !0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.defines = { STANDARD: "" }, this.color.copy(e.color), this.roughness = e.roughness, this.metalness = e.metalness, this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.emissive.copy(e.emissive), this.emissiveMap = e.emissiveMap, this.emissiveIntensity = e.emissiveIntensity, this.bumpMap = e.bumpMap, this.bumpScale = e.bumpScale, this.normalMap = e.normalMap, this.normalMapType = e.normalMapType, this.normalScale.copy(e.normalScale), this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.roughnessMap = e.roughnessMap, this.metalnessMap = e.metalnessMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.envMapIntensity = e.envMapIntensity, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.flatShading = e.flatShading, this.fog = e.fog, this;
	}
}, Ii = class extends Er {
	constructor(e) {
		super(), this.isMeshDepthMaterial = !0, this.type = "MeshDepthMaterial", this.depthPacking = Ke, this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.wireframe = !1, this.wireframeLinewidth = 1, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.depthPacking = e.depthPacking, this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this;
	}
}, Li = class extends Er {
	constructor(e) {
		super(), this.isMeshDistanceMaterial = !0, this.type = "MeshDistanceMaterial", this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.setValues(e);
	}
	copy(e) {
		return super.copy(e), this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this;
	}
};
function Ri(e, t) {
	return !e || e.constructor === t ? e : typeof t.BYTES_PER_ELEMENT == "number" ? new t(e) : Array.prototype.slice.call(e);
}
function zi(e) {
	return e !== void 0 && e.inTangents !== void 0 && e.outTangents !== void 0;
}
var Bi = class {
	constructor(e, t, n, r) {
		this.parameterPositions = e, this._cachedIndex = 0, this.resultBuffer = r === void 0 ? new t.constructor(n) : r, this.sampleValues = t, this.valueSize = n, this.settings = null, this.DefaultSettings_ = {};
	}
	evaluate(e) {
		let t = this.parameterPositions, n = this._cachedIndex, r = t[n], i = t[n - 1];
		validate_interval: {
			seek: {
				let a;
				linear_scan: {
					forward_scan: if (!(e < r)) {
						for (let a = n + 2;;) {
							if (r === void 0) {
								if (e < i) break forward_scan;
								return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
							}
							if (n === a) break;
							if (i = r, r = t[++n], e < r) break seek;
						}
						a = t.length;
						break linear_scan;
					}
					if (!(e >= i)) {
						let o = t[1];
						e < o && (n = 2, i = o);
						for (let a = n - 2;;) {
							if (i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
							if (n === a) break;
							if (r = i, i = t[--n - 1], e >= i) break seek;
						}
						a = n, n = 0;
						break linear_scan;
					}
					break validate_interval;
				}
				for (; n < a;) {
					let r = n + a >>> 1;
					e < t[r] ? a = r : n = r + 1;
				}
				if (r = t[n], i = t[n - 1], i === void 0) return this._cachedIndex = 0, this.copySampleValue_(0);
				if (r === void 0) return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
			}
			this._cachedIndex = n, this.intervalChanged_(n, i, r);
		}
		return this.interpolate_(n, i, e, r);
	}
	getSettings_() {
		return this.settings || this.DefaultSettings_;
	}
	copySampleValue_(e) {
		let t = this.resultBuffer, n = this.sampleValues, r = this.valueSize, i = e * r;
		for (let e = 0; e !== r; ++e) t[e] = n[i + e];
		return t;
	}
	interpolate_() {
		throw Error("THREE.Interpolant: Call to abstract method.");
	}
	intervalChanged_() {}
}, Vi = class extends Bi {
	constructor(e, t, n, r) {
		super(e, t, n, r), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = {
			endingStart: Ue,
			endingEnd: Ue
		};
	}
	intervalChanged_(e, t, n) {
		let r = this.parameterPositions, i = e - 2, a = e + 1, o = r[i], s = r[a];
		if (o === void 0) switch (this.getSettings_().endingStart) {
			case We:
				i = e, o = 2 * t - n;
				break;
			case Ge:
				i = r.length - 2, o = t + r[i] - r[i + 1];
				break;
			default: i = e, o = n;
		}
		if (s === void 0) switch (this.getSettings_().endingEnd) {
			case We:
				a = e, s = 2 * n - t;
				break;
			case Ge:
				a = 1, s = n + r[1] - r[0];
				break;
			default: a = e - 1, s = t;
		}
		let c = (n - t) * .5, l = this.valueSize;
		this._weightPrev = c / (t - o), this._weightNext = c / (s - n), this._offsetPrev = i * l, this._offsetNext = a * l;
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = this._offsetPrev, u = this._offsetNext, d = this._weightPrev, f = this._weightNext, p = (n - t) / (r - t), m = p * p, h = m * p, g = -d * h + 2 * d * m - d * p, _ = (1 + d) * h + (-1.5 - 2 * d) * m + (-.5 + d) * p + 1, v = (-1 - f) * h + (1.5 + f) * m + .5 * p, y = f * h - f * m;
		for (let e = 0; e !== o; ++e) i[e] = g * a[l + e] + _ * a[c + e] + v * a[s + e] + y * a[u + e];
		return i;
	}
}, Hi = class extends Bi {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = (n - t) / (r - t), u = 1 - l;
		for (let e = 0; e !== o; ++e) i[e] = a[c + e] * u + a[s + e] * l;
		return i;
	}
}, Ui = class extends Bi {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e) {
		return this.copySampleValue_(e - 1);
	}
}, Wi = class extends Bi {
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = e * o, c = s - o, l = this.inTangents, u = this.outTangents;
		if (!l || !u) {
			let e = (n - t) / (r - t), l = 1 - e;
			for (let t = 0; t !== o; ++t) i[t] = a[c + t] * l + a[s + t] * e;
			return i;
		}
		let d = o * 2, f = e - 1;
		for (let p = 0; p !== o; ++p) {
			let o = a[c + p], m = a[s + p], h = f * d + p * 2, g = u[h], _ = u[h + 1], v = e * d + p * 2, y = l[v], b = l[v + 1], x = qi(n, t, g, y, r);
			i[p] = Gi(x, o, _, b, m);
		}
		return i;
	}
};
function Gi(e, t, n, r, i) {
	let a = 1 - e;
	return a * a * a * t + 3 * a * a * e * n + 3 * a * e * e * r + e * e * e * i;
}
function Ki(e, t, n, r, i) {
	let a = 1 - e;
	return 3 * a * a * (n - t) + 6 * a * e * (r - n) + 3 * e * e * (i - r);
}
function qi(e, t, n, r, i) {
	let a = (e - t) / (i - t);
	for (let o = 0; o < 8; o++) {
		let o = Gi(a, t, n, r, i) - e;
		if (Math.abs(o) < 1e-10) break;
		let s = Ki(a, t, n, r, i);
		if (Math.abs(s) < 1e-10) break;
		a = Math.max(0, Math.min(1, a - o / s));
	}
	return a;
}
var Ji = class {
	constructor(e, t, n, r) {
		if (e === void 0) throw Error("THREE.KeyframeTrack: track name is undefined");
		if (t === void 0 || t.length === 0) throw Error("THREE.KeyframeTrack: no keyframes in track named " + e);
		this.name = e, this.times = Ri(t, this.TimeBufferType), this.values = Ri(n, this.ValueBufferType), this.setInterpolation(r || this.DefaultInterpolation);
	}
	static toJSON(e) {
		let t = e.constructor, n;
		if (t.toJSON !== this.toJSON) n = t.toJSON(e);
		else {
			n = {
				name: e.name,
				times: Ri(e.times, Array),
				values: Ri(e.values, Array)
			};
			let t = e.getInterpolation();
			t !== e.DefaultInterpolation && (n.interpolation = t), zi(e.settings) && (n.settings = {
				inTangents: Ri(e.settings.inTangents, Array),
				outTangents: Ri(e.settings.outTangents, Array)
			});
		}
		return n.type = e.ValueTypeName, n;
	}
	InterpolantFactoryMethodDiscrete(e) {
		return new Ui(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodLinear(e) {
		return new Hi(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodSmooth(e) {
		return new Vi(this.times, this.values, this.getValueSize(), e);
	}
	InterpolantFactoryMethodBezier(e) {
		let t = new Wi(this.times, this.values, this.getValueSize(), e);
		return this.settings && (t.inTangents = this.settings.inTangents, t.outTangents = this.settings.outTangents), t;
	}
	setInterpolation(e) {
		let t;
		switch (e) {
			case ze:
				t = this.InterpolantFactoryMethodDiscrete;
				break;
			case Be:
				t = this.InterpolantFactoryMethodLinear;
				break;
			case Ve:
				t = this.InterpolantFactoryMethodSmooth;
				break;
			case He: t = this.InterpolantFactoryMethodBezier;
		}
		if (t === void 0) {
			let t = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
			if (this.createInterpolant === void 0) {
				if (e !== this.DefaultInterpolation) this.setInterpolation(this.DefaultInterpolation);
				else throw Error(t);
			}
			return B("KeyframeTrack:", t), this;
		}
		return this.createInterpolant = t, this;
	}
	getInterpolation() {
		switch (this.createInterpolant) {
			case this.InterpolantFactoryMethodDiscrete: return ze;
			case this.InterpolantFactoryMethodLinear: return Be;
			case this.InterpolantFactoryMethodSmooth: return Ve;
			case this.InterpolantFactoryMethodBezier: return He;
		}
	}
	getValueSize() {
		return this.values.length / this.times.length;
	}
	shift(e) {
		if (e !== 0) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] += e;
		}
		return this;
	}
	scale(e) {
		if (e !== 1) {
			let t = this.times;
			for (let n = 0, r = t.length; n !== r; ++n) t[n] *= e;
			zi(this.settings) && (Yi(this.settings.inTangents, e), Yi(this.settings.outTangents, e));
		}
		return this;
	}
	trim(e, t) {
		let n = this.times, r = n.length, i = 0, a = r - 1;
		for (; i !== r && n[i] < e;) ++i;
		for (; a !== -1 && n[a] > t;) --a;
		if (++a, i !== 0 || a !== r) {
			i >= a && (a = Math.max(a, 1), i = a - 1);
			let e = this.getValueSize();
			this.times = n.slice(i, a), this.values = this.values.slice(i * e, a * e);
		}
		return this;
	}
	validate() {
		let e = !0, t = this.getValueSize();
		t - Math.floor(t) !== 0 && (V("KeyframeTrack: Invalid value size in track.", this), e = !1);
		let n = this.times, r = this.values, i = n.length;
		i === 0 && (V("KeyframeTrack: Track is empty.", this), e = !1);
		let a = null;
		for (let t = 0; t !== i; t++) {
			let r = n[t];
			if (typeof r == "number" && isNaN(r)) {
				V("KeyframeTrack: Time is not a valid number.", this, t, r), e = !1;
				break;
			}
			if (a !== null && a > r) {
				V("KeyframeTrack: Out of order keys.", this, t, r, a), e = !1;
				break;
			}
			a = r;
		}
		if (r !== void 0 && tt(r)) for (let t = 0, n = r.length; t !== n; ++t) {
			let n = r[t];
			if (isNaN(n)) {
				V("KeyframeTrack: Value is not a valid number.", this, t, n), e = !1;
				break;
			}
		}
		return e;
	}
	optimize() {
		let e = this.times.slice(), t = this.values.slice(), n = this.getValueSize(), r = this.getInterpolation() === Ve, i = e.length - 1, a = 1;
		for (let o = 1; o < i; ++o) {
			let i = !1, s = e[o];
			if (s !== e[o + 1] && (o !== 1 || s !== e[0])) {
				if (r) i = !0;
				else {
					let e = o * n, r = e - n, a = e + n;
					for (let o = 0; o !== n; ++o) {
						let n = t[e + o];
						if (n !== t[r + o] || n !== t[a + o]) {
							i = !0;
							break;
						}
					}
				}
			}
			if (i) {
				if (o !== a) {
					e[a] = e[o];
					let r = o * n, i = a * n;
					for (let e = 0; e !== n; ++e) t[i + e] = t[r + e];
				}
				++a;
			}
		}
		if (i > 0) {
			e[a] = e[i];
			for (let e = i * n, r = a * n, o = 0; o !== n; ++o) t[r + o] = t[e + o];
			++a;
		}
		return a === e.length ? (this.times = e, this.values = t) : (this.times = e.slice(0, a), this.values = t.slice(0, a * n)), this;
	}
	clone() {
		let e = this.times.slice(), t = this.values.slice(), n = this.constructor, r = new n(this.name, e, t);
		return r.createInterpolant = this.createInterpolant, zi(this.settings) && (r.settings = {
			inTangents: this.settings.inTangents.slice(),
			outTangents: this.settings.outTangents.slice()
		}), r;
	}
};
function Yi(e, t) {
	for (let n = 0, r = e.length; n !== r; n += 2) e[n] *= t;
}
Ji.prototype.ValueTypeName = "", Ji.prototype.TimeBufferType = Float32Array, Ji.prototype.ValueBufferType = Float32Array, Ji.prototype.DefaultInterpolation = Be;
var Y = class extends Ji {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
Y.prototype.ValueTypeName = "bool", Y.prototype.ValueBufferType = Array, Y.prototype.DefaultInterpolation = ze, Y.prototype.InterpolantFactoryMethodLinear = void 0, Y.prototype.InterpolantFactoryMethodSmooth = void 0;
var Xi = class extends Ji {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Xi.prototype.ValueTypeName = "color";
var Zi = class extends Ji {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
Zi.prototype.ValueTypeName = "number";
var Qi = class extends Bi {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	interpolate_(e, t, n, r) {
		let i = this.resultBuffer, a = this.sampleValues, o = this.valueSize, s = (n - t) / (r - t), c = e * o;
		for (let e = c + o; c !== e; c += 4) yt.slerpFlat(i, 0, a, c - o, a, c, s);
		return i;
	}
}, $i = class extends Ji {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
	InterpolantFactoryMethodLinear(e) {
		return new Qi(this.times, this.values, this.getValueSize(), e);
	}
};
$i.prototype.ValueTypeName = "quaternion", $i.prototype.InterpolantFactoryMethodSmooth = void 0;
var ea = class extends Ji {
	constructor(e, t, n) {
		super(e, t, n);
	}
};
ea.prototype.ValueTypeName = "string", ea.prototype.ValueBufferType = Array, ea.prototype.DefaultInterpolation = ze, ea.prototype.InterpolantFactoryMethodLinear = void 0, ea.prototype.InterpolantFactoryMethodSmooth = void 0;
var ta = class extends Ji {
	constructor(e, t, n, r) {
		super(e, t, n, r);
	}
};
ta.prototype.ValueTypeName = "vector";
var na = class extends mn {
	constructor(e, t = 1) {
		super(), this.isLight = !0, this.type = "Light", this.color = new J(e), this.intensity = t;
	}
	copy(e, t) {
		return super.copy(e, t), this.color.copy(e.color), this.intensity = e.intensity, this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.color = this.color.getHex(), t.object.intensity = this.intensity, t;
	}
}, ra = /*@__PURE__*/ new Bt(), ia = /*@__PURE__*/ new W(), aa = /*@__PURE__*/ new W(), oa = class {
	constructor(e) {
		this.camera = e, this.intensity = 1, this.bias = 0, this.biasNode = null, this.normalBias = 0, this.radius = 1, this.blurSamples = 8, this.mapSize = new U(512, 512), this.mapType = b, this.map = null, this.mapPass = null, this.matrix = new Bt(), this.autoUpdate = !0, this.needsUpdate = !1, this._frustum = new pi(), this._frameExtents = new U(1, 1), this._viewportCount = 1, this._viewports = [new It(0, 0, 1, 1)];
	}
	getViewportCount() {
		return this._viewportCount;
	}
	getCamera() {
		return this.camera;
	}
	getFrustum() {
		return this._frustum;
	}
	updateMatrices(e) {
		let t = this.camera;
		ia.setFromMatrixPosition(e.matrixWorld), t.position.copy(ia), aa.setFromMatrixPosition(e.target.matrixWorld), t.lookAt(aa), t.updateMatrixWorld(), this._updateMatrix(t, this.matrix, this._frustum);
	}
	_updateMatrix(e, t, n, r) {
		ra.multiplyMatrices(e.projectionMatrix, e.matrixWorldInverse), n.setFromProjectionMatrix(ra, e.coordinateSystem, e.reversedDepth);
		let i = this._frameExtents, a = r ? r.z / i.x : 1, o = r ? r.w / i.y : 1, s = r ? r.x / i.x : 0, c = r ? r.y / i.y : 0;
		e.coordinateSystem === 2001 || e.reversedDepth ? t.set(.5 * a, 0, 0, .5 * a + s, 0, .5 * o, 0, .5 * o + c, 0, 0, 1, 0, 0, 0, 0, 1) : t.set(.5 * a, 0, 0, .5 * a + s, 0, .5 * o, 0, .5 * o + c, 0, 0, .5, .5, 0, 0, 0, 1), t.multiply(ra);
	}
	getViewport(e) {
		return this._viewports[e];
	}
	getFrameExtents() {
		return this._frameExtents;
	}
	dispose() {
		this.map && this.map.dispose(), this.mapPass && this.mapPass.dispose();
	}
	copy(e) {
		return this.camera = e.camera.clone(), this.intensity = e.intensity, this.bias = e.bias, this.radius = e.radius, this.autoUpdate = e.autoUpdate, this.needsUpdate = e.needsUpdate, this.normalBias = e.normalBias, this.blurSamples = e.blurSamples, this.mapSize.copy(e.mapSize), this.biasNode = e.biasNode, this;
	}
	clone() {
		return new this.constructor().copy(this);
	}
	toJSON() {
		let e = {};
		return e.intensity = this.intensity, e.bias = this.bias, e.normalBias = this.normalBias, e.radius = this.radius, e.blurSamples = this.blurSamples, e.mapSize = this.mapSize.toArray(), e.camera = this.camera.toJSON(!1).object, delete e.camera.matrix, e;
	}
}, sa = /*@__PURE__*/ new W(), ca = /*@__PURE__*/ new yt(), la = /*@__PURE__*/ new W(), ua = class extends mn {
	constructor() {
		super(), this.isCamera = !0, this.type = "Camera", this.matrixWorldInverse = new Bt(), this.projectionMatrix = new Bt(), this.projectionMatrixInverse = new Bt(), this.coordinateSystem = $e, this._reversedDepth = !1;
	}
	get reversedDepth() {
		return this._reversedDepth;
	}
	copy(e, t) {
		return super.copy(e, t), this.matrixWorldInverse.copy(e.matrixWorldInverse), this.projectionMatrix.copy(e.projectionMatrix), this.projectionMatrixInverse.copy(e.projectionMatrixInverse), this.coordinateSystem = e.coordinateSystem, this;
	}
	getWorldDirection(e) {
		return super.getWorldDirection(e).negate();
	}
	updateMatrixWorld(e) {
		super.updateMatrixWorld(e), this.matrixWorld.decompose(sa, ca, la), la.x === 1 && la.y === 1 && la.z === 1 ? this.matrixWorldInverse.copy(this.matrixWorld).invert() : this.matrixWorldInverse.compose(sa, ca, la.set(1, 1, 1)).invert();
	}
	updateWorldMatrix(e, t, n = !1) {
		super.updateWorldMatrix(e, t, n), this.matrixWorld.decompose(sa, ca, la), la.x === 1 && la.y === 1 && la.z === 1 ? this.matrixWorldInverse.copy(this.matrixWorld).invert() : this.matrixWorldInverse.compose(sa, ca, la.set(1, 1, 1)).invert();
	}
	clone() {
		return new this.constructor().copy(this);
	}
}, da = /*@__PURE__*/ new W(), fa = /*@__PURE__*/ new U(), pa = /*@__PURE__*/ new U(), ma = class extends ua {
	constructor(e = 50, t = 1, n = .1, r = 2e3) {
		super(), this.isPerspectiveCamera = !0, this.type = "PerspectiveCamera", this.fov = e, this.zoom = 1, this.near = n, this.far = r, this.focus = 10, this.aspect = t, this.view = null, this.filmGauge = 35, this.filmOffset = 0, this.updateProjectionMatrix();
	}
	copy(e, t) {
		return super.copy(e, t), this.fov = e.fov, this.zoom = e.zoom, this.near = e.near, this.far = e.far, this.focus = e.focus, this.aspect = e.aspect, this.view = e.view === null ? null : Object.assign({}, e.view), this.filmGauge = e.filmGauge, this.filmOffset = e.filmOffset, this;
	}
	setFocalLength(e) {
		let t = .5 * this.getFilmHeight() / e;
		this.fov = pt * 2 * Math.atan(t), this.updateProjectionMatrix();
	}
	getFocalLength() {
		let e = Math.tan(ft * .5 * this.fov);
		return .5 * this.getFilmHeight() / e;
	}
	getEffectiveFOV() {
		return pt * 2 * Math.atan(Math.tan(ft * .5 * this.fov) / this.zoom);
	}
	getFilmWidth() {
		return this.filmGauge * Math.min(this.aspect, 1);
	}
	getFilmHeight() {
		return this.filmGauge / Math.max(this.aspect, 1);
	}
	getViewBounds(e, t, n) {
		da.set(-1, -1, .5).applyMatrix4(this.projectionMatrixInverse), t.set(da.x, da.y).multiplyScalar(-e / da.z), da.set(1, 1, .5).applyMatrix4(this.projectionMatrixInverse), n.set(da.x, da.y).multiplyScalar(-e / da.z);
	}
	getViewSize(e, t) {
		return this.getViewBounds(e, fa, pa), t.subVectors(pa, fa);
	}
	setViewOffset(e, t, n, r, i, a) {
		this.aspect = e / t, this.view === null && (this.view = {
			enabled: !0,
			fullWidth: 1,
			fullHeight: 1,
			offsetX: 0,
			offsetY: 0,
			width: 1,
			height: 1
		}), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = r, this.view.width = i, this.view.height = a, this.updateProjectionMatrix();
	}
	clearViewOffset() {
		this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = this.near, t = e * Math.tan(ft * .5 * this.fov) / this.zoom, n = 2 * t, r = this.aspect * n, i = -.5 * r, a = this.view;
		if (this.view !== null && this.view.enabled) {
			let e = a.fullWidth, o = a.fullHeight;
			i += a.offsetX * r / e, t -= a.offsetY * n / o, r *= a.width / e, n *= a.height / o;
		}
		let o = this.filmOffset;
		o !== 0 && (i += e * o / this.getFilmWidth()), this.projectionMatrix.makePerspective(i, i + r, t, t - n, e, this.far, this.coordinateSystem, this.reversedDepth), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.fov = this.fov, t.object.zoom = this.zoom, t.object.near = this.near, t.object.far = this.far, t.object.focus = this.focus, t.object.aspect = this.aspect, this.view !== null && (t.object.view = Object.assign({}, this.view)), t.object.filmGauge = this.filmGauge, t.object.filmOffset = this.filmOffset, t;
	}
}, ha = class extends oa {
	constructor() {
		super(new ma(90, 1, .5, 500)), this.isPointLightShadow = !0;
	}
}, ga = class extends na {
	constructor(e, t, n = 0, r = 2) {
		super(e, t), this.isPointLight = !0, this.type = "PointLight", this.distance = n, this.decay = r, this.shadow = new ha();
	}
	get power() {
		return this.intensity * 4 * Math.PI;
	}
	set power(e) {
		this.intensity = e / (4 * Math.PI);
	}
	dispose() {
		super.dispose(), this.shadow.dispose();
	}
	copy(e, t) {
		return super.copy(e, t), this.distance = e.distance, this.decay = e.decay, this.shadow = e.shadow.clone(), this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.distance = this.distance, t.object.decay = this.decay, t.object.shadow = this.shadow.toJSON(), t;
	}
}, _a = class extends ua {
	constructor(e = -1, t = 1, n = 1, r = -1, i = .1, a = 2e3) {
		super(), this.isOrthographicCamera = !0, this.type = "OrthographicCamera", this.zoom = 1, this.view = null, this.left = e, this.right = t, this.top = n, this.bottom = r, this.near = i, this.far = a, this.updateProjectionMatrix();
	}
	copy(e, t) {
		return super.copy(e, t), this.left = e.left, this.right = e.right, this.top = e.top, this.bottom = e.bottom, this.near = e.near, this.far = e.far, this.zoom = e.zoom, this.view = e.view === null ? null : Object.assign({}, e.view), this;
	}
	setViewOffset(e, t, n, r, i, a) {
		this.view === null && (this.view = {
			enabled: !0,
			fullWidth: 1,
			fullHeight: 1,
			offsetX: 0,
			offsetY: 0,
			width: 1,
			height: 1
		}), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = r, this.view.width = i, this.view.height = a, this.updateProjectionMatrix();
	}
	clearViewOffset() {
		this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
	}
	updateProjectionMatrix() {
		let e = (this.right - this.left) / (2 * this.zoom), t = (this.top - this.bottom) / (2 * this.zoom), n = (this.right + this.left) / 2, r = (this.top + this.bottom) / 2, i = n - e, a = n + e, o = r + t, s = r - t;
		if (this.view !== null && this.view.enabled) {
			let e = (this.right - this.left) / this.view.fullWidth / this.zoom, t = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
			i += e * this.view.offsetX, a = i + e * this.view.width, o -= t * this.view.offsetY, s = o - t * this.view.height;
		}
		this.projectionMatrix.makeOrthographic(i, a, o, s, this.near, this.far, this.coordinateSystem, this.reversedDepth), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.zoom = this.zoom, t.object.left = this.left, t.object.right = this.right, t.object.top = this.top, t.object.bottom = this.bottom, t.object.near = this.near, t.object.far = this.far, this.view !== null && (t.object.view = Object.assign({}, this.view)), t;
	}
}, va = class extends oa {
	constructor() {
		super(new _a(-5, 5, 5, -5, .5, 500)), this.isDirectionalLightShadow = !0;
	}
}, ya = class extends na {
	constructor(e, t) {
		super(e, t), this.isDirectionalLight = !0, this.type = "DirectionalLight", this.position.copy(mn.DEFAULT_UP), this.updateMatrix(), this.target = new mn(), this.shadow = new va();
	}
	dispose() {
		super.dispose(), this.shadow.dispose();
	}
	copy(e) {
		return super.copy(e), this.target = e.target.clone(), this.shadow = e.shadow.clone(), this;
	}
	toJSON(e) {
		let t = super.toJSON(e);
		return t.object.shadow = this.shadow.toJSON(), t.object.target = this.target.uuid, t;
	}
}, ba = class extends na {
	constructor(e, t) {
		super(e, t), this.isAmbientLight = !0, this.type = "AmbientLight";
	}
}, xa = -90, Sa = 1, Ca = class extends mn {
	constructor(e, t, n) {
		super(), this.type = "CubeCamera", this.renderTarget = n, this.coordinateSystem = null, this.activeMipmapLevel = 0;
		let r = new ma(xa, Sa, e, t);
		r.layers = this.layers, this.add(r);
		let i = new ma(xa, Sa, e, t);
		i.layers = this.layers, this.add(i);
		let a = new ma(xa, Sa, e, t);
		a.layers = this.layers, this.add(a);
		let o = new ma(xa, Sa, e, t);
		o.layers = this.layers, this.add(o);
		let s = new ma(xa, Sa, e, t);
		s.layers = this.layers, this.add(s);
		let c = new ma(xa, Sa, e, t);
		c.layers = this.layers, this.add(c);
	}
	updateCoordinateSystem() {
		let e = this.coordinateSystem, t = this.children.concat(), [n, r, i, a, o, s] = t;
		for (let e of t) this.remove(e);
		if (e === 2e3) n.up.set(0, 1, 0), n.lookAt(1, 0, 0), r.up.set(0, 1, 0), r.lookAt(-1, 0, 0), i.up.set(0, 0, -1), i.lookAt(0, 1, 0), a.up.set(0, 0, 1), a.lookAt(0, -1, 0), o.up.set(0, 1, 0), o.lookAt(0, 0, 1), s.up.set(0, 1, 0), s.lookAt(0, 0, -1);
		else if (e === 2001) n.up.set(0, -1, 0), n.lookAt(-1, 0, 0), r.up.set(0, -1, 0), r.lookAt(1, 0, 0), i.up.set(0, 0, 1), i.lookAt(0, 1, 0), a.up.set(0, 0, -1), a.lookAt(0, -1, 0), o.up.set(0, -1, 0), o.lookAt(0, 0, 1), s.up.set(0, -1, 0), s.lookAt(0, 0, -1);
		else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: " + e);
		for (let e of t) this.add(e), e.updateMatrixWorld();
	}
	update(e, t) {
		this.parent === null && this.updateMatrixWorld();
		let { renderTarget: n, activeMipmapLevel: r } = this;
		this.coordinateSystem !== e.coordinateSystem && (this.coordinateSystem = e.coordinateSystem, this.updateCoordinateSystem());
		let [i, a, o, s, c, l] = this.children, u = e.getRenderTarget(), d = e.getActiveCubeFace(), f = e.getActiveMipmapLevel(), p = e.xr.enabled;
		e.xr.enabled = !1;
		let m = n.texture.generateMipmaps;
		n.texture.generateMipmaps = !1;
		let h = !1;
		h = e.isWebGLRenderer === !0 ? e.state.buffers.depth.getReversed() : e.reversedDepthBuffer, e.setRenderTarget(n, 0, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, i), e.setRenderTarget(n, 1, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, a), e.setRenderTarget(n, 2, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, o), e.setRenderTarget(n, 3, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, s), e.setRenderTarget(n, 4, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, c), n.texture.generateMipmaps = m, e.setRenderTarget(n, 5, r), h && e.autoClear === !1 && e.clearDepth(), e.render(t, l), e.setRenderTarget(u, d, f), e.xr.enabled = p, n.texture.needsPMREMUpdate = !0;
	}
}, wa = class extends ma {
	constructor(e = []) {
		super(), this.isArrayCamera = !0, this.isMultiViewCamera = !1, this.cameras = e;
	}
}, Ta = "\\[\\]\\.:\\/", Ea = /* @__PURE__ */ RegExp("[\\[\\]\\.:\\/]", "g"), Da = "[^\\[\\]\\.:\\/]", Oa = "[^" + Ta.replace("\\.", "") + "]", ka = /*@__PURE__*/ "((?:WC+[\\/:])*)".replace("WC", Da), Aa = /*@__PURE__*/ "(WCOD+)?".replace("WCOD", Oa), ja = /*@__PURE__*/ "(?:\\.(WC+)(?:\\[(.+)\\])?)?".replace("WC", Da), Ma = /*@__PURE__*/ "\\.(WC+)(?:\\[(.+)\\])?".replace("WC", Da), Na = RegExp("^" + ka + Aa + ja + Ma + "$"), Pa = [
	"material",
	"materials",
	"bones",
	"map"
], Fa = class {
	constructor(e, t, n) {
		let r = n || Ia.parseTrackName(t);
		this._targetGroup = e, this._bindings = e.subscribe_(t, r);
	}
	getValue(e, t) {
		this.bind();
		let n = this._targetGroup.nCachedObjects_, r = this._bindings[n];
		r !== void 0 && r.getValue(e, t);
	}
	setValue(e, t) {
		let n = this._bindings;
		for (let r = this._targetGroup.nCachedObjects_, i = n.length; r !== i; ++r) n[r].setValue(e, t);
	}
	bind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].bind();
	}
	unbind() {
		let e = this._bindings;
		for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t) e[t].unbind();
	}
}, Ia = class e {
	constructor(t, n, r) {
		this.path = n, this.parsedPath = r || e.parseTrackName(n), this.node = e.findNode(t, this.parsedPath.nodeName), this.rootNode = t, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
	static create(t, n, r) {
		return t && t.isAnimationObjectGroup ? new e.Composite(t, n, r) : new e(t, n, r);
	}
	static sanitizeNodeName(e) {
		return e.replace(/\s/g, "_").replace(Ea, "");
	}
	static parseTrackName(e) {
		let t = Na.exec(e);
		if (t === null) throw Error("THREE.PropertyBinding: Cannot parse trackName: " + e);
		let n = {
			nodeName: t[2],
			objectName: t[3],
			objectIndex: t[4],
			propertyName: t[5],
			propertyIndex: t[6]
		}, r = n.nodeName && n.nodeName.lastIndexOf(".");
		if (r !== void 0 && r !== -1) {
			let e = n.nodeName.substring(r + 1);
			Pa.indexOf(e) !== -1 && (n.nodeName = n.nodeName.substring(0, r), n.objectName = e);
		}
		if (n.propertyName === null || n.propertyName.length === 0) throw Error("THREE.PropertyBinding: can not parse propertyName from trackName: " + e);
		return n;
	}
	static findNode(e, t) {
		if (t === void 0 || t === "" || t === "." || t === -1 || t === e.name || t === e.uuid) return e;
		if (e.skeleton) {
			let n = e.skeleton.getBoneByName(t);
			if (n !== void 0) return n;
		}
		if (e.children) {
			let n = function(e) {
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (i.name === t || i.uuid === t) return i;
					let a = n(i.children);
					if (a) return a;
				}
				return null;
			}, r = n(e.children);
			if (r) return r;
		}
		return null;
	}
	_getValue_unavailable() {}
	_setValue_unavailable() {}
	_getValue_direct(e, t) {
		e[t] = this.targetObject[this.propertyName];
	}
	_getValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) e[t++] = n[r];
	}
	_getValue_arrayElement(e, t) {
		e[t] = this.resolvedProperty[this.propertyIndex];
	}
	_getValue_toArray(e, t) {
		this.resolvedProperty.toArray(e, t);
	}
	_setValue_direct(e, t) {
		this.targetObject[this.propertyName] = e[t];
	}
	_setValue_direct_setNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_direct_setMatrixWorldNeedsUpdate(e, t) {
		this.targetObject[this.propertyName] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_array(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
	}
	_setValue_array_setNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.needsUpdate = !0;
	}
	_setValue_array_setMatrixWorldNeedsUpdate(e, t) {
		let n = this.resolvedProperty;
		for (let r = 0, i = n.length; r !== i; ++r) n[r] = e[t++];
		this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_arrayElement(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t];
	}
	_setValue_arrayElement_setNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.needsUpdate = !0;
	}
	_setValue_arrayElement_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_setValue_fromArray(e, t) {
		this.resolvedProperty.fromArray(e, t);
	}
	_setValue_fromArray_setNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.needsUpdate = !0;
	}
	_setValue_fromArray_setMatrixWorldNeedsUpdate(e, t) {
		this.resolvedProperty.fromArray(e, t), this.targetObject.matrixWorldNeedsUpdate = !0;
	}
	_getValue_unbound(e, t) {
		this.bind(), this.getValue(e, t);
	}
	_setValue_unbound(e, t) {
		this.bind(), this.setValue(e, t);
	}
	bind() {
		let t = this.node, n = this.parsedPath, r = n.objectName, i = n.propertyName, a = n.propertyIndex;
		if (t || (t = e.findNode(this.rootNode, n.nodeName), this.node = t), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !t) {
			B("PropertyBinding: No target node found for track: " + this.path + ".");
			return;
		}
		if (r) {
			let e = n.objectIndex;
			switch (r) {
				case "materials":
					if (!t.material) {
						V("PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.materials) {
						V("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
						return;
					}
					t = t.material.materials;
					break;
				case "bones":
					if (!t.skeleton) {
						V("PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
						return;
					}
					t = t.skeleton.bones;
					for (let n = 0; n < t.length; n++) if (t[n].name === e) {
						e = n;
						break;
					}
					break;
				case "map":
					if ("map" in t) {
						t = t.map;
						break;
					}
					if (!t.material) {
						V("PropertyBinding: Can not bind to material as node does not have a material.", this);
						return;
					}
					if (!t.material.map) {
						V("PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
						return;
					}
					t = t.material.map;
					break;
				default:
					if (t[r] === void 0) {
						V("PropertyBinding: Can not bind to objectName of node undefined.", this);
						return;
					}
					t = t[r];
			}
			if (e !== void 0) {
				if (t[e] === void 0) {
					V("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, t);
					return;
				}
				t = t[e];
			}
		}
		let o = t[i];
		if (o === void 0) {
			let e = n.nodeName;
			V("PropertyBinding: Trying to update property for track: " + e + "." + i + " but it wasn't found.", t);
			return;
		}
		let s = this.Versioning.None;
		this.targetObject = t, t.isMaterial === !0 ? s = this.Versioning.NeedsUpdate : t.isObject3D === !0 && (s = this.Versioning.MatrixWorldNeedsUpdate);
		let c = this.BindingType.Direct;
		if (a !== void 0) {
			if (i === "morphTargetInfluences") {
				if (!t.geometry) {
					V("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
					return;
				}
				if (!t.geometry.morphAttributes) {
					V("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
					return;
				}
				t.morphTargetDictionary[a] !== void 0 && (a = t.morphTargetDictionary[a]);
			}
			c = this.BindingType.ArrayElement, this.resolvedProperty = o, this.propertyIndex = a;
		} else o.fromArray !== void 0 && o.toArray !== void 0 ? (c = this.BindingType.HasFromToArray, this.resolvedProperty = o) : Array.isArray(o) ? (c = this.BindingType.EntireArray, this.resolvedProperty = o) : this.propertyName = i;
		this.getValue = this.GetterByBindingType[c], this.setValue = this.SetterByBindingTypeAndVersioning[c][s];
	}
	unbind() {
		this.node = null, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
	}
};
Ia.Composite = Fa, Ia.prototype.BindingType = {
	Direct: 0,
	EntireArray: 1,
	ArrayElement: 2,
	HasFromToArray: 3
}, Ia.prototype.Versioning = {
	None: 0,
	NeedsUpdate: 1,
	MatrixWorldNeedsUpdate: 2
}, Ia.prototype.GetterByBindingType = [
	Ia.prototype._getValue_direct,
	Ia.prototype._getValue_array,
	Ia.prototype._getValue_arrayElement,
	Ia.prototype._getValue_toArray
], Ia.prototype.SetterByBindingTypeAndVersioning = [
	[
		Ia.prototype._setValue_direct,
		Ia.prototype._setValue_direct_setNeedsUpdate,
		Ia.prototype._setValue_direct_setMatrixWorldNeedsUpdate
	],
	[
		Ia.prototype._setValue_array,
		Ia.prototype._setValue_array_setNeedsUpdate,
		Ia.prototype._setValue_array_setMatrixWorldNeedsUpdate
	],
	[
		Ia.prototype._setValue_arrayElement,
		Ia.prototype._setValue_arrayElement_setNeedsUpdate,
		Ia.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
	],
	[
		Ia.prototype._setValue_fromArray,
		Ia.prototype._setValue_fromArray_setNeedsUpdate,
		Ia.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
	]
], class e {
	static {
		e.prototype.isMatrix2 = !0;
	}
	constructor(e, t, n, r) {
		this.elements = [
			1,
			0,
			0,
			1
		], e !== void 0 && this.set(e, t, n, r);
	}
	identity() {
		return this.set(1, 0, 0, 1), this;
	}
	fromArray(e, t = 0) {
		for (let n = 0; n < 4; n++) this.elements[n] = e[n + t];
		return this;
	}
	set(e, t, n, r) {
		let i = this.elements;
		return i[0] = e, i[2] = t, i[1] = n, i[3] = r, this;
	}
};
function La(e, t, n, r) {
	let i = Ra(r);
	switch (n) {
		case M: return e * t;
		case ie: return e * t / i.components * i.byteLength;
		case ae: return e * t / i.components * i.byteLength;
		case oe: return e * t * 2 / i.components * i.byteLength;
		case se: return e * t * 2 / i.components * i.byteLength;
		case te: return e * t * 3 / i.components * i.byteLength;
		case N: return e * t * 4 / i.components * i.byteLength;
		case ce: return e * t * 4 / i.components * i.byteLength;
		case le:
		case P: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 8;
		case ue:
		case de: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case pe:
		case he: return Math.max(e, 16) * Math.max(t, 8) / 4;
		case fe:
		case me: return Math.max(e, 8) * Math.max(t, 8) / 2;
		case F:
		case I:
		case _e:
		case ve: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 8;
		case ge:
		case ye:
		case be: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case xe: return Math.floor((e + 3) / 4) * Math.floor((t + 3) / 4) * 16;
		case Se: return Math.floor((e + 4) / 5) * Math.floor((t + 3) / 4) * 16;
		case Ce: return Math.floor((e + 4) / 5) * Math.floor((t + 4) / 5) * 16;
		case we: return Math.floor((e + 5) / 6) * Math.floor((t + 4) / 5) * 16;
		case Te: return Math.floor((e + 5) / 6) * Math.floor((t + 5) / 6) * 16;
		case Ee: return Math.floor((e + 7) / 8) * Math.floor((t + 4) / 5) * 16;
		case De: return Math.floor((e + 7) / 8) * Math.floor((t + 5) / 6) * 16;
		case Oe: return Math.floor((e + 7) / 8) * Math.floor((t + 7) / 8) * 16;
		case ke: return Math.floor((e + 9) / 10) * Math.floor((t + 4) / 5) * 16;
		case Ae: return Math.floor((e + 9) / 10) * Math.floor((t + 5) / 6) * 16;
		case je: return Math.floor((e + 9) / 10) * Math.floor((t + 7) / 8) * 16;
		case L: return Math.floor((e + 9) / 10) * Math.floor((t + 9) / 10) * 16;
		case Me: return Math.floor((e + 11) / 12) * Math.floor((t + 9) / 10) * 16;
		case Ne: return Math.floor((e + 11) / 12) * Math.floor((t + 11) / 12) * 16;
		case Pe:
		case R:
		case Fe: return Math.ceil(e / 4) * Math.ceil(t / 4) * 16;
		case z:
		case Ie: return Math.ceil(e / 4) * Math.ceil(t / 4) * 8;
		case Le:
		case Re: return Math.ceil(e / 4) * Math.ceil(t / 4) * 16;
	}
	throw Error(`Unable to determine texture byte length for ${n} format.`);
}
function Ra(e) {
	switch (e) {
		case b:
		case x: return {
			byteLength: 1,
			components: 1
		};
		case C:
		case S:
		case D: return {
			byteLength: 2,
			components: 1
		};
		case O:
		case ee: return {
			byteLength: 2,
			components: 4
		};
		case T:
		case w:
		case E: return {
			byteLength: 4,
			components: 1
		};
		case A:
		case j: return {
			byteLength: 4,
			components: 3
		};
	}
	throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`);
}
typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: { revision: "186" } })), typeof window < "u" && (window.__THREE__ ? B("WARNING: Multiple instances of Three.js being imported.") : window.__THREE__ = "186");
//#endregion
//#region node_modules/three/build/three.module.js
function za() {
	let e = null, t = !1, n = null, r = null;
	function i(t, a) {
		r = e.requestAnimationFrame(i), n(t, a);
	}
	return {
		start: function() {
			t !== !0 && n !== null && e !== null && (r = e.requestAnimationFrame(i), t = !0);
		},
		stop: function() {
			e !== null && e.cancelAnimationFrame(r), t = !1;
		},
		setAnimationLoop: function(e) {
			n = e;
		},
		setContext: function(t) {
			e = t;
		}
	};
}
function Ba(e) {
	let t = /* @__PURE__ */ new WeakMap();
	function n(t, n) {
		let r = t.array, i = t.usage, a = r.byteLength, o = e.createBuffer();
		e.bindBuffer(n, o), e.bufferData(n, r, i), t.onUploadCallback();
		let s;
		if (r instanceof Float32Array) s = e.FLOAT;
		else if (typeof Float16Array < "u" && r instanceof Float16Array) s = e.HALF_FLOAT;
		else if (r instanceof Uint16Array) s = t.isFloat16BufferAttribute ? e.HALF_FLOAT : e.UNSIGNED_SHORT;
		else if (r instanceof Int16Array) s = e.SHORT;
		else if (r instanceof Uint32Array) s = e.UNSIGNED_INT;
		else if (r instanceof Int32Array) s = e.INT;
		else if (r instanceof Int8Array) s = e.BYTE;
		else if (r instanceof Uint8Array) s = e.UNSIGNED_BYTE;
		else if (r instanceof Uint8ClampedArray) s = e.UNSIGNED_BYTE;
		else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: " + r);
		return {
			buffer: o,
			type: s,
			bytesPerElement: r.BYTES_PER_ELEMENT,
			version: t.version,
			size: a
		};
	}
	function r(t, n, r) {
		let i = n.array, a = n.updateRanges;
		if (e.bindBuffer(r, t), a.length === 0) e.bufferSubData(r, 0, i);
		else {
			a.sort((e, t) => e.start - t.start);
			let t = 0;
			for (let e = 1; e < a.length; e++) {
				let n = a[t], r = a[e];
				r.start <= n.start + n.count + 1 ? n.count = Math.max(n.count, r.start + r.count - n.start) : (++t, a[t] = r);
			}
			a.length = t + 1;
			for (let t = 0, n = a.length; t < n; t++) {
				let n = a[t];
				e.bufferSubData(r, n.start * i.BYTES_PER_ELEMENT, i, n.start, n.count);
			}
			n.clearUpdateRanges();
		}
		n.onUploadCallback();
	}
	function i(e) {
		return e.isInterleavedBufferAttribute && (e = e.data), t.get(e);
	}
	function a(n) {
		n.isInterleavedBufferAttribute && (n = n.data);
		let r = t.get(n);
		r && (e.deleteBuffer(r.buffer), t.delete(n));
	}
	function o(e, i) {
		if (e.isInterleavedBufferAttribute && (e = e.data), e.isGLBufferAttribute) {
			let n = t.get(e);
			(!n || n.version < e.version) && t.set(e, {
				buffer: e.buffer,
				type: e.type,
				bytesPerElement: e.elementSize,
				version: e.version
			});
			return;
		}
		let a = t.get(e);
		if (a === void 0) t.set(e, n(e, i));
		else if (a.version < e.version) {
			if (a.size !== e.array.byteLength) throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
			r(a.buffer, e, i), a.version = e.version;
		}
	}
	return {
		get: i,
		remove: a,
		update: o
	};
}
var X = {
	alphahash_fragment: "#ifdef USE_ALPHAHASH\n	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;\n#endif",
	alphahash_pars_fragment: "#ifdef USE_ALPHAHASH\n	const float ALPHA_HASH_SCALE = 0.05;\n	float hash2D( vec2 value ) {\n		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );\n	}\n	float hash3D( vec3 value ) {\n		return hash2D( vec2( hash2D( value.xy ), value.z ) );\n	}\n	float getAlphaHashThreshold( vec3 position ) {\n		float maxDeriv = max(\n			length( dFdx( position.xyz ) ),\n			length( dFdy( position.xyz ) )\n		);\n		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );\n		vec2 pixScales = vec2(\n			exp2( floor( log2( pixScale ) ) ),\n			exp2( ceil( log2( pixScale ) ) )\n		);\n		vec2 alpha = vec2(\n			hash3D( floor( pixScales.x * position.xyz ) ),\n			hash3D( floor( pixScales.y * position.xyz ) )\n		);\n		float lerpFactor = fract( log2( pixScale ) );\n		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;\n		float a = min( lerpFactor, 1.0 - lerpFactor );\n		vec3 cases = vec3(\n			x * x / ( 2.0 * a * ( 1.0 - a ) ),\n			( x - 0.5 * a ) / ( 1.0 - a ),\n			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )\n		);\n		float threshold = ( x < ( 1.0 - a ) )\n			? ( ( x < a ) ? cases.x : cases.y )\n			: cases.z;\n		return clamp( threshold , 1.0e-6, 1.0 );\n	}\n#endif",
	alphamap_fragment: "#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;\n#endif",
	alphamap_pars_fragment: "#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	alphatest_fragment: "#ifdef USE_ALPHATEST\n	#ifdef ALPHA_TO_COVERAGE\n	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );\n	if ( diffuseColor.a == 0.0 ) discard;\n	#else\n	if ( diffuseColor.a < alphaTest ) discard;\n	#endif\n#endif",
	alphatest_pars_fragment: "#ifdef USE_ALPHATEST\n	uniform float alphaTest;\n#endif",
	aomap_fragment: "#ifdef USE_AOMAP\n	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;\n	reflectedLight.indirectDiffuse *= ambientOcclusion;\n	#if defined( USE_CLEARCOAT ) \n		clearcoatSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_SHEEN ) \n		sheenSpecularIndirect *= ambientOcclusion;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( STANDARD )\n		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );\n		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );\n	#endif\n#endif",
	aomap_pars_fragment: "#ifdef USE_AOMAP\n	uniform sampler2D aoMap;\n	uniform float aoMapIntensity;\n#endif",
	batching_pars_vertex: "#ifdef USE_BATCHING\n	#if ! defined( GL_ANGLE_multi_draw )\n	#define gl_DrawID _gl_DrawID\n	uniform int _gl_DrawID;\n	#endif\n	uniform highp sampler2D batchingTexture;\n	uniform highp usampler2D batchingIdTexture;\n	mat4 getBatchingMatrix( const in float i ) {\n		int size = textureSize( batchingTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n	float getIndirectIndex( const in int i ) {\n		int size = textureSize( batchingIdTexture, 0 ).x;\n		int x = i % size;\n		int y = i / size;\n		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );\n	}\n#endif\n#ifdef USE_BATCHING_COLOR\n	uniform sampler2D batchingColorTexture;\n	vec4 getBatchingColor( const in float i ) {\n		int size = textureSize( batchingColorTexture, 0 ).x;\n		int j = int( i );\n		int x = j % size;\n		int y = j / size;\n		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );\n	}\n#endif",
	batching_vertex: "#ifdef USE_BATCHING\n	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );\n#endif",
	begin_vertex: "vec3 transformed = vec3( position );\n#ifdef USE_ALPHAHASH\n	vPosition = vec3( position );\n#endif",
	beginnormal_vertex: "vec3 objectNormal = vec3( normal );\n#ifdef USE_TANGENT\n	vec3 objectTangent = vec3( tangent.xyz );\n#endif",
	bsdfs: "float G_BlinnPhong_Implicit( ) {\n	return 0.25;\n}\nfloat D_BlinnPhong( const in float shininess, const in float dotNH ) {\n	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );\n}\nvec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( specularColor, 1.0, dotVH );\n	float G = G_BlinnPhong_Implicit( );\n	float D = D_BlinnPhong( shininess, dotNH );\n	return F * ( G * D );\n} // validated",
	iridescence_fragment: "#ifdef USE_IRIDESCENCE\n	const mat3 XYZ_TO_REC709 = mat3(\n		 3.2404542, -0.9692660,  0.0556434,\n		-1.5371385,  1.8760108, -0.2040259,\n		-0.4985314,  0.0415560,  1.0572252\n	);\n	vec3 Fresnel0ToIor( vec3 fresnel0 ) {\n		vec3 sqrtF0 = sqrt( fresnel0 );\n		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );\n	}\n	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );\n	}\n	float IorToFresnel0( float transmittedIor, float incidentIor ) {\n		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));\n	}\n	vec3 evalSensitivity( float OPD, vec3 shift ) {\n		float phase = 2.0 * PI * OPD * 1.0e-9;\n		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );\n		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );\n		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );\n		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );\n		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );\n		xyz /= 1.0685e-7;\n		vec3 rgb = XYZ_TO_REC709 * xyz;\n		return rgb;\n	}\n	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {\n		vec3 I;\n		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );\n		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );\n		float cosTheta2Sq = 1.0 - sinTheta2Sq;\n		if ( cosTheta2Sq < 0.0 ) {\n			return vec3( 1.0 );\n		}\n		float cosTheta2 = sqrt( cosTheta2Sq );\n		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );\n		float R12 = F_Schlick( R0, 1.0, cosTheta1 );\n		float T121 = 1.0 - R12;\n		float phi12 = 0.0;\n		if ( iridescenceIOR < outsideIOR ) phi12 = PI;\n		float phi21 = PI - phi12;\n		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );\n		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );\n		vec3 phi23 = vec3( 0.0 );\n		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;\n		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;\n		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;\n		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;\n		vec3 phi = vec3( phi21 ) + phi23;\n		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );\n		vec3 r123 = sqrt( R123 );\n		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );\n		vec3 C0 = R12 + Rs;\n		I = C0;\n		vec3 Cm = Rs - T121;\n		for ( int m = 1; m <= 2; ++ m ) {\n			Cm *= r123;\n			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );\n			I += Cm * Sm;\n		}\n		return max( I, vec3( 0.0 ) );\n	}\n#endif",
	bumpmap_pars_fragment: "#ifdef USE_BUMPMAP\n	uniform sampler2D bumpMap;\n	uniform float bumpScale;\n	vec2 dHdxy_fwd() {\n		vec2 dSTdx = dFdx( vBumpMapUv );\n		vec2 dSTdy = dFdy( vBumpMapUv );\n		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;\n		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;\n		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;\n		return vec2( dBx, dBy );\n	}\n	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {\n		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );\n		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );\n		vec3 vN = surf_norm;\n		vec3 R1 = cross( vSigmaY, vN );\n		vec3 R2 = cross( vN, vSigmaX );\n		float fDet = dot( vSigmaX, R1 ) * faceDirection;\n		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );\n		return normalize( abs( fDet ) * surf_norm - vGrad );\n	}\n#endif",
	clipping_planes_fragment: "#if NUM_CLIPPING_PLANES > 0\n	vec4 plane;\n	#ifdef ALPHA_TO_COVERAGE\n		float distanceToPlane, distanceGradient;\n		float clipOpacity = 1.0;\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n			distanceGradient = fwidth( distanceToPlane ) / 2.0;\n			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			if ( clipOpacity == 0.0 ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			float unionClipOpacity = 1.0;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;\n				distanceGradient = fwidth( distanceToPlane ) / 2.0;\n				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );\n			}\n			#pragma unroll_loop_end\n			clipOpacity *= 1.0 - unionClipOpacity;\n		#endif\n		diffuseColor.a *= clipOpacity;\n		if ( diffuseColor.a == 0.0 ) discard;\n	#else\n		#pragma unroll_loop_start\n		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {\n			plane = clippingPlanes[ i ];\n			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;\n		}\n		#pragma unroll_loop_end\n		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES\n			bool clipped = true;\n			#pragma unroll_loop_start\n			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {\n				plane = clippingPlanes[ i ];\n				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;\n			}\n			#pragma unroll_loop_end\n			if ( clipped ) discard;\n		#endif\n	#endif\n#endif",
	clipping_planes_pars_fragment: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];\n#endif",
	clipping_planes_pars_vertex: "#if NUM_CLIPPING_PLANES > 0\n	varying vec3 vClipPosition;\n#endif",
	clipping_planes_vertex: "#if NUM_CLIPPING_PLANES > 0\n	vClipPosition = - mvPosition.xyz;\n#endif",
	color_fragment: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n	diffuseColor *= vColor;\n#endif",
	color_pars_fragment: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n	varying vec4 vColor;\n#endif",
	color_pars_vertex: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	varying vec4 vColor;\n#endif",
	color_vertex: "#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )\n	vColor = vec4( 1.0 );\n#endif\n#ifdef USE_COLOR_ALPHA\n	vColor *= color;\n#elif defined( USE_COLOR )\n	vColor.rgb *= color;\n#endif\n#ifdef USE_INSTANCING_COLOR\n	vColor.rgb *= instanceColor.rgb;\n#endif\n#ifdef USE_BATCHING_COLOR\n	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );\n#endif",
	common: "#define PI 3.141592653589793\n#define PI2 6.283185307179586\n#define PI_HALF 1.5707963267948966\n#define RECIPROCAL_PI 0.3183098861837907\n#define RECIPROCAL_PI2 0.15915494309189535\n#define EPSILON 1e-6\n#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\n#define whiteComplement( a ) ( 1.0 - saturate( a ) )\nfloat pow2( const in float x ) { return x*x; }\nvec3 pow2( const in vec3 x ) { return x*x; }\nfloat pow3( const in float x ) { return x*x*x; }\nfloat pow4( const in float x ) { float x2 = x*x; return x2*x2; }\nfloat max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }\nfloat average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }\nhighp float rand( const in vec2 uv ) {\n	const highp float a = 12.9898, b = 78.233, c = 43758.5453;\n	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );\n	return fract( sin( sn ) * c );\n}\n#ifdef HIGH_PRECISION\n	float precisionSafeLength( vec3 v ) { return length( v ); }\n#else\n	float precisionSafeLength( vec3 v ) {\n		float maxComponent = max3( abs( v ) );\n		return length( v / maxComponent ) * maxComponent;\n	}\n#endif\nstruct IncidentLight {\n	vec3 color;\n	vec3 direction;\n	bool visible;\n};\nstruct ReflectedLight {\n	vec3 directDiffuse;\n	vec3 directSpecular;\n	vec3 indirectDiffuse;\n	vec3 indirectSpecular;\n};\n#ifdef USE_ALPHAHASH\n	varying vec3 vPosition;\n#endif\nvec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n}\n#define inverseTransformDirection transformDirectionByInverseViewMatrix\nvec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {\n	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );\n}\nvec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {\n	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );\n}\nbool isPerspectiveMatrix( mat4 m ) {\n	return m[ 2 ][ 3 ] == - 1.0;\n}\nvec2 equirectUv( in vec3 dir ) {\n	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;\n	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;\n	return vec2( u, v );\n}\nvec3 BRDF_Lambert( const in vec3 diffuseColor ) {\n	return RECIPROCAL_PI * diffuseColor;\n}\nvec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n}\nfloat F_Schlick( const in float f0, const in float f90, const in float dotVH ) {\n	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );\n	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );\n} // validated",
	cube_uv_reflection_fragment: "#ifdef ENVMAP_TYPE_CUBE_UV\n	#define cubeUV_minMipLevel 4.0\n	#define cubeUV_minTileSize 16.0\n	float getFace( vec3 direction ) {\n		vec3 absDirection = abs( direction );\n		float face = - 1.0;\n		if ( absDirection.x > absDirection.z ) {\n			if ( absDirection.x > absDirection.y )\n				face = direction.x > 0.0 ? 0.0 : 3.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		} else {\n			if ( absDirection.z > absDirection.y )\n				face = direction.z > 0.0 ? 2.0 : 5.0;\n			else\n				face = direction.y > 0.0 ? 1.0 : 4.0;\n		}\n		return face;\n	}\n	vec2 getUV( vec3 direction, float face ) {\n		vec2 uv;\n		if ( face == 0.0 ) {\n			uv = vec2( direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 1.0 ) {\n			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );\n		} else if ( face == 2.0 ) {\n			uv = vec2( - direction.x, direction.y ) / abs( direction.z );\n		} else if ( face == 3.0 ) {\n			uv = vec2( - direction.z, direction.y ) / abs( direction.x );\n		} else if ( face == 4.0 ) {\n			uv = vec2( - direction.x, direction.z ) / abs( direction.y );\n		} else {\n			uv = vec2( direction.x, direction.y ) / abs( direction.z );\n		}\n		return 0.5 * ( uv + 1.0 );\n	}\n	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {\n		float face = getFace( direction );\n		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );\n		mipInt = max( mipInt, cubeUV_minMipLevel );\n		float faceSize = exp2( mipInt );\n		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;\n		if ( face > 2.0 ) {\n			uv.y += faceSize;\n			face -= 3.0;\n		}\n		uv.x += face * faceSize;\n		uv.x += filterInt * 3.0 * cubeUV_minTileSize;\n		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );\n		uv.x *= CUBEUV_TEXEL_WIDTH;\n		uv.y *= CUBEUV_TEXEL_HEIGHT;\n		#ifdef texture2DGradEXT\n			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;\n		#else\n			return texture2D( envMap, uv ).rgb;\n		#endif\n	}\n	#define cubeUV_r0 1.0\n	#define cubeUV_m0 - 2.0\n	#define cubeUV_r1 0.8\n	#define cubeUV_m1 - 1.0\n	#define cubeUV_r4 0.4\n	#define cubeUV_m4 2.0\n	#define cubeUV_r5 0.305\n	#define cubeUV_m5 3.0\n	#define cubeUV_r6 0.21\n	#define cubeUV_m6 4.0\n	float roughnessToMip( float roughness ) {\n		float mip = 0.0;\n		if ( roughness >= cubeUV_r1 ) {\n			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;\n		} else if ( roughness >= cubeUV_r4 ) {\n			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;\n		} else if ( roughness >= cubeUV_r5 ) {\n			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;\n		} else if ( roughness >= cubeUV_r6 ) {\n			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;\n		} else {\n			mip = - 2.0 * log2( 1.16 * roughness );		}\n		return mip;\n	}\n	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {\n		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );\n		float mipF = fract( mip );\n		float mipInt = floor( mip );\n		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );\n		if ( mipF == 0.0 ) {\n			return vec4( color0, 1.0 );\n		} else {\n			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );\n			return vec4( mix( color0, color1, mipF ), 1.0 );\n		}\n	}\n#endif",
	defaultnormal_vertex: "vec3 transformedNormal = objectNormal;\n#ifdef USE_TANGENT\n	vec3 transformedTangent = objectTangent;\n#endif\n#ifdef USE_BATCHING\n	mat3 bm = mat3( batchingMatrix );\n	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );\n	transformedNormal = bm * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = bm * transformedTangent;\n	#endif\n#endif\n#ifdef USE_INSTANCING\n	mat3 im = mat3( instanceMatrix );\n	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );\n	transformedNormal = im * transformedNormal;\n	#ifdef USE_TANGENT\n		transformedTangent = im * transformedTangent;\n	#endif\n#endif\ntransformedNormal = normalMatrix * transformedNormal;\n#ifdef FLIP_SIDED\n	transformedNormal = - transformedNormal;\n#endif\n#ifdef USE_TANGENT\n	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;\n#endif",
	displacementmap_pars_vertex: "#ifdef USE_DISPLACEMENTMAP\n	uniform sampler2D displacementMap;\n	uniform float displacementScale;\n	uniform float displacementBias;\n#endif",
	displacementmap_vertex: "#ifdef USE_DISPLACEMENTMAP\n	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );\n#endif",
	emissivemap_fragment: "#ifdef USE_EMISSIVEMAP\n	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE\n		emissiveColor = sRGBTransferEOTF( emissiveColor );\n	#endif\n	totalEmissiveRadiance *= emissiveColor.rgb;\n#endif",
	emissivemap_pars_fragment: "#ifdef USE_EMISSIVEMAP\n	uniform sampler2D emissiveMap;\n#endif",
	colorspace_fragment: "gl_FragColor = linearToOutputTexel( gl_FragColor );",
	colorspace_pars_fragment: "vec4 LinearTransferOETF( in vec4 value ) {\n	return value;\n}\nvec4 sRGBTransferEOTF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );\n}\nvec4 sRGBTransferOETF( in vec4 value ) {\n	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );\n}",
	envmap_fragment: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vec3 cameraToFrag;\n		if ( isOrthographic ) {\n			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToFrag = normalize( vWorldPosition - cameraPosition );\n		}\n		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vec3 reflectVec = reflect( cameraToFrag, worldNormal );\n		#else\n			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );\n		#endif\n	#else\n		vec3 reflectVec = vReflect;\n	#endif\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );\n		#ifdef ENVMAP_BLENDING_MULTIPLY\n			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );\n		#elif defined( ENVMAP_BLENDING_MIX )\n			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );\n		#elif defined( ENVMAP_BLENDING_ADD )\n			outgoingLight += envColor.xyz * specularStrength * reflectivity;\n		#endif\n	#endif\n#endif",
	envmap_common_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float envMapIntensity;\n	uniform mat3 envMapRotation;\n	#ifdef ENVMAP_TYPE_CUBE\n		uniform samplerCube envMap;\n	#else\n		uniform sampler2D envMap;\n	#endif\n#endif",
	envmap_pars_fragment: "#ifdef USE_ENVMAP\n	uniform float reflectivity;\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		varying vec3 vWorldPosition;\n		uniform float refractionRatio;\n	#else\n		varying vec3 vReflect;\n	#endif\n#endif",
	envmap_pars_vertex: "#ifdef USE_ENVMAP\n	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )\n		#define ENV_WORLDPOS\n	#endif\n	#ifdef ENV_WORLDPOS\n		\n		varying vec3 vWorldPosition;\n	#else\n		varying vec3 vReflect;\n		uniform float refractionRatio;\n	#endif\n#endif",
	envmap_physical_pars_fragment: "#ifdef USE_ENVMAP\n	vec3 getIBLIrradiance( const in vec3 normal ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );\n			return PI * envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n		#ifdef ENVMAP_TYPE_CUBE_UV\n			vec3 reflectVec = reflect( - viewDir, normal );\n			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );\n			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );\n			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );\n			return envMapColor.rgb * envMapIntensity;\n		#else\n			return vec3( 0.0 );\n		#endif\n	}\n	#ifdef USE_RETROREFLECTION\n		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );\n				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );\n				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );\n				return envMapColor.rgb * envMapIntensity;\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n	#endif\n	#ifdef USE_ANISOTROPY\n		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n			#ifdef ENVMAP_TYPE_CUBE_UV\n				vec3 bentNormal = cross( bitangent, viewDir );\n				bentNormal = normalize( cross( bentNormal, bitangent ) );\n				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n				return getIBLRadiance( viewDir, bentNormal, roughness );\n			#else\n				return vec3( 0.0 );\n			#endif\n		}\n		#ifdef USE_RETROREFLECTION\n			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {\n				#ifdef ENVMAP_TYPE_CUBE_UV\n					vec3 bentNormal = cross( bitangent, viewDir );\n					bentNormal = normalize( cross( bentNormal, bitangent ) );\n					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );\n					return getIBLRetroRadiance( viewDir, bentNormal, roughness );\n				#else\n					return vec3( 0.0 );\n				#endif\n			}\n		#endif\n	#endif\n#endif",
	envmap_vertex: "#ifdef USE_ENVMAP\n	#ifdef ENV_WORLDPOS\n		vWorldPosition = worldPosition.xyz;\n	#else\n		vec3 cameraToVertex;\n		if ( isOrthographic ) {\n			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );\n		} else {\n			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );\n		}\n		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );\n		#ifdef ENVMAP_MODE_REFLECTION\n			vReflect = reflect( cameraToVertex, worldNormal );\n		#else\n			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );\n		#endif\n	#endif\n#endif",
	fog_vertex: "#ifdef USE_FOG\n	vFogDepth = - mvPosition.z;\n#endif",
	fog_pars_vertex: "#ifdef USE_FOG\n	varying float vFogDepth;\n#endif",
	fog_fragment: "#ifdef USE_FOG\n	#ifdef FOG_EXP2\n		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );\n	#else\n		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );\n	#endif\n	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif",
	fog_pars_fragment: "#ifdef USE_FOG\n	uniform vec3 fogColor;\n	varying float vFogDepth;\n	#ifdef FOG_EXP2\n		uniform float fogDensity;\n	#else\n		uniform float fogNear;\n		uniform float fogFar;\n	#endif\n#endif",
	gradientmap_pars_fragment: "#ifdef USE_GRADIENTMAP\n	uniform sampler2D gradientMap;\n#endif\nvec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {\n	float dotNL = dot( normal, lightDirection );\n	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );\n	#ifdef USE_GRADIENTMAP\n		return vec3( texture2D( gradientMap, coord ).r );\n	#else\n		vec2 fw = fwidth( coord ) * 0.5;\n		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );\n	#endif\n}",
	lightmap_pars_fragment: "#ifdef USE_LIGHTMAP\n	uniform sampler2D lightMap;\n	uniform float lightMapIntensity;\n#endif",
	lights_lambert_fragment: "LambertMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularStrength = specularStrength;",
	lights_lambert_pars_fragment: "varying vec3 vViewPosition;\nstruct LambertMaterial {\n	vec3 diffuseColor;\n	float specularStrength;\n};\nvoid RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Lambert\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert",
	lights_pars_begin: "uniform bool receiveShadow;\nuniform vec3 ambientLightColor;\n#if defined( USE_LIGHT_PROBES )\n	uniform vec3 lightProbe[ 9 ];\n#endif\nvec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {\n	float x = normal.x, y = normal.y, z = normal.z;\n	vec3 result = shCoefficients[ 0 ] * 0.886227;\n	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;\n	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;\n	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;\n	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;\n	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;\n	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );\n	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;\n	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );\n	return result;\n}\nvec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {\n	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );\n	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );\n	return irradiance;\n}\nvec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {\n	vec3 irradiance = ambientLightColor;\n	return irradiance;\n}\nfloat getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {\n	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );\n	if ( cutoffDistance > 0.0 ) {\n		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );\n	}\n	return distanceFalloff;\n}\nfloat getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {\n	return smoothstep( coneCosine, penumbraCosine, angleCosine );\n}\n#if NUM_SUN_LIGHTS > 0\n	struct SunLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];\n	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {\n		light.color = sunLight.color;\n		light.direction = sunLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_DIR_LIGHTS > 0\n	struct DirectionalLight {\n		vec3 direction;\n		vec3 color;\n	};\n	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];\n	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {\n		light.color = directionalLight.color;\n		light.direction = directionalLight.direction;\n		light.visible = true;\n	}\n#endif\n#if NUM_POINT_LIGHTS > 0\n	struct PointLight {\n		vec3 position;\n		vec3 color;\n		float distance;\n		float decay;\n	};\n	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];\n	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = pointLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float lightDistance = length( lVector );\n		light.color = pointLight.color;\n		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );\n		light.visible = ( light.color != vec3( 0.0 ) );\n	}\n#endif\n#if NUM_SPOT_LIGHTS > 0\n	struct SpotLight {\n		vec3 position;\n		vec3 direction;\n		vec3 color;\n		float distance;\n		float decay;\n		float coneCos;\n		float penumbraCos;\n	};\n	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];\n	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {\n		vec3 lVector = spotLight.position - geometryPosition;\n		light.direction = normalize( lVector );\n		float angleCos = dot( light.direction, spotLight.direction );\n		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );\n		if ( spotAttenuation > 0.0 ) {\n			float lightDistance = length( lVector );\n			light.color = spotLight.color * spotAttenuation;\n			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );\n			light.visible = ( light.color != vec3( 0.0 ) );\n		} else {\n			light.color = vec3( 0.0 );\n			light.visible = false;\n		}\n	}\n#endif\n#if NUM_RECT_AREA_LIGHTS > 0\n	struct RectAreaLight {\n		vec3 color;\n		vec3 position;\n		vec3 halfWidth;\n		vec3 halfHeight;\n	};\n	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;\n	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];\n#endif\n#if NUM_HEMI_LIGHTS > 0\n	struct HemisphereLight {\n		vec3 direction;\n		vec3 skyColor;\n		vec3 groundColor;\n	};\n	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];\n	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {\n		float dotNL = dot( normal, hemiLight.direction );\n		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;\n		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );\n		return irradiance;\n	}\n#endif\n#include <lightprobes_pars_fragment>",
	lights_toon_fragment: "ToonMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;",
	lights_toon_pars_fragment: "varying vec3 vViewPosition;\nstruct ToonMaterial {\n	vec3 diffuseColor;\n};\nvoid RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\nvoid RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_Toon\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon",
	lights_phong_fragment: "BlinnPhongMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.specularColor = specular;\nmaterial.specularShininess = shininess;\nmaterial.specularStrength = specularStrength;",
	lights_phong_pars_fragment: "varying vec3 vViewPosition;\nstruct BlinnPhongMaterial {\n	vec3 diffuseColor;\n	vec3 specularColor;\n	float specularShininess;\n	float specularStrength;\n};\nvoid RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;\n}\nvoid RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {\n	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );\n}\n#define RE_Direct				RE_Direct_BlinnPhong\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong",
	lights_physical_fragment: "PhysicalMaterial material;\nmaterial.diffuseColor = diffuseColor.rgb;\nmaterial.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );\nmaterial.metalness = metalnessFactor;\nvec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );\nfloat geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );\nmaterial.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;\nmaterial.roughness = min( material.roughness, 1.0 );\n#ifdef IOR\n	material.ior = ior;\n	#ifdef USE_SPECULAR\n		float specularIntensityFactor = specularIntensity;\n		vec3 specularColorFactor = specularColor;\n		#ifdef USE_SPECULAR_COLORMAP\n			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;\n		#endif\n		#ifdef USE_SPECULAR_INTENSITYMAP\n			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;\n		#endif\n		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );\n	#else\n		float specularIntensityFactor = 1.0;\n		vec3 specularColorFactor = vec3( 1.0 );\n		material.specularF90 = 1.0;\n	#endif\n	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;\n	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );\n#else\n	material.specularColor = vec3( 0.04 );\n	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );\n	material.specularF90 = 1.0;\n#endif\n#ifdef USE_CLEARCOAT\n	material.clearcoat = clearcoat;\n	material.clearcoatRoughness = clearcoatRoughness;\n	material.clearcoatF0 = vec3( 0.04 );\n	material.clearcoatF90 = 1.0;\n	#ifdef USE_CLEARCOATMAP\n		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;\n	#endif\n	#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;\n	#endif\n	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );\n	material.clearcoatRoughness += geometryRoughness;\n	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );\n#endif\n#ifdef USE_DISPERSION\n	material.dispersion = dispersion;\n#endif\n#ifdef USE_RETROREFLECTION\n	material.retroreflectivity = retroreflectivity;\n#endif\n#ifdef USE_IRIDESCENCE\n	material.iridescence = iridescence;\n	material.iridescenceIOR = iridescenceIOR;\n	#ifdef USE_IRIDESCENCEMAP\n		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;\n	#endif\n	#ifdef USE_IRIDESCENCE_THICKNESSMAP\n		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;\n	#else\n		material.iridescenceThickness = iridescenceThicknessMaximum;\n	#endif\n#endif\n#ifdef USE_SHEEN\n	material.sheenColor = sheenColor;\n	#ifdef USE_SHEEN_COLORMAP\n		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;\n	#endif\n	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	#ifdef USE_ANISOTROPYMAP\n		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );\n		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;\n		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;\n	#else\n		vec2 anisotropyV = anisotropyVector;\n	#endif\n	material.anisotropy = length( anisotropyV );\n	if( material.anisotropy == 0.0 ) {\n		anisotropyV = vec2( 1.0, 0.0 );\n	} else {\n		anisotropyV /= material.anisotropy;\n		material.anisotropy = saturate( material.anisotropy );\n	}\n	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );\n	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;\n	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;\n#endif",
	lights_physical_pars_fragment: "uniform sampler2D dfgLUT;\nstruct PhysicalMaterial {\n	vec3 diffuseColor;\n	vec3 diffuseContribution;\n	vec3 specularColor;\n	vec3 specularColorBlended;\n	float roughness;\n	float metalness;\n	float specularF90;\n	float dispersion;\n	vec2 dfg;\n	vec3 multiScatteringCompensation;\n	#ifdef USE_RETROREFLECTION\n		float retroreflectivity;\n	#endif\n	#ifdef USE_CLEARCOAT\n		float clearcoat;\n		float clearcoatRoughness;\n		vec3 clearcoatF0;\n		float clearcoatF90;\n	#endif\n	#ifdef USE_IRIDESCENCE\n		float iridescence;\n		float iridescenceIOR;\n		float iridescenceThickness;\n		vec3 iridescenceFresnel;\n		vec3 iridescenceF0Dielectric;\n		vec3 iridescenceF0Metallic;\n	#endif\n	#ifdef USE_SHEEN\n		vec3 sheenColor;\n		float sheenRoughness;\n	#endif\n	#ifdef IOR\n		float ior;\n	#endif\n	#ifdef USE_TRANSMISSION\n		float transmission;\n		float transmissionAlpha;\n		float thickness;\n		float attenuationDistance;\n		vec3 attenuationColor;\n	#endif\n	#ifdef USE_ANISOTROPY\n		float anisotropy;\n		float alphaT;\n		vec3 anisotropyT;\n		vec3 anisotropyB;\n	#endif\n};\nvec3 clearcoatSpecularDirect = vec3( 0.0 );\nvec3 clearcoatSpecularIndirect = vec3( 0.0 );\nvec3 sheenSpecularDirect = vec3( 0.0 );\nvec3 sheenSpecularIndirect = vec3(0.0 );\nvec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {\n    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );\n    float x2 = x * x;\n    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );\n    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );\n}\nfloat V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {\n	float a2 = pow2( alpha );\n	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n	return 0.5 / max( gv + gl, EPSILON );\n}\nfloat D_GGX( const in float alpha, const in float dotNH ) {\n	float a2 = pow2( alpha );\n	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;\n	return RECIPROCAL_PI * a2 / pow2( denom );\n}\n#ifdef USE_ANISOTROPY\n	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {\n		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );\n		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );\n		return 0.5 / max( gv + gl, EPSILON );\n	}\n	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {\n		float a2 = alphaT * alphaB;\n		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );\n		highp float v2 = dot( v, v );\n		float w2 = a2 / v2;\n		return RECIPROCAL_PI * a2 * pow2 ( w2 );\n	}\n#endif\n#ifdef USE_CLEARCOAT\n	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {\n		vec3 f0 = material.clearcoatF0;\n		float f90 = material.clearcoatF90;\n		float roughness = material.clearcoatRoughness;\n		float alpha = pow2( roughness );\n		vec3 halfDir = normalize( lightDir + viewDir );\n		float dotNL = saturate( dot( normal, lightDir ) );\n		float dotNV = saturate( dot( normal, viewDir ) );\n		float dotNH = saturate( dot( normal, halfDir ) );\n		float dotVH = saturate( dot( viewDir, halfDir ) );\n		vec3 F = F_Schlick( f0, f90, dotVH );\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n		return F * ( V * D );\n	}\n#endif\nvec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {\n	vec3 f0 = material.specularColorBlended;\n	float f90 = material.specularF90;\n	float roughness = material.roughness;\n	float alpha = pow2( roughness );\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float dotVH = saturate( dot( viewDir, halfDir ) );\n	vec3 F = F_Schlick( f0, f90, dotVH );\n	#ifdef USE_IRIDESCENCE\n		F = mix( F, material.iridescenceFresnel, material.iridescence );\n	#endif\n	#ifdef USE_ANISOTROPY\n		float dotTL = dot( material.anisotropyT, lightDir );\n		float dotTV = dot( material.anisotropyT, viewDir );\n		float dotTH = dot( material.anisotropyT, halfDir );\n		float dotBL = dot( material.anisotropyB, lightDir );\n		float dotBV = dot( material.anisotropyB, viewDir );\n		float dotBH = dot( material.anisotropyB, halfDir );\n		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );\n		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );\n	#else\n		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n		float D = D_GGX( alpha, dotNH );\n	#endif\n	return F * ( V * D );\n}\nvec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {\n	const float LUT_SIZE = 64.0;\n	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;\n	const float LUT_BIAS = 0.5 / LUT_SIZE;\n	float dotNV = saturate( dot( N, V ) );\n	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );\n	uv = uv * LUT_SCALE + LUT_BIAS;\n	return uv;\n}\nfloat LTC_ClippedSphereFormFactor( const in vec3 f ) {\n	float l = length( f );\n	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );\n}\nvec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {\n	float x = dot( v1, v2 );\n	float y = abs( x );\n	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;\n	float b = 3.4175940 + ( 4.1616724 + y ) * y;\n	float v = a / b;\n	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;\n	return cross( v1, v2 ) * theta_sintheta;\n}\nvec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {\n	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];\n	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];\n	vec3 lightNormal = cross( v1, v2 );\n	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );\n	vec3 T1, T2;\n	T1 = normalize( V - N * dot( V, N ) );\n	T2 = - cross( N, T1 );\n	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );\n	vec3 coords[ 4 ];\n	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );\n	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );\n	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );\n	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );\n	coords[ 0 ] = normalize( coords[ 0 ] );\n	coords[ 1 ] = normalize( coords[ 1 ] );\n	coords[ 2 ] = normalize( coords[ 2 ] );\n	coords[ 3 ] = normalize( coords[ 3 ] );\n	vec3 vectorFormFactor = vec3( 0.0 );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );\n	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );\n	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );\n	return vec3( result );\n}\n#if defined( USE_SHEEN )\nfloat D_Charlie( float roughness, float dotNH ) {\n	float alpha = pow2( roughness );\n	float invAlpha = 1.0 / alpha;\n	float cos2h = dotNH * dotNH;\n	float sin2h = max( 1.0 - cos2h, 0.0078125 );\n	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );\n}\nfloat V_Neubelt( float dotNV, float dotNL ) {\n	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );\n}\nvec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {\n	vec3 halfDir = normalize( lightDir + viewDir );\n	float dotNL = saturate( dot( normal, lightDir ) );\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float dotNH = saturate( dot( normal, halfDir ) );\n	float D = D_Charlie( sheenRoughness, dotNH );\n	float V = V_Neubelt( dotNV, dotNL );\n	return sheenColor * ( D * V );\n}\n#endif\nfloat IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	float r2 = roughness * roughness;\n	float rInv = 1.0 / ( roughness + 0.1 );\n	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;\n	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;\n	float DG = exp( a * dotNV + b );\n	return saturate( DG );\n}\nvec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {\n	float dotNV = saturate( dot( normal, viewDir ) );\n	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;\n	return specularColor * fab.x + specularF90 * fab.y;\n}\n#ifdef USE_IRIDESCENCE\nvoid computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#else\nvoid computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {\n#endif\n	#ifdef USE_IRIDESCENCE\n		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );\n	#else\n		vec3 Fr = specularColor;\n	#endif\n	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;\n	float Ess = fab.x + fab.y;\n	float Ems = 1.0 - Ess;\n	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );\n	singleScatter += FssEss;\n	multiScatter += Fms * Ems;\n}\n#if NUM_RECT_AREA_LIGHTS > 0\n	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n		vec3 normal = geometryNormal;\n		vec3 viewDir = geometryViewDir;\n		vec3 position = geometryPosition;\n		vec3 lightPos = rectAreaLight.position;\n		vec3 halfWidth = rectAreaLight.halfWidth;\n		vec3 halfHeight = rectAreaLight.halfHeight;\n		vec3 lightColor = rectAreaLight.color;\n		float roughness = material.roughness;\n		vec3 rectCoords[ 4 ];\n		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;\n		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;\n		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;\n		vec2 uv = LTC_Uv( normal, viewDir, roughness );\n		vec4 t1 = texture2D( ltc_1, uv );\n		vec4 t2 = texture2D( ltc_2, uv );\n		mat3 mInv = mat3(\n			vec3( t1.x, 0, t1.y ),\n			vec3(    0, 1,    0 ),\n			vec3( t1.z, 0, t1.w )\n		);\n		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );\n		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );\n		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );\n		#ifdef USE_CLEARCOAT\n			vec3 Ncc = geometryClearcoatNormal;\n			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );\n			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );\n			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );\n			mat3 mInvClearcoat = mat3(\n				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),\n				vec3(             0, 1,             0 ),\n				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )\n			);\n			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;\n			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );\n		#endif\n	}\n#endif\nvoid RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n	vec3 irradiance = dotNL * directLight.color;\n	#ifdef USE_CLEARCOAT\n		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );\n		vec3 ccIrradiance = dotNLcc * directLight.color;\n		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );\n	#endif\n	#ifdef USE_SHEEN\n \n 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );\n \n 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );\n \n 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );\n \n 		irradiance *= sheenEnergyComp;\n \n 	#endif\n	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );\n	#ifdef USE_RETROREFLECTION\n		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );\n		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );\n		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );\n	#endif\n	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;\n	vec3 halfDir = normalize( directLight.direction + geometryViewDir );\n	float dotVH = saturate( dot( geometryViewDir, halfDir ) );\n	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );\n	#ifdef USE_RETROREFLECTION\n		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );\n		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );\n		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );\n		F = mix( F, retroF, saturate( material.retroreflectivity ) );\n	#endif\n	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );\n}\nvoid RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {\n	vec3 singleScattering = vec3( 0.0 );\n	vec3 multiScattering = vec3( 0.0 );\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );\n	#else\n		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );\n	#endif\n	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );\n	#ifdef USE_SHEEN\n		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;\n		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;\n		diffuse *= sheenEnergyComp;\n	#endif\n	reflectedLight.indirectDiffuse += diffuse;\n}\nvoid RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {\n	#ifdef USE_CLEARCOAT\n		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );\n	#endif\n	#ifdef USE_SHEEN\n		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;\n 	#endif\n	vec3 singleScatteringDielectric = vec3( 0.0 );\n	vec3 multiScatteringDielectric = vec3( 0.0 );\n	vec3 singleScatteringMetallic = vec3( 0.0 );\n	vec3 multiScatteringMetallic = vec3( 0.0 );\n	#ifdef USE_IRIDESCENCE\n		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );\n		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );\n	#else\n		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );\n		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );\n	#endif\n	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );\n	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );\n	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;\n	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );\n	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;\n	vec3 indirectSpecular = radiance * singleScattering;\n	indirectSpecular += multiScattering * cosineWeightedIrradiance;\n	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;\n	#ifdef USE_SHEEN\n		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );\n		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;\n		indirectSpecular *= sheenEnergyComp;\n		indirectDiffuse *= sheenEnergyComp;\n	#endif\n	reflectedLight.indirectSpecular += indirectSpecular;\n	reflectedLight.indirectDiffuse += indirectDiffuse;\n}\n#define RE_Direct				RE_Direct_Physical\n#define RE_Direct_RectArea		RE_Direct_RectArea_Physical\n#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical\n#define RE_IndirectSpecular		RE_IndirectSpecular_Physical\nfloat computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {\n	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );\n}",
	lights_fragment_begin: "\nvec3 geometryPosition = - vViewPosition;\nvec3 geometryNormal = normal;\nvec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );\nvec3 geometryClearcoatNormal = vec3( 0.0 );\n#ifdef USE_CLEARCOAT\n	geometryClearcoatNormal = clearcoatNormal;\n#endif\n#ifdef USE_IRIDESCENCE\n	float dotNVi = saturate( dot( normal, geometryViewDir ) );\n	if ( material.iridescenceThickness == 0.0 ) {\n		material.iridescence = 0.0;\n	} else {\n		material.iridescence = saturate( material.iridescence );\n	}\n	if ( material.iridescence > 0.0 ) {\n		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );\n		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );\n		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );\n		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );\n		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );\n	}\n#endif\n#ifdef STANDARD\n	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );\n	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;\n	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )\n		float EssMs = material.dfg.x + material.dfg.y;\n		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );\n	#endif\n#endif\nIncidentLight directLight;\n#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )\n	PointLight pointLight;\n	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0\n	PointLightShadow pointLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {\n		pointLight = pointLights[ i ];\n		getPointLightInfo( pointLight, geometryPosition, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )\n		pointLightShadow = pointLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )\n	SpotLight spotLight;\n	vec4 spotColor;\n	vec3 spotLightCoord;\n	bool inSpotLightMap;\n	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {\n		spotLight = spotLights[ i ];\n		getSpotLightInfo( spotLight, geometryPosition, directLight );\n		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX\n		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS\n		#else\n		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )\n		#endif\n		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )\n			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;\n			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );\n			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );\n			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;\n		#endif\n		#undef SPOT_LIGHT_MAP_INDEX\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n		spotLightShadow = spotLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )\n	SunLight sunLight;\n	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0\n	SunLightShadow sunLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {\n		sunLight = sunLights[ i ];\n		getSunLightInfo( sunLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )\n		sunLightShadow = sunLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )\n	DirectionalLight directionalLight;\n	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLightShadow;\n	#endif\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {\n		directionalLight = directionalLights[ i ];\n		getDirectionalLightInfo( directionalLight, directLight );\n		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )\n		directionalLightShadow = directionalLightShadows[ i ];\n		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n		#endif\n		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )\n	RectAreaLight rectAreaLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {\n		rectAreaLight = rectAreaLights[ i ];\n		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n	}\n	#pragma unroll_loop_end\n#endif\n#if defined( RE_IndirectDiffuse )\n	vec3 iblIrradiance = vec3( 0.0 );\n	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );\n	#if defined( USE_LIGHT_PROBES )\n		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );\n	#endif\n	#if ( NUM_HEMI_LIGHTS > 0 )\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {\n			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );\n		}\n		#pragma unroll_loop_end\n	#endif\n	#ifdef USE_LIGHT_PROBES_GRID\n		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;\n		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );\n		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );\n	#endif\n#endif\n#if defined( RE_IndirectSpecular )\n	vec3 radiance = vec3( 0.0 );\n	vec3 clearcoatRadiance = vec3( 0.0 );\n#endif",
	lights_fragment_maps: "#if defined( RE_IndirectDiffuse )\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;\n		irradiance += lightMapIrradiance;\n	#endif\n	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )\n		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )\n			iblIrradiance += getIBLIrradiance( geometryNormal );\n		#endif\n	#endif\n#endif\n#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n	#ifdef USE_ANISOTROPY\n		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n	#else\n		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );\n	#endif\n	#ifdef USE_RETROREFLECTION\n		#ifdef USE_ANISOTROPY\n			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );\n		#else\n			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );\n		#endif\n		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );\n	#endif\n	radiance += iblRadiance;\n	#ifdef USE_CLEARCOAT\n		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );\n	#endif\n#endif",
	lights_fragment_end: "#if defined( RE_IndirectDiffuse )\n	#if defined( LAMBERT ) || defined( PHONG )\n		irradiance += iblIrradiance;\n	#endif\n	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif\n#if defined( RE_IndirectSpecular )\n	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n#endif",
	lightprobes_pars_fragment: "#ifdef USE_LIGHT_PROBES_GRID\nuniform highp sampler3D probesSH;\nuniform vec3 probesMin;\nuniform vec3 probesMax;\nuniform vec3 probesResolution;\nvec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {\n	vec3 res = probesResolution;\n	vec3 gridRange = probesMax - probesMin;\n	vec3 resMinusOne = res - 1.0;\n	vec3 probeSpacing = gridRange / resMinusOne;\n	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;\n	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );\n	uvw = uvw * resMinusOne / res + 0.5 / res;\n	float nz          = res.z;\n	float paddedSlices = nz + 2.0;\n	float atlasDepth  = 7.0 * paddedSlices;\n	float uvZBase     = uvw.z * nz + 1.0;\n	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );\n	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );\n	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );\n	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );\n	vec3 c0 = s0.xyz;\n	vec3 c1 = vec3( s0.w, s1.xy );\n	vec3 c2 = vec3( s1.zw, s2.x );\n	vec3 c3 = s2.yzw;\n	vec3 c4 = s3.xyz;\n	vec3 c5 = vec3( s3.w, s4.xy );\n	vec3 c6 = vec3( s4.zw, s5.x );\n	vec3 c7 = s5.yzw;\n	vec3 c8 = s6.xyz;\n	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;\n	vec3 result = c0 * 0.886227;\n	result += c1 * 2.0 * 0.511664 * y;\n	result += c2 * 2.0 * 0.511664 * z;\n	result += c3 * 2.0 * 0.511664 * x;\n	result += c4 * 2.0 * 0.429043 * x * y;\n	result += c5 * 2.0 * 0.429043 * y * z;\n	result += c6 * ( 0.743125 * z * z - 0.247708 );\n	result += c7 * 2.0 * 0.429043 * x * z;\n	result += c8 * 0.429043 * ( x * x - y * y );\n	return max( result, vec3( 0.0 ) );\n}\n#endif",
	logdepthbuf_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;\n#endif",
	logdepthbuf_pars_fragment: "#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )\n	uniform float logDepthBufFC;\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_pars_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	varying float vFragDepth;\n	varying float vIsPerspective;\n#endif",
	logdepthbuf_vertex: "#ifdef USE_LOGARITHMIC_DEPTH_BUFFER\n	vFragDepth = 1.0 + gl_Position.w;\n	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );\n#endif",
	map_fragment: "#ifdef USE_MAP\n	vec4 sampledDiffuseColor = texture2D( map, vMapUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );\n	#endif\n	diffuseColor *= sampledDiffuseColor;\n#endif",
	map_pars_fragment: "#ifdef USE_MAP\n	uniform sampler2D map;\n#endif",
	map_particle_fragment: "#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n	#if defined( USE_POINTS_UV )\n		vec2 uv = vUv;\n	#else\n		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;\n	#endif\n#endif\n#ifdef USE_MAP\n	diffuseColor *= texture2D( map, uv );\n#endif\n#ifdef USE_ALPHAMAP\n	diffuseColor.a *= texture2D( alphaMap, uv ).g;\n#endif",
	map_particle_pars_fragment: "#if defined( USE_POINTS_UV )\n	varying vec2 vUv;\n#else\n	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )\n		uniform mat3 uvTransform;\n	#endif\n#endif\n#ifdef USE_MAP\n	uniform sampler2D map;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform sampler2D alphaMap;\n#endif",
	metalnessmap_fragment: "float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );\n	metalnessFactor *= texelMetalness.b;\n#endif",
	metalnessmap_pars_fragment: "#ifdef USE_METALNESSMAP\n	uniform sampler2D metalnessMap;\n#endif",
	morphinstance_vertex: "#ifdef USE_INSTANCING_MORPH\n	float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;\n	}\n#endif",
	morphcolor_vertex: "#if defined( USE_MORPHCOLORS )\n	vColor *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		#if defined( USE_COLOR_ALPHA )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];\n		#elif defined( USE_COLOR )\n			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];\n		#endif\n	}\n#endif",
	morphnormal_vertex: "#ifdef USE_MORPHNORMALS\n	objectNormal *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	morphtarget_pars_vertex: "#ifdef USE_MORPHTARGETS\n	#ifndef USE_INSTANCING_MORPH\n		uniform float morphTargetBaseInfluence;\n		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];\n	#endif\n	uniform sampler2DArray morphTargetsTexture;\n	uniform ivec2 morphTargetsTextureSize;\n	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {\n		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;\n		int y = texelIndex / morphTargetsTextureSize.x;\n		int x = texelIndex - y * morphTargetsTextureSize.x;\n		ivec3 morphUV = ivec3( x, y, morphTargetIndex );\n		return texelFetch( morphTargetsTexture, morphUV, 0 );\n	}\n#endif",
	morphtarget_vertex: "#ifdef USE_MORPHTARGETS\n	transformed *= morphTargetBaseInfluence;\n	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {\n		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];\n	}\n#endif",
	normal_fragment_begin: "float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n#ifdef FLAT_SHADED\n	vec3 fdx = dFdx( vViewPosition );\n	vec3 fdy = dFdy( vViewPosition );\n	vec3 normal = normalize( cross( fdx, fdy ) );\n#else\n	vec3 normal = normalize( vNormal );\n	#ifdef DOUBLE_SIDED\n		normal *= faceDirection;\n	#endif\n#endif\n#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )\n	#ifdef USE_TANGENT\n		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn = getTangentFrame( - vViewPosition, normal,\n		#if defined( USE_NORMALMAP )\n			vNormalMapUv\n		#elif defined( USE_CLEARCOAT_NORMALMAP )\n			vClearcoatNormalMapUv\n		#else\n			vUv\n		#endif\n		);\n	#endif\n	#ifdef DOUBLE_SIDED\n		tbn[0] *= faceDirection;\n		tbn[1] *= faceDirection;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	#ifdef USE_TANGENT\n		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );\n	#else\n		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );\n	#endif\n	#ifdef DOUBLE_SIDED\n		tbn2[0] *= faceDirection;\n		tbn2[1] *= faceDirection;\n	#endif\n#endif\nvec3 nonPerturbedNormal = normal;",
	normal_fragment_maps: "#ifdef USE_NORMALMAP_OBJECTSPACE\n	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#ifdef FLIP_SIDED\n		normal = - normal;\n	#endif\n	#ifdef DOUBLE_SIDED\n		normal = normal * faceDirection;\n	#endif\n	normal = normalize( normalMatrix * normal );\n#elif defined( USE_NORMALMAP_TANGENTSPACE )\n	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;\n	#if defined( USE_PACKED_NORMALMAP )\n		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );\n	#endif\n	mapN.xy *= normalScale;\n	normal = normalize( tbn * mapN );\n#elif defined( USE_BUMPMAP )\n	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );\n#endif",
	normal_pars_fragment: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_pars_vertex: "#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n	#ifdef USE_TANGENT\n		varying vec3 vTangent;\n		varying vec3 vBitangent;\n	#endif\n#endif",
	normal_vertex: "#ifndef FLAT_SHADED\n	vNormal = normalize( transformedNormal );\n	#ifdef USE_TANGENT\n		vTangent = normalize( transformedTangent );\n		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );\n		#ifdef FLIP_SIDED\n			vBitangent = - vBitangent;\n		#endif\n	#endif\n#endif",
	normalmap_pars_fragment: "#ifdef USE_NORMALMAP\n	uniform sampler2D normalMap;\n	uniform vec2 normalScale;\n#endif\n#ifdef USE_NORMALMAP_OBJECTSPACE\n	uniform mat3 normalMatrix;\n#endif\n#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )\n	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {\n		vec3 q0 = dFdx( eye_pos.xyz );\n		vec3 q1 = dFdy( eye_pos.xyz );\n		vec2 st0 = dFdx( uv.st );\n		vec2 st1 = dFdy( uv.st );\n		vec3 N = surf_norm;\n		vec3 q1perp = cross( q1, N );\n		vec3 q0perp = cross( N, q0 );\n		vec3 T = q1perp * st0.x + q0perp * st1.x;\n		vec3 B = q1perp * st0.y + q0perp * st1.y;\n		float det = max( dot( T, T ), dot( B, B ) );\n		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );\n		return mat3( T * scale, B * scale, N );\n	}\n#endif",
	clearcoat_normal_fragment_begin: "#ifdef USE_CLEARCOAT\n	vec3 clearcoatNormal = nonPerturbedNormal;\n#endif",
	clearcoat_normal_fragment_maps: "#ifdef USE_CLEARCOAT_NORMALMAP\n	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;\n	clearcoatMapN.xy *= clearcoatNormalScale;\n	clearcoatNormal = normalize( tbn2 * clearcoatMapN );\n#endif",
	clearcoat_pars_fragment: "#ifdef USE_CLEARCOATMAP\n	uniform sampler2D clearcoatMap;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform sampler2D clearcoatNormalMap;\n	uniform vec2 clearcoatNormalScale;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform sampler2D clearcoatRoughnessMap;\n#endif",
	iridescence_pars_fragment: "#ifdef USE_IRIDESCENCEMAP\n	uniform sampler2D iridescenceMap;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform sampler2D iridescenceThicknessMap;\n#endif",
	opaque_fragment: "#ifdef OPAQUE\ndiffuseColor.a = 1.0;\n#endif\n#ifdef USE_TRANSMISSION\ndiffuseColor.a *= material.transmissionAlpha;\n#endif\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );",
	packing: "vec3 packNormalToRGB( const in vec3 normal ) {\n	return normalize( normal ) * 0.5 + 0.5;\n}\nvec3 unpackRGBToNormal( const in vec3 rgb ) {\n	return 2.0 * rgb.xyz - 1.0;\n}\nconst float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;\nconst float Inv255 = 1. / 255.;\nconst vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );\nconst vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );\nconst vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );\nconst vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );\nvec4 packDepthToRGBA( const in float v ) {\n	if( v <= 0.0 )\n		return vec4( 0., 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec4( 1., 1., 1., 1. );\n	float vuf;\n	float af = modf( v * PackFactors.a, vuf );\n	float bf = modf( vuf * ShiftRight8, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );\n}\nvec3 packDepthToRGB( const in float v ) {\n	if( v <= 0.0 )\n		return vec3( 0., 0., 0. );\n	if( v >= 1.0 )\n		return vec3( 1., 1., 1. );\n	float vuf;\n	float bf = modf( v * PackFactors.b, vuf );\n	float gf = modf( vuf * ShiftRight8, vuf );\n	return vec3( vuf * Inv255, gf * PackUpscale, bf );\n}\nvec2 packDepthToRG( const in float v ) {\n	if( v <= 0.0 )\n		return vec2( 0., 0. );\n	if( v >= 1.0 )\n		return vec2( 1., 1. );\n	float vuf;\n	float gf = modf( v * 256., vuf );\n	return vec2( vuf * Inv255, gf );\n}\nfloat unpackRGBAToDepth( const in vec4 v ) {\n	return dot( v, UnpackFactors4 );\n}\nfloat unpackRGBToDepth( const in vec3 v ) {\n	return dot( v, UnpackFactors3 );\n}\nfloat unpackRGToDepth( const in vec2 v ) {\n	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;\n}\nvec4 pack2HalfToRGBA( const in vec2 v ) {\n	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );\n	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );\n}\nvec2 unpackRGBATo2Half( const in vec4 v ) {\n	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );\n}\nfloat viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( viewZ + near ) / ( near - far );\n}\nfloat orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n	\n		return depth * ( far - near ) - far;\n	#else\n		return depth * ( near - far ) - near;\n	#endif\n}\nfloat viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {\n	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );\n}\nfloat perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {\n	\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n		return ( near * far ) / ( ( near - far ) * depth - near );\n	#else\n		return ( near * far ) / ( ( far - near ) * depth - far );\n	#endif\n}",
	premultiplied_alpha_fragment: "#ifdef PREMULTIPLIED_ALPHA\n	gl_FragColor.rgb *= gl_FragColor.a;\n#endif",
	project_vertex: "vec4 mvPosition = vec4( transformed, 1.0 );\n#ifdef USE_BATCHING\n	mvPosition = batchingMatrix * mvPosition;\n#endif\n#ifdef USE_INSTANCING\n	mvPosition = instanceMatrix * mvPosition;\n#endif\nmvPosition = modelViewMatrix * mvPosition;\ngl_Position = projectionMatrix * mvPosition;",
	dithering_fragment: "#ifdef DITHERING\n	gl_FragColor.rgb = dithering( gl_FragColor.rgb );\n#endif",
	dithering_pars_fragment: "#ifdef DITHERING\n	vec3 dithering( vec3 color ) {\n		float grid_position = rand( gl_FragCoord.xy );\n		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );\n		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );\n		return color + dither_shift_RGB;\n	}\n#endif",
	roughnessmap_fragment: "float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );\n	roughnessFactor *= texelRoughness.g;\n#endif",
	roughnessmap_pars_fragment: "#ifdef USE_ROUGHNESSMAP\n	uniform sampler2D roughnessMap;\n#endif",
	shadowmap_pars_fragment: "#if NUM_SPOT_LIGHT_COORDS > 0\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#if NUM_SPOT_LIGHT_MAPS > 0\n	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		#define SUN_LIGHT_CASCADES 2\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];\n		#endif\n		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];\n		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];\n		varying vec4 vSunShadowWorldPosition;\n		varying vec3 vSunShadowWorldNormal;\n		struct SunLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];\n		#endif\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		#else\n			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];\n		#endif\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#if defined( SHADOWMAP_TYPE_PCF )\n			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		#elif defined( SHADOWMAP_TYPE_BASIC )\n			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];\n		#endif\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n	#if defined( SHADOWMAP_TYPE_PCF )\n		float interleavedGradientNoise( vec2 position ) {\n			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );\n		}\n		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {\n			const float goldenAngle = 2.399963229728653;\n			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );\n			float theta = float( sampleIndex ) * goldenAngle + phi;\n			return vec2( cos( theta ), sin( theta ) ) * r;\n		}\n	#endif\n	#if defined( SHADOWMAP_TYPE_PCF )\n		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			shadowCoord.z += shadowBias;\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;\n				float radius = shadowRadius * texelSize.x;\n				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;\n				shadow = (\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +\n					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )\n				) * 0.2;\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#elif defined( SHADOWMAP_TYPE_VSM )\n		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				shadowCoord.z -= shadowBias;\n			#else\n				shadowCoord.z += shadowBias;\n			#endif\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;\n				float mean = distribution.x;\n				float variance = distribution.y * distribution.y;\n				#ifdef USE_REVERSED_DEPTH_BUFFER\n					float hard_shadow = step( mean, shadowCoord.z );\n				#else\n					float hard_shadow = step( shadowCoord.z, mean );\n				#endif\n				\n				if ( hard_shadow == 1.0 ) {\n					shadow = 1.0;\n				} else {\n					variance = max( variance, 0.0000001 );\n					float d = shadowCoord.z - mean;\n					float p_max = variance / ( variance + d * d );\n					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );\n					shadow = max( hard_shadow, p_max );\n				}\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#else\n		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n			float shadow = 1.0;\n			shadowCoord.xyz /= shadowCoord.w;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				shadowCoord.z -= shadowBias;\n			#else\n				shadowCoord.z += shadowBias;\n			#endif\n			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n			if ( frustumTest ) {\n				float depth = texture2D( shadowMap, shadowCoord.xy ).r;\n				#ifdef USE_REVERSED_DEPTH_BUFFER\n					shadow = step( depth, shadowCoord.z );\n				#else\n					shadow = step( shadowCoord.z, depth );\n				#endif\n			}\n			return mix( 1.0, shadow, shadowIntensity );\n		}\n	#endif\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		float getSunShadow(\n			#if defined( SHADOWMAP_TYPE_PCF )\n				sampler2DShadow shadowMap,\n			#else\n				sampler2D shadowMap,\n			#endif\n			SunLightShadow sunLightShadow,\n			int shadowIndex\n		) {\n			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );\n			float viewDepth = vSunShadowWorldPosition.w;\n			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;\n			float shadow = 1.0;\n			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {\n				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];\n				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {\n					float cascadeShadow = getShadow(\n						shadowMap,\n						sunLightShadow.shadowMapSize,\n						sunLightShadow.shadowIntensity,\n						sunLightShadow.shadowBias,\n						sunLightShadow.shadowRadius,\n						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition\n					);\n					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );\n				}\n			}\n			return shadow;\n		}\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n	#if defined( SHADOWMAP_TYPE_PCF )\n	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		vec3 bd3D = normalize( lightToPosition );\n		vec3 absVec = abs( lightToPosition );\n		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );\n		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n				dp -= shadowBias;\n			#else\n				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n				dp += shadowBias;\n			#endif\n			float texelSize = shadowRadius / shadowMapSize.x;\n			vec3 absDir = abs( bd3D );\n			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );\n			tangent = normalize( cross( bd3D, tangent ) );\n			vec3 bitangent = cross( bd3D, tangent );\n			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;\n			vec2 sample0 = vogelDiskSample( 0, 5, phi );\n			vec2 sample1 = vogelDiskSample( 1, 5, phi );\n			vec2 sample2 = vogelDiskSample( 2, 5, phi );\n			vec2 sample3 = vogelDiskSample( 3, 5, phi );\n			vec2 sample4 = vogelDiskSample( 4, 5, phi );\n			shadow = (\n				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +\n				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )\n			) * 0.2;\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	#elif defined( SHADOWMAP_TYPE_BASIC )\n	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {\n		float shadow = 1.0;\n		vec3 lightToPosition = shadowCoord.xyz;\n		vec3 absVec = abs( lightToPosition );\n		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );\n		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {\n			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );\n			dp += shadowBias;\n			vec3 bd3D = normalize( lightToPosition );\n			float depth = textureCube( shadowMap, bd3D ).r;\n			#ifdef USE_REVERSED_DEPTH_BUFFER\n				depth = 1.0 - depth;\n			#endif\n			shadow = step( dp, depth );\n		}\n		return mix( 1.0, shadow, shadowIntensity );\n	}\n	#endif\n	#endif\n#endif",
	shadowmap_pars_vertex: "#if NUM_SPOT_LIGHT_COORDS > 0\n	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];\n	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];\n#endif\n#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		varying vec4 vSunShadowWorldPosition;\n		varying vec3 vSunShadowWorldNormal;\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];\n		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];\n		struct DirectionalLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n		struct SpotLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n		};\n		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];\n		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];\n		struct PointLightShadow {\n			float shadowIntensity;\n			float shadowBias;\n			float shadowNormalBias;\n			float shadowRadius;\n			vec2 shadowMapSize;\n			float shadowCameraNear;\n			float shadowCameraFar;\n		};\n		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];\n	#endif\n#endif",
	shadowmap_vertex: "#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )\n	#ifdef HAS_NORMAL\n		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );\n	#else\n		vec3 shadowWorldNormal = vec3( 0.0 );\n	#endif\n	vec4 shadowWorldPosition;\n#endif\n#if defined( USE_SHADOWMAP )\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );\n		vSunShadowWorldNormal = shadowWorldNormal;\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );\n			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0\n		#pragma unroll_loop_start\n		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );\n			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;\n		}\n		#pragma unroll_loop_end\n	#endif\n#endif\n#if NUM_SPOT_LIGHT_COORDS > 0\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {\n		shadowWorldPosition = worldPosition;\n		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )\n			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;\n		#endif\n		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;\n	}\n	#pragma unroll_loop_end\n#endif",
	shadowmask_pars_fragment: "float getShadowMask() {\n	float shadow = 1.0;\n	#ifdef USE_SHADOWMAP\n	#if NUM_SUN_LIGHT_SHADOWS > 0\n	SunLightShadow sunLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {\n		sunLight = sunLightShadows[ i ];\n		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_DIR_LIGHT_SHADOWS > 0\n	DirectionalLightShadow directionalLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {\n		directionalLight = directionalLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_SPOT_LIGHT_SHADOWS > 0\n	SpotLightShadow spotLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {\n		spotLight = spotLightShadows[ i ];\n		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )\n	PointLightShadow pointLight;\n	#pragma unroll_loop_start\n	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {\n		pointLight = pointLightShadows[ i ];\n		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;\n	}\n	#pragma unroll_loop_end\n	#endif\n	#endif\n	return shadow;\n}",
	skinbase_vertex: "#ifdef USE_SKINNING\n	mat4 boneMatX = getBoneMatrix( skinIndex.x );\n	mat4 boneMatY = getBoneMatrix( skinIndex.y );\n	mat4 boneMatZ = getBoneMatrix( skinIndex.z );\n	mat4 boneMatW = getBoneMatrix( skinIndex.w );\n#endif",
	skinning_pars_vertex: "#ifdef USE_SKINNING\n	uniform mat4 bindMatrix;\n	uniform mat4 bindMatrixInverse;\n	uniform highp sampler2D boneTexture;\n	mat4 getBoneMatrix( const in float i ) {\n		int size = textureSize( boneTexture, 0 ).x;\n		int j = int( i ) * 4;\n		int x = j % size;\n		int y = j / size;\n		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );\n		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );\n		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );\n		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );\n		return mat4( v1, v2, v3, v4 );\n	}\n#endif",
	skinning_vertex: "#ifdef USE_SKINNING\n	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );\n	vec4 skinned = vec4( 0.0 );\n	skinned += boneMatX * skinVertex * skinWeight.x;\n	skinned += boneMatY * skinVertex * skinWeight.y;\n	skinned += boneMatZ * skinVertex * skinWeight.z;\n	skinned += boneMatW * skinVertex * skinWeight.w;\n	transformed = ( bindMatrixInverse * skinned ).xyz;\n#endif",
	skinnormal_vertex: "#ifdef USE_SKINNING\n	mat4 skinMatrix = mat4( 0.0 );\n	skinMatrix += skinWeight.x * boneMatX;\n	skinMatrix += skinWeight.y * boneMatY;\n	skinMatrix += skinWeight.z * boneMatZ;\n	skinMatrix += skinWeight.w * boneMatW;\n	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;\n	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;\n	#ifdef USE_TANGENT\n		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;\n	#endif\n#endif",
	specularmap_fragment: "float specularStrength;\n#ifdef USE_SPECULARMAP\n	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );\n	specularStrength = texelSpecular.r;\n#else\n	specularStrength = 1.0;\n#endif",
	specularmap_pars_fragment: "#ifdef USE_SPECULARMAP\n	uniform sampler2D specularMap;\n#endif",
	tonemapping_fragment: "#if defined( TONE_MAPPING )\n	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );\n#endif",
	tonemapping_pars_fragment: "#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\nuniform float toneMappingExposure;\nvec3 LinearToneMapping( vec3 color ) {\n	return saturate( toneMappingExposure * color );\n}\nvec3 ReinhardToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	return saturate( color / ( vec3( 1.0 ) + color ) );\n}\nvec3 CineonToneMapping( vec3 color ) {\n	color *= toneMappingExposure;\n	color = max( vec3( 0.0 ), color - 0.004 );\n	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );\n}\nvec3 RRTAndODTFit( vec3 v ) {\n	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;\n	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;\n	return a / b;\n}\nvec3 ACESFilmicToneMapping( vec3 color ) {\n	const mat3 ACESInputMat = mat3(\n		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),\n		vec3( 0.04823, 0.01566, 0.83777 )\n	);\n	const mat3 ACESOutputMat = mat3(\n		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),\n		vec3( -0.07367, -0.00605,  1.07602 )\n	);\n	color *= toneMappingExposure / 0.6;\n	color = ACESInputMat * color;\n	color = RRTAndODTFit( color );\n	color = ACESOutputMat * color;\n	return saturate( color );\n}\nconst mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(\n	vec3( 1.6605, - 0.1246, - 0.0182 ),\n	vec3( - 0.5876, 1.1329, - 0.1006 ),\n	vec3( - 0.0728, - 0.0083, 1.1187 )\n);\nconst mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(\n	vec3( 0.6274, 0.0691, 0.0164 ),\n	vec3( 0.3293, 0.9195, 0.0880 ),\n	vec3( 0.0433, 0.0113, 0.8956 )\n);\nvec3 agxDefaultContrastApprox( vec3 x ) {\n	vec3 x2 = x * x;\n	vec3 x4 = x2 * x2;\n	return + 15.5 * x4 * x2\n		- 40.14 * x4 * x\n		+ 31.96 * x4\n		- 6.868 * x2 * x\n		+ 0.4298 * x2\n		+ 0.1191 * x\n		- 0.00232;\n}\nvec3 AgXToneMapping( vec3 color ) {\n	const mat3 AgXInsetMatrix = mat3(\n		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),\n		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),\n		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )\n	);\n	const mat3 AgXOutsetMatrix = mat3(\n		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),\n		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),\n		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )\n	);\n	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;\n	color *= toneMappingExposure;\n	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;\n	color = AgXInsetMatrix * color;\n	color = max( color, 1e-10 );	color = log2( color );\n	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );\n	color = clamp( color, 0.0, 1.0 );\n	color = agxDefaultContrastApprox( color );\n	color = AgXOutsetMatrix * color;\n	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );\n	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;\n	color = clamp( color, 0.0, 1.0 );\n	return color;\n}\nvec3 NeutralToneMapping( vec3 color ) {\n	const float StartCompression = 0.8 - 0.04;\n	const float Desaturation = 0.15;\n	color *= toneMappingExposure;\n	float x = min( color.r, min( color.g, color.b ) );\n	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;\n	color -= offset;\n	float peak = max( color.r, max( color.g, color.b ) );\n	if ( peak < StartCompression ) return color;\n	float d = 1. - StartCompression;\n	float newPeak = 1. - d * d / ( peak + d - StartCompression );\n	color *= newPeak / peak;\n	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );\n	return mix( color, vec3( newPeak ), g );\n}\nvec3 CustomToneMapping( vec3 color ) { return color; }",
	transmission_fragment: "#ifdef USE_TRANSMISSION\n	material.transmission = transmission;\n	material.transmissionAlpha = 1.0;\n	material.thickness = thickness;\n	material.attenuationDistance = attenuationDistance;\n	material.attenuationColor = attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n	#endif\n	vec3 pos = vWorldPosition;\n	vec3 v = normalize( cameraPosition - pos );\n	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );\n	vec4 transmitted = getIBLVolumeRefraction(\n		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,\n		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,\n		material.attenuationColor, material.attenuationDistance );\n	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );\n	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );\n#endif",
	transmission_pars_fragment: "#ifdef USE_TRANSMISSION\n	uniform float transmission;\n	uniform float thickness;\n	uniform float attenuationDistance;\n	uniform vec3 attenuationColor;\n	#ifdef USE_TRANSMISSIONMAP\n		uniform sampler2D transmissionMap;\n	#endif\n	#ifdef USE_THICKNESSMAP\n		uniform sampler2D thicknessMap;\n	#endif\n	uniform vec2 transmissionSamplerSize;\n	uniform sampler2D transmissionSamplerMap;\n	uniform mat4 modelMatrix;\n	uniform mat4 projectionMatrix;\n	varying vec3 vWorldPosition;\n	float w0( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );\n	}\n	float w1( float a ) {\n		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );\n	}\n	float w2( float a ){\n		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );\n	}\n	float w3( float a ) {\n		return ( 1.0 / 6.0 ) * ( a * a * a );\n	}\n	float g0( float a ) {\n		return w0( a ) + w1( a );\n	}\n	float g1( float a ) {\n		return w2( a ) + w3( a );\n	}\n	float h0( float a ) {\n		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );\n	}\n	float h1( float a ) {\n		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );\n	}\n	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {\n		uv = uv * texelSize.zw + 0.5;\n		vec2 iuv = floor( uv );\n		vec2 fuv = fract( uv );\n		float g0x = g0( fuv.x );\n		float g1x = g1( fuv.x );\n		float h0x = h0( fuv.x );\n		float h1x = h1( fuv.x );\n		float h0y = h0( fuv.y );\n		float h1y = h1( fuv.y );\n		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;\n		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;\n		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +\n			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );\n	}\n	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {\n		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );\n		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );\n		vec2 fLodSizeInv = 1.0 / fLodSize;\n		vec2 cLodSizeInv = 1.0 / cLodSize;\n		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );\n		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );\n		return mix( fSample, cSample, fract( lod ) );\n	}\n	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {\n		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );\n		vec3 modelScale;\n		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );\n		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );\n		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );\n		return normalize( refractionVector ) * thickness * modelScale;\n	}\n	float applyIorToRoughness( const in float roughness, const in float ior ) {\n		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );\n	}\n	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {\n		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );\n		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );\n	}\n	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {\n		if ( isinf( attenuationDistance ) ) {\n			return vec3( 1.0 );\n		} else {\n			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;\n			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;\n		}\n	}\n	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,\n		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,\n		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,\n		const in vec3 attenuationColor, const in float attenuationDistance ) {\n		vec4 transmittedLight;\n		vec3 transmittance;\n		#ifdef USE_DISPERSION\n			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;\n			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );\n			for ( int i = 0; i < 3; i ++ ) {\n				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );\n				vec3 refractedRayExit = position + transmissionRay;\n				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n				vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n				refractionCoords += 1.0;\n				refractionCoords /= 2.0;\n				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );\n				transmittedLight[ i ] = transmissionSample[ i ];\n				transmittedLight.a += transmissionSample.a;\n				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];\n			}\n			transmittedLight.a /= 3.0;\n		#else\n			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );\n			vec3 refractedRayExit = position + transmissionRay;\n			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );\n			vec2 refractionCoords = ndcPos.xy / ndcPos.w;\n			refractionCoords += 1.0;\n			refractionCoords /= 2.0;\n			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );\n			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );\n		#endif\n		vec3 attenuatedColor = transmittance * transmittedLight.rgb;\n		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );\n		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;\n		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );\n	}\n#endif",
	uv_pars_fragment: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_pars_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	varying vec2 vUv;\n#endif\n#ifdef USE_MAP\n	uniform mat3 mapTransform;\n	varying vec2 vMapUv;\n#endif\n#ifdef USE_ALPHAMAP\n	uniform mat3 alphaMapTransform;\n	varying vec2 vAlphaMapUv;\n#endif\n#ifdef USE_LIGHTMAP\n	uniform mat3 lightMapTransform;\n	varying vec2 vLightMapUv;\n#endif\n#ifdef USE_AOMAP\n	uniform mat3 aoMapTransform;\n	varying vec2 vAoMapUv;\n#endif\n#ifdef USE_BUMPMAP\n	uniform mat3 bumpMapTransform;\n	varying vec2 vBumpMapUv;\n#endif\n#ifdef USE_NORMALMAP\n	uniform mat3 normalMapTransform;\n	varying vec2 vNormalMapUv;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	uniform mat3 displacementMapTransform;\n	varying vec2 vDisplacementMapUv;\n#endif\n#ifdef USE_EMISSIVEMAP\n	uniform mat3 emissiveMapTransform;\n	varying vec2 vEmissiveMapUv;\n#endif\n#ifdef USE_METALNESSMAP\n	uniform mat3 metalnessMapTransform;\n	varying vec2 vMetalnessMapUv;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	uniform mat3 roughnessMapTransform;\n	varying vec2 vRoughnessMapUv;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	uniform mat3 anisotropyMapTransform;\n	varying vec2 vAnisotropyMapUv;\n#endif\n#ifdef USE_CLEARCOATMAP\n	uniform mat3 clearcoatMapTransform;\n	varying vec2 vClearcoatMapUv;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	uniform mat3 clearcoatNormalMapTransform;\n	varying vec2 vClearcoatNormalMapUv;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	uniform mat3 clearcoatRoughnessMapTransform;\n	varying vec2 vClearcoatRoughnessMapUv;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	uniform mat3 sheenColorMapTransform;\n	varying vec2 vSheenColorMapUv;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	uniform mat3 sheenRoughnessMapTransform;\n	varying vec2 vSheenRoughnessMapUv;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	uniform mat3 iridescenceMapTransform;\n	varying vec2 vIridescenceMapUv;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	uniform mat3 iridescenceThicknessMapTransform;\n	varying vec2 vIridescenceThicknessMapUv;\n#endif\n#ifdef USE_SPECULARMAP\n	uniform mat3 specularMapTransform;\n	varying vec2 vSpecularMapUv;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	uniform mat3 specularColorMapTransform;\n	varying vec2 vSpecularColorMapUv;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	uniform mat3 specularIntensityMapTransform;\n	varying vec2 vSpecularIntensityMapUv;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	uniform mat3 transmissionMapTransform;\n	varying vec2 vTransmissionMapUv;\n#endif\n#ifdef USE_THICKNESSMAP\n	uniform mat3 thicknessMapTransform;\n	varying vec2 vThicknessMapUv;\n#endif",
	uv_vertex: "#if defined( USE_UV ) || defined( USE_ANISOTROPY )\n	vUv = vec3( uv, 1 ).xy;\n#endif\n#ifdef USE_MAP\n	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ALPHAMAP\n	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_LIGHTMAP\n	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_AOMAP\n	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_BUMPMAP\n	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_NORMALMAP\n	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_DISPLACEMENTMAP\n	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_EMISSIVEMAP\n	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_METALNESSMAP\n	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ROUGHNESSMAP\n	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_ANISOTROPYMAP\n	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOATMAP\n	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_NORMALMAP\n	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_CLEARCOAT_ROUGHNESSMAP\n	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCEMAP\n	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_IRIDESCENCE_THICKNESSMAP\n	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_COLORMAP\n	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SHEEN_ROUGHNESSMAP\n	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULARMAP\n	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_COLORMAP\n	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_SPECULAR_INTENSITYMAP\n	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_TRANSMISSIONMAP\n	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;\n#endif\n#ifdef USE_THICKNESSMAP\n	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;\n#endif",
	worldpos_vertex: "#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\n	vec4 worldPosition = vec4( transformed, 1.0 );\n	#ifdef USE_BATCHING\n		worldPosition = batchingMatrix * worldPosition;\n	#endif\n	#ifdef USE_INSTANCING\n		worldPosition = instanceMatrix * worldPosition;\n	#endif\n	worldPosition = modelMatrix * worldPosition;\n#endif",
	background_vert: "varying vec2 vUv;\nuniform mat3 uvTransform;\nvoid main() {\n	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	gl_Position = vec4( position.xy, 1.0, 1.0 );\n}",
	background_frag: "uniform sampler2D t2D;\nuniform float backgroundIntensity;\nvarying vec2 vUv;\nvoid main() {\n	vec4 texColor = texture2D( t2D, vUv );\n	#ifdef DECODE_VIDEO_TEXTURE\n		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	backgroundCube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	backgroundCube_frag: "#ifdef ENVMAP_TYPE_CUBE\n	uniform samplerCube envMap;\n#elif defined( ENVMAP_TYPE_CUBE_UV )\n	uniform sampler2D envMap;\n#endif\nuniform float backgroundBlurriness;\nuniform float backgroundIntensity;\nuniform mat3 backgroundRotation;\nvarying vec3 vWorldDirection;\n#include <cube_uv_reflection_fragment>\nvoid main() {\n	#ifdef ENVMAP_TYPE_CUBE\n		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );\n	#elif defined( ENVMAP_TYPE_CUBE_UV )\n		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );\n	#else\n		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n	#endif\n	texColor.rgb *= backgroundIntensity;\n	gl_FragColor = texColor;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	cube_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n	gl_Position.z = gl_Position.w;\n}",
	cube_frag: "uniform samplerCube tCube;\nuniform float tFlip;\nuniform float opacity;\nvarying vec3 vWorldDirection;\nvoid main() {\n	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );\n	gl_FragColor = texColor;\n	gl_FragColor.a *= opacity;\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	depth_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vHighPrecisionZW = gl_Position.zw;\n}",
	depth_frag: "#if DEPTH_PACKING == 3200\n	uniform float opacity;\n#endif\n#include <common>\n#include <packing>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvarying vec2 vHighPrecisionZW;\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#if DEPTH_PACKING == 3200\n		diffuseColor.a = opacity;\n	#endif\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <logdepthbuf_fragment>\n	#ifdef USE_REVERSED_DEPTH_BUFFER\n		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];\n	#else\n		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;\n	#endif\n	#if DEPTH_PACKING == 3200\n		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );\n	#elif DEPTH_PACKING == 3201\n		gl_FragColor = packDepthToRGBA( fragCoordZ );\n	#elif DEPTH_PACKING == 3202\n		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );\n	#elif DEPTH_PACKING == 3203\n		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );\n	#endif\n}",
	distance_vert: "#define DISTANCE\nvarying vec3 vWorldPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <skinbase_vertex>\n	#include <morphinstance_vertex>\n	#ifdef USE_DISPLACEMENTMAP\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <worldpos_vertex>\n	#include <clipping_planes_vertex>\n	vWorldPosition = worldPosition.xyz;\n}",
	distance_frag: "#define DISTANCE\nuniform vec3 referencePosition;\nuniform float nearDistance;\nuniform float farDistance;\nvarying vec3 vWorldPosition;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 1.0 );\n	#include <clipping_planes_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	float dist = length( vWorldPosition - referencePosition );\n	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );\n	dist = saturate( dist );\n	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );\n}",
	equirect_vert: "varying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vWorldDirection = transformDirection( position, modelMatrix );\n	#include <begin_vertex>\n	#include <project_vertex>\n}",
	equirect_frag: "uniform sampler2D tEquirect;\nvarying vec3 vWorldDirection;\n#include <common>\nvoid main() {\n	vec3 direction = normalize( vWorldDirection );\n	vec2 sampleUV = equirectUv( direction );\n	gl_FragColor = texture2D( tEquirect, sampleUV );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n}",
	linedashed_vert: "uniform float scale;\nattribute float lineDistance;\nvarying float vLineDistance;\n#include <common>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	vLineDistance = scale * lineDistance;\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	linedashed_frag: "uniform vec3 diffuse;\nuniform float opacity;\nuniform float dashSize;\nuniform float totalSize;\nvarying float vLineDistance;\n#include <common>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	if ( mod( vLineDistance, totalSize ) > dashSize ) {\n		discard;\n	}\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	meshbasic_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )\n		#include <beginnormal_vertex>\n		#include <morphnormal_vertex>\n		#include <skinbase_vertex>\n		#include <skinnormal_vertex>\n		#include <defaultnormal_vertex>\n	#endif\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <fog_vertex>\n}",
	meshbasic_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#ifndef FLAT_SHADED\n	varying vec3 vNormal;\n#endif\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	#ifdef USE_LIGHTMAP\n		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );\n		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;\n	#else\n		reflectedLight.indirectDiffuse += vec3( 1.0 );\n	#endif\n	#include <aomap_fragment>\n	reflectedLight.indirectDiffuse *= diffuseColor.rgb;\n	vec3 outgoingLight = reflectedLight.indirectDiffuse;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshlambert_vert: "#define LAMBERT\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshlambert_frag: "#define LAMBERT\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_lambert_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_lambert_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshmatcap_vert: "#define MATCAP\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <color_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n	vViewPosition = - mvPosition.xyz;\n}",
	meshmatcap_frag: "#define MATCAP\nuniform vec3 diffuse;\nuniform float opacity;\nuniform sampler2D matcap;\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	vec3 viewDir = normalize( vViewPosition );\n	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );\n	vec3 y = cross( viewDir, x );\n	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;\n	#ifdef USE_MATCAP\n		vec4 matcapColor = texture2D( matcap, uv );\n	#else\n		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );\n	#endif\n	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshnormal_vert: "#define NORMAL\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	vViewPosition = - mvPosition.xyz;\n#endif\n}",
	meshnormal_frag: "#define NORMAL\nuniform float opacity;\n#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )\n	varying vec3 vViewPosition;\n#endif\n#include <uv_pars_fragment>\n#include <normal_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );\n	#include <clipping_planes_fragment>\n	#include <logdepthbuf_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );\n	#ifdef OPAQUE\n		gl_FragColor.a = 1.0;\n	#endif\n}",
	meshphong_vert: "#define PHONG\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <envmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <envmap_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshphong_frag: "#define PHONG\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform vec3 specular;\nuniform float shininess;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_phong_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <specularmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <specularmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_phong_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n	#include <envmap_fragment>\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshphysical_vert: "#define STANDARD\nvarying vec3 vViewPosition;\n#ifdef USE_TRANSMISSION\n	varying vec3 vWorldPosition;\n#endif\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n#ifdef USE_TRANSMISSION\n	vWorldPosition = worldPosition.xyz;\n#endif\n}",
	meshphysical_frag: "#define STANDARD\n#ifdef PHYSICAL\n	#define IOR\n	#define USE_SPECULAR\n#endif\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float roughness;\nuniform float metalness;\nuniform float opacity;\n#ifdef IOR\n	uniform float ior;\n#endif\n#ifdef USE_SPECULAR\n	uniform float specularIntensity;\n	uniform vec3 specularColor;\n	#ifdef USE_SPECULAR_COLORMAP\n		uniform sampler2D specularColorMap;\n	#endif\n	#ifdef USE_SPECULAR_INTENSITYMAP\n		uniform sampler2D specularIntensityMap;\n	#endif\n#endif\n#ifdef USE_CLEARCOAT\n	uniform float clearcoat;\n	uniform float clearcoatRoughness;\n#endif\n#ifdef USE_DISPERSION\n	uniform float dispersion;\n#endif\n#ifdef USE_RETROREFLECTION\n	uniform float retroreflectivity;\n#endif\n#ifdef USE_IRIDESCENCE\n	uniform float iridescence;\n	uniform float iridescenceIOR;\n	uniform float iridescenceThicknessMinimum;\n	uniform float iridescenceThicknessMaximum;\n#endif\n#ifdef USE_SHEEN\n	uniform vec3 sheenColor;\n	uniform float sheenRoughness;\n	#ifdef USE_SHEEN_COLORMAP\n		uniform sampler2D sheenColorMap;\n	#endif\n	#ifdef USE_SHEEN_ROUGHNESSMAP\n		uniform sampler2D sheenRoughnessMap;\n	#endif\n#endif\n#ifdef USE_ANISOTROPY\n	uniform vec2 anisotropyVector;\n	#ifdef USE_ANISOTROPYMAP\n		uniform sampler2D anisotropyMap;\n	#endif\n#endif\nvarying vec3 vViewPosition;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <iridescence_fragment>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_physical_pars_fragment>\n#include <transmission_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <clearcoat_pars_fragment>\n#include <iridescence_pars_fragment>\n#include <roughnessmap_pars_fragment>\n#include <metalnessmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <roughnessmap_fragment>\n	#include <metalnessmap_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <clearcoat_normal_fragment_begin>\n	#include <clearcoat_normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_physical_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;\n	#include <transmission_fragment>\n	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;\n	#ifdef USE_SHEEN\n \n		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;\n \n 	#endif\n	#ifdef USE_CLEARCOAT\n		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );\n		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );\n		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;\n	#endif\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	meshtoon_vert: "#define TOON\nvarying vec3 vViewPosition;\n#include <common>\n#include <batching_pars_vertex>\n#include <uv_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <normal_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <normal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <displacementmap_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	vViewPosition = - mvPosition.xyz;\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	meshtoon_frag: "#define TOON\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float opacity;\n#include <common>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <gradientmap_pars_fragment>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <normal_pars_fragment>\n#include <lights_toon_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n	vec3 totalEmissiveRadiance = emissive;\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <color_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	#include <normal_fragment_begin>\n	#include <normal_fragment_maps>\n	#include <emissivemap_fragment>\n	#include <lights_toon_fragment>\n	#include <lights_fragment_begin>\n	#include <lights_fragment_maps>\n	#include <lights_fragment_end>\n	#include <aomap_fragment>\n	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n	#include <dithering_fragment>\n}",
	points_vert: "uniform float size;\nuniform float scale;\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n#ifdef USE_POINTS_UV\n	varying vec2 vUv;\n	uniform mat3 uvTransform;\n#endif\nvoid main() {\n	#ifdef USE_POINTS_UV\n		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;\n	#endif\n	#include <color_vertex>\n	#include <morphinstance_vertex>\n	#include <morphcolor_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <project_vertex>\n	gl_PointSize = size;\n	#ifdef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );\n	#endif\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <worldpos_vertex>\n	#include <fog_vertex>\n}",
	points_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <color_pars_fragment>\n#include <map_particle_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_particle_fragment>\n	#include <color_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	shadow_vert: "#include <common>\n#include <batching_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <shadowmap_pars_vertex>\nvoid main() {\n	#include <batching_vertex>\n	#include <beginnormal_vertex>\n	#include <morphinstance_vertex>\n	#include <morphnormal_vertex>\n	#include <skinbase_vertex>\n	#include <skinnormal_vertex>\n	#include <defaultnormal_vertex>\n	#include <begin_vertex>\n	#include <morphtarget_vertex>\n	#include <skinning_vertex>\n	#include <project_vertex>\n	#include <logdepthbuf_vertex>\n	#include <worldpos_vertex>\n	#include <shadowmap_vertex>\n	#include <fog_vertex>\n}",
	shadow_frag: "uniform vec3 color;\nuniform float opacity;\n#include <common>\n#include <fog_pars_fragment>\n#include <bsdfs>\n#include <lights_pars_begin>\n#include <logdepthbuf_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\nvoid main() {\n	#include <logdepthbuf_fragment>\n	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n	#include <premultiplied_alpha_fragment>\n}",
	sprite_vert: "uniform float rotation;\nuniform vec2 center;\n#include <common>\n#include <uv_pars_vertex>\n#include <fog_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n	#include <uv_vertex>\n	vec4 mvPosition = modelViewMatrix[ 3 ];\n	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );\n	#ifndef USE_SIZEATTENUATION\n		bool isPerspective = isPerspectiveMatrix( projectionMatrix );\n		if ( isPerspective ) scale *= - mvPosition.z;\n	#endif\n	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;\n	vec2 rotatedPosition;\n	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;\n	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;\n	mvPosition.xy += rotatedPosition;\n	gl_Position = projectionMatrix * mvPosition;\n	#include <logdepthbuf_vertex>\n	#include <clipping_planes_vertex>\n	#include <fog_vertex>\n}",
	sprite_frag: "uniform vec3 diffuse;\nuniform float opacity;\n#include <common>\n#include <uv_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <alphatest_pars_fragment>\n#include <alphahash_pars_fragment>\n#include <fog_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvoid main() {\n	vec4 diffuseColor = vec4( diffuse, opacity );\n	#include <clipping_planes_fragment>\n	vec3 outgoingLight = vec3( 0.0 );\n	#include <logdepthbuf_fragment>\n	#include <map_fragment>\n	#include <alphamap_fragment>\n	#include <alphatest_fragment>\n	#include <alphahash_fragment>\n	outgoingLight = diffuseColor.rgb;\n	#include <opaque_fragment>\n	#include <tonemapping_fragment>\n	#include <colorspace_fragment>\n	#include <fog_fragment>\n}"
}, Z = {
	common: {
		diffuse: { value: /*@__PURE__*/ new J(16777215) },
		opacity: { value: 1 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new G() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new G() },
		alphaTest: { value: 0 }
	},
	specularmap: {
		specularMap: { value: null },
		specularMapTransform: { value: /*@__PURE__*/ new G() }
	},
	envmap: {
		envMap: { value: null },
		envMapRotation: { value: /*@__PURE__*/ new G() },
		reflectivity: { value: 1 },
		ior: { value: 1.5 },
		refractionRatio: { value: .98 },
		dfgLUT: { value: null }
	},
	aomap: {
		aoMap: { value: null },
		aoMapIntensity: { value: 1 },
		aoMapTransform: { value: /*@__PURE__*/ new G() }
	},
	lightmap: {
		lightMap: { value: null },
		lightMapIntensity: { value: 1 },
		lightMapTransform: { value: /*@__PURE__*/ new G() }
	},
	bumpmap: {
		bumpMap: { value: null },
		bumpMapTransform: { value: /*@__PURE__*/ new G() },
		bumpScale: { value: 1 }
	},
	normalmap: {
		normalMap: { value: null },
		normalMapTransform: { value: /*@__PURE__*/ new G() },
		normalScale: { value: /*@__PURE__*/ new U(1, 1) }
	},
	displacementmap: {
		displacementMap: { value: null },
		displacementMapTransform: { value: /*@__PURE__*/ new G() },
		displacementScale: { value: 1 },
		displacementBias: { value: 0 }
	},
	emissivemap: {
		emissiveMap: { value: null },
		emissiveMapTransform: { value: /*@__PURE__*/ new G() }
	},
	metalnessmap: {
		metalnessMap: { value: null },
		metalnessMapTransform: { value: /*@__PURE__*/ new G() }
	},
	roughnessmap: {
		roughnessMap: { value: null },
		roughnessMapTransform: { value: /*@__PURE__*/ new G() }
	},
	gradientmap: { gradientMap: { value: null } },
	fog: {
		fogDensity: { value: 25e-5 },
		fogNear: { value: 1 },
		fogFar: { value: 2e3 },
		fogColor: { value: /*@__PURE__*/ new J(16777215) }
	},
	lights: {
		ambientLightColor: { value: [] },
		lightProbe: { value: [] },
		sunLights: {
			value: [],
			properties: {
				direction: {},
				color: {}
			}
		},
		sunLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		sunShadowMatrix: { value: [] },
		sunShadowCascade: { value: [] },
		directionalLights: {
			value: [],
			properties: {
				direction: {},
				color: {}
			}
		},
		directionalLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		directionalShadowMatrix: { value: [] },
		spotLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				direction: {},
				distance: {},
				coneCos: {},
				penumbraCos: {},
				decay: {}
			}
		},
		spotLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {}
			}
		},
		spotLightMap: { value: [] },
		spotLightMatrix: { value: [] },
		pointLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				decay: {},
				distance: {}
			}
		},
		pointLightShadows: {
			value: [],
			properties: {
				shadowIntensity: 1,
				shadowBias: {},
				shadowNormalBias: {},
				shadowRadius: {},
				shadowMapSize: {},
				shadowCameraNear: {},
				shadowCameraFar: {}
			}
		},
		pointShadowMatrix: { value: [] },
		hemisphereLights: {
			value: [],
			properties: {
				direction: {},
				skyColor: {},
				groundColor: {}
			}
		},
		rectAreaLights: {
			value: [],
			properties: {
				color: {},
				position: {},
				width: {},
				height: {}
			}
		},
		ltc_1: { value: null },
		ltc_2: { value: null },
		probesSH: { value: null },
		probesMin: { value: /*@__PURE__*/ new W() },
		probesMax: { value: /*@__PURE__*/ new W() },
		probesResolution: { value: /*@__PURE__*/ new W() }
	},
	points: {
		diffuse: { value: /*@__PURE__*/ new J(16777215) },
		opacity: { value: 1 },
		size: { value: 1 },
		scale: { value: 1 },
		map: { value: null },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new G() },
		alphaTest: { value: 0 },
		uvTransform: { value: /*@__PURE__*/ new G() }
	},
	sprite: {
		diffuse: { value: /*@__PURE__*/ new J(16777215) },
		opacity: { value: 1 },
		center: { value: /*@__PURE__*/ new U(.5, .5) },
		rotation: { value: 0 },
		map: { value: null },
		mapTransform: { value: /*@__PURE__*/ new G() },
		alphaMap: { value: null },
		alphaMapTransform: { value: /*@__PURE__*/ new G() },
		alphaTest: { value: 0 }
	}
}, Va = {
	basic: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.specularmap,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.fog
		]),
		vertexShader: X.meshbasic_vert,
		fragmentShader: X.meshbasic_frag
	},
	lambert: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.specularmap,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.fog,
			Z.lights,
			{
				emissive: { value: /*@__PURE__*/ new J(0) },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: X.meshlambert_vert,
		fragmentShader: X.meshlambert_frag
	},
	phong: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.specularmap,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.fog,
			Z.lights,
			{
				emissive: { value: /*@__PURE__*/ new J(0) },
				specular: { value: /*@__PURE__*/ new J(1118481) },
				shininess: { value: 30 },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: X.meshphong_vert,
		fragmentShader: X.meshphong_frag
	},
	standard: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.envmap,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.roughnessmap,
			Z.metalnessmap,
			Z.fog,
			Z.lights,
			{
				emissive: { value: /*@__PURE__*/ new J(0) },
				roughness: { value: 1 },
				metalness: { value: 0 },
				envMapIntensity: { value: 1 }
			}
		]),
		vertexShader: X.meshphysical_vert,
		fragmentShader: X.meshphysical_frag
	},
	toon: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.aomap,
			Z.lightmap,
			Z.emissivemap,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.gradientmap,
			Z.fog,
			Z.lights,
			{ emissive: { value: /*@__PURE__*/ new J(0) } }
		]),
		vertexShader: X.meshtoon_vert,
		fragmentShader: X.meshtoon_frag
	},
	matcap: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			Z.fog,
			{ matcap: { value: null } }
		]),
		vertexShader: X.meshmatcap_vert,
		fragmentShader: X.meshmatcap_frag
	},
	points: {
		uniforms: /*@__PURE__*/ Ei([Z.points, Z.fog]),
		vertexShader: X.points_vert,
		fragmentShader: X.points_frag
	},
	dashed: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.fog,
			{
				scale: { value: 1 },
				dashSize: { value: 1 },
				totalSize: { value: 2 }
			}
		]),
		vertexShader: X.linedashed_vert,
		fragmentShader: X.linedashed_frag
	},
	depth: {
		uniforms: /*@__PURE__*/ Ei([Z.common, Z.displacementmap]),
		vertexShader: X.depth_vert,
		fragmentShader: X.depth_frag
	},
	normal: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.bumpmap,
			Z.normalmap,
			Z.displacementmap,
			{ opacity: { value: 1 } }
		]),
		vertexShader: X.meshnormal_vert,
		fragmentShader: X.meshnormal_frag
	},
	sprite: {
		uniforms: /*@__PURE__*/ Ei([Z.sprite, Z.fog]),
		vertexShader: X.sprite_vert,
		fragmentShader: X.sprite_frag
	},
	background: {
		uniforms: {
			uvTransform: { value: /*@__PURE__*/ new G() },
			t2D: { value: null },
			backgroundIntensity: { value: 1 }
		},
		vertexShader: X.background_vert,
		fragmentShader: X.background_frag
	},
	backgroundCube: {
		uniforms: {
			envMap: { value: null },
			backgroundBlurriness: { value: 0 },
			backgroundIntensity: { value: 1 },
			backgroundRotation: { value: /*@__PURE__*/ new G() }
		},
		vertexShader: X.backgroundCube_vert,
		fragmentShader: X.backgroundCube_frag
	},
	cube: {
		uniforms: {
			tCube: { value: null },
			tFlip: { value: -1 },
			opacity: { value: 1 }
		},
		vertexShader: X.cube_vert,
		fragmentShader: X.cube_frag
	},
	equirect: {
		uniforms: { tEquirect: { value: null } },
		vertexShader: X.equirect_vert,
		fragmentShader: X.equirect_frag
	},
	distance: {
		uniforms: /*@__PURE__*/ Ei([
			Z.common,
			Z.displacementmap,
			{
				referencePosition: { value: /*@__PURE__*/ new W() },
				nearDistance: { value: 1 },
				farDistance: { value: 1e3 }
			}
		]),
		vertexShader: X.distance_vert,
		fragmentShader: X.distance_frag
	},
	shadow: {
		uniforms: /*@__PURE__*/ Ei([
			Z.lights,
			Z.fog,
			{
				color: { value: /*@__PURE__*/ new J(0) },
				opacity: { value: 1 }
			}
		]),
		vertexShader: X.shadow_vert,
		fragmentShader: X.shadow_frag
	}
};
Va.physical = {
	uniforms: /*@__PURE__*/ Ei([Va.standard.uniforms, {
		clearcoat: { value: 0 },
		clearcoatMap: { value: null },
		clearcoatMapTransform: { value: /*@__PURE__*/ new G() },
		clearcoatNormalMap: { value: null },
		clearcoatNormalMapTransform: { value: /*@__PURE__*/ new G() },
		clearcoatNormalScale: { value: /*@__PURE__*/ new U(1, 1) },
		clearcoatRoughness: { value: 0 },
		clearcoatRoughnessMap: { value: null },
		clearcoatRoughnessMapTransform: { value: /*@__PURE__*/ new G() },
		dispersion: { value: 0 },
		retroreflectivity: { value: 0 },
		iridescence: { value: 0 },
		iridescenceMap: { value: null },
		iridescenceMapTransform: { value: /*@__PURE__*/ new G() },
		iridescenceIOR: { value: 1.3 },
		iridescenceThicknessMinimum: { value: 100 },
		iridescenceThicknessMaximum: { value: 400 },
		iridescenceThicknessMap: { value: null },
		iridescenceThicknessMapTransform: { value: /*@__PURE__*/ new G() },
		sheen: { value: 0 },
		sheenColor: { value: /*@__PURE__*/ new J(0) },
		sheenColorMap: { value: null },
		sheenColorMapTransform: { value: /*@__PURE__*/ new G() },
		sheenRoughness: { value: 1 },
		sheenRoughnessMap: { value: null },
		sheenRoughnessMapTransform: { value: /*@__PURE__*/ new G() },
		transmission: { value: 0 },
		transmissionMap: { value: null },
		transmissionMapTransform: { value: /*@__PURE__*/ new G() },
		transmissionSamplerSize: { value: /*@__PURE__*/ new U() },
		transmissionSamplerMap: { value: null },
		thickness: { value: 0 },
		thicknessMap: { value: null },
		thicknessMapTransform: { value: /*@__PURE__*/ new G() },
		attenuationDistance: { value: 0 },
		attenuationColor: { value: /*@__PURE__*/ new J(0) },
		specularColor: { value: /*@__PURE__*/ new J(1, 1, 1) },
		specularColorMap: { value: null },
		specularColorMapTransform: { value: /*@__PURE__*/ new G() },
		specularIntensity: { value: 1 },
		specularIntensityMap: { value: null },
		specularIntensityMapTransform: { value: /*@__PURE__*/ new G() },
		anisotropyVector: { value: /*@__PURE__*/ new U() },
		anisotropyMap: { value: null },
		anisotropyMapTransform: { value: /*@__PURE__*/ new G() }
	}]),
	vertexShader: X.meshphysical_vert,
	fragmentShader: X.meshphysical_frag
};
var Ha = {
	r: 0,
	b: 0,
	g: 0
}, Ua = /*@__PURE__*/ new Bt(), Wa = /*@__PURE__*/ new G();
Wa.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
function Ga(e, t, n, r, i, a) {
	let o = new J(0), s = i === !0 ? 0 : 1, c, l, u = null, d = 0, f = null;
	function p(e) {
		let n = e.isScene === !0 ? e.background : null;
		if (n && n.isTexture) {
			let r = e.backgroundBlurriness > 0;
			n = t.get(n, r);
		}
		return n;
	}
	function m(t) {
		let r = !1, i = p(t);
		i === null ? g(o, s) : i && i.isColor && (g(i, 1), r = !0);
		let c = e.xr.getEnvironmentBlendMode();
		c === "additive" ? n.buffers.color.setClear(0, 0, 0, 1, a) : c === "alpha-blend" && n.buffers.color.setClear(0, 0, 0, 0, a), (e.autoClear || r) && (n.buffers.depth.setTest(!0), n.buffers.depth.setMask(!0), n.buffers.color.setMask(!0), e.clear(e.autoClearColor, e.autoClearDepth, e.autoClearStencil));
	}
	function h(t, n) {
		let i = p(n);
		i && (i.isCubeTexture || i.mapping === 306) ? (l === void 0 && (l = new oi(new yi(1, 1, 1), new Ni({
			name: "BackgroundCubeMaterial",
			uniforms: Ti(Va.backgroundCube.uniforms),
			vertexShader: Va.backgroundCube.vertexShader,
			fragmentShader: Va.backgroundCube.fragmentShader,
			side: 1,
			depthTest: !1,
			depthWrite: !1,
			fog: !1,
			allowOverride: !1
		})), l.geometry.deleteAttribute("normal"), l.geometry.deleteAttribute("uv"), l.onBeforeRender = function(e, t, n) {
			this.matrixWorld.copyPosition(n.matrixWorld);
		}, Object.defineProperty(l.material, "envMap", { get: function() {
			return this.uniforms.envMap.value;
		} }), r.update(l)), l.material.uniforms.envMap.value = i, l.material.uniforms.backgroundBlurriness.value = n.backgroundBlurriness, l.material.uniforms.backgroundIntensity.value = n.backgroundIntensity, l.material.uniforms.backgroundRotation.value.setFromMatrix4(Ua.makeRotationFromEuler(n.backgroundRotation)).transpose(), i.isCubeTexture && i.isRenderTargetTexture === !1 && l.material.uniforms.backgroundRotation.value.premultiply(Wa), l.material.toneMapped = K.getTransfer(i.colorSpace) !== Xe, (u !== i || d !== i.version || f !== e.toneMapping) && (l.material.needsUpdate = !0, u = i, d = i.version, f = e.toneMapping), l.layers.enableAll(), t.unshift(l, l.geometry, l.material, 0, 0, null)) : i && i.isTexture && (c === void 0 && (c = new oi(new Si(2, 2), new Ni({
			name: "BackgroundMaterial",
			uniforms: Ti(Va.background.uniforms),
			vertexShader: Va.background.vertexShader,
			fragmentShader: Va.background.fragmentShader,
			side: 0,
			depthTest: !1,
			depthWrite: !1,
			fog: !1,
			allowOverride: !1
		})), c.geometry.deleteAttribute("normal"), Object.defineProperty(c.material, "map", { get: function() {
			return this.uniforms.t2D.value;
		} }), r.update(c)), c.material.uniforms.t2D.value = i, c.material.uniforms.backgroundIntensity.value = n.backgroundIntensity, c.material.toneMapped = K.getTransfer(i.colorSpace) !== Xe, i.matrixAutoUpdate === !0 && i.updateMatrix(), c.material.uniforms.uvTransform.value.copy(i.matrix), (u !== i || d !== i.version || f !== e.toneMapping) && (c.material.needsUpdate = !0, u = i, d = i.version, f = e.toneMapping), c.layers.enableAll(), t.unshift(c, c.geometry, c.material, 0, 0, null));
	}
	function g(t, r) {
		t.getRGB(Ha, ki(e)), n.buffers.color.setClear(Ha.r, Ha.g, Ha.b, r, a);
	}
	function _() {
		l !== void 0 && (l.geometry.dispose(), l.material.dispose(), l = void 0), c !== void 0 && (c.geometry.dispose(), c.material.dispose(), c = void 0);
	}
	return {
		getClearColor: function() {
			return o;
		},
		setClearColor: function(e, t = 1) {
			o.set(e), s = t, g(o, s);
		},
		getClearAlpha: function() {
			return s;
		},
		setClearAlpha: function(e) {
			s = e, g(o, s);
		},
		render: m,
		addToRenderList: h,
		dispose: _
	};
}
function Ka(e, t) {
	let n = e.getParameter(e.MAX_VERTEX_ATTRIBS), r = {}, i = f(null), a = i, o = !1;
	function s(n, r, i, s, c) {
		let u = !1, f = d(n, s, i, r);
		a !== f && (a = f, l(a.object)), u = p(n, s, i, c), u && m(n, s, i, c), c !== null && t.update(c, e.ELEMENT_ARRAY_BUFFER), (u || o) && (o = !1, b(n, r, i, s), c !== null && e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, t.get(c).buffer));
	}
	function c() {
		return e.createVertexArray();
	}
	function l(t) {
		return e.bindVertexArray(t);
	}
	function u(t) {
		return e.deleteVertexArray(t);
	}
	function d(e, t, n, i) {
		let a = i.wireframe === !0, o = r[t.id];
		o === void 0 && (o = {}, r[t.id] = o);
		let s = e.isInstancedMesh === !0 ? e.id : 0, l = o[s];
		l === void 0 && (l = {}, o[s] = l);
		let u = l[n.id];
		u === void 0 && (u = {}, l[n.id] = u);
		let d = u[a];
		return d === void 0 && (d = f(c()), u[a] = d), d;
	}
	function f(e) {
		let t = [], r = [], i = [];
		for (let e = 0; e < n; e++) t[e] = 0, r[e] = 0, i[e] = 0;
		return {
			geometry: null,
			program: null,
			wireframe: !1,
			newAttributes: t,
			enabledAttributes: r,
			attributeDivisors: i,
			object: e,
			attributes: {},
			index: null
		};
	}
	function p(e, t, n, r) {
		let i = a.attributes, o = t.attributes, s = 0, c = n.getAttributes();
		for (let t in c) if (c[t].location >= 0) {
			let n = i[t], r = o[t];
			if (r === void 0 && (t === "instanceMatrix" && e.instanceMatrix && (r = e.instanceMatrix), t === "instanceColor" && e.instanceColor && (r = e.instanceColor)), n === void 0 || n.attribute !== r || r && n.data !== r.data) return !0;
			s++;
		}
		return a.attributesNum !== s || a.index !== r;
	}
	function m(e, t, n, r) {
		let i = {}, o = t.attributes, s = 0, c = n.getAttributes();
		for (let t in c) if (c[t].location >= 0) {
			let n = o[t];
			n === void 0 && (t === "instanceMatrix" && e.instanceMatrix && (n = e.instanceMatrix), t === "instanceColor" && e.instanceColor && (n = e.instanceColor));
			let r = {};
			r.attribute = n, n && n.data && (r.data = n.data), i[t] = r, s++;
		}
		a.attributes = i, a.attributesNum = s, a.index = r;
	}
	function h() {
		let e = a.newAttributes;
		for (let t = 0, n = e.length; t < n; t++) e[t] = 0;
	}
	function g(e) {
		_(e, 0);
	}
	function _(t, n) {
		let r = a.newAttributes, i = a.enabledAttributes, o = a.attributeDivisors;
		r[t] = 1, i[t] === 0 && (e.enableVertexAttribArray(t), i[t] = 1), o[t] !== n && (e.vertexAttribDivisor(t, n), o[t] = n);
	}
	function v() {
		let t = a.newAttributes, n = a.enabledAttributes;
		for (let r = 0, i = n.length; r < i; r++) n[r] !== t[r] && (e.disableVertexAttribArray(r), n[r] = 0);
	}
	function y(t, n, r, i, a, o, s) {
		s === !0 ? e.vertexAttribIPointer(t, n, r, a, o) : e.vertexAttribPointer(t, n, r, i, a, o);
	}
	function b(n, r, i, a) {
		h();
		let o = a.attributes, s = i.getAttributes(), c = r.defaultAttributeValues;
		for (let r in s) {
			let i = s[r];
			if (i.location >= 0) {
				let s = o[r];
				if (s === void 0 && (r === "instanceMatrix" && n.instanceMatrix && (s = n.instanceMatrix), r === "instanceColor" && n.instanceColor && (s = n.instanceColor)), s !== void 0) {
					let r = s.normalized, o = s.itemSize, c = t.get(s);
					if (c === void 0) continue;
					let l = c.buffer, u = c.type, d = c.bytesPerElement, f = u === e.INT || u === e.UNSIGNED_INT || s.gpuType === 1013;
					if (s.isInterleavedBufferAttribute) {
						let t = s.data, c = t.stride, p = s.offset;
						if (t.isInstancedInterleavedBuffer) {
							for (let e = 0; e < i.locationSize; e++) _(i.location + e, t.meshPerAttribute);
							n.isInstancedMesh !== !0 && a._maxInstanceCount === void 0 && (a._maxInstanceCount = t.meshPerAttribute * t.count);
						} else for (let e = 0; e < i.locationSize; e++) g(i.location + e);
						e.bindBuffer(e.ARRAY_BUFFER, l);
						for (let e = 0; e < i.locationSize; e++) y(i.location + e, o / i.locationSize, u, r, c * d, (p + o / i.locationSize * e) * d, f);
					} else {
						if (s.isInstancedBufferAttribute) {
							for (let e = 0; e < i.locationSize; e++) _(i.location + e, s.meshPerAttribute);
							n.isInstancedMesh !== !0 && a._maxInstanceCount === void 0 && (a._maxInstanceCount = s.meshPerAttribute * s.count);
						} else for (let e = 0; e < i.locationSize; e++) g(i.location + e);
						e.bindBuffer(e.ARRAY_BUFFER, l);
						for (let e = 0; e < i.locationSize; e++) y(i.location + e, o / i.locationSize, u, r, o * d, o / i.locationSize * e * d, f);
					}
				} else if (c !== void 0) {
					let t = c[r];
					if (t !== void 0) switch (t.length) {
						case 2:
							e.vertexAttrib2fv(i.location, t);
							break;
						case 3:
							e.vertexAttrib3fv(i.location, t);
							break;
						case 4:
							e.vertexAttrib4fv(i.location, t);
							break;
						default: e.vertexAttrib1fv(i.location, t);
					}
				}
			}
		}
		v();
	}
	function x() {
		T();
		for (let e in r) {
			let t = r[e];
			for (let e in t) {
				let n = t[e];
				for (let e in n) {
					let t = n[e];
					for (let e in t) u(t[e].object), delete t[e];
					delete n[e];
				}
			}
			delete r[e];
		}
	}
	function S(e) {
		if (r[e.id] === void 0) return;
		let t = r[e.id];
		for (let e in t) {
			let n = t[e];
			for (let e in n) {
				let t = n[e];
				for (let e in t) u(t[e].object), delete t[e];
				delete n[e];
			}
		}
		delete r[e.id];
	}
	function C(e) {
		for (let t in r) {
			let n = r[t];
			for (let t in n) {
				let r = n[t];
				if (r[e.id] === void 0) continue;
				let i = r[e.id];
				for (let e in i) u(i[e].object), delete i[e];
				delete r[e.id];
			}
		}
	}
	function w(e) {
		for (let t in r) {
			let n = r[t], i = e.isInstancedMesh === !0 ? e.id : 0, a = n[i];
			if (a !== void 0) {
				for (let e in a) {
					let t = a[e];
					for (let e in t) u(t[e].object), delete t[e];
					delete a[e];
				}
				delete n[i], Object.keys(n).length === 0 && delete r[t];
			}
		}
	}
	function T() {
		E(), o = !0, a !== i && (a = i, l(a.object));
	}
	function E() {
		i.geometry = null, i.program = null, i.wireframe = !1;
	}
	return {
		setup: s,
		reset: T,
		resetDefaultState: E,
		dispose: x,
		releaseStatesOfGeometry: S,
		releaseStatesOfObject: w,
		releaseStatesOfProgram: C,
		initAttributes: h,
		enableAttribute: g,
		disableUnusedAttributes: v
	};
}
function qa(e, t, n) {
	let r;
	function i(e) {
		r = e;
	}
	function a(t, i) {
		e.drawArrays(r, t, i), n.update(i, r, 1);
	}
	function o(t, i, a) {
		a !== 0 && (e.drawArraysInstanced(r, t, i, a), n.update(i, r, a));
	}
	function s(e, i, a) {
		if (a === 0) return;
		t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r, e, 0, i, 0, a);
		let o = 0;
		for (let e = 0; e < a; e++) o += i[e];
		n.update(o, r, 1);
	}
	this.setMode = i, this.render = a, this.renderInstances = o, this.renderMultiDraw = s;
}
function Ja(e, t, n, r) {
	let i;
	function a() {
		if (i !== void 0) return i;
		if (t.has("EXT_texture_filter_anisotropic") === !0) {
			let n = t.get("EXT_texture_filter_anisotropic");
			i = e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
		} else i = 0;
		return i;
	}
	function o(t) {
		return t === 1023 || r.convert(t) === e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT);
	}
	function s(n) {
		let i = n === 1016 && (t.has("EXT_color_buffer_half_float") || t.has("EXT_color_buffer_float"));
		return !(n !== 1009 && n !== 1015 && !i && r.convert(n) !== e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE));
	}
	function c(t) {
		if (t === "highp") {
			if (e.getShaderPrecisionFormat(e.VERTEX_SHADER, e.HIGH_FLOAT).precision > 0 && e.getShaderPrecisionFormat(e.FRAGMENT_SHADER, e.HIGH_FLOAT).precision > 0) return "highp";
			t = "mediump";
		}
		return t === "mediump" && e.getShaderPrecisionFormat(e.VERTEX_SHADER, e.MEDIUM_FLOAT).precision > 0 && e.getShaderPrecisionFormat(e.FRAGMENT_SHADER, e.MEDIUM_FLOAT).precision > 0 ? "mediump" : "lowp";
	}
	let l = n.precision === void 0 ? "highp" : n.precision, u = c(l);
	u !== l && (B("WebGLRenderer:", l, "not supported, using", u, "instead."), l = u);
	let d = n.logarithmicDepthBuffer === !0, f = n.reversedDepthBuffer === !0 && t.has("EXT_clip_control");
	n.reversedDepthBuffer === !0 && f === !1 && B("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");
	let p = e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS), m = e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS), h = e.getParameter(e.MAX_TEXTURE_SIZE), g = e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE), _ = e.getParameter(e.MAX_VERTEX_ATTRIBS), v = e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS), y = e.getParameter(e.MAX_VARYING_VECTORS), b = e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS), x = e.getParameter(e.MAX_SAMPLES), S = e.getParameter(e.SAMPLES);
	return {
		isWebGL2: !0,
		getMaxAnisotropy: a,
		getMaxPrecision: c,
		textureFormatReadable: o,
		textureTypeReadable: s,
		precision: l,
		logarithmicDepthBuffer: d,
		reversedDepthBuffer: f,
		maxTextures: p,
		maxVertexTextures: m,
		maxTextureSize: h,
		maxCubemapSize: g,
		maxAttributes: _,
		maxVertexUniforms: v,
		maxVaryings: y,
		maxFragmentUniforms: b,
		maxSamples: x,
		samples: S
	};
}
function Ya(e) {
	let t = this, n = null, r = 0, i = !1, a = !1, o = new wr(), s = new G(), c = {
		value: null,
		needsUpdate: !1
	};
	this.uniform = c, this.numPlanes = 0, this.numIntersection = 0, this.init = function(e, t) {
		let n = e.length !== 0 || t || r !== 0 || i;
		return i = t, r = e.length, n;
	}, this.beginShadows = function() {
		a = !0, u(null);
	}, this.endShadows = function() {
		a = !1;
	}, this.setGlobalState = function(e, t) {
		n = u(e, t, 0);
	}, this.setState = function(t, o, s) {
		let d = t.clippingPlanes, f = t.clipIntersection, p = t.clipShadows, m = e.get(t);
		if (!i || d === null || d.length === 0 || a && !p) a ? u(null) : l();
		else {
			let e = a ? 0 : r, t = e * 4, i = m.clippingState || null;
			c.value = i, i = u(d, o, t, s);
			for (let e = 0; e !== t; ++e) i[e] = n[e];
			m.clippingState = i, this.numIntersection = f ? this.numPlanes : 0, this.numPlanes += e;
		}
	};
	function l() {
		c.value !== n && (c.value = n, c.needsUpdate = r > 0), t.numPlanes = r, t.numIntersection = 0;
	}
	function u(e, n, r, i) {
		let a = e === null ? 0 : e.length, l = null;
		if (a !== 0) {
			if (l = c.value, i !== !0 || l === null) {
				let t = r + a * 4, i = n.matrixWorldInverse;
				s.getNormalMatrix(i), (l === null || l.length < t) && (l = new Float32Array(t));
				for (let t = 0, n = r; t !== a; ++t, n += 4) o.copy(e[t]).applyMatrix4(i, s), o.normal.toArray(l, n), l[n + 3] = o.constant;
			}
			c.value = l, c.needsUpdate = !0;
		}
		return t.numPlanes = a, t.numIntersection = 0, l;
	}
}
var Xa = 4, Za = 6, Qa = 20, $a = 256, eo = /*@__PURE__*/ new _a(), to = /*@__PURE__*/ new J(), no = null, ro = 0, io = 0, ao = !1, oo = /*@__PURE__*/ new W(), so = /*@__PURE__*/ new W(), co = class {
	constructor(e) {
		this._renderer = e, this._pingPongRenderTarget = null, this._lodMax = 0, this._cubeSize = 0, this._sizeLods = [], this._lodMeshes = [], this._backgroundBox = null, this._cubemapMaterial = null, this._equirectMaterial = null, this._blurMaterial = null, this._ggxMaterial = null;
	}
	fromScene(e, t = 0, n = .1, r = 100, i = {}) {
		let { size: a = 256, position: o = oo } = i;
		no = this._renderer.getRenderTarget(), ro = this._renderer.getActiveCubeFace(), io = this._renderer.getActiveMipmapLevel(), ao = this._renderer.xr.enabled, this._renderer.xr.enabled = !1, this._setSize(a);
		let s = this._allocateTargets();
		return s.depthBuffer = !0, this._sceneToCubeUV(e, n, r, s, o), t > 0 && this._blur(s, 0, 0, t), this._applyPMREM(s), this._cleanup(s), s;
	}
	fromEquirectangular(e, t = null) {
		return this._fromTexture(e, t);
	}
	fromCubemap(e, t = null) {
		return this._fromTexture(e, t);
	}
	compileCubemapShader() {
		this._cubemapMaterial === null && (this._cubemapMaterial = go(), this._compileMaterial(this._cubemapMaterial));
	}
	compileEquirectangularShader() {
		this._equirectMaterial === null && (this._equirectMaterial = ho(), this._compileMaterial(this._equirectMaterial));
	}
	dispose() {
		this._dispose(), this._cubemapMaterial !== null && this._cubemapMaterial.dispose(), this._equirectMaterial !== null && this._equirectMaterial.dispose(), this._backgroundBox !== null && (this._backgroundBox.geometry.dispose(), this._backgroundBox.material.dispose());
	}
	_setSize(e) {
		this._lodMax = Math.floor(Math.log2(e)), this._cubeSize = 2 ** this._lodMax;
	}
	_dispose() {
		this._blurMaterial !== null && this._blurMaterial.dispose(), this._ggxMaterial !== null && this._ggxMaterial.dispose(), this._pingPongRenderTarget !== null && this._pingPongRenderTarget.dispose();
		for (let e = 0; e < this._lodMeshes.length; e++) this._lodMeshes[e].geometry.dispose();
	}
	_cleanup(e) {
		this._renderer.setRenderTarget(no, ro, io), this._renderer.xr.enabled = ao, e.scissorTest = !1, fo(e, 0, 0, e.width, e.height);
	}
	_fromTexture(e, t) {
		e.mapping === 301 || e.mapping === 302 ? this._setSize(e.image.length === 0 ? 16 : e.image[0].width || e.image[0].image.width) : this._setSize(e.image.width / 4), no = this._renderer.getRenderTarget(), ro = this._renderer.getActiveCubeFace(), io = this._renderer.getActiveMipmapLevel(), ao = this._renderer.xr.enabled, this._renderer.xr.enabled = !1;
		let n = t || this._allocateTargets();
		return this._textureToCubeUV(e, n), this._applyPMREM(n), this._cleanup(n), n;
	}
	_allocateTargets() {
		let e = 3 * Math.max(this._cubeSize, 112), t = 4 * this._cubeSize, n = {
			magFilter: _,
			minFilter: _,
			generateMipmaps: !1,
			type: D,
			format: N,
			colorSpace: Je,
			depthBuffer: !1
		}, r = uo(e, t, n);
		if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== e || this._pingPongRenderTarget.height !== t) {
			this._pingPongRenderTarget !== null && this._dispose(), this._pingPongRenderTarget = uo(e, t, n);
			let { _lodMax: r } = this;
			({lodMeshes: this._lodMeshes, sizeLods: this._sizeLods} = lo(r)), this._blurMaterial = mo(r, e, t), this._ggxMaterial = po(r, e, t);
		}
		return r;
	}
	_compileMaterial(e) {
		let t = new oi(new _r(), e);
		this._renderer.compile(t, eo);
	}
	_sceneToCubeUV(e, t, n, r, i) {
		let a = new ma(90, 1, t, n), o = [
			1,
			-1,
			1,
			1,
			1,
			1
		], s = [
			1,
			1,
			1,
			-1,
			-1,
			-1
		], c = this._renderer, l = c.autoClear, u = c.toneMapping;
		c.getClearColor(to), c.toneMapping = 0, c.autoClear = !1, c.state.buffers.depth.getReversed() && (c.setRenderTarget(r), c.clearDepth(), c.setRenderTarget(null)), this._backgroundBox === null && (this._backgroundBox = new oi(new yi(), new Jr({
			name: "PMREM.Background",
			side: 1,
			depthWrite: !1,
			depthTest: !1
		})));
		let d = this._backgroundBox, f = d.material, p = !1, m = e.background;
		m ? m.isColor && (f.color.copy(m), e.background = null, p = !0) : (f.color.copy(to), p = !0);
		for (let t = 0; t < 6; t++) {
			let n = t % 3;
			n === 0 ? (a.up.set(0, o[t], 0), a.position.set(i.x, i.y, i.z), a.lookAt(i.x + s[t], i.y, i.z)) : n === 1 ? (a.up.set(0, 0, o[t]), a.position.set(i.x, i.y, i.z), a.lookAt(i.x, i.y + s[t], i.z)) : (a.up.set(0, o[t], 0), a.position.set(i.x, i.y, i.z), a.lookAt(i.x, i.y, i.z + s[t]));
			let l = this._cubeSize;
			fo(r, n * l, t > 2 ? l : 0, l, l), c.setRenderTarget(r), p && c.render(d, a), c.render(e, a);
		}
		c.toneMapping = u, c.autoClear = l, e.background = m;
	}
	_textureToCubeUV(e, t) {
		let n = this._renderer, r = e.mapping === 301 || e.mapping === 302;
		r ? (this._cubemapMaterial === null && (this._cubemapMaterial = go()), this._cubemapMaterial.uniforms.flipEnvMap.value = e.isRenderTargetTexture === !1 ? -1 : 1) : this._equirectMaterial === null && (this._equirectMaterial = ho());
		let i = r ? this._cubemapMaterial : this._equirectMaterial, a = this._lodMeshes[0];
		a.material = i;
		let o = i.uniforms;
		o.envMap.value = e;
		let s = this._cubeSize;
		fo(t, 0, 0, 3 * s, 2 * s), n.setRenderTarget(t), n.render(a, eo);
	}
	_applyPMREM(e) {
		let t = this._renderer, n = t.autoClear;
		t.autoClear = !1;
		let r = this._lodMeshes.length;
		for (let t = 1; t < r; t++) this._applyGGXFilter(e, t - 1, t);
		t.autoClear = n;
	}
	_applyGGXFilter(e, t, n) {
		let r = this._renderer, i = this._pingPongRenderTarget, a = this._ggxMaterial, o = this._lodMeshes[n];
		o.material = a;
		let s = a.uniforms, c = n / (this._lodMeshes.length - 1), l = t / (this._lodMeshes.length - 1), u = Math.sqrt(c * c - l * l) * (c * 1.25), { _lodMax: d } = this, f = this._sizeLods[n], p = 3 * f * (n > d - Xa ? n - d + Xa : 0), m = 4 * (this._cubeSize - f);
		s.envMap.value = e.texture, s.roughness.value = u, s.mipInt.value = d - t, fo(i, p, m, 3 * f, 2 * f), r.setRenderTarget(i), r.render(o, eo), s.envMap.value = i.texture, s.roughness.value = 0, s.mipInt.value = d - n, fo(e, p, m, 3 * f, 2 * f), r.setRenderTarget(e), r.render(o, eo);
	}
	_blur(e, t, n, r) {
		let i = this._pingPongRenderTarget, a = Math.min(r, Math.PI) / Math.SQRT2;
		this._blurPass(e, i, t, n, a), this._blurPass(i, e, n, n, a);
	}
	_blurPass(e, t, n, r, i) {
		let a = this._renderer, o = this._blurMaterial, s = this._lodMeshes[r];
		s.material = o;
		let c = o.uniforms;
		c.envMap.value = e.texture, c.sigma.value = i, c.mipInt.value = this._lodMax - n;
		let l = this._sizeLods[r];
		fo(t, 3 * l * (r > this._lodMax - Xa ? r - this._lodMax + Xa : 0), 4 * (this._cubeSize - l), 3 * l, 2 * l), a.setRenderTarget(t), a.render(s, eo);
	}
};
function lo(e) {
	let t = [], n = [], r = e, i = e - Xa + 1 + Za;
	for (let e = 0; e < i; e++) {
		let e = 2 ** r;
		t.push(e);
		let i = 1 / (e - 2), a = -i, o = 1 + i, s = [
			a,
			a,
			o,
			a,
			o,
			o,
			a,
			a,
			o,
			o,
			a,
			o
		], c = /* @__PURE__ */ new Float32Array(108), l = /* @__PURE__ */ new Float32Array(108);
		for (let e = 0; e < 6; e++) {
			let t = e % 3 * 2 / 3 - 1, n = e > 2 ? 0 : -1, r = [
				t,
				n,
				0,
				t + 2 / 3,
				n,
				0,
				t + 2 / 3,
				n + 1,
				0,
				t,
				n,
				0,
				t + 2 / 3,
				n + 1,
				0,
				t,
				n + 1,
				0
			];
			c.set(r, 18 * e);
			for (let t = 0; t < 6; t++) {
				let n = s[t * 2] * 2 - 1, r = s[t * 2 + 1] * 2 - 1;
				e === 0 ? so.set(1, r, n) : e === 1 ? so.set(-n, 1, -r) : e === 2 ? so.set(-n, r, 1) : e === 3 ? so.set(-1, r, -n) : e === 4 ? so.set(-n, -1, r) : so.set(n, r, -1), so.toArray(l, (e * 6 + t) * 3);
			}
		}
		let u = new _r();
		u.setAttribute("position", new nr(c, 3)), u.setAttribute("outputDirection", new nr(l, 3)), n.push(new oi(u, null)), r > Xa && r--;
	}
	return {
		lodMeshes: n,
		sizeLods: t
	};
}
function uo(e, t, n) {
	let r = new q(e, t, n);
	return r.texture.mapping = 306, r.texture.name = "PMREM.cubeUv", r.scissorTest = !0, r;
}
function fo(e, t, n, r, i) {
	e.viewport.set(t, n, r, i), e.scissor.set(t, n, r, i);
}
function po(e, t, n) {
	return new Ni({
		name: "PMREMGGXConvolution",
		defines: {
			GGX_SAMPLES: $a,
			CUBEUV_TEXEL_WIDTH: 1 / t,
			CUBEUV_TEXEL_HEIGHT: 1 / n,
			CUBEUV_MAX_MIP: `${e}.0`
		},
		uniforms: {
			envMap: { value: null },
			roughness: { value: 0 },
			mipInt: { value: 0 }
		},
		vertexShader: _o(),
		fragmentShader: "\n\n			precision highp float;\n			precision highp int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n			uniform float roughness;\n			uniform float mipInt;\n\n			#define ENVMAP_TYPE_CUBE_UV\n			#include <cube_uv_reflection_fragment>\n\n			#define PI 3.14159265359\n\n			// Van der Corput radical inverse\n			float radicalInverse_VdC(uint bits) {\n				bits = (bits << 16u) | (bits >> 16u);\n				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\n				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\n				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\n				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\n				return float(bits) * 2.3283064365386963e-10; // / 0x100000000\n			}\n\n			// Hammersley sequence\n			vec2 hammersley(uint i, uint N) {\n				return vec2(float(i) / float(N), radicalInverse_VdC(i));\n			}\n\n			// GGX VNDF importance sampling (Eric Heitz 2018)\n			// \"Sampling the GGX Distribution of Visible Normals\"\n			// https://jcgt.org/published/0007/04/01/\n			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {\n				float alpha = roughness * roughness;\n\n				// Section 4.1: Orthonormal basis\n				vec3 T1 = vec3(1.0, 0.0, 0.0);\n				vec3 T2 = cross(V, T1);\n\n				// Section 4.2: Parameterization of projected area\n				float r = sqrt(Xi.x);\n				float phi = 2.0 * PI * Xi.y;\n				float t1 = r * cos(phi);\n				float t2 = r * sin(phi);\n				float s = 0.5 * (1.0 + V.z);\n				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;\n\n				// Section 4.3: Reprojection onto hemisphere\n				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;\n\n				// Section 3.4: Transform back to ellipsoid configuration\n				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));\n			}\n\n			void main() {\n				vec3 N = normalize(vOutputDirection);\n				vec3 V = N; // Assume view direction equals normal for pre-filtering\n\n				vec3 prefilteredColor = vec3(0.0);\n				float totalWeight = 0.0;\n\n				// For very low roughness, just sample the environment directly\n				if (roughness < 0.001) {\n					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);\n					return;\n				}\n\n				// Tangent space basis for VNDF sampling\n				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);\n				vec3 tangent = normalize(cross(up, N));\n				vec3 bitangent = cross(N, tangent);\n\n				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {\n					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));\n\n					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)\n					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);\n\n					// Transform H back to world space\n					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);\n					vec3 L = normalize(2.0 * dot(V, H) * H - V);\n\n					float NdotL = max(dot(N, L), 0.0);\n\n					if(NdotL > 0.0) {\n						// Sample environment at fixed mip level\n						// VNDF importance sampling handles the distribution filtering\n						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);\n\n						// Weight by NdotL for the split-sum approximation\n						// VNDF PDF naturally accounts for the visible microfacet distribution\n						prefilteredColor += sampleColor * NdotL;\n						totalWeight += NdotL;\n					}\n				}\n\n				if (totalWeight > 0.0) {\n					prefilteredColor = prefilteredColor / totalWeight;\n				}\n\n				gl_FragColor = vec4(prefilteredColor, 1.0);\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function mo(e, t, n) {
	return new Ni({
		name: "SphericalGaussianBlur",
		defines: {
			SAMPLES: Qa,
			CUBEUV_TEXEL_WIDTH: 1 / t,
			CUBEUV_TEXEL_HEIGHT: 1 / n,
			CUBEUV_MAX_MIP: `${e}.0`
		},
		uniforms: {
			envMap: { value: null },
			sigma: { value: 0 },
			mipInt: { value: 0 }
		},
		vertexShader: _o(),
		fragmentShader: "\n\n			precision highp float;\n			precision highp int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n			uniform float sigma;\n			uniform float mipInt;\n\n			#define ENVMAP_TYPE_CUBE_UV\n			#include <cube_uv_reflection_fragment>\n\n			#define PI 3.14159265359\n			#define GOLDEN_ANGLE 2.39996322973\n\n			void main() {\n\n				if ( sigma == 0.0 ) {\n\n					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );\n					return;\n\n				}\n\n				vec3 outputDirection = normalize( vOutputDirection );\n\n				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );\n				vec3 tangent = normalize( cross( up, outputDirection ) );\n				vec3 bitangent = cross( outputDirection, tangent );\n\n				// Truncate the kernel at three standard deviations or at the antipode.\n				float thetaMax = min( 3.0 * sigma, PI );\n				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );\n\n				vec3 accumColor = vec3( 0.0 );\n				float accumWeight = 0.0;\n\n				for ( int i = 0; i < SAMPLES; i ++ ) {\n\n					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.\n					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );\n					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );\n					float phi = float( i ) * GOLDEN_ANGLE;\n\n					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;\n					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;\n\n					// Correct the planar sample density to solid angle.\n					float weight = sin( theta ) / theta;\n\n					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );\n					accumWeight += weight;\n\n				}\n\n				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function ho() {
	return new Ni({
		name: "EquirectangularToCubeUV",
		uniforms: { envMap: { value: null } },
		vertexShader: _o(),
		fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			varying vec3 vOutputDirection;\n\n			uniform sampler2D envMap;\n\n			#include <common>\n\n			void main() {\n\n				vec3 outputDirection = normalize( vOutputDirection );\n				vec2 uv = equirectUv( outputDirection );\n\n				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function go() {
	return new Ni({
		name: "CubemapToCubeUV",
		uniforms: {
			envMap: { value: null },
			flipEnvMap: { value: -1 }
		},
		vertexShader: _o(),
		fragmentShader: "\n\n			precision mediump float;\n			precision mediump int;\n\n			uniform float flipEnvMap;\n\n			varying vec3 vOutputDirection;\n\n			uniform samplerCube envMap;\n\n			void main() {\n\n				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );\n\n			}\n		",
		blending: 0,
		depthTest: !1,
		depthWrite: !1
	});
}
function _o() {
	return "\n\n		precision mediump float;\n		precision mediump int;\n\n		attribute vec3 outputDirection;\n\n		varying vec3 vOutputDirection;\n\n		void main() {\n\n			vOutputDirection = outputDirection;\n			gl_Position = vec4( position, 1.0 );\n\n		}\n	";
}
var vo = class extends q {
	constructor(e = 1, t = {}) {
		super(e, e, t), this.isWebGLCubeRenderTarget = !0;
		let n = {
			width: e,
			height: e,
			depth: 1
		}, r = [
			n,
			n,
			n,
			n,
			n,
			n
		];
		this.texture = new mi(r), this._setTextureOptions(t), this.texture.isRenderTargetTexture = !0;
	}
	fromEquirectangularTexture(e, t) {
		this.texture.type = t.type, this.texture.colorSpace = t.colorSpace, this.texture.generateMipmaps = t.generateMipmaps, this.texture.minFilter = t.minFilter, this.texture.magFilter = t.magFilter;
		let n = {
			uniforms: { tEquirect: { value: null } },
			vertexShader: "\n\n				varying vec3 vWorldDirection;\n\n				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {\n\n					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );\n\n				}\n\n				void main() {\n\n					vWorldDirection = transformDirection( position, modelMatrix );\n\n					#include <begin_vertex>\n					#include <project_vertex>\n\n				}\n			",
			fragmentShader: "\n\n				uniform sampler2D tEquirect;\n\n				varying vec3 vWorldDirection;\n\n				#include <common>\n\n				void main() {\n\n					vec3 direction = normalize( vWorldDirection );\n\n					vec2 sampleUV = equirectUv( direction );\n\n					gl_FragColor = texture2D( tEquirect, sampleUV );\n\n				}\n			"
		}, r = new yi(5, 5, 5), i = new Ni({
			name: "CubemapFromEquirect",
			uniforms: Ti(n.uniforms),
			vertexShader: n.vertexShader,
			fragmentShader: n.fragmentShader,
			side: 1,
			blending: 0
		});
		i.uniforms.tEquirect.value = t;
		let a = new oi(r, i), o = t.minFilter;
		return t.minFilter === 1008 && (t.minFilter = _), new Ca(1, 10, this).update(e, a), t.minFilter = o, a.geometry.dispose(), a.material.dispose(), this;
	}
	clear(e, t = !0, n = !0, r = !0) {
		let i = e.getRenderTarget();
		for (let i = 0; i < 6; i++) e.setRenderTarget(this, i), e.clear(t, n, r);
		e.setRenderTarget(i);
	}
};
function yo(e) {
	let t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap(), r = null;
	function i(e, t = !1) {
		return e == null ? null : t ? o(e) : a(e);
	}
	function a(n) {
		if (n && n.isTexture) {
			let r = n.mapping;
			if (r === 303 || r === 304) {
				if (t.has(n)) {
					let e = t.get(n).texture;
					return s(e, n.mapping);
				}
				{
					let r = n.image;
					if (r && r.height > 0) {
						let i = new vo(r.height);
						return i.fromEquirectangularTexture(e, n), t.set(n, i), n.addEventListener("dispose", l), s(i.texture, n.mapping);
					}
					return null;
				}
			}
		}
		return n;
	}
	function o(t) {
		if (t && t.isTexture) {
			let i = t.mapping, a = i === 303 || i === 304, o = i === 301 || i === 302;
			if (a || o) {
				let i = n.get(t), s = i === void 0 ? 0 : i.texture.pmremVersion;
				if (t.isRenderTargetTexture && t.pmremVersion !== s) return r === null && (r = new co(e)), i = a ? r.fromEquirectangular(t, i) : r.fromCubemap(t, i), i.texture.pmremVersion = t.pmremVersion, n.set(t, i), i.texture;
				if (i !== void 0) return i.texture;
				{
					let s = t.image;
					return a && s && s.height > 0 || o && s && c(s) ? (r === null && (r = new co(e)), i = a ? r.fromEquirectangular(t) : r.fromCubemap(t), i.texture.pmremVersion = t.pmremVersion, n.set(t, i), t.addEventListener("dispose", u), i.texture) : null;
				}
			}
		}
		return t;
	}
	function s(e, t) {
		return t === 303 ? e.mapping = 301 : t === 304 && (e.mapping = 302), e;
	}
	function c(e) {
		let t = 0;
		for (let n = 0; n < 6; n++) e[n] !== void 0 && t++;
		return t === 6;
	}
	function l(e) {
		let n = e.target;
		n.removeEventListener("dispose", l);
		let r = t.get(n);
		r !== void 0 && (t.delete(n), r.dispose());
	}
	function u(e) {
		let t = e.target;
		t.removeEventListener("dispose", u);
		let r = n.get(t);
		r !== void 0 && (n.delete(t), r.dispose());
	}
	function d() {
		t = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap(), r !== null && (r.dispose(), r = null);
	}
	return {
		get: i,
		dispose: d
	};
}
function bo(e) {
	let t = {};
	function n(n) {
		if (t[n] !== void 0) return t[n];
		let r = e.getExtension(n);
		return t[n] = r, r;
	}
	return {
		has: function(e) {
			return n(e) !== null;
		},
		init: function() {
			n("EXT_color_buffer_float"), n("WEBGL_clip_cull_distance"), n("OES_texture_float_linear"), n("EXT_color_buffer_half_float"), n("WEBGL_multisampled_render_to_texture"), n("WEBGL_render_shared_exponent");
		},
		get: function(e) {
			let t = n(e);
			return t === null && st("WebGLRenderer: " + e + " extension not supported."), t;
		}
	};
}
function xo(e, t, n, r) {
	let i = {}, a = /* @__PURE__ */ new WeakMap();
	function o(e) {
		let s = e.target;
		s.index !== null && t.remove(s.index);
		for (let e in s.attributes) t.remove(s.attributes[e]);
		s.removeEventListener("dispose", o), delete i[s.id];
		let c = a.get(s);
		c && (t.remove(c), a.delete(s)), r.releaseStatesOfGeometry(s), s.isInstancedBufferGeometry === !0 && delete s._maxInstanceCount, n.memory.geometries--;
	}
	function s(e, t) {
		return i[t.id] === !0 || (t.addEventListener("dispose", o), i[t.id] = !0, n.memory.geometries++), t;
	}
	function c(n) {
		let r = n.attributes;
		for (let n in r) t.update(r[n], e.ARRAY_BUFFER);
	}
	function l(e) {
		let n = [], r = e.index, i = e.attributes.position, o = 0;
		if (i === void 0) return;
		if (r !== null) {
			let e = r.array;
			o = r.version;
			for (let t = 0, r = e.length; t < r; t += 3) {
				let r = e[t + 0], i = e[t + 1], a = e[t + 2];
				n.push(r, i, i, a, a, r);
			}
		} else {
			let e = i.array;
			o = i.version;
			for (let t = 0, r = e.length / 3 - 1; t < r; t += 3) {
				let e = t + 0, r = t + 1, i = t + 2;
				n.push(e, r, r, i, i, e);
			}
		}
		let s = new (i.count >= 65535 ? ir : rr)(n, 1);
		s.version = o;
		let c = a.get(e);
		c && t.remove(c), a.set(e, s);
	}
	function u(e) {
		let t = a.get(e);
		if (t) {
			let n = e.index;
			n !== null && t.version < n.version && l(e);
		} else l(e);
		return a.get(e);
	}
	return {
		get: s,
		update: c,
		getWireframeAttribute: u
	};
}
function So(e, t, n) {
	let r;
	function i(e) {
		r = e;
	}
	let a, o;
	function s(e) {
		a = e.type, o = e.bytesPerElement;
	}
	function c(t, i) {
		e.drawElements(r, i, a, t * o), n.update(i, r, 1);
	}
	function l(t, i, s) {
		s !== 0 && (e.drawElementsInstanced(r, i, a, t * o, s), n.update(i, r, s));
	}
	function u(e, i, o) {
		if (o === 0) return;
		t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r, i, 0, a, e, 0, o);
		let s = 0;
		for (let e = 0; e < o; e++) s += i[e];
		n.update(s, r, 1);
	}
	this.setMode = i, this.setIndex = s, this.render = c, this.renderInstances = l, this.renderMultiDraw = u;
}
function Co(e) {
	let t = {
		geometries: 0,
		textures: 0
	}, n = {
		frame: 0,
		calls: 0,
		triangles: 0,
		points: 0,
		lines: 0
	};
	function r(t, r, i) {
		switch (n.calls++, r) {
			case e.TRIANGLES:
				n.triangles += t / 3 * i;
				break;
			case e.LINES:
				n.lines += t / 2 * i;
				break;
			case e.LINE_STRIP:
				n.lines += i * (t - 1);
				break;
			case e.LINE_LOOP:
				n.lines += i * t;
				break;
			case e.POINTS:
				n.points += i * t;
				break;
			default: V("WebGLInfo: Unknown draw mode:", r);
		}
	}
	function i() {
		n.calls = 0, n.triangles = 0, n.points = 0, n.lines = 0;
	}
	return {
		memory: t,
		render: n,
		programs: null,
		autoReset: !0,
		reset: i,
		update: r
	};
}
function wo(e, t, n) {
	let r = /* @__PURE__ */ new WeakMap(), i = new It();
	function a(a, o, s) {
		let c = a.morphTargetInfluences, l = o.morphAttributes.position || o.morphAttributes.normal || o.morphAttributes.color, u = l === void 0 ? 0 : l.length, d = r.get(o);
		if (d === void 0 || d.count !== u) {
			d !== void 0 && d.texture.dispose();
			let e = o.morphAttributes.position !== void 0, n = o.morphAttributes.normal !== void 0, a = o.morphAttributes.color !== void 0, s = o.morphAttributes.position || [], c = o.morphAttributes.normal || [], l = o.morphAttributes.color || [], f = 0;
			e === !0 && (f = 1), n === !0 && (f = 2), a === !0 && (f = 3);
			let p = o.attributes.position.count * f, m = 1;
			p > t.maxTextureSize && (m = Math.ceil(p / t.maxTextureSize), p = t.maxTextureSize);
			let h = new Float32Array(p * m * 4 * u), g = new Rt(h, p, m, u);
			g.type = E, g.needsUpdate = !0;
			let _ = f * 4;
			for (let t = 0; t < u; t++) {
				let r = s[t], o = c[t], u = l[t], d = p * m * 4 * t;
				for (let t = 0; t < r.count; t++) {
					let s = t * _;
					e === !0 && (i.fromBufferAttribute(r, t), h[d + s + 0] = i.x, h[d + s + 1] = i.y, h[d + s + 2] = i.z, h[d + s + 3] = 0), n === !0 && (i.fromBufferAttribute(o, t), h[d + s + 4] = i.x, h[d + s + 5] = i.y, h[d + s + 6] = i.z, h[d + s + 7] = 0), a === !0 && (i.fromBufferAttribute(u, t), h[d + s + 8] = i.x, h[d + s + 9] = i.y, h[d + s + 10] = i.z, h[d + s + 11] = u.itemSize === 4 ? i.w : 1);
				}
			}
			d = {
				count: u,
				texture: g,
				size: new U(p, m)
			}, r.set(o, d);
			function v() {
				g.dispose(), r.delete(o), o.removeEventListener("dispose", v);
			}
			o.addEventListener("dispose", v);
		}
		if (a.isInstancedMesh === !0 && a.morphTexture !== null) s.getUniforms().setValue(e, "morphTexture", a.morphTexture, n);
		else {
			let t = 0;
			for (let e = 0; e < c.length; e++) t += c[e];
			let n = o.morphTargetsRelative ? 1 : 1 - t;
			s.getUniforms().setValue(e, "morphTargetBaseInfluence", n), s.getUniforms().setValue(e, "morphTargetInfluences", c);
		}
		s.getUniforms().setValue(e, "morphTargetsTexture", d.texture, n), s.getUniforms().setValue(e, "morphTargetsTextureSize", d.size);
	}
	return { update: a };
}
function To(e, t, n, r, i) {
	let a = /* @__PURE__ */ new WeakMap();
	function o(r) {
		let o = i.render.frame, s = r.geometry, l = t.get(r, s);
		if (a.get(l) !== o && (t.update(l), a.set(l, o)), r.isInstancedMesh && (r.hasEventListener("dispose", c) === !1 && r.addEventListener("dispose", c), a.get(r) !== o && (n.update(r.instanceMatrix, e.ARRAY_BUFFER), r.instanceColor !== null && n.update(r.instanceColor, e.ARRAY_BUFFER), a.set(r, o))), r.isSkinnedMesh) {
			let e = r.skeleton;
			a.get(e) !== o && (e.update(), a.set(e, o));
		}
		return l;
	}
	function s() {
		a = /* @__PURE__ */ new WeakMap();
	}
	function c(e) {
		let t = e.target;
		t.removeEventListener("dispose", c), r.releaseStatesOfObject(t), n.remove(t.instanceMatrix), t.instanceColor !== null && n.remove(t.instanceColor);
	}
	return {
		update: o,
		dispose: s
	};
}
var Eo = {
	1: "LINEAR_TONE_MAPPING",
	2: "REINHARD_TONE_MAPPING",
	3: "CINEON_TONE_MAPPING",
	4: "ACES_FILMIC_TONE_MAPPING",
	6: "AGX_TONE_MAPPING",
	7: "NEUTRAL_TONE_MAPPING",
	5: "CUSTOM_TONE_MAPPING"
};
function Do(e, t, n, r, i, a) {
	let o = new q(t, n, {
		type: e,
		depthBuffer: i,
		stencilBuffer: a,
		samples: r ? 4 : 0,
		storeMultisampledDepthBuffer: !1,
		storeMultisampledStencilBuffer: !1,
		resolveDepthBuffer: !1,
		resolveStencilBuffer: !1
	}), s = null, c = null, l = new _r();
	l.setAttribute("position", new ar([
		-1,
		3,
		0,
		-1,
		-1,
		0,
		3,
		-1,
		0
	], 3)), l.setAttribute("uv", new ar([
		0,
		2,
		0,
		0,
		2,
		0
	], 2));
	let u = new Pi({
		uniforms: { tDiffuse: { value: null } },
		vertexShader: "\n			precision highp float;\n\n			uniform mat4 modelViewMatrix;\n			uniform mat4 projectionMatrix;\n\n			attribute vec3 position;\n			attribute vec2 uv;\n\n			varying vec2 vUv;\n\n			void main() {\n				vUv = uv;\n				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n			}",
		fragmentShader: "\n			precision highp float;\n\n			uniform sampler2D tDiffuse;\n\n			varying vec2 vUv;\n\n			#include <tonemapping_pars_fragment>\n			#include <colorspace_pars_fragment>\n\n			void main() {\n				gl_FragColor = texture2D( tDiffuse, vUv );\n\n				#ifdef LINEAR_TONE_MAPPING\n					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );\n				#elif defined( REINHARD_TONE_MAPPING )\n					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );\n				#elif defined( CINEON_TONE_MAPPING )\n					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );\n				#elif defined( ACES_FILMIC_TONE_MAPPING )\n					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );\n				#elif defined( AGX_TONE_MAPPING )\n					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );\n				#elif defined( NEUTRAL_TONE_MAPPING )\n					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );\n				#elif defined( CUSTOM_TONE_MAPPING )\n					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );\n				#endif\n\n				#ifdef SRGB_TRANSFER\n					gl_FragColor = sRGBTransferOETF( gl_FragColor );\n				#endif\n			}",
		depthTest: !1,
		depthWrite: !1
	}), d = new oi(l, u), f = new _a(-1, 1, 1, -1, 0, 1), p = null, m = null, h = !1, g, _ = null, v = [], y = !1;
	this.setSize = function(e, t) {
		o.setSize(e, t), s !== null && s.setSize(e, t), c !== null && c.setSize(e, t);
		for (let n = 0; n < v.length; n++) {
			let r = v[n];
			r.setSize && r.setSize(e, t);
		}
	}, this.setEffects = function(e) {
		v = e, y = v.length > 0 && v[0].isRenderPass === !0;
		let t = o.width, n = o.height;
		v.length > 0 && s === null && (s = new q(t, n, {
			type: D,
			depthBuffer: !1,
			stencilBuffer: !1
		}), c = new q(t, n, {
			type: D,
			depthBuffer: !1,
			stencilBuffer: !1
		}));
		for (let e = 0; e < v.length; e++) {
			let r = v[e];
			r.setSize && r.setSize(t, n);
		}
	}, this.begin = function(e, t) {
		if (h || e.toneMapping === 0 && v.length === 0) return !1;
		if (_ = t, t !== null) {
			let e = t.width, n = t.height;
			(o.width !== e || o.height !== n) && this.setSize(e, n);
		}
		return y === !1 && e.setRenderTarget(o), g = e.toneMapping, e.toneMapping = 0, !0;
	}, this.hasRenderPass = function() {
		return y;
	}, this.end = function(e, t) {
		e.toneMapping = g, h = !0;
		let n = o, r = s;
		for (let i = 0; i < v.length; i++) {
			let a = v[i];
			a.enabled !== !1 && (a.render(e, r, n, t), a.needsSwap !== !1 && (n = r, r = r === s ? c : s));
		}
		if (p !== e.outputColorSpace || m !== e.toneMapping) {
			p = e.outputColorSpace, m = e.toneMapping, u.defines = {}, K.getTransfer(p) === "srgb" && (u.defines.SRGB_TRANSFER = "");
			let t = Eo[m];
			t && (u.defines[t] = ""), u.needsUpdate = !0;
		}
		u.uniforms.tDiffuse.value = n.texture, e.setRenderTarget(_), e.render(d, f), _ = null, h = !1;
	}, this.isCompositing = function() {
		return h;
	}, this.dispose = function() {
		o.dispose(), s !== null && s.dispose(), c !== null && c.dispose(), l.dispose(), u.dispose();
	};
}
var Oo = /*@__PURE__*/ new Ft(), ko = /*@__PURE__*/ new gi(1, 1), Ao = /*@__PURE__*/ new Rt(), jo = /*@__PURE__*/ new zt(), Q = /*@__PURE__*/ new mi(), Mo = [], No = [], Po = /* @__PURE__ */ new Float32Array(16), Fo = /* @__PURE__ */ new Float32Array(9), Io = /* @__PURE__ */ new Float32Array(4);
function Lo(e, t, n) {
	let r = e[0];
	if (r <= 0 || r > 0) return e;
	let i = t * n, a = Mo[i];
	if (a === void 0 && (a = new Float32Array(i), Mo[i] = a), t !== 0) {
		r.toArray(a, 0);
		for (let r = 1, i = 0; r !== t; ++r) i += n, e[r].toArray(a, i);
	}
	return a;
}
function Ro(e, t) {
	if (e.length !== t.length) return !1;
	for (let n = 0, r = e.length; n < r; n++) if (e[n] !== t[n]) return !1;
	return !0;
}
function zo(e, t) {
	for (let n = 0, r = t.length; n < r; n++) e[n] = t[n];
}
function Bo(e, t) {
	let n = No[t];
	n === void 0 && (n = new Int32Array(t), No[t] = n);
	for (let r = 0; r !== t; ++r) n[r] = e.allocateTextureUnit();
	return n;
}
function Vo(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1f(this.addr, t), n[0] = t);
}
function Ho(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2f(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (Ro(n, t)) return;
		e.uniform2fv(this.addr, t), zo(n, t);
	}
}
function Uo(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3f(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else if (t.r !== void 0) (n[0] !== t.r || n[1] !== t.g || n[2] !== t.b) && (e.uniform3f(this.addr, t.r, t.g, t.b), n[0] = t.r, n[1] = t.g, n[2] = t.b);
	else {
		if (Ro(n, t)) return;
		e.uniform3fv(this.addr, t), zo(n, t);
	}
}
function Wo(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4f(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (Ro(n, t)) return;
		e.uniform4fv(this.addr, t), zo(n, t);
	}
}
function Go(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (Ro(n, t)) return;
		e.uniformMatrix2fv(this.addr, !1, t), zo(n, t);
	} else {
		if (Ro(n, r)) return;
		Io.set(r), e.uniformMatrix2fv(this.addr, !1, Io), zo(n, r);
	}
}
function Ko(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (Ro(n, t)) return;
		e.uniformMatrix3fv(this.addr, !1, t), zo(n, t);
	} else {
		if (Ro(n, r)) return;
		Fo.set(r), e.uniformMatrix3fv(this.addr, !1, Fo), zo(n, r);
	}
}
function qo(e, t) {
	let n = this.cache, r = t.elements;
	if (r === void 0) {
		if (Ro(n, t)) return;
		e.uniformMatrix4fv(this.addr, !1, t), zo(n, t);
	} else {
		if (Ro(n, r)) return;
		Po.set(r), e.uniformMatrix4fv(this.addr, !1, Po), zo(n, r);
	}
}
function Jo(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1i(this.addr, t), n[0] = t);
}
function Yo(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2i(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (Ro(n, t)) return;
		e.uniform2iv(this.addr, t), zo(n, t);
	}
}
function Xo(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3i(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else {
		if (Ro(n, t)) return;
		e.uniform3iv(this.addr, t), zo(n, t);
	}
}
function Zo(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4i(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (Ro(n, t)) return;
		e.uniform4iv(this.addr, t), zo(n, t);
	}
}
function Qo(e, t) {
	let n = this.cache;
	n[0] !== t && (e.uniform1ui(this.addr, t), n[0] = t);
}
function $o(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y) && (e.uniform2ui(this.addr, t.x, t.y), n[0] = t.x, n[1] = t.y);
	else {
		if (Ro(n, t)) return;
		e.uniform2uiv(this.addr, t), zo(n, t);
	}
}
function es(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z) && (e.uniform3ui(this.addr, t.x, t.y, t.z), n[0] = t.x, n[1] = t.y, n[2] = t.z);
	else {
		if (Ro(n, t)) return;
		e.uniform3uiv(this.addr, t), zo(n, t);
	}
}
function ts(e, t) {
	let n = this.cache;
	if (t.x !== void 0) (n[0] !== t.x || n[1] !== t.y || n[2] !== t.z || n[3] !== t.w) && (e.uniform4ui(this.addr, t.x, t.y, t.z, t.w), n[0] = t.x, n[1] = t.y, n[2] = t.z, n[3] = t.w);
	else {
		if (Ro(n, t)) return;
		e.uniform4uiv(this.addr, t), zo(n, t);
	}
}
function ns(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i);
	let a;
	this.type === e.SAMPLER_2D_SHADOW ? (ko.compareFunction = n.isReversedDepthBuffer() ? 518 : 515, a = ko) : a = Oo, n.setTexture2D(t || a, i);
}
function rs(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTexture3D(t || jo, i);
}
function is(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTextureCube(t || Q, i);
}
function as(e, t, n) {
	let r = this.cache, i = n.allocateTextureUnit();
	r[0] !== i && (e.uniform1i(this.addr, i), r[0] = i), n.setTexture2DArray(t || Ao, i);
}
function os(e) {
	switch (e) {
		case 5126: return Vo;
		case 35664: return Ho;
		case 35665: return Uo;
		case 35666: return Wo;
		case 35674: return Go;
		case 35675: return Ko;
		case 35676: return qo;
		case 5124:
		case 35670: return Jo;
		case 35667:
		case 35671: return Yo;
		case 35668:
		case 35672: return Xo;
		case 35669:
		case 35673: return Zo;
		case 5125: return Qo;
		case 36294: return $o;
		case 36295: return es;
		case 36296: return ts;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return ns;
		case 35679:
		case 36299:
		case 36307: return rs;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return is;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return as;
	}
}
function ss(e, t) {
	e.uniform1fv(this.addr, t);
}
function cs(e, t) {
	let n = Lo(t, this.size, 2);
	e.uniform2fv(this.addr, n);
}
function ls(e, t) {
	let n = Lo(t, this.size, 3);
	e.uniform3fv(this.addr, n);
}
function us(e, t) {
	let n = Lo(t, this.size, 4);
	e.uniform4fv(this.addr, n);
}
function ds(e, t) {
	let n = Lo(t, this.size, 4);
	e.uniformMatrix2fv(this.addr, !1, n);
}
function fs(e, t) {
	let n = Lo(t, this.size, 9);
	e.uniformMatrix3fv(this.addr, !1, n);
}
function ps(e, t) {
	let n = Lo(t, this.size, 16);
	e.uniformMatrix4fv(this.addr, !1, n);
}
function ms(e, t) {
	e.uniform1iv(this.addr, t);
}
function hs(e, t) {
	e.uniform2iv(this.addr, t);
}
function gs(e, t) {
	e.uniform3iv(this.addr, t);
}
function _s(e, t) {
	e.uniform4iv(this.addr, t);
}
function vs(e, t) {
	e.uniform1uiv(this.addr, t);
}
function ys(e, t) {
	e.uniform2uiv(this.addr, t);
}
function bs(e, t) {
	e.uniform3uiv(this.addr, t);
}
function xs(e, t) {
	e.uniform4uiv(this.addr, t);
}
function Ss(e, t, n) {
	let r = this.cache, i = t.length, a = Bo(n, i);
	Ro(r, a) || (e.uniform1iv(this.addr, a), zo(r, a));
	let o;
	o = this.type === e.SAMPLER_2D_SHADOW ? ko : Oo;
	for (let e = 0; e !== i; ++e) n.setTexture2D(t[e] || o, a[e]);
}
function Cs(e, t, n) {
	let r = this.cache, i = t.length, a = Bo(n, i);
	Ro(r, a) || (e.uniform1iv(this.addr, a), zo(r, a));
	for (let e = 0; e !== i; ++e) n.setTexture3D(t[e] || jo, a[e]);
}
function ws(e, t, n) {
	let r = this.cache, i = t.length, a = Bo(n, i);
	Ro(r, a) || (e.uniform1iv(this.addr, a), zo(r, a));
	for (let e = 0; e !== i; ++e) n.setTextureCube(t[e] || Q, a[e]);
}
function Ts(e, t, n) {
	let r = this.cache, i = t.length, a = Bo(n, i);
	Ro(r, a) || (e.uniform1iv(this.addr, a), zo(r, a));
	for (let e = 0; e !== i; ++e) n.setTexture2DArray(t[e] || Ao, a[e]);
}
function Es(e) {
	switch (e) {
		case 5126: return ss;
		case 35664: return cs;
		case 35665: return ls;
		case 35666: return us;
		case 35674: return ds;
		case 35675: return fs;
		case 35676: return ps;
		case 5124:
		case 35670: return ms;
		case 35667:
		case 35671: return hs;
		case 35668:
		case 35672: return gs;
		case 35669:
		case 35673: return _s;
		case 5125: return vs;
		case 36294: return ys;
		case 36295: return bs;
		case 36296: return xs;
		case 35678:
		case 36198:
		case 36298:
		case 36306:
		case 35682: return Ss;
		case 35679:
		case 36299:
		case 36307: return Cs;
		case 35680:
		case 36300:
		case 36308:
		case 36293: return ws;
		case 36289:
		case 36303:
		case 36311:
		case 36292: return Ts;
	}
}
var Ds = class {
	constructor(e, t, n) {
		this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.setValue = os(t.type);
	}
}, Os = class {
	constructor(e, t, n) {
		this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.size = t.size, this.setValue = Es(t.type);
	}
}, ks = class {
	constructor(e) {
		this.id = e, this.seq = [], this.map = {};
	}
	setValue(e, t, n) {
		let r = this.seq;
		for (let i = 0, a = r.length; i !== a; ++i) {
			let a = r[i];
			a.setValue(e, t[a.id], n);
		}
	}
}, As = /(\w+)(\])?(\[|\.)?/g;
function js(e, t) {
	e.seq.push(t), e.map[t.id] = t;
}
function Ms(e, t, n) {
	let r = e.name, i = r.length;
	for (As.lastIndex = 0;;) {
		let a = As.exec(r), o = As.lastIndex, s = a[1], c = a[2] === "]", l = a[3];
		if (c && (s |= 0), l === void 0 || l === "[" && o + 2 === i) {
			js(n, l === void 0 ? new Ds(s, e, t) : new Os(s, e, t));
			break;
		}
		{
			let e = n.map[s];
			e === void 0 && (e = new ks(s), js(n, e)), n = e;
		}
	}
}
var Ns = class {
	constructor(e, t) {
		this.seq = [], this.map = {};
		let n = e.getProgramParameter(t, e.ACTIVE_UNIFORMS);
		for (let r = 0; r < n; ++r) {
			let n = e.getActiveUniform(t, r);
			Ms(n, e.getUniformLocation(t, n.name), this);
		}
		let r = [], i = [];
		for (let t of this.seq) t.type === e.SAMPLER_2D_SHADOW || t.type === e.SAMPLER_CUBE_SHADOW || t.type === e.SAMPLER_2D_ARRAY_SHADOW ? r.push(t) : i.push(t);
		r.length > 0 && (this.seq = r.concat(i));
	}
	setValue(e, t, n, r) {
		let i = this.map[t];
		i !== void 0 && i.setValue(e, n, r);
	}
	setOptional(e, t, n) {
		let r = t[n];
		r !== void 0 && this.setValue(e, n, r);
	}
	static upload(e, t, n, r) {
		for (let i = 0, a = t.length; i !== a; ++i) {
			let a = t[i], o = n[a.id];
			o.needsUpdate !== !1 && a.setValue(e, o.value, r);
		}
	}
	static seqWithValue(e, t) {
		let n = [];
		for (let r = 0, i = e.length; r !== i; ++r) {
			let i = e[r];
			i.id in t && n.push(i);
		}
		return n;
	}
};
function Ps(e, t, n) {
	let r = e.createShader(t);
	return e.shaderSource(r, n), e.compileShader(r), r;
}
var Fs = 37297, Is = 0;
function Ls(e, t) {
	let n = e.split("\n"), r = [], i = Math.max(t - 6, 0), a = Math.min(t + 6, n.length);
	for (let e = i; e < a; e++) {
		let i = e + 1;
		r.push(`${i === t ? ">" : " "} ${i}: ${n[e]}`);
	}
	return r.join("\n");
}
var Rs = /*@__PURE__*/ new G();
function zs(e) {
	K._getMatrix(Rs, K.workingColorSpace, e);
	let t = `mat3( ${Rs.elements.map((e) => e.toFixed(4))} )`;
	switch (K.getTransfer(e)) {
		case Ye: return [t, "LinearTransferOETF"];
		case Xe: return [t, "sRGBTransferOETF"];
		default: return B("WebGLProgram: Unsupported color space: ", e), [t, "LinearTransferOETF"];
	}
}
function Bs(e, t, n) {
	let r = e.getShaderParameter(t, e.COMPILE_STATUS), i = (e.getShaderInfoLog(t) || "").trim();
	if (r && i === "") return "";
	let a = /ERROR: 0:(\d+)/.exec(i);
	if (a) {
		let r = parseInt(a[1]);
		return n.toUpperCase() + "\n\n" + i + "\n\n" + Ls(e.getShaderSource(t), r);
	}
	return i;
}
function Vs(e, t) {
	let n = zs(t);
	return [
		`vec4 ${e}( vec4 value ) {`,
		`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,
		"}"
	].join("\n");
}
var Hs = {
	1: "Linear",
	2: "Reinhard",
	3: "Cineon",
	4: "ACESFilmic",
	6: "AgX",
	7: "Neutral",
	5: "Custom"
};
function Us(e, t) {
	let n = Hs[t];
	return n === void 0 ? (B("WebGLProgram: Unsupported toneMapping:", t), "vec3 " + e + "( vec3 color ) { return LinearToneMapping( color ); }") : "vec3 " + e + "( vec3 color ) { return " + n + "ToneMapping( color ); }";
}
var Ws = /*@__PURE__*/ new W();
function Gs() {
	return K.getLuminanceCoefficients(Ws), [
		"float luminance( const in vec3 rgb ) {",
		`	const vec3 weights = vec3( ${Ws.x.toFixed(4)}, ${Ws.y.toFixed(4)}, ${Ws.z.toFixed(4)} );`,
		"	return dot( weights, rgb );",
		"}"
	].join("\n");
}
function Ks(e) {
	return [e.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "", e.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : ""].filter(Ys).join("\n");
}
function qs(e) {
	let t = [];
	for (let n in e) {
		let r = e[n];
		r !== !1 && t.push("#define " + n + " " + r);
	}
	return t.join("\n");
}
function Js(e, t) {
	let n = {}, r = e.getProgramParameter(t, e.ACTIVE_ATTRIBUTES);
	for (let i = 0; i < r; i++) {
		let r = e.getActiveAttrib(t, i), a = r.name, o = 1;
		r.type === e.FLOAT_MAT2 && (o = 2), r.type === e.FLOAT_MAT3 && (o = 3), r.type === e.FLOAT_MAT4 && (o = 4), n[a] = {
			type: r.type,
			location: e.getAttribLocation(t, a),
			locationSize: o
		};
	}
	return n;
}
function Ys(e) {
	return e !== "";
}
function Xs(e, t) {
	let n = t.numSpotLightShadows + t.numSpotLightMaps - t.numSpotLightShadowsWithMaps;
	return e.replace(/NUM_SUN_LIGHTS/g, t.numSunLights).replace(/NUM_DIR_LIGHTS/g, t.numDirLights).replace(/NUM_SPOT_LIGHTS/g, t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g, n).replace(/NUM_RECT_AREA_LIGHTS/g, t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, t.numPointLights).replace(/NUM_HEMI_LIGHTS/g, t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g, t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g, t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g, t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g, t.numPointLightShadows);
}
function Zs(e, t) {
	return e.replace(/NUM_CLIPPING_PLANES/g, t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, t.numClippingPlanes - t.numClipIntersection);
}
var Qs = /^[ \t]*#include +<([\w\d./]+)>/gm;
function $s(e) {
	return e.replace(Qs, tc);
}
var ec = /* @__PURE__ */ new Map();
function tc(e, t) {
	let n = X[t];
	if (n === void 0) {
		let e = ec.get(t);
		if (e !== void 0) n = X[e], B("WebGLRenderer: Shader chunk \"%s\" has been deprecated. Use \"%s\" instead.", t, e);
		else throw Error("THREE.WebGLProgram: Can not resolve #include <" + t + ">");
	}
	return $s(n);
}
var nc = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
function rc(e) {
	return e.replace(nc, ic);
}
function ic(e, t, n, r) {
	let i = "";
	for (let e = parseInt(t); e < parseInt(n); e++) i += r.replace(/\[\s*i\s*\]/g, "[ " + e + " ]").replace(/UNROLLED_LOOP_INDEX/g, e);
	return i;
}
function ac(e) {
	let t = `precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;
	return e.precision === "highp" ? t += "\n#define HIGH_PRECISION" : e.precision === "mediump" ? t += "\n#define MEDIUM_PRECISION" : e.precision === "lowp" && (t += "\n#define LOW_PRECISION"), t;
}
var oc = {
	1: "SHADOWMAP_TYPE_PCF",
	3: "SHADOWMAP_TYPE_VSM"
};
function sc(e) {
	return oc[e.shadowMapType] || "SHADOWMAP_TYPE_BASIC";
}
var cc = {
	301: "ENVMAP_TYPE_CUBE",
	302: "ENVMAP_TYPE_CUBE",
	306: "ENVMAP_TYPE_CUBE_UV"
};
function lc(e) {
	return e.envMap === !1 ? "ENVMAP_TYPE_CUBE" : cc[e.envMapMode] || "ENVMAP_TYPE_CUBE";
}
var uc = { 302: "ENVMAP_MODE_REFRACTION" };
function dc(e) {
	return e.envMap === !1 ? "ENVMAP_MODE_REFLECTION" : uc[e.envMapMode] || "ENVMAP_MODE_REFLECTION";
}
var fc = {
	0: "ENVMAP_BLENDING_MULTIPLY",
	1: "ENVMAP_BLENDING_MIX",
	2: "ENVMAP_BLENDING_ADD"
};
function pc(e) {
	return e.envMap === !1 ? "ENVMAP_BLENDING_NONE" : fc[e.combine] || "ENVMAP_BLENDING_NONE";
}
function mc(e) {
	let t = e.envMapCubeUVHeight;
	if (t === null) return null;
	let n = Math.log2(t) - 2, r = 1 / t;
	return {
		texelWidth: 1 / (3 * Math.max(2 ** n, 112)),
		texelHeight: r,
		maxMip: n
	};
}
function hc(e, t, n, r) {
	let i = e.getContext(), a = n.defines, o = n.vertexShader, s = n.fragmentShader, c = sc(n), l = lc(n), u = dc(n), d = pc(n), f = mc(n), p = Ks(n), m = qs(a), h = i.createProgram(), g, _, v = n.glslVersion ? "#version " + n.glslVersion + "\n" : "";
	n.isRawShaderMaterial ? (g = [
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m
	].filter(Ys).join("\n"), g.length > 0 && (g += "\n"), _ = [
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m
	].filter(Ys).join("\n"), _.length > 0 && (_ += "\n")) : (g = [
		ac(n),
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m,
		n.extensionClipCullDistance ? "#define USE_CLIP_DISTANCE" : "",
		n.batching ? "#define USE_BATCHING" : "",
		n.batchingColor ? "#define USE_BATCHING_COLOR" : "",
		n.instancing ? "#define USE_INSTANCING" : "",
		n.instancingColor ? "#define USE_INSTANCING_COLOR" : "",
		n.instancingMorph ? "#define USE_INSTANCING_MORPH" : "",
		n.useFog && n.fog ? "#define USE_FOG" : "",
		n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "",
		n.map ? "#define USE_MAP" : "",
		n.envMap ? "#define USE_ENVMAP" : "",
		n.envMap ? "#define " + u : "",
		n.lightMap ? "#define USE_LIGHTMAP" : "",
		n.aoMap ? "#define USE_AOMAP" : "",
		n.bumpMap ? "#define USE_BUMPMAP" : "",
		n.normalMap ? "#define USE_NORMALMAP" : "",
		n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
		n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
		n.displacementMap ? "#define USE_DISPLACEMENTMAP" : "",
		n.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
		n.anisotropy ? "#define USE_ANISOTROPY" : "",
		n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
		n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
		n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
		n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
		n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
		n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
		n.specularMap ? "#define USE_SPECULARMAP" : "",
		n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
		n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
		n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
		n.metalnessMap ? "#define USE_METALNESSMAP" : "",
		n.alphaMap ? "#define USE_ALPHAMAP" : "",
		n.alphaHash ? "#define USE_ALPHAHASH" : "",
		n.transmission ? "#define USE_TRANSMISSION" : "",
		n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
		n.thicknessMap ? "#define USE_THICKNESSMAP" : "",
		n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
		n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
		n.mapUv ? "#define MAP_UV " + n.mapUv : "",
		n.alphaMapUv ? "#define ALPHAMAP_UV " + n.alphaMapUv : "",
		n.lightMapUv ? "#define LIGHTMAP_UV " + n.lightMapUv : "",
		n.aoMapUv ? "#define AOMAP_UV " + n.aoMapUv : "",
		n.emissiveMapUv ? "#define EMISSIVEMAP_UV " + n.emissiveMapUv : "",
		n.bumpMapUv ? "#define BUMPMAP_UV " + n.bumpMapUv : "",
		n.normalMapUv ? "#define NORMALMAP_UV " + n.normalMapUv : "",
		n.displacementMapUv ? "#define DISPLACEMENTMAP_UV " + n.displacementMapUv : "",
		n.metalnessMapUv ? "#define METALNESSMAP_UV " + n.metalnessMapUv : "",
		n.roughnessMapUv ? "#define ROUGHNESSMAP_UV " + n.roughnessMapUv : "",
		n.anisotropyMapUv ? "#define ANISOTROPYMAP_UV " + n.anisotropyMapUv : "",
		n.clearcoatMapUv ? "#define CLEARCOATMAP_UV " + n.clearcoatMapUv : "",
		n.clearcoatNormalMapUv ? "#define CLEARCOAT_NORMALMAP_UV " + n.clearcoatNormalMapUv : "",
		n.clearcoatRoughnessMapUv ? "#define CLEARCOAT_ROUGHNESSMAP_UV " + n.clearcoatRoughnessMapUv : "",
		n.iridescenceMapUv ? "#define IRIDESCENCEMAP_UV " + n.iridescenceMapUv : "",
		n.iridescenceThicknessMapUv ? "#define IRIDESCENCE_THICKNESSMAP_UV " + n.iridescenceThicknessMapUv : "",
		n.sheenColorMapUv ? "#define SHEEN_COLORMAP_UV " + n.sheenColorMapUv : "",
		n.sheenRoughnessMapUv ? "#define SHEEN_ROUGHNESSMAP_UV " + n.sheenRoughnessMapUv : "",
		n.specularMapUv ? "#define SPECULARMAP_UV " + n.specularMapUv : "",
		n.specularColorMapUv ? "#define SPECULAR_COLORMAP_UV " + n.specularColorMapUv : "",
		n.specularIntensityMapUv ? "#define SPECULAR_INTENSITYMAP_UV " + n.specularIntensityMapUv : "",
		n.transmissionMapUv ? "#define TRANSMISSIONMAP_UV " + n.transmissionMapUv : "",
		n.thicknessMapUv ? "#define THICKNESSMAP_UV " + n.thicknessMapUv : "",
		n.vertexTangents && n.flatShading === !1 ? "#define USE_TANGENT" : "",
		n.vertexNormals ? "#define HAS_NORMAL" : "",
		n.vertexColors ? "#define USE_COLOR" : "",
		n.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
		n.vertexUv1s ? "#define USE_UV1" : "",
		n.vertexUv2s ? "#define USE_UV2" : "",
		n.vertexUv3s ? "#define USE_UV3" : "",
		n.pointsUvs ? "#define USE_POINTS_UV" : "",
		n.flatShading ? "#define FLAT_SHADED" : "",
		n.skinning ? "#define USE_SKINNING" : "",
		n.morphTargets ? "#define USE_MORPHTARGETS" : "",
		n.morphNormals && n.flatShading === !1 ? "#define USE_MORPHNORMALS" : "",
		n.morphColors ? "#define USE_MORPHCOLORS" : "",
		n.morphTargetsCount > 0 ? "#define MORPHTARGETS_TEXTURE_STRIDE " + n.morphTextureStride : "",
		n.morphTargetsCount > 0 ? "#define MORPHTARGETS_COUNT " + n.morphTargetsCount : "",
		n.doubleSided ? "#define DOUBLE_SIDED" : "",
		n.flipSided ? "#define FLIP_SIDED" : "",
		n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
		n.shadowMapEnabled ? "#define " + c : "",
		n.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "",
		n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
		n.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
		n.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
		"uniform mat4 modelMatrix;",
		"uniform mat4 modelViewMatrix;",
		"uniform mat4 projectionMatrix;",
		"uniform mat4 viewMatrix;",
		"uniform mat3 normalMatrix;",
		"uniform vec3 cameraPosition;",
		"uniform bool isOrthographic;",
		"#ifdef USE_INSTANCING",
		"	attribute mat4 instanceMatrix;",
		"#endif",
		"#ifdef USE_INSTANCING_COLOR",
		"	attribute vec3 instanceColor;",
		"#endif",
		"#ifdef USE_INSTANCING_MORPH",
		"	uniform sampler2D morphTexture;",
		"#endif",
		"attribute vec3 position;",
		"attribute vec3 normal;",
		"attribute vec2 uv;",
		"#ifdef USE_UV1",
		"	attribute vec2 uv1;",
		"#endif",
		"#ifdef USE_UV2",
		"	attribute vec2 uv2;",
		"#endif",
		"#ifdef USE_UV3",
		"	attribute vec2 uv3;",
		"#endif",
		"#ifdef USE_TANGENT",
		"	attribute vec4 tangent;",
		"#endif",
		"#if defined( USE_COLOR_ALPHA )",
		"	attribute vec4 color;",
		"#elif defined( USE_COLOR )",
		"	attribute vec3 color;",
		"#endif",
		"#ifdef USE_SKINNING",
		"	attribute vec4 skinIndex;",
		"	attribute vec4 skinWeight;",
		"#endif",
		"\n"
	].filter(Ys).join("\n"), _ = [
		ac(n),
		"#define SHADER_TYPE " + n.shaderType,
		"#define SHADER_NAME " + n.shaderName,
		m,
		n.useFog && n.fog ? "#define USE_FOG" : "",
		n.useFog && n.fogExp2 ? "#define FOG_EXP2" : "",
		n.alphaToCoverage ? "#define ALPHA_TO_COVERAGE" : "",
		n.map ? "#define USE_MAP" : "",
		n.matcap ? "#define USE_MATCAP" : "",
		n.envMap ? "#define USE_ENVMAP" : "",
		n.envMap ? "#define " + l : "",
		n.envMap ? "#define " + u : "",
		n.envMap ? "#define " + d : "",
		f ? "#define CUBEUV_TEXEL_WIDTH " + f.texelWidth : "",
		f ? "#define CUBEUV_TEXEL_HEIGHT " + f.texelHeight : "",
		f ? "#define CUBEUV_MAX_MIP " + f.maxMip + ".0" : "",
		n.lightMap ? "#define USE_LIGHTMAP" : "",
		n.aoMap ? "#define USE_AOMAP" : "",
		n.bumpMap ? "#define USE_BUMPMAP" : "",
		n.normalMap ? "#define USE_NORMALMAP" : "",
		n.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
		n.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
		n.packedNormalMap ? "#define USE_PACKED_NORMALMAP" : "",
		n.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
		n.anisotropy ? "#define USE_ANISOTROPY" : "",
		n.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
		n.clearcoat ? "#define USE_CLEARCOAT" : "",
		n.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
		n.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
		n.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
		n.dispersion ? "#define USE_DISPERSION" : "",
		n.retroreflection ? "#define USE_RETROREFLECTION" : "",
		n.iridescence ? "#define USE_IRIDESCENCE" : "",
		n.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
		n.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
		n.specularMap ? "#define USE_SPECULARMAP" : "",
		n.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
		n.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
		n.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
		n.metalnessMap ? "#define USE_METALNESSMAP" : "",
		n.alphaMap ? "#define USE_ALPHAMAP" : "",
		n.alphaTest ? "#define USE_ALPHATEST" : "",
		n.alphaHash ? "#define USE_ALPHAHASH" : "",
		n.sheen ? "#define USE_SHEEN" : "",
		n.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
		n.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
		n.transmission ? "#define USE_TRANSMISSION" : "",
		n.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
		n.thicknessMap ? "#define USE_THICKNESSMAP" : "",
		n.vertexTangents && n.flatShading === !1 ? "#define USE_TANGENT" : "",
		n.vertexColors || n.instancingColor ? "#define USE_COLOR" : "",
		n.vertexAlphas || n.batchingColor ? "#define USE_COLOR_ALPHA" : "",
		n.vertexUv1s ? "#define USE_UV1" : "",
		n.vertexUv2s ? "#define USE_UV2" : "",
		n.vertexUv3s ? "#define USE_UV3" : "",
		n.pointsUvs ? "#define USE_POINTS_UV" : "",
		n.gradientMap ? "#define USE_GRADIENTMAP" : "",
		n.flatShading ? "#define FLAT_SHADED" : "",
		n.doubleSided ? "#define DOUBLE_SIDED" : "",
		n.flipSided ? "#define FLIP_SIDED" : "",
		n.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
		n.shadowMapEnabled ? "#define " + c : "",
		n.premultipliedAlpha ? "#define PREMULTIPLIED_ALPHA" : "",
		n.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
		n.numLightProbeGrids > 0 ? "#define USE_LIGHT_PROBES_GRID" : "",
		n.decodeVideoTexture ? "#define DECODE_VIDEO_TEXTURE" : "",
		n.decodeVideoTextureEmissive ? "#define DECODE_VIDEO_TEXTURE_EMISSIVE" : "",
		n.logarithmicDepthBuffer ? "#define USE_LOGARITHMIC_DEPTH_BUFFER" : "",
		n.reversedDepthBuffer ? "#define USE_REVERSED_DEPTH_BUFFER" : "",
		"uniform mat4 viewMatrix;",
		"uniform vec3 cameraPosition;",
		"uniform bool isOrthographic;",
		n.toneMapping === 0 ? "" : "#define TONE_MAPPING",
		n.toneMapping === 0 ? "" : X.tonemapping_pars_fragment,
		n.toneMapping === 0 ? "" : Us("toneMapping", n.toneMapping),
		n.dithering ? "#define DITHERING" : "",
		n.opaque ? "#define OPAQUE" : "",
		X.colorspace_pars_fragment,
		Vs("linearToOutputTexel", n.outputColorSpace),
		Gs(),
		n.useDepthPacking ? "#define DEPTH_PACKING " + n.depthPacking : "",
		"\n"
	].filter(Ys).join("\n")), o = $s(o), o = Xs(o, n), o = Zs(o, n), s = $s(s), s = Xs(s, n), s = Zs(s, n), o = rc(o), s = rc(s), n.isRawShaderMaterial !== !0 && (v = "#version 300 es\n", g = [
		p,
		"#define attribute in",
		"#define varying out",
		"#define texture2D texture"
	].join("\n") + "\n" + g, _ = [
		"#define varying in",
		n.glslVersion === "300 es" ? "" : "layout(location = 0) out highp vec4 pc_fragColor;",
		n.glslVersion === "300 es" ? "" : "#define gl_FragColor pc_fragColor",
		"#define gl_FragDepthEXT gl_FragDepth",
		"#define texture2D texture",
		"#define textureCube texture",
		"#define texture2DProj textureProj",
		"#define texture2DLodEXT textureLod",
		"#define texture2DProjLodEXT textureProjLod",
		"#define textureCubeLodEXT textureLod",
		"#define texture2DGradEXT textureGrad",
		"#define texture2DProjGradEXT textureProjGrad",
		"#define textureCubeGradEXT textureGrad"
	].join("\n") + "\n" + _);
	let y = v + g + o, b = v + _ + s, x = Ps(i, i.VERTEX_SHADER, y), S = Ps(i, i.FRAGMENT_SHADER, b);
	i.attachShader(h, x), i.attachShader(h, S), n.index0AttributeName === void 0 ? n.hasPositionAttribute === !0 && i.bindAttribLocation(h, 0, "position") : i.bindAttribLocation(h, 0, n.index0AttributeName), i.linkProgram(h);
	function C(t) {
		if (e.debug.checkShaderErrors) {
			let n = i.getProgramInfoLog(h) || "", r = i.getShaderInfoLog(x) || "", a = i.getShaderInfoLog(S) || "", o = n.trim(), s = r.trim(), c = a.trim(), l = !0, u = !0;
			if (i.getProgramParameter(h, i.LINK_STATUS) === !1) {
				if (l = !1, typeof e.debug.onShaderError == "function") e.debug.onShaderError(i, h, x, S);
				else {
					let e = Bs(i, x, "vertex"), n = Bs(i, S, "fragment");
					V("WebGLProgram: Shader Error " + i.getError() + " - VALIDATE_STATUS " + i.getProgramParameter(h, i.VALIDATE_STATUS) + "\n\nMaterial Name: " + t.name + "\nMaterial Type: " + t.type + "\n\nProgram Info Log: " + o + "\n" + e + "\n" + n);
				}
			} else o === "" ? (s === "" || c === "") && (u = !1) : B("WebGLProgram: Program Info Log:", o);
			u && (t.diagnostics = {
				runnable: l,
				programLog: o,
				vertexShader: {
					log: s,
					prefix: g
				},
				fragmentShader: {
					log: c,
					prefix: _
				}
			});
		}
		i.deleteShader(x), i.deleteShader(S), w = new Ns(i, h), T = Js(i, h);
	}
	let w;
	this.getUniforms = function() {
		return w === void 0 && C(this), w;
	};
	let T;
	this.getAttributes = function() {
		return T === void 0 && C(this), T;
	};
	let E = n.rendererExtensionParallelShaderCompile === !1;
	return this.isReady = function() {
		return E === !1 && (E = i.getProgramParameter(h, Fs)), E;
	}, this.destroy = function() {
		r.releaseStatesOfProgram(this), i.deleteProgram(h), this.program = void 0;
	}, this.type = n.shaderType, this.name = n.shaderName, this.id = Is++, this.cacheKey = t, this.usedTimes = 1, this.program = h, this.vertexShader = x, this.fragmentShader = S, this;
}
var gc = 0, _c = class {
	constructor() {
		this.shaderCache = /* @__PURE__ */ new Map(), this.materialCache = /* @__PURE__ */ new Map();
	}
	update(e, t, n) {
		let r = this._getShaderCacheForMaterial(e);
		return r.has(t) === !1 && (r.add(t), t.usedTimes++), r.has(n) === !1 && (r.add(n), n.usedTimes++), this;
	}
	remove(e) {
		let t = this.materialCache.get(e);
		for (let e of t) e.usedTimes--, e.usedTimes === 0 && this.shaderCache.delete(e.code);
		return this.materialCache.delete(e), this;
	}
	getVertexShaderStage(e) {
		return this._getShaderStage(e.vertexShader);
	}
	getFragmentShaderStage(e) {
		return this._getShaderStage(e.fragmentShader);
	}
	dispose() {
		this.shaderCache.clear(), this.materialCache.clear();
	}
	_getShaderCacheForMaterial(e) {
		let t = this.materialCache, n = t.get(e);
		return n === void 0 && (n = /* @__PURE__ */ new Set(), t.set(e, n)), n;
	}
	_getShaderStage(e) {
		let t = this.shaderCache, n = t.get(e);
		return n === void 0 && (n = new vc(e), t.set(e, n)), n;
	}
}, vc = class {
	constructor(e) {
		this.id = gc++, this.code = e, this.usedTimes = 0;
	}
};
function yc(e) {
	return e === 1030 || e === 37490 || e === 36285;
}
function bc(e, t, n, r, i, a) {
	let o = new Zt(), s = new _c(), c = /* @__PURE__ */ new Set(), l = [], u = /* @__PURE__ */ new Map(), d = r.logarithmicDepthBuffer, f = r.precision, p = {
		MeshDepthMaterial: "depth",
		MeshDistanceMaterial: "distance",
		MeshNormalMaterial: "normal",
		MeshBasicMaterial: "basic",
		MeshLambertMaterial: "lambert",
		MeshPhongMaterial: "phong",
		MeshToonMaterial: "toon",
		MeshStandardMaterial: "physical",
		MeshPhysicalMaterial: "physical",
		MeshMatcapMaterial: "matcap",
		LineBasicMaterial: "basic",
		LineDashedMaterial: "dashed",
		PointsMaterial: "points",
		ShadowMaterial: "shadow",
		SpriteMaterial: "sprite"
	};
	function m(e) {
		return c.add(e), e === 0 ? "uv" : `uv${e}`;
	}
	function h(i, o, l, u, h, g) {
		let _ = u.fog, v = h.geometry, y = i.isMeshStandardMaterial || i.isMeshLambertMaterial || i.isMeshPhongMaterial ? u.environment : null, b = i.isMeshStandardMaterial || i.isMeshLambertMaterial && !i.envMap || i.isMeshPhongMaterial && !i.envMap, x = t.get(i.envMap || y, b), S = x && x.mapping === 306 ? x.image.height : null, C = p[i.type];
		i.precision !== null && (f = r.getMaxPrecision(i.precision), f !== i.precision && B("WebGLProgram.getParameters:", i.precision, "not supported, using", f, "instead."));
		let w = v.morphAttributes.position || v.morphAttributes.normal || v.morphAttributes.color, T = w === void 0 ? 0 : w.length, E = 0;
		v.morphAttributes.position !== void 0 && (E = 1), v.morphAttributes.normal !== void 0 && (E = 2), v.morphAttributes.color !== void 0 && (E = 3);
		let D, O, ee, k;
		if (C) {
			let e = Va[C];
			D = e.vertexShader, O = e.fragmentShader;
		} else {
			D = i.vertexShader, O = i.fragmentShader;
			let e = s.getVertexShaderStage(i), t = s.getFragmentShaderStage(i);
			s.update(i, e, t), ee = e.id, k = t.id;
		}
		let A = e.getRenderTarget(), j = e.state.buffers.depth.getReversed(), M = h.isInstancedMesh === !0, te = h.isBatchedMesh === !0, N = !!i.map, ne = !!i.matcap, re = !!x, ie = !!i.aoMap, ae = !!i.lightMap, oe = !!i.bumpMap && i.wireframe === !1, se = !!i.normalMap, ce = !!i.displacementMap, le = !!i.emissiveMap, P = !!i.metalnessMap, ue = !!i.roughnessMap, de = i.anisotropy > 0, fe = i.clearcoat > 0, pe = i.dispersion > 0, me = i.retroreflectivity > 0, he = i.iridescence > 0, F = i.sheen > 0, I = i.transmission > 0, ge = de && !!i.anisotropyMap, _e = fe && !!i.clearcoatMap, ve = fe && !!i.clearcoatNormalMap, ye = fe && !!i.clearcoatRoughnessMap, be = he && !!i.iridescenceMap, xe = he && !!i.iridescenceThicknessMap, Se = F && !!i.sheenColorMap, Ce = F && !!i.sheenRoughnessMap, we = !!i.specularMap, Te = !!i.specularColorMap, Ee = !!i.specularIntensityMap, De = I && !!i.transmissionMap, Oe = I && !!i.thicknessMap, ke = !!i.gradientMap, Ae = !!i.alphaMap, je = i.alphaTest > 0, L = !!i.alphaHash, Me = !!i.extensions, Ne = 0;
		i.toneMapped && (A === null || A.isXRRenderTarget === !0) && (Ne = e.toneMapping);
		let Pe = {
			shaderID: C,
			shaderType: i.type,
			shaderName: i.name,
			vertexShader: D,
			fragmentShader: O,
			defines: i.defines,
			customVertexShaderID: ee,
			customFragmentShaderID: k,
			isRawShaderMaterial: i.isRawShaderMaterial === !0,
			glslVersion: i.glslVersion,
			precision: f,
			batching: te,
			batchingColor: te && h._colorsTexture !== null,
			instancing: M,
			instancingColor: M && h.instanceColor !== null,
			instancingMorph: M && h.morphTexture !== null,
			outputColorSpace: A === null ? e.outputColorSpace : A.isXRRenderTarget === !0 ? A.texture.colorSpace : K.workingColorSpace,
			alphaToCoverage: !!i.alphaToCoverage,
			map: N,
			matcap: ne,
			envMap: re,
			envMapMode: re && x.mapping,
			envMapCubeUVHeight: S,
			aoMap: ie,
			lightMap: ae,
			bumpMap: oe,
			normalMap: se,
			displacementMap: ce,
			emissiveMap: le,
			normalMapObjectSpace: se && i.normalMapType === 1,
			normalMapTangentSpace: se && i.normalMapType === 0,
			packedNormalMap: se && i.normalMapType === 0 && yc(i.normalMap.format),
			metalnessMap: P,
			roughnessMap: ue,
			anisotropy: de,
			anisotropyMap: ge,
			clearcoat: fe,
			clearcoatMap: _e,
			clearcoatNormalMap: ve,
			clearcoatRoughnessMap: ye,
			dispersion: pe,
			retroreflection: me,
			iridescence: he,
			iridescenceMap: be,
			iridescenceThicknessMap: xe,
			sheen: F,
			sheenColorMap: Se,
			sheenRoughnessMap: Ce,
			specularMap: we,
			specularColorMap: Te,
			specularIntensityMap: Ee,
			transmission: I,
			transmissionMap: De,
			thicknessMap: Oe,
			gradientMap: ke,
			opaque: i.transparent === !1 && i.blending === 1 && i.alphaToCoverage === !1,
			alphaMap: Ae,
			alphaTest: je,
			alphaHash: L,
			combine: i.combine,
			mapUv: N && m(i.map.channel),
			aoMapUv: ie && m(i.aoMap.channel),
			lightMapUv: ae && m(i.lightMap.channel),
			bumpMapUv: oe && m(i.bumpMap.channel),
			normalMapUv: se && m(i.normalMap.channel),
			displacementMapUv: ce && m(i.displacementMap.channel),
			emissiveMapUv: le && m(i.emissiveMap.channel),
			metalnessMapUv: P && m(i.metalnessMap.channel),
			roughnessMapUv: ue && m(i.roughnessMap.channel),
			anisotropyMapUv: ge && m(i.anisotropyMap.channel),
			clearcoatMapUv: _e && m(i.clearcoatMap.channel),
			clearcoatNormalMapUv: ve && m(i.clearcoatNormalMap.channel),
			clearcoatRoughnessMapUv: ye && m(i.clearcoatRoughnessMap.channel),
			iridescenceMapUv: be && m(i.iridescenceMap.channel),
			iridescenceThicknessMapUv: xe && m(i.iridescenceThicknessMap.channel),
			sheenColorMapUv: Se && m(i.sheenColorMap.channel),
			sheenRoughnessMapUv: Ce && m(i.sheenRoughnessMap.channel),
			specularMapUv: we && m(i.specularMap.channel),
			specularColorMapUv: Te && m(i.specularColorMap.channel),
			specularIntensityMapUv: Ee && m(i.specularIntensityMap.channel),
			transmissionMapUv: De && m(i.transmissionMap.channel),
			thicknessMapUv: Oe && m(i.thicknessMap.channel),
			alphaMapUv: Ae && m(i.alphaMap.channel),
			vertexTangents: !!v.attributes.tangent && (se || de),
			vertexNormals: !!v.attributes.normal,
			vertexColors: i.vertexColors,
			vertexAlphas: i.vertexColors === !0 && !!v.attributes.color && v.attributes.color.itemSize === 4,
			pointsUvs: h.isPoints === !0 && !!v.attributes.uv && (N || Ae),
			fog: !!_,
			useFog: i.fog === !0,
			fogExp2: !!_ && _.isFogExp2,
			flatShading: i.wireframe === !1 && (i.flatShading === !0 || v.attributes.normal === void 0 && se === !1 && (i.isMeshLambertMaterial || i.isMeshPhongMaterial || i.isMeshStandardMaterial || i.isMeshPhysicalMaterial)),
			sizeAttenuation: i.sizeAttenuation === !0,
			logarithmicDepthBuffer: d,
			reversedDepthBuffer: j,
			skinning: h.isSkinnedMesh === !0,
			hasPositionAttribute: v.attributes.position !== void 0,
			morphTargets: v.morphAttributes.position !== void 0,
			morphNormals: v.morphAttributes.normal !== void 0,
			morphColors: v.morphAttributes.color !== void 0,
			morphTargetsCount: T,
			morphTextureStride: E,
			numSunLights: o.sun.length,
			numDirLights: o.directional.length,
			numPointLights: o.point.length,
			numSpotLights: o.spot.length,
			numSpotLightMaps: o.spotLightMap.length,
			numRectAreaLights: o.rectArea.length,
			numHemiLights: o.hemi.length,
			numSunLightShadows: o.sunShadowMap.length,
			numDirLightShadows: o.directionalShadowMap.length,
			numPointLightShadows: o.pointShadowMap.length,
			numSpotLightShadows: o.spotShadowMap.length,
			numSpotLightShadowsWithMaps: o.numSpotLightShadowsWithMaps,
			numLightProbes: o.numLightProbes,
			numLightProbeGrids: g.length,
			numClippingPlanes: a.numPlanes,
			numClipIntersection: a.numIntersection,
			dithering: i.dithering,
			shadowMapEnabled: e.shadowMap.enabled && l.length > 0,
			shadowMapType: e.shadowMap.type,
			toneMapping: Ne,
			decodeVideoTexture: N && i.map.isVideoTexture === !0 && K.getTransfer(i.map.colorSpace) === "srgb",
			decodeVideoTextureEmissive: le && i.emissiveMap.isVideoTexture === !0 && K.getTransfer(i.emissiveMap.colorSpace) === "srgb",
			premultipliedAlpha: i.premultipliedAlpha,
			doubleSided: i.side === 2,
			flipSided: i.side === 1,
			useDepthPacking: i.depthPacking >= 0,
			depthPacking: i.depthPacking || 0,
			index0AttributeName: i.index0AttributeName,
			extensionClipCullDistance: Me && i.extensions.clipCullDistance === !0 && n.has("WEBGL_clip_cull_distance"),
			extensionMultiDraw: (Me && i.extensions.multiDraw === !0 || te) && n.has("WEBGL_multi_draw"),
			rendererExtensionParallelShaderCompile: n.has("KHR_parallel_shader_compile"),
			customProgramCacheKey: i.customProgramCacheKey()
		};
		return Pe.vertexUv1s = c.has(1), Pe.vertexUv2s = c.has(2), Pe.vertexUv3s = c.has(3), c.clear(), Pe;
	}
	function g(t) {
		let n = [];
		if (t.shaderID ? n.push(t.shaderID) : (n.push(t.customVertexShaderID), n.push(t.customFragmentShaderID)), t.defines !== void 0) for (let e in t.defines) n.push(e), n.push(t.defines[e]);
		return t.isRawShaderMaterial === !1 && (_(n, t), v(n, t), n.push(e.outputColorSpace)), n.push(t.customProgramCacheKey), n.join();
	}
	function _(e, t) {
		e.push(t.precision), e.push(t.outputColorSpace), e.push(t.envMapMode), e.push(t.envMapCubeUVHeight), e.push(t.mapUv), e.push(t.alphaMapUv), e.push(t.lightMapUv), e.push(t.aoMapUv), e.push(t.bumpMapUv), e.push(t.normalMapUv), e.push(t.displacementMapUv), e.push(t.emissiveMapUv), e.push(t.metalnessMapUv), e.push(t.roughnessMapUv), e.push(t.anisotropyMapUv), e.push(t.clearcoatMapUv), e.push(t.clearcoatNormalMapUv), e.push(t.clearcoatRoughnessMapUv), e.push(t.iridescenceMapUv), e.push(t.iridescenceThicknessMapUv), e.push(t.sheenColorMapUv), e.push(t.sheenRoughnessMapUv), e.push(t.specularMapUv), e.push(t.specularColorMapUv), e.push(t.specularIntensityMapUv), e.push(t.transmissionMapUv), e.push(t.thicknessMapUv), e.push(t.combine), e.push(t.fogExp2), e.push(t.sizeAttenuation), e.push(t.morphTargetsCount), e.push(t.morphAttributeCount), e.push(t.numSunLights), e.push(t.numDirLights), e.push(t.numPointLights), e.push(t.numSpotLights), e.push(t.numSpotLightMaps), e.push(t.numHemiLights), e.push(t.numRectAreaLights), e.push(t.numSunLightShadows), e.push(t.numDirLightShadows), e.push(t.numPointLightShadows), e.push(t.numSpotLightShadows), e.push(t.numSpotLightShadowsWithMaps), e.push(t.numLightProbes), e.push(t.shadowMapType), e.push(t.toneMapping), e.push(t.numClippingPlanes), e.push(t.numClipIntersection), e.push(t.depthPacking);
	}
	function v(e, t) {
		o.disableAll(), t.instancing && o.enable(0), t.instancingColor && o.enable(1), t.instancingMorph && o.enable(2), t.matcap && o.enable(3), t.envMap && o.enable(4), t.normalMapObjectSpace && o.enable(5), t.normalMapTangentSpace && o.enable(6), t.clearcoat && o.enable(7), t.iridescence && o.enable(8), t.alphaTest && o.enable(9), t.vertexColors && o.enable(10), t.vertexAlphas && o.enable(11), t.vertexUv1s && o.enable(12), t.vertexUv2s && o.enable(13), t.vertexUv3s && o.enable(14), t.vertexTangents && o.enable(15), t.anisotropy && o.enable(16), t.alphaHash && o.enable(17), t.batching && o.enable(18), t.dispersion && o.enable(19), t.retroreflection && o.enable(24), t.batchingColor && o.enable(20), t.gradientMap && o.enable(21), t.packedNormalMap && o.enable(22), t.vertexNormals && o.enable(23), e.push(o.mask), o.disableAll(), t.fog && o.enable(0), t.useFog && o.enable(1), t.flatShading && o.enable(2), t.logarithmicDepthBuffer && o.enable(3), t.reversedDepthBuffer && o.enable(4), t.skinning && o.enable(5), t.morphTargets && o.enable(6), t.morphNormals && o.enable(7), t.morphColors && o.enable(8), t.premultipliedAlpha && o.enable(9), t.shadowMapEnabled && o.enable(10), t.doubleSided && o.enable(11), t.flipSided && o.enable(12), t.useDepthPacking && o.enable(13), t.dithering && o.enable(14), t.transmission && o.enable(15), t.sheen && o.enable(16), t.opaque && o.enable(17), t.pointsUvs && o.enable(18), t.decodeVideoTexture && o.enable(19), t.decodeVideoTextureEmissive && o.enable(20), t.alphaToCoverage && o.enable(21), t.numLightProbeGrids > 0 && o.enable(22), t.hasPositionAttribute && o.enable(23), e.push(o.mask);
	}
	function y(e) {
		let t = p[e.type], n;
		if (t) {
			let e = Va[t];
			n = Ai.clone(e.uniforms);
		} else n = e.uniforms;
		return n;
	}
	function b(t, n) {
		let r = u.get(n);
		return r === void 0 ? (r = new hc(e, n, t, i), l.push(r), u.set(n, r)) : ++r.usedTimes, r;
	}
	function x(e) {
		if (--e.usedTimes === 0) {
			let t = l.indexOf(e);
			l[t] = l[l.length - 1], l.pop(), u.delete(e.cacheKey), e.destroy();
		}
	}
	function S(e) {
		s.remove(e);
	}
	function C() {
		s.dispose();
	}
	return {
		getParameters: h,
		getProgramCacheKey: g,
		getUniforms: y,
		acquireProgram: b,
		releaseProgram: x,
		releaseShaderCache: S,
		programs: l,
		dispose: C
	};
}
function xc() {
	let e = /* @__PURE__ */ new WeakMap();
	function t(t) {
		return e.has(t);
	}
	function n(t) {
		let n = e.get(t);
		return n === void 0 && (n = {}, e.set(t, n)), n;
	}
	function r(t) {
		e.delete(t);
	}
	function i(t, n, r) {
		e.get(t)[n] = r;
	}
	function a() {
		e = /* @__PURE__ */ new WeakMap();
	}
	return {
		has: t,
		get: n,
		remove: r,
		update: i,
		dispose: a
	};
}
function Sc(e, t) {
	return e.groupOrder === t.groupOrder ? e.renderOrder === t.renderOrder ? e.material.id === t.material.id ? e.materialVariant === t.materialVariant ? e.z === t.z ? e.id - t.id : e.z - t.z : e.materialVariant - t.materialVariant : e.material.id - t.material.id : e.renderOrder - t.renderOrder : e.groupOrder - t.groupOrder;
}
function Cc(e, t) {
	return e.groupOrder === t.groupOrder ? e.renderOrder === t.renderOrder ? e.z === t.z ? e.id - t.id : t.z - e.z : e.renderOrder - t.renderOrder : e.groupOrder - t.groupOrder;
}
function wc() {
	let e = [], t = 0, n = [], r = [], i = [];
	function a() {
		t = 0, n.length = 0, r.length = 0, i.length = 0;
	}
	function o(e) {
		let t = 0;
		return e.isInstancedMesh && (t += 2), e.isSkinnedMesh && (t += 1), t;
	}
	function s(n, r, i, a, s, c) {
		let l = e[t];
		return l === void 0 ? (l = {
			id: n.id,
			object: n,
			geometry: r,
			material: i,
			materialVariant: o(n),
			groupOrder: a,
			renderOrder: n.renderOrder,
			z: s,
			group: c
		}, e[t] = l) : (l.id = n.id, l.object = n, l.geometry = r, l.material = i, l.materialVariant = o(n), l.groupOrder = a, l.renderOrder = n.renderOrder, l.z = s, l.group = c), t++, l;
	}
	function c(e, t, a, o, c, l, u) {
		u.reversedDepth === !0 && (c = -c);
		let d = s(e, t, a, o, c, l);
		a.transmission > 0 ? r.push(d) : a.transparent === !0 ? i.push(d) : n.push(d);
	}
	function l(e, t, a, o, c, l) {
		let u = s(e, t, a, o, c, l);
		a.transmission > 0 ? r.unshift(u) : a.transparent === !0 ? i.unshift(u) : n.unshift(u);
	}
	function u(e, t) {
		n.length > 1 && n.sort(e || Sc), r.length > 1 && r.sort(t || Cc), i.length > 1 && i.sort(t || Cc);
	}
	function d() {
		for (let n = t, r = e.length; n < r; n++) {
			let t = e[n];
			if (t.id === null) break;
			t.id = null, t.object = null, t.geometry = null, t.material = null, t.group = null;
		}
	}
	return {
		opaque: n,
		transmissive: r,
		transparent: i,
		init: a,
		push: c,
		unshift: l,
		finish: d,
		sort: u
	};
}
function Tc() {
	let e = /* @__PURE__ */ new WeakMap();
	function t(t, n) {
		let r = e.get(t), i;
		return r === void 0 ? (i = new wc(), e.set(t, [i])) : n >= r.length ? (i = new wc(), r.push(i)) : i = r[n], i;
	}
	function n() {
		e = /* @__PURE__ */ new WeakMap();
	}
	return {
		get: t,
		dispose: n
	};
}
function Ec() {
	let e = {};
	return { get: function(t) {
		if (e[t.id] !== void 0) return e[t.id];
		let n;
		switch (t.type) {
			case "SunLight":
			case "DirectionalLight":
				n = {
					direction: new W(),
					color: new J()
				};
				break;
			case "SpotLight":
				n = {
					position: new W(),
					direction: new W(),
					color: new J(),
					distance: 0,
					coneCos: 0,
					penumbraCos: 0,
					decay: 0
				};
				break;
			case "PointLight":
				n = {
					position: new W(),
					color: new J(),
					distance: 0,
					decay: 0
				};
				break;
			case "HemisphereLight":
				n = {
					direction: new W(),
					skyColor: new J(),
					groundColor: new J()
				};
				break;
			case "RectAreaLight": n = {
				color: new J(),
				position: new W(),
				halfWidth: new W(),
				halfHeight: new W()
			};
		}
		return e[t.id] = n, n;
	} };
}
function Dc() {
	let e = {};
	return { get: function(t) {
		if (e[t.id] !== void 0) return e[t.id];
		let n;
		switch (t.type) {
			case "SunLight":
			case "DirectionalLight":
				n = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new U()
				};
				break;
			case "SpotLight":
				n = {
					shadowIntensity: 1,
					shadowBias: 0,
					shadowNormalBias: 0,
					shadowRadius: 1,
					shadowMapSize: new U()
				};
				break;
			case "PointLight": n = {
				shadowIntensity: 1,
				shadowBias: 0,
				shadowNormalBias: 0,
				shadowRadius: 1,
				shadowMapSize: new U(),
				shadowCameraNear: 1,
				shadowCameraFar: 1e3
			};
		}
		return e[t.id] = n, n;
	} };
}
var Oc = 0;
function kc(e, t) {
	return (t.castShadow ? 2 : 0) - (e.castShadow ? 2 : 0) + +!!t.map - !!e.map;
}
function Ac(e) {
	let t = new Ec(), n = Dc(), r = {
		version: 0,
		hash: {
			sunLength: -1,
			directionalLength: -1,
			pointLength: -1,
			spotLength: -1,
			rectAreaLength: -1,
			hemiLength: -1,
			numSunShadows: -1,
			numDirectionalShadows: -1,
			numPointShadows: -1,
			numSpotShadows: -1,
			numSpotMaps: -1,
			numLightProbes: -1
		},
		ambient: [
			0,
			0,
			0
		],
		probe: [],
		sun: [],
		sunShadow: [],
		sunShadowMap: [],
		sunShadowMatrix: [],
		sunShadowCascade: [],
		directional: [],
		directionalShadow: [],
		directionalShadowMap: [],
		directionalShadowMatrix: [],
		spot: [],
		spotLightMap: [],
		spotShadow: [],
		spotShadowMap: [],
		spotLightMatrix: [],
		rectArea: [],
		rectAreaLTC1: null,
		rectAreaLTC2: null,
		point: [],
		pointShadow: [],
		pointShadowMap: [],
		pointShadowMatrix: [],
		hemi: [],
		numSpotLightShadowsWithMaps: 0,
		numLightProbes: 0
	};
	for (let e = 0; e < 9; e++) r.probe.push(new W());
	let i = new W(), a = new Bt(), o = new Bt();
	function s(i) {
		let a = 0, o = 0, s = 0;
		for (let e = 0; e < 9; e++) r.probe[e].set(0, 0, 0);
		let c = 0, l = 0, u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0, v = 0, y = 0, b = 0, x = 0;
		i.sort(kc);
		for (let e = 0, S = i.length; e < S; e++) {
			let S = i[e], C = S.color, w = S.intensity, T = S.distance, E = null;
			if (S.shadow && S.shadow.map && (E = S.shadow.map.texture.format === 1030 ? S.shadow.map.texture : S.shadow.map.depthTexture || S.shadow.map.texture), S.isAmbientLight) a += C.r * w, o += C.g * w, s += C.b * w;
			else if (S.isLightProbe) {
				for (let e = 0; e < 9; e++) r.probe[e].addScaledVector(S.sh.coefficients[e], w);
				x++;
			} else if (S.isSunLight) {
				let e = t.get(S);
				if (e.color.copy(S.color).multiplyScalar(S.intensity), S.castShadow) {
					let e = S.shadow, t = n.get(S);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()), r.sunShadow[l] = t, r.sunShadowMap[l] = E;
					let i = e.getViewportCount();
					for (let t = 0; t < i; t++) r.sunShadowMatrix[u + t] = e.getMatrix(t), r.sunShadowCascade[u + t] = e._cascadeData[t];
					u += i, l++;
				}
				r.sun[c] = e, c++;
			} else if (S.isDirectionalLight) {
				let e = t.get(S);
				if (e.color.copy(S.color).multiplyScalar(S.intensity), S.castShadow) {
					let e = S.shadow, t = n.get(S);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize = e.mapSize, r.directionalShadow[d] = t, r.directionalShadowMap[d] = E, r.directionalShadowMatrix[d] = S.shadow.matrix, g++;
				}
				r.directional[d] = e, d++;
			} else if (S.isSpotLight) {
				let e = t.get(S);
				e.position.setFromMatrixPosition(S.matrixWorld), e.color.copy(C).multiplyScalar(w), e.distance = T, e.coneCos = Math.cos(S.angle), e.penumbraCos = Math.cos(S.angle * (1 - S.penumbra)), e.decay = S.decay, r.spot[p] = e;
				let i = S.shadow;
				if (S.map && (r.spotLightMap[y] = S.map, y++, i.updateMatrices(S), S.castShadow && b++), r.spotLightMatrix[p] = i.matrix, S.castShadow) {
					let e = n.get(S);
					e.shadowIntensity = i.intensity, e.shadowBias = i.bias, e.shadowNormalBias = i.normalBias, e.shadowRadius = i.radius, e.shadowMapSize = i.mapSize, r.spotShadow[p] = e, r.spotShadowMap[p] = E, v++;
				}
				p++;
			} else if (S.isRectAreaLight) {
				let e = t.get(S);
				e.color.copy(C).multiplyScalar(w), e.halfWidth.set(S.width * .5, 0, 0), e.halfHeight.set(0, S.height * .5, 0), r.rectArea[m] = e, m++;
			} else if (S.isPointLight) {
				let e = t.get(S);
				if (e.color.copy(S.color).multiplyScalar(S.intensity), e.distance = S.distance, e.decay = S.decay, S.castShadow) {
					let e = S.shadow, t = n.get(S);
					t.shadowIntensity = e.intensity, t.shadowBias = e.bias, t.shadowNormalBias = e.normalBias, t.shadowRadius = e.radius, t.shadowMapSize = e.mapSize, t.shadowCameraNear = e.camera.near, t.shadowCameraFar = e.camera.far, r.pointShadow[f] = t, r.pointShadowMap[f] = E, r.pointShadowMatrix[f] = S.shadow.matrix, _++;
				}
				r.point[f] = e, f++;
			} else if (S.isHemisphereLight) {
				let e = t.get(S);
				e.skyColor.copy(S.color).multiplyScalar(w), e.groundColor.copy(S.groundColor).multiplyScalar(w), r.hemi[h] = e, h++;
			}
		}
		m > 0 && (e.has("OES_texture_float_linear") === !0 ? (r.rectAreaLTC1 = Z.LTC_FLOAT_1, r.rectAreaLTC2 = Z.LTC_FLOAT_2) : (r.rectAreaLTC1 = Z.LTC_HALF_1, r.rectAreaLTC2 = Z.LTC_HALF_2)), r.ambient[0] = a, r.ambient[1] = o, r.ambient[2] = s;
		let S = r.hash;
		(S.sunLength !== c || S.directionalLength !== d || S.pointLength !== f || S.spotLength !== p || S.rectAreaLength !== m || S.hemiLength !== h || S.numSunShadows !== l || S.numDirectionalShadows !== g || S.numPointShadows !== _ || S.numSpotShadows !== v || S.numSpotMaps !== y || S.numLightProbes !== x) && (r.sun.length = c, r.directional.length = d, r.spot.length = p, r.rectArea.length = m, r.point.length = f, r.hemi.length = h, r.sunShadow.length = l, r.sunShadowMap.length = l, r.sunShadowMatrix.length = u, r.sunShadowCascade.length = u, r.directionalShadow.length = g, r.directionalShadowMap.length = g, r.directionalShadowMatrix.length = g, r.pointShadow.length = _, r.pointShadowMap.length = _, r.pointShadowMatrix.length = _, r.spotShadow.length = v, r.spotShadowMap.length = v, r.spotLightMatrix.length = v + y - b, r.spotLightMap.length = y, r.numSpotLightShadowsWithMaps = b, r.numLightProbes = x, S.sunLength = c, S.directionalLength = d, S.pointLength = f, S.spotLength = p, S.rectAreaLength = m, S.hemiLength = h, S.numSunShadows = l, S.numDirectionalShadows = g, S.numPointShadows = _, S.numSpotShadows = v, S.numSpotMaps = y, S.numLightProbes = x, r.version = Oc++);
	}
	function c(e, t) {
		let n = 0, s = 0, c = 0, l = 0, u = 0, d = 0, f = t.matrixWorldInverse;
		for (let t = 0, p = e.length; t < p; t++) {
			let p = e[t];
			if (p.isSunLight) {
				let e = r.sun[n];
				e.direction.setFromMatrixPosition(p.matrixWorld), e.direction.transformDirection(f), n++;
			} else if (p.isDirectionalLight) {
				let e = r.directional[s];
				e.direction.setFromMatrixPosition(p.matrixWorld), i.setFromMatrixPosition(p.target.matrixWorld), e.direction.sub(i), e.direction.transformDirection(f), s++;
			} else if (p.isSpotLight) {
				let e = r.spot[l];
				e.position.setFromMatrixPosition(p.matrixWorld), e.position.applyMatrix4(f), e.direction.setFromMatrixPosition(p.matrixWorld), i.setFromMatrixPosition(p.target.matrixWorld), e.direction.sub(i), e.direction.transformDirection(f), l++;
			} else if (p.isRectAreaLight) {
				let e = r.rectArea[u];
				e.position.setFromMatrixPosition(p.matrixWorld), e.position.applyMatrix4(f), o.identity(), a.copy(p.matrixWorld), a.premultiply(f), o.extractRotation(a), e.halfWidth.set(p.width * .5, 0, 0), e.halfHeight.set(0, p.height * .5, 0), e.halfWidth.applyMatrix4(o), e.halfHeight.applyMatrix4(o), u++;
			} else if (p.isPointLight) {
				let e = r.point[c];
				e.position.setFromMatrixPosition(p.matrixWorld), e.position.applyMatrix4(f), c++;
			} else if (p.isHemisphereLight) {
				let e = r.hemi[d];
				e.direction.setFromMatrixPosition(p.matrixWorld), e.direction.transformDirection(f), d++;
			}
		}
	}
	return {
		setup: s,
		setupView: c,
		state: r
	};
}
function jc(e) {
	let t = new Ac(e), n = [], r = [], i = [];
	function a(e) {
		d.camera = e, n.length = 0, r.length = 0, i.length = 0;
	}
	function o(e) {
		n.push(e);
	}
	function s(e) {
		r.push(e);
	}
	function c(e) {
		i.push(e);
	}
	function l() {
		t.setup(n);
	}
	function u(e) {
		t.setupView(n, e);
	}
	let d = {
		lightsArray: n,
		shadowsArray: r,
		lightProbeGridArray: i,
		camera: null,
		lights: t,
		transmissionRenderTarget: {},
		textureUnits: 0
	};
	return {
		init: a,
		state: d,
		setupLights: l,
		setupLightsView: u,
		pushLight: o,
		pushShadow: s,
		pushLightProbeGrid: c
	};
}
function Mc(e) {
	let t = /* @__PURE__ */ new WeakMap();
	function n(n, r = 0) {
		let i = t.get(n), a;
		return i === void 0 ? (a = new jc(e), t.set(n, [a])) : r >= i.length ? (a = new jc(e), i.push(a)) : a = i[r], a;
	}
	function r() {
		t = /* @__PURE__ */ new WeakMap();
	}
	return {
		get: n,
		dispose: r
	};
}
var Nc = "void main() {\n	gl_Position = vec4( position, 1.0 );\n}", Pc = "uniform sampler2D shadow_pass;\nuniform vec2 resolution;\nuniform float radius;\nvoid main() {\n	const float samples = float( VSM_SAMPLES );\n	float mean = 0.0;\n	float squared_mean = 0.0;\n	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );\n	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;\n	for ( float i = 0.0; i < samples; i ++ ) {\n		float uvOffset = uvStart + i * uvStride;\n		#ifdef HORIZONTAL_PASS\n			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;\n			mean += distribution.x;\n			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;\n		#else\n			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;\n			mean += depth;\n			squared_mean += depth * depth;\n		#endif\n	}\n	mean = mean / samples;\n	squared_mean = squared_mean / samples;\n	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );\n	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );\n}", Fc = [
	/*@__PURE__*/ new W(1, 0, 0),
	/*@__PURE__*/ new W(-1, 0, 0),
	/*@__PURE__*/ new W(0, 1, 0),
	/*@__PURE__*/ new W(0, -1, 0),
	/*@__PURE__*/ new W(0, 0, 1),
	/*@__PURE__*/ new W(0, 0, -1)
], Ic = [
	/*@__PURE__*/ new W(0, -1, 0),
	/*@__PURE__*/ new W(0, -1, 0),
	/*@__PURE__*/ new W(0, 0, 1),
	/*@__PURE__*/ new W(0, 0, -1),
	/*@__PURE__*/ new W(0, -1, 0),
	/*@__PURE__*/ new W(0, -1, 0)
], Lc = /*@__PURE__*/ new Bt(), Rc = /*@__PURE__*/ new W(), zc = /*@__PURE__*/ new W();
function Bc(e, t, n) {
	let r = new pi(), i = new U(), a = new U(), o = new It(), s = new Ii(), c = new Li(), l = {}, u = n.maxTextureSize, d = {
		0: 1,
		1: 0,
		2: 2
	}, f = new Ni({
		defines: { VSM_SAMPLES: 8 },
		uniforms: {
			shadow_pass: { value: null },
			resolution: { value: new U() },
			radius: { value: 4 }
		},
		vertexShader: Nc,
		fragmentShader: Pc
	}), p = f.clone();
	p.defines.HORIZONTAL_PASS = 1;
	let h = new _r();
	h.setAttribute("position", new nr(new Float32Array([
		-1,
		-1,
		.5,
		3,
		-1,
		.5,
		-1,
		3,
		.5
	]), 3));
	let g = new oi(h, f), v = this;
	this.enabled = !1, this.autoUpdate = !0, this.needsUpdate = !1, this.type = 1;
	let y = this.type;
	this.render = function(t, n, s) {
		if (v.enabled === !1 || v.autoUpdate === !1 && v.needsUpdate === !1 || t.length === 0) return;
		this.type === 2 && (B("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."), this.type = 1);
		let c = e.getRenderTarget(), l = e.getActiveCubeFace(), d = e.getActiveMipmapLevel(), f = e.state;
		f.setBlending(0), f.buffers.depth.getReversed() === !0 ? f.buffers.color.setClear(0, 0, 0, 0) : f.buffers.color.setClear(1, 1, 1, 1), f.buffers.depth.setTest(!0), f.setScissorTest(!1);
		let p = y !== this.type;
		p && n.traverse(function(e) {
			e.material && (Array.isArray(e.material) ? e.material.forEach((e) => e.needsUpdate = !0) : e.material.needsUpdate = !0);
		});
		for (let c = 0, l = t.length; c < l; c++) {
			let l = t[c], d = l.shadow;
			if (d === void 0) {
				B("WebGLShadowMap:", l, "has no shadow.");
				continue;
			}
			if (d.autoUpdate === !1 && d.needsUpdate === !1) continue;
			i.copy(d.mapSize);
			let h = d.getFrameExtents();
			i.multiply(h), a.copy(d.mapSize), (i.x > u || i.y > u) && (i.x > u && (a.x = Math.floor(u / h.x), i.x = a.x * h.x, d.mapSize.x = a.x), i.y > u && (a.y = Math.floor(u / h.y), i.y = a.y * h.y, d.mapSize.y = a.y));
			let g = e.state.buffers.depth.getReversed();
			if (d.camera._reversedDepth = g, d.map === null || p === !0) {
				if (d.map !== null && (d.map.depthTexture !== null && (d.map.depthTexture.dispose(), d.map.depthTexture = null), d.map.dispose()), this.type === 3) {
					if (l.isPointLight) {
						B("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");
						continue;
					}
					d.map = new q(i.x, i.y, {
						format: oe,
						type: D,
						minFilter: _,
						magFilter: _,
						generateMipmaps: !1
					}), d.map.texture.name = l.name + ".shadowMap", d.map.depthTexture = new gi(i.x, i.y, E), d.map.depthTexture.name = l.name + ".shadowMapDepth", d.map.depthTexture.format = ne, d.map.depthTexture.compareFunction = null, d.map.depthTexture.minFilter = m, d.map.depthTexture.magFilter = m;
				} else l.isPointLight ? (d.map = new vo(i.x), d.map.depthTexture = new _i(i.x, T)) : (d.map = new q(i.x, i.y), d.map.depthTexture = new gi(i.x, i.y, T)), d.map.depthTexture.name = l.name + ".shadowMap", d.map.depthTexture.format = ne, this.type === 1 ? (d.map.depthTexture.compareFunction = g ? 518 : 515, d.map.depthTexture.minFilter = _, d.map.depthTexture.magFilter = _) : (d.map.depthTexture.compareFunction = null, d.map.depthTexture.minFilter = m, d.map.depthTexture.magFilter = m);
				d.camera.updateProjectionMatrix();
			}
			d.map.isWebGLCubeRenderTarget !== !0 && (d.map.width !== i.x || d.map.height !== i.y) && d.map.setSize(i.x, i.y);
			let v = d.map.isWebGLCubeRenderTarget ? 6 : d.getViewportCount();
			l.isPointLight !== !0 && d.updateMatrices(l, s);
			for (let t = 0; t < v; t++) {
				let i = d.getCamera(t);
				if (l.isPointLight) {
					let e = d.camera, n = d.matrix, r = l.distance || e.far;
					r !== e.far && (e.far = r, e.updateProjectionMatrix()), Rc.setFromMatrixPosition(l.matrixWorld), e.position.copy(Rc), zc.copy(e.position), zc.add(Fc[t]), e.up.copy(Ic[t]), e.lookAt(zc), e.updateMatrixWorld(), n.makeTranslation(-Rc.x, -Rc.y, -Rc.z), Lc.multiplyMatrices(e.projectionMatrix, e.matrixWorldInverse), d._frustum.setFromProjectionMatrix(Lc, e.coordinateSystem, e.reversedDepth);
				}
				if (d.map.isWebGLCubeRenderTarget) e.setRenderTarget(d.map, t), e.clear();
				else {
					t === 0 && (e.setRenderTarget(d.map), e.clear());
					let n = d.getViewport(t);
					o.set(a.x * n.x, a.y * n.y, a.x * n.z, a.y * n.w), f.viewport(o);
				}
				r = d.getFrustum(t), S(n, s, i, l, this.type);
			}
			d.isPointLightShadow !== !0 && this.type === 3 && b(d, s), d.needsUpdate = !1;
		}
		y = this.type, v.needsUpdate = !1, e.setRenderTarget(c, l, d);
	};
	function b(n, r) {
		let a = t.update(g);
		f.defines.VSM_SAMPLES !== n.blurSamples && (f.defines.VSM_SAMPLES = n.blurSamples, p.defines.VSM_SAMPLES = n.blurSamples, f.needsUpdate = !0, p.needsUpdate = !0), n.mapPass === null ? n.mapPass = new q(i.x, i.y, {
			format: oe,
			type: D
		}) : (n.mapPass.width !== n.map.width || n.mapPass.height !== n.map.height) && n.mapPass.setSize(n.map.width, n.map.height), f.uniforms.shadow_pass.value = n.map.depthTexture, f.uniforms.resolution.value.set(n.map.width, n.map.height), f.uniforms.radius.value = n.radius, e.setRenderTarget(n.mapPass), e.clear(), e.renderBufferDirect(r, null, a, f, g, null), p.uniforms.shadow_pass.value = n.mapPass.texture, p.uniforms.resolution.value.set(n.map.width, n.map.height), p.uniforms.radius.value = n.radius, e.setRenderTarget(n.map), e.clear(), e.renderBufferDirect(r, null, a, p, g, null);
	}
	function x(t, n, r, i) {
		let a = null, o = r.isPointLight === !0 ? t.customDistanceMaterial : t.customDepthMaterial;
		if (o !== void 0) a = o;
		else if (a = r.isPointLight === !0 ? c : s, e.localClippingEnabled && n.clipShadows === !0 && Array.isArray(n.clippingPlanes) && n.clippingPlanes.length !== 0 || n.displacementMap && n.displacementScale !== 0 || n.alphaMap && n.alphaTest > 0 || n.map && n.alphaTest > 0 || n.alphaToCoverage === !0) {
			let e = a.uuid, t = n.uuid, r = l[e];
			r === void 0 && (r = {}, l[e] = r);
			let i = r[t];
			i === void 0 && (i = a.clone(), r[t] = i, n.addEventListener("dispose", C)), a = i;
		}
		if (a.visible = n.visible, a.wireframe = n.wireframe, i === 3 ? a.side = n.shadowSide === null ? n.side : n.shadowSide : a.side = n.shadowSide === null ? d[n.side] : n.shadowSide, a.alphaMap = n.alphaMap, a.alphaTest = n.alphaToCoverage === !0 ? .5 : n.alphaTest, a.map = n.map, a.clipShadows = n.clipShadows, a.clippingPlanes = n.clippingPlanes, a.clipIntersection = n.clipIntersection, a.displacementMap = n.displacementMap, a.displacementScale = n.displacementScale, a.displacementBias = n.displacementBias, a.wireframeLinewidth = n.wireframeLinewidth, a.linewidth = n.linewidth, r.isPointLight === !0 && a.isMeshDistanceMaterial === !0) {
			let t = e.properties.get(a);
			t.light = r;
		}
		return a;
	}
	function S(n, i, a, o, s) {
		if (n.visible === !1) return;
		if (n.layers.test(i.layers) && (n.isMesh || n.isLine || n.isPoints) && (n.castShadow || n.receiveShadow && s === 3) && (!n.frustumCulled || n.intersectsFrustum(r))) {
			n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse, n.matrixWorld);
			let r = t.update(n), c = n.material;
			if (Array.isArray(c)) {
				let t = r.groups;
				for (let l = 0, u = t.length; l < u; l++) {
					let u = t[l], d = c[u.materialIndex];
					if (d && d.visible) {
						let t = x(n, d, o, s);
						n.onBeforeShadow(e, n, i, a, r, t, u), e.renderBufferDirect(a, null, r, t, n, u), n.onAfterShadow(e, n, i, a, r, t, u);
					}
				}
			} else if (c.visible) {
				let t = x(n, c, o, s);
				n.onBeforeShadow(e, n, i, a, r, t, null), e.renderBufferDirect(a, null, r, t, n, null), n.onAfterShadow(e, n, i, a, r, t, null);
			}
		}
		let c = n.children;
		for (let e = 0, t = c.length; e < t; e++) S(c[e], i, a, o, s);
	}
	function C(e) {
		e.target.removeEventListener("dispose", C);
		for (let t in l) {
			let n = l[t], r = e.target.uuid;
			r in n && (n[r].dispose(), delete n[r]);
		}
	}
}
function Vc(e, t) {
	function n() {
		let t = !1, n = new It(), r = null, i = new It(0, 0, 0, 0);
		return {
			setMask: function(n) {
				r !== n && !t && (e.colorMask(n, n, n, n), r = n);
			},
			setLocked: function(e) {
				t = e;
			},
			setClear: function(t, r, a, o, s) {
				s === !0 && (t *= o, r *= o, a *= o), n.set(t, r, a, o), i.equals(n) === !1 && (e.clearColor(t, r, a, o), i.copy(n));
			},
			reset: function() {
				t = !1, r = null, i.set(-1, 0, 0, 0);
			}
		};
	}
	function r() {
		let n = !1, r = !1, i = null, a = null, o = null;
		return {
			setReversed: function(e) {
				if (r !== e) {
					let n = t.get("EXT_clip_control");
					e ? n.clipControlEXT(n.LOWER_LEFT_EXT, n.ZERO_TO_ONE_EXT) : n.clipControlEXT(n.LOWER_LEFT_EXT, n.NEGATIVE_ONE_TO_ONE_EXT), r = e;
					let i = o;
					o = null, this.setClear(i);
				}
			},
			getReversed: function() {
				return r;
			},
			setTest: function(t) {
				t ? P(e.DEPTH_TEST) : ue(e.DEPTH_TEST);
			},
			setMask: function(t) {
				i !== t && !n && (e.depthMask(t), i = t);
			},
			setFunc: function(t) {
				if (r && (t = lt[t]), a !== t) {
					switch (t) {
						case 0:
							e.depthFunc(e.NEVER);
							break;
						case 1:
							e.depthFunc(e.ALWAYS);
							break;
						case 2:
							e.depthFunc(e.LESS);
							break;
						case 3:
							e.depthFunc(e.LEQUAL);
							break;
						case 4:
							e.depthFunc(e.EQUAL);
							break;
						case 5:
							e.depthFunc(e.GEQUAL);
							break;
						case 6:
							e.depthFunc(e.GREATER);
							break;
						case 7:
							e.depthFunc(e.NOTEQUAL);
							break;
						default: e.depthFunc(e.LEQUAL);
					}
					a = t;
				}
			},
			setLocked: function(e) {
				n = e;
			},
			setClear: function(t) {
				o !== t && (o = t, r && (t = 1 - t), e.clearDepth(t));
			},
			reset: function() {
				n = !1, i = null, a = null, o = null, r = !1;
			}
		};
	}
	function i() {
		let t = !1, n = null, r = null, i = null, a = null, o = null, s = null, c = null, l = null;
		return {
			setTest: function(n) {
				t || (n ? P(e.STENCIL_TEST) : ue(e.STENCIL_TEST));
			},
			setMask: function(r) {
				n !== r && !t && (e.stencilMask(r), n = r);
			},
			setFunc: function(t, n, o) {
				(r !== t || i !== n || a !== o) && (e.stencilFunc(t, n, o), r = t, i = n, a = o);
			},
			setOp: function(t, n, r) {
				(o !== t || s !== n || c !== r) && (e.stencilOp(t, n, r), o = t, s = n, c = r);
			},
			setLocked: function(e) {
				t = e;
			},
			setClear: function(t) {
				l !== t && (e.clearStencil(t), l = t);
			},
			reset: function() {
				t = !1, n = null, r = null, i = null, a = null, o = null, s = null, c = null, l = null;
			}
		};
	}
	let a = new n(), o = new r(), s = new i(), c = /* @__PURE__ */ new WeakMap(), l = /* @__PURE__ */ new WeakMap(), u = {}, d = {}, f = {}, p = /* @__PURE__ */ new WeakMap(), m = [], h = null, g = !1, _ = null, v = null, y = null, b = null, x = null, S = null, C = null, w = new J(0, 0, 0), T = 0, E = !1, D = null, O = null, ee = null, k = null, A = null, j = e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS), M = !1, te = 0, N = e.getParameter(e.VERSION);
	N.indexOf("WebGL") === -1 ? N.indexOf("OpenGL ES") !== -1 && (te = parseFloat(/^OpenGL ES (\d)/.exec(N)[1]), M = te >= 2) : (te = parseFloat(/^WebGL (\d)/.exec(N)[1]), M = te >= 1);
	let ne = null, re = {}, ie = e.getParameter(e.SCISSOR_BOX), ae = e.getParameter(e.VIEWPORT), oe = new It().fromArray(ie), se = new It().fromArray(ae);
	function ce(t, n, r, i) {
		let a = /* @__PURE__ */ new Uint8Array(4), o = e.createTexture();
		e.bindTexture(t, o), e.texParameteri(t, e.TEXTURE_MIN_FILTER, e.NEAREST), e.texParameteri(t, e.TEXTURE_MAG_FILTER, e.NEAREST);
		for (let o = 0; o < r; o++) t === e.TEXTURE_3D || t === e.TEXTURE_2D_ARRAY ? e.texImage3D(n, 0, e.RGBA, 1, 1, i, 0, e.RGBA, e.UNSIGNED_BYTE, a) : e.texImage2D(n + o, 0, e.RGBA, 1, 1, 0, e.RGBA, e.UNSIGNED_BYTE, a);
		return o;
	}
	let le = {};
	le[e.TEXTURE_2D] = ce(e.TEXTURE_2D, e.TEXTURE_2D, 1), le[e.TEXTURE_CUBE_MAP] = ce(e.TEXTURE_CUBE_MAP, e.TEXTURE_CUBE_MAP_POSITIVE_X, 6), le[e.TEXTURE_2D_ARRAY] = ce(e.TEXTURE_2D_ARRAY, e.TEXTURE_2D_ARRAY, 1, 1), le[e.TEXTURE_3D] = ce(e.TEXTURE_3D, e.TEXTURE_3D, 1, 1), a.setClear(0, 0, 0, 1), o.setClear(1), s.setClear(0), P(e.DEPTH_TEST), o.setFunc(3), ge(!1), _e(1), P(e.CULL_FACE), F(0);
	function P(t) {
		u[t] !== !0 && (e.enable(t), u[t] = !0);
	}
	function ue(t) {
		u[t] !== !1 && (e.disable(t), u[t] = !1);
	}
	function de(t, n) {
		return f[t] !== n && (e.bindFramebuffer(t, n), f[t] = n, t === e.DRAW_FRAMEBUFFER && (f[e.FRAMEBUFFER] = n), t === e.FRAMEBUFFER && (f[e.DRAW_FRAMEBUFFER] = n), !0);
	}
	function fe(t, n) {
		let r = m, i = !1;
		if (t) {
			r = p.get(n), r === void 0 && (r = [], p.set(n, r));
			let a = t.textures;
			if (r.length !== a.length || r[0] !== e.COLOR_ATTACHMENT0) {
				for (let t = 0, n = a.length; t < n; t++) r[t] = e.COLOR_ATTACHMENT0 + t;
				r.length = a.length, i = !0;
			}
		} else r[0] !== e.BACK && (r[0] = e.BACK, i = !0);
		i && e.drawBuffers(r);
	}
	function pe(t) {
		return h !== t && (e.useProgram(t), h = t, !0);
	}
	let me = {
		100: e.FUNC_ADD,
		101: e.FUNC_SUBTRACT,
		102: e.FUNC_REVERSE_SUBTRACT
	};
	me[103] = e.MIN, me[104] = e.MAX;
	let he = {
		200: e.ZERO,
		201: e.ONE,
		202: e.SRC_COLOR,
		204: e.SRC_ALPHA,
		210: e.SRC_ALPHA_SATURATE,
		208: e.DST_COLOR,
		206: e.DST_ALPHA,
		203: e.ONE_MINUS_SRC_COLOR,
		205: e.ONE_MINUS_SRC_ALPHA,
		209: e.ONE_MINUS_DST_COLOR,
		207: e.ONE_MINUS_DST_ALPHA,
		211: e.CONSTANT_COLOR,
		212: e.ONE_MINUS_CONSTANT_COLOR,
		213: e.CONSTANT_ALPHA,
		214: e.ONE_MINUS_CONSTANT_ALPHA
	};
	function F(t, n, r, i, a, o, s, c, l, u) {
		if (t === 0) g === !0 && (ue(e.BLEND), g = !1);
		else if (g === !1 && (P(e.BLEND), g = !0), t !== 5) {
			if (t !== _ || u !== E) {
				if ((v !== 100 || x !== 100) && (e.blendEquation(e.FUNC_ADD), v = 100, x = 100), u) switch (t) {
					case 1:
						e.blendFuncSeparate(e.ONE, e.ONE_MINUS_SRC_ALPHA, e.ONE, e.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						e.blendFunc(e.ONE, e.ONE);
						break;
					case 3:
						e.blendFuncSeparate(e.ZERO, e.ONE_MINUS_SRC_COLOR, e.ZERO, e.ONE);
						break;
					case 4:
						e.blendFuncSeparate(e.DST_COLOR, e.ONE_MINUS_SRC_ALPHA, e.ZERO, e.ONE);
						break;
					default: V("WebGLState: Invalid blending: ", t);
				}
				else switch (t) {
					case 1:
						e.blendFuncSeparate(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA, e.ONE, e.ONE_MINUS_SRC_ALPHA);
						break;
					case 2:
						e.blendFuncSeparate(e.SRC_ALPHA, e.ONE, e.ONE, e.ONE);
						break;
					case 3:
						V("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");
						break;
					case 4:
						V("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");
						break;
					default: V("WebGLState: Invalid blending: ", t);
				}
				y = null, b = null, S = null, C = null, w.set(0, 0, 0), T = 0, _ = t, E = u;
			}
		} else a ||= n, o ||= r, s ||= i, (n !== v || a !== x) && (e.blendEquationSeparate(me[n], me[a]), v = n, x = a), (r !== y || i !== b || o !== S || s !== C) && (e.blendFuncSeparate(he[r], he[i], he[o], he[s]), y = r, b = i, S = o, C = s), (c.equals(w) === !1 || l !== T) && (e.blendColor(c.r, c.g, c.b, l), w.copy(c), T = l), _ = t, E = !1;
	}
	function I(t, n) {
		t.side === 2 ? ue(e.CULL_FACE) : P(e.CULL_FACE);
		let r = t.side === 1;
		n && (r = !r), ge(r), t.blending === 1 && t.transparent === !1 ? F(0) : F(t.blending, t.blendEquation, t.blendSrc, t.blendDst, t.blendEquationAlpha, t.blendSrcAlpha, t.blendDstAlpha, t.blendColor, t.blendAlpha, t.premultipliedAlpha), o.setFunc(t.depthFunc), o.setTest(t.depthTest), o.setMask(t.depthWrite), a.setMask(t.colorWrite);
		let i = t.stencilWrite;
		s.setTest(i), i && (s.setMask(t.stencilWriteMask), s.setFunc(t.stencilFunc, t.stencilRef, t.stencilFuncMask), s.setOp(t.stencilFail, t.stencilZFail, t.stencilZPass)), ye(t.polygonOffset, t.polygonOffsetFactor, t.polygonOffsetUnits), t.alphaToCoverage === !0 ? P(e.SAMPLE_ALPHA_TO_COVERAGE) : ue(e.SAMPLE_ALPHA_TO_COVERAGE);
	}
	function ge(t) {
		D !== t && (t ? e.frontFace(e.CW) : e.frontFace(e.CCW), D = t);
	}
	function _e(t) {
		t === 0 ? ue(e.CULL_FACE) : (P(e.CULL_FACE), t !== O && (t === 1 ? e.cullFace(e.BACK) : t === 2 ? e.cullFace(e.FRONT) : e.cullFace(e.FRONT_AND_BACK))), O = t;
	}
	function ve(t) {
		t !== ee && (M && e.lineWidth(t), ee = t);
	}
	function ye(t, n, r) {
		t ? (P(e.POLYGON_OFFSET_FILL), (k !== n || A !== r) && (k = n, A = r, o.getReversed() && (n = -n), e.polygonOffset(n, r))) : ue(e.POLYGON_OFFSET_FILL);
	}
	function be(t) {
		t ? P(e.SCISSOR_TEST) : ue(e.SCISSOR_TEST);
	}
	function xe(t) {
		t === void 0 && (t = e.TEXTURE0 + j - 1), ne !== t && (e.activeTexture(t), ne = t);
	}
	function Se(t, n, r) {
		r === void 0 && (r = ne === null ? e.TEXTURE0 + j - 1 : ne);
		let i = re[r];
		i === void 0 && (i = {
			type: void 0,
			texture: void 0
		}, re[r] = i), (i.type !== t || i.texture !== n) && (ne !== r && (e.activeTexture(r), ne = r), e.bindTexture(t, n || le[t]), i.type = t, i.texture = n);
	}
	function Ce() {
		let t = re[ne];
		t !== void 0 && t.type !== void 0 && (e.bindTexture(t.type, null), t.type = void 0, t.texture = void 0);
	}
	function we() {
		try {
			e.compressedTexImage2D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function Te() {
		try {
			e.compressedTexImage3D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function Ee() {
		try {
			e.texSubImage2D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function De() {
		try {
			e.texSubImage3D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function Oe() {
		try {
			e.compressedTexSubImage2D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function ke() {
		try {
			e.compressedTexSubImage3D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function Ae() {
		try {
			e.texStorage2D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function je() {
		try {
			e.texStorage3D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function L() {
		try {
			e.texImage2D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function Me() {
		try {
			e.texImage3D(...arguments);
		} catch (e) {
			V("WebGLState:", e);
		}
	}
	function Ne(t) {
		return d[t] === void 0 ? e.getParameter(t) : d[t];
	}
	function Pe(t, n) {
		d[t] !== n && (e.pixelStorei(t, n), d[t] = n);
	}
	function R(t) {
		oe.equals(t) === !1 && (e.scissor(t.x, t.y, t.z, t.w), oe.copy(t));
	}
	function Fe(t) {
		se.equals(t) === !1 && (e.viewport(t.x, t.y, t.z, t.w), se.copy(t));
	}
	function z(t, n) {
		let r = l.get(n);
		r === void 0 && (r = /* @__PURE__ */ new WeakMap(), l.set(n, r));
		let i = r.get(t);
		i === void 0 && (i = e.getUniformBlockIndex(n, t.name), r.set(t, i));
	}
	function Ie(t, n) {
		let r = l.get(n).get(t);
		c.get(n) !== r && (e.uniformBlockBinding(n, r, t.__bindingPointIndex), c.set(n, r));
	}
	function Le() {
		e.disable(e.BLEND), e.disable(e.CULL_FACE), e.disable(e.DEPTH_TEST), e.disable(e.POLYGON_OFFSET_FILL), e.disable(e.SCISSOR_TEST), e.disable(e.STENCIL_TEST), e.disable(e.SAMPLE_ALPHA_TO_COVERAGE), e.blendEquation(e.FUNC_ADD), e.blendFunc(e.ONE, e.ZERO), e.blendFuncSeparate(e.ONE, e.ZERO, e.ONE, e.ZERO), e.blendColor(0, 0, 0, 0), e.colorMask(!0, !0, !0, !0), e.clearColor(0, 0, 0, 0), e.depthMask(!0), e.depthFunc(e.LESS), o.setReversed(!1), e.clearDepth(1), e.stencilMask(4294967295), e.stencilFunc(e.ALWAYS, 0, 4294967295), e.stencilOp(e.KEEP, e.KEEP, e.KEEP), e.clearStencil(0), e.cullFace(e.BACK), e.frontFace(e.CCW), e.polygonOffset(0, 0), e.activeTexture(e.TEXTURE0), e.bindFramebuffer(e.FRAMEBUFFER, null), e.bindFramebuffer(e.DRAW_FRAMEBUFFER, null), e.bindFramebuffer(e.READ_FRAMEBUFFER, null), e.useProgram(null), e.lineWidth(1), e.scissor(0, 0, e.canvas.width, e.canvas.height), e.viewport(0, 0, e.canvas.width, e.canvas.height), e.pixelStorei(e.PACK_ALIGNMENT, 4), e.pixelStorei(e.UNPACK_ALIGNMENT, 4), e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, !1), e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL, e.BROWSER_DEFAULT_WEBGL), e.pixelStorei(e.PACK_ROW_LENGTH, 0), e.pixelStorei(e.PACK_SKIP_PIXELS, 0), e.pixelStorei(e.PACK_SKIP_ROWS, 0), e.pixelStorei(e.UNPACK_ROW_LENGTH, 0), e.pixelStorei(e.UNPACK_IMAGE_HEIGHT, 0), e.pixelStorei(e.UNPACK_SKIP_PIXELS, 0), e.pixelStorei(e.UNPACK_SKIP_ROWS, 0), e.pixelStorei(e.UNPACK_SKIP_IMAGES, 0), u = {}, d = {}, ne = null, re = {}, f = {}, p = /* @__PURE__ */ new WeakMap(), m = [], h = null, g = !1, _ = null, v = null, y = null, b = null, x = null, S = null, C = null, w = new J(0, 0, 0), T = 0, E = !1, D = null, O = null, ee = null, k = null, A = null, oe.set(0, 0, e.canvas.width, e.canvas.height), se.set(0, 0, e.canvas.width, e.canvas.height), a.reset(), o.reset(), s.reset();
	}
	return {
		buffers: {
			color: a,
			depth: o,
			stencil: s
		},
		enable: P,
		disable: ue,
		bindFramebuffer: de,
		drawBuffers: fe,
		useProgram: pe,
		setBlending: F,
		setMaterial: I,
		setFlipSided: ge,
		setCullFace: _e,
		setLineWidth: ve,
		setPolygonOffset: ye,
		setScissorTest: be,
		activeTexture: xe,
		bindTexture: Se,
		unbindTexture: Ce,
		compressedTexImage2D: we,
		compressedTexImage3D: Te,
		texImage2D: L,
		texImage3D: Me,
		pixelStorei: Pe,
		getParameter: Ne,
		updateUBOMapping: z,
		uniformBlockBinding: Ie,
		texStorage2D: Ae,
		texStorage3D: je,
		texSubImage2D: Ee,
		texSubImage3D: De,
		compressedTexSubImage2D: Oe,
		compressedTexSubImage3D: ke,
		scissor: R,
		viewport: Fe,
		reset: Le
	};
}
function Hc(e, t, n, r, i, a, o) {
	let s = t.has("WEBGL_multisampled_render_to_texture") ? t.get("WEBGL_multisampled_render_to_texture") : null, c = typeof navigator > "u" ? !1 : /OculusBrowser/g.test(navigator.userAgent), l = new U(), u = /* @__PURE__ */ new WeakMap(), b = /* @__PURE__ */ new Set(), x, S = /* @__PURE__ */ new WeakMap(), C = !1;
	try {
		C = typeof OffscreenCanvas < "u" && new OffscreenCanvas(1, 1).getContext("2d") !== null;
	} catch {}
	function w(e, t) {
		return C ? new OffscreenCanvas(e, t) : nt("canvas");
	}
	function T(e, t, n) {
		let r = 1, i = Ne(e);
		if ((i.width > n || i.height > n) && (r = n / Math.max(i.width, i.height)), r < 1) {
			if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap || typeof VideoFrame < "u" && e instanceof VideoFrame) {
				let n = Math.floor(r * i.width), a = Math.floor(r * i.height);
				x === void 0 && (x = w(n, a));
				let o = t ? w(n, a) : x;
				return o.width = n, o.height = a, o.getContext("2d").drawImage(e, 0, 0, n, a), B("WebGLRenderer: Texture has been resized from (" + i.width + "x" + i.height + ") to (" + n + "x" + a + ")."), o;
			}
			return "data" in e && B("WebGLRenderer: Image in DataTexture is too big (" + i.width + "x" + i.height + ")."), e;
		}
		return e;
	}
	function E(e) {
		return e.generateMipmaps;
	}
	function D(t) {
		e.generateMipmap(t);
	}
	function O(t) {
		return t.isWebGLCubeRenderTarget ? e.TEXTURE_CUBE_MAP : t.isWebGL3DRenderTarget ? e.TEXTURE_3D : t.isWebGLArrayRenderTarget || t.isCompressedArrayTexture ? e.TEXTURE_2D_ARRAY : e.TEXTURE_2D;
	}
	function ee(n, r, i, a, o, s = !1) {
		if (n !== null) {
			if (e[n] !== void 0) return e[n];
			B("WebGLRenderer: Attempt to use non-existing WebGL internal format '" + n + "'");
		}
		let c;
		a && (c = t.get("EXT_texture_norm16"), c || B("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));
		let l = r;
		if (r === e.RED && (i === e.FLOAT && (l = e.R32F), i === e.HALF_FLOAT && (l = e.R16F), i === e.UNSIGNED_BYTE && (l = e.R8), i === e.UNSIGNED_SHORT && c && (l = c.R16_EXT), i === e.SHORT && c && (l = c.R16_SNORM_EXT)), r === e.RED_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.R8UI), i === e.UNSIGNED_SHORT && (l = e.R16UI), i === e.UNSIGNED_INT && (l = e.R32UI), i === e.BYTE && (l = e.R8I), i === e.SHORT && (l = e.R16I), i === e.INT && (l = e.R32I)), r === e.RG && (i === e.FLOAT && (l = e.RG32F), i === e.HALF_FLOAT && (l = e.RG16F), i === e.UNSIGNED_BYTE && (l = e.RG8), i === e.UNSIGNED_SHORT && c && (l = c.RG16_EXT), i === e.SHORT && c && (l = c.RG16_SNORM_EXT)), r === e.RG_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.RG8UI), i === e.UNSIGNED_SHORT && (l = e.RG16UI), i === e.UNSIGNED_INT && (l = e.RG32UI), i === e.BYTE && (l = e.RG8I), i === e.SHORT && (l = e.RG16I), i === e.INT && (l = e.RG32I)), r === e.RGB_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.RGB8UI), i === e.UNSIGNED_SHORT && (l = e.RGB16UI), i === e.UNSIGNED_INT && (l = e.RGB32UI), i === e.BYTE && (l = e.RGB8I), i === e.SHORT && (l = e.RGB16I), i === e.INT && (l = e.RGB32I)), r === e.RGBA_INTEGER && (i === e.UNSIGNED_BYTE && (l = e.RGBA8UI), i === e.UNSIGNED_SHORT && (l = e.RGBA16UI), i === e.UNSIGNED_INT && (l = e.RGBA32UI), i === e.BYTE && (l = e.RGBA8I), i === e.SHORT && (l = e.RGBA16I), i === e.INT && (l = e.RGBA32I)), r === e.RGB && (i === e.UNSIGNED_SHORT && c && (l = c.RGB16_EXT), i === e.SHORT && c && (l = c.RGB16_SNORM_EXT), i === e.UNSIGNED_INT_5_9_9_9_REV && (l = e.RGB9_E5), i === e.UNSIGNED_INT_10F_11F_11F_REV && (l = e.R11F_G11F_B10F)), r === e.RGBA) {
			let t = s ? Ye : K.getTransfer(o);
			i === e.FLOAT && (l = e.RGBA32F), i === e.HALF_FLOAT && (l = e.RGBA16F), i === e.UNSIGNED_BYTE && (l = t === "srgb" ? e.SRGB8_ALPHA8 : e.RGBA8), i === e.UNSIGNED_SHORT && c && (l = c.RGBA16_EXT), i === e.SHORT && c && (l = c.RGBA16_SNORM_EXT), i === e.UNSIGNED_SHORT_4_4_4_4 && (l = e.RGBA4), i === e.UNSIGNED_SHORT_5_5_5_1 && (l = e.RGB5_A1);
		}
		return (l === e.R16F || l === e.R32F || l === e.RG16F || l === e.RG32F || l === e.RGBA16F || l === e.RGBA32F) && t.get("EXT_color_buffer_float"), l;
	}
	function k(t, n) {
		let r;
		return t ? n === null || n === 1014 || n === 1020 ? r = e.DEPTH24_STENCIL8 : n === 1015 ? r = e.DEPTH32F_STENCIL8 : n === 1012 && (r = e.DEPTH24_STENCIL8, B("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")) : n === null || n === 1014 || n === 1020 ? r = e.DEPTH_COMPONENT24 : n === 1015 ? r = e.DEPTH_COMPONENT32F : n === 1012 && (r = e.DEPTH_COMPONENT16), r;
	}
	function A(e, t) {
		return E(e) === !0 || e.isFramebufferTexture && e.minFilter !== 1003 && e.minFilter !== 1006 ? Math.log2(Math.max(t.width, t.height)) + 1 : e.mipmaps !== void 0 && e.mipmaps.length > 0 ? e.mipmaps.length : e.isCompressedTexture && Array.isArray(e.image) ? t.mipmaps.length : 1;
	}
	function j(e) {
		let t = e.target;
		t.removeEventListener("dispose", j), te(t), t.isVideoTexture && u.delete(t), t.isHTMLTexture && b.delete(t);
	}
	function M(e) {
		let t = e.target;
		t.removeEventListener("dispose", M), ne(t);
	}
	function te(e) {
		let t = r.get(e);
		if (t.__webglInit === void 0) return;
		let n = e.source, i = S.get(n);
		if (i) {
			let r = i[t.__cacheKey];
			r.usedTimes--, r.usedTimes === 0 && N(e), Object.keys(i).length === 0 && S.delete(n);
		}
		r.remove(e);
	}
	function N(t) {
		let n = r.get(t);
		e.deleteTexture(n.__webglTexture);
		let i = t.source, a = S.get(i);
		delete a[n.__cacheKey], o.memory.textures--;
	}
	function ne(t) {
		let n = r.get(t);
		if (t.depthTexture && (t.depthTexture.dispose(), r.remove(t.depthTexture)), t.isWebGLCubeRenderTarget) for (let t = 0; t < 6; t++) {
			if (Array.isArray(n.__webglFramebuffer[t])) for (let r = 0; r < n.__webglFramebuffer[t].length; r++) e.deleteFramebuffer(n.__webglFramebuffer[t][r]);
			else e.deleteFramebuffer(n.__webglFramebuffer[t]);
			n.__webglDepthbuffer && e.deleteRenderbuffer(n.__webglDepthbuffer[t]);
		}
		else {
			if (Array.isArray(n.__webglFramebuffer)) for (let t = 0; t < n.__webglFramebuffer.length; t++) e.deleteFramebuffer(n.__webglFramebuffer[t]);
			else e.deleteFramebuffer(n.__webglFramebuffer);
			if (n.__webglDepthbuffer && e.deleteRenderbuffer(n.__webglDepthbuffer), n.__webglMultisampledFramebuffer && e.deleteFramebuffer(n.__webglMultisampledFramebuffer), n.__webglColorRenderbuffer) for (let t = 0; t < n.__webglColorRenderbuffer.length; t++) n.__webglColorRenderbuffer[t] && e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);
			n.__webglDepthRenderbuffer && e.deleteRenderbuffer(n.__webglDepthRenderbuffer);
		}
		let i = t.textures;
		for (let t = 0, n = i.length; t < n; t++) {
			let n = r.get(i[t]);
			n.__webglTexture && (e.deleteTexture(n.__webglTexture), o.memory.textures--), r.remove(i[t]);
		}
		r.remove(t);
	}
	let ie = 0;
	function ae() {
		ie = 0;
	}
	function oe() {
		return ie;
	}
	function se(e) {
		ie = e;
	}
	function ce() {
		let e = ie;
		return e >= i.maxTextures && B("WebGLTextures: Trying to use " + (e + 1) + " texture units while this GPU supports only " + i.maxTextures), ie += 1, e;
	}
	function le(e) {
		let t = [];
		return t.push(e.wrapS), t.push(e.wrapT), t.push(e.wrapR || 0), t.push(e.magFilter), t.push(e.minFilter), t.push(e.anisotropy), t.push(e.internalFormat), t.push(e.format), t.push(e.type), t.push(e.generateMipmaps), t.push(e.premultiplyAlpha), t.push(e.flipY), t.push(e.unpackAlignment), t.push(e.colorSpace), t.join();
	}
	function P(t, i) {
		let a = r.get(t);
		if (t.isVideoTexture && L(t), t.isRenderTargetTexture === !1 && t.isExternalTexture !== !0 && t.version > 0 && a.__version !== t.version) {
			let e = t.image;
			if (e === null) B("WebGLRenderer: Texture marked for update but no image data found.");
			else if (e.complete === !1) B("WebGLRenderer: Texture marked for update but image is incomplete");
			else {
				ve(a, t, i);
				return;
			}
		} else t.isExternalTexture && (a.__webglTexture = t.sourceTexture ? t.sourceTexture : null);
		n.bindTexture(e.TEXTURE_2D, a.__webglTexture, e.TEXTURE0 + i);
	}
	function ue(t, i) {
		let a = r.get(t);
		t.isRenderTargetTexture === !1 && t.version > 0 && a.__version !== t.version ? ve(a, t, i) : (t.isExternalTexture && (a.__webglTexture = t.sourceTexture ? t.sourceTexture : null), n.bindTexture(e.TEXTURE_2D_ARRAY, a.__webglTexture, e.TEXTURE0 + i));
	}
	function de(t, i) {
		let a = r.get(t);
		t.isRenderTargetTexture === !1 && t.version > 0 && a.__version !== t.version ? ve(a, t, i) : n.bindTexture(e.TEXTURE_3D, a.__webglTexture, e.TEXTURE0 + i);
	}
	function fe(t, i) {
		let a = r.get(t);
		t.isCubeDepthTexture !== !0 && t.version > 0 && a.__version !== t.version ? ye(a, t, i) : n.bindTexture(e.TEXTURE_CUBE_MAP, a.__webglTexture, e.TEXTURE0 + i);
	}
	let pe = {
		[d]: e.REPEAT,
		[f]: e.CLAMP_TO_EDGE,
		[p]: e.MIRRORED_REPEAT
	}, me = {
		[m]: e.NEAREST,
		[h]: e.NEAREST_MIPMAP_NEAREST,
		[g]: e.NEAREST_MIPMAP_LINEAR,
		[_]: e.LINEAR,
		[v]: e.LINEAR_MIPMAP_NEAREST,
		[y]: e.LINEAR_MIPMAP_LINEAR
	}, he = {
		512: e.NEVER,
		519: e.ALWAYS,
		513: e.LESS,
		515: e.LEQUAL,
		514: e.EQUAL,
		518: e.GEQUAL,
		516: e.GREATER,
		517: e.NOTEQUAL
	};
	function F(n, a) {
		if (a.type === 1015 && t.has("OES_texture_float_linear") === !1 && (a.magFilter === 1006 || a.magFilter === 1007 || a.magFilter === 1005 || a.magFilter === 1008 || a.minFilter === 1006 || a.minFilter === 1007 || a.minFilter === 1005 || a.minFilter === 1008) && B("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."), e.texParameteri(n, e.TEXTURE_WRAP_S, pe[a.wrapS]), e.texParameteri(n, e.TEXTURE_WRAP_T, pe[a.wrapT]), (n === e.TEXTURE_3D || n === e.TEXTURE_2D_ARRAY) && e.texParameteri(n, e.TEXTURE_WRAP_R, pe[a.wrapR]), e.texParameteri(n, e.TEXTURE_MAG_FILTER, me[a.magFilter]), e.texParameteri(n, e.TEXTURE_MIN_FILTER, me[a.minFilter]), a.compareFunction && (e.texParameteri(n, e.TEXTURE_COMPARE_MODE, e.COMPARE_REF_TO_TEXTURE), e.texParameteri(n, e.TEXTURE_COMPARE_FUNC, he[a.compareFunction])), t.has("EXT_texture_filter_anisotropic") === !0) {
			if (a.magFilter === 1003 || a.minFilter !== 1005 && a.minFilter !== 1008 || a.type === 1015 && t.has("OES_texture_float_linear") === !1) return;
			if (a.anisotropy > 1 || r.get(a).__currentAnisotropy) {
				let o = t.get("EXT_texture_filter_anisotropic");
				e.texParameterf(n, o.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(a.anisotropy, i.getMaxAnisotropy())), r.get(a).__currentAnisotropy = a.anisotropy;
			}
		}
	}
	function I(t, n) {
		let r = !1;
		t.__webglInit === void 0 && (t.__webglInit = !0, n.addEventListener("dispose", j));
		let i = n.source, a = S.get(i);
		a === void 0 && (a = {}, S.set(i, a));
		let s = le(n);
		if (s !== t.__cacheKey) {
			a[s] === void 0 && (a[s] = {
				texture: e.createTexture(),
				usedTimes: 0
			}, o.memory.textures++, r = !0), a[s].usedTimes++;
			let i = a[t.__cacheKey];
			i !== void 0 && (a[t.__cacheKey].usedTimes--, i.usedTimes === 0 && N(n)), t.__cacheKey = s, t.__webglTexture = a[s].texture;
		}
		return r;
	}
	function ge(e, t, n) {
		return Math.floor(Math.floor(e / n) / t);
	}
	function _e(t, r, i, a) {
		let o = t.updateRanges;
		if (o.length === 0) n.texSubImage2D(e.TEXTURE_2D, 0, 0, 0, r.width, r.height, i, a, r.data);
		else {
			o.sort((e, t) => e.start - t.start);
			let s = 0;
			for (let e = 1; e < o.length; e++) {
				let t = o[s], n = o[e], i = t.start + t.count, a = ge(n.start, r.width, 4), c = ge(t.start, r.width, 4);
				n.start <= i + 1 && a === c && ge(n.start + n.count - 1, r.width, 4) === a ? t.count = Math.max(t.count, n.start + n.count - t.start) : (++s, o[s] = n);
			}
			o.length = s + 1;
			let c = n.getParameter(e.UNPACK_ROW_LENGTH), l = n.getParameter(e.UNPACK_SKIP_PIXELS), u = n.getParameter(e.UNPACK_SKIP_ROWS);
			n.pixelStorei(e.UNPACK_ROW_LENGTH, r.width);
			for (let t = 0, s = o.length; t < s; t++) {
				let s = o[t], c = Math.floor(s.start / 4), l = Math.ceil(s.count / 4), u = c % r.width, d = Math.floor(c / r.width), f = l;
				n.pixelStorei(e.UNPACK_SKIP_PIXELS, u), n.pixelStorei(e.UNPACK_SKIP_ROWS, d), n.texSubImage2D(e.TEXTURE_2D, 0, u, d, f, 1, i, a, r.data);
			}
			t.clearUpdateRanges(), n.pixelStorei(e.UNPACK_ROW_LENGTH, c), n.pixelStorei(e.UNPACK_SKIP_PIXELS, l), n.pixelStorei(e.UNPACK_SKIP_ROWS, u);
		}
	}
	function ve(t, o, s) {
		let c = e.TEXTURE_2D;
		(o.isDataArrayTexture || o.isCompressedArrayTexture) && (c = e.TEXTURE_2D_ARRAY), o.isData3DTexture && (c = e.TEXTURE_3D);
		let l = I(t, o), u = o.source;
		n.bindTexture(c, t.__webglTexture, e.TEXTURE0 + s);
		let d = r.get(u);
		if (u.version !== d.__version || l === !0) {
			if (n.activeTexture(e.TEXTURE0 + s), !(typeof ImageBitmap < "u" && o.image instanceof ImageBitmap)) {
				let t = K.getPrimaries(K.workingColorSpace), r = o.colorSpace === "" ? null : K.getPrimaries(o.colorSpace), i = o.colorSpace === "" || t === r ? e.NONE : e.BROWSER_DEFAULT_WEBGL;
				n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, o.flipY), n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, o.premultiplyAlpha), n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL, i);
			}
			n.pixelStorei(e.UNPACK_ALIGNMENT, o.unpackAlignment);
			let t = T(o.image, !1, i.maxTextureSize);
			t = Me(o, t);
			let r = a.convert(o.format, o.colorSpace), f = a.convert(o.type), p = ee(o.internalFormat, r, f, o.normalized, o.colorSpace, o.isVideoTexture);
			F(c, o);
			let m, h = o.mipmaps, g = o.isVideoTexture !== !0, _ = d.__version === void 0 || l === !0, v = u.dataReady, y = A(o, t);
			if (o.isDepthTexture) p = k(o.format === re, o.type), _ && (g ? n.texStorage2D(e.TEXTURE_2D, 1, p, t.width, t.height) : n.texImage2D(e.TEXTURE_2D, 0, p, t.width, t.height, 0, r, f, null));
			else if (o.isDataTexture) {
				if (h.length > 0) {
					g && _ && n.texStorage2D(e.TEXTURE_2D, y, p, h[0].width, h[0].height);
					for (let t = 0, i = h.length; t < i; t++) m = h[t], g ? v && n.texSubImage2D(e.TEXTURE_2D, t, 0, 0, m.width, m.height, r, f, m.data) : n.texImage2D(e.TEXTURE_2D, t, p, m.width, m.height, 0, r, f, m.data);
					o.generateMipmaps = !1;
				} else g ? (_ && n.texStorage2D(e.TEXTURE_2D, y, p, t.width, t.height), v && _e(o, t, r, f)) : n.texImage2D(e.TEXTURE_2D, 0, p, t.width, t.height, 0, r, f, t.data);
			} else if (o.isCompressedTexture) {
				if (o.isCompressedArrayTexture) {
					g && _ && n.texStorage3D(e.TEXTURE_2D_ARRAY, y, p, h[0].width, h[0].height, t.depth);
					for (let i = 0, a = h.length; i < a; i++) if (m = h[i], o.format !== 1023) {
						if (r !== null) {
							if (g) {
								if (v) {
									if (o.layerUpdates.size > 0) {
										let t = La(m.width, m.height, o.format, o.type);
										for (let a of o.layerUpdates) {
											let o = m.data.subarray(a * t / m.data.BYTES_PER_ELEMENT, (a + 1) * t / m.data.BYTES_PER_ELEMENT);
											n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY, i, 0, 0, a, m.width, m.height, 1, r, o);
										}
									} else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY, i, 0, 0, 0, m.width, m.height, t.depth, r, m.data);
								}
							} else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY, i, p, m.width, m.height, t.depth, 0, m.data, 0, 0);
						} else B("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
					} else g ? v && n.texSubImage3D(e.TEXTURE_2D_ARRAY, i, 0, 0, 0, m.width, m.height, t.depth, r, f, m.data) : n.texImage3D(e.TEXTURE_2D_ARRAY, i, p, m.width, m.height, t.depth, 0, r, f, m.data);
					o.layerUpdates.size > 0 && o.clearLayerUpdates();
				} else {
					g && _ && n.texStorage2D(e.TEXTURE_2D, y, p, h[0].width, h[0].height);
					for (let t = 0, i = h.length; t < i; t++) m = h[t], o.format === 1023 ? g ? v && n.texSubImage2D(e.TEXTURE_2D, t, 0, 0, m.width, m.height, r, f, m.data) : n.texImage2D(e.TEXTURE_2D, t, p, m.width, m.height, 0, r, f, m.data) : r === null ? B("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()") : g ? v && n.compressedTexSubImage2D(e.TEXTURE_2D, t, 0, 0, m.width, m.height, r, m.data) : n.compressedTexImage2D(e.TEXTURE_2D, t, p, m.width, m.height, 0, m.data);
				}
			} else if (o.isDataArrayTexture) {
				if (g) {
					if (_ && n.texStorage3D(e.TEXTURE_2D_ARRAY, y, p, t.width, t.height, t.depth), v) {
						if (o.layerUpdates.size > 0) {
							let i = La(t.width, t.height, o.format, o.type);
							for (let a of o.layerUpdates) {
								let o = t.data.subarray(a * i / t.data.BYTES_PER_ELEMENT, (a + 1) * i / t.data.BYTES_PER_ELEMENT);
								n.texSubImage3D(e.TEXTURE_2D_ARRAY, 0, 0, 0, a, t.width, t.height, 1, r, f, o);
							}
							o.clearLayerUpdates();
						} else n.texSubImage3D(e.TEXTURE_2D_ARRAY, 0, 0, 0, 0, t.width, t.height, t.depth, r, f, t.data);
					}
				} else n.texImage3D(e.TEXTURE_2D_ARRAY, 0, p, t.width, t.height, t.depth, 0, r, f, t.data);
			} else if (o.isData3DTexture) g ? (_ && n.texStorage3D(e.TEXTURE_3D, y, p, t.width, t.height, t.depth), v && n.texSubImage3D(e.TEXTURE_3D, 0, 0, 0, 0, t.width, t.height, t.depth, r, f, t.data)) : n.texImage3D(e.TEXTURE_3D, 0, p, t.width, t.height, t.depth, 0, r, f, t.data);
			else if (o.isFramebufferTexture) {
				if (_) {
					if (g) n.texStorage2D(e.TEXTURE_2D, y, p, t.width, t.height);
					else {
						let i = t.width, a = t.height;
						for (let t = 0; t < y; t++) n.texImage2D(e.TEXTURE_2D, t, p, i, a, 0, r, f, null), i >>= 1, a >>= 1;
					}
				}
			} else if (o.isHTMLTexture) {
				if ("texElementImage2D" in e) {
					let n = e.canvas;
					if (n.hasAttribute("layoutsubtree") || n.setAttribute("layoutsubtree", "true"), t.parentNode !== n) {
						n.appendChild(t), b.add(o), n.onpaint = (e) => {
							let t = e.changedElements;
							for (let e of b) t.includes(e.image) && (e.needsUpdate = !0);
						}, n.requestPaint();
						return;
					}
					if (e.texElementImage2D.length === 3) e.texElementImage2D(e.TEXTURE_2D, e.RGBA8, t);
					else {
						let n = e.RGBA, r = e.RGBA, i = e.UNSIGNED_BYTE;
						e.texElementImage2D(e.TEXTURE_2D, 0, n, r, i, t);
					}
					e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE);
				}
			} else if (h.length > 0) {
				if (g && _) {
					let t = Ne(h[0]);
					n.texStorage2D(e.TEXTURE_2D, y, p, t.width, t.height);
				}
				for (let t = 0, i = h.length; t < i; t++) m = h[t], g ? v && n.texSubImage2D(e.TEXTURE_2D, t, 0, 0, r, f, m) : n.texImage2D(e.TEXTURE_2D, t, p, r, f, m);
				o.generateMipmaps = !1;
			} else if (g) {
				if (_) {
					let r = Ne(t);
					n.texStorage2D(e.TEXTURE_2D, y, p, r.width, r.height);
				}
				v && n.texSubImage2D(e.TEXTURE_2D, 0, 0, 0, r, f, t);
			} else n.texImage2D(e.TEXTURE_2D, 0, p, r, f, t);
			E(o) && D(c), d.__version = u.version, o.onUpdate && o.onUpdate(o);
		}
		t.__version = o.version;
	}
	function ye(t, o, s) {
		if (o.image.length !== 6) return;
		let c = I(t, o), l = o.source;
		n.bindTexture(e.TEXTURE_CUBE_MAP, t.__webglTexture, e.TEXTURE0 + s);
		let u = r.get(l);
		if (l.version !== u.__version || c === !0) {
			n.activeTexture(e.TEXTURE0 + s);
			let t = K.getPrimaries(K.workingColorSpace), r = o.colorSpace === "" ? null : K.getPrimaries(o.colorSpace), d = o.colorSpace === "" || t === r ? e.NONE : e.BROWSER_DEFAULT_WEBGL;
			n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, o.flipY), n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL, o.premultiplyAlpha), n.pixelStorei(e.UNPACK_ALIGNMENT, o.unpackAlignment), n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL, d);
			let f = o.isCompressedTexture || o.image[0].isCompressedTexture, p = o.image[0] && o.image[0].isDataTexture, m = [];
			for (let e = 0; e < 6; e++) !f && !p ? m[e] = T(o.image[e], !0, i.maxCubemapSize) : m[e] = p ? o.image[e].image : o.image[e], m[e] = Me(o, m[e]);
			let h = m[0], g = a.convert(o.format, o.colorSpace), _ = a.convert(o.type), v = ee(o.internalFormat, g, _, o.normalized, o.colorSpace), y = o.isVideoTexture !== !0, b = u.__version === void 0 || c === !0, x = l.dataReady, S = A(o, h);
			F(e.TEXTURE_CUBE_MAP, o);
			let C;
			if (f) {
				y && b && n.texStorage2D(e.TEXTURE_CUBE_MAP, S, v, h.width, h.height);
				for (let t = 0; t < 6; t++) {
					C = m[t].mipmaps;
					for (let r = 0; r < C.length; r++) {
						let i = C[r];
						o.format === 1023 ? y ? x && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, 0, 0, i.width, i.height, g, _, i.data) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, v, i.width, i.height, 0, g, _, i.data) : g === null ? B("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()") : y ? x && n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, 0, 0, i.width, i.height, g, i.data) : n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r, v, i.width, i.height, 0, i.data);
					}
				}
			} else {
				if (C = o.mipmaps, y && b) {
					C.length > 0 && S++;
					let t = Ne(m[0]);
					n.texStorage2D(e.TEXTURE_CUBE_MAP, S, v, t.width, t.height);
				}
				for (let t = 0; t < 6; t++) if (p) {
					y ? x && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, 0, 0, m[t].width, m[t].height, g, _, m[t].data) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, v, m[t].width, m[t].height, 0, g, _, m[t].data);
					for (let r = 0; r < C.length; r++) {
						let i = C[r].image[t].image;
						y ? x && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, 0, 0, i.width, i.height, g, _, i.data) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, v, i.width, i.height, 0, g, _, i.data);
					}
				} else {
					y ? x && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, 0, 0, g, _, m[t]) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, 0, v, g, _, m[t]);
					for (let r = 0; r < C.length; r++) {
						let i = C[r];
						y ? x && n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, 0, 0, g, _, i.image[t]) : n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + t, r + 1, v, g, _, i.image[t]);
					}
				}
			}
			E(o) && D(e.TEXTURE_CUBE_MAP), u.__version = l.version, o.onUpdate && o.onUpdate(o);
		}
		t.__version = o.version;
	}
	function be(t, i, o, c, l, u) {
		let d = a.convert(o.format, o.colorSpace), f = a.convert(o.type), p = ee(o.internalFormat, d, f, o.normalized, o.colorSpace), m = r.get(i), h = r.get(o);
		if (h.__renderTarget = i, !m.__hasExternalTextures) {
			let t = Math.max(1, i.width >> u), r = Math.max(1, i.height >> u);
			l === e.TEXTURE_3D || l === e.TEXTURE_2D_ARRAY ? n.texImage3D(l, u, p, t, r, i.depth, 0, d, f, null) : n.texImage2D(l, u, p, t, r, 0, d, f, null);
		}
		n.bindFramebuffer(e.FRAMEBUFFER, t), je(i) ? s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER, c, l, h.__webglTexture, 0, Ae(i)) : (l === e.TEXTURE_2D || l >= e.TEXTURE_CUBE_MAP_POSITIVE_X && l <= e.TEXTURE_CUBE_MAP_NEGATIVE_Z) && e.framebufferTexture2D(e.FRAMEBUFFER, c, l, h.__webglTexture, u), n.bindFramebuffer(e.FRAMEBUFFER, null);
	}
	function xe(t, n, r) {
		if (e.bindRenderbuffer(e.RENDERBUFFER, t), n.depthBuffer) {
			let i = n.depthTexture, a = i && i.isDepthTexture ? i.type : null, o = k(n.stencilBuffer, a), c = n.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT;
			je(n) ? s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER, Ae(n), o, n.width, n.height) : r ? e.renderbufferStorageMultisample(e.RENDERBUFFER, Ae(n), o, n.width, n.height) : e.renderbufferStorage(e.RENDERBUFFER, o, n.width, n.height), e.framebufferRenderbuffer(e.FRAMEBUFFER, c, e.RENDERBUFFER, t);
		} else {
			let t = n.textures;
			for (let i = 0; i < t.length; i++) {
				let o = t[i], c = a.convert(o.format, o.colorSpace), l = a.convert(o.type), u = ee(o.internalFormat, c, l, o.normalized, o.colorSpace);
				je(n) ? s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER, Ae(n), u, n.width, n.height) : r ? e.renderbufferStorageMultisample(e.RENDERBUFFER, Ae(n), u, n.width, n.height) : e.renderbufferStorage(e.RENDERBUFFER, u, n.width, n.height);
			}
		}
		e.bindRenderbuffer(e.RENDERBUFFER, null);
	}
	function Se(t, i, o) {
		let c = i.isWebGLCubeRenderTarget === !0;
		if (n.bindFramebuffer(e.FRAMEBUFFER, t), !(i.depthTexture && i.depthTexture.isDepthTexture)) throw Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");
		let l = r.get(i.depthTexture);
		if (l.__renderTarget = i, (!l.__webglTexture || i.depthTexture.image.width !== i.width || i.depthTexture.image.height !== i.height) && (i.depthTexture.image.width = i.width, i.depthTexture.image.height = i.height, i.depthTexture.needsUpdate = !0), c) {
			if (l.__webglInit === void 0 && (l.__webglInit = !0, i.depthTexture.addEventListener("dispose", j)), l.__webglTexture === void 0) {
				l.__webglTexture = e.createTexture(), n.bindTexture(e.TEXTURE_CUBE_MAP, l.__webglTexture), F(e.TEXTURE_CUBE_MAP, i.depthTexture);
				let t = a.convert(i.depthTexture.format), r = a.convert(i.depthTexture.type), o;
				i.depthTexture.format === 1026 ? o = e.DEPTH_COMPONENT24 : i.depthTexture.format === 1027 && (o = e.DEPTH24_STENCIL8);
				for (let n = 0; n < 6; n++) e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X + n, 0, o, i.width, i.height, 0, t, r, null);
			}
		} else P(i.depthTexture, 0);
		let u = l.__webglTexture, d = Ae(i), f = c ? e.TEXTURE_CUBE_MAP_POSITIVE_X + o : e.TEXTURE_2D, p = i.depthTexture.format === 1027 ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT;
		if (i.depthTexture.format === 1026) je(i) ? s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER, p, f, u, 0, d) : e.framebufferTexture2D(e.FRAMEBUFFER, p, f, u, 0);
		else if (i.depthTexture.format === 1027) je(i) ? s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER, p, f, u, 0, d) : e.framebufferTexture2D(e.FRAMEBUFFER, p, f, u, 0);
		else throw Error("THREE.WebGLTextures: Unknown depthTexture format.");
	}
	function Ce(t) {
		let i = r.get(t), a = t.isWebGLCubeRenderTarget === !0;
		if (i.__boundDepthTexture !== t.depthTexture) {
			let e = t.depthTexture;
			if (i.__depthDisposeCallback && i.__depthDisposeCallback(), e) {
				let t = () => {
					delete i.__boundDepthTexture, delete i.__depthDisposeCallback, e.removeEventListener("dispose", t);
				};
				e.addEventListener("dispose", t), i.__depthDisposeCallback = t;
			}
			i.__boundDepthTexture = e;
		}
		if (t.depthTexture && !i.__autoAllocateDepthBuffer) {
			if (a) for (let e = 0; e < 6; e++) Se(i.__webglFramebuffer[e], t, e);
			else {
				let e = t.texture.mipmaps;
				e && e.length > 0 ? Se(i.__webglFramebuffer[0], t, 0) : Se(i.__webglFramebuffer, t, 0);
			}
		} else if (a) {
			i.__webglDepthbuffer = [];
			for (let r = 0; r < 6; r++) if (n.bindFramebuffer(e.FRAMEBUFFER, i.__webglFramebuffer[r]), i.__webglDepthbuffer[r] === void 0) i.__webglDepthbuffer[r] = e.createRenderbuffer(), xe(i.__webglDepthbuffer[r], t, !1);
			else {
				let n = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT, a = i.__webglDepthbuffer[r];
				e.bindRenderbuffer(e.RENDERBUFFER, a), e.framebufferRenderbuffer(e.FRAMEBUFFER, n, e.RENDERBUFFER, a);
			}
		} else {
			let r = t.texture.mipmaps;
			if (r && r.length > 0 ? n.bindFramebuffer(e.FRAMEBUFFER, i.__webglFramebuffer[0]) : n.bindFramebuffer(e.FRAMEBUFFER, i.__webglFramebuffer), i.__webglDepthbuffer === void 0) i.__webglDepthbuffer = e.createRenderbuffer(), xe(i.__webglDepthbuffer, t, !1);
			else {
				let n = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT, r = i.__webglDepthbuffer;
				e.bindRenderbuffer(e.RENDERBUFFER, r), e.framebufferRenderbuffer(e.FRAMEBUFFER, n, e.RENDERBUFFER, r);
			}
		}
		n.bindFramebuffer(e.FRAMEBUFFER, null);
	}
	function we(t, n, i) {
		let a = r.get(t);
		n !== void 0 && be(a.__webglFramebuffer, t, t.texture, e.COLOR_ATTACHMENT0, e.TEXTURE_2D, 0), i !== void 0 && Ce(t);
	}
	function Te(t) {
		let i = t.texture, s = r.get(t), c = r.get(i);
		t.addEventListener("dispose", M);
		let l = t.textures, u = t.isWebGLCubeRenderTarget === !0, d = l.length > 1;
		if (d || (c.__webglTexture === void 0 && (c.__webglTexture = e.createTexture()), c.__version = i.version, o.memory.textures++), u) {
			s.__webglFramebuffer = [];
			for (let t = 0; t < 6; t++) if (i.mipmaps && i.mipmaps.length > 0) {
				s.__webglFramebuffer[t] = [];
				for (let n = 0; n < i.mipmaps.length; n++) s.__webglFramebuffer[t][n] = e.createFramebuffer();
			} else s.__webglFramebuffer[t] = e.createFramebuffer();
		} else {
			if (i.mipmaps && i.mipmaps.length > 0) {
				s.__webglFramebuffer = [];
				for (let t = 0; t < i.mipmaps.length; t++) s.__webglFramebuffer[t] = e.createFramebuffer();
			} else s.__webglFramebuffer = e.createFramebuffer();
			if (d) for (let t = 0, n = l.length; t < n; t++) {
				let n = r.get(l[t]);
				n.__webglTexture === void 0 && (n.__webglTexture = e.createTexture(), o.memory.textures++);
			}
			if (t.samples > 0 && je(t) === !1) {
				s.__webglMultisampledFramebuffer = e.createFramebuffer(), s.__webglColorRenderbuffer = [], n.bindFramebuffer(e.FRAMEBUFFER, s.__webglMultisampledFramebuffer);
				for (let n = 0; n < l.length; n++) {
					let r = l[n];
					s.__webglColorRenderbuffer[n] = e.createRenderbuffer(), e.bindRenderbuffer(e.RENDERBUFFER, s.__webglColorRenderbuffer[n]);
					let i = a.convert(r.format, r.colorSpace), o = a.convert(r.type), c = ee(r.internalFormat, i, o, r.normalized, r.colorSpace, t.isXRRenderTarget === !0), u = Ae(t);
					e.renderbufferStorageMultisample(e.RENDERBUFFER, u, c, t.width, t.height), e.framebufferRenderbuffer(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0 + n, e.RENDERBUFFER, s.__webglColorRenderbuffer[n]);
				}
				e.bindRenderbuffer(e.RENDERBUFFER, null), t.depthBuffer && (s.__webglDepthRenderbuffer = e.createRenderbuffer(), xe(s.__webglDepthRenderbuffer, t, !0)), n.bindFramebuffer(e.FRAMEBUFFER, null);
			}
		}
		if (u) {
			n.bindTexture(e.TEXTURE_CUBE_MAP, c.__webglTexture), F(e.TEXTURE_CUBE_MAP, i);
			for (let n = 0; n < 6; n++) if (i.mipmaps && i.mipmaps.length > 0) for (let r = 0; r < i.mipmaps.length; r++) be(s.__webglFramebuffer[n][r], t, i, e.COLOR_ATTACHMENT0, e.TEXTURE_CUBE_MAP_POSITIVE_X + n, r);
			else be(s.__webglFramebuffer[n], t, i, e.COLOR_ATTACHMENT0, e.TEXTURE_CUBE_MAP_POSITIVE_X + n, 0);
			E(i) && D(e.TEXTURE_CUBE_MAP), n.unbindTexture();
		} else if (d) {
			for (let i = 0, a = l.length; i < a; i++) {
				let a = l[i], o = r.get(a), c = e.TEXTURE_2D;
				(t.isWebGL3DRenderTarget || t.isWebGLArrayRenderTarget) && (c = t.isWebGL3DRenderTarget ? e.TEXTURE_3D : e.TEXTURE_2D_ARRAY), n.bindTexture(c, o.__webglTexture), F(c, a), be(s.__webglFramebuffer, t, a, e.COLOR_ATTACHMENT0 + i, c, 0), E(a) && D(c);
			}
			n.unbindTexture();
		} else {
			let r = e.TEXTURE_2D;
			if ((t.isWebGL3DRenderTarget || t.isWebGLArrayRenderTarget) && (r = t.isWebGL3DRenderTarget ? e.TEXTURE_3D : e.TEXTURE_2D_ARRAY), n.bindTexture(r, c.__webglTexture), F(r, i), i.mipmaps && i.mipmaps.length > 0) for (let n = 0; n < i.mipmaps.length; n++) be(s.__webglFramebuffer[n], t, i, e.COLOR_ATTACHMENT0, r, n);
			else be(s.__webglFramebuffer, t, i, e.COLOR_ATTACHMENT0, r, 0);
			E(i) && D(r), n.unbindTexture();
		}
		t.depthBuffer && Ce(t);
	}
	function Ee(e) {
		let t = e.textures;
		for (let i = 0, a = t.length; i < a; i++) {
			let a = t[i];
			if (E(a)) {
				let t = O(e), i = r.get(a).__webglTexture;
				n.bindTexture(t, i), D(t), n.unbindTexture();
			}
		}
	}
	let De = [], Oe = [];
	function ke(t) {
		if (t.samples > 0) {
			if (je(t) === !1) {
				let i = t.textures, a = t.width, o = t.height, s = e.COLOR_BUFFER_BIT, l = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT, u = r.get(t), d = i.length > 1;
				if (d) for (let t = 0; t < i.length; t++) n.bindFramebuffer(e.FRAMEBUFFER, u.__webglMultisampledFramebuffer), e.framebufferRenderbuffer(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.RENDERBUFFER, null), n.bindFramebuffer(e.FRAMEBUFFER, u.__webglFramebuffer), e.framebufferTexture2D(e.DRAW_FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.TEXTURE_2D, null, 0);
				n.bindFramebuffer(e.READ_FRAMEBUFFER, u.__webglMultisampledFramebuffer);
				let f = t.texture.mipmaps;
				f && f.length > 0 ? n.bindFramebuffer(e.DRAW_FRAMEBUFFER, u.__webglFramebuffer[0]) : n.bindFramebuffer(e.DRAW_FRAMEBUFFER, u.__webglFramebuffer);
				for (let n = 0; n < i.length; n++) {
					if (t.resolveDepthBuffer && (t.depthBuffer && (s |= e.DEPTH_BUFFER_BIT), t.stencilBuffer && t.resolveStencilBuffer && (s |= e.STENCIL_BUFFER_BIT)), d) {
						e.framebufferRenderbuffer(e.READ_FRAMEBUFFER, e.COLOR_ATTACHMENT0, e.RENDERBUFFER, u.__webglColorRenderbuffer[n]);
						let t = r.get(i[n]).__webglTexture;
						e.framebufferTexture2D(e.DRAW_FRAMEBUFFER, e.COLOR_ATTACHMENT0, e.TEXTURE_2D, t, 0);
					}
					e.blitFramebuffer(0, 0, a, o, 0, 0, a, o, s, e.NEAREST), c === !0 && (De.length = 0, Oe.length = 0, De.push(e.COLOR_ATTACHMENT0 + n), t.depthBuffer && t.storeMultisampledDepthBuffer === !1 && (De.push(l), Oe.push(l), e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER, Oe)), e.invalidateFramebuffer(e.READ_FRAMEBUFFER, De));
				}
				if (n.bindFramebuffer(e.READ_FRAMEBUFFER, null), n.bindFramebuffer(e.DRAW_FRAMEBUFFER, null), d) for (let t = 0; t < i.length; t++) {
					n.bindFramebuffer(e.FRAMEBUFFER, u.__webglMultisampledFramebuffer), e.framebufferRenderbuffer(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.RENDERBUFFER, u.__webglColorRenderbuffer[t]);
					let a = r.get(i[t]).__webglTexture;
					n.bindFramebuffer(e.FRAMEBUFFER, u.__webglFramebuffer), e.framebufferTexture2D(e.DRAW_FRAMEBUFFER, e.COLOR_ATTACHMENT0 + t, e.TEXTURE_2D, a, 0);
				}
				n.bindFramebuffer(e.DRAW_FRAMEBUFFER, u.__webglMultisampledFramebuffer);
			} else if (t.depthBuffer && t.storeMultisampledDepthBuffer === !1 && c) {
				let n = t.stencilBuffer ? e.DEPTH_STENCIL_ATTACHMENT : e.DEPTH_ATTACHMENT;
				e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER, [n]);
			}
		}
	}
	function Ae(e) {
		return Math.min(i.maxSamples, e.samples);
	}
	function je(e) {
		let n = r.get(e);
		return e.samples > 0 && t.has("WEBGL_multisampled_render_to_texture") === !0 && n.__useRenderToTexture !== !1;
	}
	function L(e) {
		let t = o.render.frame;
		u.get(e) !== t && (u.set(e, t), e.update());
	}
	function Me(e, t) {
		let n = e.colorSpace, r = e.format, i = e.type;
		return e.isCompressedTexture === !0 || e.isVideoTexture === !0 || n !== "srgb-linear" && n !== "" && (K.getTransfer(n) === "srgb" ? (r !== 1023 || i !== 1009) && B("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.") : V("WebGLTextures: Unsupported texture color space:", n)), t;
	}
	function Ne(e) {
		return typeof HTMLImageElement < "u" && e instanceof HTMLImageElement ? (l.width = e.naturalWidth || e.width, l.height = e.naturalHeight || e.height) : typeof VideoFrame < "u" && e instanceof VideoFrame ? (l.width = e.displayWidth, l.height = e.displayHeight) : (l.width = e.width, l.height = e.height), l;
	}
	this.allocateTextureUnit = ce, this.resetTextureUnits = ae, this.getTextureUnits = oe, this.setTextureUnits = se, this.setTexture2D = P, this.setTexture2DArray = ue, this.setTexture3D = de, this.setTextureCube = fe, this.rebindTextures = we, this.setupRenderTarget = Te, this.updateRenderTargetMipmap = Ee, this.updateMultisampleRenderTarget = ke, this.setupDepthRenderbuffer = Ce, this.setupFrameBufferTexture = be, this.useMultisampledRTT = je, this.isReversedDepthBuffer = function() {
		return n.buffers.depth.getReversed();
	};
}
function Uc(e, t) {
	function n(n, r = "") {
		let i, a = K.getTransfer(r);
		if (n === 1009) return e.UNSIGNED_BYTE;
		if (n === 1017) return e.UNSIGNED_SHORT_4_4_4_4;
		if (n === 1018) return e.UNSIGNED_SHORT_5_5_5_1;
		if (n === 35902) return e.UNSIGNED_INT_5_9_9_9_REV;
		if (n === 35899) return e.UNSIGNED_INT_10F_11F_11F_REV;
		if (n === 1010) return e.BYTE;
		if (n === 1011) return e.SHORT;
		if (n === 1012) return e.UNSIGNED_SHORT;
		if (n === 1013) return e.INT;
		if (n === 1014) return e.UNSIGNED_INT;
		if (n === 1015) return e.FLOAT;
		if (n === 1016) return e.HALF_FLOAT;
		if (n === 1021) return e.ALPHA;
		if (n === 1022) return e.RGB;
		if (n === 1023) return e.RGBA;
		if (n === 1026) return e.DEPTH_COMPONENT;
		if (n === 1027) return e.DEPTH_STENCIL;
		if (n === 1028) return e.RED;
		if (n === 1029) return e.RED_INTEGER;
		if (n === 1030) return e.RG;
		if (n === 1031) return e.RG_INTEGER;
		if (n === 1033) return e.RGBA_INTEGER;
		if (n === 33776 || n === 33777 || n === 33778 || n === 33779) {
			if (a === "srgb") {
				if (i = t.get("WEBGL_compressed_texture_s3tc_srgb"), i !== null) {
					if (n === 33776) return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;
					if (n === 33777) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
					if (n === 33778) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
					if (n === 33779) return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
				} else return null;
			} else if (i = t.get("WEBGL_compressed_texture_s3tc"), i !== null) {
				if (n === 33776) return i.COMPRESSED_RGB_S3TC_DXT1_EXT;
				if (n === 33777) return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;
				if (n === 33778) return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;
				if (n === 33779) return i.COMPRESSED_RGBA_S3TC_DXT5_EXT;
			} else return null;
		}
		if (n === 35840 || n === 35841 || n === 35842 || n === 35843) {
			if (i = t.get("WEBGL_compressed_texture_pvrtc"), i !== null) {
				if (n === 35840) return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
				if (n === 35841) return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
				if (n === 35842) return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
				if (n === 35843) return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
			} else return null;
		}
		if (n === 36196 || n === 37492 || n === 37496 || n === 37488 || n === 37489 || n === 37490 || n === 37491) {
			if (i = t.get("WEBGL_compressed_texture_etc"), i !== null) {
				if (n === 36196 || n === 37492) return a === "srgb" ? i.COMPRESSED_SRGB8_ETC2 : i.COMPRESSED_RGB8_ETC2;
				if (n === 37496) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : i.COMPRESSED_RGBA8_ETC2_EAC;
				if (n === 37488) return i.COMPRESSED_R11_EAC;
				if (n === 37489) return i.COMPRESSED_SIGNED_R11_EAC;
				if (n === 37490) return i.COMPRESSED_RG11_EAC;
				if (n === 37491) return i.COMPRESSED_SIGNED_RG11_EAC;
			} else return null;
		}
		if (n === 37808 || n === 37809 || n === 37810 || n === 37811 || n === 37812 || n === 37813 || n === 37814 || n === 37815 || n === 37816 || n === 37817 || n === 37818 || n === 37819 || n === 37820 || n === 37821) {
			if (i = t.get("WEBGL_compressed_texture_astc"), i !== null) {
				if (n === 37808) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : i.COMPRESSED_RGBA_ASTC_4x4_KHR;
				if (n === 37809) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : i.COMPRESSED_RGBA_ASTC_5x4_KHR;
				if (n === 37810) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : i.COMPRESSED_RGBA_ASTC_5x5_KHR;
				if (n === 37811) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : i.COMPRESSED_RGBA_ASTC_6x5_KHR;
				if (n === 37812) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : i.COMPRESSED_RGBA_ASTC_6x6_KHR;
				if (n === 37813) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : i.COMPRESSED_RGBA_ASTC_8x5_KHR;
				if (n === 37814) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : i.COMPRESSED_RGBA_ASTC_8x6_KHR;
				if (n === 37815) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : i.COMPRESSED_RGBA_ASTC_8x8_KHR;
				if (n === 37816) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : i.COMPRESSED_RGBA_ASTC_10x5_KHR;
				if (n === 37817) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : i.COMPRESSED_RGBA_ASTC_10x6_KHR;
				if (n === 37818) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : i.COMPRESSED_RGBA_ASTC_10x8_KHR;
				if (n === 37819) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : i.COMPRESSED_RGBA_ASTC_10x10_KHR;
				if (n === 37820) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : i.COMPRESSED_RGBA_ASTC_12x10_KHR;
				if (n === 37821) return a === "srgb" ? i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : i.COMPRESSED_RGBA_ASTC_12x12_KHR;
			} else return null;
		}
		if (n === 36492 || n === 36494 || n === 36495) {
			if (i = t.get("EXT_texture_compression_bptc"), i !== null) {
				if (n === 36492) return a === "srgb" ? i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : i.COMPRESSED_RGBA_BPTC_UNORM_EXT;
				if (n === 36494) return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
				if (n === 36495) return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
			} else return null;
		}
		if (n === 36283 || n === 36284 || n === 36285 || n === 36286) {
			if (i = t.get("EXT_texture_compression_rgtc"), i !== null) {
				if (n === 36283) return i.COMPRESSED_RED_RGTC1_EXT;
				if (n === 36284) return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;
				if (n === 36285) return i.COMPRESSED_RED_GREEN_RGTC2_EXT;
				if (n === 36286) return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
			} else return null;
		}
		return n === 1020 ? e.UNSIGNED_INT_24_8 : e[n] === void 0 ? null : e[n];
	}
	return { convert: n };
}
var Wc = "\nvoid main() {\n\n	gl_Position = vec4( position, 1.0 );\n\n}", Gc = "\nuniform sampler2DArray depthColor;\nuniform float depthWidth;\nuniform float depthHeight;\n\nvoid main() {\n\n	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );\n\n	if ( coord.x >= 1.0 ) {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;\n\n	} else {\n\n		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;\n\n	}\n\n}", Kc = class {
	constructor() {
		this.texture = null, this.mesh = null, this.depthNear = 0, this.depthFar = 0;
	}
	init(e, t) {
		if (this.texture === null) {
			let n = new vi(e.texture);
			(e.depthNear !== t.depthNear || e.depthFar !== t.depthFar) && (this.depthNear = e.depthNear, this.depthFar = e.depthFar), this.texture = n;
		}
	}
	getMesh(e) {
		if (this.texture !== null && this.mesh === null) {
			let t = e.cameras[0].viewport, n = new Ni({
				vertexShader: Wc,
				fragmentShader: Gc,
				uniforms: {
					depthColor: { value: this.texture },
					depthWidth: { value: t.z },
					depthHeight: { value: t.w }
				}
			});
			this.mesh = new oi(new Si(20, 20), n);
		}
		return this.mesh;
	}
	reset() {
		this.texture = null, this.mesh = null;
	}
	getDepthTexture() {
		return this.texture;
	}
}, qc = class extends ut {
	constructor(e, t) {
		super();
		let n = this, r = null, i = 1, a = null, o = "local-floor", s = 1, c = null, l = null, u = null, d = null, f = null, p = null, m = typeof XRWebGLBinding < "u", h = new Kc(), g = {}, _ = t.getContextAttributes(), v = null, y = null, x = [], S = [], C = new U(), w = null, E = null, D = new ma();
		D.viewport = new It();
		let O = new ma();
		O.viewport = new It();
		let ee = [D, O], A = new wa(), j = null, M = null;
		this.cameraAutoUpdate = !0, this.enabled = !1, this.isPresenting = !1, this.getController = function(e) {
			let t = x[e];
			return t === void 0 && (t = new _n(), x[e] = t), t.getTargetRaySpace();
		}, this.getControllerGrip = function(e) {
			let t = x[e];
			return t === void 0 && (t = new _n(), x[e] = t), t.getGripSpace();
		}, this.getHand = function(e) {
			let t = x[e];
			return t === void 0 && (t = new _n(), x[e] = t), t.getHandSpace();
		};
		function te(e) {
			let t = S.indexOf(e.inputSource);
			if (t === -1) return;
			let n = x[t];
			n !== void 0 && (n.update(e.inputSource, e.frame, c || a), n.dispatchEvent({
				type: e.type,
				data: e.inputSource
			}));
		}
		function ie() {
			r.removeEventListener("select", te), r.removeEventListener("selectstart", te), r.removeEventListener("selectend", te), r.removeEventListener("squeeze", te), r.removeEventListener("squeezestart", te), r.removeEventListener("squeezeend", te), r.removeEventListener("end", ie), r.removeEventListener("inputsourceschange", ae);
			for (let e = 0; e < x.length; e++) {
				let t = S[e];
				t !== null && (S[e] = null, x[e].disconnect(t));
			}
			j = null, M = null, h.reset();
			for (let e in g) delete g[e];
			if (e.setRenderTarget(v), f = null, d = null, u = null, r = null, y = null, fe.stop(), n.isPresenting = !1, e.setPixelRatio(w), e.setSize(C.width, C.height, !1), E !== null) {
				let e = E.camera;
				e.fov = E.fov, e.zoom = E.zoom, e.updateProjectionMatrix(), E = null;
			}
			n.dispatchEvent({ type: "sessionend" });
		}
		this.setFramebufferScaleFactor = function(e) {
			i = e, n.isPresenting === !0 && B("WebXRManager: Cannot change framebuffer scale while presenting.");
		}, this.setReferenceSpaceType = function(e) {
			o = e, n.isPresenting === !0 && B("WebXRManager: Cannot change reference space type while presenting.");
		}, this.getReferenceSpace = function() {
			return c || a;
		}, this.setReferenceSpace = function(e) {
			c = e;
		}, this.getBaseLayer = function() {
			return d === null ? f : d;
		}, this.getBinding = function() {
			return u === null && m && (u = new XRWebGLBinding(r, t)), u;
		}, this.getFrame = function() {
			return p;
		}, this.getSession = function() {
			return r;
		}, this.setSession = async function(l) {
			if (r = l, r !== null) {
				if (v = e.getRenderTarget(), r.addEventListener("select", te), r.addEventListener("selectstart", te), r.addEventListener("selectend", te), r.addEventListener("squeeze", te), r.addEventListener("squeezestart", te), r.addEventListener("squeezeend", te), r.addEventListener("end", ie), r.addEventListener("inputsourceschange", ae), _.xrCompatible !== !0 && await t.makeXRCompatible(), w = e.getPixelRatio(), e.getSize(C), m && "createProjectionLayer" in XRWebGLBinding.prototype) {
					let n = null, a = null, o = null;
					_.depth && (o = _.stencil ? t.DEPTH24_STENCIL8 : t.DEPTH_COMPONENT24, n = _.stencil ? re : ne, a = _.stencil ? k : T);
					let s = {
						colorFormat: t.RGBA8,
						depthFormat: o,
						scaleFactor: i
					};
					u = this.getBinding(), d = u.createProjectionLayer(s), r.updateRenderState({ layers: [d] }), e.setPixelRatio(1), e.setSize(d.textureWidth, d.textureHeight, !1), y = new q(d.textureWidth, d.textureHeight, {
						format: N,
						type: b,
						depthTexture: new gi(d.textureWidth, d.textureHeight, a, void 0, void 0, void 0, void 0, void 0, void 0, n),
						stencilBuffer: _.stencil,
						colorSpace: e.outputColorSpace,
						samples: _.antialias ? 4 : 0,
						resolveDepthBuffer: d.ignoreDepthValues === !1,
						resolveStencilBuffer: d.ignoreDepthValues === !1,
						storeMultisampledDepthBuffer: d.ignoreDepthValues === !1,
						storeMultisampledStencilBuffer: d.ignoreDepthValues === !1
					});
				} else {
					let n = {
						antialias: _.antialias,
						alpha: !0,
						depth: _.depth,
						stencil: _.stencil,
						framebufferScaleFactor: i
					};
					f = new XRWebGLLayer(r, t, n), r.updateRenderState({ baseLayer: f }), e.setPixelRatio(1), e.setSize(f.framebufferWidth, f.framebufferHeight, !1), y = new q(f.framebufferWidth, f.framebufferHeight, {
						format: N,
						type: b,
						colorSpace: e.outputColorSpace,
						stencilBuffer: _.stencil,
						resolveDepthBuffer: f.ignoreDepthValues === !1,
						resolveStencilBuffer: f.ignoreDepthValues === !1,
						storeMultisampledDepthBuffer: f.ignoreDepthValues === !1,
						storeMultisampledStencilBuffer: f.ignoreDepthValues === !1
					});
				}
				y.isXRRenderTarget = !0, this.setFoveation(s), c = null, a = await r.requestReferenceSpace(o), fe.setContext(r), fe.start(), n.isPresenting = !0, n.dispatchEvent({ type: "sessionstart" });
			}
		}, this.getEnvironmentBlendMode = function() {
			if (r !== null) return r.environmentBlendMode;
		}, this.getDepthTexture = function() {
			return h.getDepthTexture();
		};
		function ae(e) {
			for (let t = 0; t < e.removed.length; t++) {
				let n = e.removed[t], r = S.indexOf(n);
				r >= 0 && (S[r] = null, x[r].disconnect(n));
			}
			for (let t = 0; t < e.added.length; t++) {
				let n = e.added[t], r = S.indexOf(n);
				if (r === -1) {
					for (let e = 0; e < x.length; e++) if (e >= S.length) {
						S.push(n), r = e;
						break;
					} else if (S[e] === null) {
						S[e] = n, r = e;
						break;
					}
					if (r === -1) break;
				}
				let i = x[r];
				i && i.connect(n);
			}
		}
		let oe = new W(), se = new W();
		function ce(e, t, n) {
			oe.setFromMatrixPosition(t.matrixWorld), se.setFromMatrixPosition(n.matrixWorld);
			let r = oe.distanceTo(se), i = t.projectionMatrix.elements, a = n.projectionMatrix.elements, o = i[14] / (i[10] - 1), s = i[14] / (i[10] + 1), c = (i[9] + 1) / i[5], l = (i[9] - 1) / i[5], u = (i[8] - 1) / i[0], d = (a[8] + 1) / a[0], f = o * u, p = o * d, m = r / (-u + d), h = m * -u;
			if (t.matrixWorld.decompose(e.position, e.quaternion, e.scale), e.translateX(h), e.translateZ(m), e.matrixWorld.compose(e.position, e.quaternion, e.scale), e.matrixWorldInverse.copy(e.matrixWorld).invert(), i[10] === -1) e.projectionMatrix.copy(t.projectionMatrix), e.projectionMatrixInverse.copy(t.projectionMatrixInverse);
			else {
				let t = o + m, n = s + m, i = f - h, a = p + (r - h), u = c * s / n * t, d = l * s / n * t;
				e.projectionMatrix.makePerspective(i, a, u, d, t, n), e.projectionMatrixInverse.copy(e.projectionMatrix).invert();
			}
		}
		function le(e, t) {
			t === null ? e.matrixWorld.copy(e.matrix) : e.matrixWorld.multiplyMatrices(t.matrixWorld, e.matrix), e.matrixWorldInverse.copy(e.matrixWorld).invert();
		}
		this.updateCamera = function(e) {
			if (r === null) return;
			let t = e.near, n = e.far;
			h.texture !== null && (h.depthNear > 0 && (t = h.depthNear), h.depthFar > 0 && (n = h.depthFar)), A.near = O.near = D.near = t, A.far = O.far = D.far = n, (j !== A.near || M !== A.far) && (r.updateRenderState({
				depthNear: A.near,
				depthFar: A.far
			}), j = A.near, M = A.far), A.layers.mask = e.layers.mask | 6, D.layers.mask = A.layers.mask & -5, O.layers.mask = A.layers.mask & -3;
			let i = e.parent, a = A.cameras;
			le(A, i);
			for (let e = 0; e < a.length; e++) le(a[e], i);
			a.length === 2 ? ce(A, D, O) : A.projectionMatrix.copy(D.projectionMatrix), E === null && e.isPerspectiveCamera && (E = {
				camera: e,
				fov: e.fov,
				zoom: e.zoom
			}), P(e, A, i);
		};
		function P(e, t, n) {
			n === null ? e.matrix.copy(t.matrixWorld) : (e.matrix.copy(n.matrixWorld), e.matrix.invert(), e.matrix.multiply(t.matrixWorld)), e.matrix.decompose(e.position, e.quaternion, e.scale), e.updateMatrixWorld(!0), e.projectionMatrix.copy(t.projectionMatrix), e.projectionMatrixInverse.copy(t.projectionMatrixInverse), e.isPerspectiveCamera && (e.fov = pt * 2 * Math.atan(1 / e.projectionMatrix.elements[5]), e.zoom = 1);
		}
		this.getCamera = function() {
			return A;
		}, this.getFoveation = function() {
			if (d !== null || f !== null) return s;
		}, this.setFoveation = function(e) {
			s = e, d !== null && (d.fixedFoveation = e), f !== null && f.fixedFoveation !== void 0 && (f.fixedFoveation = e);
		}, this.hasDepthSensing = function() {
			return h.texture !== null;
		}, this.getDepthSensingMesh = function() {
			return h.getMesh(A);
		}, this.getCameraTexture = function(e) {
			return g[e];
		};
		let ue = null;
		function de(t, i) {
			if (l = i.getViewerPose(c || a), p = i, l !== null) {
				let t = l.views;
				f !== null && (e.setRenderTargetFramebuffer(y, f.framebuffer), e.setRenderTarget(y));
				let i = !1;
				t.length !== A.cameras.length && (A.cameras.length = 0, i = !0);
				for (let n = 0; n < t.length; n++) {
					let r = t[n], a = null;
					if (f !== null) a = f.getViewport(r);
					else {
						let t = u.getViewSubImage(d, r);
						a = t.viewport, n === 0 && (e.setRenderTargetTextures(y, t.colorTexture, t.depthStencilTexture), e.setRenderTarget(y));
					}
					let o = ee[n];
					o === void 0 && (o = new ma(), o.layers.enable(n), o.viewport = new It(), ee[n] = o), o.matrix.fromArray(r.transform.matrix), o.matrix.decompose(o.position, o.quaternion, o.scale), o.projectionMatrix.fromArray(r.projectionMatrix), o.projectionMatrixInverse.copy(o.projectionMatrix).invert(), o.viewport.set(a.x, a.y, a.width, a.height), n === 0 && (A.matrix.copy(o.matrix), A.matrix.decompose(A.position, A.quaternion, A.scale)), i === !0 && A.cameras.push(o);
				}
				let a = r.enabledFeatures;
				if (a && a.includes("depth-sensing") && r.depthUsage == "gpu-optimized" && m) {
					u = n.getBinding();
					let e = u.getDepthInformation(t[0]);
					e && e.isValid && e.texture && h.init(e, r.renderState);
				}
				if (a && a.includes("camera-access") && m) {
					e.state.unbindTexture(), u = n.getBinding();
					for (let e = 0; e < t.length; e++) {
						let n = t[e].camera;
						if (n) {
							let e = g[n];
							e || (e = new vi(), g[n] = e);
							let t = u.getCameraImage(n);
							e.sourceTexture = t;
						}
					}
				}
			}
			for (let e = 0; e < x.length; e++) {
				let t = S[e], n = x[e];
				t !== null && n !== void 0 && n.update(t, i, c || a);
			}
			ue && ue(t, i), i.detectedPlanes && n.dispatchEvent({
				type: "planesdetected",
				data: i
			}), p = null;
		}
		let fe = new za();
		fe.setAnimationLoop(de), this.setAnimationLoop = function(e) {
			ue = e;
		}, this.dispose = function() {};
	}
}, Jc = /*@__PURE__*/ new Bt(), Yc = /*@__PURE__*/ new G();
Yc.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
function Xc(e, t) {
	function n(e, t) {
		e.matrixAutoUpdate === !0 && e.updateMatrix(), t.value.copy(e.matrix);
	}
	function r(t, n) {
		n.color.getRGB(t.fogColor.value, ki(e)), n.isFog ? (t.fogNear.value = n.near, t.fogFar.value = n.far) : n.isFogExp2 && (t.fogDensity.value = n.density);
	}
	function i(e, t, n, r, i) {
		t.isNodeMaterial ? t.uniformsNeedUpdate = !1 : t.isMeshBasicMaterial ? a(e, t) : t.isMeshLambertMaterial ? (a(e, t), t.envMap && (e.envMapIntensity.value = t.envMapIntensity)) : t.isMeshToonMaterial ? (a(e, t), d(e, t)) : t.isMeshPhongMaterial ? (a(e, t), u(e, t), t.envMap && (e.envMapIntensity.value = t.envMapIntensity)) : t.isMeshStandardMaterial ? (a(e, t), f(e, t), t.isMeshPhysicalMaterial && p(e, t, i)) : t.isMeshMatcapMaterial ? (a(e, t), m(e, t)) : t.isMeshDepthMaterial ? a(e, t) : t.isMeshDistanceMaterial ? (a(e, t), h(e, t)) : t.isMeshNormalMaterial ? a(e, t) : t.isLineBasicMaterial ? (o(e, t), t.isLineDashedMaterial && s(e, t)) : t.isPointsMaterial ? c(e, t, n, r) : t.isSpriteMaterial ? l(e, t) : t.isShadowMaterial ? (e.color.value.copy(t.color), e.opacity.value = t.opacity) : t.isShaderMaterial && (t.uniformsNeedUpdate = !1);
	}
	function a(e, r) {
		e.opacity.value = r.opacity, r.color && e.diffuse.value.copy(r.color), r.emissive && e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity), r.map && (e.map.value = r.map, n(r.map, e.mapTransform)), r.alphaMap && (e.alphaMap.value = r.alphaMap, n(r.alphaMap, e.alphaMapTransform)), r.bumpMap && (e.bumpMap.value = r.bumpMap, n(r.bumpMap, e.bumpMapTransform), e.bumpScale.value = r.bumpScale, r.side === 1 && (e.bumpScale.value *= -1)), r.normalMap && (e.normalMap.value = r.normalMap, n(r.normalMap, e.normalMapTransform), e.normalScale.value.copy(r.normalScale), r.side === 1 && e.normalScale.value.negate()), r.displacementMap && (e.displacementMap.value = r.displacementMap, n(r.displacementMap, e.displacementMapTransform), e.displacementScale.value = r.displacementScale, e.displacementBias.value = r.displacementBias), r.emissiveMap && (e.emissiveMap.value = r.emissiveMap, n(r.emissiveMap, e.emissiveMapTransform)), r.specularMap && (e.specularMap.value = r.specularMap, n(r.specularMap, e.specularMapTransform)), r.alphaTest > 0 && (e.alphaTest.value = r.alphaTest);
		let i = t.get(r), a = i.envMap, o = i.envMapRotation;
		a && (e.envMap.value = a, e.envMapRotation.value.setFromMatrix4(Jc.makeRotationFromEuler(o)).transpose(), a.isCubeTexture && a.isRenderTargetTexture === !1 && e.envMapRotation.value.premultiply(Yc), e.reflectivity.value = r.reflectivity, e.ior.value = r.ior, e.refractionRatio.value = r.refractionRatio), r.lightMap && (e.lightMap.value = r.lightMap, e.lightMapIntensity.value = r.lightMapIntensity, n(r.lightMap, e.lightMapTransform)), r.aoMap && (e.aoMap.value = r.aoMap, e.aoMapIntensity.value = r.aoMapIntensity, n(r.aoMap, e.aoMapTransform));
	}
	function o(e, t) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, t.map && (e.map.value = t.map, n(t.map, e.mapTransform));
	}
	function s(e, t) {
		e.dashSize.value = t.dashSize, e.totalSize.value = t.dashSize + t.gapSize, e.scale.value = t.scale;
	}
	function c(e, t, r, i) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, e.size.value = t.size * r, e.scale.value = i * .5, t.map && (e.map.value = t.map, n(t.map, e.uvTransform)), t.alphaMap && (e.alphaMap.value = t.alphaMap, n(t.alphaMap, e.alphaMapTransform)), t.alphaTest > 0 && (e.alphaTest.value = t.alphaTest);
	}
	function l(e, t) {
		e.diffuse.value.copy(t.color), e.opacity.value = t.opacity, e.rotation.value = t.rotation, t.map && (e.map.value = t.map, n(t.map, e.mapTransform)), t.alphaMap && (e.alphaMap.value = t.alphaMap, n(t.alphaMap, e.alphaMapTransform)), t.alphaTest > 0 && (e.alphaTest.value = t.alphaTest);
	}
	function u(e, t) {
		e.specular.value.copy(t.specular), e.shininess.value = Math.max(t.shininess, 1e-4);
	}
	function d(e, t) {
		t.gradientMap && (e.gradientMap.value = t.gradientMap);
	}
	function f(e, t) {
		e.metalness.value = t.metalness, t.metalnessMap && (e.metalnessMap.value = t.metalnessMap, n(t.metalnessMap, e.metalnessMapTransform)), e.roughness.value = t.roughness, t.roughnessMap && (e.roughnessMap.value = t.roughnessMap, n(t.roughnessMap, e.roughnessMapTransform)), t.envMap && (e.envMapIntensity.value = t.envMapIntensity);
	}
	function p(e, t, r) {
		e.ior.value = t.ior, t.sheen > 0 && (e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen), e.sheenRoughness.value = t.sheenRoughness, t.sheenColorMap && (e.sheenColorMap.value = t.sheenColorMap, n(t.sheenColorMap, e.sheenColorMapTransform)), t.sheenRoughnessMap && (e.sheenRoughnessMap.value = t.sheenRoughnessMap, n(t.sheenRoughnessMap, e.sheenRoughnessMapTransform))), t.clearcoat > 0 && (e.clearcoat.value = t.clearcoat, e.clearcoatRoughness.value = t.clearcoatRoughness, t.clearcoatMap && (e.clearcoatMap.value = t.clearcoatMap, n(t.clearcoatMap, e.clearcoatMapTransform)), t.clearcoatRoughnessMap && (e.clearcoatRoughnessMap.value = t.clearcoatRoughnessMap, n(t.clearcoatRoughnessMap, e.clearcoatRoughnessMapTransform)), t.clearcoatNormalMap && (e.clearcoatNormalMap.value = t.clearcoatNormalMap, n(t.clearcoatNormalMap, e.clearcoatNormalMapTransform), e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale), t.side === 1 && e.clearcoatNormalScale.value.negate())), t.dispersion > 0 && (e.dispersion.value = t.dispersion), t.retroreflectivity > 0 && (e.retroreflectivity.value = t.retroreflectivity), t.iridescence > 0 && (e.iridescence.value = t.iridescence, e.iridescenceIOR.value = t.iridescenceIOR, e.iridescenceThicknessMinimum.value = t.iridescenceThicknessRange[0], e.iridescenceThicknessMaximum.value = t.iridescenceThicknessRange[1], t.iridescenceMap && (e.iridescenceMap.value = t.iridescenceMap, n(t.iridescenceMap, e.iridescenceMapTransform)), t.iridescenceThicknessMap && (e.iridescenceThicknessMap.value = t.iridescenceThicknessMap, n(t.iridescenceThicknessMap, e.iridescenceThicknessMapTransform))), t.transmission > 0 && (e.transmission.value = t.transmission, e.transmissionSamplerMap.value = r.texture, e.transmissionSamplerSize.value.set(r.width, r.height), t.transmissionMap && (e.transmissionMap.value = t.transmissionMap, n(t.transmissionMap, e.transmissionMapTransform)), e.thickness.value = t.thickness, t.thicknessMap && (e.thicknessMap.value = t.thicknessMap, n(t.thicknessMap, e.thicknessMapTransform)), e.attenuationDistance.value = t.attenuationDistance, e.attenuationColor.value.copy(t.attenuationColor)), t.anisotropy > 0 && (e.anisotropyVector.value.set(t.anisotropy * Math.cos(t.anisotropyRotation), t.anisotropy * Math.sin(t.anisotropyRotation)), t.anisotropyMap && (e.anisotropyMap.value = t.anisotropyMap, n(t.anisotropyMap, e.anisotropyMapTransform))), e.specularIntensity.value = t.specularIntensity, e.specularColor.value.copy(t.specularColor), t.specularColorMap && (e.specularColorMap.value = t.specularColorMap, n(t.specularColorMap, e.specularColorMapTransform)), t.specularIntensityMap && (e.specularIntensityMap.value = t.specularIntensityMap, n(t.specularIntensityMap, e.specularIntensityMapTransform));
	}
	function m(e, t) {
		t.matcap && (e.matcap.value = t.matcap);
	}
	function h(e, n) {
		let r = t.get(n).light;
		e.referencePosition.value.setFromMatrixPosition(r.matrixWorld), e.nearDistance.value = r.shadow.camera.near, e.farDistance.value = r.shadow.camera.far;
	}
	return {
		refreshFogUniforms: r,
		refreshMaterialUniforms: i
	};
}
function Zc(e, t, n, r) {
	let i = {}, a = {}, o = [], s = e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);
	function c(e, t) {
		let n = t.program;
		r.uniformBlockBinding(e, n);
	}
	function l(e, n) {
		let o = i[e.id];
		o === void 0 && (g(e), o = u(e), i[e.id] = o, e.addEventListener("dispose", v));
		let s = n.program;
		r.updateUBOMapping(e, s);
		let c = t.render.frame;
		a[e.id] !== c && (f(e), a[e.id] = c);
	}
	function u(t) {
		let n = d();
		t.__bindingPointIndex = n;
		let r = e.createBuffer(), i = t.__size, a = t.usage;
		return e.bindBuffer(e.UNIFORM_BUFFER, r), e.bufferData(e.UNIFORM_BUFFER, i, a), e.bindBuffer(e.UNIFORM_BUFFER, null), e.bindBufferBase(e.UNIFORM_BUFFER, n, r), r;
	}
	function d() {
		for (let e = 0; e < s; e++) if (o.indexOf(e) === -1) return o.push(e), e;
		return V("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."), 0;
	}
	function f(t) {
		let n = i[t.id], r = t.uniforms, a = t.__cache;
		e.bindBuffer(e.UNIFORM_BUFFER, n);
		for (let e = 0, t = r.length; e < t; e++) {
			let t = r[e];
			if (Array.isArray(t)) for (let n = 0, r = t.length; n < r; n++) p(t[n], e, n, a);
			else p(t, e, 0, a);
		}
		e.bindBuffer(e.UNIFORM_BUFFER, null);
	}
	function p(t, n, r, i) {
		if (h(t, n, r, i) === !0) {
			let n = t.__offset, r = t.value;
			if (Array.isArray(r)) {
				let e = 0;
				for (let n = 0; n < r.length; n++) {
					let i = r[n], a = _(i);
					m(i, t.__data, e), typeof i != "number" && typeof i != "boolean" && !i.isMatrix3 && !ArrayBuffer.isView(i) && (e += a.storage / Float32Array.BYTES_PER_ELEMENT);
				}
			} else m(r, t.__data, 0);
			e.bufferSubData(e.UNIFORM_BUFFER, n, t.__data);
		}
	}
	function m(e, t, n) {
		typeof e == "number" || typeof e == "boolean" ? t[0] = e : e.isMatrix3 ? (t[0] = e.elements[0], t[1] = e.elements[1], t[2] = e.elements[2], t[3] = 0, t[4] = e.elements[3], t[5] = e.elements[4], t[6] = e.elements[5], t[7] = 0, t[8] = e.elements[6], t[9] = e.elements[7], t[10] = e.elements[8], t[11] = 0) : ArrayBuffer.isView(e) ? t.set(new e.constructor(e.buffer, e.byteOffset, t.length)) : e.toArray(t, n);
	}
	function h(e, t, n, r) {
		let i = e.value, a = t + "_" + n;
		if (r[a] === void 0) return r[a] = typeof i == "number" || typeof i == "boolean" ? i : ArrayBuffer.isView(i) ? i.slice() : i.clone(), !0;
		{
			let e = r[a];
			if (typeof i == "number" || typeof i == "boolean") {
				if (e !== i) return r[a] = i, !0;
			} else if (ArrayBuffer.isView(i)) return !0;
			else if (e.equals(i) === !1) return e.copy(i), !0;
		}
		return !1;
	}
	function g(e) {
		let t = e.uniforms, n = 0;
		for (let e = 0, r = t.length; e < r; e++) {
			let r = Array.isArray(t[e]) ? t[e] : [t[e]];
			for (let e = 0, t = r.length; e < t; e++) {
				let t = r[e], i = Array.isArray(t.value) ? t.value : [t.value];
				for (let e = 0, r = i.length; e < r; e++) {
					let r = i[e], a = _(r), o = n % 16, s = o % a.boundary, c = o + s;
					n += s, c !== 0 && 16 - c < a.storage && (n += 16 - c), t.__data = new Float32Array(a.storage / Float32Array.BYTES_PER_ELEMENT), t.__offset = n, n += a.storage;
				}
			}
		}
		let r = n % 16;
		return r > 0 && (n += 16 - r), e.__size = n, e.__cache = {}, this;
	}
	function _(e) {
		let t = {
			boundary: 0,
			storage: 0
		};
		return typeof e == "number" || typeof e == "boolean" ? (t.boundary = 4, t.storage = 4) : e.isVector2 ? (t.boundary = 8, t.storage = 8) : e.isVector3 || e.isColor ? (t.boundary = 16, t.storage = 12) : e.isVector4 ? (t.boundary = 16, t.storage = 16) : e.isMatrix3 ? (t.boundary = 48, t.storage = 48) : e.isMatrix4 ? (t.boundary = 64, t.storage = 64) : e.isTexture ? B("WebGLRenderer: Texture samplers can not be part of an uniforms group.") : ArrayBuffer.isView(e) ? (t.boundary = 16, t.storage = e.byteLength) : B("WebGLRenderer: Unsupported uniform value type.", e), t;
	}
	function v(t) {
		let n = t.target;
		n.removeEventListener("dispose", v);
		let r = o.indexOf(n.__bindingPointIndex);
		o.splice(r, 1), e.deleteBuffer(i[n.id]), delete i[n.id], delete a[n.id];
	}
	function y() {
		for (let t in i) e.deleteBuffer(i[t]);
		o = [], i = {}, a = {};
	}
	return {
		bind: c,
		update: l,
		dispose: y
	};
}
var Qc = new Uint16Array([
	12469,
	15057,
	12620,
	14925,
	13266,
	14620,
	13807,
	14376,
	14323,
	13990,
	14545,
	13625,
	14713,
	13328,
	14840,
	12882,
	14931,
	12528,
	14996,
	12233,
	15039,
	11829,
	15066,
	11525,
	15080,
	11295,
	15085,
	10976,
	15082,
	10705,
	15073,
	10495,
	13880,
	14564,
	13898,
	14542,
	13977,
	14430,
	14158,
	14124,
	14393,
	13732,
	14556,
	13410,
	14702,
	12996,
	14814,
	12596,
	14891,
	12291,
	14937,
	11834,
	14957,
	11489,
	14958,
	11194,
	14943,
	10803,
	14921,
	10506,
	14893,
	10278,
	14858,
	9960,
	14484,
	14039,
	14487,
	14025,
	14499,
	13941,
	14524,
	13740,
	14574,
	13468,
	14654,
	13106,
	14743,
	12678,
	14818,
	12344,
	14867,
	11893,
	14889,
	11509,
	14893,
	11180,
	14881,
	10751,
	14852,
	10428,
	14812,
	10128,
	14765,
	9754,
	14712,
	9466,
	14764,
	13480,
	14764,
	13475,
	14766,
	13440,
	14766,
	13347,
	14769,
	13070,
	14786,
	12713,
	14816,
	12387,
	14844,
	11957,
	14860,
	11549,
	14868,
	11215,
	14855,
	10751,
	14825,
	10403,
	14782,
	10044,
	14729,
	9651,
	14666,
	9352,
	14599,
	9029,
	14967,
	12835,
	14966,
	12831,
	14963,
	12804,
	14954,
	12723,
	14936,
	12564,
	14917,
	12347,
	14900,
	11958,
	14886,
	11569,
	14878,
	11247,
	14859,
	10765,
	14828,
	10401,
	14784,
	10011,
	14727,
	9600,
	14660,
	9289,
	14586,
	8893,
	14508,
	8533,
	15111,
	12234,
	15110,
	12234,
	15104,
	12216,
	15092,
	12156,
	15067,
	12010,
	15028,
	11776,
	14981,
	11500,
	14942,
	11205,
	14902,
	10752,
	14861,
	10393,
	14812,
	9991,
	14752,
	9570,
	14682,
	9252,
	14603,
	8808,
	14519,
	8445,
	14431,
	8145,
	15209,
	11449,
	15208,
	11451,
	15202,
	11451,
	15190,
	11438,
	15163,
	11384,
	15117,
	11274,
	15055,
	10979,
	14994,
	10648,
	14932,
	10343,
	14871,
	9936,
	14803,
	9532,
	14729,
	9218,
	14645,
	8742,
	14556,
	8381,
	14461,
	8020,
	14365,
	7603,
	15273,
	10603,
	15272,
	10607,
	15267,
	10619,
	15256,
	10631,
	15231,
	10614,
	15182,
	10535,
	15118,
	10389,
	15042,
	10167,
	14963,
	9787,
	14883,
	9447,
	14800,
	9115,
	14710,
	8665,
	14615,
	8318,
	14514,
	7911,
	14411,
	7507,
	14279,
	7198,
	15314,
	9675,
	15313,
	9683,
	15309,
	9712,
	15298,
	9759,
	15277,
	9797,
	15229,
	9773,
	15166,
	9668,
	15084,
	9487,
	14995,
	9274,
	14898,
	8910,
	14800,
	8539,
	14697,
	8234,
	14590,
	7790,
	14479,
	7409,
	14367,
	7067,
	14178,
	6621,
	15337,
	8619,
	15337,
	8631,
	15333,
	8677,
	15325,
	8769,
	15305,
	8871,
	15264,
	8940,
	15202,
	8909,
	15119,
	8775,
	15022,
	8565,
	14916,
	8328,
	14804,
	8009,
	14688,
	7614,
	14569,
	7287,
	14448,
	6888,
	14321,
	6483,
	14088,
	6171,
	15350,
	7402,
	15350,
	7419,
	15347,
	7480,
	15340,
	7613,
	15322,
	7804,
	15287,
	7973,
	15229,
	8057,
	15148,
	8012,
	15046,
	7846,
	14933,
	7611,
	14810,
	7357,
	14682,
	7069,
	14552,
	6656,
	14421,
	6316,
	14251,
	5948,
	14007,
	5528,
	15356,
	5942,
	15356,
	5977,
	15353,
	6119,
	15348,
	6294,
	15332,
	6551,
	15302,
	6824,
	15249,
	7044,
	15171,
	7122,
	15070,
	7050,
	14949,
	6861,
	14818,
	6611,
	14679,
	6349,
	14538,
	6067,
	14398,
	5651,
	14189,
	5311,
	13935,
	4958,
	15359,
	4123,
	15359,
	4153,
	15356,
	4296,
	15353,
	4646,
	15338,
	5160,
	15311,
	5508,
	15263,
	5829,
	15188,
	6042,
	15088,
	6094,
	14966,
	6001,
	14826,
	5796,
	14678,
	5543,
	14527,
	5287,
	14377,
	4985,
	14133,
	4586,
	13869,
	4257,
	15360,
	1563,
	15360,
	1642,
	15358,
	2076,
	15354,
	2636,
	15341,
	3350,
	15317,
	4019,
	15273,
	4429,
	15203,
	4732,
	15105,
	4911,
	14981,
	4932,
	14836,
	4818,
	14679,
	4621,
	14517,
	4386,
	14359,
	4156,
	14083,
	3795,
	13808,
	3437,
	15360,
	122,
	15360,
	137,
	15358,
	285,
	15355,
	636,
	15344,
	1274,
	15322,
	2177,
	15281,
	2765,
	15215,
	3223,
	15120,
	3451,
	14995,
	3569,
	14846,
	3567,
	14681,
	3466,
	14511,
	3305,
	14344,
	3121,
	14037,
	2800,
	13753,
	2467,
	15360,
	0,
	15360,
	1,
	15359,
	21,
	15355,
	89,
	15346,
	253,
	15325,
	479,
	15287,
	796,
	15225,
	1148,
	15133,
	1492,
	15008,
	1749,
	14856,
	1882,
	14685,
	1886,
	14506,
	1783,
	14324,
	1608,
	13996,
	1398,
	13702,
	1183
]), $c = null;
function el() {
	return $c === null && ($c = new li(Qc, 16, 16, oe, D), $c.name = "DFG_LUT", $c.minFilter = _, $c.magFilter = _, $c.wrapS = f, $c.wrapT = f, $c.generateMipmaps = !1, $c.needsUpdate = !0), $c;
}
var tl = class {
	constructor(e = {}) {
		let { canvas: t = rt(), context: n = null, depth: r = !0, stencil: i = !1, alpha: a = !1, antialias: o = !1, premultipliedAlpha: s = !0, preserveDrawingBuffer: c = !1, powerPreference: l = "default", failIfMajorPerformanceCaveat: u = !1, reversedDepthBuffer: d = !1, outputBufferType: f = b } = e;
		this.isWebGLRenderer = !0;
		let p;
		if (n !== null) {
			if (typeof WebGLRenderingContext < "u" && n instanceof WebGLRenderingContext) throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");
			p = n.getContextAttributes().alpha;
		} else p = a;
		let m = f, h = /* @__PURE__ */ new Set([
			ce,
			se,
			ae
		]), g = /* @__PURE__ */ new Set([
			b,
			T,
			C,
			k,
			O,
			ee
		]), _ = /* @__PURE__ */ new Uint32Array(4), v = /* @__PURE__ */ new Int32Array(4), x = new W(), S = null, w = null, E = [], A = [], j = null;
		this.domElement = t, this.debug = {
			checkShaderErrors: !0,
			diagnostics: { keywords: !1 },
			onShaderError: null
		}, this.autoClear = !0, this.autoClearColor = !0, this.autoClearDepth = !0, this.autoClearStencil = !0, this.sortObjects = !0, this.clippingPlanes = [], this.localClippingEnabled = !1, this.toneMapping = 0, this.toneMappingExposure = 1, this.transmissionResolutionScale = 1;
		let M = this, te = !1, N = null, ne = null, re = null, ie = null;
		this._outputColorSpace = qe;
		let oe = 0, le = 0, P = null, ue = -1, de = null, fe = new It(), pe = new It(), me = null, he = new J(0), F = 0, I = t.width, ge = t.height, _e = 1, ve = null, ye = null, be = new It(0, 0, I, ge), xe = new It(0, 0, I, ge), Se = !1, Ce = new pi(), we = !1, Te = !1, Ee = new Bt(), De = new W(), Oe = new It(), ke = {
			background: null,
			fog: null,
			environment: null,
			overrideMaterial: null,
			isScene: !0
		}, Ae = !1;
		function je() {
			return P === null ? _e : 1;
		}
		let L = n;
		function Me(e, n) {
			return t.getContext(e, n);
		}
		let Ne, Pe, R, Fe, z, Ie, Le, Re, ze, Be, Ve, He, Ue, We, Ge, Ke, Je, Ye, Xe, Ze, Qe, et, tt;
		try {
			let e = {
				alpha: !0,
				depth: r,
				stencil: i,
				antialias: o,
				premultipliedAlpha: s,
				preserveDrawingBuffer: c,
				powerPreference: l,
				failIfMajorPerformanceCaveat: u
			};
			if ("setAttribute" in t && t.setAttribute("data-engine", "three.js r186"), t.addEventListener("webglcontextlost", ot, !1), t.addEventListener("webglcontextrestored", st, !1), t.addEventListener("webglcontextcreationerror", lt, !1), L === null) {
				let t = "webgl2";
				if (L = Me(t, e), L === null) throw Me(t) ? Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.") : Error("THREE.WebGLRenderer: Error creating WebGL context.");
			}
			nt();
		} catch (e) {
			throw t.removeEventListener("webglcontextlost", ot, !1), t.removeEventListener("webglcontextrestored", st, !1), t.removeEventListener("webglcontextcreationerror", lt, !1), V("WebGLRenderer: " + e.message), e;
		}
		function nt() {
			Ne = new bo(L), Ne.init(), Qe = new Uc(L, Ne), Pe = new Ja(L, Ne, e, Qe), R = new Vc(L, Ne), Pe.reversedDepthBuffer && d && R.buffers.depth.setReversed(!0), ne = L.createFramebuffer(), re = L.createFramebuffer(), ie = L.createFramebuffer(), Fe = new Co(L), z = new xc(), Ie = new Hc(L, Ne, R, z, Pe, Qe, Fe), Le = new yo(M), Re = new Ba(L), et = new Ka(L, Re), ze = new xo(L, Re, Fe, et), Be = new To(L, ze, Re, et, Fe), Ye = new wo(L, Pe, Ie), Ge = new Ya(z), Ve = new bc(M, Le, Ne, Pe, et, Ge), He = new Xc(M, z), Ue = new Tc(), We = new Mc(Ne), Je = new Ga(M, Le, R, Be, p, s), Ke = new Bc(M, Be, Pe), tt = new Zc(L, Fe, Pe, R), Xe = new qa(L, Ne, Fe), Ze = new So(L, Ne, Fe), Fe.programs = Ve.programs, M.capabilities = Pe, M.extensions = Ne, M.properties = z, M.renderLists = Ue, M.shadowMap = Ke, M.state = R, M.info = Fe;
		}
		m !== 1009 && (j = new Do(m, t.width, t.height, o, r, i));
		let it = new qc(M, L);
		this.xr = it, this.getContext = function() {
			return L;
		}, this.getContextAttributes = function() {
			return L.getContextAttributes();
		}, this.forceContextLoss = function() {
			let e = Ne.get("WEBGL_lose_context");
			e && e.loseContext();
		}, this.forceContextRestore = function() {
			let e = Ne.get("WEBGL_lose_context");
			e && e.restoreContext();
		}, this.getPixelRatio = function() {
			return _e;
		}, this.setPixelRatio = function(e) {
			e !== void 0 && (_e = e, this.setSize(I, ge, !1));
		}, this.getSize = function(e) {
			return e.set(I, ge);
		}, this.setSize = function(e, n, r = !0) {
			it.isPresenting ? B("WebGLRenderer: Can't change size while VR device is presenting.") : (I = e, ge = n, t.width = Math.floor(e * _e), t.height = Math.floor(n * _e), r === !0 && (t.style.width = e + "px", t.style.height = n + "px"), j !== null && j.setSize(t.width, t.height), this.setViewport(0, 0, e, n));
		}, this.getDrawingBufferSize = function(e) {
			return e.set(I * _e, ge * _e).floor();
		}, this.setDrawingBufferSize = function(e, n, r) {
			I = e, ge = n, _e = r, t.width = Math.floor(e * r), t.height = Math.floor(n * r), this.setViewport(0, 0, e, n);
		}, this.setEffects = function(e) {
			if (m === 1009) V("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");
			else {
				if (e) {
					for (let t = 0; t < e.length; t++) if (e[t].isOutputPass === !0) {
						B("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");
						break;
					}
				}
				j.setEffects(e || []);
			}
		}, this.getCurrentViewport = function(e) {
			return e.copy(fe);
		}, this.getViewport = function(e) {
			return e.copy(be);
		}, this.setViewport = function(e, t, n, r) {
			e.isVector4 ? be.set(e.x, e.y, e.z, e.w) : be.set(e, t, n, r), R.viewport(fe.copy(be).multiplyScalar(_e).round());
		}, this.getScissor = function(e) {
			return e.copy(xe);
		}, this.setScissor = function(e, t, n, r) {
			e.isVector4 ? xe.set(e.x, e.y, e.z, e.w) : xe.set(e, t, n, r), R.scissor(pe.copy(xe).multiplyScalar(_e).round());
		}, this.getScissorTest = function() {
			return Se;
		}, this.setScissorTest = function(e) {
			R.setScissorTest(Se = e);
		}, this.setOpaqueSort = function(e) {
			ve = e;
		}, this.setTransparentSort = function(e) {
			ye = e;
		}, this.getClearColor = function(e) {
			return e.copy(Je.getClearColor());
		}, this.setClearColor = function() {
			Je.setClearColor(...arguments);
		}, this.getClearAlpha = function() {
			return Je.getClearAlpha();
		}, this.setClearAlpha = function() {
			Je.setClearAlpha(...arguments);
		}, this.clear = function(e = !0, t = !0, n = !0) {
			let r = 0;
			if (e) {
				let e = !1;
				if (P !== null) {
					let t = P.texture.format;
					e = h.has(t);
				}
				if (e) {
					let e = P.texture.type, t = g.has(e), n = Je.getClearColor(), r = Je.getClearAlpha(), i = n.r, a = n.g, o = n.b;
					t ? (_[0] = i, _[1] = a, _[2] = o, _[3] = r, L.clearBufferuiv(L.COLOR, 0, _)) : (v[0] = i, v[1] = a, v[2] = o, v[3] = r, L.clearBufferiv(L.COLOR, 0, v));
				} else r |= L.COLOR_BUFFER_BIT;
			}
			t && (r |= L.DEPTH_BUFFER_BIT, this.state.buffers.depth.setMask(!0)), n && (r |= L.STENCIL_BUFFER_BIT, this.state.buffers.stencil.setMask(4294967295)), r !== 0 && L.clear(r);
		}, this.clearColor = function() {
			this.clear(!0, !1, !1);
		}, this.clearDepth = function() {
			this.clear(!1, !0, !1);
		}, this.clearStencil = function() {
			this.clear(!1, !1, !0);
		}, this.setNodesHandler = function(e) {
			e.setRenderer(this), N = e;
		}, this.dispose = function() {
			t.removeEventListener("webglcontextlost", ot, !1), t.removeEventListener("webglcontextrestored", st, !1), t.removeEventListener("webglcontextcreationerror", lt, !1), Je.dispose(), Ue.dispose(), We.dispose(), z.dispose(), Le.dispose(), Be.dispose(), et.dispose(), tt.dispose(), Ve.dispose(), it.dispose(), it.removeEventListener("sessionstart", gt), it.removeEventListener("sessionend", _t), vt.stop();
		};
		function ot(e) {
			e.preventDefault(), at("WebGLRenderer: Context Lost."), te = !0;
		}
		function st() {
			at("WebGLRenderer: Context Restored."), te = !1;
			let e = Fe.autoReset, t = Ke.enabled, n = Ke.autoUpdate, r = Ke.needsUpdate, i = Ke.type;
			nt(), Fe.autoReset = e, Ke.enabled = t, Ke.autoUpdate = n, Ke.needsUpdate = r, Ke.type = i;
		}
		function lt(e) {
			V("WebGLRenderer: A WebGL context could not be created. Reason: ", e.statusMessage);
		}
		function ut(e) {
			let t = e.target;
			t.removeEventListener("dispose", ut), dt(t);
		}
		function dt(e) {
			ft(e), z.remove(e);
		}
		function ft(e) {
			let t = z.get(e).programs;
			t !== void 0 && (t.forEach(function(e) {
				Ve.releaseProgram(e);
			}), e.isShaderMaterial && Ve.releaseShaderCache(e));
		}
		this.renderBufferDirect = function(e, t, n, r, i, a) {
			t === null && (t = ke);
			let o = i.isMesh && i.matrixWorld.determinantAffine() < 0, s = Tt(e, t, n, r, i);
			R.setMaterial(r, o);
			let c = n.index, l = 1;
			if (r.wireframe === !0) {
				if (c = ze.getWireframeAttribute(n), c === void 0) return;
				l = 2;
			}
			let u = n.drawRange, d = n.attributes.position, f = u.start * l, p = (u.start + u.count) * l;
			a !== null && (f = Math.max(f, a.start * l), p = Math.min(p, (a.start + a.count) * l)), c === null ? d != null && (f = Math.max(f, 0), p = Math.min(p, d.count)) : (f = Math.max(f, 0), p = Math.min(p, c.count));
			let m = p - f;
			if (m < 0 || m === Infinity) return;
			et.setup(i, r, s, n, c);
			let h, g = Xe;
			if (c !== null && (h = Re.get(c), g = Ze, g.setIndex(h)), i.isMesh) r.wireframe === !0 ? (R.setLineWidth(r.wireframeLinewidth * je()), g.setMode(L.LINES)) : g.setMode(L.TRIANGLES);
			else if (i.isLine) {
				let e = r.linewidth;
				e === void 0 && (e = 1), R.setLineWidth(e * je()), i.isLineSegments ? g.setMode(L.LINES) : i.isLineLoop ? g.setMode(L.LINE_LOOP) : g.setMode(L.LINE_STRIP);
			} else i.isPoints ? g.setMode(L.POINTS) : i.isSprite && g.setMode(L.TRIANGLES);
			if (i.isBatchedMesh) {
				if (Ne.get("WEBGL_multi_draw")) g.renderMultiDraw(i._multiDrawStarts, i._multiDrawCounts, i._multiDrawCount);
				else {
					let e = i._multiDrawStarts, t = i._multiDrawCounts, n = i._multiDrawCount, a = c ? Re.get(c).bytesPerElement : 1, o = z.get(r).currentProgram.getUniforms();
					for (let r = 0; r < n; r++) o.setValue(L, "_gl_DrawID", r), g.render(e[r] / a, t[r]);
				}
			} else if (i.isInstancedMesh) g.renderInstances(f, m, i.count);
			else if (n.isInstancedBufferGeometry) {
				let e = n._maxInstanceCount === void 0 ? Infinity : n._maxInstanceCount, t = Math.min(n.instanceCount, e);
				g.renderInstances(f, m, t);
			} else g.render(f, m);
		};
		function pt(e, t, n, r) {
			N !== null && e.isNodeMaterial && N.setObject(r, e), we === !0 && Ge.setState(e, n, !1), e.transparent === !0 && e.side === 2 && e.forceSinglePass === !1 ? (e.side = 1, e.needsUpdate = !0, G(e, t, r), e.side = 0, e.needsUpdate = !0, G(e, t, r), e.side = 2) : G(e, t, r);
		}
		this.compile = function(e, t, n = null) {
			n === null && (n = e), N !== null && N.renderStart(e, t, n), w = We.get(n), w.init(t), A.push(w), n.traverseVisible(function(e) {
				e.isLight && e.layers.test(t.layers) && (w.pushLight(e), e.castShadow && w.pushShadow(e));
			}), e !== n && e.traverseVisible(function(e) {
				e.isLight && e.layers.test(t.layers) && (w.pushLight(e), e.castShadow && w.pushShadow(e));
			}), w.setupLights(), N !== null && N.updateLights(w.state.lightsArray), Te = this.localClippingEnabled, we = Ge.init(this.clippingPlanes, Te), we === !0 && Ge.setGlobalState(this.clippingPlanes, t), N !== null && Ke.render(w.state.shadowsArray, n, t);
			let r = /* @__PURE__ */ new Set();
			return e.traverse(function(e) {
				if (!(e.isMesh || e.isPoints || e.isLine || e.isSprite)) return;
				let i = e.material;
				if (i) {
					if (Array.isArray(i)) for (let a = 0; a < i.length; a++) {
						let o = i[a];
						pt(o, n, t, e), r.add(o);
					}
					else pt(i, n, t, e), r.add(i);
				}
			}), w = A.pop(), N !== null && N.renderEnd(), r;
		}, this.compileAsync = function(e, t, n = null) {
			let r = this.compile(e, t, n);
			return new Promise((t) => {
				function n() {
					r.forEach(function(e) {
						let t = z.get(e).currentProgram;
						(t === void 0 || t.isReady()) && r.delete(e);
					}), r.size === 0 ? t(e) : setTimeout(n, 10);
				}
				Ne.get("KHR_parallel_shader_compile") === null ? setTimeout(n, 10) : n();
			});
		};
		let mt = null;
		function ht(e) {
			mt && mt(e);
		}
		function gt() {
			vt.stop();
		}
		function _t() {
			vt.start();
		}
		let vt = new za();
		vt.setAnimationLoop(ht), typeof self < "u" && vt.setContext(self), this.setAnimationLoop = function(e) {
			mt = e, it.setAnimationLoop(e), e === null ? vt.stop() : vt.start();
		}, it.addEventListener("sessionstart", gt), it.addEventListener("sessionend", _t), this.render = function(e, t) {
			if (t !== void 0 && t.isCamera !== !0) {
				V("WebGLRenderer.render: camera is not an instance of THREE.Camera.");
				return;
			}
			if (te === !0) return;
			N !== null && N.renderStart(e, t);
			let n = it.enabled === !0 && it.isPresenting === !0, r = j !== null && (P === null || n) && j.begin(M, P);
			if (e.matrixWorldAutoUpdate === !0 && e.updateMatrixWorld(), t.parent === null && t.matrixWorldAutoUpdate === !0 && t.updateMatrixWorld(), it.enabled === !0 && it.isPresenting === !0 && (j === null || j.isCompositing() === !1) && (it.cameraAutoUpdate === !0 && it.updateCamera(t), t = it.getCamera()), e.isScene === !0 && e.onBeforeRender(M, e, t, P), w = We.get(e, A.length), w.init(t), w.state.textureUnits = Ie.getTextureUnits(), A.push(w), Ee.multiplyMatrices(t.projectionMatrix, t.matrixWorldInverse), Ce.setFromProjectionMatrix(Ee, $e, t.reversedDepth), Te = this.localClippingEnabled, we = Ge.init(this.clippingPlanes, Te), S = Ue.get(e, E.length), S.init(), E.push(S), it.enabled === !0 && it.isPresenting === !0) {
				let e = M.xr.getDepthSensingMesh();
				e !== null && H(e, t, -Infinity, M.sortObjects);
			}
			H(e, t, 0, M.sortObjects), S.finish(), N !== null && N.updateLights(w.state.lightsArray), M.sortObjects === !0 && S.sort(ve, ye), Ae = it.enabled === !1 || it.isPresenting === !1 || it.hasDepthSensing() === !1, Ae && Je.addToRenderList(S, e), this.info.render.frame++, this.info.autoReset === !0 && this.info.reset(), we === !0 && Ge.beginShadows();
			let i = w.state.shadowsArray;
			if (Ke.render(i, e, t), we === !0 && Ge.endShadows(), (r && j.hasRenderPass()) === !1) {
				let n = S.opaque, r = S.transmissive;
				if (w.setupLights(), t.isArrayCamera) {
					let i = t.cameras;
					if (r.length > 0) for (let t = 0, a = i.length; t < a; t++) {
						let a = i[t];
						yt(n, r, e, a);
					}
					Ae && Je.render(e);
					for (let t = 0, n = i.length; t < n; t++) {
						let n = i[t];
						U(S, e, n, n.viewport);
					}
				} else r.length > 0 && yt(n, r, e, t), Ae && Je.render(e), U(S, e, t);
			}
			P !== null && le === 0 && (Ie.updateMultisampleRenderTarget(P), Ie.updateRenderTargetMipmap(P)), r && j.end(M), e.isScene === !0 && e.onAfterRender(M, e, t), et.resetDefaultState(), ue = -1, de = null, A.pop(), A.length > 0 ? (w = A[A.length - 1], Ie.setTextureUnits(w.state.textureUnits), we === !0 && Ge.setGlobalState(M.clippingPlanes, w.state.camera)) : w = null, E.pop(), S = E.length > 0 ? E[E.length - 1] : null, N !== null && N.renderEnd();
		};
		function H(e, t, n, r) {
			if (e.visible === !1) return;
			if (e.layers.test(t.layers)) {
				if (e.isGroup) n = e.renderOrder;
				else if (e.isLOD) e.autoUpdate === !0 && e.update(t);
				else if (e.isLightProbeGrid) w.pushLightProbeGrid(e);
				else if (e.isLight) w.pushLight(e), e.castShadow && w.pushShadow(e);
				else if (e.isSprite) {
					if (!e.frustumCulled || e.intersectsFrustum(Ce)) {
						r && Oe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Ee);
						let i = Be.update(e), a = e.material;
						a.visible && S.push(e, i, a, n, Oe.z, null, t);
					}
				} else if ((e.isMesh || e.isLine || e.isPoints) && (!e.frustumCulled || e.intersectsFrustum(Ce))) {
					let i = Be.update(e), a = e.material;
					if (r && (e.boundingSphere === void 0 ? (i.boundingSphere === null && i.computeBoundingSphere(), Oe.copy(i.boundingSphere.center)) : (e.boundingSphere === null && e.computeBoundingSphere(), Oe.copy(e.boundingSphere.center)), Oe.applyMatrix4(e.matrixWorld).applyMatrix4(Ee)), Array.isArray(a)) {
						let r = i.groups;
						for (let o = 0, s = r.length; o < s; o++) {
							let s = r[o], c = a[s.materialIndex];
							c && c.visible && S.push(e, i, c, n, Oe.z, s, t);
						}
					} else a.visible && S.push(e, i, a, n, Oe.z, null, t);
				}
			}
			let i = e.children;
			for (let e = 0, a = i.length; e < a; e++) H(i[e], t, n, r);
		}
		function U(e, t, n, r) {
			let { opaque: i, transmissive: a, transparent: o } = e;
			w.setupLightsView(n), we === !0 && Ge.setGlobalState(M.clippingPlanes, n), r && R.viewport(fe.copy(r)), i.length > 0 && bt(i, t, n), a.length > 0 && bt(a, t, n), o.length > 0 && bt(o, t, n), R.buffers.depth.setTest(!0), R.buffers.depth.setMask(!0), R.buffers.color.setMask(!0), R.setPolygonOffset(!1);
		}
		function yt(e, t, n, r) {
			if ((n.isScene === !0 ? n.overrideMaterial : null) !== null) return;
			if (w.state.transmissionRenderTarget[r.id] === void 0) {
				let e = Ne.has("EXT_color_buffer_half_float") || Ne.has("EXT_color_buffer_float");
				w.state.transmissionRenderTarget[r.id] = new q(1, 1, {
					generateMipmaps: !0,
					type: e ? D : b,
					minFilter: y,
					samples: Math.max(4, Pe.samples),
					stencilBuffer: i,
					resolveDepthBuffer: !1,
					resolveStencilBuffer: !1,
					storeMultisampledDepthBuffer: !1,
					storeMultisampledStencilBuffer: !1,
					colorSpace: K.workingColorSpace
				});
			}
			let a = w.state.transmissionRenderTarget[r.id], o = r.viewport || fe;
			a.setSize(o.z * M.transmissionResolutionScale, o.w * M.transmissionResolutionScale);
			let s = M.getRenderTarget(), c = M.getActiveCubeFace(), l = M.getActiveMipmapLevel();
			M.setRenderTarget(a), M.getClearColor(he), F = M.getClearAlpha(), F < 1 && M.setClearColor(16777215, .5), M.clear(), Ae && Je.render(n);
			let u = M.toneMapping;
			M.toneMapping = 0;
			let d = r.viewport;
			if (r.viewport !== void 0 && (r.viewport = void 0), w.setupLightsView(r), we === !0 && Ge.setGlobalState(M.clippingPlanes, r), bt(e, n, r), Ie.updateMultisampleRenderTarget(a), Ie.updateRenderTargetMipmap(a), Ne.has("WEBGL_multisampled_render_to_texture") === !1) {
				let e = !1;
				for (let i = 0, a = t.length; i < a; i++) {
					let { object: a, geometry: o, material: s, group: c } = t[i];
					if (s.side === 2 && a.layers.test(r.layers)) {
						let t = s.side;
						s.side = 1, s.needsUpdate = !0, xt(a, n, r, o, s, c), s.side = t, s.needsUpdate = !0, e = !0;
					}
				}
				e === !0 && (Ie.updateMultisampleRenderTarget(a), Ie.updateRenderTargetMipmap(a));
			}
			M.setRenderTarget(s, c, l), M.setClearColor(he, F), d !== void 0 && (r.viewport = d), M.toneMapping = u;
		}
		function bt(e, t, n) {
			let r = t.isScene === !0 ? t.overrideMaterial : null;
			for (let i = 0, a = e.length; i < a; i++) {
				let a = e[i], { object: o, geometry: s, group: c } = a, l = a.material;
				l.allowOverride === !0 && r !== null && (l = r), o.layers.test(n.layers) && xt(o, t, n, s, l, c);
			}
		}
		function xt(e, t, n, r, i, a) {
			N !== null && i.isNodeMaterial && N.setObject(e, i), e.onBeforeRender(M, t, n, r, i, a), e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse, e.matrixWorld), e.normalMatrix.getNormalMatrix(e.modelViewMatrix), i.onBeforeRender(M, t, n, r, e, a), i.transparent === !0 && i.side === 2 && i.forceSinglePass === !1 ? (i.side = 1, i.needsUpdate = !0, M.renderBufferDirect(n, t, r, i, e, a), i.side = 0, i.needsUpdate = !0, M.renderBufferDirect(n, t, r, i, e, a), i.side = 2) : M.renderBufferDirect(n, t, r, i, e, a), e.onAfterRender(M, t, n, r, i, a);
		}
		function G(e, t, n) {
			t.isScene !== !0 && (t = ke);
			let r = z.get(e), i = w.state.lights, a = w.state.shadowsArray, o = i.state.version, s = Ve.getParameters(e, i.state, a, t, n, w.state.lightProbeGridArray), c = Ve.getProgramCacheKey(s), l = r.programs;
			r.environment = e.isMeshStandardMaterial || e.isMeshLambertMaterial || e.isMeshPhongMaterial ? t.environment : null, r.fog = t.fog;
			let u = e.isMeshStandardMaterial || e.isMeshLambertMaterial && !e.envMap || e.isMeshPhongMaterial && !e.envMap;
			r.envMap = Le.get(e.envMap || r.environment, u), r.envMapRotation = r.environment !== null && e.envMap === null ? t.environmentRotation : e.envMapRotation, l === void 0 && (e.addEventListener("dispose", ut), l = /* @__PURE__ */ new Map(), r.programs = l);
			let d = l.get(c);
			if (d !== void 0) {
				if (r.currentProgram === d && r.lightsStateVersion === o) return Ct(e, s), d;
			} else s.uniforms = Ve.getUniforms(e), N !== null && e.isNodeMaterial && N.build(e, n, s), e.onBeforeCompile(s, M), d = Ve.acquireProgram(s, c), l.set(c, d), r.uniforms = s.uniforms;
			let f = r.uniforms;
			return (!e.isShaderMaterial && !e.isRawShaderMaterial || e.clipping === !0) && (f.clippingPlanes = Ge.uniform), Ct(e, s), r.needsLights = Dt(e), r.lightsStateVersion = o, r.needsLights && (f.ambientLightColor.value = i.state.ambient, f.lightProbe.value = i.state.probe, f.sunLights.value = i.state.sun, f.sunLightShadows.value = i.state.sunShadow, f.directionalLights.value = i.state.directional, f.directionalLightShadows.value = i.state.directionalShadow, f.spotLights.value = i.state.spot, f.spotLightShadows.value = i.state.spotShadow, f.rectAreaLights.value = i.state.rectArea, f.ltc_1.value = i.state.rectAreaLTC1, f.ltc_2.value = i.state.rectAreaLTC2, f.pointLights.value = i.state.point, f.pointLightShadows.value = i.state.pointShadow, f.hemisphereLights.value = i.state.hemi, f.sunShadowMatrix.value = i.state.sunShadowMatrix, f.sunShadowCascade.value = i.state.sunShadowCascade, f.directionalShadowMatrix.value = i.state.directionalShadowMatrix, f.spotLightMatrix.value = i.state.spotLightMatrix, f.spotLightMap.value = i.state.spotLightMap, f.pointShadowMatrix.value = i.state.pointShadowMatrix), r.lightProbeGrid = w.state.lightProbeGridArray.length > 0, r.currentProgram = d, r.uniformsList = null, d;
		}
		function St(e) {
			if (e.uniformsList === null) {
				let t = e.currentProgram.getUniforms();
				e.uniformsList = Ns.seqWithValue(t.seq, e.uniforms);
			}
			return e.uniformsList;
		}
		function Ct(e, t) {
			let n = z.get(e);
			n.outputColorSpace = t.outputColorSpace, n.batching = t.batching, n.batchingColor = t.batchingColor, n.instancing = t.instancing, n.instancingColor = t.instancingColor, n.instancingMorph = t.instancingMorph, n.skinning = t.skinning, n.morphTargets = t.morphTargets, n.morphNormals = t.morphNormals, n.morphColors = t.morphColors, n.morphTargetsCount = t.morphTargetsCount, n.numClippingPlanes = t.numClippingPlanes, n.numIntersection = t.numClipIntersection, n.vertexAlphas = t.vertexAlphas, n.vertexTangents = t.vertexTangents, n.toneMapping = t.toneMapping;
		}
		function wt(e, t) {
			if (e.length === 0) return null;
			if (e.length === 1) return e[0].texture === null ? null : e[0];
			x.setFromMatrixPosition(t.matrixWorld);
			for (let t = 0, n = e.length; t < n; t++) {
				let n = e[t];
				if (n.texture !== null && n.boundingBox.containsPoint(x)) return n;
			}
			return null;
		}
		function Tt(e, t, n, r, i) {
			t.isScene !== !0 && (t = ke), Ie.resetTextureUnits();
			let a = t.fog, o = r.isMeshStandardMaterial || r.isMeshLambertMaterial || r.isMeshPhongMaterial ? t.environment : null, s = P === null ? M.outputColorSpace : P.isXRRenderTarget === !0 ? P.texture.colorSpace : K.workingColorSpace, c = r.isMeshStandardMaterial || r.isMeshLambertMaterial && !r.envMap || r.isMeshPhongMaterial && !r.envMap, l = Le.get(r.envMap || o, c), u = r.vertexColors === !0 && !!n.attributes.color && n.attributes.color.itemSize === 4, d = !!n.attributes.tangent && (!!r.normalMap || r.anisotropy > 0), f = !!n.morphAttributes.position, p = !!n.morphAttributes.normal, m = !!n.morphAttributes.color, h = 0;
			r.toneMapped && (P === null || P.isXRRenderTarget === !0) && (h = M.toneMapping);
			let g = n.morphAttributes.position || n.morphAttributes.normal || n.morphAttributes.color, _ = g === void 0 ? 0 : g.length, v = z.get(r), y = w.state.lights;
			if (we === !0 && (Te === !0 || e !== de)) {
				let t = e === de && r.id === ue;
				Ge.setState(r, e, t);
			}
			let b = !1;
			r.version === v.__version ? v.needsLights && v.lightsStateVersion !== y.state.version ? b = !0 : v.outputColorSpace === s ? i.isBatchedMesh && v.batching === !1 || !i.isBatchedMesh && v.batching === !0 || i.isBatchedMesh && v.batchingColor === !0 && i._colorsTexture === null || i.isBatchedMesh && v.batchingColor === !1 && i._colorsTexture !== null || i.isInstancedMesh && v.instancing === !1 || !i.isInstancedMesh && v.instancing === !0 || i.isSkinnedMesh && v.skinning === !1 || !i.isSkinnedMesh && v.skinning === !0 || i.isInstancedMesh && v.instancingColor === !0 && i.instanceColor === null || i.isInstancedMesh && v.instancingColor === !1 && i.instanceColor !== null || i.isInstancedMesh && v.instancingMorph === !0 && i.morphTexture === null || i.isInstancedMesh && v.instancingMorph === !1 && i.morphTexture !== null ? b = !0 : v.envMap === l ? r.fog === !0 && v.fog !== a || v.numClippingPlanes !== void 0 && (v.numClippingPlanes !== Ge.numPlanes || v.numIntersection !== Ge.numIntersection) ? b = !0 : v.vertexAlphas === u && v.vertexTangents === d && v.morphTargets === f && v.morphNormals === p && v.morphColors === m && v.toneMapping === h && v.morphTargetsCount === _ ? !!v.lightProbeGrid != w.state.lightProbeGridArray.length > 0 && (b = !0) : b = !0 : b = !0 : b = !0 : (b = !0, v.__version = r.version);
			let x = v.currentProgram;
			b === !0 && (x = G(r, t, i), N && r.isNodeMaterial && N.onUpdateProgram(r, x, v));
			let S = !1, C = !1, T = !1, E = x.getUniforms(), D = v.uniforms;
			if (R.useProgram(x.program) && (S = !0, C = !0, T = !0), r.id !== ue && (ue = r.id, C = !0), v.needsLights) {
				let e = wt(w.state.lightProbeGridArray, i);
				v.lightProbeGrid !== e && (v.lightProbeGrid = e, C = !0);
			}
			if (S || de !== e) {
				R.buffers.depth.getReversed() && e.reversedDepth !== !0 && (e._reversedDepth = !0, e.updateProjectionMatrix()), E.setValue(L, "projectionMatrix", e.projectionMatrix), E.setValue(L, "viewMatrix", e.matrixWorldInverse);
				let t = E.map.cameraPosition;
				t !== void 0 && t.setValue(L, De.setFromMatrixPosition(e.matrixWorld)), Pe.logarithmicDepthBuffer && E.setValue(L, "logDepthBufFC", 2 / (Math.log(e.far + 1) / Math.LN2)), (r.isMeshPhongMaterial || r.isMeshToonMaterial || r.isMeshLambertMaterial || r.isMeshBasicMaterial || r.isMeshStandardMaterial || r.isShaderMaterial) && E.setValue(L, "isOrthographic", e.isOrthographicCamera === !0), de !== e && (de = e, C = !0, T = !0);
			}
			if (v.needsLights && (y.state.sunShadowMap.length > 0 && E.setValue(L, "sunShadowMap", y.state.sunShadowMap, Ie), y.state.directionalShadowMap.length > 0 && E.setValue(L, "directionalShadowMap", y.state.directionalShadowMap, Ie), y.state.spotShadowMap.length > 0 && E.setValue(L, "spotShadowMap", y.state.spotShadowMap, Ie), y.state.pointShadowMap.length > 0 && E.setValue(L, "pointShadowMap", y.state.pointShadowMap, Ie)), i.isSkinnedMesh) {
				E.setOptional(L, i, "bindMatrix"), E.setOptional(L, i, "bindMatrixInverse");
				let e = i.skeleton;
				e && (e.boneTexture === null && e.computeBoneTexture(), E.setValue(L, "boneTexture", e.boneTexture, Ie));
			}
			i.isBatchedMesh && (E.setOptional(L, i, "batchingTexture"), E.setValue(L, "batchingTexture", i._matricesTexture, Ie), E.setOptional(L, i, "batchingIdTexture"), E.setValue(L, "batchingIdTexture", i._indirectTexture, Ie), E.setOptional(L, i, "batchingColorTexture"), i._colorsTexture !== null && E.setValue(L, "batchingColorTexture", i._colorsTexture, Ie));
			let O = n.morphAttributes;
			if ((O.position !== void 0 || O.normal !== void 0 || O.color !== void 0) && Ye.update(i, n, x), (C || v.receiveShadow !== i.receiveShadow) && (v.receiveShadow = i.receiveShadow, E.setValue(L, "receiveShadow", i.receiveShadow)), (r.isMeshStandardMaterial || r.isMeshLambertMaterial || r.isMeshPhongMaterial) && r.envMap === null && t.environment !== null && (D.envMapIntensity.value = t.environmentIntensity), D.dfgLUT !== void 0 && (D.dfgLUT.value = el()), C) {
				if (E.setValue(L, "toneMappingExposure", M.toneMappingExposure), v.needsLights && Et(D, T), a && r.fog === !0 && He.refreshFogUniforms(D, a), He.refreshMaterialUniforms(D, r, _e, ge, w.state.transmissionRenderTarget[e.id]), v.needsLights && v.lightProbeGrid) {
					let e = v.lightProbeGrid;
					D.probesSH.value = e.texture, D.probesMin.value.copy(e.boundingBox.min), D.probesMax.value.copy(e.boundingBox.max), D.probesResolution.value.copy(e.resolution);
				}
				Ns.upload(L, St(v), D, Ie);
			}
			if (r.isShaderMaterial && r.uniformsNeedUpdate === !0 && (Ns.upload(L, St(v), D, Ie), r.uniformsNeedUpdate = !1), r.isSpriteMaterial && E.setValue(L, "center", i.center), E.setValue(L, "modelViewMatrix", i.modelViewMatrix), E.setValue(L, "normalMatrix", i.normalMatrix), E.setValue(L, "modelMatrix", i.matrixWorld), r.uniformsGroups !== void 0) {
				let e = r.uniformsGroups;
				for (let t = 0, n = e.length; t < n; t++) {
					let n = e[t];
					tt.update(n, x), tt.bind(n, x);
				}
			}
			return x;
		}
		function Et(e, t) {
			e.ambientLightColor.needsUpdate = t, e.lightProbe.needsUpdate = t, e.sunLights.needsUpdate = t, e.sunLightShadows.needsUpdate = t, e.directionalLights.needsUpdate = t, e.directionalLightShadows.needsUpdate = t, e.pointLights.needsUpdate = t, e.pointLightShadows.needsUpdate = t, e.spotLights.needsUpdate = t, e.spotLightShadows.needsUpdate = t, e.rectAreaLights.needsUpdate = t, e.hemisphereLights.needsUpdate = t;
		}
		function Dt(e) {
			return e.isMeshLambertMaterial || e.isMeshToonMaterial || e.isMeshPhongMaterial || e.isMeshStandardMaterial || e.isShadowMaterial || e.isShaderMaterial && e.lights === !0;
		}
		this.getActiveCubeFace = function() {
			return oe;
		}, this.getActiveMipmapLevel = function() {
			return le;
		}, this.getRenderTarget = function() {
			return P;
		}, this.setRenderTargetTextures = function(e, t, n) {
			let r = z.get(e);
			r.__autoAllocateDepthBuffer = e.resolveDepthBuffer === !1, r.__autoAllocateDepthBuffer === !1 && (r.__useRenderToTexture = !1), z.get(e.texture).__webglTexture = t, z.get(e.depthTexture).__webglTexture = r.__autoAllocateDepthBuffer ? void 0 : n, r.__hasExternalTextures = !0;
		}, this.setRenderTargetFramebuffer = function(e, t) {
			let n = z.get(e);
			n.__webglFramebuffer = t, n.__useDefaultFramebuffer = t === void 0;
		}, this.setRenderTarget = function(e, t = 0, n = 0) {
			P = e, oe = t, le = n;
			let r = null, i = !1, a = !1;
			if (e) {
				let o = z.get(e);
				if (o.__useDefaultFramebuffer !== void 0) {
					R.bindFramebuffer(L.FRAMEBUFFER, o.__webglFramebuffer), fe.copy(e.viewport), pe.copy(e.scissor), me = e.scissorTest, R.viewport(fe), R.scissor(pe), R.setScissorTest(me), ue = -1;
					return;
				}
				if (o.__webglFramebuffer === void 0) Ie.setupRenderTarget(e);
				else if (o.__hasExternalTextures) Ie.rebindTextures(e, z.get(e.texture).__webglTexture, z.get(e.depthTexture).__webglTexture);
				else if (e.depthBuffer) {
					let t = e.depthTexture;
					if (o.__boundDepthTexture !== t) {
						if (t !== null && z.has(t) && (e.width !== t.image.width || e.height !== t.image.height)) throw Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");
						Ie.setupDepthRenderbuffer(e);
					}
				}
				let s = e.texture;
				(s.isData3DTexture || s.isDataArrayTexture || s.isCompressedArrayTexture) && (a = !0);
				let c = z.get(e).__webglFramebuffer;
				e.isWebGLCubeRenderTarget ? (r = Array.isArray(c[t]) ? c[t][n] : c[t], i = !0) : r = e.samples > 0 && Ie.useMultisampledRTT(e) === !1 ? z.get(e).__webglMultisampledFramebuffer : Array.isArray(c) ? c[n] : c, fe.copy(e.viewport), pe.copy(e.scissor), me = e.scissorTest;
			} else fe.copy(be).multiplyScalar(_e).floor(), pe.copy(xe).multiplyScalar(_e).floor(), me = Se;
			if (n !== 0 && (r = ne), R.bindFramebuffer(L.FRAMEBUFFER, r) && R.drawBuffers(e, r), R.viewport(fe), R.scissor(pe), R.setScissorTest(me), i) {
				let r = z.get(e.texture);
				L.framebufferTexture2D(L.FRAMEBUFFER, L.COLOR_ATTACHMENT0, L.TEXTURE_CUBE_MAP_POSITIVE_X + t, r.__webglTexture, n);
			} else if (a) {
				let r = t;
				for (let t = 0; t < e.textures.length; t++) {
					let i = z.get(e.textures[t]);
					L.framebufferTextureLayer(L.FRAMEBUFFER, L.COLOR_ATTACHMENT0 + t, i.__webglTexture, n, r);
				}
			} else if (e !== null && n !== 0) {
				let t = z.get(e.texture);
				L.framebufferTexture2D(L.FRAMEBUFFER, L.COLOR_ATTACHMENT0, L.TEXTURE_2D, t.__webglTexture, n);
			}
			ue = -1;
		};
		function Ot(e) {
			let t = z.get(e);
			return (t.__readFormat !== e.format || t.__readType !== e.type) && (t.__readFormat = e.format, t.__readType = e.type, t.__formatReadable = Pe.textureFormatReadable(e.format), t.__typeReadable = Pe.textureTypeReadable(e.type)), t;
		}
		this.readRenderTargetPixels = function(e, t, n, r, i, a, o, s = 0) {
			if (!(e && e.isWebGLRenderTarget)) {
				V("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
				return;
			}
			let c = z.get(e).__webglFramebuffer;
			if (e.isWebGLCubeRenderTarget && o !== void 0 && (c = c[o]), c) {
				R.bindFramebuffer(L.FRAMEBUFFER, c);
				try {
					let o = e.textures[s], c = o.format, l = o.type;
					e.textures.length > 1 && L.readBuffer(L.COLOR_ATTACHMENT0 + s);
					let u = Ot(o);
					if (u.__formatReadable === !1) {
						V("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
						return;
					}
					if (u.__typeReadable === !1) {
						V("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
						return;
					}
					t >= 0 && t <= e.width - r && n >= 0 && n <= e.height - i && L.readPixels(t, n, r, i, Qe.convert(c), Qe.convert(l), a);
				} finally {
					let e = P === null ? null : z.get(P).__webglFramebuffer;
					R.bindFramebuffer(L.FRAMEBUFFER, e);
				}
			}
		}, this.readRenderTargetPixelsAsync = async function(e, t, n, r, i, a, o, s = 0) {
			if (!(e && e.isWebGLRenderTarget)) throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
			let c = z.get(e).__webglFramebuffer;
			if (e.isWebGLCubeRenderTarget && o !== void 0 && (c = c[o]), c) {
				if (t >= 0 && t <= e.width - r && n >= 0 && n <= e.height - i) {
					R.bindFramebuffer(L.FRAMEBUFFER, c);
					let o = e.textures[s], l = o.format, u = o.type;
					e.textures.length > 1 && L.readBuffer(L.COLOR_ATTACHMENT0 + s);
					let d = Ot(o);
					if (d.__formatReadable === !1) throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
					if (d.__typeReadable === !1) throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
					let f = L.createBuffer();
					L.bindBuffer(L.PIXEL_PACK_BUFFER, f), L.bufferData(L.PIXEL_PACK_BUFFER, a.byteLength, L.STREAM_READ), L.readPixels(t, n, r, i, Qe.convert(l), Qe.convert(u), 0), L.bindBuffer(L.PIXEL_PACK_BUFFER, null);
					let p = P === null ? null : z.get(P).__webglFramebuffer;
					R.bindFramebuffer(L.FRAMEBUFFER, p);
					let m = L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE, 0);
					return L.flush(), await ct(L, m, 4), L.bindBuffer(L.PIXEL_PACK_BUFFER, f), L.getBufferSubData(L.PIXEL_PACK_BUFFER, 0, a), L.bindBuffer(L.PIXEL_PACK_BUFFER, null), L.deleteBuffer(f), L.deleteSync(m), a;
				}
				throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.");
			}
		}, this.copyFramebufferToTexture = function(e, t = null, n = 0) {
			let r = 2 ** -n, i = Math.floor(e.image.width * r), a = Math.floor(e.image.height * r), o = t === null ? 0 : t.x, s = t === null ? 0 : t.y;
			Ie.setTexture2D(e, 0), L.copyTexSubImage2D(L.TEXTURE_2D, n, 0, 0, o, s, i, a), R.unbindTexture();
		}, this.copyTextureToTexture = function(e, t, n = null, r = null, i = 0, a = 0) {
			let o, s, c, l, u, d, f, p, m, h = e.isCompressedTexture ? e.mipmaps[a] : e.image;
			if (n !== null) o = n.max.x - n.min.x, s = n.max.y - n.min.y, c = n.isBox3 ? n.max.z - n.min.z : 1, l = n.min.x, u = n.min.y, d = n.isBox3 ? n.min.z : 0;
			else {
				let t = 2 ** -i;
				o = Math.floor(h.width * t), s = Math.floor(h.height * t), c = e.isDataArrayTexture ? h.depth : e.isData3DTexture ? Math.floor(h.depth * t) : 1, l = 0, u = 0, d = 0;
			}
			r === null ? (f = 0, p = 0, m = 0) : (f = r.x, p = r.y, m = r.z);
			let g = Qe.convert(t.format), _ = Qe.convert(t.type), v;
			t.isData3DTexture ? (Ie.setTexture3D(t, 0), v = L.TEXTURE_3D) : t.isDataArrayTexture || t.isCompressedArrayTexture ? (Ie.setTexture2DArray(t, 0), v = L.TEXTURE_2D_ARRAY) : (Ie.setTexture2D(t, 0), v = L.TEXTURE_2D), R.activeTexture(L.TEXTURE0), R.pixelStorei(L.UNPACK_FLIP_Y_WEBGL, t.flipY), R.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL, t.premultiplyAlpha), R.pixelStorei(L.UNPACK_ALIGNMENT, t.unpackAlignment);
			let y = R.getParameter(L.UNPACK_ROW_LENGTH), b = R.getParameter(L.UNPACK_IMAGE_HEIGHT), x = R.getParameter(L.UNPACK_SKIP_PIXELS), S = R.getParameter(L.UNPACK_SKIP_ROWS), C = R.getParameter(L.UNPACK_SKIP_IMAGES);
			R.pixelStorei(L.UNPACK_ROW_LENGTH, h.width), R.pixelStorei(L.UNPACK_IMAGE_HEIGHT, h.height), R.pixelStorei(L.UNPACK_SKIP_PIXELS, l), R.pixelStorei(L.UNPACK_SKIP_ROWS, u), R.pixelStorei(L.UNPACK_SKIP_IMAGES, d);
			let w = e.isDataArrayTexture || e.isData3DTexture, T = t.isDataArrayTexture || t.isData3DTexture;
			if (e.isDepthTexture) {
				let n = z.get(e), r = z.get(t), h = z.get(n.__renderTarget), g = z.get(r.__renderTarget);
				R.bindFramebuffer(L.READ_FRAMEBUFFER, h.__webglFramebuffer), R.bindFramebuffer(L.DRAW_FRAMEBUFFER, g.__webglFramebuffer);
				for (let n = 0; n < c; n++) w && (L.framebufferTextureLayer(L.READ_FRAMEBUFFER, L.COLOR_ATTACHMENT0, z.get(e).__webglTexture, i, d + n), L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER, L.COLOR_ATTACHMENT0, z.get(t).__webglTexture, a, m + n)), L.blitFramebuffer(l, u, o, s, f, p, o, s, L.DEPTH_BUFFER_BIT, L.NEAREST);
				R.bindFramebuffer(L.READ_FRAMEBUFFER, null), R.bindFramebuffer(L.DRAW_FRAMEBUFFER, null);
			} else if (i !== 0 || e.isRenderTargetTexture || z.has(e)) {
				let n = z.get(e), r = z.get(t);
				R.bindFramebuffer(L.READ_FRAMEBUFFER, re), R.bindFramebuffer(L.DRAW_FRAMEBUFFER, ie);
				for (let e = 0; e < c; e++) w ? L.framebufferTextureLayer(L.READ_FRAMEBUFFER, L.COLOR_ATTACHMENT0, n.__webglTexture, i, d + e) : L.framebufferTexture2D(L.READ_FRAMEBUFFER, L.COLOR_ATTACHMENT0, L.TEXTURE_2D, n.__webglTexture, i), T ? L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER, L.COLOR_ATTACHMENT0, r.__webglTexture, a, m + e) : L.framebufferTexture2D(L.DRAW_FRAMEBUFFER, L.COLOR_ATTACHMENT0, L.TEXTURE_2D, r.__webglTexture, a), i === 0 ? T ? L.copyTexSubImage3D(v, a, f, p, m + e, l, u, o, s) : L.copyTexSubImage2D(v, a, f, p, l, u, o, s) : L.blitFramebuffer(l, u, o, s, f, p, o, s, L.COLOR_BUFFER_BIT, L.NEAREST);
				R.bindFramebuffer(L.READ_FRAMEBUFFER, null), R.bindFramebuffer(L.DRAW_FRAMEBUFFER, null);
			} else T ? e.isDataTexture || e.isData3DTexture ? L.texSubImage3D(v, a, f, p, m, o, s, c, g, _, h.data) : t.isCompressedArrayTexture ? L.compressedTexSubImage3D(v, a, f, p, m, o, s, c, g, h.data) : L.texSubImage3D(v, a, f, p, m, o, s, c, g, _, h) : e.isDataTexture ? L.texSubImage2D(L.TEXTURE_2D, a, f, p, o, s, g, _, h.data) : e.isCompressedTexture ? L.compressedTexSubImage2D(L.TEXTURE_2D, a, f, p, h.width, h.height, g, h.data) : L.texSubImage2D(L.TEXTURE_2D, a, f, p, o, s, g, _, h);
			R.pixelStorei(L.UNPACK_ROW_LENGTH, y), R.pixelStorei(L.UNPACK_IMAGE_HEIGHT, b), R.pixelStorei(L.UNPACK_SKIP_PIXELS, x), R.pixelStorei(L.UNPACK_SKIP_ROWS, S), R.pixelStorei(L.UNPACK_SKIP_IMAGES, C), a === 0 && t.generateMipmaps && L.generateMipmap(v), R.unbindTexture();
		}, this.initRenderTarget = function(e) {
			z.get(e).__webglFramebuffer === void 0 && Ie.setupRenderTarget(e);
		}, this.initTexture = function(e) {
			e.isCubeTexture ? Ie.setTextureCube(e, 0) : e.isData3DTexture ? Ie.setTexture3D(e, 0) : e.isDataArrayTexture || e.isCompressedArrayTexture ? Ie.setTexture2DArray(e, 0) : Ie.setTexture2D(e, 0), R.unbindTexture();
		}, this.resetState = function() {
			oe = 0, le = 0, P = null, R.reset(), et.reset();
		}, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
	}
	get coordinateSystem() {
		return $e;
	}
	get outputColorSpace() {
		return this._outputColorSpace;
	}
	set outputColorSpace(e) {
		this._outputColorSpace = e;
		let t = this.getContext();
		t.drawingBufferColorSpace = K._getDrawingBufferColorSpace(e), t.unpackColorSpace = K._getUnpackColorSpace();
	}
}, nl = [
	"bulb",
	"pendant",
	"spot",
	"ceiling",
	"strip",
	"table",
	"floor",
	"wall"
], rl = {
	bulb: "Bulb",
	pendant: "Pendant",
	spot: "Spotlight",
	ceiling: "Ceiling light",
	strip: "LED strip",
	table: "Table lamp",
	floor: "Floor lamp",
	wall: "Wall lamp"
}, il = 192, al = 16761963, ol = null, sl = !1, cl = /* @__PURE__ */ new Map(), ll = (e) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="26" r="${12 + 10 * e}" fill="#ffc46b" opacity="${.35 * e}"/><circle cx="32" cy="26" r="12" fill="${e ? "#fff1d0" : "#9a9a9a"}"/><rect x="26" y="38" width="12" height="10" rx="2" fill="#8a8f98"/></svg>`), ul = new Fi({
	color: 9080728,
	metalness: .6,
	roughness: .35
}), dl = new Fi({
	color: 4409166,
	metalness: .3,
	roughness: .55
}), fl = new Fi({
	color: 1776411,
	roughness: .8
}), pl = null;
function ml() {
	if (pl) return pl;
	let e = document.createElement("canvas");
	e.width = e.height = 128;
	let t = e.getContext("2d"), n = t.createRadialGradient(64, 64, 0, 64, 64, 64);
	return n.addColorStop(0, "rgba(255,214,140,1)"), n.addColorStop(.35, "rgba(255,190,100,.45)"), n.addColorStop(1, "rgba(255,170,60,0)"), t.fillStyle = n, t.fillRect(0, 0, 128, 128), pl = new hi(e);
}
var hl = (e, t, [n, r, i] = [
	0,
	0,
	0
]) => {
	let a = new oi(e, t);
	return a.position.set(n, r, i), a;
};
function gl(e) {
	return new Fi({
		color: e ? 16773584 : 14277081,
		emissive: al,
		emissiveIntensity: e * 2.2,
		roughness: .3,
		transparent: !0,
		opacity: .95
	});
}
var _l = (e) => new Fi({
	color: 15328214,
	emissive: al,
	emissiveIntensity: e * .55,
	roughness: .9,
	side: 2
}), vl = {
	bulb: (e) => {
		let t = new hn();
		return t.add(hl(new Ci(.55, 32, 24), e, [
			0,
			.25,
			0
		])), t.add(hl(new bi(.26, .22, .45, 24), ul, [
			0,
			-.45,
			0
		])), t.add(hl(new bi(.12, .08, .15, 16), dl, [
			0,
			-.73,
			0
		])), [t, [
			0,
			.25,
			0
		]];
	},
	pendant: (e) => {
		let t = new hn();
		return t.add(hl(new bi(.02, .02, 1.2, 8), fl, [
			0,
			.95,
			0
		])), t.add(hl(new xi(.85, .75, 40, 1, !0), dl, [
			0,
			0,
			0
		])), t.add(hl(new Ci(.28, 24, 16), e, [
			0,
			-.3,
			0
		])), [t, [
			0,
			-.4,
			0
		]];
	},
	spot: (e) => {
		let t = new hn();
		t.add(hl(new bi(.75, .75, .08, 40), ul, [
			0,
			.45,
			0
		])), t.add(hl(new bi(.45, .38, .35, 32), dl, [
			0,
			.25,
			0
		])), t.add(hl(new bi(.3, .3, .04, 32), e, [
			0,
			.06,
			0
		]));
		let n = hl(new xi(.9, 1.4, 32, 1, !0), new Fi({
			color: al,
			emissive: al,
			emissiveIntensity: .6,
			transparent: !0,
			opacity: 0,
			depthWrite: !1,
			side: 2
		}), [
			0,
			-.65,
			0
		]);
		return n.name = "beam", t.add(n), [t, [
			0,
			0,
			0
		]];
	},
	ceiling: (e) => {
		let t = new hn();
		t.add(hl(new bi(.95, .95, .08, 48), ul, [
			0,
			.5,
			0
		]));
		let n = hl(new Ci(.85, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), e, [
			0,
			.46,
			0
		]);
		return n.scale.set(1, -.45, 1), t.add(n), [t, [
			0,
			.2,
			0
		]];
	},
	strip: (e) => {
		let t = new hn();
		return t.add(hl(new yi(2, .12, .3), dl, [
			0,
			-.05,
			0
		])), t.add(hl(new yi(1.9, .06, .2), e, [
			0,
			.05,
			0
		])), t.rotation.z = .15, [t, [
			0,
			.05,
			0
		]];
	},
	table: (e, t) => {
		let n = new hn();
		return n.add(hl(new bi(.4, .45, .1, 32), ul, [
			0,
			-.85,
			0
		])), n.add(hl(new bi(.05, .05, .9, 12), ul, [
			0,
			-.35,
			0
		])), n.add(hl(new Ci(.2, 20, 14), e, [
			0,
			.15,
			0
		])), n.add(hl(new bi(.45, .7, .7, 40, 1, !0), _l(t), [
			0,
			.3,
			0
		])), [n, [
			0,
			.2,
			0
		]];
	},
	floor: (e, t) => {
		let n = new hn();
		return n.add(hl(new bi(.35, .4, .06, 32), dl, [
			0,
			-1.05,
			0
		])), n.add(hl(new bi(.035, .035, 1.6, 12), dl, [
			0,
			-.25,
			0
		])), n.add(hl(new Ci(.16, 20, 14), e, [
			0,
			.6,
			0
		])), n.add(hl(new bi(.35, .55, .55, 40, 1, !0), _l(t), [
			0,
			.75,
			0
		])), [n, [
			0,
			.65,
			0
		]];
	},
	wall: (e) => {
		let t = new hn();
		return t.add(hl(new yi(.5, .9, .08), ul, [
			0,
			0,
			-.45
		])), t.add(hl(new bi(.05, .05, .4, 12), ul, [
			0,
			0,
			-.25
		]).rotateX(Math.PI / 2)), t.add(hl(new wi(.32, .05, 12, 32), ul, [
			0,
			0,
			0
		]).rotateX(Math.PI / 2)), t.add(hl(new Ci(.3, 24, 16), e, [
			0,
			.05,
			0
		])), t.rotation.y = .5, [t, [
			0,
			.05,
			0
		]];
	}
};
function yl(e, t) {
	let n = Math.round(Math.max(0, Math.min(1, t)) * 10) / 10, r = `${e}:${n}`, i = cl.get(r);
	if (i) return i;
	if (sl) return ll(n);
	if (!ol) {
		try {
			ol = new tl({
				antialias: !0,
				alpha: !0,
				preserveDrawingBuffer: !0
			});
		} catch (e) {
			return console.warn("Plejd panel: WebGL unavailable, using flat lamp icons", e), sl = !0, ll(n);
		}
		ol.setPixelRatio(2), ol.setSize(il, il, !1);
	}
	let a = new Cn();
	a.add(new ba(16777215, .9));
	let o = new ya(16777215, 1.6);
	o.position.set(2, 3, 4), a.add(o);
	let s = gl(n), [c, [l, u, d]] = (vl[e] ?? vl.bulb)(s, n);
	if (a.add(c), n) {
		let e = new ga(al, 6 * n, 4);
		e.position.set(l, u, d + .2), c.add(e);
		let t = new Vr(new Dr({
			map: ml(),
			blending: 2,
			depthWrite: !1,
			opacity: .35 + .65 * n
		}));
		t.position.set(l, u, d), t.scale.setScalar(1.2 + 1.6 * n), c.add(t);
		let r = c.getObjectByName("beam");
		r && (r.material.opacity = .25 * n);
	}
	let f = new ma(32, 1, .1, 50);
	f.position.set(0, .5, 4.6), f.lookAt(0, 0, 0), ol.render(a, f);
	let p = ol.domElement.toDataURL("image/png");
	cl.set(r, p);
	let m = [
		ul,
		dl,
		fl
	];
	return a.traverse((e) => {
		e instanceof oi ? (e.geometry.dispose(), m.includes(e.material) || e.material.dispose()) : e instanceof Vr && e.material.dispose();
	}), p;
}
//#endregion
//#region src/logic.ts
var bl = [
	"toggle",
	"on",
	"off",
	"scene",
	"service"
];
function xl(e) {
	if (e == null || typeof e == "string" && e.trim() === "") return null;
	let t = Math.round(Number(e));
	return Number.isFinite(t) ? Math.min(100, Math.max(0, t)) : null;
}
function Sl(e, t, n) {
	let r = Math.round((e + t * (n.target_temp_step || .5)) * 100) / 100;
	return n.min_temp != null && (r = Math.max(n.min_temp, r)), n.max_temp != null && (r = Math.min(n.max_temp, r)), r;
}
var Cl = (e, t) => t === "" ? null : e[Number(t)] || null;
function wl(e, t) {
	if (!e.device) throw Error("Pick a remote.");
	let n = Cl(t, e.up), r = Cl(t, e.down), i = Cl(t, e.stop);
	if ((n || r) && !i) throw Error("Pick a release (stop) trigger.");
	let a = [];
	if (e.presses.forEach((e, n) => {
		let r = Cl(t, e.trigger), i = e.type === "scene" ? e.entity_id : e.type === "service" ? e.domain || e.service || e.data.trim() : "";
		if (!r && !e.type && !i) return;
		let o = `Press action ${n + 1}`;
		if (!r) throw Error(`${o}: pick a trigger.`);
		if (!bl.includes(e.type)) throw Error(`${o}: pick an action.`);
		let s = { type: e.type };
		if (e.type === "scene") {
			if (!e.entity_id) throw Error(`${o}: pick a scene.`);
			s.entity_id = e.entity_id;
		} else if (e.type === "service") {
			if (!e.domain.trim() || !e.service.trim()) throw Error(`${o}: service actions need a domain and a service.`);
			if (s.domain = e.domain.trim(), s.service = e.service.trim(), e.data.trim()) {
				let t;
				try {
					t = JSON.parse(e.data);
				} catch {
					throw Error(`${o}: data must be valid JSON.`);
				}
				if (typeof t != "object" || !t || Array.isArray(t)) throw Error(`${o}: data must be a JSON object.`);
				s.data = t;
			}
		}
		a.push({
			trigger: r,
			action: s
		});
	}), !n && !r && !a.length) throw Error("Pick a dim up/down trigger or add at least one press action.");
	let o = !!(n || r) || a.some((e) => !["scene", "service"].includes(e.action.type)), [s, c] = [e.target.slice(0, e.target.indexOf(":")), e.target.slice(e.target.indexOf(":") + 1)], l = s === "light" ? { entity_id: [c] } : s === "area" ? { area_id: [c] } : null;
	if (o && !l) throw Error("Pick a light or room.");
	let u = {};
	return l && (u.targets = l), n && (u.up = n), r && (u.down = r), (n || r) && (u.stop = i), a.length && (u.presses = a), u;
}
function Tl(e) {
	let t = e.name.trim();
	if (!t) throw Error("Name is required.");
	if (!e.days.length) throw Error("Pick at least one day.");
	if (!/^\d{2}:\d{2}$/.test(e.time)) throw Error("Pick a valid time.");
	if (e.scene === "") throw Error("Pick a scene.");
	let n = Number(e.fade === "" ? 0 : e.fade);
	if (!Number.isInteger(n) || n < 0) throw Error("Fade must be zero or a whole number of seconds.");
	return {
		name: t,
		days: [...e.days].sort((e, t) => e - t),
		time: e.time,
		scene: Number(e.scene),
		fade: n
	};
}
//#endregion
//#region node_modules/react/cjs/react-jsx-runtime.production.js
var El = /* @__PURE__ */ e(((e) => {
	var t = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
	function r(e, n, r) {
		var i = null;
		if (r !== void 0 && (i = "" + r), n.key !== void 0 && (i = "" + n.key), "key" in n) for (var a in r = {}, n) a !== "key" && (r[a] = n[a]);
		else r = n;
		return n = r.ref, {
			$$typeof: t,
			type: e,
			key: i,
			ref: n === void 0 ? null : n,
			props: r
		};
	}
	e.Fragment = n, e.jsx = r, e.jsxs = r;
})), $ = (/* @__PURE__ */ e(((e, t) => {
	t.exports = El();
})))(), Dl = [
	"devices",
	"automations",
	"settings"
], Ol = {
	devices: "Devices",
	automations: "Automations",
	settings: "Settings"
}, kl = 100, Al = 4, jl = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
], Ml = {
	toggle: "Toggle",
	on: "Turn on",
	off: "Turn off",
	scene: "Activate scene",
	service: "Call service"
}, Nl = [
	["auto", "Automatic (gateway first, Bluetooth fallback)"],
	["gateway", "Gateway only (remote/cloud)"],
	["ble", "Bluetooth only (local)"]
], Pl = (e) => e?.message || String(e), Fl = (e) => e.attributes.friendly_name || e.entity_id, Il = (e, t) => e.name.localeCompare(t.name), Ll = (e, t) => e.entities?.[t.entity_id]?.platform === "plejd" || t.attributes.attribution === "Plejd", Rl = (e, t, n = () => !0) => Object.values(e.states).filter((r) => r.entity_id.startsWith(`${t}.`) && Ll(e, r) && n(r)).sort((e, t) => Fl(e).localeCompare(Fl(t))), zl = (e, t) => e.devices[t]?.name_by_user || e.devices[t]?.name || t, Bl = (e, t, n) => {
	let r = e.entities?.[n.entity_id]?.device_id;
	return r ? zl(t, r) : Fl(n);
};
function Vl({ hass: e, narrow: t }) {
	let [n, r] = (0, l.useState)(() => localStorage.getItem("plejd_tab") || "devices"), i = (e) => {
		r(e), localStorage.setItem("plejd_tab", e);
	}, [a, o] = (0, l.useState)(null);
	(0, l.useEffect)(() => {
		Promise.all([e.callWS({ type: "config/area_registry/list" }), e.callWS({ type: "config/device_registry/list" })]).then(([e, t]) => o({
			areas: Object.fromEntries(e.map((e) => [e.area_id, e])),
			devices: Object.fromEntries(t.map((e) => [e.id, e]))
		})).catch((e) => console.warn("Plejd panel: failed to load area/device registries", e));
	}, []);
	let s = {
		hass: e,
		reg: a ?? {
			areas: e.areas || {},
			devices: e.devices || {}
		}
	};
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: `page ${t ? "narrow" : ""}`,
		children: [
			/* @__PURE__ */ (0, $.jsxs)("header", { children: [/* @__PURE__ */ (0, $.jsx)("h1", { children: "Plejd" }), /* @__PURE__ */ (0, $.jsx)("nav", {
				className: "tabs",
				children: Dl.map((e) => /* @__PURE__ */ (0, $.jsx)("button", {
					className: n === e ? "on" : "",
					onClick: () => i(e),
					children: Ol[e]
				}, e))
			})] }),
			n === "devices" && /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "grid",
				children: [
					/* @__PURE__ */ (0, $.jsx)("div", {
						className: "rooms",
						children: /* @__PURE__ */ (0, $.jsx)(Wl, { ...s })
					}),
					/* @__PURE__ */ (0, $.jsx)(eu, { ...s }),
					/* @__PURE__ */ (0, $.jsx)(Xl, { ...s }),
					/* @__PURE__ */ (0, $.jsx)(Ql, { ...s }),
					/* @__PURE__ */ (0, $.jsx)(tu, { ...s }),
					/* @__PURE__ */ (0, $.jsx)(nu, { ...s })
				]
			}),
			n === "automations" && /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "grid",
				children: [/* @__PURE__ */ (0, $.jsx)(iu, { ...s }), /* @__PURE__ */ (0, $.jsx)(cu, { ...s })]
			}),
			n === "settings" && /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "grid",
				children: [/* @__PURE__ */ (0, $.jsx)(lu, { ...s }), /* @__PURE__ */ (0, $.jsx)(uu, { ...s })]
			})
		]
	});
}
function Hl({ title: e, count: t, wide: n, children: r }) {
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		className: `card ${n ? "wide" : ""}`,
		children: [/* @__PURE__ */ (0, $.jsxs)("div", {
			className: "card-head",
			children: [/* @__PURE__ */ (0, $.jsx)("h2", { children: e }), t != null && /* @__PURE__ */ (0, $.jsx)("span", {
				className: "count",
				children: t
			})]
		}), r]
	});
}
var Ul = ({ text: e }) => /* @__PURE__ */ (0, $.jsx)("p", {
	className: "muted",
	children: e
});
function Wl({ hass: e }) {
	let [t, n] = (0, l.useState)(null), [r, i] = (0, l.useState)({}), [a, o] = (0, l.useState)("");
	(0, l.useEffect)(() => {
		let t = 0, r = () => Promise.all([e.callWS({ type: "plejd/rooms" }), e.callWS({ type: "plejd/light_styles/get" })]).then(([e, t]) => {
			n(e.rooms), i(t.styles || {}), o("");
		}).catch((e) => {
			o(Pl(e)), t = window.setTimeout(r, 5e3);
		});
		return r(), () => clearTimeout(t);
	}, []);
	let s = (t, n) => {
		i((e) => ({
			...e,
			[t]: n
		})), e.callWS({
			type: "plejd/light_styles/set",
			entity_id: t,
			style: n
		}).then((e) => i(e.styles)).catch((e) => o(`Could not save the lamp type: ${Pl(e)}`));
	}, c = Rl(e, "light");
	if (t === null) return /* @__PURE__ */ (0, $.jsx)(Hl, {
		title: "Lights",
		wide: !0,
		children: /* @__PURE__ */ (0, $.jsx)(Ul, { text: a ? `Waiting for Plejd… (${a})` : "Loading…" })
	});
	let u = new Set(t.map((e) => e.entity_id)), d = new Set(t.flatMap((e) => e.lights)), f = c.filter((e) => !u.has(e.entity_id) && !d.has(e.entity_id)).map((e) => e.entity_id), p = [...t.filter((e) => e.lights.length), ...f.length ? [{
		room_id: "",
		name: t.length ? "Other lights" : "Lights",
		entity_id: null,
		lights: f
	}] : []];
	return /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
		a && /* @__PURE__ */ (0, $.jsx)(Hl, {
			title: "Lights",
			wide: !0,
			children: /* @__PURE__ */ (0, $.jsx)("p", {
				className: "error",
				children: a
			})
		}),
		p.map((t) => /* @__PURE__ */ (0, $.jsx)(Gl, {
			hass: e,
			room: t,
			styles: r,
			setStyle: s
		}, t.room_id || "other")),
		!p.length && /* @__PURE__ */ (0, $.jsx)(Hl, {
			title: "Lights",
			wide: !0,
			children: /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No Plejd lights found." })
		})
	] });
}
function Gl({ hass: e, room: t, styles: n, setStyle: r }) {
	let [i, a] = (0, l.useState)(!1), o = t.lights.map((t) => e.states[t]).filter(Boolean), s = o.filter((e) => e.state === "on").length, c = t.entity_id ? e.states[t.entity_id] : void 0;
	return /* @__PURE__ */ (0, $.jsxs)("section", {
		className: `card room ${o.length > 3 ? "big" : ""}`,
		children: [/* @__PURE__ */ (0, $.jsxs)("div", {
			className: "room-head",
			children: [
				/* @__PURE__ */ (0, $.jsxs)("div", {
					className: "grow",
					children: [/* @__PURE__ */ (0, $.jsx)("h2", { children: t.name }), /* @__PURE__ */ (0, $.jsx)("span", {
						className: "muted",
						children: s ? `${s} of ${o.length} on` : "All off"
					})]
				}),
				/* @__PURE__ */ (0, $.jsx)("button", {
					className: `icon ${i ? "on" : ""}`,
					"aria-label": `Choose lamp types in ${t.name}`,
					title: "Lamp types",
					onClick: () => a(!i),
					children: "✎"
				}),
				c ? /* @__PURE__ */ (0, $.jsx)(Kl, {
					hass: e,
					s: c
				}) : /* @__PURE__ */ (0, $.jsx)(ql, {
					hass: e,
					members: o,
					name: t.name
				})
			]
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			className: "tiles",
			children: o.map((t) => /* @__PURE__ */ (0, $.jsx)(Jl, {
				hass: e,
				s: t,
				style: n[t.entity_id] ?? "bulb",
				editing: i,
				setStyle: (e) => r(t.entity_id, e)
			}, t.entity_id))
		})]
	});
}
function Kl({ hass: e, s: t }) {
	let n = Yl(e, t);
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "room-control",
		children: [n.dimmable && /* @__PURE__ */ (0, $.jsx)("input", {
			type: "range",
			min: 1,
			max: 100,
			value: n.pct,
			disabled: n.unavailable,
			className: n.on ? "" : "idle",
			"aria-label": `Brightness ${Fl(t)}`,
			onChange: (e) => n.slide(Number(e.target.value))
		}), /* @__PURE__ */ (0, $.jsx)("button", {
			type: "button",
			role: "switch",
			"aria-checked": n.on,
			"aria-label": `${n.on ? "Turn off" : "Turn on"} ${Fl(t)}`,
			className: `switch ${n.on ? "on" : ""}`,
			disabled: n.unavailable,
			onClick: n.toggle
		})]
	});
}
function ql({ hass: e, members: t, name: n }) {
	let r = t.some((e) => e.state === "on");
	return /* @__PURE__ */ (0, $.jsx)("button", {
		type: "button",
		role: "switch",
		"aria-checked": r,
		"aria-label": `${r ? "Turn off" : "Turn on"} ${n}`,
		className: `switch ${r ? "on" : ""}`,
		onClick: () => e.callService("light", r ? "turn_off" : "turn_on", { entity_id: t.map((e) => e.entity_id) }).catch((e) => console.warn("Plejd panel: failed to switch", n, e))
	});
}
function Jl({ hass: e, s: t, style: n, editing: r, setStyle: i }) {
	let a = Yl(e, t);
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: `tile ${a.on ? "lit" : ""} ${a.unavailable ? "off" : ""}`,
		children: [
			/* @__PURE__ */ (0, $.jsx)("button", {
				className: "lamp",
				onClick: a.toggle,
				disabled: a.unavailable,
				"aria-label": `${a.on ? "Turn off" : "Turn on"} ${Fl(t)}`,
				children: /* @__PURE__ */ (0, $.jsx)("img", {
					src: yl(n, a.on ? a.dimmable ? a.pct / 100 : 1 : 0),
					alt: "",
					draggable: !1
				})
			}),
			/* @__PURE__ */ (0, $.jsx)("div", {
				className: "tile-name",
				title: Fl(t),
				children: Fl(t)
			}),
			/* @__PURE__ */ (0, $.jsx)("div", {
				className: "muted",
				children: a.level
			}),
			r ? /* @__PURE__ */ (0, $.jsx)("select", {
				value: n,
				"aria-label": `Lamp type for ${Fl(t)}`,
				onChange: (e) => i(e.target.value),
				children: nl.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
					value: e,
					children: rl[e]
				}, e))
			}) : a.dimmable && /* @__PURE__ */ (0, $.jsx)("input", {
				type: "range",
				min: 1,
				max: 100,
				value: a.pct,
				disabled: a.unavailable,
				className: a.on ? "" : "idle",
				"aria-label": `Brightness ${Fl(t)}`,
				onChange: (e) => a.slide(Number(e.target.value))
			})
		]
	});
}
function Yl(e, t) {
	let n = t.entity_id, r = t.state === "unavailable", i = t.attributes.brightness, a = t.state === "on", o = i == null ? 100 : Math.round(i / 255 * 100), [s, c] = (0, l.useState)(null), [u, d] = (0, l.useState)(null), f = (0, l.useRef)(0), p = (0, l.useRef)({
		sending: !1,
		queued: null,
		last: 0,
		timer: 0,
		pending: null
	});
	(0, l.useEffect)(() => {
		s === a && c(null);
	}, [a, s]), (0, l.useEffect)(() => {
		u === o && d(null);
	}, [o, u]);
	let m = (0, l.useRef)(() => {});
	(0, l.useEffect)(() => () => m.current(), []);
	let h = s ?? a, g = u ?? o, _ = Array.isArray(t.attributes.supported_color_modes) ? t.attributes.supported_color_modes.includes("brightness") : i != null, v = r ? "unavailable" : h && i != null ? `${g}%` : h ? "on" : "off", y = () => {
		if (r) return;
		let t = ++f.current;
		c(!h), e.callService("light", h ? "turn_off" : "turn_on", { entity_id: n }).catch((e) => {
			console.warn("Plejd panel: failed to toggle light", n, e), f.current === t && c(null);
		});
	}, b = (t) => {
		let r = p.current, i = ++f.current;
		c(!0), d(t), r.sending ? r.queued = t : (r.sending = !0, e.callService("light", "turn_on", {
			entity_id: n,
			brightness_pct: t
		}).catch((e) => {
			console.warn("Plejd panel: failed to set brightness", n, e), f.current === i && (d(null), c(null));
		}).finally(() => {
			if (r.sending = !1, r.queued !== null) {
				let e = r.queued;
				r.queued = null, b(e);
			}
		}));
	};
	return m.current = () => {
		clearTimeout(p.current.timer), p.current.pending !== null && b(p.current.pending);
	}, {
		on: h,
		pct: g,
		dimmable: _,
		level: v,
		unavailable: r,
		toggle: y,
		slide: (e) => {
			let t = p.current;
			d(e), clearTimeout(t.timer);
			let n = kl - (Date.now() - t.last);
			t.pending = e;
			let r = () => {
				t.last = Date.now(), t.pending = null, b(e);
			};
			n <= 0 ? r() : t.timer = window.setTimeout(r, n);
		}
	};
}
function Xl({ hass: e }) {
	let t = Rl(e, "climate");
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Climate",
		count: t.length,
		children: [t.map((t) => /* @__PURE__ */ (0, $.jsx)(Zl, {
			hass: e,
			s: t
		}, t.entity_id)), !t.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No Plejd thermostats found." })]
	});
}
function Zl({ hass: e, s: t }) {
	let n = t.attributes.temperature, [r, i] = (0, l.useState)(null);
	(0, l.useEffect)(() => {
		r === n && i(null);
	}, [n, r]);
	let a = r ?? n, o = a == null || t.state === "unavailable", s = (n) => {
		let r = Sl(a, n, t.attributes);
		i(r), e.callService("climate", "set_temperature", {
			entity_id: t.entity_id,
			temperature: r
		}).catch((e) => {
			console.warn("Plejd panel: failed to set climate temperature", e), i((e) => e === r ? null : e);
		});
	};
	return /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "row line",
		children: [
			/* @__PURE__ */ (0, $.jsx)("span", {
				className: "grow",
				children: Fl(t)
			}),
			/* @__PURE__ */ (0, $.jsx)("button", {
				className: "btn small",
				disabled: o,
				onClick: () => s(-1),
				"aria-label": "Decrease target temperature",
				children: "−"
			}),
			/* @__PURE__ */ (0, $.jsx)("span", {
				className: "temp",
				children: a == null ? "—" : `${a}°C`
			}),
			/* @__PURE__ */ (0, $.jsx)("button", {
				className: "btn small",
				disabled: o,
				onClick: () => s(1),
				"aria-label": "Increase target temperature",
				children: "+"
			})
		]
	});
}
function Ql({ hass: e }) {
	let t = Rl(e, "cover");
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Covers",
		count: t.length,
		children: [t.map((t) => /* @__PURE__ */ (0, $.jsx)($l, {
			hass: e,
			s: t
		}, t.entity_id)), !t.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No Plejd covers found." })]
	});
}
function $l({ hass: e, s: t }) {
	let n = t.entity_id, r = t.state === "unavailable", i = xl(t.attributes.current_position), [a, o] = (0, l.useState)(null), [s, c] = (0, l.useState)(null), u = (0, l.useRef)(0), d = i ?? a, f = !!((t.attributes.supported_features || 0) & Al), p = (t, r, i) => {
		let a = ++u.current;
		e.callService("cover", t, {
			entity_id: n,
			...r
		}).then(() => {
			i != null && u.current === a && o(i);
		}).catch((e) => console.warn(`Plejd panel: ${t} failed for ${n}`, e));
	}, m = (0, l.useRef)(null), h = (0, l.useRef)(() => {});
	return h.current = () => {
		let e = Number(m.current.value);
		p("set_cover_position", { position: e }, e), c(null);
	}, (0, l.useEffect)(() => {
		let e = m.current, t = () => h.current();
		return e?.addEventListener("change", t), () => e?.removeEventListener("change", t);
	}, [f]), /* @__PURE__ */ (0, $.jsxs)("div", {
		className: "row",
		children: [/* @__PURE__ */ (0, $.jsxs)("div", {
			className: "line",
			children: [/* @__PURE__ */ (0, $.jsx)("span", {
				className: "grow",
				children: Fl(t)
			}), /* @__PURE__ */ (0, $.jsx)("span", {
				className: "count",
				children: r ? "unavailable" : i == null ? t.state : `${i}%`
			})]
		}), /* @__PURE__ */ (0, $.jsxs)("div", {
			className: "line",
			style: { marginTop: 8 },
			children: [
				/* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn",
					disabled: r,
					onClick: () => p("open_cover", {}, 100),
					children: "Open"
				}),
				/* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn ghost",
					disabled: r,
					onClick: () => p("stop_cover", {}, null),
					children: "Stop"
				}),
				/* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn",
					disabled: r,
					onClick: () => p("close_cover", {}, 0),
					children: "Close"
				}),
				f && /* @__PURE__ */ (0, $.jsx)("input", {
					ref: m,
					type: "range",
					min: 0,
					max: 100,
					value: s ?? d ?? 50,
					disabled: r,
					"aria-label": `Position ${Fl(t)}`,
					onChange: (e) => c(Number(e.target.value)),
					onPointerCancel: () => c(null)
				})
			]
		})]
	});
}
function eu({ hass: e }) {
	let t = Rl(e, "scene"), [n, r] = (0, l.useState)(""), i = (t) => {
		r(""), e.callService("scene", "turn_on", { entity_id: t }).catch((e) => r(`Could not activate scene: ${Pl(e)}`));
	};
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Scenes",
		count: t.length,
		children: [
			t.map((e) => /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "row line",
				children: [/* @__PURE__ */ (0, $.jsx)("span", {
					className: "grow",
					children: Fl(e)
				}), /* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn",
					onClick: () => i(e.entity_id),
					children: "Activate"
				})]
			}, e.entity_id)),
			!t.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No Plejd scenes found." }),
			n && /* @__PURE__ */ (0, $.jsx)("p", {
				className: "error",
				children: n
			})
		]
	});
}
function tu({ hass: e, reg: t }) {
	let n = Rl(e, "binary_sensor", (e) => e.attributes.device_class === "motion"), r = (t) => {
		let n = e.entities?.[t.entity_id]?.device_id, r = n && Object.values(e.states).find((t) => t.entity_id.startsWith("sensor.") && t.attributes.device_class === "illuminance" && e.entities?.[t.entity_id]?.device_id === n);
		return r && !["unavailable", "unknown"].includes(r.state) ? ` · ${r.state} lx` : "";
	};
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Motion & illuminance",
		count: n.length,
		children: [n.map((n) => /* @__PURE__ */ (0, $.jsxs)("div", {
			className: "row line",
			children: [
				/* @__PURE__ */ (0, $.jsx)("span", { className: `dot ${n.state === "on" ? "on" : ""}` }),
				/* @__PURE__ */ (0, $.jsx)("span", {
					className: "grow",
					children: Bl(e, t, n)
				}),
				/* @__PURE__ */ (0, $.jsxs)("span", {
					className: "count",
					children: [["unavailable", "unknown"].includes(n.state) ? "Unavailable" : n.state === "on" ? "Detected" : "Clear", r(n)]
				})
			]
		}, n.entity_id)), !n.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No motion sensors found." })]
	});
}
function nu({ hass: e, reg: t }) {
	let n = Rl(e, "binary_sensor", (e) => e.attributes.device_class === "problem" && e.state === "on").map((n) => ({
		id: n.entity_id,
		name: Bl(e, t, n),
		flags: (n.attributes.active_faults || []).map((e) => e.replace(/_/g, " ")).join(", ")
	})).sort(Il);
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Device health",
		count: n.length,
		children: [n.map((e) => /* @__PURE__ */ (0, $.jsxs)("div", {
			className: "row line",
			children: [
				/* @__PURE__ */ (0, $.jsx)("span", { className: "dot bad" }),
				/* @__PURE__ */ (0, $.jsx)("span", {
					className: "grow",
					children: e.name
				}),
				/* @__PURE__ */ (0, $.jsx)("span", {
					className: "count",
					children: e.flags
				})
			]
		}, e.id)), !n.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "All devices healthy." })]
	});
}
var ru = {
	name: "",
	days: [],
	time: "07:00",
	scene: "",
	fade: "0"
};
function iu({ hass: e }) {
	let [t, n] = (0, l.useState)(null), [r, i] = (0, l.useState)([]), [a, o] = (0, l.useState)(""), [s, c] = (0, l.useState)(ru), [u, d] = (0, l.useState)(!1), [f, p] = (0, l.useState)(""), [m, h] = (0, l.useState)(""), g = () => {
		o(""), e.callWS({ type: "plejd/schedules/list" }).then((e) => {
			n(e.schedules || []), i(e.scenes || []);
		}).catch((e) => o(`Could not load schedules: ${Pl(e)}`));
	};
	(0, l.useEffect)(g, []);
	let _ = async (t, r) => {
		d(!0), p(""), h("");
		try {
			let i = await e.callWS(t);
			n(i.schedules || []), h(i.reload_failed || (r ? "Saved." : "")), r?.();
		} catch (e) {
			p(Pl(e));
		} finally {
			d(!1);
		}
	}, v = () => {
		let e;
		try {
			e = Tl(s);
		} catch (e) {
			p(Pl(e)), h("");
			return;
		}
		_({
			type: "plejd/schedules/add",
			...e
		}, () => c(ru));
	}, y = (e) => r.find((t) => t.index === e)?.name || `Scene ${e}`, b = (e) => c({
		...s,
		...e
	});
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Schedules",
		wide: !0,
		children: [/* @__PURE__ */ (0, $.jsx)("p", {
			className: "lead",
			children: "Run a scene automatically on a weekly schedule, straight from the mesh — no automation needed."
		}), t === null ? a ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("p", {
			className: "error",
			children: a
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			className: "actions",
			children: /* @__PURE__ */ (0, $.jsx)("button", {
				className: "btn",
				onClick: g,
				children: "Retry"
			})
		})] }) : /* @__PURE__ */ (0, $.jsx)(Ul, { text: "Loading…" }) : /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
			t.map((e) => /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "row line",
				children: [/* @__PURE__ */ (0, $.jsxs)("div", {
					className: "grow",
					children: [/* @__PURE__ */ (0, $.jsx)("div", { children: e.name }), /* @__PURE__ */ (0, $.jsxs)("div", {
						className: "muted",
						children: [
							e.days?.length ? e.days.map((e) => jl[e]).join(", ") : "—",
							" · ",
							e.time,
							" · ",
							y(e.scene),
							e.fade ? ` · ${e.fade}s fade` : ""
						]
					})]
				}), /* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn danger",
					disabled: u,
					onClick: () => _({
						type: "plejd/schedules/delete",
						schedule_id: e.id
					}),
					children: "Delete"
				})]
			}, e.id)),
			!t.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No schedules yet." }),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "form",
				children: [
					/* @__PURE__ */ (0, $.jsx)("h3", { children: "Add a schedule" }),
					/* @__PURE__ */ (0, $.jsxs)("div", {
						className: "fields",
						children: [
							/* @__PURE__ */ (0, $.jsxs)("label", {
								className: "f",
								children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Name" }), /* @__PURE__ */ (0, $.jsx)("input", {
									value: s.name,
									placeholder: "Evening lights",
									onChange: (e) => b({ name: e.target.value })
								})]
							}),
							/* @__PURE__ */ (0, $.jsxs)("label", {
								className: "f",
								children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Scene" }), /* @__PURE__ */ (0, $.jsxs)("select", {
									value: s.scene,
									onChange: (e) => b({ scene: e.target.value }),
									children: [/* @__PURE__ */ (0, $.jsx)("option", {
										value: "",
										children: "Select a scene…"
									}), r.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
										value: e.index,
										children: e.name
									}, e.index))]
								})]
							}),
							/* @__PURE__ */ (0, $.jsxs)("label", {
								className: "f",
								children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Time" }), /* @__PURE__ */ (0, $.jsx)("input", {
									type: "time",
									value: s.time,
									onChange: (e) => b({ time: e.target.value })
								})]
							}),
							/* @__PURE__ */ (0, $.jsxs)("label", {
								className: "f",
								children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Fade (seconds, optional)" }), /* @__PURE__ */ (0, $.jsx)("input", {
									type: "number",
									min: 0,
									value: s.fade,
									onChange: (e) => b({ fade: e.target.value })
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, $.jsx)("span", {
						className: "label",
						style: { marginTop: 10 },
						children: "Days"
					}),
					/* @__PURE__ */ (0, $.jsx)("div", {
						className: "checks",
						children: jl.map((e, t) => /* @__PURE__ */ (0, $.jsxs)("label", { children: [/* @__PURE__ */ (0, $.jsx)("input", {
							type: "checkbox",
							checked: s.days.includes(t),
							onChange: (e) => b({ days: e.target.checked ? [...s.days, t] : s.days.filter((e) => e !== t) })
						}), e] }, t))
					}),
					f ? /* @__PURE__ */ (0, $.jsx)("p", {
						className: "error",
						children: f
					}) : m && /* @__PURE__ */ (0, $.jsx)("p", {
						className: "notice",
						children: m
					}),
					/* @__PURE__ */ (0, $.jsx)("div", {
						className: "actions",
						children: /* @__PURE__ */ (0, $.jsx)("button", {
							className: "btn",
							disabled: u,
							onClick: v,
							children: u ? "Saving…" : "Add schedule"
						})
					})
				]
			})
		] })]
	});
}
var au = {
	target: "",
	device: "",
	up: "",
	down: "",
	stop: "",
	presses: []
}, ou = {
	trigger: "",
	type: "",
	entity_id: "",
	domain: "",
	service: "",
	data: ""
}, su = (e) => {
	let t = (e.type || "trigger").replace(/_/g, " ");
	return e.subtype ? `${t} · ${e.subtype}` : t;
};
function cu({ hass: e, reg: t }) {
	let [n, r] = (0, l.useState)(null), [i, a] = (0, l.useState)(""), [o, s] = (0, l.useState)({}), [c, u] = (0, l.useState)(au), [d, f] = (0, l.useState)(!1), [p, m] = (0, l.useState)(""), [h, g] = (0, l.useState)(""), _ = () => {
		a(""), e.callWS({ type: "plejd/dim_bindings/list" }).then((e) => r(e.bindings || [])).catch((e) => a(`Could not load bindings: ${Pl(e)}`));
	};
	(0, l.useEffect)(_, []);
	let v = async (t) => {
		if (u({
			...c,
			device: t,
			up: "",
			down: "",
			stop: "",
			presses: c.presses.map((e) => ({
				...e,
				trigger: ""
			}))
		}), m(""), g(""), t && !o[t]) try {
			let n = await e.callWS({
				type: "plejd/device_triggers",
				device_id: t
			});
			s((e) => ({
				...e,
				[t]: {
					triggers: n.triggers || [],
					kind: n.device_kind || "remote"
				}
			}));
		} catch (e) {
			m(`Could not load triggers: ${Pl(e)}`);
		}
	}, y = async (t, n) => {
		f(!0), m(""), g("");
		try {
			let i = await e.callWS({
				type: "plejd/dim_bindings/save",
				bindings: t
			});
			r(i.bindings || []), g("Saved."), n && u(au);
		} catch (e) {
			m(Pl(e));
		} finally {
			f(!1);
		}
	}, b = () => {
		try {
			y([...n, wl(c, o[c.device]?.triggers || [])], !0);
		} catch (e) {
			m(Pl(e)), g("");
		}
	}, x = (e) => t.areas[e]?.name || e, S = (t) => e.states[t]?.attributes.friendly_name || t, C = (e) => {
		let n = e.targets || {}, r = [
			...[].concat(n.entity_id || []).map(S),
			...[].concat(n.area_id || []).map(x),
			...[].concat(n.device_id || []).map((e) => zl(t, e))
		];
		return r.length ? r.join(", ") : "—";
	}, w = (e) => {
		let n = [[
			"up",
			"down",
			"stop"
		].filter((t) => e[t]).join(" / ")].filter(Boolean), r = (e.presses || []).length;
		r && n.push(`${r} press action${r === 1 ? "" : "s"}`);
		let i = (e.up || e.down || e.stop || e.presses?.[0]?.trigger)?.device_id;
		return `${i ? zl(t, i) : "—"} · ${n.join(", ") || "—"}`;
	}, T = Object.values(e.states).filter((e) => e.entity_id.startsWith("light.")).map((e) => ({
		id: e.entity_id,
		name: Fl(e)
	})).sort(Il), E = Object.values(t.areas).map((e) => ({
		id: e.area_id,
		name: e.name || e.area_id
	})).sort(Il), D = Object.values(t.devices).map((e) => ({
		id: e.id,
		name: e.name_by_user || e.name
	})).filter((e) => e.name).sort(Il), O = Object.values(e.states).filter((e) => e.entity_id.startsWith("scene.")).map((e) => ({
		id: e.entity_id,
		name: Fl(e)
	})).sort(Il), ee = o[c.device], k = ee?.kind || "remote", A = /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("option", {
		value: "",
		children: "(none)"
	}), (ee?.triggers || []).map((e, t) => /* @__PURE__ */ (0, $.jsx)("option", {
		value: t,
		children: su(e)
	}, t))] }), j = (e, t) => u({
		...c,
		presses: c.presses.map((n, r) => r === e ? {
			...n,
			...t
		} : n)
	});
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Remote dim bindings",
		wide: !0,
		children: [/* @__PURE__ */ (0, $.jsx)("p", {
			className: "lead",
			children: "Bind a dimmer remote's hold/release to smooth dimming of a light or a whole room, and/or map any of its other triggers to an instant press action."
		}), n === null ? i ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("p", {
			className: "error",
			children: i
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			className: "actions",
			children: /* @__PURE__ */ (0, $.jsx)("button", {
				className: "btn",
				onClick: _,
				children: "Retry"
			})
		})] }) : /* @__PURE__ */ (0, $.jsx)(Ul, { text: "Loading…" }) : /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
			n.map((e) => /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "row line",
				children: [/* @__PURE__ */ (0, $.jsxs)("div", {
					className: "grow",
					children: [/* @__PURE__ */ (0, $.jsx)("div", { children: C(e) }), /* @__PURE__ */ (0, $.jsx)("div", {
						className: "muted",
						children: w(e)
					})]
				}), /* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn danger",
					disabled: d,
					onClick: () => y(n.filter((t) => String(t.id) !== String(e.id)), !1),
					children: "Delete"
				})]
			}, e.id)),
			!n.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No bindings yet." }),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "form",
				children: [
					/* @__PURE__ */ (0, $.jsx)("h3", { children: "Add a binding" }),
					/* @__PURE__ */ (0, $.jsxs)("div", {
						className: "fields",
						children: [/* @__PURE__ */ (0, $.jsxs)("label", {
							className: "f",
							children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Light or room" }), /* @__PURE__ */ (0, $.jsxs)("select", {
								value: c.target,
								onChange: (e) => u({
									...c,
									target: e.target.value
								}),
								children: [
									/* @__PURE__ */ (0, $.jsx)("option", {
										value: "",
										children: "Select a target…"
									}),
									/* @__PURE__ */ (0, $.jsx)("optgroup", {
										label: "Lights",
										children: T.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
											value: `light:${e.id}`,
											children: e.name
										}, e.id))
									}),
									/* @__PURE__ */ (0, $.jsx)("optgroup", {
										label: "Rooms",
										children: E.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
											value: `area:${e.id}`,
											children: e.name
										}, e.id))
									})
								]
							})]
						}), /* @__PURE__ */ (0, $.jsxs)("label", {
							className: "f",
							children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Remote" }), /* @__PURE__ */ (0, $.jsxs)("select", {
								value: c.device,
								onChange: (e) => v(e.target.value),
								children: [/* @__PURE__ */ (0, $.jsx)("option", {
									value: "",
									children: "Select a remote…"
								}), D.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
									value: e.id,
									children: e.name
								}, e.id))]
							})]
						})]
					}),
					c.device && /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
						k === "remote" ? /* @__PURE__ */ (0, $.jsxs)("div", {
							className: "fields",
							children: [
								/* @__PURE__ */ (0, $.jsxs)("label", {
									className: "f",
									children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Dim up (hold)" }), /* @__PURE__ */ (0, $.jsx)("select", {
										value: c.up,
										onChange: (e) => u({
											...c,
											up: e.target.value
										}),
										children: A
									})]
								}),
								/* @__PURE__ */ (0, $.jsxs)("label", {
									className: "f",
									children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Dim down (hold)" }), /* @__PURE__ */ (0, $.jsx)("select", {
										value: c.down,
										onChange: (e) => u({
											...c,
											down: e.target.value
										}),
										children: A
									})]
								}),
								/* @__PURE__ */ (0, $.jsxs)("label", {
									className: "f",
									children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Release (stop)" }), /* @__PURE__ */ (0, $.jsx)("select", {
										value: c.stop,
										onChange: (e) => u({
											...c,
											stop: e.target.value
										}),
										children: A
									})]
								})
							]
						}) : /* @__PURE__ */ (0, $.jsxs)("p", {
							className: "muted",
							children: [
								"This is a ",
								k === "door_window" ? "door/window" : "motion",
								" sensor, not a dimmer remote — use a press action below to react to it."
							]
						}),
						ee && !ee.triggers.length && /* @__PURE__ */ (0, $.jsx)("p", {
							className: "muted",
							children: "This device exposes no triggers."
						}),
						/* @__PURE__ */ (0, $.jsxs)("div", {
							className: "line",
							style: { marginTop: 14 },
							children: [/* @__PURE__ */ (0, $.jsx)("span", {
								className: "label grow",
								style: { margin: 0 },
								children: "Press actions"
							}), /* @__PURE__ */ (0, $.jsx)("button", {
								className: "btn",
								onClick: () => u({
									...c,
									presses: [...c.presses, ou]
								}),
								children: "+ Add press action"
							})]
						}),
						c.presses.map((e, t) => /* @__PURE__ */ (0, $.jsxs)("div", {
							className: "box",
							children: [
								/* @__PURE__ */ (0, $.jsxs)("div", {
									className: "fields press",
									style: { marginTop: 0 },
									children: [
										/* @__PURE__ */ (0, $.jsxs)("label", {
											className: "f",
											children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Trigger" }), /* @__PURE__ */ (0, $.jsx)("select", {
												value: e.trigger,
												onChange: (e) => j(t, { trigger: e.target.value }),
												children: A
											})]
										}),
										/* @__PURE__ */ (0, $.jsxs)("label", {
											className: "f",
											children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Action" }), /* @__PURE__ */ (0, $.jsxs)("select", {
												value: e.type,
												onChange: (e) => j(t, { type: e.target.value }),
												children: [/* @__PURE__ */ (0, $.jsx)("option", {
													value: "",
													children: "Select an action…"
												}), bl.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
													value: e,
													children: Ml[e]
												}, e))]
											})]
										}),
										/* @__PURE__ */ (0, $.jsx)("button", {
											className: "btn danger",
											"aria-label": "Remove press action",
											onClick: () => u({
												...c,
												presses: c.presses.filter((e, n) => n !== t)
											}),
											children: "✕"
										})
									]
								}),
								e.type === "scene" && /* @__PURE__ */ (0, $.jsxs)("label", {
									className: "f",
									style: { marginTop: 8 },
									children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Scene" }), /* @__PURE__ */ (0, $.jsxs)("select", {
										value: e.entity_id,
										onChange: (e) => j(t, { entity_id: e.target.value }),
										children: [/* @__PURE__ */ (0, $.jsx)("option", {
											value: "",
											children: "Select a scene…"
										}), O.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
											value: e.id,
											children: e.name
										}, e.id))]
									})]
								}),
								e.type === "service" && /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsxs)("div", {
									className: "fields",
									children: [/* @__PURE__ */ (0, $.jsxs)("label", {
										className: "f",
										children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Domain" }), /* @__PURE__ */ (0, $.jsx)("input", {
											value: e.domain,
											placeholder: "light",
											onChange: (e) => j(t, { domain: e.target.value })
										})]
									}), /* @__PURE__ */ (0, $.jsxs)("label", {
										className: "f",
										children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Service" }), /* @__PURE__ */ (0, $.jsx)("input", {
											value: e.service,
											placeholder: "turn_on",
											onChange: (e) => j(t, { service: e.target.value })
										})]
									})]
								}), /* @__PURE__ */ (0, $.jsxs)("label", {
									className: "f",
									style: { marginTop: 8 },
									children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Data (JSON, optional)" }), /* @__PURE__ */ (0, $.jsx)("textarea", {
										value: e.data,
										onChange: (e) => j(t, { data: e.target.value })
									})]
								})] })
							]
						}, t)),
						!c.presses.length && /* @__PURE__ */ (0, $.jsx)("p", {
							className: "muted",
							children: "No press actions yet."
						})
					] }),
					p ? /* @__PURE__ */ (0, $.jsx)("p", {
						className: "error",
						children: p
					}) : h && /* @__PURE__ */ (0, $.jsx)("p", {
						className: "notice",
						children: h
					}),
					/* @__PURE__ */ (0, $.jsx)("div", {
						className: "actions",
						children: /* @__PURE__ */ (0, $.jsx)("button", {
							className: "btn",
							disabled: d,
							onClick: b,
							children: d ? "Saving…" : "Add binding"
						})
					})
				]
			})
		] })]
	});
}
function lu({ hass: e }) {
	let [t, n] = (0, l.useState)(null), [r, i] = (0, l.useState)(null), [a, o] = (0, l.useState)(""), [s, c] = (0, l.useState)(!1), [u, d] = (0, l.useState)(""), [f, p] = (0, l.useState)(""), m = () => {
		o(""), e.callWS({ type: "plejd/settings/get" }).then((e) => {
			n(e), i(e);
		}).catch((e) => o(`Could not load settings: ${Pl(e)}`));
	};
	if ((0, l.useEffect)(m, []), !r || !t) return /* @__PURE__ */ (0, $.jsx)(Hl, {
		title: "Settings",
		children: a ? /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [/* @__PURE__ */ (0, $.jsx)("p", {
			className: "error",
			children: a
		}), /* @__PURE__ */ (0, $.jsx)("div", {
			className: "actions",
			children: /* @__PURE__ */ (0, $.jsx)("button", {
				className: "btn",
				onClick: m,
				children: "Retry"
			})
		})] }) : /* @__PURE__ */ (0, $.jsx)(Ul, { text: "Loading…" })
	});
	let h = (e) => {
		i({
			...r,
			...e
		}), p("");
	}, g = JSON.stringify(r) !== JSON.stringify(t), _ = async () => {
		c(!0), d(""), p("");
		try {
			let { transport: t, holiday_lights: n, holiday_window_start: i, holiday_window_end: a } = r, o = await e.callWS({
				type: "plejd/settings/set",
				transport: t,
				holiday_lights: n,
				holiday_window_start: i,
				holiday_window_end: a
			});
			p(o.reload_failed || "Saved."), m();
		} catch (e) {
			d(Pl(e));
		} finally {
			c(!1);
		}
	}, v = Object.values(e.states).filter((e) => e.entity_id.startsWith("light.")).sort((e, t) => Fl(e).localeCompare(Fl(t))), y = (e, t) => h({ holiday_lights: t ? [...r.holiday_lights, e] : r.holiday_lights.filter((t) => t !== e) });
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Settings",
		children: [
			r.has_gateway && /* @__PURE__ */ (0, $.jsxs)($.Fragment, { children: [
				/* @__PURE__ */ (0, $.jsx)("h3", { children: "Communication" }),
				/* @__PURE__ */ (0, $.jsxs)("label", {
					className: "f",
					children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Send commands via" }), /* @__PURE__ */ (0, $.jsx)("select", {
						value: r.transport,
						onChange: (e) => h({ transport: e.target.value }),
						children: Nl.map(([e, t]) => /* @__PURE__ */ (0, $.jsx)("option", {
							value: e,
							children: t
						}, e))
					})]
				}),
				/* @__PURE__ */ (0, $.jsx)("div", { className: "form" })
			] }),
			/* @__PURE__ */ (0, $.jsx)("h3", { children: "Holiday mode" }),
			/* @__PURE__ */ (0, $.jsx)("p", {
				className: "lead",
				children: "While the Holiday mode switch is on and the time is inside this window, a random subset of these lights turns on and off to make the home look lived-in. Pick none to use every Plejd light."
			}),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "fields",
				children: [/* @__PURE__ */ (0, $.jsxs)("label", {
					className: "f",
					children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Window start" }), /* @__PURE__ */ (0, $.jsx)("input", {
						type: "time",
						value: r.holiday_window_start,
						onChange: (e) => h({ holiday_window_start: e.target.value })
					})]
				}), /* @__PURE__ */ (0, $.jsxs)("label", {
					className: "f",
					children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Window end" }), /* @__PURE__ */ (0, $.jsx)("input", {
						type: "time",
						value: r.holiday_window_end,
						onChange: (e) => h({ holiday_window_end: e.target.value })
					})]
				})]
			}),
			/* @__PURE__ */ (0, $.jsx)("span", {
				className: "label",
				style: { marginTop: 10 },
				children: "Lights"
			}),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "checks col",
				children: [v.map((e) => /* @__PURE__ */ (0, $.jsxs)("label", { children: [/* @__PURE__ */ (0, $.jsx)("input", {
					type: "checkbox",
					checked: r.holiday_lights.includes(e.entity_id),
					onChange: (t) => y(e.entity_id, t.target.checked)
				}), Fl(e)] }, e.entity_id)), !v.length && /* @__PURE__ */ (0, $.jsx)(Ul, { text: "No Plejd lights found." })]
			}),
			u ? /* @__PURE__ */ (0, $.jsx)("p", {
				className: "error",
				children: u
			}) : f && /* @__PURE__ */ (0, $.jsx)("p", {
				className: "notice",
				children: f
			}),
			/* @__PURE__ */ (0, $.jsx)("div", {
				className: "actions",
				children: /* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn",
					disabled: s || !g,
					onClick: _,
					children: s ? "Saving…" : "Save"
				})
			})
		]
	});
}
function uu({ hass: e }) {
	let [t, n] = (0, l.useState)(null), [r, i] = (0, l.useState)(null), [a, o] = (0, l.useState)(""), [s, c] = (0, l.useState)(""), [u, d] = (0, l.useState)(""), [f, p] = (0, l.useState)(!1), [m, h] = (0, l.useState)(""), [g, _] = (0, l.useState)("");
	return /* @__PURE__ */ (0, $.jsxs)(Hl, {
		title: "Add a device",
		children: [
			/* @__PURE__ */ (0, $.jsx)("p", {
				className: "lead",
				children: "Power on a new Plejd device near a Bluetooth adapter or proxy, scan, then name it. It is registered in your Plejd account and joined to the mesh."
			}),
			t && !t.bluetooth && /* @__PURE__ */ (0, $.jsx)("p", {
				className: "error",
				children: "Bluetooth is not available on this Home Assistant instance. Add a local Bluetooth adapter or an ESPHome Bluetooth proxy (in active mode), then try again."
			}),
			t?.bluetooth && !t.devices.length && /* @__PURE__ */ (0, $.jsx)("p", {
				className: "muted",
				children: "No unprovisioned Plejd devices found nearby. Make sure the device is powered and in Bluetooth range, then scan again."
			}),
			t?.devices.map((e) => /* @__PURE__ */ (0, $.jsxs)("label", {
				className: "row line click",
				children: [/* @__PURE__ */ (0, $.jsx)("input", {
					type: "radio",
					name: "new-device",
					checked: r?.address === e.address,
					onChange: () => {
						i(e), o(e.name || e.model);
					}
				}), /* @__PURE__ */ (0, $.jsxs)("span", {
					className: "grow",
					children: [e.model, /* @__PURE__ */ (0, $.jsxs)("div", {
						className: "muted",
						children: [
							e.address,
							" · RSSI ",
							e.rssi
						]
					})]
				})]
			}, e.address)),
			r && /* @__PURE__ */ (0, $.jsxs)("div", {
				className: "fields",
				children: [
					/* @__PURE__ */ (0, $.jsxs)("label", {
						className: "f",
						children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Name" }), /* @__PURE__ */ (0, $.jsx)("input", {
							value: a,
							onChange: (e) => o(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, $.jsxs)("label", {
						className: "f",
						children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "New room (optional)" }), /* @__PURE__ */ (0, $.jsx)("input", {
							value: s,
							onChange: (e) => c(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, $.jsxs)("label", {
						className: "f",
						children: [/* @__PURE__ */ (0, $.jsx)("span", { children: "Room category (optional)" }), /* @__PURE__ */ (0, $.jsxs)("select", {
							value: u,
							onChange: (e) => d(e.target.value),
							children: [/* @__PURE__ */ (0, $.jsx)("option", {
								value: "",
								children: "(default)"
							}), t.room_categories.map((e) => /* @__PURE__ */ (0, $.jsx)("option", {
								value: e,
								children: e
							}, e))]
						})]
					})
				]
			}),
			m ? /* @__PURE__ */ (0, $.jsx)("p", {
				className: "error",
				children: m
			}) : g && /* @__PURE__ */ (0, $.jsx)("p", {
				className: "notice",
				children: g
			}),
			/* @__PURE__ */ (0, $.jsxs)("div", {
				className: "actions",
				children: [/* @__PURE__ */ (0, $.jsx)("button", {
					className: `btn ${r ? "ghost" : ""}`,
					disabled: f,
					onClick: () => {
						h(""), _(""), i(null), e.callWS({ type: "plejd/devices/scan" }).then(n).catch((e) => h(Pl(e)));
					},
					children: t ? "Scan again" : "Scan"
				}), r && /* @__PURE__ */ (0, $.jsx)("button", {
					className: "btn",
					disabled: f,
					onClick: async () => {
						if (r) {
							if (!a.trim()) h("Enter a name for the device.");
							else {
								p(!0), h(""), _("");
								try {
									await e.callService("plejd", "add_device", {
										device_address: r.address,
										name: a.trim(),
										hardware_id: r.hardware_id,
										firmware_build_time: r.firmware_build_time,
										...s.trim() ? { room_title: s.trim() } : {},
										...u ? { room_category: u } : {}
									}), _(`${a.trim()} added.`), i(null), o(""), c(""), d(""), n(null);
								} catch (e) {
									h(`Failed to add the device: ${Pl(e)}`);
								} finally {
									p(!1);
								}
							}
						}
					},
					children: f ? "Adding…" : "Add device"
				})]
			})
		]
	});
}
//#endregion
//#region src/styles.css?inline
var du = ":host{--pl-bg:var(--primary-background-color,#f4f6f9);--pl-card:var(--card-background-color,#fff);--pl-text:var(--primary-text-color,#1d2330);--pl-muted:var(--secondary-text-color,#6b7484);--pl-line:color-mix(in srgb, var(--pl-muted) 18%, transparent);--pl-field:var(--secondary-background-color,#fafafa);--pl-accent:var(--primary-color,#03a9f4);--pl-on:var(--state-light-active-color,#fdd835);--pl-neg:var(--error-color,#db4437);--pl-radius:16px;display:block}*{box-sizing:border-box}.page{max-width:1180px;min-height:100vh;color:var(--pl-text);font:14px/1.45 var(--paper-font-body1_-_font-family,Inter, Roboto, system-ui, sans-serif);background:var(--pl-bg);margin:0 auto;padding:20px 28px 56px}.page.narrow{padding:10px 10px 40px}header{z-index:2;background:var(--pl-bg);flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin:-20px -28px 18px;padding:20px 28px 12px;display:flex;position:sticky;top:0}.narrow header{margin:-10px -10px 14px;padding:10px 10px 8px}h1{letter-spacing:-.02em;margin:0;font-size:26px;font-weight:600}h2{margin:0;font-size:15px;font-weight:600}h3{margin:0 0 10px;font-size:13.5px;font-weight:600}.tabs{background:var(--pl-card);border:1px solid var(--pl-line);border-radius:999px;gap:2px;max-width:100%;padding:4px;display:inline-flex;overflow-x:auto}.tabs button{color:var(--pl-muted);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:0;border-radius:999px;padding:7px 14px;font-weight:500}.tabs button:hover{color:var(--pl-text)}.tabs button.on{background:var(--pl-accent);color:var(--text-primary-color,#fff)}.grid{grid-template-columns:repeat(auto-fit,minmax(340px,1fr));align-items:start;gap:16px;display:grid}.narrow .grid{grid-template-columns:1fr}.card{background:var(--pl-card);border-radius:var(--pl-radius);border:1px solid var(--pl-line);min-width:0;padding:18px;box-shadow:0 1px 2px #0000000a,0 8px 24px -12px #0000001f}.card.wide{grid-column:1/-1}.rooms{grid-column:1/-1;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));align-items:start;gap:16px;display:grid}.rooms>.card.wide{grid-column:1/-1}.room{padding:14px 14px 10px}.room.big{grid-column:span 2}.narrow .room.big{grid-column:auto}input[type=range].idle{opacity:.35}.room-head{align-items:center;gap:10px;margin-bottom:8px;display:flex}.room-head h2{line-height:1.2}.room-control{align-items:center;gap:10px;display:flex}.room-control input[type=range]{width:90px;margin:0}button.icon{color:var(--pl-muted);cursor:pointer;background:0 0;border:0;border-radius:8px;padding:4px 7px;font-size:15px}button.icon.on,button.icon:hover{color:var(--pl-accent);background:color-mix(in srgb, var(--pl-accent) 12%, transparent)}.tiles{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;display:grid}.tile{text-align:center;background:color-mix(in srgb, var(--pl-muted) 6%, transparent);border-radius:12px;min-width:0;padding:6px 6px 8px}.tile.lit{background:radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--pl-on) 22%, transparent), transparent 70%), color-mix(in srgb, var(--pl-muted) 6%, transparent)}.tile .lamp{cursor:pointer;aspect-ratio:1;background:0 0;border:0;width:100%;padding:0;display:block}.tile .lamp:disabled{cursor:not-allowed}.tile .lamp img{object-fit:contain;width:100%;height:100%;display:block}.tile-name{white-space:nowrap;text-overflow:ellipsis;font-size:12.5px;font-weight:500;overflow:hidden}.tile input[type=range]{margin-top:4px}.tile select{margin-top:4px;padding:4px 6px;font-size:12px}.card-head{justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px;display:flex}.count,.muted{color:var(--pl-muted)}.muted{font-size:12.5px}.lead{color:var(--pl-muted);margin:0 0 12px}.error{color:var(--pl-neg);margin:10px 0 0}.notice{color:var(--pl-muted);margin:10px 0 0}.row{border-bottom:1px solid var(--pl-line);padding:10px 2px}.row:last-child{border-bottom:0}.line{align-items:center;gap:12px;display:flex}.grow{flex:1;min-width:0}.click{cursor:pointer}.off{opacity:.5;cursor:not-allowed}.dot{background:var(--disabled-text-color,#9e9e9e);border-radius:50%;flex:none;width:10px;height:10px}.dot.on{background:var(--pl-on)}.dot.bad{background:var(--pl-neg)}.switch{cursor:pointer;background:var(--disabled-text-color,#9e9e9e);border:0;border-radius:10px;flex:none;width:34px;height:20px;padding:0;position:relative}.switch.on{background:var(--pl-accent)}.switch:after{content:\"\";background:#fff;border-radius:50%;width:16px;height:16px;transition:left .15s;position:absolute;top:2px;left:2px;box-shadow:0 1px 2px #0000004d}.switch.on:after{left:16px}.switch:disabled{opacity:.5;cursor:not-allowed}input[type=range]{width:100%;accent-color:var(--pl-accent);margin-top:6px}.line input[type=range]{flex:1;margin:0}button.btn{font:inherit;cursor:pointer;background:var(--pl-accent);color:var(--text-primary-color,#fff);border:0;border-radius:8px;padding:8px 14px}button.btn.ghost{background:var(--pl-muted)}button.btn.danger{background:var(--pl-neg)}button.btn.small{padding:4px 12px}button.btn:disabled{opacity:.5;cursor:not-allowed}.temp{text-align:center;min-width:56px}.form{border-top:1px solid var(--pl-line);margin-top:14px;padding-top:12px}.fields{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px;display:grid}.fields.press{grid-template-columns:1fr 1fr auto;align-items:end}label.f{display:block}label.f>span,.label{color:var(--pl-muted);margin:0 0 4px;font-size:12px;display:block}input:not([type]),input[type=text],input[type=time],input[type=number],select,textarea{border:1px solid var(--pl-line);background:var(--pl-field);width:100%;color:var(--pl-text);font:inherit;border-radius:8px;padding:8px 10px}textarea{min-height:56px;font-family:monospace}.box{border:1px solid var(--pl-line);border-radius:8px;margin-top:8px;padding:10px}.checks{flex-wrap:wrap;gap:12px;display:flex}.checks label{align-items:center;gap:4px;display:flex}.checks.col{flex-direction:column;gap:4px;max-height:240px;overflow-y:auto}.actions{justify-content:flex-end;gap:8px;margin-top:14px;display:flex}", fu = class extends HTMLElement {
	root;
	_hass;
	_narrow = !1;
	set hass(e) {
		this._hass = e, this.render();
	}
	set narrow(e) {
		this._narrow = e, this.render();
	}
	connectedCallback() {
		if (this.root) return;
		let e = this.shadowRoot ?? this.attachShadow({ mode: "open" });
		e.replaceChildren();
		let t = document.createElement("style");
		t.textContent = du;
		let n = document.createElement("div");
		e.append(t, n), this.root = (0, u.createRoot)(n), this.render();
	}
	disconnectedCallback() {
		this.root?.unmount(), this.root = void 0;
	}
	render() {
		this.root && this._hass && this.root.render(/* @__PURE__ */ (0, $.jsx)(Vl, {
			hass: this._hass,
			narrow: this._narrow
		}));
	}
};
customElements.get("plejd-panel") ? location.reload() : customElements.define("plejd-panel", fu);
//#endregion
