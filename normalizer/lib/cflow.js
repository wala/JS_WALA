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
 * Helper function for determining whether a piece of code may terminate normally, or whether
 * it always returns/breaks/throws an exception.
 */
if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var mayCompleteNormally = exports.mayCompleteNormally = function(nd) {
    switch(nd.type) {
    case 'ReturnStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
    case 'ThrowStatement':
      return false;
    case 'IfStatement':
      return mayCompleteNormally(nd.consequent) || nd.alternate && mayCompleteNormally(nd.alternate);
    case 'WithStatement':
      return mayCompleteNormally(nd.body);
    case 'BlockStatement':
      for(var i=0;i<nd.body.length;++i)
        if(!mayCompleteNormally(nd.body[i]))
          return false;
      return true;
    default:
      return true;
    }
  };
});