# Offline food catalogue

The original 1,271 entries retain Indian regional dishes, recipe models and Western foods. Recipe estimates remain editable and are not laboratory measurements.

The global expansion uses public-domain USDA FoodData Central SR Legacy (April 2018) and FNDDS 2021–2023 (released October 2024), downloaded from https://fdc.nal.usda.gov/download-datasets/. Attribution: U.S. Department of Agriculture, Agricultural Research Service, FoodData Central. https://fdc.nal.usda.gov/

`scripts/import-usda.cjs` imports only records with reported nonnegative kcal, protein, carbohydrate and fat. It excludes duplicate names, infant foods and human milk, and preserves preparation descriptions. Missing fibre stays unknown, not an invented zero. Nutrient identifiers are 1008 (kcal), 1003 (protein), 1005 (carbohydrate), 1004 (fat), and 1079 (fibre). Their basis is 100 g edible portion. When an explicit USDA count-to-gram portion is usable, the app scales the reference nutrients and offers both pieces and grams. Other records use grams and servings; grams are never treated as mL.

`src/usdaImportReport.json` records source-file SHA-256 checksums and counts. `src/usdaFoods.json` contains compact rows: FDC ID, original name, kcal, protein, carbohydrate, fat, fibre or null, category, source dataset, and optional household description with gram weight. Source archives stay outside Git and outside the APK.

Indian entries remain first in search and browsing. The Global database filter exposes the imported records. Search indexes descriptions and aliases once; results are displayed 30 at a time. Selected meals retain a source note and FDC ID. This catalogue works offline without keys, subscriptions or API requests. A source record describes its particular food and preparation; it is not an exact measurement of the user's meal.

## Branded expansion

Expanded on 2026-10-07 to 38,000 distinct labelled products, bringing the combined offline catalogue to 51,988 entries. The selection covers 11,133 brands and 196 product categories, with the same deduplication, complete-macro requirements, brand/category caps and source provenance. Indian recipes remain first; these additional entries are global packaged foods, not 50,000 Indian dishes.

`scripts/import-branded.py` streams a diverse subset from the official USDA April 2026 branded JSON archive without expanding or loading the multi-gigabyte source into memory. Brand and product description are retained in the displayed name. Missing required macros, infant foods, supplements and explicitly discontinued records are excluded. Normalized name-and-brand duplicates are removed; each brand contributes at most 60 products and each category at most 1,200. `src/brandedImportReport.json` records the archive URL, checksum, count and selection rule. This is a global packaged-product selection, not a claim of 25,000 Indian recipes.

Branded nutrient values originate from manufacturer labels, rather than laboratory measurements of the user's meal. Values use USDA's per-100-g basis. A gram-denominated label serving is retained as a reference serving and scales to grams; mL-labelled servings are not converted to grams without density data. The app's Packaged foods filter shows these records. Check the current packet because product formulas and labels can change.
