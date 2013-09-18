(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4;
    tmp4 = function() {
        var tmp5, tmp6, tmp7;
        tmp7 = "exports";
        tmp6 = __global[tmp7];
        if (tmp6) {
            tmp5 = "node";
        } else {
            tmp5 = "browser";
        }
        return tmp5;
    };
    tmp3 = "getPlatform";
    __global[tmp3] = tmp4;
    tmp1 = "getPlatform";
    tmp0 = __global[tmp1];
    tmp2 = tmp0();
})(typeof global === 'undefined' ? this : global);