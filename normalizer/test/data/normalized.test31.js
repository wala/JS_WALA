(function(__global) {
    var tmp0, tmp1;
    tmp1 = function() {
        var i, tmp2, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12;
        i = 0;
        tmp5 = i;
        tmp6 = 10;
        tmp2 = tmp5 < tmp6;
        tmp3: {
            while (tmp2) {
                tmp4: {
                    tmp8 = "alert";
                    tmp7 = __global[tmp8];
                    tmp9 = i;
                    tmp10 = tmp7(tmp9);
                }
                tmp11 = i;
                tmp12 = 10;
                tmp2 = tmp11 < tmp12;
            }
        }
        return;
    };
    tmp0 = "count";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);