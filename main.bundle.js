!function(e){function t(t){for(var n,i,l=t[0],s=t[1],u=t[2],d=0,f=[];d<l.length;d++)i=l[d],Object.prototype.hasOwnProperty.call(o,i)&&o[i]&&f.push(o[i][0]),o[i]=0;for(n in s)Object.prototype.hasOwnProperty.call(s,n)&&(e[n]=s[n]);for(c&&c(t);f.length;)f.shift()();return a.push.apply(a,u||[]),r()}function r(){for(var e,t=0;t<a.length;t++){for(var r=a[t],n=!0,l=1;l<r.length;l++){var s=r[l];0!==o[s]&&(n=!1)}n&&(a.splice(t--,1),e=i(i.s=r[0]))}return e}var n={},o={0:0},a=[];function i(t){if(n[t])return n[t].exports;var r=n[t]={i:t,l:!1,exports:{}};return e[t].call(r.exports,r,r.exports,i),r.l=!0,r.exports}i.m=e,i.c=n,i.d=function(e,t,r){i.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},i.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},i.t=function(e,t){if(1&t&&(e=i(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(i.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var n in e)i.d(r,n,function(t){return e[t]}.bind(null,n));return r},i.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return i.d(t,"a",t),t},i.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},i.p="";var l=window.webpackJsonp=window.webpackJsonp||[],s=l.push.bind(l);l.push=t,l=l.slice();for(var u=0;u<l.length;u++)t(l[u]);var c=s;a.push([0,1]),r()}([function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=r(1),o=r(9),a=["Ch 1","Ch 2","Ch 3","Ch 4","Ch 5"],i=n.lightningChart().ChartXY({containerId:"chart-container",defaultAxisXTickStrategy:n.AxisTickStrategies.Numeric}).setTitleFillStyle(n.emptyFill),l=i.getDefaultAxisX().setScrollStrategy(n.AxisScrollStrategies.progressive).setInterval(-1e4,0),s=i.getDefaultAxisY().setScrollStrategy(void 0).setInterval(0,1*a.length+.2*(a.length-1)).setTickStyle(n.emptyTick),u=a.map((function(e,t){var r=i.addLineSeries({dataPattern:n.DataPatterns.horizontalProgressive}).setName(e).setMaxPointCount(1e5);return s.addCustomTick().setValue(1*(t+.5)+.2*t).setTextFormatter((function(){return e})).setMarker((function(e){return e.setFont((function(e){return e.setWeight("bold")})).setBackground((function(e){return e.setFillStyle(n.emptyFill).setStrokeStyle(n.emptyLine)}))})).setGridStrokeStyle(new n.SolidLine({thickness:3,fillStyle:new n.SolidFill({color:n.ColorRGBA(255,125,0,80)})})),r})),c=0,d=o.createProgressiveRandomGenerator().setNumberOfPoints(1e4);u.forEach((function(e,t){var r=Math.ceil(600);d.generate().setStreamRepeat(!0).setStreamBatchSize(r).setStreamInterval(1e3/60).toStream().forEach((function(r){r.y+=1*t+.2*t,e.add(r),c++}))})),i.setAutoCursor((function(e){return e.setGridStrokeYStyle(n.emptyLine).disposeTickMarkerY()}));var f=function(e,t,r,n){var o=u.indexOf(t);return e.addRow(t.getName()).addRow("X","",t.axisX.formatValue(r)).addRow("Y","",t.axisY.formatValue(n-(1*o+.2*o)))};u.forEach((function(e){return e.setResultTableFormatter(f)}));var p=i.addUIElement(n.UILayoutBuilders.Column.setBackground(n.UIBackgrounds.Rectangle),{x:l.scale,y:s.scale}).setOrigin(n.UIOrigins.LeftTop).setDraggingMode(n.UIDraggingModes.notDraggable).setBackground((function(e){return e.setFillStyle(new n.SolidFill({color:n.ColorHEX("#000").setA(150)})).setStrokeStyle(n.emptyLine)}));l.onScaleChange((function(e,t){p.setPosition({x:e,y:s.scale.getInnerEnd()})}));var g,m="Rendering frames-per-second (FPS)",y=p.addElement(n.UIElementBuilders.TextBox).setText(m).setFont((function(e){return e.setWeight("bold")})),S="Incoming data, at rate of points-per-second (PPS)",h=p.addElement(n.UIElementBuilders.TextBox).setText(S).setFont((function(e){return e.setWeight("bold")})),v=0,x=0,b=function(){var e=window.performance.now();v++,g&&(x+=e-g),g=e,requestAnimationFrame(b)};requestAnimationFrame(b);var w=window.performance.now();setInterval((function(){var e=window.performance.now(),t=1e3/(x/v),r=1e3*c/(e-w);y.setText(m+": "+t.toFixed(1)),h.setText(S+": "+r.toFixed(0)),x=0,v=0,c=0,w=e}),1e3)}]);