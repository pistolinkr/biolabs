import type { InteractionAnalysis, InteractionRisk } from "./types";

const DRUG_CATEGORIES: Record<string, { category: string; description: string }> = {
  aspirin: { category: "NSAID", description: "Non-steroidal anti-inflammatory drug" },
  warfarin: { category: "Anticoagulant", description: "Blood thinner" },
  ibuprofen: { category: "NSAID", description: "Non-steroidal anti-inflammatory drug" },
  acetaminophen: { category: "Analgesic", description: "Pain reliever" },
  metformin: { category: "Antidiabetic", description: "Diabetes medication" },
  omeprazole: { category: "PPI", description: "Proton pump inhibitor" },
  simvastatin: { category: "Statin", description: "Cholesterol medication" },
  atorvastatin: { category: "Statin", description: "Cholesterol medication" },
  lisinopril: { category: "ACE inhibitor", description: "Blood pressure medication" },
  losartan: { category: "ARB", description: "Blood pressure medication" },
  amlodipine: { category: "Calcium channel blocker", description: "Blood pressure medication" },
  furosemide: { category: "Diuretic", description: "Water pill" },
  clopidogrel: { category: "Antiplatelet", description: "Blood thinner" },
};

export function normalizeDrugKey(name: string): string {
  return name.toLowerCase().trim().split(/\s+/)[0] ?? name.toLowerCase();
}

export function lookupLocalDrugInfo(name: string): { category: string; description: string } | null {
  return DRUG_CATEGORIES[normalizeDrugKey(name)] ?? null;
}

function riskLabel(risk: InteractionRisk): string {
  switch (risk) {
    case "high":
      return "High";
    case "very_high":
      return "Very High";
    case "moderate":
      return "Moderate";
    case "low":
      return "Low";
    default:
      return "Unknown";
  }
}

/** Rule-based interaction analysis ported from ddi2026chk (no cloud AI required). */
export function analyzeDrugInteraction(drug1: string, drug2: string): InteractionAnalysis {
  const key1 = normalizeDrugKey(drug1);
  const key2 = normalizeDrugKey(drug2);
  const drug1Info = DRUG_CATEGORIES[key1] ?? null;
  const drug2Info = DRUG_CATEGORIES[key2] ?? null;

  let risk: InteractionRisk = "moderate";
  let mechanism =
    "Limited structured interaction data is available for this pair. Apply general polypharmacy precautions.";
  let expectedEffects = [
    "Unexpected side effects may be harder to attribute to a single agent.",
    "Monitor for new symptoms after combining medications.",
  ];
  let practicalSteps = [
    "Consult a pharmacist or clinician before co-administering.",
    "Keep an updated medication list for every visit.",
    "Do not stop prescribed therapy without medical guidance.",
  ];

  if (drug1Info && drug2Info) {
    const category1 = drug1Info.category.toLowerCase();
    const category2 = drug2Info.category.toLowerCase();
    const bloodRelated = (c: string) => c.includes("anticoagulant") || c.includes("antiplatelet");

    if (bloodRelated(category1) && bloodRelated(category2)) {
      risk = "high";
      mechanism = "Both agents affect hemostasis through different pathways, producing additive bleeding risk.";
      expectedEffects = [
        "Prolonged bleeding time",
        "Easy bruising, gum bleeding, or nosebleeds",
        "Elevated internal bleeding risk",
      ];
      practicalSteps = [
        "Seek clinician review for dose adjustment or alternative therapy.",
        "Monitor for bleeding signs daily when starting combination therapy.",
        "Avoid additional NSAIDs or antiplatelet agents unless directed.",
      ];
    } else if (category1.includes("nsaid") && category2.includes("nsaid")) {
      risk = "moderate";
      mechanism = "Dual NSAID exposure increases COX inhibition and GI/cardiovascular stress.";
      expectedEffects = [
        "Increased GI ulceration risk",
        "Blood pressure elevation",
        "Renal function concerns with prolonged use",
      ];
      practicalSteps = [
        "Use only one NSAID at a time.",
        "Consider acetaminophen or non-pharmacologic pain strategies.",
        "Monitor blood pressure and renal labs if used chronically.",
      ];
    }
  }

  const emergencySigns = [
    "Severe bleeding or blood in stool/urine",
    "Difficulty breathing or chest pain",
    "Sudden confusion or loss of consciousness",
  ];

  const summary =
    risk === "high"
      ? "This combination may significantly increase bleeding risk."
      : risk === "moderate"
        ? "Use caution; monitor for additive side effects."
        : "Insufficient structured data — treat as cautionary until reviewed.";

  const markdown = [
    `**${drug1} + ${drug2}**`,
    "",
    `**Risk:** ${riskLabel(risk)}`,
    "",
    mechanism,
    "",
    "**Expected effects**",
    ...expectedEffects.map((e) => `- ${e}`),
    "",
    "**Practical steps**",
    ...practicalSteps.map((s) => `- ${s}`),
    "",
    "**Emergency signs**",
    ...emergencySigns.map((s) => `- ${s}`),
  ].join("\n");

  return {
    drug1,
    drug2,
    risk,
    riskLabel: riskLabel(risk),
    summary,
    mechanism,
    expectedEffects,
    practicalSteps,
    emergencySigns,
    markdown,
  };
}
