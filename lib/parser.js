if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require("./ast"),
      position = require("./position"),
      esprima = require("esprima");

  function parse(src, url) {
    var prog = esprima.parse(src, { loc: true, range: true });
    
    function getPos(nd) {
      return new position.Position(url, nd.loc.start.line-1, nd.range[0], nd.loc.end.line-1, nd.range[1]);
    }
    
    function transform(nd) {
      var res = null;
      
      if(!nd)
        return nd;
      
      switch(nd.type) {
      case "Program":
        res = new ast.Script(url, nd.body.map(transform));
        break;
      case "VariableDeclaration":
        if(nd.kind === 'var')
          res = new ast.VariableDeclaration(nd.declarations.map(transform));
        break;
      case "VariableDeclarator":
        return new ast.VariableDeclarator(nd.id.name, nd.init && transform(nd.init));
      case "Literal":
        switch(typeof nd.value) {
        case "number":
          res = new ast.NumberLiteral(nd.value);
          break;
        case "string":
          res = new ast.StringLiteral(nd.value);
          break;
        case "boolean":
          res = new ast.BooleanLiteral(nd.value);
          break;
        case "object":
          if(nd.value === null) {
            res = new ast.NullLiteral();
          } else if(nd.value instanceof RegExp) {
            res = new ast.RegExpLiteral(nd.value);
          }
        }
        break;
      case "DebuggerStatement":
        res = new ast.DebuggerStatement();
        break;
      case "ExpressionStatement":
        res = new ast.ExpressionStatement(transform(nd.expression));
        break;
      case "CallExpression":
      case "NewExpression":
        res = new ast[nd.type](transform(nd.callee), nd.arguments.map(transform));
        break;
      case "ReturnStatement":
        res = new ast.ReturnStatement(transform(nd.argument));
        break;
      case "ObjectExpression":
        res = new ast.ObjectExpression(nd.properties.map(function(prop) {
          if(prop.kind === 'init') {
            return new ast.Property(transform(prop.key), transform(prop.value));
          } else if(prop.kind === 'get') {
            return new ast.GetterProperty(prop.key.name, transform(prop.value));
          } else if(prop.kind === 'set') {
            return new ast.SetterProperty(prop.key.name, transform(prop.value));
          }
        }));
        break;
      case "ArrayExpression":
        res = new ast.ArrayExpression(nd.elements.map(function(elt) {
          return elt && transform(elt);
        }));
        break;
        break;
      case "ConditionalExpression":
        res = new ast.ConditionalExpression(transform(nd.test), transform(nd.consequent), transform(nd.alternate));
        break;
      case "LabeledStatement":
        res = new ast.LabeledStatement(nd.label.name, transform(nd.body));
        break;
      case "ContinueStatement":
        res = new ast.ContinueStatement(nd.label && nd.label.name);
        break;
      case "AssignmentExpression":
        res = new ast.AssignmentExpression(nd.operator, transform(nd.left), transform(nd.right));
        break;
      case "MemberExpression":
        if(nd.computed)
          res = new ast.Index(transform(nd.object), transform(nd.property));
        else
          res = new ast.Dot(transform(nd.object), nd.property.name);
        break;
      case "ThisExpression":
        res = new ast.ThisExpression();
        break;
      case "Identifier":
        res = new ast.Var(nd.name);
        break;
      case "FunctionDeclaration":
      case "FunctionExpression":
        res = new ast[nd.type](nd.id && nd.id.name, nd.params.map(function(parm) {
          return new ast.ParameterDeclaration(parm.name).setPosition(getPos(parm));
        }), new ast.BlockStatement(nd.body.body.map(transform)));
        break;
      case "BinaryExpression":
      case "LogicalExpression":
        res = new ast[nd.type](nd.operator, transform(nd.left), transform(nd.right));
        break;
      case "UpdateExpression":
        res = new ast[(nd.prefix ? "Pre" : "Post") + "fixUpdateExpression"](nd.operator, transform(nd.argument));
        break;
      case "UnaryExpression":
        res = new ast[nd.type](nd.operator, transform(nd.argument));
        break;
      case "ForStatement":
        res = new ast.ForStatement(transform(nd.init), transform(nd.test), transform(nd.update), transform(nd.body));
        break;
      case "ForInStatement":
        res = new ast.ForInStatement(transform(nd.left), transform(nd.right), transform(nd.body));
        break;
      case "WhileStatement":
        res = new ast.WhileStatement(transform(nd.test), transform(nd.body));
        break;
      case "DoWhileStatement":
        res = new ast.DoWhileStatement(transform(nd.body), transform(nd.test));
        break;
      case "SwitchStatement":
        res = new ast.SwitchStatement(transform(nd.discriminant), (nd.cases || []).map(function(kase) {
          if(kase.test)
            return new ast.ExprCase(transform(kase.test), kase.consequent.map(transform));
          else
            return new ast.DefaultCase(kase.consequent.map(transform));
        }));
        break;
      case "BreakStatement":
        res = new ast.BreakStatement(nd.label && nd.label.name);
        break;
      case "SequenceExpression":
        res = new ast.SequenceExpression(nd.expressions.map(transform));
        break;
      case "IfStatement":
        res = new ast.IfStatement(transform(nd.test), transform(nd.consequent), transform(nd.alternate));
        break;
      case "BlockStatement":
        res = new ast.BlockStatement(nd.body.map(transform));
        break;
      case "ThrowStatement":
        res = new ast.ThrowStatement(transform(nd.argument));
        break;
      case "TryStatement":
        res = new ast.TryStatement(new ast.BlockStatement(nd.block.body.map(transform)),
                                   nd.handlers.length > 0 ? new ast.CatchClause(new ast.ParameterDeclaration(nd.handlers[0].param.name),
                                                                                new ast.BlockStatement(nd.handlers[0].body.body.map(transform)))
                                                          : null,
                                   nd.finalizer && new ast.BlockStatement(nd.finalizer.body.map(transform)));
        break;
      case "WithStatement":
        res = new ast.WithStatement(transform(nd.object), new ast.BlockStatement(nd.body.body.map(transform)));
        break;
      case "EmptyStatement":
        res = new ast.EmptyStatement();
        break;
      }
      
      if(!res)
        throw new Error("unsupported node of type " + nd.type + ": " + JSON.stringify(nd));

      res.setPosition(getPos(nd));

      return res;
    }

    return new ast.Program([transform(prog)]);
  }
  
  exports.parse = parse;
});