(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
/*!
	query-string
	Parse and stringify URL query strings
	https://github.com/sindresorhus/query-string
	by Sindre Sorhus
	MIT License
*/
(function () {
	'use strict';
	var queryString = {};

	queryString.parse = function (str) {
		if (typeof str !== 'string') {
			return {};
		}

		str = str.trim().replace(/^(\?|#)/, '');

		if (!str) {
			return {};
		}

		return str.trim().split('&').reduce(function (ret, param) {
			var parts = param.replace(/\+/g, ' ').split('=');
			var key = parts[0];
			var val = parts[1];

			key = decodeURIComponent(key);
			// missing `=` should be `null`:
			// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
			val = val === undefined ? null : decodeURIComponent(val);

			if (!ret.hasOwnProperty(key)) {
				ret[key] = val;
			} else if (Array.isArray(ret[key])) {
				ret[key].push(val);
			} else {
				ret[key] = [ret[key], val];
			}

			return ret;
		}, {});
	};

	queryString.stringify = function (obj) {
		return obj ? Object.keys(obj).map(function (key) {
			var val = obj[key];

			if (Array.isArray(val)) {
				return val.map(function (val2) {
					return encodeURIComponent(key) + '=' + encodeURIComponent(val2);
				}).join('&');
			}

			return encodeURIComponent(key) + '=' + encodeURIComponent(val);
		}).join('&') : '';
	};

	if (typeof define === 'function' && define.amd) {
		define(function() { return queryString; });
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = queryString;
	} else {
		self.queryString = queryString;
	}
})();

},{}],3:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter,
    queryString = require('query-string');

function tryParseJson(data){
    try{
        return JSON.parse(data);
    }catch(error){
        return error;
    }
}

function timeout(){
   this.request.abort();
   this.emit('timeout');
}

function Ajax(settings){
    var queryStringData,
        ajax = this;

    if(typeof settings === 'string'){
        settings = {
            url: settings
        };
    }

    if(typeof settings !== 'object'){
        settings = {};
    }

    ajax.settings = settings;
    ajax.request = new window.XMLHttpRequest();
    ajax.settings.method = ajax.settings.method || 'get';

    if(ajax.settings.cors){
        if ('withCredentials' in ajax.request) {
            ajax.request.withCredentials = !!settings.withCredentials;
        } else if (typeof XDomainRequest !== 'undefined') {
            // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
            ajax.request = new window.XDomainRequest();
        } else {
            // Otherwise, CORS is not supported by the browser.
            ajax.emit('error', new Error('Cors is not supported by this browser'));
        }
    }

    if(ajax.settings.cache === false){
        ajax.settings.data = ajax.settings.data || {};
        ajax.settings.data._ = new Date().getTime();
    }

    if(ajax.settings.method.toLowerCase() === 'get' && typeof ajax.settings.data === 'object'){
        var urlParts = ajax.settings.url.split('?');

        queryStringData = queryString.parse(urlParts[1]);

        for(var key in ajax.settings.data){
            queryStringData[key] = ajax.settings.data[key];
        }

        ajax.settings.url = urlParts[0] + '?' + queryString.stringify(queryStringData);
        ajax.settings.data = null;
    }

    ajax.request.addEventListener('progress', function(event){
        ajax.emit('progress', event);
    }, false);

    ajax.request.addEventListener('load', function(event){
        var data = event.target.responseText;

        if(ajax.settings.dataType && ajax.settings.dataType.toLowerCase() === 'json'){
            if(data === ''){
                data = undefined;
            }else{
                data = tryParseJson(data);
                if(data instanceof Error){
                    ajax.emit('error', event, data);
                    return;
                }
            }
        }

        if(event.target.status >= 400){
            ajax.emit('error', event, data);
        } else {
            ajax.emit('success', event, data);
        }

    }, false);

    ajax.request.addEventListener('error', function(event){
        ajax.emit('error', event);
    }, false);

    ajax.request.addEventListener('abort', function(event){
        ajax.emit('error', event, new Error('Connection Aborted'));
        ajax.emit('abort', event);
    }, false);

    ajax.request.addEventListener('loadend', function(event){
        clearTimeout(this._requestTimeout);
        ajax.emit('complete', event);
    }, false);

    ajax.request.open(ajax.settings.method || 'get', ajax.settings.url, true);

    // Set default headers
    if(ajax.settings.contentType !== false){
        ajax.request.setRequestHeader('Content-Type', ajax.settings.contentType || 'application/json; charset=utf-8');
    }
    ajax.request.setRequestHeader('X-Requested-With', ajax.settings.requestedWith || 'XMLHttpRequest');
    if(ajax.settings.auth){
        ajax.request.setRequestHeader('Authorization', ajax.settings.auth);
    }

    // Set custom headers
    for(var headerKey in ajax.settings.headers){
        ajax.request.setRequestHeader(headerKey, ajax.settings.headers[headerKey]);
    }

    if(ajax.settings.processData !== false && ajax.settings.dataType === 'json'){
        ajax.settings.data = JSON.stringify(ajax.settings.data);
    }
}

Ajax.prototype = Object.create(EventEmitter.prototype);

Ajax.prototype.send = function(){
    this._requestTimeout = setTimeout(
        timeout.bind(this),
        this.settings.timeout || 120000
    );
    this.request.send(this.settings.data && this.settings.data);
};

module.exports = Ajax;
},{"events":1,"query-string":2}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _simpleAjax = require('simple-ajax');

var _simpleAjax2 = _interopRequireDefault(_simpleAjax);

var _extend = require('./extend.js');

var _extend2 = _interopRequireDefault(_extend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BASE_URL = 'http://jsonplaceholder.typicode.com/';

var _defaultOptions = {
    url: '',
    method: 'GET',
    cors: false,
    cache: false,
    data: null,
    dataType: 'JSON',
    contentType: 'content/json',
    requestWith: 'XMLHttpRequest',
    auth: null,
    headers: ''
};

function _makeRequest(action, customOptions) {
    return new Promise(function (success, failure) {
        var options = (0, _extend2.default)(_defaultOptions, customOptions);
        options.url = BASE_URL + action;

        console.log("Launching request to ", options.url);
        var request = new _simpleAjax2.default(options);
        request.on('success', function (e, data) {
            success({
                event: e,
                data: data
            });
        });
        request.on('error', failure);
        request.send();
    });
}

var _class = function () {
    function _class() {
        _classCallCheck(this, _class);
    }

    _createClass(_class, [{
        key: 'get',
        value: function get(action) {
            return _makeRequest(action, {
                method: 'GET'
            });
        }
    }, {
        key: 'post',
        value: function post(action) {
            return _makeRequest(action, {
                method: 'POST'
            });
        }
    }]);

    return _class;
}();

exports.default = _class;

},{"./extend.js":6,"simple-ajax":3}],5:[function(require,module,exports){
'use strict';

var _AjaxManager = require('./AjaxManager.js');

var _AjaxManager2 = _interopRequireDefault(_AjaxManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makeAjaxRequest(action, resultHandler) {
    manager.get(action).then(function (result) {
        var resultArea = document.getElementById('result');
        resultArea.innerHTML = '';
        resultHandler(result, resultArea);
    }, function (failure) {
        return console.error(failure);
    });
}
var manager = new _AjaxManager2.default();

var postsButton = document.getElementById('posts');
postsButton.addEventListener('click', function () {
    makeAjaxRequest('posts', function (result, resultArea) {
        var data = result.data;
        for (var i = 0; i < data.length; i++) {
            resultArea.innerHTML += "<p>User id: " + data[i].userId + "</p>";
            resultArea.innerHTML += "<p>Title: " + data[i].title + "</p>";
            resultArea.innerHTML += "<p>Comment: " + data[i].body + "</p>";
            resultArea.innerHTML += "<br />";

            if (i > 10) {
                break; // Let's not go overboard
            }
        }
    });
}, false);

var commentsButton = document.getElementById('comments');
commentsButton.addEventListener('click', function () {
    makeAjaxRequest('comments', function (result, resultArea) {
        var data = result.data;
        for (var i = 0; i < data.length; i++) {
            resultArea.innerHTML += "<p>Username: " + data[i].name + "</p>";
            resultArea.innerHTML += "<p>Email: " + data[i].email + "</p>";
            resultArea.innerHTML += "<p>Comment: " + data[i].body + "</p>";
            resultArea.innerHTML += "<br />";

            if (i > 10) {
                break;
            }
        }
    });
}, false);

},{"./AjaxManager.js":4}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function () {

    // Variables
    var extended = {};
    var deep = false;
    var i = 0;
    var length = arguments.length;

    // Check if a deep merge
    if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
        deep = arguments[0];
        i++;
    }

    // Merge the object into the extended object
    var merge = function merge(obj) {
        for (var prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                // If deep merge and property is an object, merge properties
                if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
                    extended[prop] = extend(true, extended[prop], obj[prop]);
                } else {
                    extended[prop] = obj[prop];
                }
            }
        }
    };

    // Loop through each object and conduct a merge
    for (; i < length; i++) {
        var obj = arguments[i];
        merge(obj);
    }

    return extended;
};

; // Snatched from http://gomakethings.com/vanilla-javascript-version-of-jquery-extend/

// Pass in the objects to merge as arguments.
// For a deep extend, set the first argument to `true`.

},{}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9xdWVyeS1zdHJpbmcvcXVlcnktc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL3NpbXBsZS1hamF4L2luZGV4LmpzIiwic3JjXFxqc1xcQWpheE1hbmFnZXIuanMiLCJzcmNcXGpzXFxhcHAuanMiLCJzcmNcXGpzXFxleHRlbmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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LEVBQXdCO0FBQ3BCLGdCQUFLLE9BQU8sU0FBUCxDQUFpQixjQUFqQixDQUFnQyxJQUFoQyxDQUFzQyxHQUF0QyxFQUEyQyxJQUEzQyxDQUFMLEVBQXlEOztBQUVyRCxvQkFBSyxRQUFRLE9BQU8sU0FBUCxDQUFpQixRQUFqQixDQUEwQixJQUExQixDQUErQixJQUFJLElBQUosQ0FBL0IsTUFBOEMsaUJBQTlDLEVBQWtFO0FBQzNFLDZCQUFTLElBQVQsSUFBaUIsT0FBUSxJQUFSLEVBQWMsU0FBUyxJQUFULENBQWQsRUFBOEIsSUFBSSxJQUFKLENBQTlCLENBQWpCLENBRDJFO2lCQUEvRSxNQUVPO0FBQ0gsNkJBQVMsSUFBVCxJQUFpQixJQUFJLElBQUosQ0FBakIsQ0FERztpQkFGUDthQUZKO1NBREo7S0FEUTs7O0FBZlUsV0E2QmQsSUFBSSxNQUFKLEVBQVksR0FBcEIsRUFBMEI7QUFDdEIsWUFBSSxNQUFNLFVBQVUsQ0FBVixDQUFOLENBRGtCO0FBRXRCLGNBQU0sR0FBTixFQUZzQjtLQUExQjs7QUFLQSxXQUFPLFFBQVAsQ0FsQ3NCO0NBQVg7O0FBbUNkIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgICBpZiAoaXNGdW5jdGlvbihldmxpc3RlbmVyKSlcbiAgICAgIHJldHVybiAxO1xuICAgIGVsc2UgaWYgKGV2bGlzdGVuZXIpXG4gICAgICByZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIDA7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8qIVxuXHRxdWVyeS1zdHJpbmdcblx0UGFyc2UgYW5kIHN0cmluZ2lmeSBVUkwgcXVlcnkgc3RyaW5nc1xuXHRodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZ1xuXHRieSBTaW5kcmUgU29yaHVzXG5cdE1JVCBMaWNlbnNlXG4qL1xuKGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXHR2YXIgcXVlcnlTdHJpbmcgPSB7fTtcblxuXHRxdWVyeVN0cmluZy5wYXJzZSA9IGZ1bmN0aW9uIChzdHIpIHtcblx0XHRpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHJldHVybiB7fTtcblx0XHR9XG5cblx0XHRzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoL14oXFw/fCMpLywgJycpO1xuXG5cdFx0aWYgKCFzdHIpIHtcblx0XHRcdHJldHVybiB7fTtcblx0XHR9XG5cblx0XHRyZXR1cm4gc3RyLnRyaW0oKS5zcGxpdCgnJicpLnJlZHVjZShmdW5jdGlvbiAocmV0LCBwYXJhbSkge1xuXHRcdFx0dmFyIHBhcnRzID0gcGFyYW0ucmVwbGFjZSgvXFwrL2csICcgJykuc3BsaXQoJz0nKTtcblx0XHRcdHZhciBrZXkgPSBwYXJ0c1swXTtcblx0XHRcdHZhciB2YWwgPSBwYXJ0c1sxXTtcblxuXHRcdFx0a2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cdFx0XHQvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuXHRcdFx0Ly8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuXHRcdFx0dmFsID0gdmFsID09PSB1bmRlZmluZWQgPyBudWxsIDogZGVjb2RlVVJJQ29tcG9uZW50KHZhbCk7XG5cblx0XHRcdGlmICghcmV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0cmV0W2tleV0gPSB2YWw7XG5cdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmV0W2tleV0pKSB7XG5cdFx0XHRcdHJldFtrZXldLnB1c2godmFsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldFtrZXldID0gW3JldFtrZXldLCB2YWxdO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmV0O1xuXHRcdH0sIHt9KTtcblx0fTtcblxuXHRxdWVyeVN0cmluZy5zdHJpbmdpZnkgPSBmdW5jdGlvbiAob2JqKSB7XG5cdFx0cmV0dXJuIG9iaiA/IE9iamVjdC5rZXlzKG9iaikubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdHZhciB2YWwgPSBvYmpba2V5XTtcblxuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuXHRcdFx0XHRyZXR1cm4gdmFsLm1hcChmdW5jdGlvbiAodmFsMikge1xuXHRcdFx0XHRcdHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWwyKTtcblx0XHRcdFx0fSkuam9pbignJicpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsKTtcblx0XHR9KS5qb2luKCcmJykgOiAnJztcblx0fTtcblxuXHRpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG5cdFx0ZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gcXVlcnlTdHJpbmc7IH0pO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBxdWVyeVN0cmluZztcblx0fSBlbHNlIHtcblx0XHRzZWxmLnF1ZXJ5U3RyaW5nID0gcXVlcnlTdHJpbmc7XG5cdH1cbn0pKCk7XG4iLCJ2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyLFxuICAgIHF1ZXJ5U3RyaW5nID0gcmVxdWlyZSgncXVlcnktc3RyaW5nJyk7XG5cbmZ1bmN0aW9uIHRyeVBhcnNlSnNvbihkYXRhKXtcbiAgICB0cnl7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH1jYXRjaChlcnJvcil7XG4gICAgICAgIHJldHVybiBlcnJvcjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRpbWVvdXQoKXtcbiAgIHRoaXMucmVxdWVzdC5hYm9ydCgpO1xuICAgdGhpcy5lbWl0KCd0aW1lb3V0Jyk7XG59XG5cbmZ1bmN0aW9uIEFqYXgoc2V0dGluZ3Mpe1xuICAgIHZhciBxdWVyeVN0cmluZ0RhdGEsXG4gICAgICAgIGFqYXggPSB0aGlzO1xuXG4gICAgaWYodHlwZW9mIHNldHRpbmdzID09PSAnc3RyaW5nJyl7XG4gICAgICAgIHNldHRpbmdzID0ge1xuICAgICAgICAgICAgdXJsOiBzZXR0aW5nc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ29iamVjdCcpe1xuICAgICAgICBzZXR0aW5ncyA9IHt9O1xuICAgIH1cblxuICAgIGFqYXguc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICBhamF4LnJlcXVlc3QgPSBuZXcgd2luZG93LlhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgYWpheC5zZXR0aW5ncy5tZXRob2QgPSBhamF4LnNldHRpbmdzLm1ldGhvZCB8fCAnZ2V0JztcblxuICAgIGlmKGFqYXguc2V0dGluZ3MuY29ycyl7XG4gICAgICAgIGlmICgnd2l0aENyZWRlbnRpYWxzJyBpbiBhamF4LnJlcXVlc3QpIHtcbiAgICAgICAgICAgIGFqYXgucmVxdWVzdC53aXRoQ3JlZGVudGlhbHMgPSAhIXNldHRpbmdzLndpdGhDcmVkZW50aWFscztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgWERvbWFpblJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBYRG9tYWluUmVxdWVzdCBvbmx5IGV4aXN0cyBpbiBJRSwgYW5kIGlzIElFJ3Mgd2F5IG9mIG1ha2luZyBDT1JTIHJlcXVlc3RzLlxuICAgICAgICAgICAgYWpheC5yZXF1ZXN0ID0gbmV3IHdpbmRvdy5YRG9tYWluUmVxdWVzdCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlLCBDT1JTIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGJyb3dzZXIuXG4gICAgICAgICAgICBhamF4LmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdDb3JzIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhpcyBicm93c2VyJykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYoYWpheC5zZXR0aW5ncy5jYWNoZSA9PT0gZmFsc2Upe1xuICAgICAgICBhamF4LnNldHRpbmdzLmRhdGEgPSBhamF4LnNldHRpbmdzLmRhdGEgfHwge307XG4gICAgICAgIGFqYXguc2V0dGluZ3MuZGF0YS5fID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYoYWpheC5zZXR0aW5ncy5tZXRob2QudG9Mb3dlckNhc2UoKSA9PT0gJ2dldCcgJiYgdHlwZW9mIGFqYXguc2V0dGluZ3MuZGF0YSA9PT0gJ29iamVjdCcpe1xuICAgICAgICB2YXIgdXJsUGFydHMgPSBhamF4LnNldHRpbmdzLnVybC5zcGxpdCgnPycpO1xuXG4gICAgICAgIHF1ZXJ5U3RyaW5nRGF0YSA9IHF1ZXJ5U3RyaW5nLnBhcnNlKHVybFBhcnRzWzFdKTtcblxuICAgICAgICBmb3IodmFyIGtleSBpbiBhamF4LnNldHRpbmdzLmRhdGEpe1xuICAgICAgICAgICAgcXVlcnlTdHJpbmdEYXRhW2tleV0gPSBhamF4LnNldHRpbmdzLmRhdGFba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFqYXguc2V0dGluZ3MudXJsID0gdXJsUGFydHNbMF0gKyAnPycgKyBxdWVyeVN0cmluZy5zdHJpbmdpZnkocXVlcnlTdHJpbmdEYXRhKTtcbiAgICAgICAgYWpheC5zZXR0aW5ncy5kYXRhID0gbnVsbDtcbiAgICB9XG5cbiAgICBhamF4LnJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBmdW5jdGlvbihldmVudCl7XG4gICAgICAgIGFqYXguZW1pdCgncHJvZ3Jlc3MnLCBldmVudCk7XG4gICAgfSwgZmFsc2UpO1xuXG4gICAgYWpheC5yZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbihldmVudCl7XG4gICAgICAgIHZhciBkYXRhID0gZXZlbnQudGFyZ2V0LnJlc3BvbnNlVGV4dDtcblxuICAgICAgICBpZihhamF4LnNldHRpbmdzLmRhdGFUeXBlICYmIGFqYXguc2V0dGluZ3MuZGF0YVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ2pzb24nKXtcbiAgICAgICAgICAgIGlmKGRhdGEgPT09ICcnKXtcbiAgICAgICAgICAgICAgICBkYXRhID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgZGF0YSA9IHRyeVBhcnNlSnNvbihkYXRhKTtcbiAgICAgICAgICAgICAgICBpZihkYXRhIGluc3RhbmNlb2YgRXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICBhamF4LmVtaXQoJ2Vycm9yJywgZXZlbnQsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYoZXZlbnQudGFyZ2V0LnN0YXR1cyA+PSA0MDApe1xuICAgICAgICAgICAgYWpheC5lbWl0KCdlcnJvcicsIGV2ZW50LCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFqYXguZW1pdCgnc3VjY2VzcycsIGV2ZW50LCBkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgfSwgZmFsc2UpO1xuXG4gICAgYWpheC5yZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICBhamF4LmVtaXQoJ2Vycm9yJywgZXZlbnQpO1xuICAgIH0sIGZhbHNlKTtcblxuICAgIGFqYXgucmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgYWpheC5lbWl0KCdlcnJvcicsIGV2ZW50LCBuZXcgRXJyb3IoJ0Nvbm5lY3Rpb24gQWJvcnRlZCcpKTtcbiAgICAgICAgYWpheC5lbWl0KCdhYm9ydCcsIGV2ZW50KTtcbiAgICB9LCBmYWxzZSk7XG5cbiAgICBhamF4LnJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVuZCcsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3JlcXVlc3RUaW1lb3V0KTtcbiAgICAgICAgYWpheC5lbWl0KCdjb21wbGV0ZScsIGV2ZW50KTtcbiAgICB9LCBmYWxzZSk7XG5cbiAgICBhamF4LnJlcXVlc3Qub3BlbihhamF4LnNldHRpbmdzLm1ldGhvZCB8fCAnZ2V0JywgYWpheC5zZXR0aW5ncy51cmwsIHRydWUpO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgaGVhZGVyc1xuICAgIGlmKGFqYXguc2V0dGluZ3MuY29udGVudFR5cGUgIT09IGZhbHNlKXtcbiAgICAgICAgYWpheC5yZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsIGFqYXguc2V0dGluZ3MuY29udGVudFR5cGUgfHwgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnKTtcbiAgICB9XG4gICAgYWpheC5yZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoJ1gtUmVxdWVzdGVkLVdpdGgnLCBhamF4LnNldHRpbmdzLnJlcXVlc3RlZFdpdGggfHwgJ1hNTEh0dHBSZXF1ZXN0Jyk7XG4gICAgaWYoYWpheC5zZXR0aW5ncy5hdXRoKXtcbiAgICAgICAgYWpheC5yZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBhamF4LnNldHRpbmdzLmF1dGgpO1xuICAgIH1cblxuICAgIC8vIFNldCBjdXN0b20gaGVhZGVyc1xuICAgIGZvcih2YXIgaGVhZGVyS2V5IGluIGFqYXguc2V0dGluZ3MuaGVhZGVycyl7XG4gICAgICAgIGFqYXgucmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlcktleSwgYWpheC5zZXR0aW5ncy5oZWFkZXJzW2hlYWRlcktleV0pO1xuICAgIH1cblxuICAgIGlmKGFqYXguc2V0dGluZ3MucHJvY2Vzc0RhdGEgIT09IGZhbHNlICYmIGFqYXguc2V0dGluZ3MuZGF0YVR5cGUgPT09ICdqc29uJyl7XG4gICAgICAgIGFqYXguc2V0dGluZ3MuZGF0YSA9IEpTT04uc3RyaW5naWZ5KGFqYXguc2V0dGluZ3MuZGF0YSk7XG4gICAgfVxufVxuXG5BamF4LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5cbkFqYXgucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuX3JlcXVlc3RUaW1lb3V0ID0gc2V0VGltZW91dChcbiAgICAgICAgdGltZW91dC5iaW5kKHRoaXMpLFxuICAgICAgICB0aGlzLnNldHRpbmdzLnRpbWVvdXQgfHwgMTIwMDAwXG4gICAgKTtcbiAgICB0aGlzLnJlcXVlc3Quc2VuZCh0aGlzLnNldHRpbmdzLmRhdGEgJiYgdGhpcy5zZXR0aW5ncy5kYXRhKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQWpheDsiLCJpbXBvcnQgQWpheCBmcm9tICdzaW1wbGUtYWpheCc7XHJcbmltcG9ydCBleHRlbmQgZnJvbSAnLi9leHRlbmQuanMnO1xyXG5cclxuY29uc3QgQkFTRV9VUkwgPSAnaHR0cDovL2pzb25wbGFjZWhvbGRlci50eXBpY29kZS5jb20vJztcclxuXHJcbmxldCBfZGVmYXVsdE9wdGlvbnMgPSB7XHJcbiAgICB1cmw6ICcnLFxyXG4gICAgbWV0aG9kOiAnR0VUJyxcclxuICAgIGNvcnM6IGZhbHNlLFxyXG4gICAgY2FjaGU6IGZhbHNlLFxyXG4gICAgZGF0YTogbnVsbCxcclxuICAgIGRhdGFUeXBlOiAnSlNPTicsXHJcbiAgICBjb250ZW50VHlwZTogJ2NvbnRlbnQvanNvbicsXHJcbiAgICByZXF1ZXN0V2l0aDogJ1hNTEh0dHBSZXF1ZXN0JyxcclxuICAgIGF1dGg6IG51bGwsXHJcbiAgICBoZWFkZXJzOiAnJ1xyXG59O1xyXG5cclxuZnVuY3Rpb24gX21ha2VSZXF1ZXN0KGFjdGlvbiwgY3VzdG9tT3B0aW9ucykge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChzdWNjZXNzLCBmYWlsdXJlKSB7XHJcbiAgICAgICAgbGV0IG9wdGlvbnMgPSBleHRlbmQoX2RlZmF1bHRPcHRpb25zLCBjdXN0b21PcHRpb25zKTtcclxuICAgICAgICBvcHRpb25zLnVybCA9IEJBU0VfVVJMICsgYWN0aW9uO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIkxhdW5jaGluZyByZXF1ZXN0IHRvIFwiLCBvcHRpb25zLnVybCk7XHJcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgQWpheChvcHRpb25zKTtcclxuICAgICAgICByZXF1ZXN0Lm9uKCdzdWNjZXNzJywgKGUsIGRhdGEpID0+IHtcclxuICAgICAgICAgICAgc3VjY2Vzcyh7XHJcbiAgICAgICAgICAgICAgICBldmVudDogZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmVxdWVzdC5vbignZXJyb3InLCBmYWlsdXJlKTtcclxuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XHJcbiAgICBnZXQoYWN0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIF9tYWtlUmVxdWVzdChhY3Rpb24sIHtcclxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwb3N0KGFjdGlvbikge1xyXG4gICAgICAgIHJldHVybiBfbWFrZVJlcXVlc3QoYWN0aW9uLCB7XHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0iLCJpbXBvcnQgQWpheE1hbmFnZXIgZnJvbSAnLi9BamF4TWFuYWdlci5qcyc7XHJcblxyXG5mdW5jdGlvbiBtYWtlQWpheFJlcXVlc3QoYWN0aW9uLCByZXN1bHRIYW5kbGVyKSB7XHJcbiAgICBtYW5hZ2VyXHJcbiAgICAgICAgLmdldChhY3Rpb24pXHJcbiAgICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdEFyZWEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdWx0Jyk7XHJcbiAgICAgICAgICAgIHJlc3VsdEFyZWEuaW5uZXJIVE1MID0gJyc7XHJcbiAgICAgICAgICAgIHJlc3VsdEhhbmRsZXIocmVzdWx0LCByZXN1bHRBcmVhKTtcclxuICAgICAgICB9LCBmYWlsdXJlID0+IGNvbnNvbGUuZXJyb3IoZmFpbHVyZSkpO1xyXG59XHJcbnZhciBtYW5hZ2VyID0gbmV3IEFqYXhNYW5hZ2VyKCk7XHJcblxyXG52YXIgcG9zdHNCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncG9zdHMnKTtcclxucG9zdHNCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICBtYWtlQWpheFJlcXVlc3QoJ3Bvc3RzJywgKHJlc3VsdCwgcmVzdWx0QXJlYSkgPT4ge1xyXG4gICAgICAgIHZhciBkYXRhID0gcmVzdWx0LmRhdGE7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdEFyZWEuaW5uZXJIVE1MICs9IFwiPHA+VXNlciBpZDogXCIgKyBkYXRhW2ldLnVzZXJJZCArIFwiPC9wPlwiO1xyXG4gICAgICAgICAgICByZXN1bHRBcmVhLmlubmVySFRNTCArPSBcIjxwPlRpdGxlOiBcIiArIGRhdGFbaV0udGl0bGUgKyBcIjwvcD5cIjtcclxuICAgICAgICAgICAgcmVzdWx0QXJlYS5pbm5lckhUTUwgKz0gXCI8cD5Db21tZW50OiBcIiArIGRhdGFbaV0uYm9keSArIFwiPC9wPlwiO1xyXG4gICAgICAgICAgICByZXN1bHRBcmVhLmlubmVySFRNTCArPSBcIjxiciAvPlwiO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYoaSA+IDEwKXtcclxuICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBMZXQncyBub3QgZ28gb3ZlcmJvYXJkXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufSwgZmFsc2UpO1xyXG5cclxudmFyIGNvbW1lbnRzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbW1lbnRzJyk7XHJcbmNvbW1lbnRzQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgbWFrZUFqYXhSZXF1ZXN0KCdjb21tZW50cycsIChyZXN1bHQsIHJlc3VsdEFyZWEpID0+IHtcclxuICAgICAgICB2YXIgZGF0YSA9IHJlc3VsdC5kYXRhO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICByZXN1bHRBcmVhLmlubmVySFRNTCArPSBcIjxwPlVzZXJuYW1lOiBcIiArIGRhdGFbaV0ubmFtZSArIFwiPC9wPlwiO1xyXG4gICAgICAgICAgICByZXN1bHRBcmVhLmlubmVySFRNTCArPSBcIjxwPkVtYWlsOiBcIiArIGRhdGFbaV0uZW1haWwgKyBcIjwvcD5cIjtcclxuICAgICAgICAgICAgcmVzdWx0QXJlYS5pbm5lckhUTUwgKz0gXCI8cD5Db21tZW50OiBcIiArIGRhdGFbaV0uYm9keSArIFwiPC9wPlwiO1xyXG4gICAgICAgICAgICByZXN1bHRBcmVhLmlubmVySFRNTCArPSBcIjxiciAvPlwiO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYoaSA+IDEwKXtcclxuICAgICAgICAgICAgICAgIGJyZWFrOyBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59LCBmYWxzZSk7IiwiLy8gU25hdGNoZWQgZnJvbSBodHRwOi8vZ29tYWtldGhpbmdzLmNvbS92YW5pbGxhLWphdmFzY3JpcHQtdmVyc2lvbi1vZi1qcXVlcnktZXh0ZW5kL1xyXG5cclxuLy8gUGFzcyBpbiB0aGUgb2JqZWN0cyB0byBtZXJnZSBhcyBhcmd1bWVudHMuXHJcbi8vIEZvciBhIGRlZXAgZXh0ZW5kLCBzZXQgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIGB0cnVlYC5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgLy8gVmFyaWFibGVzXHJcbiAgICB2YXIgZXh0ZW5kZWQgPSB7fTtcclxuICAgIHZhciBkZWVwID0gZmFsc2U7XHJcbiAgICB2YXIgaSA9IDA7XHJcbiAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcclxuXHJcbiAgICAvLyBDaGVjayBpZiBhIGRlZXAgbWVyZ2VcclxuICAgIGlmICggT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKCBhcmd1bWVudHNbMF0gKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nICkge1xyXG4gICAgICAgIGRlZXAgPSBhcmd1bWVudHNbMF07XHJcbiAgICAgICAgaSsrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE1lcmdlIHRoZSBvYmplY3QgaW50byB0aGUgZXh0ZW5kZWQgb2JqZWN0XHJcbiAgICB2YXIgbWVyZ2UgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgICAgZm9yICggdmFyIHByb3AgaW4gb2JqICkge1xyXG4gICAgICAgICAgICBpZiAoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCggb2JqLCBwcm9wICkgKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBJZiBkZWVwIG1lcmdlIGFuZCBwcm9wZXJ0eSBpcyBhbiBvYmplY3QsIG1lcmdlIHByb3BlcnRpZXNcclxuICAgICAgICAgICAgICAgIGlmICggZGVlcCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqW3Byb3BdKSA9PT0gJ1tvYmplY3QgT2JqZWN0XScgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5kZWRbcHJvcF0gPSBleHRlbmQoIHRydWUsIGV4dGVuZGVkW3Byb3BdLCBvYmpbcHJvcF0gKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5kZWRbcHJvcF0gPSBvYmpbcHJvcF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIExvb3AgdGhyb3VnaCBlYWNoIG9iamVjdCBhbmQgY29uZHVjdCBhIG1lcmdlXHJcbiAgICBmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcclxuICAgICAgICB2YXIgb2JqID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgIG1lcmdlKG9iaik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGV4dGVuZGVkO1xyXG59OyJdfQ==
