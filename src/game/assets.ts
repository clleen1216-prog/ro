import { prepareLooks } from "@/game/looks";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

export const images: Record<string, HTMLImageElement> = {};

function url(name: string) {
  const path = `/game/${name}.png`;
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}${path}`;
}

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

export async function loadAll() {
  const names = ["hero", "dew", "hare", "wasp", "thorn", "fountain", "cobble", "grass", "dirt", "water"];
  await Promise.all(
    names.map(async (name) => {
      images[name] = await load(url(name));
    }),
  );
  const hero = images.hero;
  if (hero) prepareLooks(hero);
}