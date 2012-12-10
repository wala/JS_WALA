(function(__global) {
    var tmp0, tmp1;
    tmp1 = function extend(dest, src) {
        var p, tmp2, tmp4, tmp5, tmp6, tmp7, tmp8;
        tmp2 = src;
        tmp3: {
            for (p in tmp2) {
                tmp4 = dest;
                tmp5 = p;
                tmp7 = src;
                tmp8 = p;
                tmp6 = tmp7[tmp8];
                tmp4[tmp5] = tmp6;
            }
        }
        return;
    };
    tmp0 = "extend";
    __global[tmp0] = tmp1;
})(this);