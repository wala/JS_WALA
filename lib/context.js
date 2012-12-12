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
    this.brk_labels = [];
    this.cont_labels = [];
  }
  
  Context.prototype.isGlobalContext = function() {
    return !this.outer;
  };
  
  Context.prototype.isGlobal = function(x) {
    if(!this.outer && !this.isTemp(x))
      return true;
    return !this.isLocal(x) && this.outer.isGlobal(x);
  };
  
  function getName(nd) {
    if(nd.type === 'Identifier')
      return nd.name;
    return nd.id.name;
  }
  
  Context.prototype.isLocal = function(x) {
    return !this.isGlobalContext() && !!this.localLookup(x) || this.isTemp(x);
  };
  
  Context.prototype.isTemp = function(x) {
    for(var i=0;i<this.temps.length;++i)
      if(this.temps[i] === x)
        return true;
    return false;    
  };
  
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
    if(contlbl) {
      this.brk_labels[this.brk_labels.length-1].has_cont = true;
      this.cont_labels[this.cont_labels.length] = contlbl;
    }
  };
  
  Context.prototype.popLabel = function() {
    var nbrk = this.brk_labels.length;
    if(this.brk_labels[nbrk-1].has_cont)
      --this.cont_labels.length;
    --this.brk_labels.length;
  };
  
  Context.prototype.getBreakLabel = function() {
    return this.brk_labels[this.brk_labels.length-1];
  };
  
  Context.prototype.getContLabel = function() {
    return this.cont_labels[this.cont_labels.length-1];
  };
  
  Context.prototype.enterFunction = function(fn) {
    var ctxt = new Context(this);
    for(var i=0;i<fn.params.length;++i)
      ctxt.decls[ctxt.decls.length] = fn.params[i];
    decls.collectDecls(fn.body, ctxt.decls);
    ctxt.isGlobal = function(x) {
      if(x === 'arguments' || fn.id && x === fn.id.name)
        return false;
      return Context.prototype.isGlobal.call(this, x);
    };
    return ctxt;
  };
  
  Context.prototype.enterCatchClause = function(cc) {
    var ctxt = new Context(this);
    ctxt.decls[0] = cc.param;
    ctxt.genTmp = function(isLbl) {
      return this.outer.genTmp(isLbl);
    };
    ctxt.isLocal = function(x) {
      return Context.prototype.isLocal.call(this, x) || this.outer.isLocal(x);
    };
    ctxt.isTemp = function(x) {
      return this.outer.isTemp(x);
    };
    ctxt.localLookup = function(x) {
      return Context.prototype.localLookup.call(this, x) || this.outer.localLookup(x);
    };
    ctxt.getTarget = function() {
      return this.outer.getTarget();
    };
    ctxt.hasTarget = function() {
      return this.outer.hasTarget();
    };
    ctxt.pushTarget = function(trg) {
      return this.outer.pushTarget(trg);
    };
    ctxt.popTarget = function() {
      return this.outer.popTarget();
    };
    ctxt.pushLabel = function(brklbl, contlbl) {
      return this.outer.pushLabel(lbl, contlbl);
    };
    ctxt.popLabel = function() {
      return this.outer.popLabel();
    };
    ctxt.getBreakLabel = function() {
      return this.outer.getBreakLabel();
    };
    ctxt.getContLabel = function() {
      return this.outer.getContLabel();
    };
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