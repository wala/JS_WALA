(function(__global) {
    var tmp0, tmp6;
    tmp0 = function(o) {
        var tmp1, tmp2, tmp3, tmp4, tmp5;
        tmp1 = o;
        tmp2 = "i";
        tmp4 = o;
        tmp5 = "j";
        tmp3 = 42;
        tmp4[tmp5] = tmp3;
        tmp1[tmp2] = tmp3;
        return;
    };
    tmp6 = tmp0();
})(typeof global === 'undefined' ? this : global);