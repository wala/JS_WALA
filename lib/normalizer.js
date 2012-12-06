if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('./ast'),
      parser = require('./parser'),
      _ = require('./lookup');
  
  function Context(target) {
    this.target = target;
    this.temps = [{}];
    this.next_temp_index = 0;
  }
  Context.prototype.pushFrame = function() {
    this.temps[this.temps.length] = {};
  };
  Context.prototype.popFrame = function() {
    --this.temps.length;
  };
  Context.prototype.genTmp = function(key) {
    var tempframe = this.temps[this.temps.length-1],
        tempname = "tmp" + this.next_temp_index++;
    tempframe[key || tempname] = tempname;
    return tempname;
  };
  Context.prototype.getTemp = function(key) {
    if(key === '$target') {
      return new ast.Var(this.target = this.target || this.genTmp());
    } else {
      var tempframe = this.temps[this.temps.length-1];
      return new ast.Var(tempframe[key] || this.genTmp(key));
    }
  };
  Context.prototype.getTemps = function() {
    var res = [],
        tempframe = this.temps[this.temps.length-1];
    for(var p in tempframe)
      res[res.length] = tempframe[p];
    return res;
  };
  Context.prototype.getTempDecls = function() {
    return this.getTemps().map(function(tmp) {
      return new ast.VariableDeclarator(tmp, null);
    });
  };
  Context.prototype.hasTemps = function() {
    var tempframe = this.temps[this.temps.length-1];
    for(var temp in tempframe)
      return true;
    return false;
  };
  
  function normalize(nd, context) {
    function rec(nd, new_context) {
      if(!(new_context instanceof Context))
        new_context = context;
      return normalize(nd, new_context);
    }

    function splice(template_str) {
      var i = 1, args = arguments;
      function process(nd) {
        if(nd) {
          if(nd.type === 'Identifier' || nd.type === 'VariableDeclarator')
            if(nd.name === '$') {
              var arg = args[i++];
              if(!arg)
                throw new Error("no " + i + "th argument provided: " + Array.prototype.join.call(args));
              if(arg instanceof ast.Expression)
                nd.parent.setChild(nd.childIndex, arg);
              else
                nd.parent.parent.setChild(nd.parent.childIndex, arg);
            } else if(nd.name === '$$') {
              var arg = args[i++];
              if(!arg)
                throw new Error("no " + i + "th argument provided: " + Array.prototype.join.call(args));
              for(var p=nd.parent, idx=nd.childIndex;!(p instanceof ast.List);) {
                idx = p.childIndex;
                p = p.parent;
              }
              p.replaceAndSplice(idx, arg);
            } else if(nd.name[0] === '$') {
              nd.parent.setChild(nd.childIndex, context.getTemp(nd.name));
            }
          nd.forEach(process);
          if(nd.type === 'VariableDeclaration' && nd.declarations.length === 0 &&
              !(nd.parent instanceof ast.List))
            nd.parent.setChild(nd.childIndex, new ast.EmptyStatement());
          else if(nd instanceof ast.List)
            for(var j=nd.getNumChild()-1;j>=0;--j)
              if(nd.getChild(j).type === 'VariableDeclaration' && nd.getChild(j).declarations.length === 0)
                nd.replaceAndSplice(j, []);
        }
        return nd;
      }

      return parser.parse(template_str).scripts[0].body.map(process);
    }
  
    switch(nd.constructor) {
    case ast.Program:
      return new ast.Program(nd.scripts.map(rec));
    case ast.Script:
      var body = nd.body.flatmap(rec);
      var temps = context.getTempDecls();
      return new ast.Script(nd.url, splice("(function(__global) { var $$; $$ })(this);", temps, body));
      /*if(context.hasTemps()) {
        return new ast.Script(nd.url, splice("(function(__global) { $; $$ })(this);", temps, body));
      } else {
        return new ast.Script(nd.url, splice("(function(__global) { $$ })(this);", body));
      }*/
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
    default:
      throw new Error("cannot handle node of type " + nd.type);
    }
  }
  
  exports.normalize = function(nd) { return normalize(nd, new Context()); };
});