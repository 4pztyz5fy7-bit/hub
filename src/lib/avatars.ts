import a1 from "@/assets/avatars/a1.jpg";
import a2 from "@/assets/avatars/a2.jpg";
import a3 from "@/assets/avatars/a3.jpg";
import a4 from "@/assets/avatars/a4.jpg";
import a5 from "@/assets/avatars/a5.jpg";
import a6 from "@/assets/avatars/a6.jpg";
import a7 from "@/assets/avatars/a7.jpg";
import a8 from "@/assets/avatars/a8.jpg";
import a9 from "@/assets/avatars/a9.jpg";
import a10 from "@/assets/avatars/a10.jpg";

export const DEFAULT_AVATARS: readonly string[] = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];

export function randomAvatarUrl(seed?: string): string {
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const idx = Math.abs(h) % DEFAULT_AVATARS.length;
    return toAbsoluteUrl(DEFAULT_AVATARS[idx]);
  }
  const idx = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return toAbsoluteUrl(DEFAULT_AVATARS[idx]);
}

function toAbsoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  try { return new URL(path, window.location.origin).toString(); } catch { return path; }
}
