# Katalog nagrań

Katalog jest odkrywany codziennie przed pomiarem. Źródła: oficjalny kanał `sanah`, kanał `sanahVEVO` (identyfikowany przez właściciela zweryfikowanego teledysku) i `sanah - Topic` (identyfikowany przez zweryfikowane wydanie audio). Pobierane są wszystkie dostępne strony list publikacji i publicznych playlist. Dla Topic, które nie udostępnia playlisty uploads, używamy `search.list` ograniczonego do tego kanału. Ten endpoint ma ograniczenie do 500 nagrań kanału; obecny import mieści się poniżej limitu. Nie oznacza to gwarancji kompletności wszystkich współprac na cudzych kanałach.

## Przetwarzanie

1. `scripts/discover-youtube.mjs` zapisuje identyfikatory, tytuły, kanały, czas trwania i metadane wydania w `data/youtube-discovery.json`. Nie zapisuje klucza, tekstów piosenek ani pełnych opisów filmów.
2. `scripts/build-catalog.mjs` rozpoznaje tytuły i wydania, łączy teledysk z oficjalnym audio i lyric video. Wersje koncertowe, fortepianowe, instrumentalne, demo artystki i remiksy pozostają oddzielnymi pozycjami. Każdy ID występuje tylko raz w całym katalogu.
3. Promocje, relacje i pełne albumy w jednym filmie są odnotowane z uzasadnieniem w `data/catalog-excluded.json`. Krótkie utwory albumowe (np. Coda, Interludium) pozostają w rankingu.
4. `scripts/sync-youtube.mjs` pobiera liczniki wszystkich przypisanych filmów. Zmiany są commitowane dopiero po powodzeniu całego przebiegu. Zapis uruchamia publikację Pages, aby strona znała nowe utwory.

`data/catalog-curated.json` zachowuje zweryfikowane ręcznie metadane i identyfikatory pierwotnych utworów, w tym współpracę na kanale Sobla. `data/catalog-overrides.json` przechowuje korekty tytułów i wyłączenia. Pozostałe dane są generowane. Korekty rozpoznawania powinny trafić do tych reguł, nie tylko do pliku wynikowego.

## Liczenie

Wynik utworu jest sumą liczników jego oficjalnych filmów — nie liczbą unikalnych słuchaczy. Szczegóły na stronie pokazują każdy film, kanał i licznik. Nie sumujemy ponownie tego samego ID znalezionego na wielu playlistach. Jeżeli niektóre filmy nie mają licznika, podajemy znaną sumę i oznaczenie częściowego wyniku w szczegółach. Wzrost tygodniowy wymaga pomiaru sprzed 7 dni dla wszystkich obecnych filmów w pozycji; dodanie nowego filmu nie generuje fikcyjnego wzrostu.

## Obsługa

Ręczne pełne odświeżenie: Actions → **Aktualizuj statystyki YouTube** → Run workflow. Osobny workflow **Odkryj katalog YouTube** służy tylko do inspekcji źródeł.

Dokumentacja API: [channels.list](https://developers.google.com/youtube/v3/docs/channels/list), [playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list), [search.list](https://developers.google.com/youtube/v3/docs/search/list).
