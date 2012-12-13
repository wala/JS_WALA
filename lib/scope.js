if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var decls = require('./decls');
  
  function Scope(outer, decls) {
    this.outer = outer;
    this.decls = decls;
  }
  
  Scope.prototype.isGlobal = function(x) {
    return !this.isLocal(x) && this.outer.isGlobal(x);
  };
  
  Scope.prototype.localLookup = function(x) {
    for(var i=0;i<this.decls.length;++i)
      if(decls.getDeclName(this.decls[i]) === x)
        return this.decls[i];
    return null;
  };
  
  Scope.prototype.isLocal = function(x) { return !!this.localLookup(x); };
  
  Scope.prototype.lookup = function(x) {
    return this.localLookup(x) || this.outer && this.outer.lookup(x);
  };
  
  function GlobalScope(root) {
    Scope.call(this, null, decls.collectDecls(root, []));
  }
  GlobalScope.prototype = Object.create(Scope.prototype);
  
  GlobalScope.prototype.isGlobal = function(x) { return true; };
  GlobalScope.prototype.isLocal = function(x) { return false; };
  GlobalScope.prototype.possibleWithBindings = function(x) { return []; };
    
  function FunctionScope(outer, fn) {
    this.fn = fn;
    Scope.call(this, outer, fn.params.concat(decls.collectDecls(fn.body, [])));
  }
  FunctionScope.prototype = Object.create(Scope.prototype);
  
  FunctionScope.prototype.isLocal = function(x) {
    return x === 'arguments' ||
           this.fn.type === 'FunctionExpression' && this.fn.id && this.fn.id.name === x ||
           Scope.prototype.isLocal.call(this, x);
  };
  
  FunctionScope.prototype.possibleWithBindings = function(x) {
    if(this.isLocal(x))
      return [];
    return this.outer.possibleWithBindings(x);
  };
  
  function CatchScope(outer, cc) {
    Scope.call(this, outer, [cc.param]);
  }
  CatchScope.prototype = Object.create(Scope.prototype);
  
  CatchScope.prototype.isLocal = function(x) { return x === this.decls[0].name || this.outer.isLocal(x); };
  
  CatchScope.prototype.possibleWithBindings = function(x) {
    if(x === this.decls[0].name)
      return [];
    return this.outer.possibleWithBindings(x);
  };
  
  function WithScope(outer, with_var) {
    Scope.call(this, outer, []);
    this.with_var = with_var;
  }
  WithScope.prototype = Object.create(Scope.prototype);
  
  WithScope.prototype.isLocal = function(x) { return this.outer.isLocal(x); };
  
  WithScope.prototype.possibleWithBindings = function(x) {
    var bindings = this.outer.possibleWithBindings(x);
    bindings.unshift(this.with_var);
    return bindings;
  };
  
  exports.Scope = Scope;
  exports.GlobalScope = GlobalScope;
  exports.FunctionScope = FunctionScope;
  exports.CatchScope = CatchScope;
  exports.WithScope = WithScope;
});