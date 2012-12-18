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
 * Intra-procedural control flow graph construction.
 * 
 * Every statement is given attributes 'succ' and 'pred' containing the sets of
 * successor/predecessor nodes, using the set ADT implemented in sets.js.
 * 
 * Programs and functions are furthermore given an entry node that does not correspond
 * to any source-level statement, but simply serves to anchor the CFG. Unreachable
 * statements have these entry nodes as their only predecessors.
 */

if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('../../common/lib/ast'),
      sets = require('../../common/lib/sets');
  
  function Entry() {
    this.type = 'Entry';
    this.attr = {};
  }
  Entry.children = [];

  /** Adds a CFG edge from src to dest, i.e., enters dest into src's succ set, and src
   *  into dest's pred set. */
  function addEdge(src, dest) {
    if(!src || !dest || !src.type || !dest.type)
      throw new Error("both src and dest must be nodes!");
    ast.setAttribute(src, 'succ', sets.add(ast.getAttribute(src, 'succ'), dest));
    ast.setAttribute(dest, 'pred', sets.add(ast.getAttribute(dest, 'pred'), src));
  }
  
  /** Shortcut when adding edges from same source to multiple dests. */
  function addEdges(src, dests) {
    sets.forEach(dests, function(dest) { addEdge(src, dest); });
  }
  
  /** Traverses the context to find the successors of a break statement.
   * 
   * @param label the label of the loop out of which to break; since we assume JSNF,
   *        every break has an explicit label
   *        
   * @param context the current context
   * 
   * @return the (single) successor node, or null if none was found; this can
   *         only happen for malformed programs */
  function getBreakTarget(label, context) {
    for(var i=context.length-1;i>=0;--i) {
      var item = context[i];
      if(item.type === 'program' || item.type === 'function')
        throw new Error("label of break statement not found");
      if(item.type === 'label' && item.label === label || item.type === 'finally')
        return item.next;
    }
    throw new Error("malformed context");
  }
  
  /** Traverses the context to find the successors of a return statement.
   * 
   *  @return the (single) successor node, or null if none was found; this can
   *          only happen for malformed programs */
  function getReturnTarget(context) {
    for(var i=context.length-1;i>=0;--i) {
      var item = context[i];
      if(item.type === 'program')
        throw new Error("illegal return statement at toplevel");
      if(item.type === 'function')
        return item.node;
      if(item.type === 'finally')
        return item.next;
    }
    throw new Error("malformed context");
  }
  
  /** Traverses the context to find the successors of an exception throw.
   * 
   *   @return the (single) successor node */
  function getExceptionTarget(context) {
    for(var i=context.length-1;i>=0;--i) {
      var item = context[i];
      if(item.type === 'program' || item.type === 'function')
        return item.node;
      if(item.type === 'finally' || item.type === 'catch')
        return item.next;
    }
    throw new Error("malformed context");
  }
  
  /** Traverses the context to find the entry node of the closest enclosing function or script. */
  function getFakeRoot(context) {
    for(var i=context.length-1;i>=0;--i) {
      var item = context[i];
      if(item.type === 'program' || item.type === 'function')
        return ast.getAttribute(item.node, 'fakeRoot');
    }
    throw new Error("no enclosing function/script found");
  }

  /** Conservatively checks whether an expression may throw an exception during evaluation.
   *  Assumes JSNF, so subexpressions are always local variables.
   *  
   *  TODO: doesn't account for toString/valueOf */
  function mayThrow(expr) {
    switch(expr.type) {
    case 'CallExpression':
    case 'NewExpression':
    case 'UpdateExpression':
      return true;
    case 'MemberExpression':
      return expr.object.name !== '__global';
    case 'UnaryExpression':
      return expr.operator === 'delete';
    case 'BinaryExpression':
      return expr.operator === 'in' || expr.operator === 'instanceof';
    default:
      return false;
    }
  }

  /** Builds CFGs for program prog and every function inside it; this is the main entry point. */
  function buildCFG(prog) {
    // set up fake root
    var fakeRoot = new Entry();
    ast.setPosition(fakeRoot, ast.getPosition(prog));
    ast.setAttribute(prog, 'fakeRoot', fakeRoot);
    addEdge(fakeRoot, prog.body[0]);
    
    // build CFGs for all statements
    var accu = { exn: false, ret: false, brk: [] },
        context = [{ type: 'program', node: prog }];
    buildBlockCFG(prog.body, prog, context, accu);
  }
  
  /** Builds CFGs for function fn and every one of its inner functions. */
  function buildFunctionCFG(fn, context) {
    // set up fake root
    var fakeRoot = new Entry();
    ast.setPosition(fakeRoot, ast.getPosition(fn));
    ast.setAttribute(fn, 'fakeRoot', fakeRoot);
    addEdge(fakeRoot, fn.body.body[0]);
    
    // build CFGs for all statements
    var accu = { exn: false, ret: false, brk: [] };
    context[context.length] = { type: 'function', node: fn };
    buildStmtCFG(fn.body, sets.singleton(fn), context, accu);
    --context.length;
  }

  /**
   * Builds a CFG for a sequence of statements. For the meanings of the parameters, see buildStmtCFG.
   */
  function buildBlockCFG(stmts, following, context, accu) {
    for(var i=0;i<stmts.length;++i) {
      buildStmtCFG(stmts[i], i+1 < stmts.length ? sets.singleton(stmts[i+1]) : following, context, accu);
      
      // if statement is unreachable, introduce edge from fake root
      if(sets.size(ast.getAttribute(stmts[i], 'pred')) === 0)
        addEdge(getFakeRoot(context), stmts[i]);
    }
  }
  
  /**
   * Builds CFG for a statement; for compound statements, recursively builds CFGs for child statements
   * and even functions nested inside them.
   * 
   * @param stmt statement to build CFG for
   * 
   * @param following the set of control flow successors for normal control flow
   * 
   * @param context stack describing the syntactic surroundings of stmt
   * 
   * @param accu accumulator for recording information about whether non-local control flow was encountered
   * 
   *   {
   *     exn: boolean,     whether a statement that could throw an exception has been encountered
   *     ret: boolean,     whether a return statement has been encountered
   *     brk: string[]     list of labels for which break statements have been encountered
   *   }
   * 
   * @returns the final value of accu
   */
    function buildStmtCFG(stmt, following, context, accu) {
      switch(stmt.type) {
      case 'EmptyStatement':
      case 'DebuggerStatement':
      case 'VariableDeclaration':
        addEdges(stmt, following);
        break;
        
      case 'ExpressionStatement':
        switch(stmt.expression.type) {
        case 'CallExpression':
          // this must be the global (function(__global) { ... })(this) wrapping an entire script
          addEdges(stmt, following);
          buildFunctionCFG(stmt.expression.callee, context);
          break;
        case 'AssignmentExpression':
          addEdges(stmt, following);
          if(mayThrow(stmt.expression.left) || mayThrow(stmt.expression.right)) {
            addEdge(stmt, getExceptionTarget(context));
            accu.exn = true;
          }
          if(stmt.expression.right.type === 'FunctionExpression')
            buildFunctionCFG(stmt.expression.right, context);
          break;
        default:
          throw new Error("unexpected expression statement");
        }
        break;

      case 'IfStatement':
        addEdge(stmt, stmt.consequent.body[0]);
        addEdge(stmt, stmt.alternate.body[0]);
        buildStmtCFG(stmt.consequent, following, context, accu);
        buildStmtCFG(stmt.alternate, following, context, accu);
        break;
        
      case 'WhileStatement':
      case 'ForInStatement':
        addEdge(stmt, stmt.body.body[0]);
        addEdges(stmt, following);
        buildStmtCFG(stmt.body, sets.singleton(stmt), context, accu);
        break;
        
      case 'ReturnStatement':
        addEdge(stmt, getReturnTarget(context));
        accu.ret = true;
        break;
        
      case 'LabeledStatement':
        addEdge(stmt, stmt.body.body[0]);
        context[context.length] = { type: 'label', label: stmt.label.name, next: following };
        buildStmtCFG(stmt.body, following, context, accu);
        --context.length;
        accu.brk = sets.remove(accu.brk, stmt.label.name);
        break;
        
      case 'BreakStatement':
        addEdge(stmt, getBreakTarget(stmt.label.name, context));
        accu.brk = sets.add(accu.brk, stmt.label.name);
        break;
        
      case 'ThrowStatement':
        addEdge(stmt, getExceptionTarget(context));
        accu.exn = true;
        break;
        
      case 'TryStatement':
        addEdge(stmt, stmt.block.body[0]);
        if(!stmt.finalizer) {
          // try-catch
          context[context.length] = { type: 'catch', next: stmt.handlers[0].body.body[0] };
          buildStmtCFG(stmt.block, following, context, accu);
          --context.length;
          accu.exn = false;
          buildStmtCFG(stmt.handlers[0].body, following, context, accu);
        } else {
          // try-finally
          context[context.length] = { type: 'finally', next: stmt.finalizer.body[0] };
          buildStmtCFG(stmt.block, sets.singleton(stmt.finalizer.body[0]), context, accu);
          --context.length;
          var after = sets.clone(following);
          if(accu.exn)
            after = sets.add(after, getExceptionTarget(context));
          if(accu.ret)
            after = sets.add(after, getReturnTarget(context));
          accu.brk.forEach(function(lbl) {
            after = sets.add(after, getBreakTarget(lbl, context));
          });
          buildStmtCFG(stmt.finalizer, after, context, accu);
        }
        break;
        
      case 'BlockStatement':
        buildBlockCFG(stmt.body, following, context, accu);
        break;
        
      default:
        throw new Error("unexpected statement of type " + stmt.type);
      }
      return accu;
    }
    
    exports.buildCFG = buildCFG;
});