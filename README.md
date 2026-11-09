# sanah w liczbach

Polski, responsywny prototyp rankingu utworów sanah. **Wszystkie statystyki są demonstracyjne**, a grafiki utworów są autorskimi symbolami, nie okładkami. Brak integracji z API i automatycznego odświeżania danych.

## Uruchomienie

Node.js 22.13+ (lub nowszy wspierany przez zależności).

```sh
npm run install:ci
npm run dev
```

## Funkcje

- Filtry: razem, YouTube i Spotify.
- Wyszukiwanie po tytule, albumie i wykonawcy.
- Sortowanie po odtworzeniach, tytule i łącznym przyroście w 7 dni.
- Szczegóły utworu oraz link do wyszukiwania na YouTube.
- Widok mobilny, obsługa klawiatury i ograniczenia animacji.

React + TypeScript + Vinext/Vite, starter Sites. Widok: `app/page.tsx`; style: `app/globals.css`. Przykładowe dane są w tablicy `songs` w `app/page.tsx`. Ranking, sumy i liderzy są z niej wyliczani. Numer pozycji odpowiada liczbie odtworzeń na wybranej platformie niezależnie od sortowania.

```sh
npx tsc --noEmit
npm run build
```

Projekt nieoficjalny, niezwiązany z artystką ani platformami. Przed uruchomieniem rzeczywistego rankingu należy uzgodnić źródła danych i sposób łączenia wersji utworów.
