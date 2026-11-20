# Data Sources & Agro-Climatic Provenance

FasalBondhu AI combines open scientific APIs with Bangladesh national agricultural reference baselines.

## 1. NASA POWER (Prediction Of Worldwide Energy Resources)
- **Endpoint**: `https://power.larc.nasa.gov/api/temporal/daily/point`
- **Parameters Used**:
  - `ALLSKY_SFC_SW_DWN` — All-sky surface shortwave downward irradiance ($\text{MJ/m}^2/\text{day}$) for solar energy and evapotranspiration context
  - `RH2M` — Relative humidity at 2 meters (%)
  - `PRECTOTCORR` — Bias-corrected daily precipitation ($\text{mm/day}$)
- **License / Attribution**: Public domain scientific data provided by NASA Langley Research Center (LaRC) POWER Project.

## 2. Open-Meteo Agro-Weather API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Parameters Used**: Daily max/min temperature, precipitation sum, max wind speed, relative humidity, and FAO-56 reference evapotranspiration (`et0_fao_evapotranspiration`).
- **Role**: Provides live 7-day district forecasts across 12 Bangladesh agricultural hubs.

## 3. BAMIS, BRRI, BARI & BARC Agro-Ecological Zones (AEZ)
- **Reference Sources**:
  - Bangladesh Agro-Meteorological Information System (BAMIS) — Department of Agricultural Extension (DAE)
  - Bangladesh Rice Research Institute (BRRI) — Boro/Aman variety maturity and tolerance profiles (e.g., BRRI dhan89, BRRI dhan52, BRRI dhan47)
  - Bangladesh Agricultural Research Institute (BARI) — Potato, wheat, mustard, maize, and tomato agronomic windows
  - Bangladesh Institute of Nuclear Agriculture (BINA) — Salt- and stress-tolerant cultivars (e.g., BINA dhan-10)
- **Fallback Role**: When external network calls are unavailable, district seasonal baselines derived from BAMIS/AEZ climatology are used and explicitly labeled in the UI.
