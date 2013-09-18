(function(__global) {
    var tmp0, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp14, tmp15, tmp16, tmp17, tmp18, tmp19, tmp20, tmp21;
    tmp2 = 23;
    tmp3 = 19;
    tmp0 = tmp2 + tmp3;
    tmp1: {
        tmp16 = 42;
        tmp17 = tmp0 === tmp16;
        if (tmp17) {
            tmp19 = "alert";
            tmp18 = __global[tmp19];
            tmp20 = "yes!";
            tmp21 = tmp18(tmp20);
            break tmp1;
        } else {
            tmp10 = 19;
            tmp11 = 23;
            tmp8 = tmp10 + tmp11;
            tmp9 = tmp0 === tmp8;
            if (tmp9) {
                tmp13 = "alert";
                tmp12 = __global[tmp13];
                tmp14 = "yes!";
                tmp15 = tmp12(tmp14);
                break tmp1;
            } else {
                tmp5 = "alert";
                tmp4 = __global[tmp5];
                tmp6 = "huh?";
                tmp7 = tmp4(tmp6);
            }
        }
    }
})(typeof global === 'undefined' ? this : global);