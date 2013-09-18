(function(__global) {
    var tmp0, tmp1, tmp2, tmp6;
    tmp0 = 23;
    tmp6 = {
        x: tmp0,
        get y() {
            var tmp3, tmp4, tmp5;
            tmp4 = this;
            tmp5 = "x";
            tmp3 = tmp4[tmp5];
            return tmp3;
        },
        set y(v) {
            return;
        }
    };
})(typeof global === 'undefined' ? this : global);