(function (__global) {
    var tmp0, tmp1;
    tmp1 = function (o) {
        var p, tmp2, tmp5, tmp6, tmp7, tmp8;
        tmp2 = o;
        tmp3: {
            for (p in tmp2) {
                tmp4: {
                    tmp6 = p;
                    tmp7 = 'SKIP';
                    tmp5 = tmp6 === tmp7;
                    if (tmp5) {
                        break tmp4;
                    } else {
                        ;
                    }
                }
            }
        }
        tmp8 = p;
        return tmp8;
    };
    tmp0 = 'f';
    __global[tmp0] = tmp1;
}(typeof global === 'undefined' ? this : global));
