(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8;
    tmp3 = "x";
    tmp1 = __global[tmp3];
    tmp4 = "y";
    tmp2 = __global[tmp4];
    tmp0 = tmp1 === tmp2;
    if (tmp0) {
        tmp6 = "alert";
        tmp5 = __global[tmp6];
        tmp7 = "They are the same!";
        tmp8 = tmp5(tmp7);
    } else {
	;
    }
})(typeof global === 'undefined' ? this : global);