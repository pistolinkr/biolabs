/** Appended when the provider stops due to output token limits. */
export const AI_TRUNCATION_SUFFIX =
  "\n\n… [Response truncated — increase Max output tokens in Settings → AI Assistant]";

export function appendTruncationNotice(text: string, truncated: boolean): string {
  if (!truncated) return text;
  if (text.includes("[Response truncated")) return text;
  return `${text}${AI_TRUNCATION_SUFFIX}`;
}
