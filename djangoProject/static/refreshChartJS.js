const chartJSObjCache = {
  someChartJSObjName: undefined,
};

const gradientCache = {};

const RDMCompareCache = [];

const histogramOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: "bottom",
    },
    title: {
      display: true,
      text: "Histogram line chart",
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

function alternatePointStyles(ctx) {
  // log(ctx)
  if (ctx.dataset._names[ctx.dataIndex].indexOf("fmri") > -1) return "rect";
  return "circle";
}

const rdmCompareOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
      labels: {
        usePointStyle: true,
      },
    },
    title: {
      display: true,
      text: "RDM compare chart",
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
  },
  elements: {
    point: {
      pointStyle: alternatePointStyles,
    },
  },
};

/**
 * Refresh the hisgogram graph in chartName by the given {module, set, name} of the image
 * @param {} module
 * @param {} set
 * @param {} name
 * @param {String} chartName, name of the canvas
 */
function refreshHistogramChartJS(module, set, name, chartName) {
  const url = `imageChannels?module=${module}&set=${set}&name=${name}`;
  const ctx = document.getElementById(chartName).getContext("2d");

  d3.json(url).then((json) => {
    log("Refresh histogram", json);
    const { dim, dim_hue } = json;
    const labels = [...new Array(dim)].map((d, i) => i);

    /**
     * Generate the gradient to the context,
     * of use the existing gradient in the cache.
     * @param {Context} context
     * @param {String} channelName
     * @returns gradient
     */
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

      // Only draw to the dim_hue, instead of dim
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

    // Fill the datasets form the json
    const datasets = [];
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

    // Create chart or use the existing chart in the cache
    if (chartJSObjCache[chartName]) {
      const c = chartJSObjCache[chartName];
      c.data.datasets = datasets;
      c.data.labels = labels;
      c.options = Object.assign({}, histogramOptions);
      c.update();
    } else {
      chartJSObjCache[chartName] = new Chart(ctx, {
        type: "line",
        data: { labels: labels, datasets: datasets },
        options: Object.assign({}, histogramOptions),
      });
    }
  });
}

function refreshRdmNnCompareChartJS(
  module,
  set,
  name,
  names,
  correlates,
  chartName,
  reset
) {
  if (reset) {
    const { length } = RDMCompareCache;
    log(`Clear the RDM NN Compare ChartJS cache, ${length} --> 0`);
    for (let i = 0; i < length; i++) RDMCompareCache.pop();
  }

  log(module, set, name);
  // log(names, correlates);
  log(chartName);
  const ctx = document.getElementById(chartName).getContext("2d");

  const labels = names;

  const colorScheme = d3.schemeCategory10;
  if (RDMCompareCache.filter((d) => d.label === name).length === 0) {
    const i = RDMCompareCache.length;
    RDMCompareCache.push({
      label: name,
      data: correlates,
      borderColor: colorScheme[i % 10] + "90",
      backgroundColor: colorScheme[i % 10],
      _names: names,
    });
  }

  // Create chart or use the existing chart in the cache
  if (chartJSObjCache[chartName]) {
    const c = chartJSObjCache[chartName];
    c.data.datasets = RDMCompareCache;
    c.data.labels = labels;
    c.options = Object.assign({}, rdmCompareOptions);
    c.update();
  } else {
    chartJSObjCache[chartName] = new Chart(ctx, {
      type: "line",
      data: { labels: labels, datasets: RDMCompareCache },
      options: Object.assign({}, rdmCompareOptions),
    });
  }
}
