(function(__global) {
    var tmp0, tmp1, tmp2, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp14, tmp15, tmp16, tmp17;
    tmp1 = 0;
    tmp0 = "i";
    __global[tmp0] = tmp1;
    tmp2 = true;
    tmp3: {
        while (tmp2) {
            tmp4: {
                tmp6 = "alert";
                tmp5 = __global[tmp6];
                tmp8 = "i";
                tmp7 = __global[tmp8];
                tmp13 = "i";
                tmp11 = __global[tmp13];
                tmp12 = 1;
                tmp10 = tmp11 + tmp12;
                tmp9 = "i";
                __global[tmp9] = tmp10;
                tmp14 = tmp5(tmp7);
            }
            tmp17 = "i";
            tmp15 = __global[tmp17];
            tmp16 = 10;
            tmp2 = tmp15 < tmp16;
        }
    }
})(typeof global === 'undefined' ? this : global);