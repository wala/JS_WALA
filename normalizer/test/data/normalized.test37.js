(function (__global) {
    var tmp0, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp14, tmp15;
    tmp3 = 'src';
    tmp0 = __global[tmp3];
    tmp1: {
        for (tmp13 in tmp0) {
            tmp15 = tmp13;
            tmp14 = 'p';
            __global[tmp14] = tmp15;
            tmp2: {
                tmp6 = 'dest';
                tmp4 = __global[tmp6];
                tmp7 = 'p';
                tmp5 = __global[tmp7];
                tmp11 = 'src';
                tmp9 = __global[tmp11];
                tmp12 = 'p';
                tmp10 = __global[tmp12];
                tmp8 = tmp9[tmp10];
                tmp4[tmp5] = tmp8;
            }
        }
    }
}(typeof global === 'undefined' ? this : global));
