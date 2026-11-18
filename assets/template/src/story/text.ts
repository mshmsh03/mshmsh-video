// Arabic-script text (Arabic, Kurdish Sorani, Persian) reads right to left.
// The script with more words decides, so a Sorani line that starts with "PHP"
// still reads right to left, and an English line with one Arabic word doesn't.
const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;

export const isRtl = (text: string) => {
  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const rtl = words.filter((w) => RTL_LETTER.test(w)).length;
  return rtl > 0 && rtl >= words.length - rtl;
};

export const dirOf = (text: string): "rtl" | "ltr" =>
  isRtl(text) ? "rtl" : "ltr";

// Letter-spacing and per-letter effects break the joined letters of
// Arabic-script text, so they apply to left-to-right text only.
export const letterSpacingFor = (text: string, spacing: string) =>
  isRtl(text) ? "normal" : spacing;
