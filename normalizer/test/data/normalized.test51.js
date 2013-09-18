(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6;
    tmp6 = "window";
    tmp2 = __global[tmp6];
    tmp3 = "tick";
    tmp1 = tmp2[tmp3];
    tmp5 = 1;
    tmp4 = tmp1 + tmp5;
    tmp2[tmp3] = tmp4;
    tmp0 = "oldTick";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);