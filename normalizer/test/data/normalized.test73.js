(function(__global) {
    var tmp0, tmp1;
    tmp1 = function() {
        var o, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12;
        tmp2 = 42;
        o = {
            x: tmp2
        };
        tmp3 = o;
        tmp5 = "alert";
        tmp6 = tmp5 in tmp3;
        if (tmp6) {
            tmp4 = tmp3[tmp5];
        } else {
            tmp4 = __global[tmp5];
        }
        tmp8 = "x";
        tmp9 = tmp8 in tmp3;
        if (tmp9) {
            tmp7 = tmp3[tmp8];
        } else {
            tmp7 = __global[tmp8];
        }
        tmp11 = 'alert';
        tmp12 = tmp11 in tmp3;
        if(tmp12) {
	    tmp10 = tmp3[tmp11](tmp7);
	} else {
            tmp10 = tmp4(tmp7);
        }
        return;
    };
    tmp0 = "f";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);