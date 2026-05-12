"use client";

import { useEffect, useState } from "react";
import type { FeatureMap, Plan } from "@/lib/features";

type FeaturesState = { plan: Plan; features: FeatureMap } | null;

export function useFeatures() {
  const [state, setState] = useState<FeaturesState>(null);

  useEffect(() => {
    fetch("/api/features")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setState(d); })
      .catch(() => {});
  }, []);

  return state;
}
