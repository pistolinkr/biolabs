import PhaeleonAnalysisPanel from "@/components/phaeleon/PhaeleonAnalysisPanel";
import PhaeleonAssistantDock from "@/components/phaeleon/PhaeleonAssistantDock";
import PhaeleonResizableVerticalStack from "@/components/phaeleon/PhaeleonResizableVerticalStack";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import { PHAELEON_FOCUS_STACK_MIN } from "@/lib/phaeleon/phaeleonSettingsStorage";

/** Focus preset — analysis report with resizable assistant dock below. */
export default function PhaeleonAnalysisAssistantStack() {
  const { settings, updateSettings } = usePhaeleon();

  return (
    <PhaeleonResizableVerticalStack
      primary={<PhaeleonAnalysisPanel />}
      secondary={<PhaeleonAssistantDock />}
      secondaryDockId="phaeleon-assistant-dock"
      height={settings.stackSecondaryHeight}
      minSecondaryHeight={PHAELEON_FOCUS_STACK_MIN}
      onHeightCommit={(height) => updateSettings({ stackSecondaryHeight: height })}
    />
  );
}
