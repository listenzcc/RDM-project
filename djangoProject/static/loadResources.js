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
        rdmModuleSelector: d3.select("#RDM-module-selector"),
        rdmSetSelector: d3.select("#RDM-set-selector"),
        rdmNameSelector: d3.select("#RDM-name-selector"),
        rdmCanvasName: "RDM-canvas",
        dualImageImg1Node: document.getElementById("dualImage-img-1"),
        dualImageImg2Node: document.getElementById("dualImage-img-2"),
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
        // initSingleImageOptions();
        setTimeout(initSingleImageOptions, 10);

        // Init the RDM options
        // initRDMOptions();
        setTimeout(initRDMOptions, 10);
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

/**
 * Init the RDM options
 */
function initRDMOptions() {
    var uniqueModule = [...new Set(AllRDMResource.map((d) => d.module))],
        uniqueSet = [...new Set(AllRDMResource.map((d) => d.set))];

    //
    const select_1 = emptyD3Obj(NodeContainer.rdmModuleSelector, "option");
    select_1
        .selectAll("option")
        .data(uniqueModule)
        .enter()
        .append("option")
        .text((d) => d);

    //
    const select_2 = emptyD3Obj(NodeContainer.rdmSetSelector, "option");
    select_2
        .selectAll("option")
        .data(uniqueSet)
        .enter()
        .append("option")
        .text((d) => d);

    //
    const select_3 = emptyD3Obj(NodeContainer.rdmNameSelector, "option");
    resetSelect_3();

    //
    select_1.on("change", (e) => {
        resetSelect_3();
    });

    select_2.on("change", (e) => {
        resetSelect_3();
    });

    function resetSelect_3() {
        var module = select_1.node().value,
            set = select_2.node().value,
            data = AllRDMResource.filter(
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
        redraw();
    }

    function redraw() {
        var module = select_1.node().value,
            set = select_2.node().value,
            name = select_3.node().value,
            url = `rdm?module=${module}&set=${set}&name=${name}`;

        d3.json(url).then((json) => {
            log("RDM", json);
            drawMatrix(json, NodeContainer.rdmCanvasName);
        });
    }
}

function drawMatrix(json, canvasName) {
    var canvas = document.getElementById(canvasName),
        ctx = canvas.getContext("2d"),
        { width, height } = canvas,
        { data, extent, shape, scale, set } = json,
        scaleInv = 1 / scale,
        nImg = shape[shape.length - 1],
        scaleX = d3.scaleLinear().domain([0, nImg]).range([0, width]).nice(),
        scaleY = d3.scaleLinear().domain([0, nImg]).range([0, height]).nice(),
        scaleColor = d3.scaleLinear().domain(extent).range([0, 1]).nice(),
        interpolateColor = d3.interpolateCividis, //d3.interpolateHue("blue", "red"),
        dx = scaleX(0.8),
        dy = scaleY(0.8),
        edx = scaleX(1.0),
        edy = scaleX(1.0),
        x,
        y,
        v,
        clickGrids,
        images;

    images = AllImageResource.filter(({ set: s }) => set === s);
    log("Using images", images);

    if (shape.length === 3) data = data[0];

    function redraw(highlight = []) {
        NodeContainer.dualImageImg1Node.src = "";
        NodeContainer.dualImageImg2Node.src = "";
        ctx.clearRect(0, 0, width, height);

        // Draw grid
        clickGrids = [];
        for (let i = 0; i < nImg; i++) {
            for (let j = 0; j < nImg; j++) {
                (v = data[i][j] * scaleInv), (x = scaleX(i)), (y = scaleY(j));

                (ctx.fillStyle = interpolateColor(scaleColor(v))),
                    ctx.beginPath(),
                    ctx.rect(x, y, dx, dy),
                    ctx.fill();

                clickGrids.push({
                    i,
                    j,
                    x1: x,
                    y1: y,
                    x2: x + edx,
                    y2: y + edy,
                });
            }
        }

        // Draw highlight
        highlight.map(({ i, j }) => {
            log(i, j);
            (v = data[i][j] * scaleInv), (x = scaleX(i)), (y = scaleY(j));

            ctx.beginPath(),
                (ctx.strokeStyle = "red"),
                ctx.rect(x, y, dx, dy),
                ctx.stroke();

            ctx.beginPath(),
                (ctx.fillStyle = "red"),
                (ctx.font = "30px Monospace"),
                ctx.fillText(v.toFixed(2), x + dx, y + dy),
                ctx.fill();
        });
    }

    redraw();

    canvas.onclick = (event) => {
        var { offsetX: x, offsetY: y } = event,
            clicked = clickGrids.filter(
                ({ x1, y1, x2, y2 }) => x >= x1 && y >= y1 && x <= x2 && y <= y2
            ),
            grid = clicked.length > 0 ? clicked[0] : undefined,
            img1,
            img2;

        if (grid) {
            img1 = images[grid.i];
            img2 = images[grid.j];
            redraw([{ i: grid.i, j: grid.j }]);
            log("Click", clicked, grid, img1, img2);

            refreshImage(
                img1.module,
                img1.set,
                img1.name,
                NodeContainer.dualImageImg1Node
            );
            refreshImage(
                img2.module,
                img2.set,
                img2.name,
                NodeContainer.dualImageImg2Node
            );
        }
    };
}

/**
 * Init the single image options
 * It also adds triggers of update the images and histograms
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
    });

    select_2.on("change", (e) => {
        resetSelect_3();
    });

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
        redraw();
    }

    function redraw() {
        var module = select_1.node().value,
            set = select_2.node().value,
            name = select_3.node().value,
            imgNode = NodeContainer.singleImageImgNode,
            chartName = NodeContainer.singleImageHistogramCanvasName;
        refreshImage(module, set, name, imgNode);
        refreshHistogram(module, set, name, chartName);
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
