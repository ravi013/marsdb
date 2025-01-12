'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DocumentSorter = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _checkTypes = require('check-types');

var _checkTypes2 = _interopRequireDefault(_checkTypes);

var _forEach = require('fast.js/forEach');

var _forEach2 = _interopRequireDefault(_forEach);

var _every2 = require('fast.js/array/every');

var _every3 = _interopRequireDefault(_every2);

var _map2 = require('fast.js/map');

var _map3 = _interopRequireDefault(_map2);

var _indexOf2 = require('fast.js/array/indexOf');

var _indexOf3 = _interopRequireDefault(_indexOf2);

var _keys2 = require('fast.js/object/keys');

var _keys3 = _interopRequireDefault(_keys2);

var _DocumentMatcher = require('./DocumentMatcher');

var _DocumentMatcher2 = _interopRequireDefault(_DocumentMatcher);

var _Document = require('./Document');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Give a sort spec, which can be in any of these forms:
//   {'key1': 1, 'key2': -1}
//   [['key1', 'asc'], ['key2', 'desc']]
//   ['key1', ['key2', 'desc']]
//
// (.. with the first form being dependent on the key enumeration
// behavior of your javascript VM, which usually does what you mean in
// this case if the key names don't look like integers ..)
//
// return a function that takes two objects, and returns -1 if the
// first object comes first in order, 1 if the second object comes
// first, or 0 if neither object comes before the other.

var DocumentSorter = exports.DocumentSorter = function () {
  function DocumentSorter(spec) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, DocumentSorter);

    this._sortSpecParts = [];

    var addSpecPart = function addSpecPart(path, ascending) {
      if (!path) {
        throw Error('sort keys must be non-empty');
      }
      if (path.charAt(0) === '$') {
        throw Error('unsupported sort key: ' + path);
      }
      _this._sortSpecParts.push({
        path: path,
        lookup: (0, _DocumentMatcher.makeLookupFunction)(path, { forSort: true }),
        ascending: ascending
      });
    };

    if (spec instanceof Array) {
      for (var i = 0; i < spec.length; i++) {
        if (typeof spec[i] === 'string') {
          addSpecPart(spec[i], true);
        } else {
          addSpecPart(spec[i][0], spec[i][1] !== 'desc');
        }
      }
    } else if ((typeof spec === 'undefined' ? 'undefined' : _typeof(spec)) === 'object') {
      (0, _forEach2.default)(spec, function (value, key) {
        addSpecPart(key, value >= 0);
      });
    } else {
      throw Error('Bad sort specification: ' + JSON.stringify(spec));
    }

    // To implement affectedByModifier, we piggy-back on top of Matcher's
    // affectedByModifier code; we create a selector that is affected by the same
    // modifiers as this sort order. This is only implemented on the server.
    if (this.affectedByModifier) {
      var selector = {};
      (0, _forEach2.default)(this._sortSpecParts, function (nextSpec) {
        selector[nextSpec.path] = 1;
      });
      this._selectorForAffectedByModifier = new _DocumentMatcher2.default(selector);
    }

    this._keyComparator = composeComparators((0, _map3.default)(this._sortSpecParts, function (nextSpec, j) {
      return _this._keyFieldComparator(j);
    }));

    // If you specify a matcher for this Sorter, _keyFilter may be set to a
    // function which selects whether or not a given 'sort key' (tuple of values
    // for the different sort spec fields) is compatible with the selector.
    this._keyFilter = null;
    if (options.matcher) {
      this._useWithMatcher(options.matcher);
    }
  }

  _createClass(DocumentSorter, [{
    key: 'getComparator',
    value: function getComparator(options) {
      // If we have no distances, just use the comparator from the source
      // specification (which defaults to 'everything is equal'.
      if (!options || !options.distances) {
        return this._getBaseComparator();
      }

      var distances = options.distances;

      // Return a comparator which first tries the sort specification, and if that
      // says 'it's equal', breaks ties using $near distances.
      return composeComparators([this._getBaseComparator(), function (a, b) {
        if (!distances.has(a._id)) {
          throw Error('Missing distance for ' + a._id);
        }
        if (!distances.has(b._id)) {
          throw Error('Missing distance for ' + b._id);
        }
        return distances.get(a._id) - distances.get(b._id);
      }]);
    }
  }, {
    key: '_getPaths',
    value: function _getPaths() {
      return (0, _map3.default)(this._sortSpecParts, function (x) {
        return x.path;
      });
    }

    // Finds the minimum key from the doc, according to the sort specs.  (We say
    // 'minimum' here but this is with respect to the sort spec, so 'descending'
    // sort fields mean we're finding the max for that field.)
    //
    // Note that this is NOT 'find the minimum value of the first field, the
    // minimum value of the second field, etc'... it's 'choose the
    // lexicographically minimum value of the key vector, allowing only keys which
    // you can find along the same paths'.  ie, for a doc {a: [{x: 0, y: 5}, {x:
    // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and
    // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.

  }, {
    key: '_getMinKeyFromDoc',
    value: function _getMinKeyFromDoc(doc) {
      var _this2 = this;

      var minKey = null;

      this._generateKeysFromDoc(doc, function (key) {
        if (!_this2._keyCompatibleWithSelector(key)) {
          return;
        }

        if (minKey === null) {
          minKey = key;
          return;
        }
        if (_this2._compareKeys(key, minKey) < 0) {
          minKey = key;
        }
      });

      // This could happen if our key filter somehow filters out all the keys even
      // though somehow the selector matches.
      if (minKey === null) {
        throw Error('sort selector found no keys in doc?');
      }
      return minKey;
    }
  }, {
    key: '_keyCompatibleWithSelector',
    value: function _keyCompatibleWithSelector(key) {
      return !this._keyFilter || this._keyFilter(key);
    }

    // Iterates over each possible 'key' from doc (ie, over each branch), calling
    // 'cb' with the key.

  }, {
    key: '_generateKeysFromDoc',
    value: function _generateKeysFromDoc(doc, cb) {
      if (this._sortSpecParts.length === 0) {
        throw new Error('can\'t generate keys without a spec');
      }

      // maps index -> ({'' -> value} or {path -> value})
      var valuesByIndexAndPath = [];

      var pathFromIndices = function pathFromIndices(indices) {
        return indices.join(',') + ',';
      };

      var knownPaths = null;

      (0, _forEach2.default)(this._sortSpecParts, function (spec, whichField) {
        // Expand any leaf arrays that we find, and ignore those arrays
        // themselves.  (We never sort based on an array itself.)
        var branches = (0, _DocumentMatcher.expandArraysInBranches)(spec.lookup(doc), true);

        // If there are no values for a key (eg, key goes to an empty array),
        // pretend we found one null value.
        if (!branches.length) {
          branches = [{ value: null }];
        }

        var usedPaths = false;
        valuesByIndexAndPath[whichField] = {};
        (0, _forEach2.default)(branches, function (branch) {
          if (!branch.arrayIndices) {
            // If there are no array indices for a branch, then it must be the
            // only branch, because the only thing that produces multiple branches
            // is the use of arrays.
            if (branches.length > 1) {
              throw Error('multiple branches but no array used?');
            }
            valuesByIndexAndPath[whichField][''] = branch.value;
            return;
          }

          usedPaths = true;
          var path = pathFromIndices(branch.arrayIndices);
          if (valuesByIndexAndPath[whichField].hasOwnProperty(path)) {
            throw Error('duplicate path: ' + path);
          }
          valuesByIndexAndPath[whichField][path] = branch.value;

          // If two sort fields both go into arrays, they have to go into the
          // exact same arrays and we have to find the same paths.  This is
          // roughly the same condition that makes MongoDB throw this strange
          // error message.  eg, the main thing is that if sort spec is {a: 1,
          // b:1} then a and b cannot both be arrays.
          //
          // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'
          // and 'a.x.y' are both arrays, but we don't allow this for now.
          // #NestedArraySort
          // XXX achieve full compatibility here
          if (knownPaths && !knownPaths.hasOwnProperty(path)) {
            throw Error('cannot index parallel arrays');
          }
        });

        if (knownPaths) {
          // Similarly to above, paths must match everywhere, unless this is a
          // non-array field.
          if (!valuesByIndexAndPath[whichField].hasOwnProperty('') && (0, _keys3.default)(knownPaths).length !== (0, _keys3.default)(valuesByIndexAndPath[whichField]).length) {
            throw Error('cannot index parallel arrays!');
          }
        } else if (usedPaths) {
          knownPaths = {};
          (0, _forEach2.default)(valuesByIndexAndPath[whichField], function (x, path) {
            knownPaths[path] = true;
          });
        }
      });

      if (!knownPaths) {
        // Easy case: no use of arrays.
        var soleKey = (0, _map3.default)(valuesByIndexAndPath, function (values) {
          if (!values.hasOwnProperty('')) {
            throw Error('no value in sole key case?');
          }
          return values[''];
        });
        cb(soleKey);
        return;
      }

      (0, _forEach2.default)(knownPaths, function (x, path) {
        var key = (0, _map3.default)(valuesByIndexAndPath, function (values) {
          if (values.hasOwnProperty('')) {
            return values[''];
          }
          if (!values.hasOwnProperty(path)) {
            throw Error('missing path?');
          }
          return values[path];
        });
        cb(key);
      });
    }

    // Takes in two keys: arrays whose lengths match the number of spec
    // parts. Returns negative, 0, or positive based on using the sort spec to
    // compare fields.

  }, {
    key: '_compareKeys',
    value: function _compareKeys(key1, key2) {
      if (key1.length !== this._sortSpecParts.length || key2.length !== this._sortSpecParts.length) {
        throw Error('Key has wrong length');
      }

      return this._keyComparator(key1, key2);
    }

    // Given an index 'i', returns a comparator that compares two key arrays based
    // on field 'i'.

  }, {
    key: '_keyFieldComparator',
    value: function _keyFieldComparator(i) {
      var invert = !this._sortSpecParts[i].ascending;
      return function (key1, key2) {
        var compare = _Document.MongoTypeComp._cmp(key1[i], key2[i]);
        if (invert) {
          compare = -compare;
        }
        return compare;
      };
    }

    // Returns a comparator that represents the sort specification (but not
    // including a possible geoquery distance tie-breaker).

  }, {
    key: '_getBaseComparator',
    value: function _getBaseComparator() {
      var _this3 = this;

      // If we're only sorting on geoquery distance and no specs, just say
      // everything is equal.
      if (!this._sortSpecParts.length) {
        return function (doc1, doc2) {
          return 0;
        };
      }

      return function (doc1, doc2) {
        var key1 = _this3._getMinKeyFromDoc(doc1);
        var key2 = _this3._getMinKeyFromDoc(doc2);
        return _this3._compareKeys(key1, key2);
      };
    }

    // In MongoDB, if you have documents
    //    {_id: 'x', a: [1, 10]} and
    //    {_id: 'y', a: [5, 15]},
    // then C.find({}, {sort: {a: 1}}) puts x before y (1 comes before 5).
    // But  C.find({a: {$gt: 3}}, {sort: {a: 1}}) puts y before x (1 does not
    // match the selector, and 5 comes before 10).
    //
    // The way this works is pretty subtle!  For example, if the documents
    // are instead {_id: 'x', a: [{x: 1}, {x: 10}]}) and
    //             {_id: 'y', a: [{x: 5}, {x: 15}]}),
    // then C.find({'a.x': {$gt: 3}}, {sort: {'a.x': 1}}) and
    //      C.find({a: {$elemMatch: {x: {$gt: 3}}}}, {sort: {'a.x': 1}})
    // both follow this rule (y before x).  (ie, you do have to apply this
    // through $elemMatch.)
    //
    // So if you pass a matcher to this sorter's constructor, we will attempt to
    // skip sort keys that don't match the selector. The logic here is pretty
    // subtle and undocumented; we've gotten as close as we can figure out based
    // on our understanding of Mongo's behavior.

  }, {
    key: '_useWithMatcher',
    value: function _useWithMatcher(matcher) {
      if (this._keyFilter) {
        throw Error('called _useWithMatcher twice?');
      }

      // If we are only sorting by distance, then we're not going to bother to
      // build a key filter.
      // XXX figure out how geoqueries interact with this stuff
      if (_checkTypes2.default.emptyArray(this._sortSpecParts)) {
        return;
      }

      var selector = matcher._selector;

      // If the user just passed a literal function to find(), then we can't get a
      // key filter from it.
      if (selector instanceof Function || !selector) {
        return;
      }

      var constraintsByPath = {};
      (0, _forEach2.default)(this._sortSpecParts, function (spec, i) {
        constraintsByPath[spec.path] = [];
      });

      (0, _forEach2.default)(selector, function (subSelector, key) {
        // XXX support $and and $or

        var constraints = constraintsByPath[key];
        if (!constraints) {
          return;
        }

        // XXX it looks like the real MongoDB implementation isn't 'does the
        // regexp match' but 'does the value fall into a range named by the
        // literal prefix of the regexp', ie 'foo' in /^foo(bar|baz)+/  But
        // 'does the regexp match' is a good approximation.
        if (subSelector instanceof RegExp) {
          // As far as we can tell, using either of the options that both we and
          // MongoDB support ('i' and 'm') disables use of the key filter. This
          // makes sense: MongoDB mostly appears to be calculating ranges of an
          // index to use, which means it only cares about regexps that match
          // one range (with a literal prefix), and both 'i' and 'm' prevent the
          // literal prefix of the regexp from actually meaning one range.
          if (subSelector.ignoreCase || subSelector.multiline) {
            return;
          }
          constraints.push((0, _DocumentMatcher.regexpElementMatcher)(subSelector));
          return;
        }

        if ((0, _Document.isOperatorObject)(subSelector)) {
          (0, _forEach2.default)(subSelector, function (operand, operator) {
            if ((0, _indexOf3.default)(['$lt', '$lte', '$gt', '$gte'], operator) >= 0) {
              // XXX this depends on us knowing that these operators don't use any
              // of the arguments to compileElementSelector other than operand.
              constraints.push(_DocumentMatcher.ELEMENT_OPERATORS[operator].compileElementSelector(operand));
            }

            // See comments in the RegExp block above.
            if (operator === '$regex' && !subSelector.$options) {
              constraints.push(_DocumentMatcher.ELEMENT_OPERATORS.$regex.compileElementSelector(operand, subSelector));
            }

            // XXX support {$exists: true}, $mod, $type, $in, $elemMatch
          });
          return;
        }

        // OK, it's an equality thing.
        constraints.push((0, _DocumentMatcher.equalityElementMatcher)(subSelector));
      });

      // It appears that the first sort field is treated differently from the
      // others; we shouldn't create a key filter unless the first sort field is
      // restricted, though after that point we can restrict the other sort fields
      // or not as we wish.
      var currConstraint = constraintsByPath[this._sortSpecParts[0].path];
      if (!_checkTypes2.default.assigned(currConstraint) || _checkTypes2.default.emptyArray(currConstraint)) {
        return;
      }

      this._keyFilter = function (key) {
        return (0, _every3.default)(this._sortSpecParts, function (specPart, index) {
          return (0, _every3.default)(constraintsByPath[specPart.path], function (f) {
            return f(key[index]);
          });
        });
      };
    }
  }]);

  return DocumentSorter;
}();

exports.default = DocumentSorter;

// Given an array of comparators
// (functions (a,b)->(negative or positive or zero)), returns a single
// comparator which uses each comparator in order and returns the first
// non-zero value.

var composeComparators = function composeComparators(comparatorArray) {
  return function (a, b) {
    for (var i = 0; i < comparatorArray.length; ++i) {
      var compare = comparatorArray[i](a, b);
      if (compare !== 0) {
        return compare;
      }
    }
    return 0;
  };
};