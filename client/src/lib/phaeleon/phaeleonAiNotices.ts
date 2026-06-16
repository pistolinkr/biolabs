import { toast } from "sonner";
import type { AiErrorCode } from "@shared/ai/types";
import { i18n } from "@/i18n";
import { formatAiUserNotice, noticeFromUnknownError } from "@/lib/ai/userErrors";

export function notifyPhaeleonAiNotConfigured(): void {
  toast.error(i18n.t("toasts.notConfigured", { ns: "assistant" }), {
    description: formatAiUserNotice("AI_NOT_CONFIGURED", i18n.t("toasts.notConfiguredHint", { ns: "assistant" })),
  });
}

export function notifyPhaeleonAiUnavailable(error?: unknown, code: AiErrorCode = "AI_UNKNOWN"): void {
  const notice =
    error !== undefined ? noticeFromUnknownError(error) : formatAiUserNotice(code);
  toast.error(i18n.t("toasts.unavailable", { ns: "assistant" }), { description: notice });
}
