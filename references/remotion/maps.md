# Maps in Remotion

How to put a real place on screen inside a Remotion project: a still map with pins on top, a 2D map where a route draws itself and markers pop in, and a map whose camera pans or zooms. It covers which map service needs an account or a key and which is free, the rules that keep a WebGL map from flickering in a render, and how to check one before delivery. Read it when a scene needs a map. A camera flying low over mountains or through a city is in maps-3d.md. Written in our own words from what Remotion's `remotion-maps` skill (4.0.547) teaches.

## Contents
- Pick a technique
- Rules for every live map
- MapLibre: the free default
- Mapbox
- Routes, markers and labels
- Moving the camera without shimmer
- MapTiler: drawing on real borders, rivers and roads
- Static map
- Rendering and checking a map scene

## Pick a technique

Pick one technique per shot. Each one stands alone; mixing two in one scene only adds load time.

| Technique | Account or key | Cost here | Good for |
| --- | --- | --- | --- |
| Static map | none (the image needs a free source and a credit) | free | A place for context: a still or slowly pushed image with pins and labels on top |
| MapLibre (`maplibre-gl`) | none | free | Animated routes, markers, labels and gentle camera moves on a 2D map |
| Mapbox (`mapbox-gl`) | a Mapbox account and its public access token | free tier, check the current terms | The same as MapLibre with nicer default styles, a round globe when zoomed far out, and 3D buildings |
| MapTiler (`@maptiler/sdk`) | a MapTiler Cloud account and its API key | free plan with limits, check whether it allows the use | Highlighting real features from the map data itself: country borders, rivers, roads |
| CesiumJS (maps-3d.md) | MapTiler key for terrain; a billing-enabled Google key for photoreal cities | landscape on the MapTiler free plan; cities need a Google Cloud billing account | Low "flight simulator" passes over mountains, gorges, rivers and city blocks |

For the author (Erbil, no paid map accounts): start with MapLibre or a static map. Mapbox and MapTiler need a sign-up and a key in `.env`, which is fine for a personal video once the person agrees; Google's photoreal city tiles need a card on a Google Cloud account, so offer them only when the person asks. Kurdistan's internal borders are disputed and differ between map providers: say which provider's border is on screen and record its source and date in `brief.md`.

Two other routes to a map without writing map code:
- **A flight recorded to a clip:** HyperFrames' `bake-basemap.mjs` records MapLibre over Esri satellite or Carto tiles to an MP4 plus screen coordinates for pins (hyperframes.md, "File tools"). The clip then plays in a Remotion scene with live labels on top.
- **A still made with MapLibre:** build the MapLibre scene once, render one frame with `npx remotion still`, and use that PNG as a static map.

## Rules for every live map

These hold for MapLibre, Mapbox and MapTiler alike. They exist because a map library is built for people dragging it around, while Remotion takes a screenshot of each frame in a headless browser, often out of order and in several tabs.

- **The frame drives everything.** Compute every value from `useCurrentFrame()`. No CSS transitions, no `flyTo()` or `easeTo()`, no timers.
- **Switch off the map's own behaviour:** `interactive: false` and `fadeDuration: 0` (labels and tiles otherwise fade in over real time).
- **Keep the pixels readable:** pass `canvasContextAttributes: { preserveDrawingBuffer: true }` to the map constructor, or the screenshot can come back blank.
- **Hold the render until the map is ready.** Create a `delayRender()` handle when the component mounts. In the map's `load` event add every source and layer, put the camera on its frame-0 position, then wait for `idle` before calling `continueRender()`.
- **Hold every frame too.** On each new frame, take a fresh handle, apply the frame's data and camera, wait for `idle`, then continue. Call `triggerRepaint()` after registering the `idle` listener, so a frame where nothing changed still fires `idle`.
- **Create the map once.** Guard the creation with a ref or a state initializer and keep the instance in state. Don't return a cleanup that calls `map.remove()`: it fights Remotion's render lifecycle.
- **Draw with map layers.** Lines, dots and labels go in GeoJSON sources and `line`, `circle` and `symbol` layers, not DOM `Marker` elements, unless the person wants HTML markers.
- **Use Turf for geography** (`@turf/turf`): distances, great-circle arcs, points along a line, slices of a line. Don't write that math by hand.
- **Coordinates are `[longitude, latitude]`** in Turf, GeoJSON, MapLibre and Mapbox. Erbil Citadel is `[44.0092, 36.1912]`, not `[36.19, 44.00]`.
- **No `@types/maplibre-gl` or `@types/mapbox-gl`.** Both libraries ship their own types.
- **Import the library's CSS once:** `import "maplibre-gl/dist/maplibre-gl.css";` (or `mapbox-gl/dist/mapbox-gl.css`).
- **Credit the map.** Keep the provider's attribution visible, or add the credit as your own small text (for example "© OpenStreetMap contributors"), and read the provider's current terms before rendering.
- **Render with ANGLE and one tab:** `--gl=angle --concurrency=1` (see "Rendering and checking").
- **Check the rendered file, not the Studio.** Inspect a rendered MP4 at every format the video ships in.

## MapLibre: the free default

```bash
npm i maplibre-gl @turf/turf
```

Two MapLibre facts specific to Remotion:
- **The worker has to come from a URL.** Remotion's bundler doesn't serve MapLibre's web worker, so point MapLibre at the matching worker build on unpkg before creating the map (code below). The render therefore needs internet access.
- **Pick a style URL.** `https://demotiles.maplibre.org/style.json` is MapLibre's own demo style: free and keyless, but only country shapes, no streets. For real streets without a key, OpenFreeMap serves free styles such as `https://tiles.openfreemap.org/styles/liberty` (not tested here). Any style JSON URL works.

A scene where the route from Erbil to Slemani draws itself and both cities get a dot and a name. The camera stays still, framed on both cities, which is the stable choice.

```tsx
import * as turf from "@turf/turf";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";

const ERBIL: [number, number] = [44.0092, 36.1912];
const SLEMANI: [number, number] = [45.4329, 35.5613];
const ROUTE = turf.lineString([ERBIL, SLEMANI]);
const ROUTE_KM = turf.length(ROUTE);
const CITIES = turf.featureCollection([
  turf.point(ERBIL, { name: "Erbil" }),
  turf.point(SLEMANI, { name: "Slemani" }),
]);

// Turf can throw on a zero-length slice, so the drawn part never goes below 1 m.
const drawnPart = (share: number) =>
  turf.lineSliceAlong(ROUTE, 0, Math.max(0.001, ROUTE_KM * Math.min(1, Math.max(0, share))));

const loadWorkerFromUnpkg = () => {
  const code = `import "https://unpkg.com/maplibre-gl@${maplibregl.getVersion()}/dist/maplibre-gl-worker.mjs";`;
  maplibregl.setWorkerUrl(URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
};

export const RouteMap: React.FC = () => {
  const box = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { delayRender, continueRender } = useDelayRender();
  const [boot] = useState(() => delayRender("map: first load"));
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!box.current || map) return;
    loadWorkerFromUnpkg();
    const m = new maplibregl.Map({
      container: box.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: ERBIL,
      zoom: 7,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    m.on("load", () => {
      m.addSource("route", { type: "geojson", data: drawnPart(0) });
      m.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#C8102E", "line-width": 8 },
      });
      m.addSource("cities", { type: "geojson", data: CITIES });
      m.addLayer({
        id: "city-dots",
        type: "circle",
        source: "cities",
        paint: { "circle-radius": 14, "circle-color": "#C8102E", "circle-stroke-width": 5, "circle-stroke-color": "#FFFFFF" },
      });
      m.addLayer({
        id: "city-names",
        type: "symbol",
        source: "cities",
        layout: { "text-field": ["get", "name"], "text-size": 40, "text-anchor": "top", "text-offset": [0, 1], "text-allow-overlap": true },
        paint: { "text-color": "#111111", "text-halo-color": "#FFFFFF", "text-halo-width": 4 },
      });
      const camera = m.cameraForBounds([ERBIL, SLEMANI], { padding: 200 });
      if (camera) m.jumpTo(camera);
      m.once("idle", () => {
        setMap(m);
        continueRender(boot);
      });
    });
  }, [boot, continueRender, map]);

  useEffect(() => {
    if (!map) return;
    const hold = delayRender(`map: frame ${frame}`);
    const share = interpolate(frame, [0.5 * fps, 3.5 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    });
    (map.getSource("route") as maplibregl.GeoJSONSource).setData(drawnPart(share));
    map.once("idle", () => continueRender(hold));
    map.triggerRepaint();
  }, [continueRender, delayRender, fps, frame, map]);

  return (
    <AbsoluteFill>
      <div ref={box} style={{ position: "absolute", width, height }} />
    </AbsoluteFill>
  );
};
```

Text from a style URL renders in that style's fonts, which rarely have the Sorani or Arabic letters. Put Kurdish and Arabic place names on top as normal Remotion text instead (production.md lists fonts that carry them), positioned with `map.project(lngLat)`.

## Mapbox

```bash
npm i mapbox-gl @turf/turf
```

Everything above holds, with these differences:
- `import mapboxgl from "mapbox-gl";` (a default import) and `import "mapbox-gl/dist/mapbox-gl.css";`. No worker URL step.
- Pass `accessToken` in the map options. Keep the token out of the code: put `REMOTION_MAPBOX_TOKEN=pk....` in the project's `.env` and read `process.env.REMOTION_MAPBOX_TOKEN`; the Remotion CLI hands variables that start with `REMOTION_` to the composition (remotion.dev/docs/env-variables). It is a public token, but still don't commit `.env`.
- Default style: `mapbox://styles/mapbox/standard` (any Mapbox style URL works). Standard brings the globe at low zoom and 3D landmark buildings.
- The frame-0 camera can be set with `jumpTo()` or `setFreeCameraOptions()`.

## Routes, markers and labels

- **A flight line** between distant cities: `turf.greatCircle(from, to, { npoints: 100 })`. A route that crosses the 180° meridian comes back as a `MultiLineString`; keep its longest part (or draw both) before slicing.
- **A line that looks straight on the map** (a road trip, two nearby cities): a plain `turf.lineString([a, b])`. Over 150 km the two barely differ.
- **The drawing effect:** measure the line with `turf.length()`, then each frame set the source's data to `turf.lineSliceAlong(line, 0, km)`. Never slice to 0 km.
- **A moving dot or camera target:** `turf.along(line, km).geometry.coordinates`.
- **Separate the clocks.** Give the line its own progress (when it draws) and the camera its own (when it leads, lags or zooms out and back in). One `interpolate()` each, both from the frame.
- **Sizes for video, not for a web page.** At 1080 px wide, dots about 12 to 16 px radius with a 4 to 5 px white ring, labels 28 px and up with a 3 to 4 px halo. Scale with the composition width.
- **Keep it plain.** No glow and no extra decorative points unless the design asks for them.

## Moving the camera without shimmer

**The problem.** Calling `map.jumpTo()` on every frame makes the map redraw itself at a new position each frame, and in headless capture the satellite imagery, hillshade and fine lines are resampled a little differently each time. The result is a shimmer or jitter across the whole map. Retrying tiles, changing the easing or hiding labels doesn't fix it, because it is the renderer, not the data.

**The fix: a fixed map plate.** Render the map once, bigger than the frame and at the closest zoom the shot reaches, and never move its camera again. Each frame moves and scales the whole plate with a CSS transform. Sources and paint properties still update per frame; only the map camera is frozen.

```tsx
// The plate: a map container larger than the composition, its camera fixed.
const PLATE = { w: 3840, h: 2160 }; // for a 1920x1080 composition
const BASE_ZOOM = 10; // the closest zoom any camera position in the shot needs
// In the load handler: m.jumpTo({ center: middleOfTheRoute, zoom: BASE_ZOOM, bearing: 0, pitch: 0 });

// Each frame: where the virtual camera is, and at what zoom (zoom <= BASE_ZOOM).
const plateStyle = (m: maplibregl.Map, center: [number, number], zoom: number, frameW: number, frameH: number) => {
  const s = 2 ** (zoom - BASE_ZOOM); // 1 at BASE_ZOOM, smaller when zoomed out
  const p = m.project(center); // the centre in plate pixels
  const dx = frameW / 2 - p.x * s;
  const dy = frameH / 2 - p.y * s;
  return { transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: "0 0" };
};
// <div ref={box} style={{ position: "absolute", width: PLATE.w, height: PLATE.h, ...plateStyle(...) }} />
```

Anything drawn in HTML on top of the map (a Kurdish label, a photo pin) goes through the same move: a point the map projects to `q` lands at `q.x * s + dx`, `q.y * s + dy`.

Sizing the plate so it stays sharp:
- **Render at the closest zoom of the whole shot,** including any holds in the middle. The CSS scale must never go above 1, or the plate is being enlarged and goes soft.
- **Centre the plate on the middle of the area the route covers,** not on the last camera position. That keeps the oversize small.
- **Stay at or under 4096 px on each side.** Chromium's WebGL buffer is often capped near 4096, and past it the canvas is silently scaled down and looks pixelated when zoomed. So don't just triple the frame size (1920 x 3 = 5760 is too big). A 3840x2160 plate is safe for 1920x1080; about 2700x3840 suits a 1080x1920 reel that needs room to pan sideways.
- **Doesn't fit?** Split the move into two plates joined by a deliberate cut or transition rather than one huge canvas.
- **Read the symptom:** a shimmer that repeats means a live camera is still moving; tiles that are evenly soft during a push mean the plate is too small, being downscaled, or scaled above 1.

Keep pitch and bearing fixed on a plate. A camera that really tilts or turns, or flies over terrain, belongs in Cesium (maps-3d.md).

**A live camera, only after testing.** If a shot really needs the map camera to move (a 2D zoom out and back in over a vector style with no imagery), drive it per frame and render a short MP4 first to look for shimmer:
- `map.jumpTo({ center, zoom, bearing, pitch })` with each value from `interpolate()`.
- MapLibre also has `map.calculateCameraOptionsFromTo(cameraLngLat, altitudeMeters, targetLngLat)`, which returns options for `jumpTo()`. With it, keep two lines: the one the camera travels along and the one it looks at, read both with `turf.along()` at the same progress, and animate the altitude in metres (for example 180 000 m near a city, 2 200 000 m in the middle of a long flight). This gives zoom out, travel, zoom in without hand-made camera math.

## MapTiler: drawing on real borders, rivers and roads

MapTiler's strength is its vector data (MapTiler Planet): borders, rivers, roads and land cover are real layers you can filter and colour, so a story can light up the Tigris or a border without making its own GeoJSON.

Needs a MapTiler Cloud account and its API key (cloud.maptiler.com/account/keys/). Keep the key in `.env` as `REMOTION_MAPTILER_KEY`.

```bash
npm i @maptiler/sdk @turf/turf
```

```ts
import * as maptilersdk from "@maptiler/sdk";
maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY!;
const m = new maptilersdk.Map({
  container, style: maptilersdk.MapStyle.BASIC, // or a satellite style
  center, zoom, interactive: false, fadeDuration: 0,
  canvasContextAttributes: { preserveDrawingBuffer: true },
});
```

The rules for every live map apply, plus:
- **Animate by changing data and paint,** not geometry: `setData()` on GeoJSON sources, `setPaintProperty()` for opacity, colour, width, blur, fill opacity, circle radius or symbol opacity, each computed from the frame.
- **Camera:** a still shot uses `jumpTo` once; any pan or zoom uses the fixed plate above. Hillshade and satellite shimmer here too.
- **Labels on top** are positioned HTML elements; Remotion's `<Interactive.Div>` makes them movable in the Studio (interactivity.md).
- **Never pass `filter: undefined`.** Build optional layer fields only when present (`...(filter ? { filter } : {})`). An undefined filter can hide a layer while its separate halo or border layers still draw, leaving missing country fills and markers with dark rings and no centre.
- **Declutter on `load`:** remove the `symbol` layers (the style's own place names) and the inner province borders (layers whose id matches `/other border/i`); keep country and disputed borders. Remotion's skill hides the MapTiler logo with CSS; check MapTiler's terms first, since the free plan may require it.

**Which data for each element.** Decide per element, and mix freely:
- **Use a MapTiler vector layer** when the thing already exists in MapTiler Planet (common layers: `waterway`, `water`, `transportation`, `boundary`, `landcover`, `poi`), an attribute filter picks exactly it, and their geometry is good enough for what the video claims. Read the current MapTiler Planet schema for layer and field names; they change between schema versions.
- **Use your own GeoJSON** when the thing is missing, planned, historical, disputed, corrected or private, or when it must draw from one end to the other. Vector tiles cut features at tile edges, so a river has no reliable start-to-end order: to draw it, extract the whole feature once, check it, put its points in order and save it as GeoJSON.
- **Mix:** provider roads and rivers as context, your own layer for the claim (a planned road, a dam site, a contested line), styled so the two read as different weights of evidence.
- A provider feature lining up with the basemap doesn't prove it is right. Check it against the source the story relies on, and note the source and date of every custom layer.

A small helper for one filtered vector element (our version):

```ts
type VectorElement = {
  id: string;
  sourceLayer: string; // e.g. "waterway"
  type: "fill" | "line" | "circle" | "symbol";
  filter?: unknown[]; // e.g. ["==", ["get", "class"], "river"]
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

export const addVectorElement = (m: maptilersdk.Map, e: VectorElement, key: string) => {
  if (!m.getSource("planet")) {
    m.addSource("planet", { type: "vector", url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${key}` });
  }
  if (m.getLayer(e.id)) return;
  m.addLayer({
    id: e.id, type: e.type, source: "planet", "source-layer": e.sourceLayer, paint: e.paint,
    ...(e.filter ? { filter: e.filter } : {}),
    ...(e.layout ? { layout: e.layout } : {}),
  } as Parameters<typeof m.addLayer>[0]);
};

// Per frame: for (const [k, v] of Object.entries({ "line-opacity": reveal })) m.setPaintProperty(id, k, v);
```

Feature-state highlights work only where the source has stable feature ids that stay the same across tiles.

## Static map

The smallest and steadiest option when the map only says where something is.

1. Get an image at the composition's aspect ratio and at least its pixel size (bigger if the scene pushes in).
2. Put it in `public/` (for example `public/photos/erbil-map.png`).
3. Draw it with Remotion's `<CanvasImage>` and `staticFile()`.
4. Add pins and labels as ordinary Remotion elements; animate them with the frame as usual (motion.md).

```tsx
import { AbsoluteFill, CanvasImage, staticFile } from "remotion";

export const LocatorMap: React.FC = () => (
  <AbsoluteFill>
    <CanvasImage src={staticFile("photos/erbil-map.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>
);
```

Free sources: a still rendered from the MapLibre scene above (credit "© OpenStreetMap contributors" and the style's maker), or a frame from a HyperFrames `bake-basemap` flight (credit the imagery as hyperframes.md says). Screenshots of Google Maps or Apple Maps are not free to publish.

## Rendering and checking a map scene

- **Flags:** WebGL maps need `--gl=angle` and one tab at a time: `node scripts/render.mjs -- --gl=angle --concurrency=1` (render.mjs passes everything after `--` to `remotion render`). To make the Studio and every CLI render use ANGLE without the flag, add `Config.setChromiumOpenGlRenderer("angle");` to `remotion.config.ts` (look-effects.md, "Turning on WebGL for renders").
- **Stills for a check:** `stills.mjs` renders three frames at once without ANGLE, so for map scenes use `npx remotion still <CompositionId> out/stills/map.png --frame=<n> --gl=angle`.
- **Look for:** shimmer in the imagery or terrain while the camera moves (switch to a fixed plate; don't pass it off as a preview glitch), soft tiles, missing layers, the credit line, and that labels and pins sit inside the safe area at every format.
- **Network:** live maps load tiles (and MapLibre its worker) during the render. A render without internet gives grey or blank frames.
