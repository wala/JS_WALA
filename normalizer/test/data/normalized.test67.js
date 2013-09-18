(function(__global) {
    var tmp0, tmp3, tmp4, tmp5, tmp6;
    tmp0 = true;
    tmp1: {
        while (tmp0) {
            tmp2: {
                tmp4 = "alert";
                tmp3 = __global[tmp4];
                tmp5 = "stuck!";
                tmp6 = tmp3(tmp5);
            }
        }
    }
})(typeof global === 'undefined' ? this : global);