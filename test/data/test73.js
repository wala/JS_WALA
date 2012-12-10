(function(__global) {
    var tmp0, tmp1;
    tmp1 = function f() {
        var o, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10;
        tmp2 = 42;
        o = {
            x: tmp2
        };
        tmp3 = o;
        tmp5 = "alert";
        tmp9 = tmp5 in tmp3;
        if (tmp9) {
            tmp4 = tmp3[tmp5];
        } else {
            tmp4 = __global[tmp5];
        }
        tmp7 = "x";
        tmp10 = tmp7 in tmp3;
        if (tmp10) {
            tmp6 = tmp3[tmp7];
        } else {
            tmp6 = __global[tmp7];
        }
        tmp8 = tmp4(tmp6);
        return;
    };
    tmp0 = "f";
    __global[tmp0] = tmp1;
})(this);