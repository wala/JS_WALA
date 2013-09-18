(function (__global) {
    var tmp0, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10;
    tmp3 = 'o';
    tmp0 = __global[tmp3];
    tmp1: {
        for (tmp8 in tmp0) {
            tmp10 = tmp8;
            tmp9 = 'p';
            __global[tmp9] = tmp10;
            tmp2: {
                tmp7 = 'p';
                tmp5 = __global[tmp7];
                tmp6 = 'SKIP';
                tmp4 = tmp5 === tmp6;
                if (tmp4) {
                    break tmp2;
                } else {
                    ;
                }
            }
        }
    }
}(typeof global === 'undefined' ? this : global));
