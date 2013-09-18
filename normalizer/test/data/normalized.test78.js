(function(__global) {
    var tmp0, tmp1;
    tmp1 = function(o) {
        var x, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8;
        tmp2 = o;
        tmp3 = 23;
        tmp4 = "x";
        tmp5 = tmp4 in tmp2;
        if (tmp5) {
            tmp2[tmp4] = tmp3;
        } else {
            x = tmp3;
        }
        tmp7 = 42;
        tmp6 = "y";
        tmp8 = tmp6 in tmp2;
        if (tmp8) {
            tmp2[tmp6] = tmp7;
        } else {
            __global[tmp6] = tmp7;
        }
        return;
    };
    tmp0 = "f";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);
