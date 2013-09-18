(function (__global) {
    var tmp0, tmp1;
    tmp1 = function () {
        var tmp3;
        tmp2: {
            tmp3 = 23;
            break tmp2;
        }
        return tmp3;
    };
    tmp0 = 'foo';
    __global[tmp0] = tmp1;
}(typeof global === 'undefined' ? this : global));
