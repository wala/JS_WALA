(function(__global) {
    var tmp0, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13;
    tmp2 = 23;
    tmp3 = 19;
    tmp0 = tmp2 + tmp3;
    tmp1: {
        tmp4 = 42;
        tmp5 = tmp0 === tmp4;
        if (tmp5) {
            tmp7 = "alert";
            tmp6 = __global[tmp7];
            tmp8 = "yes!";
            tmp9 = tmp6(tmp8);
            break tmp1;
        } else {
            tmp11 = "alert";
            tmp10 = __global[tmp11];
            tmp12 = "huh?";
            tmp13 = tmp10(tmp12);
            break tmp1;
        }
    }
})(typeof global === 'undefined' ? this : global);