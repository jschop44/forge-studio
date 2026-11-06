import { validateBrowserEvidence } from "./browser-evidence";
import type { BrowserEvidence } from "./browser-evidence";
import { summarizeVisualLayout } from "./visual-layout-evidence";

/** Consume actual DOM geometry from the allowlisted capture worker. */
export function workerCaptureToVisualLayout(input:unknown) {
  if (!validateBrowserEvidence(input)) throw new Error("Invalid browser capture evidence");
  const capture=input as BrowserEvidence;
  const first=capture.pages[0];
  if (!first || !first.visualRegions?.length) throw new Error("No measured visual regions in capture");
  const roleMap:Record<string,"header"|"navigation"|"hero"|"main"|"section"|"footer">={
    header:"header",nav:"navigation",hero:"hero",main:"main",section:"section",footer:"footer",
  };
  return summarizeVisualLayout({
    sourceUrl:capture.sourceUrl,
    viewport:capture.viewport,
    capturedAt:capture.capturedAt,
    regions:first.visualRegions.map(r=>({...r,role:roleMap[r.role]})),
  });
}
