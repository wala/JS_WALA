(function(__global) {
    var tmp0, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13;
    tmp2 = 42;
    tmp1 = {
        x: tmp2
    };
    tmp0 = "o";
    __global[tmp0] = tmp1;
    tmp4 = "o";
    tmp3 = __global[tmp4];
    tmp6 = "alert";
    tmp7 = tmp6 in tmp3;
    if (tmp7) {
        tmp5 = tmp3[tmp6];
    } else {
        tmp5 = __global[tmp6];
    }
    tmp9 = "x";
    tmp10 = tmp9 in tmp3;
    if (tmp10) {
        tmp8 = tmp3[tmp9];
    } else {
        tmp8 = __global[tmp9];
    }
    tmp12 = 'alert';
    tmp13 = tmp12 in tmp3;
    if(tmp13) {
	tmp11 = tmp3[tmp12](tmp8);
    } else {
	tmp11 = tmp5(tmp8);	
    }
})(typeof global === 'undefined' ? this : global);