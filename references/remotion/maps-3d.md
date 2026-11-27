# 3D map flights with CesiumJS

How to fly a camera low over real terrain (mountains, gorges, a river valley) or through a city of textured 3D buildings inside a Remotion project, with CesiumJS. It covers the two data sources and what each needs (a MapTiler key for terrain, a billing-enabled Google key for cities), the four settings without which the frames come out black or blank, the camera math that makes the flight feel like a helicopter rather than a jerky drone, tested numbers, and a troubleshooting table. Read it when a shot needs a real 3D flight. For 2D maps, routes and pins, read maps.md. Written in our own words from what Remotion's `remotion-maps` skill (4.0.547) teaches; its Cesium path was tested by Remotion through Remotion renders, not on this PC.

## Contents
- Two modes and what they need
- Why it must render through Remotion
- A flight component
- The camera path
- Numbers that worked
- Preparing a path from a river or road
- Rendering
- Troubleshooting

## Two modes and what they need

| Mode | Data | Key | For |
| --- | --- | --- | --- |
| `landscape` | MapTiler `terrain-quantized-mesh-v2` (elevation) with `satellite-v2` imagery draped on it | a MapTiler Cloud API key (cloud.maptiler.com/account/keys/); the free plan has limits, check its terms for the use. No Cesium ion token needed. | Mountains, gorges, rivers, coasts, country roads |
| `city` | Google Photorealistic 3D Tiles: one textured 3D mesh of buildings and ground | a Google Map Tiles API key from a Google Cloud project with billing turned on; enable the Map Tiles API and restrict the key to it, with an application restriction that still lets a local headless render through (developers.google.com/maps/documentation/tile/get-api-key) | City streets, architecture, landmarks |

For the author (Erbil, no paid accounts): the landscape mode fits the free route, for example a pass along the Hamilton Road gorges or over Korek and Safin mountains. The city mode needs a card on Google Cloud; offer it only when the person asks, and first check in Google Earth's 3D view whether the city has photoreal 3D coverage at all, since it is uneven outside large Western cities. The free alternative for a city is a 2D map (maps.md) or HyperFrames' satellite flight (hyperframes.md, "File tools").

Google's tiles come with rules: the composition may be at most 30 seconds long, the credits stay on screen, and Remotion's own component prints "For promotional purposes only" in a corner. Read the current policy (developers.google.com/maps/documentation/tile/policies) before using them.

Don't build a city from extruded footprints (OSM, Overture or vector-tile buildings). They give boxes with rough heights, fine for a diagram, not for a flight that should look real.

## Why it must render through Remotion

In a plain headless Chromium (Playwright, a standalone HTML page) Cesium draws the stars and sky but no globe: the globe issues no draw commands, `globe.tilesLoaded` never turns true, and every frame is a black starfield, even with WebGL working and the terrain reachable. Driven by Remotion's frame loop in the same headless Chrome, it works, provided all four of these hold:

1. **`viewer.useDefaultRenderLoop = false`**: Cesium must not draw on its own clock.
2. **Call `viewer.render()`, never `scene.render()`.** `viewer.render()` runs the whole frame, including the step that streams tiles; `scene.render()` skips it, so tiles never arrive and the globe never appears. This is the line that matters most.
3. **`contextOptions: { webgl: { preserveDrawingBuffer: true } }`** on the viewer, or Remotion's screenshot is empty.
4. **Hold every frame with `delayRender(label, { timeoutInMilliseconds })`** set to 60 000 to 120 000 ms. Cold tiles take longer than Remotion's default timeout.

## A flight component

Our own minimal version. Cesium loads from its CDN at runtime (tested version 1.143); set `window.CESIUM_BASE_URL` before adding the script, so Cesium finds its workers and assets. Put the keys in `.env` as `REMOTION_MAPTILER_KEY` and `REMOTION_GOOGLE_TILES_KEY`.

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

type LngLat = [number, number];
type FlightProps = {
  mode: "landscape" | "city";
  route: LngLat[];   // a few deliberate control points, [lng, lat]
  passes?: number;   // Chaikin smoothing passes: 3 default, 4 softer, 2 tighter
  altFrom: number;   // metres above sea level, not above the ground
  altTo: number;
  aheadKm: number;   // how far ahead the camera aims
  travelKm: number;  // how far it flies in the whole composition
  tilt?: number;     // degrees from straight down; 90 is level with the horizon
  maxError?: number; // city mode: maximumScreenSpaceError
};

const BASE = "https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/";
const BANK_LIMIT = 0.13; // radians, about 7.5 degrees
const BANK_GAIN = 0.6;

const loadCesium = (): Promise<any> => {
  const w = window as any;
  if (w.Cesium) return Promise.resolve(w.Cesium);
  w.CESIUM_BASE_URL = BASE;
  return new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = `${BASE}Cesium.js`;
    s.onload = () => ok(w.Cesium);
    s.onerror = () => fail(new Error("CesiumJS did not load"));
    document.head.append(s);
  });
};

// Chaikin corner cutting: each pass swaps every segment for its 1/4 and 3/4 points.
const smooth = (pts: LngLat[], passes: number): LngLat[] => {
  let out = pts;
  for (let n = 0; n < passes; n++) {
    const next: LngLat[] = [out[0]];
    for (let i = 0; i + 1 < out.length; i++) {
      const [a, b] = [out[i], out[i + 1]];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
};

const rad = Math.PI / 180;
const km = (a: LngLat, b: LngLat) => {
  const h = Math.sin(((b[1] - a[1]) * rad) / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(((b[0] - a[0]) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const bearing = (a: LngLat, b: LngLat) => {
  const dl = (b[0] - a[0]) * rad;
  return Math.atan2(
    Math.sin(dl) * Math.cos(b[1] * rad),
    Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos(dl),
  );
};

// Walk the curve by distance, so the ground speed stays even.
const walker = (pts: LngLat[]) => {
  const dist = [0];
  for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + km(pts[i - 1], pts[i]));
  const total = dist[dist.length - 1];
  const at = (d: number): LngLat => {
    const x = Math.min(total, Math.max(0, d));
    const i = Math.max(1, dist.findIndex((v) => v >= x));
    const t = (x - dist[i - 1]) / (dist[i] - dist[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  };
  return { at, total };
};

export const Flight: React.FC<FlightProps> = ({ mode, route, passes = 3, altFrom, altTo, aheadKm, travelKm, tilt = 76, maxError = 6 }) => {
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<any>(null);
  const tiles = useRef<any>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const [ready, setReady] = useState(false);
  const [boot] = useState(() => delayRender("cesium: start", { timeoutInMilliseconds: 120000 }));
  const path = useMemo(() => walker(smooth(route, passes)), [route, passes]);

  const place = (C: any, v: any, progress: number) => {
    const d = Math.min(travelKm, Math.max(0, path.total - 2 * aheadKm)) * progress;
    const cam = path.at(d);
    const aim = path.at(d + aheadKm);       // a real point ahead on the path
    const probe = path.at(d + 2 * aheadKm); // further on, to measure the turn
    const heading = bearing(cam, aim);
    let turn = bearing(aim, probe) - heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn)); // wrap to -PI..PI
    v.camera.setView({
      destination: C.Cartesian3.fromDegrees(cam[0], cam[1], altFrom + (altTo - altFrom) * progress),
      orientation: {
        heading,
        pitch: C.Math.toRadians(-(90 - tilt)),
        roll: Math.max(-BANK_LIMIT, Math.min(BANK_LIMIT, turn * BANK_GAIN)),
      },
    });
  };

  // Draw until the tiles report loaded for 8 draws in a row (at most 600 draws).
  const settle = async (v: any) => {
    const loaded = () => (mode === "landscape" ? v.scene.globe.tilesLoaded : Boolean(tiles.current?.tilesLoaded));
    for (let n = 0, calm = 0; n < 600 && calm <= 8; n++) {
      v.render();
      calm = loaded() ? calm + 1 : 0;
      await new Promise((r) => setTimeout(r, 8));
    }
    v.render();
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (mode === "city" && durationInFrames / fps > 30) throw new Error("Google 3D Tiles: keep the video at 30 s or less");
      const C = await loadCesium();
      const v = new C.Viewer(box.current, {
        baseLayer: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
        navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
        infoBox: false, selectionIndicator: false,
        contextOptions: { webgl: { preserveDrawingBuffer: true } },
      });
      if (mode === "landscape") {
        const key = process.env.REMOTION_MAPTILER_KEY;
        v.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({
          url: `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${key}`, maximumLevel: 20,
        }));
        v.terrainProvider = await C.CesiumTerrainProvider.fromUrl(
          `https://api.maptiler.com/tiles/terrain-quantized-mesh-v2/?key=${key}`, { requestVertexNormals: true });
        v.creditDisplay.addStaticCredit(new C.Credit("© MapTiler © OpenStreetMap contributors", true));
        v.scene.verticalExaggeration = 1.1;
      } else {
        v.scene.globe.show = false; // Google's mesh is the ground: no globe, no MapTiler under it
        tiles.current = await C.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${process.env.REMOTION_GOOGLE_TILES_KEY}`,
          { showCreditsOnScreen: true, maximumScreenSpaceError: maxError });
        v.scene.primitives.add(tiles.current);
      }
      v.useDefaultRenderLoop = false;
      v.scene.skyAtmosphere.show = true;
      v.scene.fog.enabled = true;
      v.scene.globe.enableLighting = false;
      viewer.current = v;
      place(C, v, 0);
      await settle(v);
      setReady(true);
      continueRender(boot);
    })().catch((e) => cancelRender(e));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const hold = delayRender(`cesium: frame ${frame}`, { timeoutInMilliseconds: 60000 });
    place((window as any).Cesium, viewer.current, durationInFrames > 1 ? frame / (durationInFrames - 1) : 0);
    settle(viewer.current).then(() => continueRender(hold));
  }, [ready, frame]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div ref={box} style={{ position: "absolute", width, height }} />
    </AbsoluteFill>
  );
};
```

Use it as a scene, with Kurdish or English titles as normal Remotion layers on top:

```tsx
<Flight mode="landscape" route={gorgeRoute} altFrom={4600} altTo={4300} aheadKm={1.5} travelKm={13} />
<Flight mode="city" route={streetRoute} altFrom={700} altTo={500} aheadKm={0.7} travelKm={4.5} tilt={72} maxError={6} />
```

Key settings in it:
- The viewer starts with `baseLayer: false` and all widgets off. Never hide the credit display.
- Landscape: imagery added with `UrlTemplateImageryProvider`, terrain with `CesiumTerrainProvider.fromUrl(..., { requestVertexNormals: true })`.
- City: `Cesium3DTileset.fromUrl(...)` with `showCreditsOnScreen: true`. A lower `maximumScreenSpaceError` loads finer detail at a real cost in downloads and render time: about `4` for a hero landmark, `6` to `8` for wider city shots.
- Landscapes count as settled on `globe.tilesLoaded`, cities on the tileset's `tilesLoaded`.
- Keep `skyAtmosphere.show = true`; without it a tilted camera shows a black void above the horizon.

## The camera path

What makes a flight feel smooth, in order of importance:

1. **Curves, not corners.** A path of straight legs makes the camera fly straight, snap to a new heading, fly straight. Chaikin corner cutting, three passes by default, rounds every corner into a curve. Four passes is softer; two follows a narrow corridor more tightly. Give it few, deliberate control points; smoothing can't save a zig-zag route that keeps crossing the subject.
2. **Even ground speed.** Move by distance along the curve (precompute the running distance once), never by point index: unevenly spaced points cause speed bumps.
3. **Aim at a real point ahead.** The heading points at the spot `aheadKm` further along the path. A far aim averages out small wiggles and leans into bends early. Aiming along the local direction of the line instead spins the camera at every kink.
4. **Bank into turns.** Measure the turn as the change in bearing between the aim point and a point twice as far ahead, multiply by a gain and clamp it: the camera leans gently into a bend like a helicopter, and because the path is smooth the lean eases in and out.
5. **Enough path.** The path must be at least `travelKm + 2 × aheadKm` long, or the aim and the turn probe hit the end and the last seconds freeze.

Cesium conventions differ from MapLibre's: heading is in radians, 0 is north and grows clockwise; pitch 0 is the horizon and negative looks down (MapLibre counts from straight down). With a MapLibre-style tilt measured from straight down (90 = level), Cesium's pitch is `-(90 - tilt)` degrees: 76 becomes -14. A positive roll banks right; check the sign by eye.

Altitudes are metres above sea level, fixed, not above the ground. In a gorge that lets the camera fly between the walls rather than over them; set them from the real heights of the place (the city mode flies far lower than the landscape mode).

## Numbers that worked

A tested landscape flight through a river gorge (Remotion's sample, the Yarlung Tsangpo):

| Setting | Value | What it does |
| --- | --- | --- |
| `travelKm` | 13 | Distance flown. Speed is `travelKm` divided by the length in seconds. |
| Length | 24 s (720 frames at 30 fps) | About 0.54 km/s, a calm glide. 8 s for the same distance felt far too rushed. |
| `altFrom` → `altTo` | 4600 → 4300 m | Inside the gorge walls. |
| `aheadKm` | 1.5 | Higher is smoother, lower reacts faster. |
| `tilt` | 76° | Looking ahead down the valley (Cesium pitch -14°). |
| Bank limit / gain | 0.13 rad (about 7.5°) / 0.6 | The lean into turns. |
| `verticalExaggeration` | 1.1 | A touch more drama in the terrain. |
| Damping (path prep) | 0.45 | How much the path weaves: higher follows the river more, lower is straighter. |

The tested city flight: 18 s, `altFrom` 700, `altTo` 500, `aheadKm` 0.7, `travelKm` 4.5, `tilt` 72, `verticalExaggeration` 1, `maximumScreenSpaceError` 6.

A slow camera also renders faster: at 0.54 km/s it moves about 18 m a frame, tiles stay cached, each settle returns almost at once, and the 720 frames rendered in one pass.

## Preparing a path from a river or road

For a landscape flight that follows a real river or valley, build the path from its centre line:

1. **Get the line from OpenStreetMap** through the Overpass API (points about 0.3 km apart). Natural Earth is too coarse for a gorge. `overpass-api.de` is often busy; `overpass.kumi.systems` is a mirror. Save it as GeoJSON with one `LineString`.
2. **Clip** a window of about 30 km starting at the point where the shot opens.
3. **Resample** to even spacing (every 0.1 km), so curvature is spread evenly.
4. **Smooth with a moving average** (about ±2.8 km, two passes). Don't use Douglas-Peucker (`turf.simplify`): it keeps a few sharp points and gives straight-then-corner paths.
5. **Damp toward the straight line** from start to end by a fixed share (0.45 above: 0 is dead straight, 1 the full river).
6. **Check the heading changes** every kilometre: they should be small and change gradually (for example `3, 0, -1, -3, -4, 1, 7, 9, 5`). A big jump is a corner.

Our own script for steps 2 to 6, run with `node prep-path.mjs river.geojson src/geo/path.json 44.30,36.62`:

```js
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, output, start, windowKm = "30", damp = "0.45"] = process.argv;
const line = JSON.parse(readFileSync(input, "utf8")).features[0].geometry.coordinates;
const rad = Math.PI / 180;
const km = (a, b) => 12742 * Math.asin(Math.sqrt(Math.sin(((b[1] - a[1]) * rad) / 2) ** 2 +
  Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(((b[0] - a[0]) * rad) / 2) ** 2));
const bearing = (a, b) => Math.atan2(Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad),
  Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad)) / rad;

// 2. Clip from the vertex nearest the start point.
const s = start.split(",").map(Number);
let i0 = 0;
line.forEach((p, i) => { if (km(p, s) < km(line[i0], s)) i0 = i; });
const clip = [line[i0]];
for (let i = i0 + 1, run = 0; i < line.length && (run += km(line[i - 1], line[i])) <= Number(windowKm); i++) clip.push(line[i]);

// 3. Resample every 0.1 km.
const even = [clip[0]];
for (let i = 1, carry = 0; i < clip.length; i++) {
  const seg = km(clip[i - 1], clip[i]);
  for (let d = 0.1 - carry; d <= seg; d += 0.1) {
    const t = d / seg;
    even.push([clip[i - 1][0] + (clip[i][0] - clip[i - 1][0]) * t, clip[i - 1][1] + (clip[i][1] - clip[i - 1][1]) * t]);
  }
  carry = (carry + seg) % 0.1;
}

// 4. Moving average, +-28 samples (2.8 km), two passes.
let pts = even;
for (let pass = 0; pass < 2; pass++) {
  pts = pts.map((_, i) => {
    const near = pts.slice(Math.max(0, i - 28), i + 29);
    return [near.reduce((a, p) => a + p[0], 0) / near.length, near.reduce((a, p) => a + p[1], 0) / near.length];
  });
}

// 5. Damp toward the straight start-to-end line.
const [a, b] = [pts[0], pts[pts.length - 1]];
pts = pts.map((p, i) => {
  const t = i / (pts.length - 1);
  const c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return [c[0] + (p[0] - c[0]) * Number(damp), c[1] + (p[1] - c[1]) * Number(damp)];
});

// 6. Heading change every 1 km (10 samples), in degrees.
const deltas = [];
for (let i = 10; i + 10 < pts.length; i += 10) {
  const d = bearing(pts[i], pts[i + 10]) - bearing(pts[i - 10], pts[i]);
  deltas.push(Math.round(((d + 540) % 360) - 180));
}
console.log(`${pts.length} points, ${(pts.length / 10).toFixed(1)} km; heading changes: ${deltas.join(", ")}`);
writeFileSync(output, JSON.stringify(pts));
```

The prepared path still goes through the component's Chaikin smoothing. A short city route needs no preparation: write a handful of points by hand.

## Rendering

Render one still from the middle first, to check the framing and the bank, then the video:

```bash
npx remotion still src/index.ts Flight out/stills/flight.png --frame=360 --gl=angle --timeout=180000
node scripts/render.mjs Flight -- --gl=angle --concurrency=1 --timeout=180000
```

`--gl=angle` is required. Use `--concurrency=1`: the settle loop already loads tiles one frame at a time, and parallel tabs only fight over the network and the GPU. On this PC's integrated graphics, expect a slow render and try a short stretch first. The render needs internet the whole time (the Cesium CDN and the tiles).

## Troubleshooting

| What you see | Why | Fix |
| --- | --- | --- |
| Black frames with stars | The globe isn't drawing: rendered outside Remotion, or `scene.render()` used | Render through Remotion, call `viewer.render()`, set `useDefaultRenderLoop = false` |
| Blank or transparent frames | No `preserveDrawingBuffer` | `contextOptions: { webgl: { preserveDrawingBuffer: true } }` |
| "delayRender timed out" | Cold tiles take longer than the timeout | `timeoutInMilliseconds: 120000` on the handle and `--timeout=180000` on the command |
| A dark navy ball instead of a landscape | The imagery layer never attached | Start with `baseLayer: false`, then `viewer.imageryLayers.addImageryProvider(...)` |
| Empty void above the horizon when tilted | No atmosphere | `viewer.scene.skyAtmosphere.show = true` |
| 403 on MapTiler tiles | The key is locked to certain domains, and a headless render has none | Use a key without a domain restriction |
| 403 on Google's `root.json` | Map Tiles API off, no billing, wrong key, or a key restriction that blocks the local render | Enable the API and billing; restrict the key to that API but allow the render |
| Two grounds fighting in a city | The Cesium globe or MapTiler layers are still on | No MapTiler in city mode; `viewer.scene.globe.show = false` |
| City mesh stays coarse | Screen-space error too high, or the capture runs before the tiles refine | Lower `maximumScreenSpaceError`; settle on the tileset's `tilesLoaded` |
| WebGL missing or software rendering | No GL flag | Render with `--gl=angle` |
| Camera stares at the sky or straight down | Pitch sign or convention mixed up | Cesium pitch 0 is the horizon, negative is down; use `-(90 - tilt)` |
| The last seconds freeze or the aim stops moving | The path is too short for travel plus look-ahead | Make the path at least `travelKm + 2 × aheadKm`; clip a longer window |
| Straight legs joined by corners | The path was simplified with Douglas-Peucker | Resample and moving-average instead |
| The camera bumps left and right instead of swerving | Sparse points are still being followed as straight legs | Keep three smoothing passes, few deliberate points, movement by distance |
