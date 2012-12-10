(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11;
    tmp2 = 42;
    tmp1 = {
        x: tmp2
    };
    tmp0 = "o";
    __global[tmp0] = tmp1;
    tmp4 = "o";
    tmp3 = __global[tmp4];
    tmp6 = "alert";
    tmp10 = tmp6 in tmp3;
    if (tmp10) {
        tmp5 = tmp3[tmp6];
    } else {
        tmp5 = __global[tmp6];
    }
    tmp8 = "x";
    tmp11 = tmp8 in tmp3;
    if (tmp11) {
        tmp7 = tmp3[tmp8];
    } else {
        tmp7 = __global[tmp8];
    }
    tmp9 = tmp5(tmp7);
})(this);