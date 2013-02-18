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
 * Unit tests for CFG algorithms.
 */

var ast = require('../../common/lib/ast.js'),
    sets = require('../../common/lib/sets.js'),
    cfg = require('../lib/cfg'),
    dominators = require('../lib/dominators'),
    esprima = require('esprima');

// run an individual test given input and expected output
function runtest(test, prog, facts, normalise) {
  var ast = esprima.parse(prog, { loc: true, range: true });
  cfg.buildCFG(ast);
  dominators.buildDominatorTrees(ast, true);
  var actual = dumpCFG(ast);
  if(actual !== facts) {
    console.log("actual:\n" + actual);
    console.log("expected:\n" + facts); 
  }
  test.equal(actual, facts);
  test.done();
}

function iterCFG(nd, f) {
  function rec(nd) {
    iterCFG(nd, f);
  }
  
  if(!nd)
    return;
  
  switch(nd.type) {
  case 'Program':
    f(nd);
    f(ast.getAttribute(nd, 'fakeRoot'));
    nd.body.forEach(rec);
    break;
    
  case 'FunctionExpression':
    f(nd);
    f(ast.getAttribute(nd, 'fakeRoot'));
    rec(nd.body);
    break;
    
  case 'EmptyStatement':
  case 'DebuggerStatement':
  case 'VariableDeclaration':
  case 'ReturnStatement':
  case 'BreakStatement':
  case 'ThrowStatement':
    f(nd);
    break;
    
  case 'ExpressionStatement':
    f(nd);
    switch(nd.expression.type) {
    case 'CallExpression':
      f(nd.expression.callee);
      break;
    case 'AssignmentExpression':
      if(nd.expression.right.type === 'FunctionExpression')
        rec(nd.expression.right);
      break;
    default:
      throw new Error("unexpected expression statement");
    }
    break;

  case 'IfStatement':
    f(nd);
    rec(nd.consequent);
    rec(nd.alternate);
    break;
    
  case 'WhileStatement':
  case 'ForInStatement':
    f(nd);
    rec(nd.body);
    break;
    
  case 'LabeledStatement':
    f(nd);
    rec(nd.body);
    break;
    
  case 'TryStatement':
    f(nd);
    rec(nd.block);
    if(nd.handlers && nd.handlers[0])
      rec(nd.handlers[0].body);
    if(nd.finalizer)
      rec(nd.finalizer);
    break;
    
  case 'BlockStatement':
    for(var i=0;i<nd.body.length;++i)
      rec(nd.body[i]);
    break;
    
  default:
    throw new Error("unexpected statement of type " + nd.type);
  }
}

function dumpNode(nd) {
    if(!nd)
      return "<null>";
    var pos = ast.getPosition(nd);
    return nd.type + " at " + pos.start_line + ":" + pos.start_offset;
}

function dumpCFG(root) {
  var res = "";
  iterCFG(root, function(nd) {
    var succs = ast.getAttribute(nd, 'succ');
        idom = ast.getAttribute(nd, 'idom'),
        ipdom = ast.getAttribute(nd, 'ipdom');
    if(sets.size(succs) === 0) {
      res += dumpNode(nd) + " --> []\n";
    } else {
      res += dumpNode(nd) + " --> [" + sets.map(succs, dumpNode).join(', ') + "]\n";
    }
    res += "    immediate dominator: " + (idom ? dumpNode(idom) : "none") + "\n";
    res += "    immediate postdominator: " + (ipdom ? dumpNode(ipdom) : "none") + "\n";
  });
  return res;
}

exports.test1 = function(test) {
    runtest(test, 
      "f = function(x) {\n"
    + "  var t, y;\n"
    + "  if(x) {\n"
    + "    y = 42;\n"
    + "  } else {\n"             // line  5
    + "    y = 23;\n"
    + "  }\n"
    + "  t = g();\n"
    + "  return y;\n"
    + "};\n"                     // line 10
    + "g = function() {\n"
    + "  var i, t1, t2;\n"
    + "  i=0;\n"
    + "  t1 = i < 10;\n"
    + "  l: { while(t1) {\n"     // line 15
    + "    try {\n"               
    + "      t2 = alert(i);\n"
    + "    } catch(e) {\n"
    + "      break l;\n"
    + "    }\n"                  // line 20
    + "    i = i + 1;\n"          
    + "    t1 = i < 10;\n"
    + "  } }\n"
    + "  return null;\n"
    + "};\n"                     // line 25
    + "z = f(56);\n",             
      "Program at 1:0 --> []\n"
    + "    immediate dominator: ExpressionStatement at 26:305\n"
    + "    immediate postdominator: none\n"
    + "Entry at 1:0 --> [ExpressionStatement at 1:0]\n"
    + "    immediate dominator: none\n"
    + "    immediate postdominator: ExpressionStatement at 1:0\n"
    + "ExpressionStatement at 1:0 --> [ExpressionStatement at 11:105]\n"
    + "    immediate dominator: Entry at 1:0\n"
    + "    immediate postdominator: ExpressionStatement at 11:105\n"
    + "FunctionExpression at 1:4 --> []\n"
    + "    immediate dominator: ExpressionStatement at 8:81\n"
    + "    immediate postdominator: none\n"
    + "Entry at 1:4 --> [VariableDeclaration at 2:20]\n"
    + "    immediate dominator: none\n"
    + "    immediate postdominator: VariableDeclaration at 2:20\n"
    + "VariableDeclaration at 2:20 --> [IfStatement at 3:32]\n"
    + "    immediate dominator: Entry at 1:4\n"
    + "    immediate postdominator: IfStatement at 3:32\n"
    + "IfStatement at 3:32 --> [ExpressionStatement at 4:44, ExpressionStatement at 6:67]\n"
    + "    immediate dominator: VariableDeclaration at 2:20\n"
    + "    immediate postdominator: ExpressionStatement at 8:81\n"
    + "ExpressionStatement at 4:44 --> [ExpressionStatement at 8:81]\n"
    + "    immediate dominator: IfStatement at 3:32\n"
    + "    immediate postdominator: ExpressionStatement at 8:81\n"
    + "ExpressionStatement at 6:67 --> [ExpressionStatement at 8:81]\n"
    + "    immediate dominator: IfStatement at 3:32\n"
    + "    immediate postdominator: ExpressionStatement at 8:81\n"
    + "ExpressionStatement at 8:81 --> [ReturnStatement at 9:92, FunctionExpression at 1:4]\n"
    + "    immediate dominator: IfStatement at 3:32\n"
    + "    immediate postdominator: FunctionExpression at 1:4\n"
    + "ReturnStatement at 9:92 --> [FunctionExpression at 1:4]\n"
    + "    immediate dominator: ExpressionStatement at 8:81\n"
    + "    immediate postdominator: FunctionExpression at 1:4\n"
    + "ExpressionStatement at 11:105 --> [ExpressionStatement at 26:305]\n"
    + "    immediate dominator: ExpressionStatement at 1:0\n"
    + "    immediate postdominator: ExpressionStatement at 26:305\n"
    + "FunctionExpression at 11:109 --> []\n"
    + "    immediate dominator: ReturnStatement at 24:289\n"
    + "    immediate postdominator: none\n"
    + "Entry at 11:109 --> [VariableDeclaration at 12:124]\n"
    + "    immediate dominator: none\n"
    + "    immediate postdominator: VariableDeclaration at 12:124\n"
    + "VariableDeclaration at 12:124 --> [ExpressionStatement at 13:141]\n"
    + "    immediate dominator: Entry at 11:109\n"
    + "    immediate postdominator: ExpressionStatement at 13:141\n"
    + "ExpressionStatement at 13:141 --> [ExpressionStatement at 14:148]\n"
    + "    immediate dominator: VariableDeclaration at 12:124\n"
    + "    immediate postdominator: ExpressionStatement at 14:148\n"
    + "ExpressionStatement at 14:148 --> [LabeledStatement at 15:163]\n"
    + "    immediate dominator: ExpressionStatement at 13:141\n"
    + "    immediate postdominator: LabeledStatement at 15:163\n"
    + "LabeledStatement at 15:163 --> [WhileStatement at 15:168]\n"
    + "    immediate dominator: ExpressionStatement at 14:148\n"
    + "    immediate postdominator: WhileStatement at 15:168\n"
    + "WhileStatement at 15:168 --> [TryStatement at 16:184, ReturnStatement at 24:289]\n"
    + "    immediate dominator: LabeledStatement at 15:163\n"
    + "    immediate postdominator: ReturnStatement at 24:289\n"
    + "TryStatement at 16:184 --> [ExpressionStatement at 17:196]\n"
    + "    immediate dominator: WhileStatement at 15:168\n"
    + "    immediate postdominator: ExpressionStatement at 17:196\n"
    + "ExpressionStatement at 17:196 --> [ExpressionStatement at 21:253, BreakStatement at 19:234]\n"
    + "    immediate dominator: TryStatement at 16:184\n"
    + "    immediate postdominator: ReturnStatement at 24:289\n"
    + "BreakStatement at 19:234 --> [ReturnStatement at 24:289]\n"
    + "    immediate dominator: ExpressionStatement at 17:196\n"
    + "    immediate postdominator: ReturnStatement at 24:289\n"
    + "ExpressionStatement at 21:253 --> [ExpressionStatement at 22:268]\n"
    + "    immediate dominator: ExpressionStatement at 17:196\n"
    + "    immediate postdominator: ExpressionStatement at 22:268\n"
    + "ExpressionStatement at 22:268 --> [WhileStatement at 15:168]\n"
    + "    immediate dominator: ExpressionStatement at 21:253\n"
    + "    immediate postdominator: WhileStatement at 15:168\n"
    + "ReturnStatement at 24:289 --> [FunctionExpression at 11:109]\n"
    + "    immediate dominator: WhileStatement at 15:168\n"
    + "    immediate postdominator: FunctionExpression at 11:109\n"
    + "ExpressionStatement at 26:305 --> [Program at 1:0]\n"
    + "    immediate dominator: ExpressionStatement at 11:105\n"
    + "    immediate postdominator: Program at 1:0\n");
};

exports.test2 = function(test) {
    runtest(test,
      "try {\n"
    + "  while (x) {\n"
    + "    ;\n"
    + "  }\n"
    + "} finally {\n"         // line 5
    + "  ;\n"                
    + "}\n",
      "Program at 1:0 --> []\n"
    + "    immediate dominator: EmptyStatement at 6:44\n"
    + "    immediate postdominator: none\n"
    + "Entry at 1:0 --> [TryStatement at 1:0]\n"
    + "    immediate dominator: none\n"
    + "    immediate postdominator: TryStatement at 1:0\n"
    + "TryStatement at 1:0 --> [WhileStatement at 2:8]\n"
    + "    immediate dominator: Entry at 1:0\n"
    + "    immediate postdominator: WhileStatement at 2:8\n"
    + "WhileStatement at 2:8 --> [EmptyStatement at 3:24, EmptyStatement at 6:44]\n"
    + "    immediate dominator: TryStatement at 1:0\n"
    + "    immediate postdominator: EmptyStatement at 6:44\n"
    + "EmptyStatement at 3:24 --> [WhileStatement at 2:8]\n"
    + "    immediate dominator: WhileStatement at 2:8\n"
    + "    immediate postdominator: WhileStatement at 2:8\n"
    + "EmptyStatement at 6:44 --> [Program at 1:0]\n"
    + "    immediate dominator: WhileStatement at 2:8\n"
    + "    immediate postdominator: Program at 1:0\n");
};

exports.test3 = function(test) {
    runtest(test,
      "throw null;\n"
    + ";\n",
      "Program at 1:0 --> []\n"
    + "    immediate dominator: Entry at 1:0\n"
    + "    immediate postdominator: none\n"
    + "Entry at 1:0 --> [ThrowStatement at 1:0, EmptyStatement at 2:12]\n"
    + "    immediate dominator: none\n"
    + "    immediate postdominator: Program at 1:0\n"
    + "ThrowStatement at 1:0 --> [Program at 1:0]\n"
    + "    immediate dominator: Entry at 1:0\n"
    + "    immediate postdominator: Program at 1:0\n"
    + "EmptyStatement at 2:12 --> [Program at 1:0]\n"
    + "    immediate dominator: Entry at 1:0\n"
    + "    immediate postdominator: Program at 1:0\n");
};

exports.test4 = function(test) {
    runtest(test,
      "tmp6 = function(x) {\n"
    + "    var type;\n"
    + "    tmp1: {\n"
    + "        try {\n"
    + "            for (type in x) {\n"
    + "                if (x) {\n"
    + "                    break tmp1;\n"
    + "                } else {\n"
    + "                    x = 1;\n"
    + "                }\n"
    + "                try {\n"
    + "                    x = 2;\n"
    + "                } finally {\n"
    + "                    x = 3;\n"
    + "                }\n"
    + "            }\n"
    + "        } finally {\n"
    + "            x = 4;\n"
    + "        }\n"
    + "    }\n"
    + "};\n",
      "Program at 1:0 --> []\n"
    + "    immediate dominator: ExpressionStatement at 1:0\n"
    + "    immediate postdominator: none\n"
    + "Entry at 1:0 --> [ExpressionStatement at 1:0]\n"
    + "    immediate dominator: none\n"
    + "    immediate postdominator: ExpressionStatement at 1:0\n"
    + "ExpressionStatement at 1:0 --> [Program at 1:0]\n"
    + "    immediate dominator: Entry at 1:0\n"
    + "    immediate postdominator: Program at 1:0\n"
    + "FunctionExpression at 1:7 --> []\n"
    + "    immediate dominator: ExpressionStatement at 18:386\n"
    + "    immediate postdominator: none\n"
    + "Entry at 1:7 --> [VariableDeclaration at 2:25]\n"
    + "    immediate dominator: none\n"
    + "    immediate postdominator: VariableDeclaration at 2:25\n"
    + "VariableDeclaration at 2:25 --> [LabeledStatement at 3:39]\n"
    + "    immediate dominator: Entry at 1:7\n"
    + "    immediate postdominator: LabeledStatement at 3:39\n"
    + "LabeledStatement at 3:39 --> [TryStatement at 4:55]\n"
    + "    immediate dominator: VariableDeclaration at 2:25\n"
    + "    immediate postdominator: TryStatement at 4:55\n"
    + "TryStatement at 4:55 --> [ForInStatement at 5:73]\n"
    + "    immediate dominator: LabeledStatement at 3:39\n"
    + "    immediate postdominator: ForInStatement at 5:73\n"
    + "ForInStatement at 5:73 --> [IfStatement at 6:107, ExpressionStatement at 18:386]\n"
    + "    immediate dominator: TryStatement at 4:55\n"
    + "    immediate postdominator: ExpressionStatement at 18:386\n"
    + "IfStatement at 6:107 --> [BreakStatement at 7:136, ExpressionStatement at 9:193]\n"
    + "    immediate dominator: ForInStatement at 5:73\n"
    + "    immediate postdominator: ExpressionStatement at 18:386\n"
    + "BreakStatement at 7:136 --> [ExpressionStatement at 18:386]\n"
    + "    immediate dominator: IfStatement at 6:107\n"
    + "    immediate postdominator: ExpressionStatement at 18:386\n"
    + "ExpressionStatement at 9:193 --> [TryStatement at 11:234]\n"
    + "    immediate dominator: IfStatement at 6:107\n"
    + "    immediate postdominator: TryStatement at 11:234\n"
    + "TryStatement at 11:234 --> [ExpressionStatement at 12:260]\n"
    + "    immediate dominator: ExpressionStatement at 9:193\n"
    + "    immediate postdominator: ExpressionStatement at 12:260\n"
    + "ExpressionStatement at 12:260 --> [ExpressionStatement at 14:315]\n"
    + "    immediate dominator: TryStatement at 11:234\n"
    + "    immediate postdominator: ExpressionStatement at 14:315\n"
    + "ExpressionStatement at 14:315 --> [ForInStatement at 5:73, ExpressionStatement at 18:386]\n"
    + "    immediate dominator: ExpressionStatement at 12:260\n"
    + "    immediate postdominator: ExpressionStatement at 18:386\n"
    + "ExpressionStatement at 18:386 --> [FunctionExpression at 1:7]\n"
    + "    immediate dominator: ForInStatement at 5:73\n"
    + "    immediate postdominator: FunctionExpression at 1:7\n");
};


var reporter = require('nodeunit').reporters['default'];
reporter.run({"test-cfg" : module.exports});