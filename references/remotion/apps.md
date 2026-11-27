# Remotion inside an app

What to do when the video has to live inside software rather than come out as one MP4: a website that plays a preview the visitor can change, or an app that renders a personalised video from a form. It covers the `<Player>` component, rendering from code with Node, the cloud options (Lambda, Vercel and others), the starter templates and the licence key. Read it when someone asks for a video generator, a preview on their site, or many renders from data. For one video made by this skill, `scripts/render.mjs` is the tool and none of this is needed. Written in our own words from Remotion's `remotion-saas` skill (4.0.547).

## Contents
- Starting point
- The Player
- Rendering from code
- Rendering in the cloud
- Before it goes live

## Starting point

Remotion works with any React framework, and an app can be anything from one form wired to a render up to a full video editor. Remotion keeps starter templates; clone one or read it for the pattern:

| Template | Renders on |
| --- | --- |
| Next.js: github.com/remotion-dev/template-next-app-dir-tailwind | AWS Lambda by default |
| Vercel Sandbox: github.com/remotion-dev/template-vercel | Vercel |
| React Router 7: github.com/remotion-dev/template-react-router | AWS Lambda by default |
| Express render server: github.com/remotion-dev/template-render-server (`packages/template-render-server` in the monorepo) | Node.js, with render, progress and cancel endpoints |

Adding Remotion to an app that already exists: https://www.remotion.dev/docs/brownfield-installation.md. Other frameworks have their own pages: https://www.remotion.dev/docs/vue.md, https://www.remotion.dev/docs/angular.md, https://www.remotion.dev/docs/svelte.md.

## The Player

`@remotion/player` plays a composition inside a React page, live, with controls, and without rendering a file. Install it with `npx remotion add @remotion/player`, so its version matches the project's.

```tsx
import { Player } from "@remotion/player";
import { Offer } from "./video/Offer";

export const OfferPreview: React.FC<{ price: string }> = ({ price }) => (
  <Player
    component={Offer}
    inputProps={{ price }}
    durationInFrames={300}
    fps={30}
    compositionWidth={1080}
    compositionHeight={1920}
    style={{ width: 360 }}
    controls
  />
);
```

- The Player takes the composition's size, length and fps as its own props; it doesn't read `<Composition>`. When those depend on the data (a `calculateMetadata()` in the root), run the same logic for the Player or keep the values in sync by hand: https://www.remotion.dev/docs/dynamic-metadata.md#with-the-player.
- All props: https://www.remotion.dev/docs/player/player.md.
- When the app also needs a file to download, pair the Player with one of the render paths below.

## Rendering from code

For a few one-off renders, the CLI or the Studio is simpler. Code pays off when one composition renders many times with different data. Compare the server-side options first: https://www.remotion.dev/docs/compare-ssr.md.

**Node APIs** run on a normal long-running server that can start a headless browser. Bundle the project once, then render as often as needed with different `inputProps`:

```ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const serveUrl = await bundle({ entryPoint: "./src/index.ts" }); // once, at startup

export const renderOffer = async (price: string, file: string) => {
  const inputProps = { price };
  const composition = await selectComposition({ serveUrl, id: "Offer", inputProps });
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    outputLocation: file,
    licenseKey: process.env.REMOTION_LICENSE_KEY ?? null,
    isProduction: true,
    onProgress: ({ progress }) => console.log(`${Math.round(progress * 100)}%`),
  });
};
```

- **`licenseKey`:** a company that needs a Remotion licence passes its key to every render. With no key, pass `null`; an empty string is not a valid key. A person or team that qualifies for the free licence passes `"free-license"`. Mark test renders with `isProduction: false`. Details: https://www.remotion.dev/docs/telemetry.md; who needs a licence: setup-and-upkeep.md, "The licence".
- Pass `inputProps` to both `selectComposition()` and `renderMedia()`.
- Reading: https://www.remotion.dev/docs/ssr.md (overview), https://www.remotion.dev/docs/renderer.md (the package), https://www.remotion.dev/docs/ssr-node.md (Node).
- This skill's `scripts/stills.mjs` uses the same `@remotion/renderer` APIs and is a working local example.

## Rendering in the cloud

All of these cost money or need a cloud account; this PC has neither set up. Raise them only when the person is building an app that needs them.

**AWS Lambda** is the fastest and most scalable option (https://www.remotion.dev/docs/lambda.md, API at https://www.remotion.dev/docs/lambda/api.md). If recommending it, offer to walk the person through setup with https://www.remotion.dev/docs/lambda/setup.md open as the checklist for the console clicks:

1. An AWS account, a chosen region, and a Remotion project or template.
2. `npx remotion add @remotion/lambda`.
3. Create the Lambda role policy, the Lambda role, an IAM user, its access key and the user policy, using the policy commands Remotion generates.
4. Put the credentials in `.env` as `REMOTION_AWS_ACCESS_KEY_ID` and `REMOTION_AWS_SECRET_ACCESS_KEY`. Never ask the person to paste secrets into the chat.
5. Optionally check the permissions first: `npx remotion lambda policies validate`.
6. Deploy the function. A function belongs to one Remotion version: redeploy after every Remotion upgrade.
7. Deploy the site under a stable name. Redeploy it whenever the video's source code changes.
8. Check quotas: `npx remotion lambda quotas`. A new AWS account may need a higher concurrency limit.
9. Run one render, then connect the render and progress endpoints in the template or through the Node APIs.

**Vercel:** the natural choice when the app is deployed on Vercel (https://www.remotion.dev/docs/vercel-sandbox.md).

**Cloudflare Containers:** when asked for (https://www.remotion.dev/docs/cloudflare-containers.md).

**Only when the person asks:** GitHub Actions (https://www.remotion.dev/docs/ssr.md#render-using-github-actions) and Azure Container Apps (https://www.remotion.dev/docs/azure-container-apps.md).

**In the browser:** client-side rendering exists as well; compare it with the server options on the compare-ssr page above before choosing.

## Before it goes live

Remind the person to handle: rate limits, sign-in, cost limits on cloud renders, who can see the output files, deleting old renders, and showing progress and errors to the user.
