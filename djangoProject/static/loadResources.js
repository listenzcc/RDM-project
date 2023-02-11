/**
 * File: loadResources.js
 * Author: Chuncheng Zhang
 */

console.log("Running script.js");
console.log(d3.version);
console.log(Chart.version);

const AllImageResource = [];
const AllRDMResource = [];
const NodeContainer = {};

/**
 * Require and deal with the resources
 */
function loadResources() {
    Object.assign(NodeContainer, {
        // RDM
        rdmModuleSelector: d3.select("RDM-module-selector"),
        rdmSetSelector: d3.select("RDM-set-selector"),
        rdmNameSelector: d3.select("RDM-name-selector"),
        // Single image
        singleImageImgNode: document.getElementById("singleImage-img"),
        singleImageHistogramCanvasName: "singleImage-histogram-canvas",
        singleImageModuleSelector: d3.select("#singleImage-module-selector"),
        singleImageSetSelector: d3.select("#singleImage-set-selector"),
        singleImageNameSelector: d3.select("#singleImage-name-selector"),
        // Resource table
        resourceTableD3Select: d3.select("#table-container-1"),
    });

    // Require the resources from the backend
    d3.json("resources").then((json) => {
        log("Load sources", json);

        // Collect the json resources
        collectResources(json);

        // Fill the resource table
        fillResourceTable(NodeContainer.resourceTableD3Select);

        // Init the single image options
        initSingleImageOptions();

        // Init the RDM options
        initRDMOptions();
    });
}

function collectResources(json) {
    var { module, set, name, extension, detail } = json;

    for (let i in module) {
        const obj = {
            module: module[i],
            set: set[i],
            name: name[i],
            extension: extension[i],
            detail: detail[i],
        };
        if (obj.extension === "jpg") AllImageResource.push(obj);
        if (obj.extension === "npz") AllRDMResource.push(obj);
    }

    AllImageResource.columns = ["module", "set", "name", "extension", "detail"];
    AllRDMResource.columns = ["module", "set", "name", "extension", "detail"];
    log("allImageOptions", AllImageResource);
    log("allRDMOptions", AllRDMResource);
}

function initRDMOptions() {}

/**
 * Init the single image options
 * It also adds triggers of update the images and histograms
 * @param {Json object} json
 */
function initSingleImageOptions() {
    var uniqueModule = [...new Set(AllImageResource.map((d) => d.module))],
        uniqueSet = [...new Set(AllImageResource.map((d) => d.set))];

    //
    const select_1 = emptyD3Obj(
        NodeContainer.singleImageModuleSelector,
        "option"
    );
    select_1
        .selectAll("option")
        .data(uniqueModule)
        .enter()
        .append("option")
        .text((d) => d);

    //
    const select_2 = emptyD3Obj(NodeContainer.singleImageSetSelector, "option");
    select_2
        .selectAll("option")
        .data(uniqueSet)
        .enter()
        .append("option")
        .text((d) => d);

    //
    const select_3 = emptyD3Obj(
        NodeContainer.singleImageNameSelector,
        "option"
    );
    resetSelect_3();

    //
    select_1.on("change", (e) => {
        resetSelect_3();
        redraw();
    });

    select_2.on("change", (e) => {
        resetSelect_3();
        redraw();
    });

    redraw();

    //
    function redraw() {
        var module = select_1.node().value,
            set = select_2.node().value,
            name = select_3.node().value,
            imgNode = NodeContainer.singleImageImgNode,
            chartName = NodeContainer.singleImageHistogramCanvasName;
        refreshImage(module, set, name, imgNode);
        refreshHistogram(module, set, name, chartName);
    }

    function resetSelect_3() {
        var module = select_1.node().value,
            set = select_2.node().value,
            data = AllImageResource.filter(
                (d) => (d.module === module) & (d.set === set)
            );

        emptyD3Obj(select_3, "option");

        select_3
            .selectAll("option")
            .data(data)
            .enter()
            .append("option")
            .text((d) => d.name);

        select_3.on("change", (e) => {
            redraw();
        });

        log("Reset select-3", { length: data.length, module, set });
    }
}

/**
 * Refresh the image in imgNode, the image path is module/set/name
 * @param {String} module
 * @param {String} set
 * @param {String} name
 * @param {Node} imgNode
 */
function refreshImage(module, set, name, imgNode) {
    log("Refresh image", { module, set, name });
    imgNode.src = `static/${module}/${set}/${name}`;
}

/**
 * Make table from the give json to the root
 * @param {d3 dom} root
 */
function fillResourceTable(root) {
    var { columns } = AllImageResource,
        concat = AllRDMResource.concat(AllImageResource),
        data = concat.map((d) => columns.map((c) => d[c]));

    // Clear the tables in the root
    emptyD3Obj(root, "table");

    // Generate the table
    const table = root.append("table").attr("class", "display");

    ["thead", "tfoot"].map((name) => {
        table
            .append(name)
            .append("tr")
            .selectAll("th")
            .data(columns)
            .enter()
            .append("th")
            .text((d) => title(d));
    });

    const tr = table
        .append("tbody")
        .selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    tr.selectAll("td")
        .data((d) => d)
        .enter()
        .append("td")
        .text((d) => d);

    // $(table._groups[0][0]).DataTable();
    $(table.node()).DataTable();
}
