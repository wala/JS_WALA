if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  var mayCompleteNormally = exports.mayCompleteNormally = function(nd) {
    switch(nd.type) {
    case 'ReturnStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
    case 'ThrowStatement':
      return false;
    case 'IfStatement':
      return mayCompleteNormally(nd.consequent) && mayCompleteNormally(nd.alternate);
    case 'WithStatement':
      return mayCompleteNormally(nd.body);
    case 'BlockStatement':
      for(var i=0;i<nd.body.length;++i)
        if(!mayCompleteNormally(nd.body[i]))
          return false;
      return true;
    default:
      return true;
    }
  };
});