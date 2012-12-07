if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require("./ast");

  ast.Node.prototype.mayCompleteNormally = function() { return true; };
  
  ast.ReturnStatement.prototype.mayCompleteNormally = function() { return false; };
  ast.BreakStatement.prototype.mayCompleteNormally = function() { return false; };
  ast.ContinueStatement.prototype.mayCompleteNormally = function() { return false; };
  ast.ThrowStatement.prototype.mayCompleteNormally = function() { return false; };

  ast.IfStatement.prototype.mayCompleteNormally = function() {
    return this.consequent.mayCompleteNormally() || this.alternate.mayCompleteNormally();
  };
  ast.WithStatement.prototype.mayCompleteNormally = function() {
    return this.body.mayCompleteNormally();
  };
  ast.BlockStatement.prototype.mayCompleteNormally = function() {
    return this.body.mayCompleteNormally();
  };
  ast.List.prototype.mayCompleteNormally = function() {
    for(var i=0;i<this.getNumChild();++i)
      if(!this.getChild(i).mayCompleteNormally())
        return false;
    return true;
  };
});