if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var Node = exports.Node = function() {
    this.children = [];
    this.type = 'Node';
  };

  Node.prototype.getNumChild = function() { return this.children.length; };

  Node.prototype.getChild = function(i) { return this.children[i]; };
  Node.prototype.setChild = function(i, c) {
    if(Array.isArray(c))
      c = new List(c);
    this.children[i] = c;
    if(c) {
      c.parent = this;
      c.childIndex = i;
    }
    return this;
  };
  
  Node.prototype.forEach = function(cb, thisArg) {
    for(var i=0;i<this.getNumChild();++i)
      cb.call(thisArg, this.getChild(i), i, this);
  };

  Node.prototype.getParent = function() { return this.parent; };
  Node.prototype.setParent = function(parent) { this.parent = parent; return this; };

  Node.prototype.getChildIndex = function() { return this.childIndex; };
  Node.prototype.setChildIndex = function(i) { this.childIndex = i; return this; };
  
  Node.prototype.getPosition = function(pos) { return this.position; };
  Node.prototype.setPosition = function(pos) { this.position = pos; return this; };
  Node.prototype.atPosOf = function(that) { return this.setPosition(that.getPosition()); };
  
  var List = exports.List = function(elts) {
    elts = elts || [];
    this.length = elts.length;
    for(var i=0;i<elts.length;++i)
      this.setChild(i, elts[i]);
  };
  List.prototype = Object.create(Node.prototype);
  List.prototype.getNumChild = function() { return this.length; };
  List.prototype.getChild = function(i) { return this[i]; };
  List.prototype.setChild = function(i, c) {
    this[i] = c;
    if(c) {
      c.parent = this;
      c.childIndex = i;
    }
    if(i >= this.length)
      this.length = i+1;
    return this;
  };
  List.prototype.map = Array.prototype.map;
  List.prototype.flatmap = function(fn) {
    var res = new List();
    this.forEach(function(nd) {
      fn(nd).forEach(function(nd2) {
        res.setChild(res.length, nd2);
      });
    });
    return res;
  };
  List.prototype.replaceAndSplice = function(idx, elts) {
    var old_len = this.length,
        elts_len = elts.length;
    var rest = [];
    for(var i=0;idx+1+i<old_len;++i)
      rest[i] = this[idx+1+i];
    for(i=0;i<elts_len;++i)
      this.setChild(idx+i, elts[i]);
    for(i=0;i<rest.length;++i)
      this.setChild(idx+elts_len+i, rest[i]);
    for(i=idx+elts_len+rest.length;i<old_len;++i)
      delete this[i];
    this.length = old_len - 1 + elts_len;
  };
  
  function define_accessors(obj, prop, getter, setter) {
    Object.defineProperty(obj, prop, {
      get: getter,
      set: setter
    });
  }

  function defnode(name) {
    var superType, children, typetag, i = 1;
    
    if(Array.isArray(arguments[i]))
      superType = "Node";
    else
      superType = arguments[i++];
    children = arguments[i++];
    typetag = arguments[i] || name;

    var proto = Object.create(exports[superType].prototype);
    var parms = [], stmts = [ "  this.children = [];",
                              "  this.type = '" + typetag + "';" ];
    var next_childpos = 0, child_indices = {};
    children.forEach(function(child, i) {
      var parmname = parms[parms.length] = "p" + i,
          idx = child.indexOf(':'),
          childname = child.substring(0, idx),
          childtype = child.substring(idx+1);
      
      if(childname === '')
        throw new Error("anonymous child");

      if(childtype[0] === '<' /* terminal */) {
        stmts[stmts.length] = "  this['" + childname + "'] = " + parmname + ";";
      } else {
        var childpos = next_childpos++;
        child_indices[childname] = childpos;
        stmts[stmts.length] = "  this.setChild(" + childpos + ", " + parmname + ");";
        define_accessors(proto, childname, function() {
          return this.getChild(childpos);
        }, function(v) {
          this.setChild(childpos, v);
        });
      }
    });
    var fn = exports[name] = new Function(parms.join(', '), stmts.join('\n'));
    proto.constructor = fn;
    fn.prototype = proto;
    fn.child_indices = child_indices;
    return fn;
  }
  
  function define_id_wrapper(obj, prop, wrapprop) {
    wrapprop = wrapprop || "id";
    define_accessors(obj, wrapprop, function() {
      return this[prop] && { type: 'Identifier', name: this[prop] };
    }, function(v) {
      if(v && v.type === 'Identifier')
        this[prop] = v.name;
      else
        throw new TypeError("should be an identifier");
    });
  }

  defnode("Program", [ "scripts:Script*" ], "ProgramCollection");
  defnode("Script", [ "url:<String>", "body:Statement*" ], "Program");

  defnode("Statement", []);
  var VariableDeclaration = defnode("VariableDeclaration", "Statement", [ "declarations:VariableDeclarator*" ]);
  VariableDeclaration.prototype.kind = 'var';
  defnode("EmptyStatement", "Statement", []);
  defnode("DebuggerStatement", "Statement", []);
  defnode("ExpressionStatement", "Statement", [ "expression:Expression" ]);
  defnode("WithStatement", "Statement", [ "object:Expression", "body:Statement" ]);
  defnode("ReturnStatement", "Statement", [ "argument:Expression "]);
  defnode("ThrowStatement", "Statement", [ "argument:Expression" ]);
  defnode("BlockStatement", "Statement", [ "body:Statement*" ]);
  defnode("IfStatement", "Statement", [ "test:Expression", "consequent:Statement", "alternate:Statement?" ]);
  defnode("SwitchStatement", "Statement", [ "discriminant:Expression", "cases:SwitchCase*?" ]);
  
  var TryStatement = defnode("TryStatement", "Statement", [ "block:BlockStatement", "catch:CatchClause?", "finalizer:BlockStatement?" ]);
  TryStatement.prototype.guardedHandlers = [];
  define_accessors(TryStatement.prototype, "handlers", function() {
    return this["catch"] ? [ this["catch"] ] : []; 
  }, function(handlers) {
    if(handlers.length === 0)
      this["catch"] = null;
    else if(handlers.length === 1)
      this["catch"] = handlers[0];
    else
      throw new Error("multiple catch clauses not supported");
  });
  
  defnode("WhileStatement", "Statement", [ "test:Expression", "body:Statement" ]);
  defnode("DoWhileStatement", "Statement", [ "body:Statement", "test:Expression" ]);
  defnode("ForStatement", "Statement", [ "init:Expression|VariableDeclaration?", "test:Expression?", "update:Expression?", "body:Statement"]);
  defnode("ForInStatement", "Statement", [ "left:Expression|VariableDeclaration?", "right:Expression", "body:Statement" ]);

  defnode("SwitchCase", []);
  defnode("ExprCase", "SwitchCase", [ "test:Expression", "consequent:Statement*" ], "SwitchCase");
  var DefaultCase = defnode("DefaultCase", "SwitchCase", [ "consequent:Statement*" ], "SwitchCase");
  DefaultCase.prototype.test = null;

  defnode("CatchClause", [ "param:ParameterDeclaration", "body:BlockStatement" ]);

  defnode("ParameterDeclaration", [ "name:<String>" ], "Identifier");

  var VariableDeclarator = defnode("VariableDeclarator", [ "name:<String>", "init:Expression?" ]);
  define_id_wrapper(VariableDeclarator.prototype, "name");

  defnode("Expression", []);
  defnode("ThisExpression", "Expression", []);
  defnode("Var", "Expression", [ "name:<String>" ], "Identifier");
  
  var FunctionExpression = defnode("FunctionExpression", "Expression", [ "name:<String>?", "params:ParameterDeclaration*", "body:BlockStatement" ]);
  FunctionExpression.prototype.defaults = [];
  FunctionExpression.prototype.rest = null;
  FunctionExpression.prototype.generator = false;
  FunctionExpression.prototype.expression = false;
  define_id_wrapper(FunctionExpression.prototype, "name");
  
  var FunctionDeclaration = defnode("FunctionDeclaration", "Statement", [ "name:<String>", "params:ParameterDeclaration*", "body:BlockStatement" ]);
  FunctionDeclaration.prototype.defaults = [];
  FunctionDeclaration.prototype.rest = null;
  FunctionDeclaration.prototype.generator = false;
  FunctionDeclaration.prototype.expression = false;
  define_id_wrapper(FunctionDeclaration.prototype, "name");
  
  defnode("Literal", "Expression", []);
  defnode("NumberLiteral", "Literal", [ "value:<Number>" ], "Literal");
  defnode("StringLiteral", "Literal", [ "value:<String>" ], "Literal");
  defnode("BooleanLiteral", "Literal", [ "value:<Boolean>" ], "Literal");
  var NullLiteral = defnode("NullLiteral", "Literal", [], "Literal");
  NullLiteral.prototype.value = null;
  defnode("RegExpLiteral", "Literal", [ "value:<RegExp>" ], "Literal");
  
  defnode("CallExpression", "Expression", [ "callee:Expression", "arguments:Expression*"]);
  defnode("NewExpression", "Expression", [ "callee:Expression", "arguments:Expression*"]);
  
  defnode("ObjectExpression", "Expression", [ "properties:Property*" ]);
  var Property = defnode("Property", [ "key:Expression", "value:Expression" ]);
  Property.prototype.kind = 'init';
  var GetterProperty = defnode("GetterProperty", "Property", [ "name:<String>", "value:FunctionExpression" ], "Property");
  define_id_wrapper(GetterProperty.prototype, "name", "key");
  GetterProperty.prototype.kind = 'get';
  var SetterProperty = defnode("SetterProperty", "Property", [ "name:<String>", "value:FunctionExpression" ], "Property");
  define_id_wrapper(SetterProperty.prototype, "name", "key");
  SetterProperty.prototype.kind = 'set';
  
  defnode("ArrayExpression", "Expression", [ "elements:Expression?*" ]);
  
  defnode("ConditionalExpression", "Expression", [ "test:Expression", "consequent:Expression", "alternate:Expression" ]);
  
  var LabeledStatement = defnode("LabeledStatement", "Expression", [ "lbl:<String>", "body:Statement" ]);
  define_id_wrapper(LabeledStatement.prototype, "lbl", "label");
  
  var ContinueStatement = defnode("ContinueStatement", "Statement", [ "target:<String>?" ]);
  define_id_wrapper(ContinueStatement.prototype, "target", "label");
  
  var BreakStatement = defnode("BreakStatement", "Statement", [ "target:<String>?" ]);
  define_id_wrapper(BreakStatement.prototype, "target", "label");
  
  defnode("AssignmentExpression", "Expression", [ "operator:<String>", "left:Expression", "right:Expression" ]);
  
  defnode("MemberExpression", "Expression", []);
  var Index = defnode("Index", "MemberExpression", [ "object:Expression", "property:Expression" ], "MemberExpression");
  Index.prototype.computed = true;
  var Dot = defnode("Dot", "MemberExpression", [ "object:Expression", "name:<String>" ], "MemberExpression");
  Dot.prototype.computed = false;
  define_id_wrapper(Dot.prototype, "name", "property");
  
  defnode("BinaryExpression", "Expression", [ "operator:<String>", "left:Expression", "right:Expression" ]);
  defnode("LogicalExpression", "BinaryExpression", [ "operator:<String>", "left:Expression", "right:Expression" ]);
  
  var UnaryExpression = defnode("UnaryExpression", "Expression", [ "operator:<String>", "argument:Expression" ]);
  UnaryExpression.prototype.prefix = true;
  defnode("UpdateExpression", "UnaryExpression", [ "operator:<String>", "argument:Expression" ]);
  defnode("PrefixUpdateExpression", "UpdateExpression", [ "operator:<String>", "argument:Expression" ], "UpdateExpression");
  var PostfixUpdateExpression = defnode("PostfixUpdateExpression", "UpdateExpression", [ "operator:<String>", "argument:Expression" ], "UpdateExpression");
  PostfixUpdateExpression.prototype.prefix = false;
  
  defnode("SequenceExpression", "Expression", [ "expressions:Expression*" ]);
});