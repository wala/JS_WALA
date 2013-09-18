(function(__global) {
    var tmp0, tmp1;
    tmp1 = function(o) {
        var tmp2, tmp3, tmp4;
        tmp3 = o;
        tmp4 = "x";
        tmp2 = delete tmp3[tmp4];
        return;
    };
    tmp0 = "f";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);