# AI Model Card — FasalBondhu AI

## Model Details
- **Primary Multimodal & Language Model**: Google Gemini (`gemini-4-hydrogen`) accessed via server-side `@google/genai` SDK.
- **Deterministic Agro-Models**:
  - **FAO-56 Crop Water Balance**: Computes $ET_c = K_c \times ET_0$, effective rainfall ($P_{eff}$), net irrigation depth (mm), and field volume in liters per Bangladeshi decimal ($1\text{ decimal} = 40.47\text{ m}^2$).
  - **Climate Risk Trigger Engine**: Rule-based threshold model evaluating 7-day rainfall intensity, heat stress ($\ge 35^\circ\text{C}$), fungal humidity pressure ($\ge 82\%$ RH with warm nights), and wind gusts.
  - **Crop Suitability Ranker**: Multi-factor scorer weighting Bangladesh cropping season, soil texture, pH window, salinity resilience, and flood tolerance.

## Intended Use
- Assist smallholder farmers and Sub-Assistant Agricultural Officers (SAAOs) in Bangladesh with rapid first-pass visual triage of common leaf/stem diseases and pests.
- Translate technical climate forecasts into plain, practical Bangla field steps.

## Out-of-Scope Uses & Limitations
- **Not a laboratory diagnostic replacement**: Blurry, low-light, or distant crop photos can lead to misidentification between nutrient deficiencies (e.g., nitrogen/zinc) and viral or fungal pathogens.
- **Chemical dosage verification**: AI-generated treatment suggestions must always be cross-checked against local Department of Agricultural Extension (DAE) guidelines and pesticide label instructions.
- **Micro-climate variance**: District-level coordinates cannot capture single-plot elevation differences or sudden flash embankments breaches.

## Evaluation Methods
- Deterministic agro-meteorological rules are unit-tested via `node:test` (`src/lib/agroEngine.test.ts`).
- Multimodal prompts enforce structured JSON schemas (`responseSchema`) so severity, Bangla guidance, organic/IPM priorities, and safety wait periods are consistently rendered.
