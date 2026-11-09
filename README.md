# sanah w liczbach

Nieoficjalny ranking sanah z automatycznie odkrywanym katalogiem oficjalnych nagrań. Interaktywny interfejs React + TypeScript + Vinext/Vite. Jasna, liliowa estetyka; wyszukiwanie, filtry platform, sortowanie i szczegóły nagrań.

## Stan integracji

- **YouTube:** działa codzienny pomiar Data API v3. Pierwsze rzeczywiste liczniki zapisano 9 listopada 2026. Workflow korzysta z sekretu `YOUTUBE_API_KEY`.
- **Spotify:** publiczne Web API nie zwraca całkowitej liczby odsłuchów. Rzeczywisty widok pokazuje brak danych; potrzebne odrębne źródło.
- **Demo:** osobny zestaw wymyślonych liczb. Nigdy nie jest łączony z prawdziwymi pomiarami. Do pierwszego pomiaru strona otwiera demo z wyraźnym oznaczeniem i przełącznikiem. Po uzyskaniu danych otwiera ranking YouTube.

**[Instrukcja aktywacji YouTube](docs/YOUTUBE_SETUP.md)**

## Uruchomienie

Publiczna strona: **https://kotymek.github.io/sanah/**.

Workflow `pages.yml` buduje i publikuje stronę po zmianach na `main`; można też uruchomić go ręcznie. W ustawieniach repozytorium Pages źródłem jest **GitHub Actions**.

Wersja GitHub Pages korzysta z tego samego interfejsu co Sites, lecz pobiera publiczny plik `data/youtube.json` bezpośrednio z GitHuba. Nie potrzebuje serwera ani klucza API w przeglądarce. Zapasem jest pomiar dołączony do kompilacji. Codzienne aktualizacje liczników nie wymagają ponownej publikacji.

```sh
npm run build:pages
npm run preview:pages
```

Wynik kompilacji znajduje się w `dist-pages/`, z bazową ścieżką `/sanah/`.

Wymagany Node.js 24 LTS lub nowszy (skrypty danych korzystają z wbudowanej obsługi TypeScript).

```sh
npm run install:ci
npm run dev
```

```sh
npm test
npm run typecheck
npm run build
```

Testy danych nie wymagają klucza ani dostępu do sieci. Sprawdzają błędy API, brak liczników, prawdziwe zero, duplikaty, historię, korekty i rozdzielenie demo od pomiarów.

## Przepływ danych

1. Katalog jest codziennie odkrywany z oficjalnych kanałów i playlist. `data/catalog.json` łączy utwory z ich oficjalnymi nagraniami. Zobacz [zasady katalogu](docs/CATALOG.md).
2. `npm run sync:youtube`: zapytania po maks. 50 ID, klucz wyłącznie w nagłówku, bez wywołań API z przeglądarki.
3. `data/youtube.json`: aktualny pomiar i maksymalnie 14 dni wcześniejszych obserwacji, nie więcej niż jedna na dzień UTC. Zapis atomowy po powodzeniu wszystkich zapytań.
4. GitHub Actions zapisuje dane na `main`. Bez klucza pomija pobieranie i podaje instrukcję w podsumowaniu.
5. `GET /api/ranking` pobiera publiczny JSON z `kotymek/sanah/main`, waliduje go i zwraca status. Dzięki temu aktualizacja danych nie wymaga nowego wdrożenia Sites. Zapasem jest ostatni pomiar dołączony do kompilacji.
6. Interfejs pobiera dane raz przy wejściu. Cache odpowiedzi może opóźnić aktualizację o kilka minut. Ponowne wejście/odświeżenie pobiera nowy stan.

## Zasady

Sumujemy przypisane oficjalne nagrania tego samego utworu, z deduplikacją ID. Wersje koncertowe, fortepianowe i remiksy są oddzielnymi pozycjami. Każdy liczony film ma link w szczegółach. Gościnne nagrania poza monitorowanymi źródłami mogą wymagać ręcznego dodania. Zmiana tygodniowa porównuje ten sam ID z obserwacją sprzed 7 dni, z tolerancją 12 godzin. Bez odpowiedniej obserwacji pokazujemy kreskę. Ujemnych korekt nie ukrywamy.

Nieznane wartości mają `null`, nigdy zero. Łączna liczba dla obu platform istnieje tylko wtedy, gdy oba liczniki są dostępne. Pomiary starsze niż 48 godzin są oznaczane jako nieaktualne; starsze niż 30 dni nie są wyświetlane. Przy niedostępnym filmie pojawia się brak danych, a przy awarii całego zapytania nie nadpisujemy poprzedniego pliku.

`data/demo.json` przechowuje wyłącznie fikcyjne statystyki. Grafiki są autorskimi symbolami, a nie okładkami albumów.

## Dalsze zmiany

Przed kolejną edycją pobierz `main` (`git pull --ff-only`): workflow może dodać nowe commity z danymi. Nigdy nie nadpisuj ich force-pushem. Endpoint wymaga publicznego odczytu pliku GitHub; po zmianie repozytorium na prywatne trzeba zmienić sposób dostarczania danych.
