# Włączenie rzeczywistych statystyk YouTube

Integracja jest gotowa do konfiguracji. Nie trzeba przekazywać klucza w czacie ani umieszczać go w kodzie strony.

## 1. Utwórz klucz w Google Cloud

1. Otwórz [Google Cloud Console](https://console.cloud.google.com/), utwórz lub wybierz swój projekt.
2. W **APIs & Services → Library** znajdź **YouTube Data API v3** i włącz usługę.
3. W **APIs & Services → Credentials → Create credentials → API key** utwórz klucz.
4. W ograniczeniach API ogranicz go do **YouTube Data API v3**. Ten klucz będzie używany przez proces serwerowy GitHub Actions, więc ograniczenie do odsyłaczy stron WWW nie pasuje do tego sposobu pracy. Domyślne hostowane runnery GitHub nie mają jednego stałego adresu IP. Pozostaw ograniczenia aplikacji zgodne ze swoim środowiskiem i kontroluj limity API w Google Cloud.
5. Skopiuj klucz tylko do sekretu GitHub poniżej. Nie zapisuj go w repozytorium, issue ani logach.

[Oficjalny przewodnik Google](https://developers.google.com/youtube/v3/getting-started)

## 2. Dodaj sekret repozytorium

Otwórz [Settings → Secrets and variables → Actions](https://github.com/kotymek/sanah/settings/secrets/actions), wybierz **New repository secret**:

- **Name:** `YOUTUBE_API_KEY`
- **Secret:** klucz utworzony w Google Cloud

Zapisz przyciskiem **Add secret**. Zwykła zmienna repozytorium nie zastąpi sekretu.

[Instrukcja GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

## 3. Wykonaj pierwszy pomiar

1. Otwórz [workflow „Aktualizuj statystyki YouTube”](https://github.com/kotymek/sanah/actions/workflows/youtube-stats.yml).
2. Wybierz **Run workflow**, gałąź **main**, ponownie **Run workflow**.
3. Po powodzeniu kroku **Pobierz liczniki** w repozytorium pojawi się commit `data: update YouTube statistics`. Plik [data/youtube.json](../data/youtube.json) będzie zawierał datę `fetchedAt` i rzeczywiste liczniki.
4. Odśwież [stronę rankingu](https://sanah-ranking-kotymek.leszekmarkiewicz92.chatgpt.site). Podgląd Sites jest prywatny i może wymagać logowania przez ChatGPT. Po odczycie nowego pliku strona automatycznie przejdzie do danych YouTube. Cache może potrzebować kilku minut.
5. Sprawdź w szczegółach jednego utworu datę pomiaru i link do liczonego filmu.

**Zielony workflow bez klucza nie oznacza wykonanego pomiaru.** W takim przypadku podsumowanie informuje o braku sekretu, a kroki aktualizacji są pominięte.

## 4. Aktualizacje i historia

Harmonogram: codziennie o **06:17 UTC**, czyli **07:17 zimą / 08:17 latem w Polsce**. GitHub może opóźnić uruchomienie. Zaplanowane workflow mogą być wyłączane po dłuższej nieaktywności publicznego repozytorium; stan sprawdzisz w zakładce Actions.

Przyrost tygodniowy pojawi się po zebraniu pomiarów obejmujących około siedmiu dni. Nie tworzymy sztucznej historii. Licznik YouTube może być korygowany w dół, dlatego zmiana może być ujemna.

Harmonogram i przycisk ręczny korzystają z tego samego procesu. Dane pobierane są poza stroną, więc otwieranie rankingu przez odwiedzających nie zużywa limitu YouTube API. Dla obecnych 12 nagrań wystarcza jedno wywołanie `videos.list` na aktualizację; zgodnie z dokumentacją koszt wywołania to 1 jednostka limitu.

[Dokumentacja videos.list](https://developers.google.com/youtube/v3/docs/videos/list)

## Problemy

| Objaw | Co sprawdzić |
| --- | --- |
| Brak klucza w podsumowaniu | Nazwa `YOUTUBE_API_KEY`, typ **repository secret**, właściwe repozytorium |
| HTTP 400/403 | Poprawność klucza, aktywacja YouTube Data API v3, ograniczenia klucza i dostępny limit |
| Błąd `git push` | Czy GitHub Actions ma prawo zapisu do `main`; reguły chronionej gałęzi mogą wymagać osobnej ścieżki przez PR |
| Pomiar zapisany, strona pokazuje demo | Publiczny dostęp do pliku na `main`, kilka minut na cache, odświeżenie strony |
| Kreska dla jednego utworu | Film niedostępny albo API nie zwróciło licznika; ID jest w `data/catalog.json` |
| Kreska przy zmianie 7 dni | Brak pomiaru sprzed 7 dni z tolerancją 12 godzin |
| Stare dane | Sprawdź ostatnie uruchomienie Actions; awaria nie usuwa ostatniego poprawnego pomiaru |

Workflow jawnie prosi o `contents: write`. Jeżeli polityka konta lub reguły gałęzi blokują zapis, nie wyłączaj ich automatycznie — dostosuj sposób zapisu do polityki repozytorium. Proces nie używa force-push; przy równoczesnej zmianie `main` zapis może się nie udać. Uruchom workflow ponownie, aby pobrał aktualną gałąź.

## Rozszerzanie katalogu

Edytuj `data/catalog.json`: unikalny `id`, tytuł, album, opcjonalny gość i **dokładne `youtubeId`** oficjalnego filmu. Identyfikator znajduje się po `v=` w adresie YouTube. Sprawdź wykonawcę i wersję utworu. Ten sam film nie może należeć do dwóch wpisów. Po zmianie ID historia dla poprzedniego filmu nie jest używana do wyliczania przyrostu nowego.

Obecny katalog wskazuje 12 nagrań rozpoznanych na oficjalnych stronach YouTube; „Siebie zapytasz” jest dodatkowo powiązane z filmem w [komunikacie wytwórni](https://media.universalmusic.pl/59360-siebie-zapytasz-druga-odslona-talentu-sanah). Nie obejmuje wszystkich publikacji sanah.

## Spotify i pozostałe platformy

Publiczne [Spotify Web API — Get Track](https://developer.spotify.com/documentation/web-api/reference/get-track) nie zwraca całkowitej liczby odtworzeń. Nie zastępuj jej wskaźnikiem popularności ani danymi demo. Do uruchomienia tej części potrzebne jest osobne wiarygodne źródło i uzgodniony sposób aktualizacji.

## Lokalnie

Skrypt odczytuje `YOUTUBE_API_KEY` ze środowiska procesu. Jeżeli zarządzasz lokalnymi sekretami, możesz uruchomić `npm run sync:youtube`; wynik zapisze się w `data/youtube.json`. Sam skrypt nie publikuje danych na GitHub. Używaj menedżera sekretów lub lokalnej konfiguracji, która nie trafia do Git. Testy (`npm test`) nie potrzebują klucza.
