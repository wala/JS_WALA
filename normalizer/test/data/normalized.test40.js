(function(__global) {
    var tmp0, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp14, tmp15, tmp16, tmp17;
    tmp2 = 23;
    tmp3 = 19;
    tmp0 = tmp2 + tmp3;
    tmp1: {
        tmp8 = 42;
        tmp9 = tmp0 === tmp8;
        if (tmp9) {
            tmp11 = "alert";
            tmp10 = __global[tmp11];
            tmp12 = "yes!";
            tmp13 = tmp10(tmp12);
            tmp15 = "alert";
            tmp14 = __global[tmp15];
            tmp16 = "huh?";
            tmp17 = tmp14(tmp16);
        } else {
            tmp5 = "alert";
            tmp4 = __global[tmp5];
            tmp6 = "huh?";
            tmp7 = tmp4(tmp6);
        }
    }
})(typeof global === 'undefined' ? this : global);