# P — rozšířená kalkulačka pro VZT / vodu / topení

Do modulu kalkulačky byly doplněny nové funkce:

## 1. Tvarovky a doměry
- výpočet změny osy
- výpočet vnitřního, středního a vnějšího doměru
- výpočet rozvinuté délky
- podpora pro:
  - hranaté potrubí
  - kruhové potrubí
  - rovný kus
  - koleno
  - odsazení
  - přechod / redukci
- výpočet plochy plechu
- výpočet hmotnosti
- orientační spotřeba šroubů, pásky, nýtů a tmelu
- doporučení na přístupová dvířka

## 2. Průtok na dimenzi
- zadání průtoku v m3/h
- zadání cílové rychlosti
- výpočet potřebného průřezu
- návrh kruhové dimenze
- návrh hranaté dimenze
- ekvivalentní kruhová dimenze

## 3. Tlaková ztráta trasy
- délka trasy
- kolena 90° a 45°
- T-kusy
- ventily
- redukce
- výpočet rychlosti proudění
- hydraulický průměr
- Reynoldsovo číslo
- třecí faktor
- ztráta na délce
- ztráta na armaturách
- celková tlaková ztráta
- ztráta na metr

## 4. Médium
Kalkulačka podporuje tři režimy:
- VZT / vzduchotechnika
- voda
- topení

Pro každé médium jsou použité odlišné výchozí hodnoty hustoty, viskozity, drsnosti a doporučených rychlostí.

## 5. Backend rozšíření
Backend ukládá také:
- width2
- height2
- offset
- note

To znamená, že uložené prvky z kalkulačky už umí nést informaci o přechodu, změně osy a textový souhrn výpočtu.
