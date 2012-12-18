/*******************************************************************************
 * Copyright (c) 2012 IBM Corporation.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/**
 * Simple set ADT.
 * 
 * Empty sets are represented by null or some other falsy value; singleton sets
 * are represented by their only element, which may not be an array; sets of
 * size greater than one, or singleton elements whose only element is an array
 * or is falsy, are represented by an array containing their elements.
 */
if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  /** Wraps a single element into a set. */
  exports.singleton = function(elt) {
    if(!elt || Array.isArray(elt))
      return [elt];
    return elt;
  };
  
  /** The canonical empty set. */
  exports.empty = null;
  
  /** Returns the size of the given set. */
  exports.size = function(set) {
    if(!set)
      return 0;
    if(Array.isArray(set))
      return set.length;
    return 1;
  };
  
  /** Adds elt to set, possibly mutating set in the process, and returns the resulting set. */
  exports.add = function(set, elt) {
    if(!set)
      return exports.singleton(elt);
    if(Array.isArray(set)) {
      for(var i=0;i<set.length;++i)
        if(set[i] === elt)
          return set;
      set[i] = elt;
      return set;
    }
    return set === elt ? set : [set, elt];
  };
  
  /** Removes elt from set, possibly mutating the set in the process, and returns the resulting set. */
  exports.remove = function(set, elt) {
    if(!set)
      return set;
    if(Array.isArray(set)) {
      for(var i=0;i<set.length;++i)
        if(set[i] === elt) {
          set.splice(i, 1);
          return set;
        }
      return set;
    }
    return set === elt ? null : set;
  };
  
  /** Returns a new set that is a copy of the given one. */
  exports.clone = function(set) {
    if(Array.isArray(set)) {
      var res = [];
      for(var i=0;i<set.length;++i)
        res[i] = set[i];
      return res;
    }
    return set;
  };
  
  /** Computes the union of the two given sets, not mutating either one, and returning the resulting set. */
  exports.union = function(a, b) {
    if(!a)
      return b;
    if(!b)
      return a;
    var res = exports.clone(a);
    exports.forEach(b, function(elt) {
      res = exports.add(res, elt);
    });
    return res;
  };
  
  /** Invokes a function on every element in a set. */
  exports.forEach = function(a, fn) {
    if(a) {
      if(Array.isArray(a))
        a.forEach(fn);
      else
        fn(a);
    }
  };
  
  /** Maps a function over a set, returning an array of results. */
  exports.map = function(a, fn) {
    if(a) {
      if(Array.isArray(a))
        return a.map(fn);
      return [fn(a)];
    } else {
      return [];
    }
  };
});