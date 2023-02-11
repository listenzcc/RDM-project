console.log("Running script.js");
console.log(d3.version);
console.log(Chart.version);

const AllImageOptions = [];
const VariableContainer = {};

/**
 * Require and deal with the resources
 */
function loadResources() {
    Object.assign(VariableContainer, {
        singleImageImgNode: document.getElementById("singleImageImg"),
        singleImageHistogramChartJS: "singleImageHistogramChartJS",
        resourceTableD3Select: d3.select("#table-container-1"),
        moduleSelector: d3.select("#selectModule"),
        setSelector: d3.select("#selectSet"),
        nameSelector: d3.select("#selectName"),
    });

    d3.json("resources").then((json) => {
        log("Load sources", json);
        fillResourceTable(json);
        // Fill the AllImageOptions
        initImageOptions(json);
    });
}

/**
 * Deal with Image options
 * It add triggers of update the images and histograms
 * @param {Json object} json
 */
function initImageOptions(json) {
    var extension, name, set, module;

    for (let i in json.name) {
        if (json.extension[i] !== "jpg") continue;
        extension = json.extension[i];
        name = json.name[i];
        set = json.set[i];
        module = json.module[i];
        AllImageOptions.push({ name, extension, set, module });
    }

    log("allImageOptions", AllImageOptions);

    const uniqueModule = [...new Set(AllImageOptions.map((d) => d.module))],
        uniqueSet = [...new Set(AllImageOptions.map((d) => d.set))];

    //
    const selectModule = emptyD3Obj(VariableContainer.moduleSelector, "option");
    selectModule
        .selectAll("option")
        .data(uniqueModule)
        .enter()
        .append("option")
        .text((d) => d);

    //
    const selectSet = emptyD3Obj(VariableContainer.setSelector, "option");
    selectSet
        .selectAll("option")
        .data(uniqueSet)
        .enter()
        .append("option")
        .text((d) => d);

    //
    const selectName = emptyD3Obj(VariableContainer.nameSelector, "option");
    resetSelect3();

    //
    selectModule.on("change", (e) => {
        resetSelect3();
        redraw();
    });

    selectSet.on("change", (e) => {
        resetSelect3();
        redraw();
    });

    redraw();

    //
    function redraw() {
        const module = selectModule.node().value,
            set = selectSet.node().value,
            name = selectName.node().value,
            imgNode = VariableContainer.singleImageImgNode, // document.getElementById("singleImageImg"),
            chartName = VariableContainer.singleImageHistogramChartJS; // "singleImageHistogramChartJS";
        refreshImage(module, set, name, imgNode);
        refreshHistogram(module, set, name, chartName);
    }

    function resetSelect3() {
        const module = selectModule.node().value,
            set = selectSet.node().value,
            data = AllImageOptions.filter(
                (d) => (d.module === module) & (d.set === set)
            );

        emptyD3Obj(selectName, "option");

        selectName
            .selectAll("option")
            .data(data)
            .enter()
            .append("option")
            .text((d) => d.name);

        selectName.on("change", (e) => {
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
    const { extension } = AllImageOptions.filter(
        (d) => (d.name === name) & (d.module === module) & (d.set === set)
    )[0];

    log("Refresh image", { name, module, set, extension });

    imgNode.src = `static/${module}/${set}/${name}`;
}

/**
 * Make table from the give json to the root
 * @param {json object} json
 * @param {d3 dom} root
 */
function fillResourceTable(
    json,
    root = VariableContainer.resourceTableD3Select
) {
    const data = [],
        columnName = [];

    const rowIndex = (() => {
        const rowIndex = [];
        for (let col in json) {
            columnName.push(col);
            if (rowIndex.length === 0) {
                for (let j in json[col]) {
                    rowIndex.push(j);
                }
            }
        }
        return rowIndex;
    })();

    var row;
    rowIndex.map((idx) => {
        row = [];
        columnName.map((col, i) => {
            row.push({ col, value: json[col][idx] });
        });
        data.push(row);
    });

    // Clear the tables in the root
    emptyD3Obj(root, "table");

    // Generate the table
    const table = root.append("table").attr("class", "display");

    ["thead", "tfoot"].map((name) => {
        table
            .append(name)
            .append("tr")
            .selectAll("th")
            .data(columnName)
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
        .text((d) => d.value);

    // $(table._groups[0][0]).DataTable();
    $(table.node()).DataTable();
}
