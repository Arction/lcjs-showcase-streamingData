import {
    Themes,
    lightningChart,
    AxisScrollStrategies,
    AxisTickStrategies,
    UIElementBuilders,
    emptyLine,
    emptyFill,
    FontSettings,
    disableThemeEffects,
} from '@lightningchart/lcjs'

// Use theme if provided
const urlParams = new URLSearchParams(window.location.search)
let theme = Themes[urlParams.get('theme') as keyof Themes] || Themes.darkGold
if (!theme.isDark) {
    const uiContainer = document.getElementsByClassName('ui-container')[0] as HTMLDivElement
    uiContainer.style.color = 'black'
}

const chart = lightningChart({
    resourcesBaseUrl: `${window.location.origin}${window.location.pathname}resources`,
})
    .ChartXY({
        theme: disableThemeEffects(theme),
        container: 'chart-container',
    })
    .setTitleFillStyle(emptyFill)
    .setPadding({ top: 32 })

const axisX = chart
    .getDefaultAxisX()
    .setAnimationScroll(false)
    .setScrollStrategy(AxisScrollStrategies.progressive)
    .setTitle('Data points per channel')

chart.axisY.dispose()

const App = (channelCount: number, dataPointsPerSecond: number) => {
    const xIntervalMax = 60 * dataPointsPerSecond
    axisX.setInterval({ start: -xIntervalMax, end: 0, stopAxisAfter: false })
    const channelLabelFont = new FontSettings({
        size: channelCount <= 30 ? 14 : 8,
    })
    chart.setCursorMode(channelCount <= 10 ? 'show-all-interpolated' : undefined)
    const channels = new Array(channelCount).fill(0).map((_, i) => {
        const axisY = chart
            .addAxisY({ iStack: -i })
            .setTitleFont(channelLabelFont)
            .setTitle(`Channel #${i + 1}`)
            .setTitleRotation(0)
            .setTickStrategy(AxisTickStrategies.Empty)
            .setStrokeStyle(emptyLine)
        const series = chart
            .addPointLineAreaSeries({ dataPattern: 'ProgressiveX', axisY })
            .setName(`Channel #${i + 1}`)
            .setStrokeStyle((stroke) => stroke.setThickness(1))
            .setMaxSampleCount(Math.ceil(xIntervalMax))
        return { axisY, series }
    })

    // Define Y traces that will be looped indefinitely to create test data set.
    const normalizeNumberArray = (numbers: number[]) => {
        const min = numbers.reduce((prev, cur) => Math.min(prev, cur), Number.MAX_SAFE_INTEGER)
        const max = numbers.reduce((prev, cur) => Math.max(prev, cur), -Number.MAX_SAFE_INTEGER)
        const interval = max - min
        return numbers.map((num) => (num - min) / interval)
    }
    const signals = [
        normalizeNumberArray(
            new Array(Math.ceil((100 * 1000) / 4))
                .fill(0)
                .map((_, x, arr) => (x * 2) / arr.length + Math.sin((x * 8 * 2 * Math.PI) / arr.length) + Math.random() * 0.01),
        ),
        normalizeNumberArray(
            new Array(Math.ceil((100 * 1000) / 2))
                .fill(0)
                .map((_, x, arr) => (x * 2) / arr.length + Math.sin((x * 8 * 2 * Math.PI) / arr.length)),
        ),
        normalizeNumberArray(
            new Array(Math.ceil((100 * 1000) / 1))
                .fill(0)
                .map((_, x, arr) => (x * 2) / arr.length + Math.sin((x * 8 * 2 * Math.PI) / arr.length)),
        ),
    ]

    // Push more data in each frame, while keeping a consistent amount of incoming points according to specified stream rate as Hz.
    let xPos = 0
    const pushNMoreDataPoints = (n: number) => {
        const xs = new Float64Array(n)
        const allYs = []
        for (let iChannel = 0; iChannel < channels.length; iChannel++) {
            const nSignal = signals[iChannel % signals.length]
            const ys = new Float64Array(n)
            allYs.push(ys)
            for (let iDp = 0; iDp < n; iDp++) {
                const x = xPos + iDp
                const iData = x % nSignal.length
                const ySignal = nSignal[iData]
                const y = (channelCount - iChannel - 1) * 1 + ySignal
                if (iChannel === 0) xs[iDp] = x
                ys[iDp] = y
            }
        }
        xPos += n

        channels.forEach((ch, i) =>
            ch.series.appendSamples({
                xValues: xs,
                yValues: allYs[i],
            }),
        )

        const visibleDataPoints = channels.reduce((prev, cur) => prev + cur.series.getSampleCount(), 0)
        labelVisibleData.innerHTML =
            visibleDataPoints < 1000000 ? (visibleDataPoints / 1000).toFixed(1) + ' k' : (visibleDataPoints / 1000000).toFixed(2) + ' M'
    }
    let tPrev = performance.now()
    let newDataModulus = 0
    let subAnimationFrame
    const streamMoreData = () => {
        const tNow = performance.now()
        // Prevent delta from being more than 1 s. This would happen when user switches tab for some time, etc.
        const tDelta = Math.min(tNow - tPrev, 1000)
        let newDataPointsCount = dataPointsPerSecond * (tDelta / 1000) + newDataModulus

        newDataModulus = newDataPointsCount % 1
        newDataPointsCount = Math.floor(newDataPointsCount)

        pushNMoreDataPoints(newDataPointsCount)

        // Request next frame.
        tPrev = tNow
        subAnimationFrame = requestAnimationFrame(streamMoreData)
    }

    pushNMoreDataPoints(100 * 1000)
    subAnimationFrame = requestAnimationFrame(streamMoreData)

    return async () => {
        channels.forEach((ch) => {
            ch.axisY.dispose()
            ch.series.dispose()
        })
        cancelAnimationFrame(subAnimationFrame)

        // Wait a small while if a lot of data was disposed.
        if (channelCount * dataPointsPerSecond > 300 * 1000) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
    }
}

// Measure FPS.
let tStart = Date.now()
let frames = 0
let fps = 0
const recordFrame = () => {
    frames++
    const tNow = Date.now()
    fps = 1000 / ((tNow - tStart) / frames)
    labelFps.innerHTML = fps && !isNaN(fps) && isFinite(fps) ? fps.toFixed(1) : ''
    sub_recordFrame = requestAnimationFrame(recordFrame)
}
let sub_recordFrame = requestAnimationFrame(recordFrame)
setInterval(() => {
    tStart = Date.now()
    frames = 0
}, 5000)

const inputChannels = document.getElementById('input-channels') as HTMLInputElement
const inputData = document.getElementById('input-data') as HTMLInputElement
const labelFps = document.getElementById('label-fps')
const labelVisibleData = document.getElementById('label-visibleData')
let curChannelCount = 10
let curDataPointsPerSecond = 10 * 1000
inputChannels.value = String(curChannelCount)
inputData.value = String(curDataPointsPerSecond)
inputChannels.onchange = (e) => {
    try {
        const channelCount = Math.max(1, Number(inputChannels.value))
        if (channelCount !== curChannelCount) {
            curChannelCount = channelCount
            refreshApp()
        }
    } catch (e) {
        console.error(e.message)
    }
}
inputData.onchange = (e) => {
    try {
        const dataPointsPerSecond = Math.max(0, Number(inputData.value))
        if (dataPointsPerSecond !== curDataPointsPerSecond) {
            curDataPointsPerSecond = dataPointsPerSecond
            refreshApp()
        }
    } catch (e) {
        console.error(e.message)
    }
}
let resetApp = undefined
const refreshApp = async () => {
    if (resetApp) {
        await resetApp()
    }
    resetApp = App(curChannelCount, curDataPointsPerSecond)
}
refreshApp()
