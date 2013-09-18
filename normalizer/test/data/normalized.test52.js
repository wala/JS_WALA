(function(__global) {
    var tmp0, tmp13, tmp14;
    tmp0 = function(j) {
        var i, tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp10, tmp11, tmp12;
        i = 0;
        tmp2 = i;
        tmp3 = j;
        tmp1 = tmp2 < tmp3;
        tmp8: {
            while (tmp1) {
                tmp9: {
                    tmp11 = i;
                    tmp12 = 2;
                    tmp10 = tmp11 % tmp12;
                    if (tmp10) {
                        break tmp8;
                    } else {
			;
                    }
                }
                tmp6 = i;
                tmp7 = 1;
                i = tmp6 + tmp7;
                tmp4 = i;
                tmp5 = j;
                tmp1 = tmp4 < tmp5;
            }
        }
        return;
    };
    tmp13 = 10;
    tmp14 = tmp0(tmp13);
})(typeof global === 'undefined' ? this : global);