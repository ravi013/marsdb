!function e(t,r,n){function o(i,a){if(!r[i]){if(!t[i]){var l="function"==typeof require&&require;if(!a&&l)return l(i,!0);if(u)return u(i,!0);var s=new Error("Cannot find module '"+i+"'");throw s.code="MODULE_NOT_FOUND",s}var c=r[i]={exports:{}};t[i][0].call(c.exports,function(e){var r=t[i][1][e];return o(r?r:e)},c,c.exports,e,t,r,n)}return r[i].exports}for(var u="function"==typeof require&&require,i=0;i<n.length;i++)o(n[i]);return o}({1:[function(e,t,r){"use strict";function n(e){return e&&e.__esModule?e:{"default":e}}function o(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(r,"__esModule",{value:!0});var u=function(){function e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,r,n){return r&&e(t.prototype,r),n&&e(t,n),t}}(),i=e("./AngularCursorObservable"),a=n(i),l="undefined"!=typeof window&&window.Mars?window.Mars.Collection:e("../Collection")["default"],s=function(){function e(t,r,n){o(this,e),this.$q=n,this._collection=new l(t,r)}return u(e,[{key:"ensureIndex",value:function(){var e;return this.$q.resolve((e=this._collection).ensureIndex.apply(e,arguments))}},{key:"insert",value:function(){var e;return this.$q.resolve((e=this._collection).insert.apply(e,arguments))}},{key:"insertAll",value:function(){var e;return this.$q.resolve((e=this._collection).insertAll.apply(e,arguments))}},{key:"update",value:function(){var e;return this.$q.resolve((e=this._collection).update.apply(e,arguments))}},{key:"remove",value:function(){var e;return this.$q.resolve((e=this._collection).remove.apply(e,arguments))}},{key:"find",value:function(e){return new a["default"](this,e)}},{key:"findOne",value:function(){var e;return this.$q.resolve((e=this._collection).findOne.apply(e,arguments))}},{key:"count",value:function(){var e;return this.$q.resolve((e=this._collection).count.apply(e,arguments))}},{key:"ids",value:function(){var e;return this.$q.resolve((e=this._collection).ids.apply(e,arguments))}},{key:"modelName",get:function(){return this._collection.modelName}}]),e}();r.AngularCollection=s,r["default"]=s},{"../Collection":void 0,"./AngularCursorObservable":2}],2:[function(e,t,r){"use strict";function n(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function o(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}Object.defineProperty(r,"__esModule",{value:!0});var u=function(){function e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,r,n){return r&&e(t.prototype,r),n&&e(t,n),t}}(),i=function(e,t,r){for(var n=!0;n;){var o=e,u=t,i=r;a=s=l=void 0,n=!1,null===o&&(o=Function.prototype);var a=Object.getOwnPropertyDescriptor(o,u);if(void 0!==a){if("value"in a)return a.value;var l=a.get;return void 0===l?void 0:l.call(i)}var s=Object.getPrototypeOf(o);if(null===s)return void 0;e=s,t=u,r=i,n=!0}},a="undefined"!=typeof window&&window.Mars?window.Mars.CursorObservable:e("../CursorObservable")["default"],l=function(e){function t(e,r){n(this,t),i(Object.getPrototypeOf(t.prototype),"constructor",this).call(this,e._collection,r),this.$q=e.$q}return o(t,e),u(t,[{key:"destroy",value:function(e){return e&&e._prevStopper&&e._prevStopper.stop(),this}},{key:"observe",value:function(e,r){var n=this,o=function(){for(var t=arguments.length,r=Array(t),o=0;t>o;o++)r[o]=arguments[o];n.$q(function(t){t(e.apply(void 0,r))})},u=i(Object.getPrototypeOf(t.prototype),"observe",this).call(this,o);return r&&r.$on("$destroy",function(){u.stop()}),this._prevStopper=u,u}},{key:"exec",value:function(){for(var e=arguments.length,r=Array(e),n=0;e>n;n++)r[n]=arguments[n];return this.$q.resolve(i(Object.getPrototypeOf(t.prototype),"exec",this).apply(this,r))}},{key:"ids",value:function(){for(var e=arguments.length,r=Array(e),n=0;e>n;n++)r[n]=arguments[n];return this.$q.resolve(i(Object.getPrototypeOf(t.prototype),"ids",this).apply(this,r))}},{key:"update",value:function(){for(var e=arguments.length,r=Array(e),n=0;e>n;n++)r[n]=arguments[n];return this.$q.resolve(i(Object.getPrototypeOf(t.prototype),"update",this).apply(this,r))}}]),t}(a);r.AngularCursorObservable=l,r["default"]=l},{"../CursorObservable":void 0}],3:[function(e,t,r){"use strict";function n(e){return e&&e.__esModule?e:{"default":e}}var o=e("./AngularCollection"),u=n(o),i="undefined"!=typeof window&&window.angular?window.angular:e("angular"),a="undefined"!=typeof window&&window.Mars?window.Mars.Collection:e("../Collection")["default"];i.module("MarsDB",[]).provider("$collection",function(){this.defaultStorageManager=function(e){return a.defaultStorageManager(e),this},this.defaultIdGenerator=function(e){return a.defaultIdGenerator(e),this};var e={};this.$get=["$q",function(t){return function(r){var n=arguments.length<=1||void 0===arguments[1]?{}:arguments[1];if(e[r]&&!n.noCache)return e[r];var o=new u["default"](r,n,t);return n.noCache||(e[r]=o),o}}]}),t["export"]="MarsDB"},{"../Collection":void 0,"./AngularCollection":1,angular:void 0}]},{},[3]);