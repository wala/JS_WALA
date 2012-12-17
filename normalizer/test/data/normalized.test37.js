(function(__global) {
    var tmp0, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp14;
    tmp2 = "src";
    tmp0 = __global[tmp2];
    tmp1: {
        for (tmp12 in tmp0) {
            tmp14 = tmp12;
            tmp13 = "p";
            __global[tmp13] = tmp14;
            tmp5 = "dest";
            tmp3 = __global[tmp5];
            tmp6 = "p";
            tmp4 = __global[tmp6];
            tmp10 = "src";
            tmp8 = __global[tmp10];
            tmp11 = "p";
            tmp9 = __global[tmp11];
            tmp7 = tmp8[tmp9];
            tmp3[tmp4] = tmp7;
        }
    }
})(this);