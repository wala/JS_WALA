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
 * The normalizer itself. The main entry point is function 'normalize', which takes
 * an AST to normalize and an object with options.
 */
if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('../../common/lib/ast'),
      cflow = require('./cflow'),
      decls = require('./decls'),
      scopes = require('./scope'),
      position = require('../../common/lib/position');

  // for Array.prototype.flatmap
  require('./util');
  
  /** Some AST helper functions. */
  function getBase(nd) {
    if(nd.type !== 'MemberExpression')
      throw new Error("argument should be member expression");
    return nd.object;
  }
  
  function getIndex(nd) {
    if(nd.type !== 'MemberExpression')
      throw new Error("argument should be member expression");
    return nd.computed ? nd.property : new ast.Literal(nd.property.name);
  }
  
  function isLoop(nd) {
    switch(nd.type) {
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'ForStatement':
    case 'ForInStatement':
      return true;
    case 'LabeledStatement':
      return isLoop(nd.body);
    default:
      return false;
    }
  }
  
  /** Default options for the normalizer. */
  var default_options = {
    /** Ensure compatibility with previous implementation of normalizer. */
    backwards_compatible: false,
    
    /** Use more complex translation of global variable reads that leads to
     *  a ReferencError for undefined, undeclared globals; backwards_compatible
     *  implies 'false'. */
    reference_errors: false,
    
    /** Use only one return statement per function; backwards_compatible
     *  implies 'false'. */
    unify_ret: false,
    
    /** Unfold if statements so that only one branch is non-empty; backwards_compatible
     * implies 'true'. */
    unfold_ifs: false,

    /** Pretty-printer; doesn't do anything by default */
    pp: function() {}
  };
  
  function processOptions(options) {
    options = options || {};
    
    for(var p in default_options)
      if(!(p in options))
        options[p] = default_options[p];
    
    if(options.backwards_compatible) {
      options.reference_errors = false;
      options.unify_ret = false;
      options.unfold_ifs = true;
    }
    
    return options;
  }
  
  function normalize(nd, options) {
    options = processOptions(options);
    
    if(options.backwards_compatible) {
      ast.EmptyStatement = function() {
        return new ast.BlockStatement([]);
      };
      ast.EmptyStatement.children = [];      
    }
    
    /**
     * Creates a block containing the given statements. If no statements are provided, inserts no-op statement.
     * Also inserts no-op after last statement if that statement happens to be an 'if'; this is a workaround
     * for counterfactual execution, which needs to set a flag on the first statement after the 'if' to
     * communicate to the phi function inserter that it doesn't need to flush the heap. Ugly.
     */
    function mkBlock(stmts) {
      if(stmts.length === 0)
        stmts = [new ast.EmptyStatement()];
      if(options.backwards_compatible)
        stmts = insertNoOpAfterFinalIf(stmts);
      return new ast.BlockStatement(stmts);
    }
    
    function insertNoOpAfterFinalIf(stmts) {
      if(stmts.length && stmts[stmts.length-1].type === 'IfStatement')
        stmts[stmts.length++] = new ast.EmptyStatement();
      return stmts;
    }
    
    /** Counter for generating temporary variable names. */
    var tmpCount = 0;
    var tmp_prefix = "tmp";
    
    function isTmp(name) {
      return name.substring(0, tmp_prefix.length) === tmp_prefix &&
             Number(name.substring(tmp_prefix.length)) < tmpCount;
    }
    
    /** Determine URL of program */
    var url = nd.url || options.url || "<unknown>";
    
    /** Utility function to copy position information of old_node onto new_nodes,
     *  unless they already have positions. This copy is recursive, traversing
     *  all child nodes of any new nodes that do not have positions yet. */
    function inheritPosition(new_nodes, old_node) {
      var old_pos;
      if(ast.hasPosition(old_node)) {
        old_pos = ast.getPosition(old_node);
      } else if(old_node.range && old_node.loc) {
        old_pos = new position.Position(url,
                                        old_node.loc.start.line, old_node.range[0],
                                        old_node.loc.end.line, old_node.range[1]);
      } else {
        old_pos = position.DUMMY_POS;
      }
      
      function help(nd) {
        if(Array.isArray(nd))
          nd.forEach(help);
        if(nd && typeof nd.type === 'string' && !ast.hasPosition(nd)) {
          ast.setPosition(nd, old_pos.clone());
          ast.forEachChild(nd, help);
        }
      }
      
      help(new_nodes);
      return new_nodes;
    }

    /** Utility function for attaching source code comment to normalized statements. */
    function attachComment(stmts) {
	if(!stmts.length)
	    return;

	var comment_text = "";
	for(var i=1;i<arguments.length;++i) {
	    var fragment = arguments[i];
	    if(typeof fragment !== 'string')
		fragment = options.pp(fragment);
	    if(typeof fragment !== 'string')
		return;
	    comment_text += fragment;
	}
	comment_text = ' ' + comment_text.replace(/\s+/g, ' ');
	
	if(!stmts[0].leadingComments)
	    stmts[0].leadingComments = [];
	stmts[0].leadingComments.push({ type: 'Line', value: comment_text });
    }
      
    /** Normalize an entity, i.e., a program or a function. */
    function normalizeEntity(root, scope) {
      /** Declarations of temporary variables generated by the normalizer for this entity. */
      var tmps = [];
      
      /** Helper function for generating one new temporary name.
       *  If isLbl is true, the new name is to be used as a label and should not be entered
       *  into the tmps array. */
      function genTmp(isLbl) {
        var name = tmp_prefix + (tmpCount++);
        if(!isLbl)
          tmps[tmps.length] = new ast.VariableDeclarator(new ast.Identifier(name), null);
        return name;
      }
      
      /** Generate n new temporary names. */
      function genTmps(n) {
        var res = [];
        for(var i=0;i<n;++i)
          res[i] = genTmp();
        return res;
      }
      
      /** When unifying return statements, every function gets a return label and a return
       *  variable. The body is wrapped into a block of the form
       *  
       *  <pre>
       *    var ret_var;
       *    ret_label: {
       *    }
       *    return ret_var;
       *  </pre>
       *  
       *  Then, every return statement <code>return e;</code> is replaced by
       *  <code>ret_var = e; break ret_label;</code>. */
      var ret_label = null, ret_var = null;
      if(options.unify_ret && (root.type === 'FunctionDeclaration' ||
                               root.type === 'FunctionExpression')) {
        ret_label = genTmp(true);
        ret_var = genTmp();
      }
      
      /** Normalize an expression with the given target variable. If the target is null,
       *  a new temporary name is generated when necessary. */
      function normalizeExpression(nd, target) {
        var res;
        function getTarget() {
          return target || (target = genTmp());
        }
        
        switch(nd.type) {
        case 'Literal':
          // target = literal;
          res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), nd))];
          break;
      
        case 'Identifier':
          var tmp = null;
          if(!isTmp(nd.name) && scope.isGlobal(nd.name)) {
            // global reads are rewritten into property accesses on __global; however, reading an undeclared, undefined global
            // should result in a ReferenceError, so we (optionally) introduce an if statement checking whether the global has
            // been declared/defined, and throw an error if not
          
            // temporary to hold the name of the global
            tmp = genTmp();
            res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.name)))];
          
            if(!options.reference_errors || scope.isDeclaredGlobal(nd.name)) {
              // target = __global[tmp];
              res[1] = new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                     new ast.MemberExpression(new ast.Identifier('__global'), new ast.Identifier(tmp), true)));
            } else {
              // check for shadowing of ReferenceError; give up if this happens
              // TODO: even if it isn't shadowed, some clown may have overwritten ReferenceError...
              if(!scope.isGlobal('ReferenceError'))
                throw new Error("global variable ReferenceError is shadowed");
            
              /* tmp2 = x in __global;
               * if(tmp2) {
               *   target = __global[tmp2];
               * } else {
               *   tmp3 = 'ReferenceError';
               *   tmp4 = __global[tmp3];
               *   tmp5 = new tmp4();
               *   throw tmp5;
               * } */
              var tmp2 = genTmp(), tmp3 = genTmp(), tmp4 = genTmp(), tmp5 = genTmp();
              res = res.concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp2), new ast.BinaryExpression('in', new ast.Identifier(tmp), new ast.Identifier('__global')))),
                               mkIf(tmp2,
                                    [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), new ast.MemberExpression(new ast.Identifier('__global'), new ast.Identifier(tmp), true)))],
                                    [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp3), new ast.Literal('ReferenceError'))),
                                     new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp4), new ast.MemberExpression(new ast.Identifier('__global'), new ast.Identifier(tmp3), true))),
                                     new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp5), new ast.NewExpression(new ast.Identifier(tmp4), []))),
                                     new ast.ThrowStatement(new ast.Identifier(tmp5))]));
            }
          } else {
            // locals are easy: target = x;
            res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), new ast.Identifier(nd.name)))];
          }
        
          // handle possible 'with' bindings
          var with_bindings = scope.possibleWithBindings(nd.name);
          if(with_bindings.length) {
            var prelude = null;
          
            // load name of variable into 'tmp'; store code to do so into 'prelude'
            if(tmp) {
              prelude = res[0];
              res.shift();
            } else {
              tmp = genTmp();
              prelude = new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.name))); 
            }
        
            with_bindings.forEach(function(with_var) {
              /*
               * tmp2 = tmp in with_var;
               * if(tmp2) {
               *   target = with_var[tmp];
               * } else {
               *   ...
               * }
               */
              var tmp2 = genTmp();
              res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp2), new ast.BinaryExpression('in', new ast.Identifier(tmp), new ast.Identifier(with_var)))),
                     new ast.IfStatement(new ast.Identifier(tmp2),
                                         mkBlock([new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), new ast.MemberExpression(new ast.Identifier(with_var), new ast.Identifier(tmp), true)))]),
                                         mkBlock(res))];
            });
          
            res.unshift(prelude);
          }
          break;
        
        case 'ArrayExpression':
          // allocate one temporary variable per array element (y1, ..., yn)
          var elt_tmps = genTmps(nd.elements.length);
          // recursively normalize array element expressions, skipping over omitted elements; the temporary will then
          // keep its initial undefined value, which is what we want
          var elements = nd.elements.flatmap(function(elt, i) { return elt ? normalizeExpression(elt, elt_tmps[i]) : []; });
          // target = [y1, ..., yn];
          res =  elements.concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                               new ast.ArrayExpression(elt_tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
          break;
          
        case 'ObjectExpression':
          // allocate one temporary variable per property; we may not need all of them if there are getters or setters
          var prop_tmps = genTmps(nd.properties.length);
          var props = [];
          var body = nd.properties.flatmap(function(prop, i) {
            switch(prop.kind) {
            case 'init':
              props[props.length] = new ast.Property(prop.key, new ast.Identifier(prop_tmps[i]), 'init');
              inheritPosition(props[props.length-1], prop);
              // recursively normalize property value expression
              return normalizeExpression(prop.value, prop_tmps[i]);
            case 'get':
            case 'set':
              // recursively normalize getter/setter
              var funexpr = normalizeEntity(prop.value, new scopes.FunctionScope(scope, prop.value));
              props[props.length] = new ast.Property(prop.key, funexpr, prop.kind);
              inheritPosition(props[props.length-1], prop);
              return [];
            default:
              throw new Error();
            }
          });
          res =  body.concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                           new ast.ObjectExpression(props))));
          break;
          
        case 'MemberExpression':
          var base_tmp = genTmp(), index_tmp = genTmp();
          var base = normalizeExpression(getBase(nd), base_tmp);
          var index = normalizeExpression(getIndex(nd), index_tmp);
          var idx = new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true);
          // remember whether this member expression was a computed one originally
          if(nd.computed)
            ast.setAttribute(idx, 'isComputed', true);
          res =  base.concat(index,
                             new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), idx)));
          break;
          
        case 'ThisExpression':
          if(scope instanceof scopes.GlobalScope)
            res =  [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), new ast.Identifier('__global')))];
          else
            res =  [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), new ast.ThisExpression()))];
          break;
          
        case 'FunctionExpression':
          var fn = normalizeEntity(nd, new scopes.FunctionScope(scope, nd));
          res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), fn))];
          break;
        
        case 'AssignmentExpression':
          if(nd.operator === '=') {
            // simple assignments are handled similar to case 'Identifier' above
            if(nd.left.type === 'Identifier') {
              var res, tmp = null, right;
              var with_bindings = scope.possibleWithBindings(nd.left.name);
              if(!isTmp(nd.left.name) && scope.isGlobal(nd.left.name)) {
                tmp = genTmp();
                right = normalizeExpression(nd.right, getTarget());
                res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.left.name))),
                       new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier('__global'), new ast.Identifier(tmp), true),
                                                                                     new ast.Identifier(getTarget())))];
              } else {
                // mark variables that are written across scopes
                if(!scope.isLocal(nd.left.name))
                  ast.setAttribute(scope.lookup(nd.left.name), 'exposed', true);
              
                if(target || with_bindings.length) {
                  right = normalizeExpression(nd.right, getTarget());
                  res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(nd.left.name), new ast.Identifier(getTarget())))];
                } else {
                  target = nd.left.name;
                  right = normalizeExpression(nd.right, nd.left.name);
                  res = [];
                }
              }
            
              // handle 'with'
              if(with_bindings.length) {
                var prelude = null;
                if(tmp) {
                  prelude = res[0];
                  res.shift();
                } else {
                  tmp = genTmp();
                  prelude = new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.left.name))); 
                }
            
                with_bindings.forEach(function(with_var) {
                  var tmp2 = genTmp();
                  res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp2), new ast.BinaryExpression('in', new ast.Identifier(tmp), new ast.Identifier(with_var)))),
                         new ast.IfStatement(new ast.Identifier(tmp2),
                                             mkBlock([new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier(with_var), new ast.Identifier(tmp), true), new ast.Identifier(getTarget())))]),
                                             mkBlock(res))];
                });
              
                res.unshift(prelude);
              }
            
              res = right.concat(res);
            } else if(nd.left.type === 'MemberExpression') {
              var base_tmp = genTmp(), index_tmp = genTmp();
              var base = normalizeExpression(getBase(nd.left), base_tmp),
                  index = normalizeExpression(getIndex(nd.left), index_tmp);
              var lhs = new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true);
            
              if(nd.left.computed)
                ast.setAttribute(lhs, 'isComputed', true);
            
              var rhs_comp = normalizeExpression(nd.right, getTarget());
              res = base.concat(index, rhs_comp, new ast.ExpressionStatement(new ast.AssignmentExpression('=', lhs, new ast.Identifier(getTarget()))));
            } else {
              throw new Error("unexpected lhs of type " + nd.left.type);
            }
          } else {
            // compound assignments are desugared into normal assignments and then rewritten recursively
            var op = nd.operator.substring(0, nd.operator.length-1);
            var lhs = nd.left, rhs = nd.right;
          
            if(nd.left.type === 'Identifier') {
              var tmp = genTmp();
              res = normalizeExpression(rhs, tmp)
                    .concat(normalizeExpression(new ast.AssignmentExpression('=', new ast.Identifier(nd.left.name), new ast.BinaryExpression(op, new ast.Identifier(nd.left.name), new ast.Identifier(tmp)))));
            } else if(nd.left.type === 'MemberExpression') {
              var tmp = genTmp(), trg = getTarget();
              var base_tmp = genTmp(), index_tmp = genTmp(), extra = genTmp();
            
              res = normalizeExpression(getBase(lhs), base_tmp)
                   .concat(normalizeExpression(getIndex(lhs), index_tmp),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra), 
                                                                                         new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true))),
                           normalizeExpression(rhs, tmp),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(trg),
                                                                                         new ast.BinaryExpression(op, new ast.Identifier(extra), new ast.Identifier(tmp)))),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true), new ast.Identifier(target))));
            } else {
              throw new Error("unexpected lhs");
            }
          }
          break;
        
        case 'CallExpression':
          if(nd.callee.type === 'MemberExpression') {
            var base_tmp = genTmp(), index_tmp = genTmp();
            var base = normalizeExpression(getBase(nd.callee), base_tmp);
            var index = normalizeExpression(getIndex(nd.callee), index_tmp);
            var arg_tmps = genTmps(nd.arguments.length);
            var args = nd.arguments.flatmap(function(arg, i) { return normalizeExpression(arg, arg_tmps[i]); });
            var callee = new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true);
          
            if(nd.callee.computed)
              ast.setAttribute(callee, 'isComputed', true);
          
            res = base.concat(index, args,
                              new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                            new ast.CallExpression(callee, arg_tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
            break;
          } else if(nd.callee.type === 'Identifier') {
            if(nd.callee.name === 'eval') {
              // TODO: handle 'eval' inside 'with'
              var arg_tmps = genTmps(nd.arguments.length);
              var args = nd.arguments.flatmap(function(arg, i) { return normalizeExpression(arg, arg_tmps[i]); });
              res = args.concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                              new ast.CallExpression(nd.callee, arg_tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
            } else {
              var tmp = genTmp();
              var fn = normalizeExpression(nd.callee, tmp);
              var arg_tmps = genTmps(nd.arguments.length);
              var args = nd.arguments.flatmap(function(arg, i) { return normalizeExpression(arg, arg_tmps[i]); });
              res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                   new ast[nd.type](new ast.Identifier(tmp), arg_tmps.map(function(tmp) { return new ast.Identifier(tmp); }))))];
            
              var with_bindings = scope.possibleWithBindings(nd.callee.name);
              if(with_bindings.length) {
                var name_tmp = genTmp();
                var prelude = new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(name_tmp), new ast.Literal(nd.callee.name))); 
              
                with_bindings.forEach(function(with_var) {
                  var tmp2 = genTmp();
                  res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp2), new ast.BinaryExpression('in', new ast.Identifier(name_tmp), new ast.Identifier(with_var)))),
                         new ast.IfStatement(new ast.Identifier(tmp2),
                                             mkBlock([new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                                                    new ast.CallExpression(new ast.MemberExpression(new ast.Identifier(with_var), new ast.Identifier(name_tmp), true), 
                                                                                                                                           arg_tmps.map(function(tmp) { return new ast.Identifier(tmp); }))))]),
                                             mkBlock(res))];
                });
              
                res.unshift(prelude);
              }
            
              res = fn.concat(args, res);
            }
            break;
          }
        
        case 'NewExpression':
          var tmp = genTmp();
          var fn = normalizeExpression(nd.callee, tmp);
          var arg_tmps = genTmps(nd.arguments.length);
          var args = nd.arguments.flatmap(function(arg, i) { return normalizeExpression(arg, arg_tmps[i]); });
          res = fn.concat(args, new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                              new ast[nd.type](new ast.Identifier(tmp), arg_tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
          break;
          
        case 'SequenceExpression':
          var n = nd.expressions.length;
          res = nd.expressions.flatmap(function(expr, i) {
            if(i < n - 1)
              return normalizeExpression(expr);
            return normalizeExpression(expr, target);
          });
          break;
        
        case 'LogicalExpression':
          var ltmp, l, r;
          if(nd.operator === '&&') {
            ltmp = genTmp();
            l = normalizeExpression(nd.left, ltmp);
            res = mkIf(ltmp, normalizeExpression(nd.right, getTarget()),
                             [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), new ast.Identifier(ltmp)))]);
            res = l.concat(res);
          } else if(nd.operator === '||') {
            ltmp = genTmp();
            l = normalizeExpression(nd.left, ltmp);
            res = mkIf(ltmp, [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), new ast.Identifier(ltmp)))],
                             normalizeExpression(nd.right, getTarget()));
            res = l.concat(res);
          } else {
            throw new Error("unknown logical expression");
          }
          break;
        
        case 'BinaryExpression':
          var ltmp = genTmp(), rtmp = genTmp();
          l = normalizeExpression(nd.left, ltmp);
          r = normalizeExpression(nd.right, rtmp);
          res = new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                              new ast.BinaryExpression(nd.operator, new ast.Identifier(ltmp), new ast.Identifier(rtmp))));
          res = l.concat(r, res);
          break;
        
        case 'ConditionalExpression':
          var tmp = genTmp();
          res = normalizeExpression(nd.test, tmp)
               .concat(mkIf(tmp, normalizeExpression(nd.consequent, target), 
                                 normalizeExpression(nd.alternate, target)));
          break;
        
        case 'UpdateExpression':
          var op = nd.operator === '++' ? '+' : '-';
          // postfix expressions in void context are handled like prefix expressions
          if(!nd.prefix && target) {
            if(nd.argument.type === 'Identifier') {
              res = normalizeExpression(nd.argument, target)
                   .concat(normalizeExpression(new ast.AssignmentExpression('=', new ast.Identifier(nd.argument.name), 
                                                                                 new ast.BinaryExpression(op, new ast.Identifier(nd.argument.name), new ast.Literal(1)))));
            
            } else if(nd.argument.type === 'MemberExpression') {
              var trg = getTarget();
              var base_tmp = genTmp(), index_tmp = genTmp(), extra = genTmp(), extra_extra = genTmp();
              res = normalizeExpression(getBase(nd.argument), base_tmp)
                   .concat(normalizeExpression(getIndex(nd.argument), index_tmp),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(trg), 
                                                                                         new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true))),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra_extra), new ast.Literal(1))),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra), new ast.BinaryExpression(op, new ast.Identifier(target), new ast.Identifier(extra_extra)))),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true), new ast.Identifier(extra))));
            } else {
              throw new Error("unexpected operand to postfix expression");
            }
          } else {
            if(nd.argument.type === 'Identifier') {
              res = normalizeExpression(new ast.AssignmentExpression('=', nd.argument, new ast.BinaryExpression(op, new ast.Identifier(nd.argument.name), new ast.Literal(1))),
                                        target);
            } else if(nd.argument.type === 'MemberExpression') {
              var trg = getTarget();
              var base_tmp = genTmp(), index_tmp = genTmp(), extra = genTmp(), extra_extra = genTmp();
              res = normalizeExpression(getBase(nd.argument), base_tmp)
                   .concat(normalizeExpression(getIndex(nd.argument), index_tmp),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra), 
                                                                                         new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true))),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra_extra), new ast.Literal(1))),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(trg),
                                                                                         new ast.BinaryExpression(op, new ast.Identifier(extra), new ast.Identifier(extra_extra)))),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true),
                                                                                         new ast.Identifier(target))));
            } else {
              throw new Error("unexpected operand to prefix expression");
            }
          }
          break;
        
        case 'UnaryExpression': 
          var op = nd.operator;
          if(op === 'delete') {
            if(nd.argument.type === 'Identifier') {
              if(!isTmp(nd.argument.name) && scope.isGlobal(nd.argument.name)) {
                var trg = getTarget();
                var tmp = genTmp();
                res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.argument.name))),
                       new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(trg),
                                                                                     new ast.UnaryExpression('delete',
                                                                                                             new ast.MemberExpression(new ast.Identifier('__global'),
                                                                                                                                      new ast.Identifier(tmp), true))))];              
              } else {
                res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()), nd))];
              }
            } else if(nd.argument.type === 'MemberExpression') {
              var trg = getTarget();
              var base_tmp = genTmp(), index_tmp = genTmp();
              res = normalizeExpression(getBase(nd.argument), base_tmp)
                   .concat(normalizeExpression(getIndex(nd.argument), index_tmp),
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(trg),
                                                                                         new ast.UnaryExpression('delete',
                                                                                                                 new ast.MemberExpression(new ast.Identifier(base_tmp),
                                                                                                                                           new ast.Identifier(index_tmp), true)))));
            } else {
              throw new Error();
            }
          } else {
            var tmp = genTmp();
            res = normalizeExpression(nd.argument, tmp)
                 .concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(getTarget()),
                                                                                       new ast.UnaryExpression(op, new ast.Identifier(tmp)))));
          }
          break;
        
        default:
          throw new Error("unknown expression type: " + nd.type);
        }
        return inheritPosition(res, nd);
      }
      
      function normalizeStatement(nd, brk_label, cont_label) {
        var res;
        
        function rec(stmt) {
          return normalizeStatement(stmt, brk_label, cont_label);
        }
      
        switch(nd.type) {
        case 'EmptyStatement':
          res = [];
	  attachComment(res, nd);
          break;
          
        case 'ExpressionStatement':
          res = normalizeExpression(nd.expression);
	  attachComment(res, nd);
          break;
          
        // variable declarations are collected by normalizeEntity(); all we need to do here is to extract initializers into assignments
        case 'VariableDeclaration':
          res = nd.declarations.flatmap(rec);
	  attachComment(res, nd);
          break;
        
        case 'VariableDeclarator':
          if(nd.init)
            res = normalizeExpression(new ast.AssignmentExpression('=', new ast.Identifier(nd.id.name), nd.init));
          else
            res = [];
          break;
        
        // function declarations are collected by normalizeEntity()
        case 'FunctionDeclaration':
          res = [];
          break;
        
        case 'BlockStatement':
          res = nd.body.flatmap(rec);
          break;
        
        case 'ReturnStatement':
          if(options.unify_ret) {
            res = nd.argument ? normalizeExpression(nd.argument, ret_var) : [];
            res.push(new ast.BreakStatement(new ast.Identifier(ret_label)));
          } else {
            if(nd.argument) {
              var tmp = genTmp();
              res = normalizeExpression(nd.argument, tmp).concat(new ast.ReturnStatement(new ast.Identifier(tmp)));
            } else {
              res = [new ast.ReturnStatement(null)];
            }
          }
	  attachComment(res, nd);
          break;
        
        case 'DebuggerStatement':
          res = [new ast.DebuggerStatement()];
	  attachComment(res, nd);
          break;
        
        case 'IfStatement':
          var tmp = genTmp();
          var res = normalizeExpression(nd.test, tmp);
          var thenBranch = rec(nd.consequent);
          var elseBranch = nd.alternate ? rec(nd.alternate) : [];
          res = res.concat(mkIf(tmp, thenBranch, elseBranch));
	  attachComment(res, "if(", nd.test, ")");
          break;
        
        case 'ThrowStatement':
          var tmp = genTmp();
          res = normalizeExpression(nd.argument, tmp).concat(new ast.ThrowStatement(new ast.Identifier(tmp)));
	  attachComment(res, nd);
          break;
        
        case 'TryStatement':
          // handle incompatibility between Esprima and Acorn ASTs
          if(!nd.handlers)
            nd.handlers = nd.handler ? [nd.handler] : [];

          if(nd.handlers.length > 0 && nd.finalizer) {
            res = rec(new ast.TryStatement(new ast.BlockStatement([new ast.TryStatement(nd.block, nd.guardedHandlers, nd.handlers, null)]),
                                           [], [], nd.finalizer));
          } else if(nd.handlers.length > 0) {
            if(nd.guardedHandlers && nd.guardedHandlers.length > 0 || nd.handlers.length > 1)
              throw new Error("fancy catch clauses not supported");
          
            var tryblock = rec(nd.block);
            scope = new scopes.CatchScope(scope, nd.handlers[0]);
            var catchblock = rec(nd.handlers[0].body);
            scope = scope.outer;
  
            res = [new ast.TryStatement(mkBlock(tryblock), [], [new ast.CatchClause(nd.handlers[0].param, mkBlock(catchblock))], null)];
          } else if(nd.finalizer) {
            var tryblock = rec(nd.block);
            if(nd.finalizer.body.length === 0) {
              res = tryblock;
            } else {
              var finallyblock = rec(nd.finalizer);
              res = [new ast.TryStatement(mkBlock(tryblock), [], [], mkBlock(finallyblock))];
            }
          }
	  attachComment(res, "try");
          break;
        
        case 'LabeledStatement':
          var stmts = normalizeStatement(nd.body, nd.label.name, isLoop(nd.body) ? nd.label.name : cont_label);
          res = [new ast.LabeledStatement(nd.label, mkBlock(stmts))];
          attachComment(res, nd.label.name + ": { ... }");
          break;
        
        case 'BreakStatement':
          if(nd.label)
            res = [nd];
          else
            res = [new ast.BreakStatement(new ast.Identifier(brk_label))];
          attachComment(res, nd);
          break;
        
        case 'ContinueStatement':
          if(nd.label)
            res = [new ast.BreakStatement(new ast.Identifier(nd.label.name))];
          else
            res = [new ast.BreakStatement(new ast.Identifier(cont_label))];
          attachComment(res, nd);
          break;
        
        case 'WhileStatement':
          var condtmp = genTmp();
          var brk_lbl = genTmp(true), cont_lbl = genTmp(true);

          // initial computation of condition
          var cond1 = normalizeExpression(nd.test, condtmp);
          // while body
          var body = [new ast.LabeledStatement(new ast.Identifier(cont_lbl), mkBlock(normalizeStatement(nd.body, brk_lbl, cont_lbl)))];
          // computation of updated condition
          var cond2 = normalizeExpression(nd.test, condtmp);
          res = cond1.concat(new ast.LabeledStatement(new ast.Identifier(brk_lbl),
                                                      new ast.BlockStatement([new ast.WhileStatement(new ast.Identifier(condtmp),
                                                                                                     mkBlock(body.concat(cond2)))])));
	  attachComment(res, "while(", nd.test, ")");
          break;
        
        case 'DoWhileStatement':
          var tmp = genTmp();
          var brk_lbl = genTmp(true), cont_lbl = genTmp(true);
        
          var body = [new ast.LabeledStatement(new ast.Identifier(cont_lbl), mkBlock(normalizeStatement(nd.body, brk_lbl, cont_lbl)))];
          var cond = normalizeExpression(nd.test, tmp);
          res = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(true))),
                 new ast.LabeledStatement(new ast.Identifier(brk_lbl), new ast.BlockStatement([new ast.WhileStatement(new ast.Identifier(tmp),
                                                                                                                      mkBlock(body.concat(cond)))]))];
	  attachComment(res, "do { ... } while(", nd.test, ");");
          break;
        
        case 'ForInStatement':
          if(nd.left.type === 'VariableDeclaration') {
            res = rec(nd.left).concat(rec(new ast.ForInStatement(new ast.Identifier(nd.left.declarations[0].id.name), nd.right, nd.body)));
          } else if(nd.left.type === 'Identifier') {
            var tmp = genTmp(), brk_lbl = genTmp(true), cont_lbl = genTmp(true);

            var init = normalizeExpression(nd.right, tmp);

            var body = [new ast.LabeledStatement(new ast.Identifier(cont_lbl), mkBlock(normalizeStatement(nd.body, brk_lbl, cont_lbl)))];
        
            var loopVar;
            if(scope.isLocal(nd.left.name)) {
              loopVar = nd.left.name;
            } else {
              loopVar = genTmp();
              body = normalizeExpression(new ast.AssignmentExpression('=', new ast.Identifier(nd.left.name), new ast.Identifier(loopVar)))
                    .concat(body);
            }
        
            res = init.concat(new ast.LabeledStatement(new ast.Identifier(brk_lbl), 
                                                       new ast.BlockStatement([new ast.ForInStatement(new ast.Identifier(loopVar), new ast.Identifier(tmp),
                                                                                                      mkBlock(body))])));
          } else {
            // TODO: support member expressions as nd.left
            throw new Error("cannot handle for-in loop");
          }
	  attachComment(res, "for(", nd.left, " in ", nd.right, ") { ... }");
          break;
        
        case 'ForStatement':
          var init = nd.init ? (nd.init.type === 'VariableDeclaration' ? rec(nd.init) : normalizeExpression(nd.init)) : [];
          var condVar = genTmp();
          var cond1, cond2;
          if(!nd.test) {
            cond1 = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(condVar), new ast.Literal(true)))];
            cond2 = [];
          } else {
            cond1 = normalizeExpression(nd.test, condVar);
            cond2 = normalizeExpression(nd.test, condVar);
          }
          var update = nd.update ? normalizeExpression(nd.update) : [];
          var brk_lbl = genTmp(true), cont_lbl = genTmp(true);
          var body = [new ast.LabeledStatement(new ast.Identifier(cont_lbl), mkBlock(normalizeStatement(nd.body, brk_lbl, cont_lbl)))];
          res = init.concat(cond1,
                            new ast.LabeledStatement(new ast.Identifier(brk_lbl),
                                                     new ast.BlockStatement([new ast.WhileStatement(new ast.Identifier(condVar),
                                                                                                    mkBlock(body.concat(update, cond2)))])));
	  attachComment(res, "for(", nd.init || "", ";", nd.test || "", ";", nd.update || "", ") { ... }");
          break;
          
        case 'SwitchStatement':
          var tmp = genTmp(), lbl = genTmp(true);
  
          var cond = normalizeExpression(nd.discriminant, tmp);
          
          // initialise default to single no-op statement
          var default_stmts = [new ast.EmptyStatement()];
          var body = default_stmts;
  
          if(nd.cases)
            for(var i=nd.cases.length-1;i>=0;--i) {
              if(!nd.cases[i].test) {
                // overwrite default statements
                default_stmts.length = 0;
                Array.prototype.push.apply(default_stmts, nd.cases[i].consequent.flatmap(function(stmt) { return normalizeStatement(stmt, lbl, cont_label); }));
              } else {
                var all_stmts = nd.cases[i].consequent;
                for(var j=i+1;j<nd.cases.length;++j) {
                  if(all_stmts.length && !cflow.mayCompleteNormally(all_stmts[all_stmts.length-1]))
                    break;
                  Array.prototype.push.apply(all_stmts, nd.cases[j].consequent);
                }
                var tmp2 = genTmp(), tmp3 = genTmp();
                body = normalizeExpression(nd.cases[i].test, tmp2)
                      .concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp3),
                                                                                            new ast.BinaryExpression("===", new ast.Identifier(tmp), new ast.Identifier(tmp2)))),
                              new ast.IfStatement(new ast.Identifier(tmp3),
                                                  mkBlock(all_stmts.flatmap(function(stmt) { return normalizeStatement(stmt, lbl, cont_label); })),
                                                  mkBlock(body)));
              }
            }
  
          res = cond.concat(new ast.LabeledStatement(new ast.Identifier(lbl), mkBlock(body)));
          attachComment(res, "switch(", nd.discriminant, ") { ... }");
          break;
      
        case 'WithStatement':
          var tmp = genTmp();
          var preamble = normalizeExpression(nd.object, tmp);
          scope = new scopes.WithScope(scope, tmp);
          var body = rec(nd.body);
          scope = scope.outer;
          res = preamble.concat(body);
	  attachComment(res, "with(", nd.object, ") { ... }");
          break;
      
        default:
          throw new Error("unknown statement type " + nd.type);
        }
        
        return inheritPosition(res, nd);
      }

      /* To simplify counterfactual execution, we want to replace conditionals of the
       * form
       * 
       *     if(x) {
       *       ...
       *     } else {
       *       ...
       *     }
       * 
       * where both "then" and "else" branch are non-trivial with code
       * of the form
       * 
       *     if(x) {
       *       ...
       *     } else {
       *       ;
       *     }
       *     if(x) {
       *       ;
       *     } else {
       *       ...
       *     }
       */
      function mkIf(cond, thenBranch, elseBranch) {
        var thenTrivial = thenBranch.length === 0,
            elseTrivial = elseBranch.length === 0;
        if(options.unfold_ifs && !thenTrivial && !elseTrivial) {
          var tmp = genTmp();
          return []
                .concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Identifier(cond))))
                .concat(new ast.IfStatement(new ast.Identifier(cond), mkBlock(thenBranch), mkBlock([])))
                .concat(new ast.IfStatement(new ast.Identifier(tmp), mkBlock([]), mkBlock(elseBranch)));
        } else {
          return [new ast.IfStatement(new ast.Identifier(cond), mkBlock(thenBranch), mkBlock(elseBranch))];
        }
      }

      if(root.type === 'FunctionDeclaration' || root.type === 'FunctionExpression') {
        var body = normalizeStatement(root.body);

        if(options.backwards_compatible)
          insertNoOpAfterFinalIf(body);

        if(options.unify_ret)
          body = [new ast.LabeledStatement(new ast.Identifier(ret_label), new ast.BlockStatement(body)),
                  new ast.ReturnStatement(new ast.Identifier(ret_var))];
        else if(cflow.mayCompleteNormally(new ast.BlockStatement(body)))
          body.push(new ast.ReturnStatement(null));

        if(ast.getAttribute(root, 'exposed'))
          throw new Error("Cannot handle downward exposed function expressions.");

        // process locally declared functions
        var fundecls;
        if(options.backwards_compatible) {
          fundecls = [];
          scope.decls.forEach(function(decl) {
            if(decl.type === 'FunctionDeclaration')
              fundecls = normalizeExpression(inheritPosition(new ast.AssignmentExpression('=', new ast.Identifier(decl.id.name),
                                                                                               new ast.FunctionExpression(decl.id, decl.params, decl.body)), decl)).concat(fundecls);
          });
        } else {
          fundecls = scope.decls.flatmap(function(decl) {
            if(decl.type === 'FunctionDeclaration')
              return normalizeExpression(inheritPosition(new ast.AssignmentExpression('=', new ast.Identifier(decl.id.name),
                                                                                           new ast.FunctionExpression(null, decl.params, decl.body)), decl));
            return [];
          });
        }
        body = fundecls.concat(body);

        // create variable declaration for local variables, functions and generated temporaries
        var local_names = [];
        scope.decls.forEach(function(decl) {
          if(decl.type !== 'FunctionDeclaration' && decl.type !== 'VariableDeclarator')
            return;
          var name = decls.getDeclName(decl);
          if(local_names.indexOf(name) === -1)
            local_names[local_names.length] = name;
        });
        var localDecls = [].concat(local_names.map(function(x) { return new ast.VariableDeclarator(new ast.Identifier(x), null); }),
                                   tmps);
        if(localDecls.length > 0)
          body.unshift(new ast.VariableDeclaration(localDecls, 'var'));

        var fn_expr = new ast.FunctionExpression(root.id, root.params, new ast.BlockStatement(body));
        if(ret_var)
          ast.setAttribute(fn_expr, 'ret_var', ret_var);
        return inheritPosition(fn_expr, root);
      } else if(root.type === 'Program') {
        var body = root.body.flatmap(function(stmt) { return normalizeStatement(stmt); });
  
        // declarations for locally declared functions become assignments to be inserted at the beginning of the program
        var fundecls = scope.decls.flatmap(function(decl) {
          if(decl.type === 'FunctionDeclaration')
            return normalizeExpression(inheritPosition(new ast.AssignmentExpression('=', new ast.Identifier(decl.id.name),
                                                                                         new ast.FunctionExpression(options.backwards_compatible ? decl.id : null, 
                                                                                                                    decl.params, decl.body)), decl));
          return [];
        });
  
        // variable declaration for temporaries, if necessary
        var tmpdecls = tmps.length > 0 ? [new ast.VariableDeclaration(tmps, 'var')] : [];
  
        if(options.backwards_compatible)
          insertNoOpAfterFinalIf(body);
  
        // whole program is wrapped into (function(__global) { ... })(typeof global === 'undefined' ? this : global);
        return new ast.Program([new ast.ExpressionStatement(new ast.CallExpression(new ast.FunctionExpression(null, [new ast.Identifier("__global")],
                                                                                                             new ast.BlockStatement(tmpdecls.concat(fundecls, body))),
                                                                                   [new ast.ConditionalExpression(new ast.BinaryExpression('===', new ast.UnaryExpression('typeof', new ast.Identifier('global')), new ast.Literal('undefined')),
                                                                                   								  new ast.ThisExpression(), new ast.Identifier("global"))]))]);
      }
    }
   
    return normalizeEntity(nd, new scopes.GlobalScope(nd));
  }
    
  exports.normalize = normalize;
});
