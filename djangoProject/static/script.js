console.log("Running script.js");
console.log(d3.version);
console.log(Chart.version);

const allImageOptions = [];

const chartJSObjCache = {
  chart1: undefined,
};

const gradientCache = {};

/**
 * Require and deal with the resources
 */
function loadResources() {
  d3.json("resources").then((json) => {
    log("Load sources", json);
    resourceTable(json);
    imageOption(json);
  });
}

/**
 * Deal with Image options
 * @param {Json object} json
 */
function imageOption(json) {
  var extension, name, set, module;

  for (let i in json.name) {
    if (json.extension[i] !== "jpg") continue;
    extension = json.extension[i];
    name = json.name[i];
    set = json.set[i];
    module = json.module[i];
    allImageOptions.push({ name, extension, set, module });
  }

  log("allImageOptions", allImageOptions);

  const uniqueModule = [...new Set(allImageOptions.map((d) => d.module))],
    uniqueSet = [...new Set(allImageOptions.map((d) => d.set))];

  //
  const select1 = emptyD3Obj(d3.select("#select-1"), "option");
  select1
    .selectAll("option")
    .data(uniqueModule)
    .enter()
    .append("option")
    .text((d) => d);

  //
  const select2 = emptyD3Obj(d3.select("#select-2"), "option");
  select2
    .selectAll("option")
    .data(uniqueSet)
    .enter()
    .append("option")
    .text((d) => d);

  //
  const select3 = emptyD3Obj(d3.select("#select-3"), "option");
  resetSelect3();

  //
  select1.on("change", (e) => {
    resetSelect3();
    redraw();
  });

  select2.on("change", (e) => {
    resetSelect3();
    redraw();
  });

  redraw();

  //
  function redraw() {
    const module = select1.node().value,
      set = select2.node().value,
      name = select3.node().value,
      imgNode = document.getElementById("img-1"),
      chartName = "chart1";
    refreshImage(module, set, name, imgNode);
    refreshHistogram(module, set, name, chartName);
  }

  function resetSelect3() {
    const module = select1.node().value,
      set = select2.node().value,
      data = allImageOptions.filter(
        (d) => (d.module === module) & (d.set === set)
      );

    emptyD3Obj(select3, "option");

    select3
      .selectAll("option")
      .data(data)
      .enter()
      .append("option")
      .text((d) => d.name);

    select3.on("change", (e) => {
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
  const { extension } = allImageOptions.filter(
    (d) => (d.name === name) & (d.module === module) & (d.set === set)
  )[0];

  log("Refresh image", { name, module, set, extension });

  imgNode.src = `static/${module}/${set}/${name}`;
}

function refreshHistogram(module, set, name, chartName) {
  const url = `imagefeatures?module=${module}&set=${set}&name=${name}`;

  d3.json(url).then((json) => {
    log("Refresh histogram", json);

    {
      const ctx = document
        .getElementById("canvas-" + chartName)
        .getContext("2d");
      const labels = [...new Array(255)].map((d, i) => i);

      const options = {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          title: {
            display: true,
            text: "Histogram Line Chart",
          },
        },
        scales: {
          y: {
            type: "linear", // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
            position: "left",
            ticks: {
              color: "black",
              label: "a",
            },
          },
          y2: {
            type: "linear", // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
            position: "right",
            // reverse: true,
            ticks: {
              color: "gray",
            },
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
          },
        },
      };

      const datasets = [];
      const { dim, dim_hue } = json;

      function getGradient(context, channelName = "unknown") {
        const { ctx, chartArea } = context.chart;
        const gradient = ctx.createLinearGradient(
          chartArea.left,
          0,
          chartArea.right,
          0
        );

        const nSegment = d3.min([10, dim]);

        if (gradientCache[channelName + nSegment]) {
          return gradientCache[channelName + nSegment];
        }

        if (isRGBChannel(channelName)) {
          const segmentScale = d3
            .scaleLinear()
            .domain([0, nSegment])
            .range([0, 1]);
          const hsl = d3.hsl(channelName);
          hsl.opacity = 0.7;
          for (let i = 0; i < nSegment; ++i) {
            hsl.s = segmentScale(i);
            gradient.addColorStop(segmentScale(i), d3.color(hsl));
          }
          gradientCache[channelName + nSegment] = gradient;
          return gradient;
        }

        if (channelColor[channelName]) {
          const segmentScale = d3
            .scaleLinear()
            .domain([0, nSegment])
            .range([0, 1]);
          const hsl = d3.hsl(channelColor[channelName]);
          for (let i = 0; i < nSegment; ++i) {
            hsl.s = segmentScale(i);
            gradient.addColorStop(segmentScale(i), d3.color(hsl));
          }
          gradientCache[channelName + nSegment] = gradient;
          return gradient;
        }

        if (channelName === "hue") {
          const hsl = d3.hsl("red");

          const segmentScale = d3
            .scaleLinear()
            .domain([0, nSegment])
            .range([0, (1 * dim) / dim_hue]);

          for (let i = 0; i < nSegment; ++i) {
            if (segmentScale(i) < 1) {
              hsl.h = (segmentScale(i) * 360 * dim) / dim_hue;
              gradient.addColorStop(segmentScale(i), d3.color(hsl));
            }
          }
          gradientCache[channelName + nSegment] = gradient;
          return gradient;
        }

        gradient.addColorStop(0, d3.color("gray"));
        gradient.addColorStop(0.5, d3.color("black"));
        gradient.addColorStop(1, d3.color("gray"));
        return gradient;
      }

      for (let c in json) {
        if (c.startsWith("channel_")) {
          const channelName = c.slice("channel_".length);
          const normalizer = 1 / d3.sum(json[c]);

          const data = (() => {
            let d = json[c].map((d) => d * normalizer);

            // if (["red", "green", "blue"].indexOf(channelName) === -1) {
            //   d = d.map((d) => (d *= -1));
            // }

            if (channelName === "hue") {
              d = d.map((d, i) => (i > dim_hue ? undefined : d));
            }

            return d;
          })();

          const axisId = {
            hue: "y2",
            saturation: "y2",
            value: "y2",
            brightness: "y2",
          };

          datasets.push({
            label: channelName,
            yAxisID: axisId[channelName] ? axisId[channelName] : "y",
            data,
            backgroundColor: (context) =>
              context.chart.chartArea
                ? getGradient(context, channelName)
                : undefined,
            borderColor: (context) =>
              context.chart.chartArea
                ? getGradient(context, channelName)
                : undefined,
            borderWidth: isRGBChannel(channelName) ? 2 : 1,
            pointRadius: 1,
            pointHoverRadius: 5,
          });
        }
      }

      if (chartJSObjCache[chartName]) {
        const c = chartJSObjCache[chartName];
        c.data.datasets = datasets;
        c.data.labels = labels;
        c.options = Object.assign({}, options);
        c.update();
      } else {
        chartJSObjCache[chartName] = new Chart(ctx, {
          type: "line",
          data: { labels: labels, datasets: datasets },
          options: Object.assign({}, options),
        });
      }
    }
  });
}

/**
 * Make table from the give json to the root
 * @param {json object} json
 * @param {d3 dom} root
 */
function resourceTable(json, root = d3.select("#table-container-1")) {
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
