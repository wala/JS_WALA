(function (__global) {
    var tmp0, tmp1, tmp15, tmp16;
    tmp1 = function(o) {
        var g, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7, tmp8, tmp9, tmp10, tmp11, tmp12, tmp13, tmp14;
        tmp2 = o;
        tmp4 = 'g';
        tmp5 = tmp4 in tmp2;
        if (tmp5) {
            tmp3 = tmp2[tmp4];
        } else {
            tmp3 = g;
        }
        tmp7 = 'g';
        tmp8 = tmp7 in tmp2;
        if (tmp8) {
            tmp6 = tmp2[tmp7]();
        } else {
            tmp6 = tmp3();
        }
        tmp10 = 'h';
        tmp11 = tmp10 in tmp2;
        if (tmp11) {
            tmp9 = tmp2[tmp10];
        } else {
            tmp9 = __global[tmp10];
        }
        tmp13 = 'h';
        tmp14 = tmp13 in tmp2;
        if (tmp14) {
            tmp12 = tmp2[tmp13]();
        } else {
            tmp12 = tmp9();
        }
        return;
    };
    tmp0 = 'f';
    __global[tmp0] = tmp1;
    tmp16 = function() {
        return;
    };
    tmp15 = 'h';
    __global[tmp15] = tmp16;
}(typeof global === 'undefined' ? this : global));
