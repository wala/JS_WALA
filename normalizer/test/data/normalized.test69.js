(function(__global) {
    var tmp0, tmp1;
    tmp1 = function() {
        var bar, tmp2;
        bar = function() {
            return;
        };
        tmp2 = bar;
        return tmp2;
    };
    tmp0 = "foo";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);