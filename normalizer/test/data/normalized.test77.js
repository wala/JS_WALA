(function(__global) {
    var tmp0, tmp1;
    tmp1 = function(o) {
        var x, tmp2, tmp3, tmp4, tmp5;
        x = 23;
        tmp2 = o;
        tmp4 = "x";
        tmp5 = tmp4 in tmp2;
        if (tmp5) {
            tmp3 = tmp2[tmp4];
        } else {
            tmp3 = x;
        }
        return tmp3;
    };
    tmp0 = "f";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);
