const channelColor = {
    brightness: "yellow",
    value: "cyan",
    saturation: "brown",
};

/**
 * Check if the channelName is RGB channel
 * @param {String} channelName
 * @returns Boolean
 */
function isRGBChannel(channelName) {
    return ["red", "green", "blue"].indexOf(channelName) > -1;
}

/**
 * The word in title formatting
 * @param {string} word
 * @returns Titled format of the word
 */
function title(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Empty the target element from the dom
 * @param {D3 selected DOM} d3SelectObj
 * @param {String} target
 * @returns Emptied dom
 */
function emptyD3Obj(d3SelectObj, target) {
    d3SelectObj.selectAll(target).data([]).exit().remove();
    log("Empty d3 select", { id: d3SelectObj.attr("id"), target });
    return d3SelectObj;
}

/**
 * Log the message
 */
function log(input) {
    const args = Array.prototype.slice.call(arguments, 0);
    console.log("**********************");
    args.map((d) => {
        console.log(d);
    });
}
