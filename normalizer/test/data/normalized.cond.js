(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5;
    tmp5 = "window";
    tmp3 = __global[tmp5];
    tmp4 = __global;
    tmp2 = tmp3 === tmp4;
    if (tmp2) {
        tmp1 = 23;
    } else {
        tmp1 = 42;
    }
    tmp0 = "x";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);
