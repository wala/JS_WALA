(function (__global) {
    var tmp0, tmp1;
    tmp1 = function () {
        var tmp3, tmp4, tmp5, tmp6, tmp7;
        tmp2: {
            tmp7 = 'window';
            tmp5 = __global[tmp7];
            tmp6 = 'WeakMap';
            tmp4 = tmp5[tmp6];
            if (tmp4) {
                tmp3 = true;
                break tmp2;
            } else {
                ;
            }
            tmp3 = false;
            break tmp2;
        }
        return tmp3;
    };
    tmp0 = 'tst';
    __global[tmp0] = tmp1;
}(typeof global === 'undefined' ? this : global));
