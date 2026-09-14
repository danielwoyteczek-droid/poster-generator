# Mockup-Quellmaterial

Die PNGs in diesem Ordner liegen in Git. Die **Photoshop-Quelldatei nicht** —
sie ist mit 140 MB zu groß für das Repository und liegt stattdessen hier:

```
D:\OneDrive - UMOI GmbH\Dokumente - UMOI\Personalisierung\Petite-Moment\Mockups\frame-portait.psd
```

Dort ist sie über OneDrive gesichert. Das Repository selbst liegt bewusst
außerhalb von OneDrive, weil die Synchronisierung Gits Objektspeicher
beschädigen kann.

## Zur Schreibweise

Achtung, zwei Schreibweisen im Umlauf — beide sind so gewollt bzw. historisch
gewachsen und dürfen nicht „korrigiert" werden, ohne die Bezüge mitzuziehen:

| Datei | Schreibweise | Verwendung |
|---|---|---|
| `assets/mockups/frame-portait.*` | ohne `r` | Quellmaterial, Arbeitsdateien |
| `public/mockups/frame-portrait.png` | mit `r` | Laufzeit, referenziert in `src/lib/frame-mockup-config.json` |

Der Kommentar in `src/lib/frame-mockup.ts` nennt die Quelldatei mit `r`,
auf der Platte heißt sie ohne. Wer das anfasst, muss beide Seiten prüfen.
