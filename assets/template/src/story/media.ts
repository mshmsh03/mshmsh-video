import { getStaticFiles } from "remotion";

// Files in public/, found by name, so a missing photo, sound or logo leaves a
// fallback instead of failing the render. getStaticFiles() works in the Studio
// and in renders.

// public/<path>, or undefined when the file isn't there.
export const findStatic = (path: string) => {
  const name = path.replace(/^\/+/, "");
  return getStaticFiles().find((file) => file.name === name);
};

// public/<folder>/<base>.<one of the extensions>, case-insensitive.
export const findByBase = (folder: string, base: string, extensions: string) =>
  getStaticFiles().find((file) =>
    new RegExp(
      `^${folder}/${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(${extensions})$`,
      "i",
    ).test(file.name),
  );

// The person's photos and clips: public/photos/<base>.jpg, .png, .webp, .gif,
// .mp4, .mov or .webm.
export const findMedia = (base: string) =>
  findByBase("photos", base, "jpe?g|png|webp|gif|mp4|mov|webm");

export const isVideoFile = (name: string) => /\.(mp4|mov|webm)$/i.test(name);
export const isGifFile = (name: string) => /\.gif$/i.test(name);

// The brand's logo: public/brand/logo.svg (or .png, .webp).
export const findLogo = (base = "logo") =>
  findByBase("brand", base, "svg|png|webp");

// The music bed: public/bgm/track.mp3 (or .wav, .m4a).
export const findMusic = () => findByBase("bgm", "track", "mp3|wav|m4a");
