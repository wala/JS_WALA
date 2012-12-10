if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('./ast'),
      decls = require('./decls');
  
  function Context(outer, target) {
    this.outer = outer;
    this.targets = [target];
    this.temps = [];
    this.decls = [];
  }
  
  Context.prototype.isGlobalContext = function() {
    return !this.outer;
  };
  
  Context.prototype.isGlobal = function(x) {
    if(!this.outer)
      return true;
    return !this.localLookup(x) && this.outer.isGlobal(x);
  };
  
  function getName(nd) {
    if(nd.type === 'Identifier')
      return nd.name;
    return nd.id.name;
  }
  
  Context.prototype.localLookup = function(x) {
    for(var i=0;i<this.decls.length;++i)
      if(getName(this.decls[i]) === x)
        return this.decls[i];
    return null;
  };
  
  Context.prototype.lookup = function(x) {
    return this.localLookup(x) || this.outer && this.outer.lookup(x);
  };
  
  Context.prototype.getLocalVariables = function() {
    var res = [];
    for(var i=0;i<this.decls.length;++i)
      if(this.decls[i].type === 'VariableDeclarator')
        res[res.length] = this.decls[i];
    return res;
  };
  
  Context.prototype.getFunctions = function() {
    var res = [];
    for(var i=0;i<this.decls.length;++i)
      if(this.decls[i].type === 'FunctionDeclaration')
        res[res.length] = this.decls[i];
    return res;
  };
  
  Context.prototype.getTarget = function() {
    var n = this.targets.length;
    if(!this.targets[n-1])
      this.targets[n-1] = this.genTmp();
    return this.targets[n-1];
  };
  
  Context.prototype.hasTarget = function() {
    return !!this.targets[this.targets.length-1];
  };
  
  Context.prototype.pushTarget = function(trg) {
    this.targets[this.targets.length] = trg;
  };
  
  Context.prototype.popTarget = function() {
    --this.targets.length;
  };
  
  Context.prototype.genTmp = function() {
    var name = "tmp" + this.nextTmp();
    this.temps[this.temps.length] = name;
    return name;
  };
  
  Context.prototype.nextTmp = function() {
    return this.outer.nextTmp();
  };
  
  Context.prototype.getFunctions = function() {
    return this.decls.filter(function(decl) {
      return decl.type === 'FunctionDeclaration';
    });
  };
  
  Context.prototype.hasTemps = function() {
    return this.temps.length > 0;
  };
  
  Context.prototype.getTempDecls = function() {
    return this.temps.map(function(temp) { return new ast.VariableDeclarator(new ast.Identifier(temp), null); });
  };
  
  Context.prototype.enterFunction = function(fn) {
    var ctxt = new Context(this);
    for(var i=0;i<fn.params.length;++i)
      ctxt.decls[ctxt.decls.length] = fn.params[i];
    decls.collectDecls(fn.body, ctxt.decls);
    return ctxt;
  };
  
  function makeRootContext(ast) {
    var ctxt = new Context();
    var nextTmp = 0;
    ctxt.nextTmp = function() {
      return nextTmp++;
    };
    decls.collectDecls(ast, ctxt.decls);
    return ctxt;
  };
  
  exports.Context = Context;
  exports.makeRootContext = makeRootContext;
});