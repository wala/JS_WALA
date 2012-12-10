if(typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports) {
  Array.prototype.flatmap = function(fn, thisArg) {
    var res = [];
    for(var i=0;i<this.length;++i) {
      var r = fn.call(thisArg, this[i], i, this);
      for(var j=0;j<r.length;++j)
        res[res.length] = r[j];
    }
    return res;
  };
});