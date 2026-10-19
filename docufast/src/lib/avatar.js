import { supabase } from "@/lib/supabase";

/** Centre-crop to a square and shrink, so uploads are small (a few tens of KB). */
async function toSquareJpeg(file, size = 480) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file is not a valid image."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the image."))), "image/jpeg", 0.85)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Uploads the customer's photo to the public "avatars" bucket and saves its URL on their profile. */
export async function uploadAvatar(file, userId) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image (JPG or PNG).");
  if (file.size > 15 * 1024 * 1024) throw new Error("That image is too large. Please choose one under 15 MB.");
  const blob = await toSquareJpeg(file);
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });
  if (error) throw new Error("Could not upload the photo. Please try again.");
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`; // changes on every upload so the new photo shows at once
  // Save the link on the profile. Done directly so a failure tells us exactly what is wrong.
  const { data: row, error: upErr } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId)
    .select("avatar_url")
    .maybeSingle();
  if (upErr) {
    if (/avatar_url/i.test(upErr.message || "")) {
      throw new Error("Database is missing the photo column. Run migration_005_profile_photos.sql in Supabase.");
    }
    throw new Error(`Photo uploaded but could not be saved to your profile (${upErr.message}).`);
  }
  if (!row) throw new Error("Photo uploaded but your profile row was not found or is not editable.");
  return url;
}
