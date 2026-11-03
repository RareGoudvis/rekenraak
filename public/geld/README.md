# Euro banknote fronts (Bordmodus "Echt" money style)

Official ECB specimen images, fronts only, downscaled to 480 px wide JPEG (quality 0.82).
Downloaded 2026-11-03 from the ECB "Banknotes: images" page
(https://www.ecb.europa.eu/euro/banknotes/images/html/index.en.html), 72 dpi specimen sets:

- eur-5, 10, 20, 50, 100, 200 (Europa series, "with Draghi signature"):
  https://www.ecb.europa.eu/euro/shared/img/Banknotes%20ES2%20Specimen%2072dpi.zip
- eur-500 (first series; the 500 was never issued in the Europa series):
  https://www.ecb.europa.eu/euro/shared/img/Banknotes%20ES1%20Specimen%2072dpi.zip

Reproduction rule (ECB, electronic reproductions): low resolution and the word SPECIMEN
diagonally across the note. These are the ECB's own 72 dpi specimen files, which carry that mark
baked in, so `RealBill` (src/board/components/widgets/GeldItemWidget.tsx) draws no extra overlay.
Do not replace these files with unmarked or higher-resolution versions.

# Euro coin faces (Bordmodus "Echt" money style)

ECB images of the common (European) side of the eight euro coins, from the ECB euro coins page
(https://www.ecb.europa.eu/euro/coins/common/html/index.en.html), downloaded 2026-11-03,
files under https://www.ecb.europa.eu/euro/coins/common/shared/img/ . The current common side
(the 2007 design) is used where the ECB shows two designs (10c, 20c, 50c, EUR 1, EUR 2).
Each 540 px source was cropped to the coin, clipped to a circle with a transparent
background, scaled to 200 px and palette-quantized (PNG, about 22 kB each):

- coin-1.png   common_1cent_800.jpg
- coin-2.png   common_2cent_800.jpg
- coin-5.png   common_5cent_800.jpg
- coin-10.png  new10common.png
- coin-20.png  newcommon_20cent_800.jpg
- coin-50.png  newcommon_50cent_800.jpg
- coin-100.png newcommon_1euro_800.jpg
- coin-200.png newcommon_2euro_800.jpg

# Banknotes without the specimen mark

Checked 2026-11-03: the ECB publishes banknote images only with the word SPECIMEN (72 dpi zips and
the 300 dpi set on request, both marked; its reproduction rule says the word must run diagonally
across the reproduction). No unmarked ECB files exist, so the bill files are unchanged.
