(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10;
    try {
        try {
            tmp1 = "f";
            tmp0 = __global[tmp1];
            tmp2 = tmp0();
        } catch (e) {
            tmp4 = "alert";
            tmp3 = __global[tmp4];
            tmp5 = e;
            tmp6 = tmp3(tmp5);
        }
    } finally {
        tmp8 = "alert";
        tmp7 = __global[tmp8];
        tmp9 = "done";
        tmp10 = tmp7(tmp9);
    }
})(typeof global === 'undefined' ? this : global);