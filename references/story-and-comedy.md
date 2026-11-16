# Story, scripting and comedy

Finding the material, the privacy rules, writing `story.json` and timing visuals to words apply to every style that has narration. "Shape of the story" and the comedy playbook are for the funny and sincere story styles; other styles use the shapes in styles.md. "The one thing", "Three storylines", "The hook", "Words" and "Tells" come from HeyGen's HyperFrames `story.md` (Apache-2.0, adopted 2026-11-17) and apply to every video that tells something.

## Contents
- Finding the story (and what to keep out)
- The one thing
- Three storylines, then one
- The hook
- Shape of the story
- Writing story.json
- Words on screen and in the voice
- The brand and the end card
- Tells of a generated video
- The comedy playbook
- Timing gags to the voice

## Finding the story (and what to keep out)

The best material is the person's own: their notes (an Obsidian vault, a
journal), git history, project folders, live sites, photos and clips. When there
is a notes folder, hand it to an Explore/research subagent with a brief like:
"find the people and the turning points, give a dated timeline of what was built
and learned, the overall arc in a few sentences, and flag anything private". Ask
it for real dates only (notes, file times, `git log --reverse`), marking
anything inferred.

The person's own words beat invented ones. A line from their notes ("you don't
need to know everything before you start, learn as you go") makes the best
sincere beat. Anything the notes don't support, like who said what or who was
there, comes from the person, not from you.

Keep these out of a video meant to be shared, even when the person said "use my
notes":
- passwords, API keys, server addresses, account emails, phone numbers
- money: debts, prices they charge, salaries, "money is tight"
- health, sleep, family trouble
- client internals: staff names, bugs, invoices, work still under client review
  (name the client if allowed, but don't show unreleased screens)
- licence plates, house numbers, school or ID badges in photos and clips (crop
  them out with `focusY`; check several frames, because hand-held clips pan)

Client names and their public websites are fine only when the person said so.

## The one thing

Most weak videos are good motion around no story: a list of features, three cards in a row, a logo, a link. Before any script, write down:

- **What it is, in one line:** "You can now..." for a launch, the one idea the viewer must understand for an explainer, the one feeling for a tribute. A whole release ("what's new in 2.0") is not one thing: take its headline.
- **The one thing to remember** after the video ends, in the viewer's words, not the brand's slogan.
- **One viewer doing one real task** (for a promo or tutorial), from the moment they need it to the result. That task is the spine, and one real piece of data (a query, a file, a photo, a number) travels through it from the hook to the payoff. An explainer's spine is one concrete example worked through.
- **Facts apart from choices.** What it does, real numbers and real labels come from the source (the person, their site, their docs); the angle, tone and look are yours. Use the person's own words as written. What the source doesn't say stays unsaid: "40 min to 2 min" is not "20× faster"; mark an example number as illustrative; show a screen you can't get as a labelled placeholder ("Screenshot: Settings"), never a drawn one.

## Three storylines, then one

**When:** a video over about 15 s whose story is still open after the brief: most promos, explainers, recaps, announcements and music videos. **Skip it** when the person already gave the story (the funny or sincere story of their year, "X told me to buy it"), a script, a storyboard or a reference video to follow, and for edits, captions on footage and one-idea pieces (one kinetic line, a map move); there the request is the story.

Write three. They are three different videos, not three titles on one video: each has its own **world** (where it happens and what it looks like), its own **device** (what the story is) and its own **form** (how the camera and the cuts carry it). Sketch five or more ideas first, one line each pairing a device with a form (tables below), drop those the subject can't carry, and keep the three that differ most. Make one of them the bold one you wouldn't have picked first. Each says:

- its name, its device and form in a few words, and in two sentences what the viewer sees and feels;
- the first two seconds, exactly;
- its beats in one line (`hook → ... → end card`);
- its look in one line, taken from the subject or the brand (the medium, the background, the type);
- its sound in one line (music.md, "Sound design").

They are words: build nothing for any of them before one is picked. Pick for the story, the one a stranger would follow and remember, with people or a situation they know, ahead of the most striking picture. Put your recommendation first with its reason in one clause, and save all three as `STORYLINES.md` in the project so a later session can switch.

- **The person is there:** show the three and wait for the pick (storyboard-and-gates.md, gate 1b). Ask nothing else in that message unless only they can answer it.
- **"Just make it":** take your recommendation, build it, and name the other two in one line each in your reply.

| Device | What the viewer sees |
| --- | --- |
| A moment in someone's day | a person, a time stamp, the message that creates the need ("launch is tomorrow") |
| A character does the work | a mascot or a cursor carries, drags, draws and reacts; every cut has a cause |
| The feature as the hook | the feature happening to a recognisable image in the first half second |
| The result first | the finished result plays, then the camera pulls back to show where it came from |
| One object across apps | the thing being made travels from one app into the product, which keeps working on it |
| Life before and after | the old way as a scene (one person drowning in tabs), then the new way |
| Type carries the argument | giant moving type, colour fields and grids that cut on the beat |
| A number lands | one real number earned by a scene, then made physical |
| A question with the input | "What if you could make a video from your ⟨website⟩?", the blank filled by a real input |
| The object is the explanation | a machine or model whose working is the idea; the camera tours through it |

| Form | What the viewer sees |
| --- | --- |
| One continuous take | the camera never cuts; it pushes, pulls and travels from one world into the next |
| Object-to-object chain | every shot ends on the thing that opens the next: a button becomes a card becomes a phone |
| An endless zoom | the camera dives into a detail that turns out to be the next world, again and again |
| A flight through one world | a 3D set, a map or a desk the camera travels across; each idea is a stop on the route |
| Cut on the beat | hard cuts on the music, type and colour fields changing every half beat |
| Match cuts | one shape holds while everything around it changes: a circle becomes a lens, a wheel, a logo |
| Split screen to one | several panes play at once, then collapse into the one that matters |
| One frame that rebuilds | a single composition keeps rearranging itself and never leaves the frame |

Three storylines that are all plain cuts between scenes haven't tried the forms. Before and after: the new side moves calmly while the old side churns; never mock a named competitor. A recap asks one question first, so each highlight answers it.

**Worlds.** A video visits several worlds, each with its own background, light and scale (a desk, the product on a brand colour, a white space with a character, real footage), never one dark canvas with small UI floating in it. Enter each world through an object already on screen: the thing clicked becomes the next shot. Keep one home stage to come back to, one thing the eye follows, and the palette and type the same across worlds.

## The hook

The first two seconds are the densest of the video, and frame 0 is the thumbnail: never black, never a logo alone. Open on the feature working on something recognisable, a real moment that creates the need, a question with the input inside it, a sentence whose last word becomes the picture, or the problem itself. The funny story's freeze-frame on the person's own clip is a hook of this kind. Then let the old way fail on screen (the wait, the wall of text, the wrong result) before the product brings relief; the proof is often the same shot improved in front of the viewer. Typing into a prompt box as the opener, with nothing else on screen, is the tell of a generated video; a few seconds in, as a story step, it is fine.

## Shape of the story (funny and sincere story videos)

About 60 to 85 seconds, 9 to 12 scenes, one idea per scene. A shape that works:

1. **Cold open**: a freeze-frame on their own clip. "Yep. That's me. You're
   probably wondering how I got here." Then the title.
2. **Chapter 1 · The beginner**: how clueless they were (self-deprecating), the
   person or moment that started it, the friend who joined, the first tiny
   project and how it broke.
3. **Chapter 2 · Building**: the montage. Real screenshots, things shipped, each
   with one gag.
4. **Chapter 3 · Today**: numbers that count up, ending on a joke number.
5. **The sincere beat**: one lesson in their own words, no gag, music fading.
6. **Ending**: thank-yous with photos, and a self-aware button. "Claude made
   this video too. Even the jokes. Especially the bad ones." fits a video about
   their life with Claude. For a gift (a birthday, a farewell) ask first: the
   person may want the credit to be theirs, so end on their wish instead.

Chapter labels ("Chapter 1 · The beginner") make it read as a story rather than
a CV.

## Writing story.json

```json
{
  "voice": "bm_george",
  "speed": 1.1,
  "fps": 30,
  "transitionFrames": 15,
  "leadIn": 0.35,
  "tail": 0.45,
  "scenes": [
    { "id": "freeze", "text": "Yep. That's me. You're probably wondering how I got here.", "lead": 1.9, "hold": 2 },
    { "id": "advice", "text": "Then Mr. Karim told me: buy the subscription. I asked how much. This was his reaction.",
      "say": "Then Mister Karim told me: buy the subscription. I asked how much. This was his reaction.", "hold": 1.5 }
  ]
}
```

- `text` is what the captions show; `say` is what the voice reads, when they
  differ. Captions always come from `text`. Word timings are estimated over
  `text` (digits count as their spoken length), so `say` may use more or fewer
  words, but keep the rhythm close. Use `say` for:
  - **abbreviations**: write "Mister" for "Mr."
  - **names the voice gets wrong**: "Al Noor" for "Al Nur"
  - **digits**: show "7 clients" and "over 300 commits" on screen, but have the
    voice say "seven" and "three hundred"
  - **times**: show "7 pm" (no periods) and say "seven p m". Periods inside
    "p.m." used to split captions; the scripts now skip common abbreviations,
    but plain text is safest.
- `lead` holds the voice back at the start of a scene (the freeze opener plays
  the clip first). `hold` is breathing room after the line, for the visual
  punchline to land. Give a scene whose gag finishes after the voice (a terminal
  that answers "oh.") 1.5 to 2 s of hold.
- Keep lines short: 10 to 20 words, two or three sentences. Speed 1.05 to 1.1
  with `bm_george` gives snappy comedic delivery.
- Each scene's length is computed from its voice. Never hand-set durations;
  re-run `make-voice.mjs` after every text change.

## Words on screen and in the voice

- **Voice pacing.** A narrator reads about 2.2 words a second. Keep a scene to about 19 spoken words (9 s); at most two scenes may reach 26 words (12 s). A 30 to 90 s video is about 155 words or fewer, a whole video about 400 at most.
- **A voice longer than its visuals** makes the visuals pad with idle drift. Trim the script; never stretch the motion.
- **Reveal as it is named.** Everything on screen in the first quarter of a scene, then frozen, reads as a slideshow. Bring each piece in when the voice names it (`wordAt`), across the back half of the scene, and write the line as separate phrases so it has cue points.
- **Titles** take at most 6 words a line, one line on screen at a time, no full stop at the end; an explainer's lines may run to about 10 words. A line holds about 0.5 s plus 0.3 s a word, the last line at least 2 s.
- **Show, don't list:** no bullet slides or rows of three cards. When similar things repeat, each gets its own idea and layout.
- **Real numbers only**, from the source.
- **The first line is never** "Introducing", "Meet" or the logo; after the problem, "Introducing X" is fine. Never "unlock", "seamless", "supercharge", "game-changer", "revolutionize", "effortless", or "in seconds" unless it was measured.
- **Two tests:** read the lines alone, and a stranger gets the point; watch the pictures alone, and they tell the same story.
- **Narrated or not.** With a voice, the screen never repeats the spoken sentence word for word (hide those caption words with `hideWords`). Without a voice, large titles and the product's own text carry the words, over music and sound.

## The brand and the end card

The logo lands once, with weight, usually on the end card. Before that the brand shows only inside the product and the story, never docked small in a corner. The end card is built, not a still: the mark is carried in, typed or wiped in (for a launch: in the last 5 to 10% of the video, centred, 15 to 30% of the frame width, then the call to action held 1.5 to 3 s). The accent colour is rationed: one highlighted word, the payoff, the end card.

## Tells of a generated video

Besides the defaults banned in storyboard-and-gates.md ("Banned by default") and the moves in motion.md ("Moves that look generated"):

- every scene entering the same way, or the same move beat after beat;
- side-by-side panels and floating cards standing in for a scene;
- titles that keep sliding or shrinking after they land; breathing or floating loops standing in for motion on titles and UI.

When the stills show any of them, name which, take the replacement from the subject, the brand or the medium, and add it to the Never line of `design.md`.

## The comedy playbook (funny style only)

Funny comes from contrast and timing, not from adding more jokes. Use the
person's real situation and exaggerate it a little. Roast the hero more than
anyone else, and roast friends only gently.

**Start from their world, not from the table below.** In testing, the
strongest jokes were the ones only that person's story could produce:
- a nurse whose answer to every problem is "drink water" ("sara it's a CAR" /
  "and yet.")
- the narrator bleeped mid-word when he says "quiet" in an ER
- a client who "said yes. He could not. Yet."

Plans that reached straight for the stock gags (XP error, ∞ counter) were less
funny. So:
1. Write 8 to 10 candidate jokes from the true stories the person gave you.
2. Keep the best 5 or 6.
3. Only then pick staging from the toolbox below.

Techniques that work well:
- rule of three, with the twist on the third
- a callback to the opening (the frozen clip resumes; the first question comes
  back)
- a deadpan narrator persona (nature documentary, sports commentator)
- fake-serious UI (a status line, receipt, scoreboard or discharge form)
- a bleep

The table is a toolbox for staging, not a checklist. Each entry is something
visual landing on a specific word of the narration.

| Gag | How | Built in |
| --- | --- | --- |
| Freeze-frame opener | clip freezes, record scratch, white flash, desaturate, slight zoom, sticker with an arrow | `scenes/FreezeScene.tsx` |
| The tiny terminal joke | `> what is a terminal?` → "You're looking at one." → `> oh.` | `Terminal` |
| Failed command | `$ git push` → red `error:` with the Windows XP error sound → `> claude, help` → "✓ Pushed. You're welcome." | `Terminal` with `kind: "error"` |
| Reaction zoom | "I asked how much. This was his reaction." Their photo slams full screen, shakes, vine boom, music cuts out for about 1.3 s | `examples/scenes/AdviceScene.tsx` |
| Labels as jokes | "BEGINNER #1 / #2" stickers, "combined coding knowledge: 2%" meter | `examples/scenes/FriendsScene.tsx` |
| Stress stamp | "No pressure." → shaking red "STRESS LEVEL: 99%" sticker | `examples/scenes/WebsitesScene.tsx` |
| Deadpan stamp | "BUILT IN 1 DAY / sleep: not invited" | `examples/scenes/PosScene.tsx` |
| Fake-serious status line | "Iron Man approval: ..." → "probably" | (was in a JARVIS scene) |
| Joke counter | "∞ times I asked how to center a div" after real counters | `Counter` with `finalText` |
| Receipt | "status ...... active / wallet ...... crying" | (first version of AdviceScene) |
| Self-aware ending | "Even the jokes. Especially the bad ones." | `examples/scenes/OutroScene.tsx` |

Use meme sound effects at most three or four times per video: a record
scratch, a vine boom, the Windows XP error. More than that stops being funny.
The music cutting out is a sound effect too, and often the best one.

Keep one beat sincere, usually the lesson near the end. With no gag on it, it
lands harder than any joke.

When the person asks for "more funny", sharpen what is there: tighter setups,
punchier last words, a visual for every punchline, a silence before the big
one. Adding a wall of new jokes usually works less well.

## Timing gags to the voice

Every visual cue uses `wordAt(sceneId, "word")` (seconds into the scene) times
`fps`, so the gags stay in sync when the narration is regenerated. Put the
punchline visual on the punchline word, not at the start of the sentence. For a
reaction, add about 0.25 s after the word. Check the timing table that
`make-voice.mjs` prints: a word stretched over a second means a pause was
matched to the wrong punctuation (see production.md).
