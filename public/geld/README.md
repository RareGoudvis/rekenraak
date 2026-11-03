# Euro banknote fronts (Bordmodus "Echt" money style)

Official ECB specimen images, fronts only, downscaled to 480 px wide JPEG (quality 0.82).
Downloaded 2026-11-03 from the ECB "Banknotes: images" page
(https://www.ecb.europa.eu/euro/banknotes/images/html/index.en.html), 72 dpi specimen sets:

- eur-5, 10, 20, 50, 100, 200 (Europa series, "with Draghi signature"):
  https://www.ecb.europa.eu/euro/shared/img/Banknotes%20ES2%20Specimen%2072dpi.zip
- eur-500 (first series; the 500 was never issued in the Europa series):
  https://www.ecb.europa.eu/euro/shared/img/Banknotes%20ES1%20Specimen%2072dpi.zip

Reproduction rule (ECB, electronic reproductions): low resolution and the word SPECIMEN
diagonally across the note, about 75 % of its width. The ECB files already carry a baked-in
"specimen"; the board additionally draws a CSS SPECIMEN overlay in `RealBill`
(src/board/components/widgets/GeldItemWidget.tsx) so it survives any crop of the widget.
Do not remove that overlay and do not replace these files with higher-resolution versions.
