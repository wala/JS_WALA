if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('./ast'),
      cflow = require('./cflow'),
      context = require('./context');
  
  require('./util');
  
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
  
  // for compatibility with old implementation
  ast.EmptyStatement = function() {
    return new ast.BlockStatement([]);
  };
  
  function normalize(nd, context) {
    function rec(nd) {
      if(typeof arguments[1] === 'number')
        arguments[1] = null;
      if(typeof arguments[1] === 'string' || arguments[1] === null) {
        context.pushTarget(arguments[1]);
        var res = normalize(nd, context);
        context.popTarget();
        return res;
      } else {
        return normalize(nd, context);
      }
    }
    
    function normalizeFunction(nd) {
      context = context.enterFunction(nd);
      
      var body = rec(nd.body);
      
      insertNoOpAfterFinalIf(body);
      
      if(cflow.mayCompleteNormally(new ast.BlockStatement(body)))
        body.push(new ast.ReturnStatement(null));
      
      if(ast.getAttribute(nd, 'exposed'))
        throw new Error("Cannot handle downward exposed function expressions.");
      
      var fundecls = context.getFunctions().flatmap(function(decl) {
        return rec(new ast.AssignmentExpression('=', new ast.Identifier(decl.id.name),
                                                     new ast.FunctionExpression(decl.id /*null*/, decl.params, decl.body)));
      });
      body = fundecls.concat(body);

      var localNames = [];
      context.getLocalVariables().forEach(function(decl) {
        if(localNames.indexOf(decl.id.name) === -1)
          localNames[localNames.length] = decl.id.name;
      });
      context.getFunctions().forEach(function(decl) {
        if(localNames.indexOf(decl.id.name) === -1)
          localNames[localNames.length] = decl.id.name;
      });
      var localDecls = [].concat(localNames.map(function(x) { return new ast.VariableDeclarator(new ast.Identifier(x), null); }),
                                 context.getTempDecls());
      if(localDecls.length > 0)
        body.unshift(new ast.VariableDeclaration(localDecls, 'var'));

      context = context.outer;
      
      return new ast.FunctionExpression(nd.id, nd.params, new ast.BlockStatement(body));
    }
    
    function insertNoOpAfterFinalIf(stmts) {
      if(stmts.length && stmts[stmts.length-1].type === 'IfStatement')
        stmts[stmts.length++] = new ast.EmptyStatement();
      return stmts;
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
      return new ast.BlockStatement(insertNoOpAfterFinalIf(stmts));
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
      if(!thenTrivial && !elseTrivial) {
        var tmp = context.genTmp();
        return []
              .concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Identifier(cond))))
              .concat(new ast.IfStatement(new ast.Identifier(cond), mkBlock(thenBranch), mkBlock([])))
              .concat(new ast.IfStatement(new ast.Identifier(tmp), mkBlock([]), mkBlock(elseBranch)));
      } else {
        return [new ast.IfStatement(new ast.Identifier(cond), mkBlock(thenBranch), mkBlock(elseBranch))];
      }
    }

    switch(nd.type) {
    case 'Program':
      var body = nd.body.flatmap(rec);
      var fundecls = context.getFunctions().flatmap(function(decl) {
        return rec(new ast.AssignmentExpression('=', new ast.Identifier(decl.id.name),
                                                     new ast.FunctionExpression(decl.id /*null*/, decl.params, decl.body)), null);
      });
      var tmpdecls = context.hasTemps() ? [new ast.VariableDeclaration(context.getTempDecls(), 'var')] : [];
      insertNoOpAfterFinalIf(body);
      return new ast.Program([new ast.ExpressionStatement(new ast.CallExpression(new ast.FunctionExpression(null, [new ast.Identifier("__global")],
                                                                                                            new ast.BlockStatement(tmpdecls.concat(fundecls, body))),
                                                                                 [new ast.ThisExpression()]))]);
    case 'EmptyStatement':
      return [];
    case 'ExpressionStatement':
      return rec(nd.expression);
    case 'Literal':
      return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), nd))];
    case 'Identifier':
      if(context.isGlobal(nd.name)) {
        var tmp = context.genTmp();
        return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.name))),
                new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), new ast.MemberExpression(new ast.Identifier('__global'), new ast.Identifier(tmp), true)))];
      } else {
        return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), new ast.Identifier(nd.name)))];
      }
    case 'ArrayExpression':
      var tmps = context.genTmps(nd.elements.length);
      var elements = nd.elements.flatmap(function(elt, i) { return elt ? rec(elt, tmps[i]) : []; });
      return elements.concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()),
                                                                                           new ast.ArrayExpression(tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
    case 'ObjectExpression':
      var tmps = context.genTmps(nd.properties.length);
      var props = [];
      var body = nd.properties.flatmap(function(prop, i) {
        switch(prop.kind) {
        case 'init':
          props[props.length] = new ast.Property(prop.key, new ast.Identifier(tmps[i]), 'init');
          return rec(prop.value, tmps[i]);
        case 'get':
        case 'set':
          // TODO: this isn't quite right
          var funexpr = normalizeFunction(prop.value);
          props[props.length] = new ast.Property(prop.key, funexpr, prop.kind);
          return [];
        default:
          throw new Error("what kind of property is that???");
        }
      });
      return body.concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()),
                                                                                       new ast.ObjectExpression(props))));
    case 'MemberExpression':
      var base_tmp = context.genTmp(), index_tmp = context.genTmp();
      var base = rec(getBase(nd), base_tmp);
      var index = rec(getIndex(nd), index_tmp);
      var idx = new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true);
      if(nd.computed)
        ast.setAttribute(idx, 'isComputed', true);
      return base.concat(index,
                         new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), idx)));
    case 'ThisExpression':
      if(context.isGlobalContext())
        return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), new ast.Identifier('__global')))];
      else
        return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), new ast.ThisExpression()))];
    case 'VariableDeclaration':
      return nd.declarations.flatmap(rec);
    case 'VariableDeclarator':
      if(nd.init)
        return rec(new ast.AssignmentExpression('=', new ast.Identifier(nd.id.name), nd.init));
      else
        return [];
    case 'FunctionExpression':
      return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), normalizeFunction(nd)))];
    case 'FunctionDeclaration':
      return [];
    case 'BlockStatement':
      return nd.body.flatmap(rec);
    case 'ReturnStatement':
      if(nd.argument) {
        var tmp = context.genTmp();
        return rec(nd.argument, tmp).concat(new ast.ReturnStatement(new ast.Identifier(tmp)));
      } else {
        return [new ast.ReturnStatement(null)];
      }
    case 'AssignmentExpression':
      if(nd.operator === '=') {
        if(nd.left.type === 'Identifier') {
          if(context.isGlobal(nd.left.name)) {
            var tmp = context.genTmp();
            context.getTarget();
            return rec(nd.right).concat([new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.left.name))),
                                         new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier('__global'), new ast.Identifier(tmp), true),
                                                                                                       new ast.Identifier(context.getTarget())))]);
          } else {
            if(!context.isLocal(nd.left.name))
              ast.setAttribute(context.lookup(nd.left.name), 'exposed', true);
            if(context.hasTarget())
              return rec(nd.right).concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(nd.left.name), new ast.Identifier(context.getTarget()))));
            else
              return rec(nd.right, nd.left.name);
          }
        } else if(nd.left.type === 'MemberExpression') {
          var base_tmp = context.genTmp(), index_tmp = context.genTmp();
          var base = rec(getBase(nd.left), base_tmp), index = rec(getIndex(nd.left), index_tmp);
          var lhs = new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true);
          if(nd.left.computed)
            ast.setAttribute(lhs, 'isComputed', true);
          var rhs_comp = rec(nd.right, context.getTarget());
          return base.concat(index, rhs_comp, new ast.ExpressionStatement(new ast.AssignmentExpression('=', lhs, new ast.Identifier(context.getTarget()))));
        } else {
          throw new Error("unexpected lhs of type " + nd.left.type);
        }
      } else {
        var op = nd.operator.substring(0, nd.operator.length-1);
        var lhs = nd.left, rhs = nd.right;
        if(nd.left.type === 'Identifier') {
          var tmp = context.genTmp();
          return rec(rhs, tmp).concat(rec(new ast.AssignmentExpression('=', new ast.Identifier(nd.left.name), new ast.BinaryExpression(op, new ast.Identifier(nd.left.name), new ast.Identifier(tmp)))));
        } else if(nd.left.type === 'MemberExpression') {
          var tmp = context.genTmp(), target = context.getTarget();
          var base_tmp = context.genTmp(), index_tmp = context.genTmp(), extra = context.genTmp();
          return rec(getBase(lhs), base_tmp)
               .concat(rec(getIndex(lhs), index_tmp),
                       new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra), 
                                                                                     new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true))),
                       rec(rhs, tmp),
                       new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(target),
                                                                                     new ast.BinaryExpression(op, new ast.Identifier(extra), new ast.Identifier(tmp)))),
                       new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true), new ast.Identifier(target))));
        } else {
          throw new Error("unexpected lhs");
        }
      }
    case 'CallExpression':
      if(nd.callee.type === 'MemberExpression') {
        var base_tmp = context.genTmp(), index_tmp = context.genTmp();
        var base = rec(getBase(nd.callee), base_tmp);
        var index = rec(getIndex(nd.callee), index_tmp);
        var tmps = context.genTmps(nd.arguments.length);
        var args = nd.arguments.flatmap(function(arg, i) { return rec(arg, tmps[i]); });
        var callee = new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true);
        if(nd.callee.computed)
          ast.setAttribute(callee, 'isComputed', true);
        return base.concat(index, args,
                           new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()),
                                                                                         new ast.CallExpression(callee, tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
      } else if(nd.callee.type === 'Identifier' && nd.callee.name === 'eval') {
        var tmps = context.genTmps(nd.arguments.length);
        var args = nd.arguments.flatmap(function(arg, i) { return rec(arg, tmps[i]); });
        return args.concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()),
                                                                                         new ast.CallExpression(nd.callee, tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
      }
      // other cases are handled by next clause
    case 'NewExpression':
      var tmp = context.genTmp();
      var fn = rec(nd.callee, tmp);
      var tmps = context.genTmps(nd.arguments.length);
      var args = nd.arguments.flatmap(function(arg, i) { return rec(arg, tmps[i]); });
      return fn.concat(args, new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()),
                                                                                           new ast[nd.type](new ast.Identifier(tmp), tmps.map(function(tmp) { return new ast.Identifier(tmp); })))));
    case 'DebuggerStatement':
      return [new ast.DebuggerStatement()];
    case 'SequenceExpression':
      if(nd.expressions.length !== 2)
        throw new Error("cannot handle long sequence expressions");
      return rec(nd.expressions[0], null).concat(rec(nd.expressions[1]));
    case 'IfStatement':
      var tmp = context.genTmp();
      var res = rec(nd.test, tmp);
      var thenBranch = rec(nd.consequent, null);
      var elseBranch = nd.alternate ? rec(nd.alternate, null) : [];
      return res.concat(mkIf(tmp, thenBranch, elseBranch));
    case 'LogicalExpression':
      var ltmp, l, r, res;
      if(nd.operator === '&&') {
        ltmp = context.genTmp();
        l = rec(nd.left, ltmp);
        res = mkIf(ltmp, rec(nd.right, context.getTarget()),
                         [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), new ast.Identifier(ltmp)))]);
        return l.concat(res);
      } else if(nd.operator === '||') {
        ltmp = context.genTmp();
        l = rec(nd.left, ltmp);
        res = mkIf(ltmp, [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), new ast.Identifier(ltmp)))],
                         rec(nd.right, context.getTarget()));
        return l.concat(res);
      } else {
        throw new Error("unknown logical expression");
      }
    case 'BinaryExpression':
      var ltmp = context.genTmp(), rtmp = context.genTmp();
      l = rec(nd.left, ltmp);
      r = rec(nd.right, rtmp);
      res = new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()),
                                                                          new ast.BinaryExpression(nd.operator, new ast.Identifier(ltmp), new ast.Identifier(rtmp))));
      return l.concat(r, res);
    case 'ConditionalExpression':
      var tmp = context.genTmp();
      return rec(nd.test, tmp).concat(mkIf(tmp, rec(nd.consequent), rec(nd.alternate)));
    case 'UpdateExpression':
      var op = nd.operator === '++' ? '+' : '-';
      if(!nd.prefix && context.hasTarget()) {
        if(nd.argument.type === 'Identifier') {
          return rec(nd.argument, context.getTarget())
                .concat(rec(new ast.AssignmentExpression('=', new ast.Identifier(nd.argument.name), 
                                                              new ast.BinaryExpression(op, new ast.Identifier(nd.argument.name), new ast.Literal(1))), null));
          
        } else if(nd.argument.type === 'MemberExpression') {
          var target = context.getTarget();
          var base_tmp = context.genTmp(), index_tmp = context.genTmp(), extra = context.genTmp(), extra_extra = context.genTmp();
          return rec(getBase(nd.argument), base_tmp)
                .concat(rec(getIndex(nd.argument), index_tmp),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(target), 
                                                                                      new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true))),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra_extra), new ast.Literal(1))),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra), new ast.BinaryExpression(op, new ast.Identifier(target), new ast.Identifier(extra_extra)))),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true), new ast.Identifier(extra))));
        } else {
          throw new Error("unexpected operand to postfix expression");
        }
      } else {
        if(nd.argument.type === 'Identifier') {
          return rec(new ast.AssignmentExpression('=', nd.argument, new ast.BinaryExpression(op, new ast.Identifier(nd.argument.name), new ast.Literal(1))));
        } else if(nd.argument.type === 'MemberExpression') {
          var target = context.getTarget();
          var base_tmp = context.genTmp(), index_tmp = context.genTmp(), extra = context.genTmp(), extra_extra = context.genTmp();
          return rec(getBase(nd.argument), base_tmp)
                .concat(rec(getIndex(nd.argument), index_tmp),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra), 
                                                                                      new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true))),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(extra_extra), new ast.Literal(1))),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(target),
                                                                                      new ast.BinaryExpression(op, new ast.Identifier(extra), new ast.Identifier(extra_extra)))),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp), true),
                                                                                      new ast.Identifier(target))));
        } else {
          throw new Error("unexpected operand to prefix expression");
        }
      }
    case 'UnaryExpression': 
      var op = nd.operator;
      if(op === 'delete') {
        if(nd.argument.type === 'Identifier') {
          if(context.isGlobal(nd.argument.name)) {
            var target = context.getTarget();
            var tmp = context.genTmp();
            return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.argument.name))),
                    new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(target),
                                                                                  new ast.UnaryExpression('delete',
                                                                                                          new ast.MemberExpression(new ast.Identifier('__global'),
                                                                                                                                   new ast.Identifier(tmp), true))))];              
          } else {
            return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), nd))];
          }
        } else if(nd.argument.type === 'MemberExpression') {
          var target = context.getTarget();
          var base_tmp = context.genTmp(), index_tmp = context.genTmp();
          return rec(getBase(nd.argument), base_tmp)
                .concat(rec(getIndex(nd.argument), index_tmp),
                        new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(target),
                                                                                      new ast.UnaryExpression('delete',
                                                                                                              new ast.MemberExpression(new ast.Identifier(base_tmp),
                                                                                                                                       new ast.Identifier(index_tmp), true)))));
        } else {
          throw new Error();
        }
      } else {
        var tmp = context.genTmp();
        return rec(nd.argument, tmp)
              .concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()),
                                                                                    new ast.UnaryExpression(op, new ast.Identifier(tmp)))));
      }        
    case 'ThrowStatement':
      var tmp = context.genTmp();
      return rec(nd.argument, tmp).concat(new ast.ThrowStatement(new ast.Identifier(tmp)));
    case 'TryStatement':
      if(nd.handlers.length > 0 && nd.finalizer) {
        return rec(new ast.TryStatement(new ast.BlockStatement([new ast.TryStatement(nd.block, nd.guardedHandlers, nd.handlers, null)]),
                                        [], [], nd.finalizer), null);
      } else if(nd.handlers.length > 0) {
        if(nd.guardedHandlers && nd.guardedHandlers.length > 0 || nd.handlers.length > 1)
          throw new Error("fancy catch clauses not supported");
        
        var tryblock = rec(nd.block, null);
        context = context.enterCatchClause(nd.handlers[0]);
        var catchblock = rec(nd.handlers[0].body, null);
        context = context.outer;

        return [new ast.TryStatement(mkBlock(tryblock), [], [new ast.CatchClause(nd.handlers[0].param, mkBlock(catchblock))], null)];
      } else if(nd.finalizer) {
        var tryblock = rec(nd.block, null);
        if(nd.finalizer.body.length === 0)
          return tryblock;

        var finallyblock = rec(nd.finalizer, null);
        return [new ast.TryStatement(mkBlock(tryblock), [], [], mkBlock(finallyblock))];
      }
    case 'LabeledStatement':
      context.pushLabel(nd.label.name, isLoop(nd.body) && nd.label.name);
      var stmts = rec(nd.body);
      context.popLabel();
      return [new ast.LabeledStatement(nd.label, mkBlock(stmts))];
    case 'BreakStatement':
      if(nd.label)
        return [nd];
      return [new ast.BreakStatement(new ast.Identifier(context.getBreakLabel()))];
    case 'ContinueStatement':
      if(nd.label)
        return [new ast.BreakStatement(new ast.Identifier(nd.label.name))];
      return [new ast.BreakStatement(new ast.Identifier(context.getContLabel()))];
    case 'WhileStatement':
      var condtmp = context.genTmp();
      var brk_lbl = context.genTmp(true), cont_lbl = context.genTmp(true);
      context.pushLabel(brk_lbl, cont_lbl);
      // initial computation of condition
      var cond1 = rec(nd.test, condtmp);
      // while body
      var body = [new ast.LabeledStatement(new ast.Identifier(cont_lbl), mkBlock(rec(nd.body)))];
      // computation of updated condition
      var cond2 = rec(nd.test, condtmp);
      var res = cond1.concat(new ast.LabeledStatement(new ast.Identifier(brk_lbl),
                                                      new ast.BlockStatement([new ast.WhileStatement(new ast.Identifier(condtmp),
                                                                                                     mkBlock(body.concat(cond2)))])));
      context.popLabel();
      return res;
    case 'DoWhileStatement':
      var tmp = context.genTmp();
      var brk_lbl = context.genTmp(true), cont_lbl = context.genTmp(true);
      context.pushLabel(brk_lbl, cont_lbl);
      var body = [new ast.LabeledStatement(new ast.Identifier(cont_lbl), mkBlock(rec(nd.body, null)))];
      context.popLabel();
      var cond = rec(nd.test, tmp);
      return [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(true))),
              new ast.LabeledStatement(new ast.Identifier(brk_lbl), new ast.BlockStatement([new ast.WhileStatement(new ast.Identifier(tmp),
                                                                                                                   mkBlock(body.concat(cond)))]))];
    case 'ForInStatement':
      if(nd.left.type === 'VariableDeclaration') {
        return rec(nd.left).concat(rec(new ast.ForInStatement(new ast.Identifier(nd.left.declarations[0].id.name), nd.right, nd.body)));
      } else if(nd.left.type === 'Identifier') {
        var tmp = context.genTmp(), lbl = context.genTmp(true);
        var init = rec(nd.right, tmp);
        context.pushLabel(lbl, lbl);
        var body = rec(nd.body);
        context.popLabel();
      
        var loopVar;
        debugger;
        if(context.isLocal(nd.left.name)) {
          loopVar = nd.left.name;
        } else {
          loopVar = context.genTmp();
          body = rec(new ast.AssignmentExpression('=', new ast.Identifier(nd.left.name), new ast.Identifier(loopVar)), null)
                .concat(body);
        }
      
        return init.concat(new ast.LabeledStatement(new ast.Identifier(lbl), 
                           new ast.BlockStatement([new ast.ForInStatement(new ast.Identifier(loopVar), new ast.Identifier(tmp),
                                                                          mkBlock(body))])));
      } else {
        throw new Error("cannot handle for-in loop");
      }
    case 'ForStatement':
      var init = nd.init ? rec(nd.init, null) : [];
      var condVar = context.genTmp();
      var cond1, cond2;
      if(!nd.test) {
        cond1 = [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(condVar), new ast.Literal(true)))];
        cond2 = [];
      } else {
        cond1 = rec(nd.test, condVar);
        cond2 = rec(nd.test, condVar);
      }
      var update = nd.update ? rec(nd.update, null) : [];
      var brk_lbl = context.genTmp(true), cont_lbl = context.genTmp(true);
      context.pushLabel(brk_lbl, cont_lbl);
      var body = [new ast.LabeledStatement(new ast.Identifier(cont_lbl), mkBlock(rec(nd.body)))];
      context.popLabel();
      return init.concat(cond1,
                         new ast.LabeledStatement(new ast.Identifier(brk_lbl),
                                                  new ast.BlockStatement([new ast.WhileStatement(new ast.Identifier(condVar),
                                                                                                 mkBlock(body.concat(update, cond2)))])));
    case 'SwitchStatement':
      var tmp = context.genTmp(), lbl = context.genTmp(true);

      var cond = rec(nd.discriminant, tmp);
      // initialise default to single no-op statement
      var default_stmts = [new ast.EmptyStatement()];
      var body = default_stmts;

      context.pushLabel(lbl);
      if(nd.cases)
        for(var i=nd.cases.length-1;i>=0;--i) {
          if(!nd.cases[i].test) {
            // overwrite default statements
            default_stmts.length = 0;
            Array.prototype.push.apply(default_stmts, nd.cases[i].consequent.flatmap(function(stmt) { return rec(stmt, null); }));
          } else {
            var all_stmts = nd.cases[i].consequent;
            for(var j=i+1;j<nd.cases.length;++j) {
              if(all_stmts.length && !cflow.mayCompleteNormally(all_stmts[all_stmts.length-1]))
                break;
              Array.prototype.push.apply(all_stmts, nd.cases[j].consequent);
            }
            var tmp2 = context.genTmp(), tmp3 = context.genTmp();
            body = rec(nd.cases[i].test, tmp2)
                  .concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp3),
                                                                                        new ast.BinaryExpression("===", new ast.Identifier(tmp), new ast.Identifier(tmp2)))),
                          new ast.IfStatement(new ast.Identifier(tmp3),
                                              mkBlock(all_stmts.flatmap(function(stmt) { return rec(stmt, null); })),
                                              mkBlock(body)));
          }
        }
      context.popLabel();

      return cond.concat(new ast.LabeledStatement(new ast.Identifier(lbl), mkBlock(body)));
    default:
      throw new Error("cannot handle node of type " + nd.type);
    }
  }
  
  exports.normalize = function(nd) { return normalize(nd, context.makeRootContext(nd)); };
});