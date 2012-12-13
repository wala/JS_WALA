if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('./ast'),
      scope = require('./scope');
  
  function Context(outer, scope) {
    this.outer = outer;
    this.scope = scope;
    this.targets = [];
    this.temps = [];
    this.brk_labels = [];
    this.cont_labels = [];
  }
  
  Context.prototype.isGlobalContext = function() {
    return !this.outer;
  };
  
  Context.prototype.isGlobal = function(x) {
    return !this.isTemp(x) && this.scope.isGlobal(x);
  };
  
  Context.prototype.isLocal = function(x) {
    return this.isTemp(x) || this.scope.isLocal(x);
  };
  
  Context.prototype.isTemp = function(x) {
    for(var i=0;i<this.temps.length;++i)
      if(this.temps[i] === x)
        return true;
    return false;    
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
  
  Context.prototype.genTmp = function(isLbl) {
    var name = "tmp" + this.nextTmp();
    if(!isLbl)
      this.temps[this.temps.length] = name;
    return name;
  };
  
  Context.prototype.genTmps = function(n) {
    var res = [];
    for(var i=0;i<n;++i)
      res[i] = this.genTmp();
    return res;
  };
  
  Context.prototype.nextTmp = function() {
    return this.outer.nextTmp();
  };
  
  Context.prototype.hasTemps = function() {
    return this.temps.length > 0;
  };
  
  Context.prototype.getTempDecls = function() {
    return this.temps.map(function(temp) { return new ast.VariableDeclarator(new ast.Identifier(temp), null); });
  };
  
  Context.prototype.pushLabel = function(brklbl, contlbl) {
    this.brk_labels[this.brk_labels.length] = brklbl;
    this.cont_labels[this.cont_labels.length] = contlbl;
  };
  
  Context.prototype.popLabel = function() {
    --this.brk_labels.length;
    --this.cont_labels.length;
  };
  
  Context.prototype.getBreakLabel = function() {
    return this.brk_labels[this.brk_labels.length-1];
  };
  
  Context.prototype.getContLabel = function() {
    for(var i=this.cont_labels.length-1;i>=0;--i)
      if(this.cont_labels[i])
        return this.cont_labels[i];
    throw new Error("no continue label");
  };
  
  Context.prototype.enterFunction = function(fn) {
    return new Context(this, new scope.FunctionScope(this.scope, fn));
  };
  
  Context.prototype.leaveFunction = function() {
    return this.outer;
  };
  
  Context.prototype.enterCatchClause = function(cc) {
    this.scope = new scope.CatchScope(this.scope, cc);
    return this;
  };
  
  Context.prototype.leaveCatchClause = function() {
    this.scope = this.scope.outer;
  };
  
  Context.prototype.enterWith = function(with_var) {
    this.scope = new scope.WithScope(this.scope, with_var);
    return this;
  };
  
  Context.prototype.leaveWith = function() {
    this.scope = this.scope.outer;
    return this;
  };
  
  function makeRootContext(ast) {
    var ctxt = new Context(null, new scope.GlobalScope(ast));
    var nextTmp = 0;
    ctxt.nextTmp = function() {
      return nextTmp++;
    };
    return ctxt;
  };
  
  exports.Context = Context;
  exports.makeRootContext = makeRootContext;
});