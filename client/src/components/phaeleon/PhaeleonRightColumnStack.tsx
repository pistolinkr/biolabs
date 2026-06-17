import PhaeleonAssistantDock from "@/components/phaeleon/PhaeleonAssistantDock";
import PhaeleonInspectorPanel from "@/components/phaeleon/PhaeleonInspectorPanel";
import PhaeleonResizableVerticalStack from "@/components/phaeleon/PhaeleonResizableVerticalStack";
import { usePhaeleon } from "@/contexts/PhaeleonContext";
import { layoutStructureOf } from "@/lib/phaeleon/phaeleonLayoutMode";
import { PHAELEON_STACK_MIN } from "@/lib/phaeleon/phaeleonSettingsStorage";

/** Right column — Inspector + Assistant (compact/classic/analysis) or Assistant + Inspector. */
export default function PhaeleonRightColumnStack() {
  const { settings, updateSettings } = usePhaeleon();
  const inspectorFirst = layoutStructureOf(settings) === "classicStack";

  const primary = inspectorFirst ? <PhaeleonInspectorPanel /> : <PhaeleonAssistantDock />;
  const secondary = inspectorFirst ? <PhaeleonAssistantDock /> : <PhaeleonInspectorPanel />;

  return (
    <PhaeleonResizableVerticalStack
      primary={primary}
      secondary={secondary}
      secondaryDockId={inspectorFirst ? "phaeleon-assistant-dock" : undefined}
      height={settings.stackSecondaryHeight}
      minSecondaryHeight={PHAELEON_STACK_MIN}
      onHeightCommit={(height) => updateSettings({ stackSecondaryHeight: height })}
    />
  );
}
