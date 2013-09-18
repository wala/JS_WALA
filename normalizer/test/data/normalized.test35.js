(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp16, tmp17, tmp18, tmp19, tmp20;
    tmp1 = 0;
    tmp0 = "i";
    __global[tmp0] = tmp1;
    tmp5 = "i";
    tmp3 = __global[tmp5];
    tmp4 = 10;
    tmp2 = tmp3 < tmp4;
    tmp14: {
        while (tmp2) {
            tmp15: {
                tmp17 = "alert";
                tmp16 = __global[tmp17];
                tmp19 = "i";
                tmp18 = __global[tmp19];
                tmp20 = tmp16(tmp18);
            }
            tmp13 = "i";
            tmp11 = __global[tmp13];
            tmp12 = 1;
            tmp10 = tmp11 + tmp12;
            tmp9 = "i";
            __global[tmp9] = tmp10;
            tmp8 = "i";
            tmp6 = __global[tmp8];
            tmp7 = 10;
            tmp2 = tmp6 < tmp7;
        }
    }
})(typeof global === 'undefined' ? this : global);