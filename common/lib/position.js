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
 * ADT for representing source positions identified by a URL, a start line, a start
 * offset (i.e., character offset from the beginning of the file), an end line, and
 * an end offset.
 * 
 * The start line corresponds to Esprima's loc.start.line, the start offset to
 * range[0], and similar for the end line and end offset.
 * 
 * For compatibility with Esprima, line numbering should normally be 1-based.
 */

if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  function Position(url, start_line, start_offset, end_line, end_offset) {
    this.url = url || "<unknown>";
    this.start_line = start_line;
    this.start_offset = start_offset;
    this.end_line = end_line;
    this.end_offset = end_offset;
  }
  
  Position.prototype.toString = function(short) {
    if(short)
      return this.start_line + ":" + this.start_offset;
    return this.url + "/" + this.start_line + ":" + this.start_offset + "-" + this.end_line + ":" + this.end_offset;
  };
  
  Position.prototype.clone = function() {
    return new Position(this.url, this.start_line, this.start_offset, this.end_line, this.end_offset);
  };
  
  Position.prototype.equals = function(o) {
    if(!(o instanceof Position))
      return false;
    return o.url === this.url &&
           o.start_line === this.start_line &&
           o.start_offset === this.start_offset &&
           o.end_line === this.end_line &&
           o.end_offset === this.end_offset;
  };
  
  var DUMMY_POS = new Position(null, -1, -1, -1, -1);
  
  return {
    Position: Position,
    DUMMY_POS: DUMMY_POS
  };
});