# Pocket Camera

A Game Boy Camera–inspired **Progressive Web App** that turns your phone or webcam into a pocket-sized four-shade camera. It runs **100% offline** — every image is processed locally on your device, nothing is uploaded.

**▶ Live app: <https://trashbytes.github.io/pocket-camera/>**

![Pocket Camera](docs/images/hero.jpg)

---

## Features

- 📷 Capture from the front or rear camera (or webcam) and shoot selfies
- 🎛️ Live, four-shade dithering with noise, gamma, brightness and contrast
- 🖼️ Classic Game Boy Camera frame around your shot (toggleable)
- 🔍 Nearest-neighbour 8× upscale for crisp, blocky pixels
- ⚡ Capped at ~12 fps for that vintage, slightly sluggish Game Boy feel
- 📴 Fully offline-capable via a service worker — installable as a PWA
- 🔒 No uploads, no server: all processing happens on-device

<img src="docs/images/screenshot.jpg" alt="Screenshot of Pocket Camera" width="360">

*Screenshot of Pocket Camera. It's obviously "heavily inspired" by the original Game Boy.*

---

## Backstory

My fascination with the Game Boy started a few years ago after I saw a few pictures online. Coincidentally that was right around the time the Telegram Bot API was published.

Naturally I put those things together and developed my very first public Telegram bot: **@GameBoyCameraBot**. The idea was simple: downscale the image, dither it with four colours, put a border around it and send it back to the user. In reality, getting convincing results proved to be much more complicated — and I never really came close to actual hardware with the bot. Pocket Camera is where I finally cracked it.

### The Game Boy Camera

The Game Boy Camera was an accessory for the original Game Boy handheld, released in 1998. The camera could swivel 180 degrees and let you capture your environment as well as selfies. It also held a few minigames and a chiptune music sequencer, plus camera modes like mirroring, scaling, panorama and time lapse.

It featured a 128×128 pixel CMOS sensor, though it didn't use the full 128 pixels vertically. The final resolution was reduced to **128×112 pixels** to make room for a 16-pixel border and still fit the Game Boy's display. The final image consisted of only **four shades of grey** (including black and white), emulating smooth gradations through a dithering algorithm.

---

## How it works

### Grabbing the camera

Ask for permission, plug the stream into a `video` element, then feed it straight into the `drawImage()` function of a 2D canvas context. (Fun fact learned the hard way: you cannot hide or move the `video` element offscreen on iOS — it freezes after the first frame.)

### Downscaling & sharpening

To downscale, the app checks the camera orientation and centres the image with a negative offset on the appropriate axis (essentially what `object-fit: cover` does).

Sharpening turned out to be tricky: **SVG filters on canvas elements are ignored on iOS**. The solution was [Pica.js](https://github.com/nodeca/pica), which downscales and sharpens in one go and can use Web Workers, WebAssembly and `createImageBitmap` when available.

### Dithering

After a few weeks of headache, [ditherJS](https://github.com/danielepiccone/ditherjs) helped me understand how to implement dithering efficiently. The result is a custom **ordered dithering** algorithm that also adds noise in the midtones with a smooth falloff, applies gamma correction, and offers user-controllable brightness and contrast.

### Offline

A simple service worker caches everything and serves the cached files when you're offline.

---

## Comparison

First a photo of The Beatles cover shot on a **real Game Boy Camera**, then the same shot on **Pocket Camera**, then a conversion by the **Telegram bot** for comparison.

| Real Game Boy Camera | Pocket Camera (this app) | Telegram bot |
|---|---|---|
| ![Shot on a GameBoy Camera](images/comparison/gbc.png) | ![Shot on Pocket Camera](images/comparison/pwa.png) | ![Converted with the Telegram bot](images/comparison/bot.png) |

The real hardware (courtesy of [u/zhx](https://www.reddit.com/user/zhx)) is incredibly noisy with strong sharpening artefacts. Pocket Camera is noisy in the midtones too and shows similar, if slightly softer, sharpening artefacts. The Telegram bot output is very soft and uniform — no noise, no sharpening artefacts.

---

## Examples

A few shots taken with Pocket Camera:

| | | | |
|---|---|---|---|
| ![](docs/images/example-1.jpg) | ![](docs/images/example-2.jpg) | ![](docs/images/example-3.jpg) | ![](docs/images/example-4.jpg) |
| ![](docs/images/example-5.jpg) | ![](docs/images/example-6.jpg) | ![](docs/images/example-7.jpg) | ![](docs/images/example-8.jpg) |
| ![](docs/images/example-9.jpg) | ![](docs/images/example-10.jpg) | ![](docs/images/example-11.jpg) | ![](docs/images/example-12.jpg) |

---

## Tech

- [Mithril.js](https://mithril.js.org/) — tiny UI framework
- [Pica.js](https://github.com/nodeca/pica) — high-quality resize & sharpen
- Custom ordered-dithering implementation
- SCSS + Material Design Icons
- Service worker for offline support

### Project structure

```
index.html          Entry point
manifest.json       PWA manifest
service.min.js      Service worker (offline cache)
main.min.css/js     Built bundles used by the app
css/                SCSS sources & icon webfont
js/                 JS sources (app.js, functions.js, frames.js, palettes.js)
images/             App assets (frames, icons, comparison shots)
docs/images/        Images used by this README
```

### Running locally

Because the app uses the camera and a service worker, it needs to be served over **HTTPS or `localhost`** — opening `index.html` directly won't work.

```bash
# any static file server, e.g.
python -m http.server 8080
# then open http://localhost:8080
```

---

## Credits & links

- Original blog post: *Pocket Camera – A PWA which let's you take pictures inspired by the Game Boy Camera* — [trashbytes.cc](https://trashbytes.cc/blog/pocket-camera-a-pwa-which-let-s-you-take-pictures-inspired-by-the-game-boy-camera)
- Reddit discussion: [r/trashbytes](https://www.reddit.com/r/trashbytes/comments/o7963l/pocket_camera_a_pwa_which_lets_you_take_pictures/)
- More real-hardware shots: [u/zhx's collection](https://imgur.com/a/vg8lE)

Game Boy and Game Boy Camera are trademarks of Nintendo. This is an unofficial fan project and is not affiliated with or endorsed by Nintendo.
