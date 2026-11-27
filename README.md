# Tři válce

Výuková simulace pro práci s fyzickými žetony. Tři vážené kotouče se losují nezávisle. Za trojici stejných symbolů se vyplácí násobek pevné sázky podle výherní tabulky. Teoretická návratnost ve výchozím nastavení činí 90,3976 %.

## Spuštění

Otevři soubor index.html v aktuálním prohlížeči. Pro sdílení nahraj celý obsah této složky do repozitáře a v nastavení repozitáře zapni GitHub Pages ze složky s index.html. Všechny tři počítače mohou otevřít stejnou adresu. Každý má vlastní nastavení a vlastní kolo.

## MV Casino

Mobilní banka se otevírá samostatně přes `bank/index.html` nebo na GitHub Pages na adrese `/MVMaty/bank/`. Obnos a půjčky se ukládají v prohlížeči hráče.

Na začátku souboru `bank/bank.js` lze změnit počáteční obnos (`startingBalance`), heslo (`password`), požadavek na heslo (`requirePassword`) a sazbu půjček. `interestMode` nabízí rostoucí sazbu (`progressive`), pevnou sazbu (`fixed`) a půjčky bez úroku (`none`). Změna počátečního obnosu se použije při založení nové hry v prohlížeči. Heslo slouží jako obslužná pojistka v prohlížeči.

Půjčka ihned přidá žetony do celkového obnosu. Konečný peníz od obnosu odečte jistinu i úroky všech půjček.

## Obsluha

- Ozubeným kolem na úvodní obrazovce nastav hodnoty žetonů, cenu zatočení, výplaty za trojice a zobrazené údaje. V nastavení je také tlačítko pro spuštění a vypnutí hudby se zvukovými efekty. Volba zvuku se ukládá hned.
- Převezmi fyzické žetony a přes tlačítko Vložit žetony zadej jejich celkovou hodnotu.
- Hráč točí tlačítkem, Enterem nebo mezerníkem. Kolo lze ukončit tlačítkem vpravo nahoře. Pokud už kredit nestačí na sázku, otevře se souhrn automaticky.
- Vydej zobrazený zůstatek a potvrď výplatu. Pro přesné vyplacení měj po ruce dostatek žetonů nejmenší hodnoty.

## Výměna obrázků

Obrázky jsou ve složce assets/symbols. Pro výměnu zachovej název souboru a formát PNG. Výchozí obrázky jsou čtvercové, mají 256 × 256 px a průhledné pozadí.

| Soubor | Výchozí symbol | Výchozí výplata za trojici |
| --- | --- | ---: |
| cherry.png | Třešně | 12× |
| lemon.png | Citron | 15× |
| plum.png | Švestka | 25× |
| bell.png | Zvonek | 50× |
| star.png | Hvězda | 100× |
| diamond.png | Diamant | 250× |
| seven.png | Sedmička | 500× |

Pokud se změní i význam symbolu, uprav jeho český popis v seznamu symbols na začátku app.js. Prohlížeč tento popis používá místo obrázku při čtení obrazovky.
