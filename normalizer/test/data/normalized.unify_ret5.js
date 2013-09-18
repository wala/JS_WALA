(function (__global) {
    var tmp0, tmp1;
    tmp1 = function (f) {
        var y, tmp3, tmp4, tmp5;
        tmp2: {
            y = 42;
            try {
                tmp4 = f;
                tmp5 = y;
                tmp3 = tmp4(tmp5);
                break tmp2;
            } finally {
                y = 23;
            }
        }
        return tmp3;
    };
    tmp0 = 'tst';
    __global[tmp0] = tmp1;
}(typeof global === 'undefined' ? this : global));
