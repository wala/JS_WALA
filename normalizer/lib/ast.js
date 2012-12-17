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
 * Convenience functions for constructing and navigating ASTs.
 */
if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  // constructor signatures; arguments in angle brackets are terminal children, the others subtrees
  var signatures = {
      AssignmentExpression: [ '<operator>', 'left', 'right'],
      ArrayExpression: [ 'elements' ],
      BlockStatement: [ 'body' ],
      BinaryExpression: [ '<operator>', 'left', 'right'],
      BreakStatement: [ 'label' ],
      CallExpression: [ 'callee', 'arguments' ],
      CatchClause: [ 'param', 'body' ],
      ConditionalExpression: [ 'test', 'consequent', 'alternate' ],
      ContinueStatement: [ 'label' ],
      DirectiveStatement: [ ],
      DoWhileStatement: [ 'body', 'test' ],
      DebuggerStatement: [ ],
      EmptyStatement: [ ],
      ExpressionStatement: [ 'expression' ],
      ForStatement: [ 'init', 'test', 'update', 'body' ],
      ForInStatement: [ 'left', 'right', 'body' ],
      FunctionDeclaration: [ 'id', 'params', 'body' ],
      FunctionExpression: [ 'id', 'params', 'body' ],
      Identifier: [ '<name>' ],
      IfStatement: [ 'test', 'consequent', 'alternate' ],
      Literal: [ '<value>' ],
      LabeledStatement: [ 'label', 'body' ],
      LogicalExpression: [ '<operator>', 'left', 'right' ],
      MemberExpression: [ 'object', 'property', '<computed>' ],
      NewExpression: [ 'callee', 'arguments' ],
      ObjectExpression: [ 'properties' ],
      Program: [ 'body' ],
      Property: [ 'key', 'value', '<kind>' ],
      ReturnStatement: [ 'argument' ],
      SequenceExpression: [ 'expressions' ],
      SwitchStatement: [ 'discriminant', 'cases' ],
      SwitchCase: [ 'test', 'consequent' ],
      ThisExpression: [ ],
      ThrowStatement: [ 'argument' ],
      TryStatement: [ 'block', 'guardedHandlers', 'handlers', 'finalizer' ],
      UnaryExpression: [ '<operator>', 'argument' ],
      UpdateExpression: [ '<operator>', 'argument', '<prefix>' ],
      VariableDeclaration: [ 'declarations', '<kind>' ],
      VariableDeclarator: [ 'id', 'init' ],
      WhileStatement: [ 'test', 'body' ],
      WithStatement: [ 'object', 'body' ]
  };

  // define a constructor from a signature
  function defconstructor(tpname, signature) {
    var child_names = [], nonterminal_children = [];
    for(var i=0;i<signature.length;++i)
      if(signature[i][0] === '<') {
        child_names[child_names.length] = signature[i].substring(1, signature[i].length-1);
      } else {
        child_names[child_names.length] = signature[i];
        nonterminal_children[nonterminal_children.length] = signature[i];
      }
    
    exports[tpname] = function() {
      this.type = tpname;
      this.attr = {};
      for(var i=0;i<arguments.length;++i)
        this[child_names[i]] = arguments[i];
      for(;i<child_names.length;++i)
        this[child_names[i]] = null;
    };
    exports[tpname].children = nonterminal_children;
  }
  
  // several convenience methods for accessing subtrees
  var getNumChild = exports.getNumChild = function(nd) {
    if(Array.isArray(nd))
      return nd.length;
    
    if(nd && nd.type)
      return exports[nd.type].children.length;
    
    return 0;
  };
  
  var getChild = exports.getChild = function(nd, i) {
    if(Array.isArray(nd))
      return nd[i];
    
    return nd[exports[nd.type].children[i]];
  };
  
  var forEachChild = exports.forEachChild = function(nd, cb) {
    for(var i = 0, n = getNumChild(nd); i < n; ++i)
      cb(getChild(nd, i), i);
  };
  
  var mapChildren = exports.mapChildren = function(nd, cb) {
    var res = [];
    forEachChild(nd, function(ch, i) {
      res[res.length] = cb(ch, i);
    });
    return res;
  };

  var dump = exports.dump = function(nd) {
    if(Array.isArray(nd))
      return "[" + nd.map(dump).join() + "]";
    
    if(!nd || !nd.type)
      return nd+"";
    
    return nd.type + "(" + mapChildren(nd, dump).join() + ")";
  };
  
  // we give every AST node a property "attr" for storing attributes
  exports.getAttribute = function(nd, name) {
    nd.attr = nd.attr || {};
    return nd.attr[name];
  };
  
  exports.setAttribute = function(nd, name, value) {
    nd.attr = nd.attr || {};
    nd.attr[name] = value;
    return nd;
  };
  
  for(var p in signatures)
    defconstructor(p, signatures[p]);
});