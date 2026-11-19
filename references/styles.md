# Styles, formats and safe zones

The launch, explainer, music video, data, pull-request, talking-head, 3D, character and vertical notes add HeyGen's HyperFrames `types/`, `film.md` and `overlays.md` (Apache-2.0, adopted 2026-11-17), adapted to Remotion.

## Contents
- Picking a style
- The styles
- Formats and safe zones
- Choosing music by style

## Picking a style

Choose from the purpose, not from the tools. If the person doesn't say, recommend one and check it with them. A video can borrow from two styles (a promo with one funny beat, a tribute with a funny first half), but give it one dominant tone. Everything else in the workflow is the same for every style: brief, material, script, voice, build, music, verify.

| Style | Purpose | Tone | Typical length |
| --- | --- | --- | --- |
| Funny story (xoshaka) | A person's journey, a friend, a team, a milestone, told with jokes | Self-aware, meme-style, one sincere beat | 60 to 85 s |
| Sincere tribute | Birthday, farewell, thank-you, wedding, memorial-light | Warm, personal, quiet | 45 to 90 s |
| Product or service promo | Show what it does and make people contact or buy | Confident, clear, specific | 20 to 45 s feed, 45 to 90 s website |
| Explainer | Explain an idea, a process, or why something matters | Calm, curious | 60 to 150 s |
| Tutorial | Teach steps someone will follow | Clear, patient, exact | 90 to 180 s |
| Recap or portfolio | Year in review, project showcase, event highlights | Upbeat, proud, quick | 45 to 90 s |
| Announcement or teaser | Launch, date, reveal, event | High energy, short | 10 to 25 s |
| Music video | A video cut to a song, lyrics or a track's mood | The song's | The song, or a 30 to 60 s cut |
| Number or data story | One or a few real numbers that matter (a year in numbers, a result) | Clear, confident | 20 to 60 s |
| Pull request or changelog | What changed in a code project and why it matters | Plain, proud | 20 to 180 s, from the size of the change |
| Talking head with cards | Their own talking clip with designed cards, lower thirds, picture-in-picture | As the speaker | As the footage |
| 3D or simulation | An object, a product or a process that is best seen turning or working | Calm, wondrous | 15 to 60 s |
| Character or mascot short | A small story where a character does the work | Playful | 15 to 60 s |
| Captions or edit only | Their existing footage needs captions, trimming or reframing | Neutral | As the footage |

## The styles

### Funny story

The original style. Shape, comedy playbook and the gag toolbox are in story-and-comedy.md. In short: freeze-frame cold open, chapters (beginner, building, today), a gag on most scenes timed to words, a sincere beat near the end, a self-aware ending. Narrator at speed 1.05 to 1.1. Music playful and quirky, with silence on the one or two biggest gags. Meme sound effects at most three or four times.

### Sincere tribute

- **Shape:** an opening photo or clip of the person, then three to five memories each with one real photo and one specific line, then the one personal line in the giver's own words, then the wish. For a gift (birthday, farewell), ask whether the ending should credit Claude or carry the giver's own wish.
- **Tone:** warm and specific. A true detail ("always the first to arrive, last to leave") beats a general compliment. Light humour is fine when it is affectionate; roast nobody.
- **Visuals:** photos with slow zooms (Ken Burns), polaroid cards, handwritten-style text, minimal stickers. No meme zooms or record scratches.
- **Voice and sound:** a calm voice at speed 1.0, or the giver's own recording, which beats any synthetic voice for a tribute. Gentle piano or acoustic guitar, no meme effects, a long fade at the end.
- **Care:** don't mention health, money, family trouble or anything the person wouldn't want shared. Ask who is who. Don't invent shared memories.

### Product or service promo

- **Shape:** hook with the problem or the result in the first two seconds; the product in action using real screens in laptop and phone mockups; proof (a real number, a real client, a real before and after); a call to action with the exact handle, link, phone or address; the logo.
- **Tone:** confident and concrete. Show what it does in the shortest honest sentence. One idea per scene, one benefit per idea.
- **Visuals:** real screenshots and screen recordings, brand colours and fonts, the real logo (resolve official marks with `media-use`, never redraw), large readable text, number counters for results. Keep text on screen long enough to read twice.
- **Voice and sound:** a clear, confident voice, or captions only for silent autoplay feeds (many people watch muted, so captions are essential). Upbeat but not busy music; light whoosh and click effects on transitions.
- **Care:** every claim, price and number is true and comes from the person. Ask before showing prices, client names or unreleased screens. Don't promise what the product doesn't do. Say where the call to action goes (the link in bio, the phone number) and put it on screen for at least three seconds.
- **The beats of a launch** (about 35 s; scale it, and let the storyline's device bend it):

  | Beat | Share | Job |
  | --- | --- | --- |
  | Hook | ~8% | the world and the need, or the feature already working |
  | Tension | ~12% | the old way failing on screen, or a gag |
  | Reveal | ~8% | the product or idea named as a title, about 20 to 30% in |
  | Proof | ~40% | the real task in the real UI as 3 to 6 verbs (paste, pick, watch it build, ship), one each |
  | Payoff | ~20% | the result arrives, already moving: the biggest visual moment, once, 60 to 80% in |
  | Claim | ~8% | the one thing, in one line |
  | End card | ~8% | the logo carried in, the name and the call to action land and hold 2 to 3 s |

  In each verb beat keep only what the cursor touches and what proves the line. The process runs fast; the payoff plays at normal speed. Length follows the story; a length in the request is a range, never padded. In HeyGen's own launch films, effects-heavy pieces drew about a tenth of the views of ones built on a real result.
- **Real UI, never a mockup of it.** Everything that claims to be the product is the product: one invented button loses everyone who uses it. Best sources first: the person's recording or screenshots (ask, naming the screen per beat), walking the flow yourself when no sign-in is needed (`ui-demo`), `hf capture` of the feature's page (hyperframes.md), the product's code or docs to confirm today's labels. A screen you can't get is a labelled placeholder, said in the reply. A feature with nothing visible (speed, an API): the real UI that exposes it, real terminal output, or a real analogue the viewer knows. Never a made-up dashboard.
- **The product on screen, in three moves:** (1) establish the workspace, enough of the real interface to locate the task; (2) isolate the action: bring the field, chart or result forward at 1.6 to 2× its real size, real labels and values, text at least 26 px after any push, and let it act (a trace draws, a result fills in) before moving on; (3) return the result into its place, or pull back to show where it is used. A camera move over a frozen screenshot is not the product doing anything. Never a small window in the middle of an empty canvas.
- **Device mockups or the UI itself.** The laptop and phone mockups (`Devices`) suit a portfolio, a recap or "it works on both", where the point is that the thing exists. When the UI is the proof (a launch, a feature), show the UI itself, big and flat; product UI is never tilted into 3D there. The cursor is big (4 to 7% of the frame), enters from off screen, and its click causes the next thing on the same frame. Containers morph instead of cutting: the button becomes the menu, the message becomes the bubble.
- **Tells:** typing into a prompt box as the opener; a feature list as three cards; a title over a dimmed screenshot; an invented dashboard; the logo docked in a corner.

### Explainer

- **Shape:** a question or surprising fact as the hook; the simple answer in one sentence; the explanation in three to five steps, each one idea; a one-line takeaway. For a class, make the teacher's questions the numbered chapter labels (what happened, why, how it was fixed), so the video can be paused between them.
- **Audience:** ask who watches and what they already know (brief.md, round 2). Pitch the narration at beginners unless told otherwise, and even for experts say it plainly: put the depth (terms, version numbers, IDs) in small labels on screen, not in the voice. A developer-level class video about a PHP security bug was rejected as "too complex"; the plain rebuild was approved.
- **Tone:** calm and curious. Use an analogy before a definition, and carry one everyday comparison through the scenes (PHP is a cook, each visit an order, memory the table that must be cleaned after every order), with a small legend that shows what each part stands for as the narrator names it.
- **Words:** short everyday sentences, one idea each, the way the audience would say it. Long formal sentences with spelled-out English terms also make a TTS voice sound like it is reading, not speaking (toolbox.md, "Writing `say` for F5").
- **Visuals:** simple diagrams built from shapes, numbered chapter labels, highlighted words, maps for geographic ideas (`remotion-maps`), real examples. Reveal one element at a time, on the word that names it.
- **Voice and sound:** a calm voice at speed 1.0, captions on, soft music low under the voice or none.
- **Care:** check every fact against a source and name the source in the delivery message. Mark anything you are unsure of and ask. For beginners, leave out true but unneeded detail (estimates, scores, side stories). Check the logic of each step before animating it: a beautiful wrong diagram is worse than none.
- **A better version of one they liked:** keep its look, voice and pacing, and change what they asked for. Redesigning everything at once lost what worked.
- **Ground it first.** Start where the viewer already is: a person, a place or a situation they know, and a question they would ask about it. The diagram or device enters inside that situation as the thing that answers the question, and the video returns to the person at the end with the answer. A video that opens on the diagram alone is a diagram, not an explainer.
- **Devices that explain:** the object is the explanation (a machine or model whose working is the idea, drawn so it reads as what it is, with the camera touring through it: a cutaway, an exploded view, a dive into the part that matters); one diagram that grows (start from the simplest true picture and add one part per beat, each when it is named, never the whole diagram at once); continuous transformation (each step morphs out of the last: a bar becomes an axis, a dot becomes a crowd); the worked example (one real input travels through every step to the answer).
- **Shapes of information.** Most lines are one of a few shapes, and each has its own picture: a number that lands; a myth turned over (the wrong idea struck through, the right one printed over it); before and after; many things converging into a few groups; a network that grows denser; one chosen out of many; steps in order; a real screenshot with the detail circled; a quote set as a poster; a chapter card. Pick the shape first, then the picture, so similar lines get different pictures.
- **Labels** sit on the part they name, with a leader line when needed, and appear with it. No legends, no bullet slides. End on the one idea in one line; no brand end card unless asked.
- **Tells:** a slide of bullets; icons in circles; three cards in a row; the whole diagram at once; a narrator repeating the text on screen word for word.

### Tutorial

- **Shape:** what you will have at the end (the hook), what you need, the steps in order with a numbered chapter label each, a final check ("you should now see..."), common mistakes.
- **Tone:** clear, patient and exact; the viewer is following along.
- **Visuals:** real screen recordings or screenshots with a highlight ring or arrow on the exact control, zoom into small text, the exact words to click or type shown on screen. One step per scene; leave a pause long enough to perform the step.
- **Voice and sound:** a calm voice at speed 0.95 to 1.0, captions on, very quiet music or none.
- **Care:** run every step yourself, or have the person confirm each one, before delivering. A wrong step is worse than a missing one. Hide passwords, API keys, emails and tokens in every screenshot.

### Recap or portfolio

- **Shape:** the title and the period, three to five highlights each with its real clip, photo or screenshot and one line, numbers that count up, a closing line and where to find more. Ask one question first ("what changed this year?") so each highlight answers it, instead of a list.
- **Tone:** proud and quick. Humour is optional.
- **Visuals:** the best real work, device mockups, counters, quick transitions. Don't show unreleased client work or private details.
- **Voice and sound:** upbeat music; narration optional.

### Announcement or teaser

- **Shape:** hook in under a second, the reveal, the date or action, the handle. Ten to twenty-five seconds.
- **Tone:** high energy. Big type, strong contrast, rhythmic cuts timed to the music (motion.md, "Rhythm and the beat grid").
- **Moving type:** 3 to 7 words a scene. A count-up runs 1.2 to 1.6 s, then holds, landing on a downbeat or a hard stop.
- **Voice and sound:** a short narrated line or captions only; punchy music, one or two effects.

### Music video

The song is the structure.
- **Sections become chapters.** Find them first: `hf audio <track> --only sections,beats,bpm --json` (hyperframes.md). Intro, verse, chorus, bridge, outro: slower shots in the verses, one picture per strong beat in the chorus, a held image on a breakdown. The chorus returns to one home stage and grows each time it comes back; the ending rhymes with the opening. Chapter breaks land on section boundaries, with a transition that belongs to the look (a brush wipe, a paper tear, a match cut).
- **Pictures for the words.** Each lyric line or phrase gets its own picture (shots of about 1.4 to 4 s): show what the line means, not the line itself. Lyrics on screen only when asked; then each line holds at least a beat and is set as type, not subtitles. A song about something real gets real material (their footage, photos, places); an abstract track gets one world with a strong medium (watercolour with ink outlines, cut paper, risograph print, film grain).
- **Timing:** music.md, "Cutting to music". Any single treatment goes stale after about 6 s.
- **Rights:** a copyrighted song is fine for WhatsApp but gets muted or blocked on Instagram, TikTok and YouTube (music.md).
- **Tells:** the same treatment for more than about 6 s; a spectrum bar or waveform as the main picture; a cut on every single beat; words about the music rather than the song's own world.

### Number or data story

- **One number at a time.** A number is earned by the scene before it, then made physical: a count that becomes a skyline, a share that becomes a crowd. The number is the biggest thing on screen, in tabular figures (`fontVariantNumeric: "tabular-nums"`, which the template's `Counter` uses) so a count-up doesn't jitter; it counts for 1.2 to 1.6 s, then holds.
- **Real data only**, from the source, rounded the same way everywhere, with a small source line on screen. Keep every figure in one data file the scenes read, so the numbers agree with each other.
- **Charts as pictures.** Build a chart in reading order: the frame and axis, a reference line, the data drawing in, then one note on the point that matters, placed on the mark. No legends. Highlight one series and grey the rest; a chart with one thing to say says it in its title. The same object carries across scenes: a bar becomes the ground of the next scene, a line becomes the road the camera follows.
- **Tells:** a grid of KPI cards; a dashboard; a pie chart; every number counting up at once; numbers with no source.

### Pull request or changelog

- **Material:** `gh pr view <n> --json title,body,files,commits,mergedAt` (it stops at about 100 files: page `gh api repos/{owner}/{repo}/pulls/<n>/files`). Credit the commit authors by commit count, not just whoever opened it; skip bots, lockfiles and `dist/`. Names, not handles: a voice reads `@handles` aloud, so get names with `gh api users/<login> --jq .name`.
- **Never invent a version.** Use the first release published at or after the merge; otherwise the default branch's `package.json` version as "unreleased"; otherwise only the PR link.
- **Length from the size** (additions plus deletions), as a ceiling: up to about 50 lines, 20 to 40 s; 50 to 200, 40 to 70 s; 200 to 600, 70 to 110 s; more than 600 lines or 25 files, 110 to 180 s.
- **Show 2 to 4 pieces of code** of 4 to 12 lines each (the `Terminal` component, or an editor panel); counts like +120/−40 go on a card, not in the voice. The story is what changed for the user and why, with the code as proof (story-and-comedy.md, "The one thing").

### Talking head with cards

Their own clip of someone talking, with designed cards, lower thirds or a split layout. Numbers for 1920×1080 and 1080×1920; scale others.

| Layout | Landscape (x, y, w×h) | Portrait (x, y, w×h) |
| --- | --- | --- |
| Split, video beside the card | 960, 0, 960×1080 | 0, 960, 1080×960 |
| Stack, video above | 14, 14, 1892×548 | 0, 0, 1080×844 |
| Overlay | full frame | full frame |

Picture-in-picture sits 28 px from the edges: a 16:9 source at 460×258 (landscape) or 360×203 (portrait); a 9:16 source at 248×440 (landscape) or 312×555 (portrait). A lower third is the bottom 30%; a side panel the right 42% (landscape) or the bottom 40% (portrait). Portrait type is landscape type × 1.3 (titles × 1.35); padding drops from 40 to 64 px to 24 to 36 px. Size each box to its source's shape: `objectFit: "cover"` crops a portrait clip in a landscape box.

- **Timing:** cards fade in over 0.4 s and out over 0.35 s. Move or reframe the video (0.5 to 0.7 s) only in a gap between cards, with transforms on a wrapper. A still card goes dead after about 8 s; past about 15 s it needs a staged reveal. Start at one card per 6 to 8 s for a video under a minute, 8 to 12 s up to 3 minutes, 12 to 20 s up to 10 minutes.
- **Preparing the clip:** take a noisy room out with `clean-voice.mjs`, transcribe it for the captions and the card timings (`transcribe.mjs`), and cut the dead pauses with `cut-silence.mjs --captions ...` so the captions follow the cut; `<CutClip>` plays it (toolbox.md, "Editing tools").
- **Pitfalls:** a transcript's last word can end after the clip does: end the cards and the composition at the clip's real length (ffprobe), or the video ends in black. Glass over bright footage turns white on white: put a dark scrim behind it (about 55% black at the top, 72% at the bottom). Punch-ins on emphasis; B-roll cut on the sentence; the face never under a card.

### 3D or simulation

Use 3D when the video earns it: an object or a set as the payoff, a product, a process that explains. In Remotion, `@remotion/three` (`<ThreeCanvas>`) with the threejs skills.
- **Same frame every render:** draw every frame from the frame number; simulate once up front into arrays and look up the state at the frame; seed every random choice.
- **Camera and story:** one hero object beats a crowd; fly through or into it rather than orbiting it (one dive is worth ten turns). Cutaways, exploded views and chapters with one caption line each, with labels carrying real numbers, turn a simulation into an explanation. Product UI is never tilted into 3D; only generated content tilts.
- **Light:** a warm key, a cool rim, a dark environment with two or three soft strips; turn the environment, not the object, so highlights sweep across it; a contact shadow under the object. Keep bloom to the brightest points. Glossy metal under a low light gives white streaks: roughness about 0.45 or more. One NaN value can turn a whole frame black through bloom: clamp anything that can divide by zero.
- **On this kind of PC** (integrated graphics), profile the heaviest frame once; a slow frame slows every render.

### Character or mascot short

A character gives every transition a cause and gives the video its jokes: it carries the result in, rejects its own first try, reads the manual.
- **Acting:** a mood change goes through a take (anticipation, a squash, the new face, a settle); a face never snaps between states. Squash and stretch, anticipation, overshoot and follow-through belong to the character; here an idle breath or blink is life, not a tell. Code moves every part at once on one curve: offset the parts (the head leads, the arms follow), vary the amounts, and never move both arms or both eyes in unison. Contact sells it: feet on the ground, props in the hand, eyes on what they look at.
- **One read per action:** lead the eye to where it will happen, play the action fast, and let its meaning land slowly by holding the reaction. A sign or caption that repeats what the action already shows is the classic failure.
- **Build:** a rig is parameters over time (position, squash, arm angles, an eye state, a mouth state); write mood changes as keyed states (`[[t0, "normal"], [t1, "scared"]]`) that the rig eases between. Hand-drawn life: redraw the outlines about 12 times a second with a jitter seeded by `Math.floor(t × 12)`. After Effects characters come in as Lottie (`@remotion/lottie`).

### A real place or a map

A real place (a city, a route, a zoom from the globe to a street) is shown on real imagery; outlines from Natural Earth or GeoJSON read as a diagram and lose the place, so keep them for borders and labels drawn on top. Live map tiles can change between renders: record the camera move once (`remotion-maps`, or `bake-basemap.mjs` from the hyperframes skill, hyperframes.md), keep the MP4, and draw pins and labels live on top while the camera holds. Credit the imagery on screen in small type on a soft dark backing ("Esri, Maxar, Earthstar Geographics" or "© CARTO, © OpenStreetMap").

### Captions or edit only

The person already has footage and wants captions, trims, a reframe or a new cut. Transcribe to caption JSON (`remotion-captions`), style the captions, trim and reframe with Mediabunny (`remotion-multimedia`) or `media-use` operations, and render. Show a few frames of the result before delivering, and check that the captions match what is said.

## Formats and safe zones

Set the composition size from where it will be posted, then keep text inside the safe area. `setup-project.mjs --format <ratio> --platform <reels|whatsapp|landscape|feed>` sets both, and every shared component reads its position from `useLayout()`.

| Where | Format | Size |
| --- | --- | --- |
| Instagram Reels, TikTok, YouTube Shorts, WhatsApp Status | Vertical 9:16 | 1080 x 1920 |
| YouTube, a website, LinkedIn, presentations | Landscape 16:9 | 1920 x 1080 |
| Instagram or Facebook feed | Square 1:1, or portrait 4:5 | 1080 x 1080, or 1080 x 1350 |

- **Vertical safe zones.** Reels, TikTok and Shorts lay their own username, caption and buttons over roughly the bottom 400 px and the right 140 px. For those, place captions at about y 1300, move titles up, and keep stickers off the right edge. WhatsApp Status covers far less, so the default caption position (about y 1470) is fine there. Tell the person to turn off the app's auto-captions and not to add the app's music on top.
- **The strict vertical band** (HyperFrames' measurement, for ads and posts with a long description): nothing in the top 168 px (status and search bar); every word and the product between y 168 and y 1330; below 1330 only texture or decoration; no text under the right-hand button rail. Ads and some apps reserve even more at the bottom; check the platform.
- **The first second of a vertical video.** Frame 0 is the thumbnail and the hook: a face, the result, or one bold line already on screen; never black, never a logo. The viewer decides in about a second whether to stay. Many watch muted, so speech is captioned and the picture carries the hook without sound.
- **Vertical layout and pace.** One subject, centred, stacked vertically; landscape layouts (side-by-side panels, wide charts) are rebuilt as a vertical sequence, never squeezed. Type about 1.35× its landscape size, nothing to read under 28 px, about 5 English words a line for a claim. Shots of 1 to 2 s, a new beat every 2 to 4 s, the payoff before the swipe. A loop that cuts from the last frame back to the first is a choice, not a default.
- **Landscape.** Keep about 120 px margins, put captions in the lower third (about y 850 to 960), and make headlines proportionally large (at least 72 px). Don't copy vertical layouts onto landscape; reposition.
- **Always:** supporting text large enough to read on a phone, high contrast, no text over busy areas without a backing.

## Choosing music by style

Search the HeyGen catalog by mood (music.md). Starting points:

| Style | Mood to search |
| --- | --- |
| Funny story | "playful quirky comedy, bouncy marimba and pizzicato strings", "cheerful ukulele", "upbeat cartoon" |
| Sincere tribute | "warm gentle piano", "soft acoustic guitar, heartfelt", "nostalgic reflective" |
| Promo | "confident modern upbeat, light percussion", "clean corporate-tech but warm" |
| Explainer or tutorial | "calm minimal ambient, soft pulse", "light curious pizzicato" (low volume) |
| Recap | "upbeat inspiring, driving drums", "energetic feel-good" |
| Announcement | "punchy trailer hit, energetic electronic", "bold beat drop" |
| Number or data story, pull request | "confident minimal pulse, light electronic, 110 bpm" |
| 3D or simulation | "cinematic ambient, slow build, wide pads" |
| Character or mascot short | "playful pizzicato and woodwinds, light percussion" |

Search by the feel and the tempo, not the subject ("tense minimal pulse building to a bright drop, 120 bpm", not "coffee shop music"). A music video uses the person's song.

Avoid "kids jingle" (too childish) and generic "corporate uplifting" (bland). Pick a main track and two alternatives so the person can swap by number.
