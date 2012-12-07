if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require("./ast");
  
  function syn(ndtp, name, fn) {
    var cache_field_name = name + "__cached";
    return ndtp.prototype[name] = function() {
      var key = '$' + Array.prototype.join(arguments);
      this[cache_field_name] = this[cache_field_name] || {};
      if(this[cache_field_name][key])
        return this[cache_field_name][key];
      return this[cache_field_name][key] = fn.apply(this, arguments);
    };
  }
  
  function inh(parent_type, child_name, attr_name, fn) {
    var compute_method_name = attr_name + "__compute",
        cache_field_name = attr_name + "__cached";
    if(!ast.Node.prototype[attr_name]) {
      ast.Node.prototype[attr_name] = function() {
        var key = '$' + Array.prototype.join(arguments);
        this[cache_field_name] = this[cache_field_name] || {};
        if(this[cache_field_name][key])
          return this[cache_field_name][key];
        return this[cache_field_name][key] = this.parent[compute_method_name](this.childIndex, arguments);
      };
      ast.Node.prototype[compute_method_name] = function(childIndex, args) {
        return this.parent && this.parent[compute_method_name](this.childIndex, args);
      };
    }
    var overridden = parent_type.prototype[compute_method_name],
        child_index = parent_type.child_indices[child_name];
    parent_type.prototype[compute_method_name] = function(idx, args) {
      if(idx === child_index)
        return fn.apply(this, args);
      return overridden.call(this, idx, args);
    };
  }
  
  syn(ast.FunctionDeclaration, "localDecls", function() {
    var res = [];
    this.params.collectDecls(res);
    this.body.collectDecls(res);
    return res;
  });
  syn(ast.FunctionExpression, "localDecls", function() {
    var res = [];
    this.params.collectDecls(res);
    this.body.collectDecls(res);
    return res;    
  });
  syn(ast.Program, "globalDecls", function() { return this.collectDecls([]); });
  
  ast.Node.prototype.collectDecls = function(accu) {
    for(var i=0;i<this.getNumChild();++i)
      this.getChild(i).collectDecls(accu);
    return accu;
  };
  
  ast.ParameterDeclaration.prototype.collectDecls = function(accu) {
    accu[accu.length] = this;
    return accu;
  };
  
  ast.VariableDeclarator.prototype.collectDecls = function(accu) {
    accu[accu.length] = this;
    return accu;
  };
  
  ast.FunctionDeclaration.prototype.collectDecls = function(accu) {
    accu[accu.length] = this;
    return accu;
  };
  
  ast.FunctionExpression.prototype.collectDecls = function(accu) {
    return accu;
  };
  
  function localLookup(decls, x) {
    for(var i=0;i<decls.length;++i)
      if(decls[i].name === x)
        return decls[i];
  }
  
  inh(ast.FunctionDeclaration, "body", "lookup", function(x) {
    return localLookup(this.localDecls(), x) || this.lookup(x);
  });
  
  inh(ast.FunctionExpression, "body", "lookup", function(x) {
    return localLookup(this.localDecls(), x) || this.name === x && this || this.lookup(x);
  });
  
  inh(ast.CatchClause, "body", "lookup", function(x) {
    return this.param.name === x && this.param || this.lookup(x);
  });
  
  inh(ast.Program, "scripts", "lookup", function(x) {
    return localLookup(this.globalDecls(), x);
  });
  
  syn(ast.Var, "decl", function() {
    return this.lookup(this.name);
  });
  
  ast.Var.prototype.isGlobal = function() {
    var decl = this.decl();
    return !decl || decl.isGlobal();
  };
  
  ast.Node.prototype.getEnclosing = function(nodetp) {
    if(this.parent instanceof nodetp)
      return this.parent;
    return this.parent && this.parent.getEnclosing(nodetp);
  };
  
  ast.Node.prototype.getEnclosingFunction = function() {
    if(this.parent instanceof ast.FunctionDeclaration || this.parent instanceof ast.FunctionExpression)
      return this.parent;
    return this.parent && this.parent.getEnclosingFunction();
  };
  
  ast.VariableDeclarator.prototype.isGlobal = function() {
    return !this.getEnclosingFunction();
  };
});