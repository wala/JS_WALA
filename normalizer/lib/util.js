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
 * Utility methods. 
 */
if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  Array.prototype.flatmap = function(fn, thisArg) {
    var res = [];
    for(var i=0;i<this.length;++i) {
      var r = fn.call(thisArg, this[i], i, this);
      for(var j=0;j<r.length;++j)
        res[res.length] = r[j];
    }
    return res;
  };
});