import { lightningChart, DataPatterns, AxisScrollStrategies, emptyFill, emptyTick, UIOrigins, emptyLine, SeriesXYFormatter, LineSeries, UILayoutBuilders, UIDraggingModes, UIElementBuilders, SolidFill, ColorHEX, UIBackgrounds, AxisTickStrategies, SolidLine, ColorRGBA } from "@arction/lcjs"
import { createProgressiveRandomGenerator } from "@arction/xydata"

// Define channels.
const channels = [
    'Ch 1',
    'Ch 2',
    'Ch 3',
    'Ch 4',
    'Ch 5'
]
// This is more like a guideline (streaming uses JS setInterval, which is not precise). Refer to in-chart PPS indicator for actual value.
const approxPointsPerSecondChannel = 10000
const channelHeight = 1.0
const channelGap = 0.2

// Create Chart.
const chart = lightningChart().ChartXY({
    containerId: 'chart-container',
    defaultAxisXTickStrategy: AxisTickStrategies.Numeric
})
    // Hide title.
    .setTitleFillStyle( emptyFill )

// Configurure Axes Scrolling modes.
const axisX = chart.getDefaultAxisX()
    // Scroll along with incoming data.
    .setScrollStrategy( AxisScrollStrategies.progressive )
    .setInterval( -approxPointsPerSecondChannel, 0 )

const axisY = chart.getDefaultAxisY()
    // Keep same interval always.
    .setScrollStrategy( undefined )
    .setInterval( 0, channels.length * channelHeight + ( channels.length - 1 ) * channelGap )
    // Hide default ticks.
    .setTickStyle( emptyTick )

// Create a LineSeries for each "channel".
const series = channels.map((ch, i) => {
    const series = chart
        .addLineSeries({
            // Specifying progressive DataPattern enables some otherwise unusable optimizations.
            dataPattern: DataPatterns.horizontalProgressive
        })
            .setName( ch )
            // Specify data to be cleaned after a buffer of approx. 10 seconds.
            // Regardless of this value, data has to be out of view to be cleaned in any case.
            .setMaxPointCount( approxPointsPerSecondChannel * 10 )
    // Add Label to Y-axis that displays the Channel name.
    axisY.addCustomTick()
        .setValue( ( i + 0.5 ) * channelHeight + i * channelGap )
        .setTextFormatter( () => ch )
        .setMarker(( marker ) => marker
            .setFont(( font ) => font
                .setWeight( 'bold' )
            )
            .setBackground(( background ) => background
                .setFillStyle( emptyFill )
                .setStrokeStyle( emptyLine )
            )
        )
        .setGridStrokeStyle( new SolidLine({
            thickness: 3,
            fillStyle: new SolidFill({ color: ColorRGBA( 255, 125, 0, 80 ) })
        }) )
    return series
})

// Create random progressive data stream using 'xydata' library.
let pointsAdded = 0
const randomPointGenerator = createProgressiveRandomGenerator()
    // Generator will repeat same Y values after every 10k points.
    .setNumberOfPoints( 10 * 1000 )
series.forEach((series, i) => {
    const streamInterval = 1000 / 60
    const streamBatchSize = Math.ceil( approxPointsPerSecondChannel / streamInterval )
    randomPointGenerator
        .generate()
        .setStreamRepeat( true )
        .setStreamBatchSize( streamBatchSize )
        .setStreamInterval( streamInterval )
        .toStream()
        .forEach((point) => {
            // Increase Y coordinate based on Series index, so that Series aren't on top of each other.
            point.y += i * channelHeight + i * channelGap
            series.add( point )
            pointsAdded ++
        })
})

// Style AutoCursor.
chart.setAutoCursor(( autoCursor ) => autoCursor
    .setGridStrokeYStyle( emptyLine )
    .disposeTickMarkerY()
)
const resultTableFormatter: SeriesXYFormatter = ( tableContentBuilder, activeSeries: LineSeries, x, y ) => {
    const seriesIndex = series.indexOf( activeSeries )

    return tableContentBuilder
        .addRow( activeSeries.getName() )
        .addRow( 'X', '', activeSeries.axisX.formatValue( x ) )
        // Translate Y coordinate back to [0, 1].
        .addRow( 'Y', '', activeSeries.axisY.formatValue( y - ( seriesIndex * channelHeight + seriesIndex * channelGap ) ) )
}
series.forEach(( series ) => series.setResultTableFormatter( resultTableFormatter ))

// Create indicators for points-per-second and frames-per-second.
const indicatorLayout = chart.addUIElement(
    UILayoutBuilders.Row
        .setBackground( UIBackgrounds.Rectangle ),
    // Position UIElement with Axis coordinates.
    {
        x: axisX.scale,
        y: axisY.scale
    }
)
    .setOrigin( UIOrigins.LeftTop )
    .setDraggingMode( UIDraggingModes.notDraggable )
    // Set dark, tinted Background style.
    .setBackground(( background ) => background
        .setFillStyle( new SolidFill({ color: ColorHEX('#000').setA(150) }) )
        .setStrokeStyle( emptyLine )
    )
// Reposition indicators whenever X Axis scale is changed (to keep position static).
axisX.onScaleChange(( start, end ) => {
    indicatorLayout.setPosition({ x: start, y: axisY.scale.getInnerEnd() })
})
// FPS indicator.
const indicatorFPS = indicatorLayout.addElement( UIElementBuilders.TextBox )
    .setText('FPS')
    .setFont(( font ) => font
        .setWeight( 'bold' )
    )

// PPS indicator.
const indicatorPPS = indicatorLayout.addElement( UIElementBuilders.TextBox )
    .setText('PPS')
    .setFont(( font ) => font
        .setWeight( 'bold' )
    )

// Measure FPS.
let frameCount = 0
let frameDelaySum = 0
let framePrevious: number | undefined
const measureFPS = () => {
    const now = window.performance.now()
    frameCount ++
    if ( framePrevious )
        frameDelaySum += now - framePrevious
    framePrevious = now
    requestAnimationFrame( measureFPS )
}
requestAnimationFrame( measureFPS )

// Update displayed FPS and PPS on regular intervals.
let displayPrevious = window.performance.now()
setInterval(() => {
    const now = window.performance.now()
    const delta = now - displayPrevious
    const fps = 1000 / (frameDelaySum / frameCount)
    const pps = 1000 * pointsAdded / delta

    indicatorFPS.setText(`FPS: ${fps.toFixed(1)}`)
    indicatorPPS.setText(`PPS: ${pps.toFixed(0)}`)

    // Reset counters.
    frameDelaySum = 0
    frameCount = 0
    pointsAdded = 0
    displayPrevious = now
}, 1000)
