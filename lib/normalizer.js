if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('./ast'),
      templates = require('./templates'),
      _ = require('./lookup');
  
  function Context(target) {
    this.temps = [{}];
    this.targets = [];
    if(target)
      this.targets[0] = target;
    this.next_temp_index = 0;
  }
  Context.prototype.pushFrame = function() {
    this.temps[this.temps.length] = {};
    this.pushTarget();
  };
  Context.prototype.pushTarget = function(new_target) {
    if(new_target instanceof ast.Var)
      this.targets[this.targets.length] = new_target.name;
    else
      this.targets[this.targets.length] = new_target && this.genTmp(new_target);
  };
  Context.prototype.popFrame = function() {
    --this.temps.length;
    this.popTarget();
  };
  Context.prototype.popTarget = function() {
    --this.targets.length;
  };
  Context.prototype.genTmp = function(key, isLabel) {
    var tempframe = this.temps[this.temps.length-1],
        tempname = "tmp" + this.next_temp_index++;
    if(!isLabel)
      tempframe[key || tempname] = tempname;
    return tempname;
  };
  Context.prototype.genLabel = function(key) {
    return this.genTmp(key, true);
  };
  Context.prototype.getTemp = function(key) {
    var tempframe = this.temps[this.temps.length-1];
    if(key == 'target') {
      var d = this.targets.length-1;
      return new ast.Var(this.targets[d] = this.targets[d] || this.genTmp());
    } else {
      return new ast.Var(tempframe[key] || this.genTmp(key));
    }
  };
  Context.prototype.hasTarget = function(key) {
    return !!this.targets[this.targets.length-1];
  };
  Context.prototype.getTemps = function() {
    var res = [],
        tempframe = this.temps[this.temps.length-1];
    for(var p in tempframe)
      res[res.length] = tempframe[p];
    return res;
  };
  Context.prototype.getTempDecls = function() {
    return new ast.List(this.getTemps().map(function(tmp) {
      return new ast.VariableDeclarator(tmp, null);
    }));
  };
  
  function normalize(nd, context) {
    function rec(nd, new_context) {
      if(new_context instanceof Context) {
        return normalize(nd, new_context);
      } else if(typeof new_context === 'string' || new_context instanceof ast.Var) {
        context.pushTarget(new_context);
        var res = normalize(nd, context);
        context.popTarget();
        return res;
      } else {
        return normalize(nd, context);
      }
    }
    
    function splice(template) {
      var i = 1, args = arguments;
      return templates.render(template, function(x) {
        if(x === '')
          return args[i++];
        if(x === 'target') debugger;
        return context.getTemp(x);
      });
    }
    
    function normalizeAssignment(left, right) {
      if(left instanceof ast.Var) {
        var decl = left.decl();
        if(decl && !decl.isGlobal()) {
          if(decl.getEnclosingFunction() != right.getEnclosingFunction())
            decl.exposed = true;
          if(context.hasTarget())
            return splice("$;" +
                          left.name + " = $target;", rec(right));
          else
            return rec(right, left);
        } else {
          // force naming of temporary variables for compatibility with old implementation
          context.getTemp('tmp');
          return splice("$;" +
                        "$tmp = '" + left.name + "';" +
                        "__global[$tmp] = $target", rec(right));
        }
      }
    }

    switch(nd.constructor) {
    case ast.Program:
      return new ast.Program(nd.scripts.map(rec));
    case ast.Script:
      var body = nd.body.flatmap(rec);
      var temps = context.getTempDecls();
      return new ast.Script(nd.url, splice("(function(__global) { var $; $ })(this);", temps, body));
    case ast.EmptyStatement:
      return [];
    case ast.ExpressionStatement:
      return rec(nd.expression);
    case ast.NumberLiteral:
    case ast.StringLiteral:
    case ast.BooleanLiteral:
    case ast.NullLiteral:
    case ast.RegExpLiteral:
      return splice("$target = $;", nd);
    case ast.Var:
      if(nd.isGlobal())
        return splice("$tmp = '" + nd.name + "';" +
        		          "$target = __global[$tmp];");
      else
        return splice("$target = $;", nd);
    case ast.ThisExpression:
      if(!nd.getEnclosingFunction())
        return splice("$target = __global;");
      else
        return splice("$target = this;");
    case ast.VariableDeclaration:
      return nd.declarations.flatmap(rec);
    case ast.VariableDeclarator:
      if(nd.init) {
        var lhs = new ast.Var(nd.name);
        lhs.decl__cached = { '$': nd };
        return normalizeAssignment(lhs, nd.init);
      } else
        return new ast.List();
    case ast.FunctionExpression:
      context.getTemp('target');
      context.pushFrame();
      var body = rec(nd.body);
      if(nd.exposed)
        throw new Error("Cannot handle downward exposed function expressions.");
      var localDecls = new ast.List();
      nd.localDecls().forEach(function(decl) {
        if(decl instanceof ast.VariableDeclarator)
          localDecls.push(new ast.VariableDeclarator(decl.name, null));
      });
      localDecls.pushAll(context.getTempDecls());
      body.unshift(splice("var $;", localDecls));
      context.popFrame();
      return splice("$target = $", new ast.FunctionExpression(nd.name, nd.params, new ast.BlockStatement(body)));
    case ast.FunctionDeclaration:
      return new ast.List();
    case ast.BlockStatement:
      return nd.body.flatmap(rec);
    case ast.ReturnStatement:
      if(!nd.argument)
        return new ast.List(nd);
      else
        {debugger;return splice("$; return $tmp;", rec(nd.argument, "tmp"));}
    case ast.AssignmentExpression:
      if(nd.operator === '=') {
        return normalizeAssignment(nd.left, nd.right);
      }
    default:
      throw new Error("cannot handle node of type " + nd.type);
    }
  }
  
  exports.normalize = function(nd) { return normalize(nd, new Context()); };
});