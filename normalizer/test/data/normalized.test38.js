(function (__global) {
    var tmp0, tmp1;
    tmp1 = function (dest, src) {
        var p, tmp2, tmp5, tmp6, tmp7, tmp8, tmp9;
        tmp2 = src;
        tmp3: {
            for (p in tmp2) {
                tmp4: {
                    tmp5 = dest;
                    tmp6 = p;
                    tmp8 = src;
                    tmp9 = p;
                    tmp7 = tmp8[tmp9];
                    tmp5[tmp6] = tmp7;
                }
            }
        }
        return;
    };
    tmp0 = 'extend';
    __global[tmp0] = tmp1;
}(typeof global === 'undefined' ? this : global));
