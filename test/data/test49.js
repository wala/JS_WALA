getPlatform();
function getPlatform() {
    return exports ? "node" : "browser";
}