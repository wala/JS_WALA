(function(__global) {
    var tmp0, tmp7;
    tmp0 = function(o) {
        var tmp1, tmp2, tmp3, tmp4, tmp5, tmp6;
        tmp4 = o;
        tmp5 = "x";
        tmp6 = tmp4[tmp5];
        tmp2 = 2;
        tmp3 = tmp6 >> tmp2;
        tmp4[tmp5] = tmp3;
        tmp1 = 42;
        return tmp1;
    };
    tmp7 = tmp0();
})(typeof global === 'undefined' ? this : global);