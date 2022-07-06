import "ol/ol.css";
import GeoJSON from "ol/format/GeoJSON";
import Map from "ol/Map";
import VectorSource from "ol/source/Vector";
import View from "ol/View";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import { Stroke, Style } from "ol/style";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import Fill from "ol/style/Fill";
import Select from "ol/interaction/Select";
import { transform } from "ol/proj.js";
import { altKeyOnly, click, pointerMove } from "ol/events/condition";

import {
  and as andFilter,
  equalTo as equalToFilter,
  like as likeFilter,
} from "ol/format/filter";

const vectorSource = new VectorSource({
  format: new GeoJSON(),
  url: function (extent) {
    return (
      "http://localhost:8080/geoserver/wfs?service=WFS&" +
      "version=1.1.0&request=GetFeature&typename=nka:cad&" +
      "outputFormat=application/json&srsname=EPSG:3857&" +
      "bbox=" +
      extent.join(",") +
      ",EPSG:3857"
    );
  },
  strategy: bboxStrategy,
});

const vector = new VectorLayer({
  source: vectorSource,
  style: new Style({
    stroke: new Stroke({
      color: "rgba(0, 0, 255, 1.0)",
      width: 2,
    }),
  }),
});

// const raster = new TileLayer({
//   source: new TileWMS({
//           url: 'http://localhost:8080/geoserver/wms',
//           params: {'LAYERS': 'ShapeFile:cad_export', 'TILED': true},
//           serverType: 'geoserver',
//           // Countries have transparency, so do not fade tiles:
//           transition: 0,
//         }),
// });

const map = new Map({
  layers: [vector],
  target: document.getElementById("map"),
  view: new View({
    center: transform([30.9876, -28.6472], "EPSG:4326", "EPSG:3857"),
    maxZoom: 19,
    zoom: 12,
  }),
});

const selectStyle = new Style({
  fill: new Fill({
    color: "#eeeeee",
  }),
  stroke: new Stroke({
    color: "rgba(255, 255, 255, 0.7)",
    width: 2,
  }),
});

const status = document.getElementById("status");

let selected = null;
map.on("pointermove", function (e) {
  if (selected !== null) {
    selected.setStyle(undefined);
    selected = null;
  }

  map.forEachFeatureAtPixel(e.pixel, function (f) {
    selected = f;
    selectStyle.getFill().setColor(f.get("COLOR") || "#eeeeee");
    f.setStyle(selectStyle);
    return true;
  });

  if (selected) {
    status.innerHTML = JSON.stringify(selected); //.get("SG32CODE");
  } else {
    status.innerHTML = "&nbsp;";
  }
});

let select = null; // ref to currently selected interaction

const selectedColor = new Style({
  fill: new Fill({
    color: "#eeeeee",
  }),
  stroke: new Stroke({
    color: "rgba(255, 255, 255, 0.7)",
    width: 2,
  }),
});

function selectedStyle(feature) {
  const color = feature.get("COLOR") || "#eeeeee";
  selectedColor.getFill().setColor(color);
  return selectedColor;
}

// select interaction working on "singleclick"
const selectSingleClick = new Select({ style: selectedStyle });

// select interaction working on "click"
const selectClick = new Select({
  condition: click,
  style: selectedStyle,
});

// select interaction working on "pointermove"
const selectPointerMove = new Select({
  condition: pointerMove,
  style: selectedStyle,
});

const selectAltClick = new Select({
  style: selectedStyle,
  condition: function (mapBrowserEvent) {
    return click(mapBrowserEvent) && altKeyOnly(mapBrowserEvent);
  },
});

const selectElement = document.getElementById("type");

const changeInteraction = function () {
  if (select !== null) {
    map.removeInteraction(select);
  }
  const value = selectElement.value;
  if (value == "singleclick") {
    select = selectSingleClick;
  } else if (value == "click") {
    select = selectClick;
  } else if (value == "pointermove") {
    select = selectPointerMove;
  } else if (value == "altclick") {
    select = selectAltClick;
  } else {
    select = null;
  }
  if (select !== null) {
    map.addInteraction(select);
    select.on("select", function (e) {
      document.getElementById("status").innerHTML =
        "&nbsp;" +
        e.target.getFeatures().getLength() +
        " selected features (last operation selected " +
        e.selected.length +
        " and deselected " +
        e.deselected.length +
        " features)";
    });
  }
};

/**
 * onchange callback on the select element.
 */
selectElement.onchange = changeInteraction;
changeInteraction();
