/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2016 PayPal                                                 │
 │                                                                            │
 │  Licensed under the Apache License, Version 2.0 (the "License");           │
 │  you may not use this file except in compliance with the License.          │
 │  You may obtain a copy of the License at                                   │
 │                                                                            │
 │    http://www.apache.org/licenses/LICENSE-2.0                              │
 │                                                                            │
 │  Unless required by applicable law or agreed to in writing, software       │
 │  distributed under the License is distributed on an "AS IS" BASIS,         │
 │  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │  See the License for the specific language governing permissions and       │
 │  limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var path = require('path');

/**
 * Returns true if the obj is and express-like instance, otherwise false.
 * @param obj
 * @returns {boolean} whether or not the provided object is an express application
 */
exports.isExpress = function isExpress(obj) {
    return obj && obj.handle && obj.set;
};


/**
 * Similar to Array#map, but accepts objects or arrays.
 * @param obj the object for which to map keys.
 * @param fn the function implements the mapping. API is function(value, propertyName, srcObject) {}
 * @returns {Array}
 */
exports.mapValues = function mapValues(obj, fn) {
    return Object.keys(obj).map(function (prop) {
        var name = prop.name || prop;
        return fn(obj[prop], name, obj);
    });
};


/**
 * Adds the provided `name` property to the provided object.
 * @param obj
 * @param name
 * @returns {*}
 */
exports.nameObject = function nameObject(obj, name) {
    obj && (obj.name = name);
    return obj;
};


/**
 * Determines if node is able to resolve the provided module file.
 * @param module The file path to the desired module.
 * @returns {*} The absolute path to the module or `undefined` if not found.
 */
exports.tryResolve = (function resolver(paths) {
    // If meddleware module is deployed outside the app's node_modules, it wouldn't be
    // able to resolve middleware modules deployed under app. Adding app's node_modules 
    // folder to the paths will help handle this case.
    var appNodeModules = path.resolve(process.cwd(), 'node_modules');
    if (paths.indexOf(appNodeModules) < 0) {
        paths.push(appNodeModules);
    }
    return function tryResolve(module) {
        try {
            return require.resolve(module, { paths: paths });
        } catch (e) {
            return undefined;
        }
    };
})(module.paths.slice(0));
