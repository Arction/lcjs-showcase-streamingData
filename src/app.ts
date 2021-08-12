import {
  Themes,
  lightningChart,
  AxisScrollStrategies,
  AxisTickStrategies,
  SolidLine,
  SolidFill,
  ColorHSV,
  UIElementBuilders,
  emptyLine,
  emptyFill,
  FontSettings,
} from "@arction/lcjs";

// Use theme if provided
const urlParams = new URLSearchParams(window.location.search);
let theme = Themes.darkGold;
if (urlParams.get("theme") == "light") {
  theme = Themes.lightNew;
  const uiContainer = document.getElementsByClassName('ui-container')[0] as HTMLDivElement;
  uiContainer.style.color = 'black';
}

const chart = lightningChart()
  .ChartXY({
    theme,
    container: "chart-container",
  })
  .setTitleFillStyle(emptyFill)
  .setPadding({ top: 32 });

const axisX = chart
  .getDefaultAxisX()
  .disableAnimations()
  .setScrollStrategy(AxisScrollStrategies.progressive)
  .setTitle("Data points per channel");
const axisY = chart
  .getDefaultAxisY()
  .setTickStrategy(AxisTickStrategies.Empty)
  .setTitle("< Channels >")
  .disableAnimations()
  .setScrollStrategy(AxisScrollStrategies.expansion);

const App = (channelCount: number, dataPointsPerSecond: number) => {
  const xIntervalMax = 60 * dataPointsPerSecond;

  axisX.setInterval(-xIntervalMax, 0);
  axisY.setInterval(0, channelCount * 1);

  // Define Y traces that will be looped indefinitely to create test data set.
  const normalizeNumberArray = (numbers: number[]) => {
    const min = numbers.reduce(
      (prev, cur) => Math.min(prev, cur),
      Number.MAX_SAFE_INTEGER
    );
    const max = numbers.reduce(
      (prev, cur) => Math.max(prev, cur),
      -Number.MAX_SAFE_INTEGER
    );
    const interval = max - min;
    return numbers.map((num) => (num - min) / interval);
  };

  const signals = [
    normalizeNumberArray(
      new Array(Math.ceil((100 * 1000) / 4))
        .fill(0)
        .map(
          (_, x, arr) =>
            (x * 2) / arr.length +
            Math.sin((x * 8 * 2 * Math.PI) / arr.length) +
            Math.random() * 0.01
        )
    ),
    normalizeNumberArray(
      new Array(Math.ceil((100 * 1000) / 2))
        .fill(0)
        .map(
          (_, x, arr) =>
            (x * 2) / arr.length + Math.sin((x * 8 * 2 * Math.PI) / arr.length)
        )
    ),
    normalizeNumberArray(
      new Array(Math.ceil((100 * 1000) / 1))
        .fill(0)
        .map(
          (_, x, arr) =>
            (x * 2) / arr.length + Math.sin((x * 8 * 2 * Math.PI) / arr.length)
        )
    ),
  ];

  const series = new Array(channelCount).fill(0).map((_, iChannel) => {
    const nSeries = chart
      .addLineSeries({
        dataPattern: {
          pattern: "ProgressiveX",
          regularProgressiveStep: true,
        },
      })
      .setName(`Channel #${iChannel + 1}`)
      .setStrokeStyle(stroke => stroke.setThickness(1))
      .setMouseInteractions(false)
      .setDataCleaning({
        minDataPointCount: xIntervalMax
      });

    return nSeries;
  });

  const channelLabelFont = new FontSettings({
    size: channelCount <= 30 ? theme.uiFont.size : 8,
  });
  const channelLabels = new Array(channelCount).fill(0).map((_, iChannel) => {
    return axisY
      .addCustomTick(UIElementBuilders.AxisTick)
      .setTextFormatter(() => `Channel #${iChannel + 1}`)
      .setValue((channelCount - iChannel - 0.5) * 1)
      .setGridStrokeStyle(emptyLine)
      .setMarker((marker) => marker.setTextFont(channelLabelFont));
  });

  // Push more data in each frame, while keeping a consistent amount of incoming points according to specified stream rate as Hz.
  let xPos = 0;
  const pushNMoreDataPoints = (n: number) => {
    const seriesNewDataPoints = [];
    for (let iChannel = 0; iChannel < series.length; iChannel++) {
      const nSignal = signals[iChannel % signals.length];
      const newDataPoints = [];
      for (let iDp = 0; iDp < n; iDp++) {
        const x = xPos + iDp;
        const iData = x % nSignal.length;
        const ySignal = nSignal[iData];
        const y = (channelCount - iChannel - 1) * 1 + ySignal;
        const point = { x, y };
        newDataPoints.push(point);
      }
      seriesNewDataPoints[iChannel] = newDataPoints;
    }
    xPos += n;

    series.forEach((nSeries, iSeries) =>
      nSeries
        .add(seriesNewDataPoints[iSeries])
    );

    const visibleDataPoints = series.reduce(
      (prev, cur) => prev + cur.getPointAmount(),
      0
    );
    labelVisibleData.innerHTML =
      visibleDataPoints < 1000000
        ? (visibleDataPoints / 1000).toFixed(1) + " k"
        : (visibleDataPoints / 1000000).toFixed(2) + " M";
  };
  let tPrev = performance.now();
  let newDataModulus = 0;
  let subAnimationFrame;
  let longFrameTimeHistory = new Array(50).fill(false);
  const streamMoreData = () => {
    const tNow = performance.now();
    const tDelta = tNow - tPrev;
    let newDataPointsCount =
      dataPointsPerSecond * (tDelta / 1000) + newDataModulus;

    longFrameTimeHistory.shift();
    if (tDelta >= 1000 / 20) {
      longFrameTimeHistory.push(true);
    } else {
      longFrameTimeHistory.push(false);
    }
    const longFramesCount = longFrameTimeHistory.reduce(
      (prev, cur) => prev + (cur === true ? 1 : 0),
      0
    );

    newDataModulus = newDataPointsCount % 1;
    newDataPointsCount = Math.floor(newDataPointsCount);

    if (longFramesCount < 3 || curInputBufferingEnabled === false) {
      pushNMoreDataPoints(newDataPointsCount);
      labelInputBuffering.innerHTML = "";
    } else {
      labelInputBuffering.innerHTML = "Active";
    }

    // Request next frame.
    tPrev = tNow;
    subAnimationFrame = requestAnimationFrame(streamMoreData);
  };

  pushNMoreDataPoints(100 * 1000);
  subAnimationFrame = requestAnimationFrame(streamMoreData);

  return async () => {
    series.forEach((series) => series.dispose());
    channelLabels.forEach((label) => label.dispose());
    cancelAnimationFrame(subAnimationFrame);

    // Wait a small while if a lot of data was disposed.
    if (channelCount * dataPointsPerSecond > 300 * 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };
};

// Measure FPS.
let tStart = Date.now();
let frames = 0;
let fps = 0;
const recordFrame = () => {
  frames++;
  const tNow = Date.now();
  fps = 1000 / ((tNow - tStart) / frames);
  labelFps.innerHTML =
    fps && !isNaN(fps) && isFinite(fps) ? fps.toFixed(1) : "";
  sub_recordFrame = requestAnimationFrame(recordFrame);
};
let sub_recordFrame = requestAnimationFrame(recordFrame);
setInterval(() => {
  tStart = Date.now();
  frames = 0;
}, 5000);

const inputChannels = document.getElementById(
  "input-channels"
) as HTMLInputElement;
const inputData = document.getElementById("input-data") as HTMLInputElement;
const inputBufferingEnabled = document.getElementById(
  "input-inputBufferingEnabled"
) as HTMLInputElement;
const labelFps = document.getElementById("label-fps");
const labelVisibleData = document.getElementById("label-visibleData");
const labelInputBuffering = document.getElementById(
  "label-inputBufferingActive"
);
let curChannelCount = 10;
let curDataPointsPerSecond = 10 * 1000;
let curInputBufferingEnabled = true;
inputChannels.value = String(curChannelCount);
inputData.value = String(curDataPointsPerSecond);
inputBufferingEnabled.checked = curInputBufferingEnabled;
inputChannels.onchange = (e) => {
  try {
    const channelCount = Math.max(1, Number(inputChannels.value));
    if (channelCount !== curChannelCount) {
      curChannelCount = channelCount;
      refreshApp();
    }
  } catch (e) {
    console.error(e.message);
  }
};
inputData.onchange = (e) => {
  try {
    const dataPointsPerSecond = Math.max(0, Number(inputData.value));
    if (dataPointsPerSecond !== curDataPointsPerSecond) {
      curDataPointsPerSecond = dataPointsPerSecond;
      refreshApp();
    }
  } catch (e) {
    console.error(e.message);
  }
};
inputBufferingEnabled.onchange = (e) => {
  curInputBufferingEnabled = inputBufferingEnabled.checked;
};
let resetApp = undefined;
const refreshApp = async () => {
  if (resetApp) {
    await resetApp();
  }
  resetApp = App(curChannelCount, curDataPointsPerSecond);
};
refreshApp();
