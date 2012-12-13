/**
 * Utility functions to collect all variable and function declarations in a subtree.
 */
if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var ast = require('./ast');

  function getDeclName(decl) {
    if(decl.type === 'Identifier')
      return decl.name;
    return decl.id.name;
  }

  function collectDecls(nd, accu) {
    if(!nd)
      return accu;
    
    if(nd.type === 'FunctionDeclaration') {
      accu[accu.length] = nd;
    } else if(nd.type === 'VariableDeclarator') {
      accu[accu.length] = nd;
    } else if(nd.type !== 'FunctionExpression') {
      ast.forEachChild(nd, function(ch) {
        collectDecls(ch, accu);
      });
    }
    return accu;
  }
  
  exports.collectDecls = collectDecls;
  exports.getDeclName = getDeclName;
});