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
  
  // for compatibility with old implementation
  ast.EmptyStatement = function() {
    return new ast.BlockStatement([]);
  };
  
  function normalize(nd, context) {
    function rec(nd) {
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
      
      if(cflow.mayCompleteNormally(new ast.BlockStatement(body)))
        body.push(new ast.ReturnStatement(null));
      
      if(ast.getAttribute(nd, 'exposed'))
        throw new Error("Cannot handle downward exposed function expressions.");
      
      var fundecls = context.getFunctions().flatmap(function(decl) {
        return rec(new ast.AssignmentExpression('=', new ast.Identifier(decl.id.name),
                                                     new ast.FunctionExpression(decl.id /*null*/, decl.params, decl.body)));
      });
      body = fundecls.concat(body);

      var localDecls = [].concat(
                       context.getLocalVariables().map(function(decl) {
                         return new ast.VariableDeclarator(new ast.Identifier(decl.id.name), null);
                       }),
                       context.getFunctions().map(function(decl) {
                         return new ast.VariableDeclarator(new ast.Identifier(decl.id.name), null);
                       }),
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
              .concat(new ast.ExpressionStatement(new ast.AssignmentExpression(new ast.Identifier(tmp), new ast.Identifier(cond))))
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
                                                     new ast.FunctionExpression(decl.id /*null*/, decl.params, decl.body)));
      });
      var tmpdecls = context.hasTemps() ? [new ast.VariableDeclaration(context.getTempDecls(), 'var')] : [];
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
        idx.setAttribute('isComputed', true);
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
        return new ast.ReturnStatement(null);
      }
    case 'AssignmentExpression':
      if(nd.operator === '=') {
        if(nd.left.type === 'Identifier') {
          if(context.isGlobal(nd.left.name)) {
            var tmp = context.genTmp();
            return rec(nd.right).concat([new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(tmp), new ast.Literal(nd.left.name))),
                                         new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.MemberExpression(new ast.Identifier('__global'), new ast.Identifier(tmp), true),
                                                                                                       new ast.Identifier(context.getTarget())))]);
          } else {
            if(!context.localLookup(nd.left.name))
              context.lookup(nd.left.name).setAttribute('exposed', true);
            if(context.hasTarget())
              return rec(nd.right).concat(new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(nd.left.name), new ast.Identifier(context.getTarget()))));
            else
              return rec(nd.right, nd.left.name);
          }
        }
      } else {
        throw new Error("cannot handle operator assign");
      }
    case 'CallExpression':
      if(nd.callee.type === 'MemberExpression') {
        var base_tmp = context.genTmp(), index_tmp = context.genTmp();
        var base = rec(getBase(nd.callee), base_tmp);
        var index = rec(getIndex(nd.callee), index_tmp);
        var tmps = context.genTmps(nd.arguments.length);
        var args = nd.arguments.flatmap(function(arg, i) { return rec(arg, tmps[i]); });
        var callee = new ast.MemberExpression(new ast.Identifier(base_tmp), new ast.Identifier(index_tmp));
        if(nd.callee.computed)
          callee.setAttribute('isComputed', true);
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
      var n = nd.expressions.length;
      // only the last expression should be normalised with the same target as the sequence expression
      return nd.expressions.flatmap(function(expr, i) { rec(expr, i < n && null); });
    case 'IfStatement':
      var tmp = context.genTmp();
      var res = rec(nd.test, tmp);
      var thenBranch = rec(nd.consequent);
      var elseBranch = nd.alternate ? rec(nd.alternate) : [];
      return res.concat(mkIf(tmp, thenBranch, elseBranch));
    case 'LogicalExpression':
      var ltmp, l, r, res;
      if(nd.operator === '&&') {
        ltmp = context.genTmp();
        l = rec(nd.left, ltmp);
        res = mkIf(ltmp, rec(nd.right, context.getTarget()),
                         [new ast.ExpressionStatement(new ast.AssignmentExpression('=', new ast.Identifier(context.getTarget()), new ast.Identifier(ltmp)))]);
        return l.concat(res);
      } else if(op === '||') {
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
    default:
      throw new Error("cannot handle node of type " + nd.type);
    }
  }
  
  exports.normalize = function(nd) { return normalize(nd, context.makeRootContext(nd)); };
});