(function(__global) {
    var tmp0, tmp1;
    tmp1 = function() {
        var tmp2, tmp3, tmp4;
        tmp3 = this;
        tmp4 = "g";
        tmp2 = tmp3[tmp4]();
        return tmp2;
    };
    tmp0 = "f";
    __global[tmp0] = tmp1;
})(typeof global === 'undefined' ? this : global);