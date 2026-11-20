# Responsible AI Practices — FasalBondhu AI

## 1. Integrated Pest Management (IPM) First
FasalBondhu AI instructs its AI diagnostic prompts to prioritize cultural, mechanical, and low-cost organic/biological interventions (such as draining standing water, removing infected leaves, pheromone traps, neem extract, and balanced urea/potash fertilization) before recommending chemical pesticides. Whenever a chemical option is mentioned, the guidance includes personal protective equipment (PPE) reminders and pre-harvest safety intervals.

## 2. Transparency & Uncertainty Communication
- AI crop diagnoses always display a confidence rating and explicitly encourage farmers to confirm severe outbreaks with their local Upazila Agriculture Office or DAE Helpline (`16123` Krishi Call Center in Bangladesh).
- Live telemetry badges clearly state whether metrics come from live Open-Meteo/NASA POWER feeds or BAMIS seasonal baselines.

## 3. Farmer Data Privacy
- Uploaded crop photos are processed in-memory to generate the diagnostic report and are not stored on remote servers or used to profile individual farmers.
- Saved field logs remain strictly on the user's own device (`localStorage`) and can be cleared at any time.

## 4. Accessibility & Linguistic Inclusion
- Core guidance is delivered in plain, everyday Bangla free of unnecessary academic jargon so smallholder farmers can act immediately.
- Visual risk alerts pair high-contrast colors with explicit Bangla/English text labels so color-vision deficiencies never obscure warnings.
