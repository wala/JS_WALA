(function (__global) {
    var tmp0, tmp1;
    tmp1 = function () {
        var x, tmp3;
        tmp2: {
            x = 23;
            tmp3 = x;
            break tmp2;
        }
        return tmp3;
    };
    tmp0 = 'foo';
    __global[tmp0] = tmp1;
}(typeof global === 'undefined' ? this : global));
