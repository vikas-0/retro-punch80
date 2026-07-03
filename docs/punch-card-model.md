# How the virtual punch cards work

PUNCH/80 is a real **virtual punch-card simulation**: the program stores individual hole positions and reconstructs text from those holes. It does not read photographs, camera input, or physical cards.

The lights, moving scan beam, feed motion, and mechanical sounds are theatrical. The encoding and decoding underneath them are functional.

## What is simulated?

| Part | What PUNCH/80 does |
| --- | --- |
| Card data | Stores every punched position independently |
| Punching | Converts each source character into one or more holes |
| Manual editing | Adds or removes the selected hole from the card |
| Reading | Reconstructs characters from the current holes, column by column |
| Playback | Reads every card and joins the decoded lines into a program |
| Scanner movement | Animates the reader while the virtual card is processed |
| Physical input | Not implemented; there is no camera, image recognition, or card-reader hardware interface |

## The in-memory data structure

A deck is an array of card objects. Each card has an identifier, sequence number, original source line, and a JavaScript `Set` containing its holes:

```js
{
  id: "unique-id",
  sequence: 1,
  source: "A1",
  holes: new Set([
    "0:12",
    "0:1",
    "1:1"
  ])
}
```

Hole keys use this format:

```text
zero-based-column:row
```

For the example above:

- `0:12` and `0:1` are the two punches for `A` in displayed column 1.
- `1:1` is the single punch for digit `1` in displayed column 2.
- A `Set` prevents duplicate punches and makes checking, adding, and removing positions inexpensive.

The interface displays columns as 1–80, while the stored column indices are 0–79. Rows are stored using their printed card labels: `12`, `11`, `0`, and `1` through `9`.

The original `source` remains on the card so the simulator can animate punching, show a printed card label, and verify whether the holes still match the intended line. Reading does not use that field to produce its decoded output; it uses `holes`.

## Punching a line

Before encoding, a line is truncated to 80 characters and padded with spaces. The encoder then looks up the punch pattern for each character and adds keys such as `"23:12"` to the card's hole set.

The historically familiar portion of the mapping is:

| Character group | Punch pattern |
| --- | --- |
| Space | No punch |
| `0`–`9` | One punch in the matching numeric row |
| `A`–`I` | Row `12` plus rows `1`–`9` |
| `J`–`R` | Row `11` plus rows `1`–`9` |
| `S`–`Z` | Row `0` plus rows `2`–`9` |

For example, `A` is `12 + 1`, `J` is `11 + 1`, and `S` is `0 + 2`.

## The PUNCH/80 ASCII extension

Classic punch-card character sets vary by machine and were generally oriented toward uppercase text. Modern Fortran source needs lowercase letters and more punctuation, so PUNCH/80 adds a deliberately non-historical but reversible extension.

An extended character punches rows `12`, `11`, and `0` as a marker. Its seven-bit ASCII value is then represented in rows `1` through `7`. The three-row marker cannot be mistaken for one of the standard letter or digit patterns.

This is why the card footer says **ASCII EXTENDED**. It keeps modern source code round-trippable, but it should not be presented as an IBM keypunch encoding.

## Reading a card

The decoder performs the reverse operation:

1. Visit each of the 80 columns.
2. Collect the punched rows in that column from the hole set.
3. Match the row pattern to a standard Hollerith character.
4. If the `12 + 11 + 0` marker is present, decode rows `1`–`7` as ASCII bits.
5. Return `�` when a manually edited pattern is not recognized.
6. Remove trailing blank columns from the decoded line.

Manual edits therefore affect the result. If you unpunch part of an `A`, add an impossible combination, or punch a new character, **READ** and **PLAY DECK** will see the changed holes.

The scan beam advances across the card to visualize this operation. For performance and predictable animation timing, the current implementation decodes the complete in-memory hole set at the end of that scan rather than emulating an electrical sensor pulse at every position.

## Deck playback and Fortran

**PLAY DECK** reads each card from its holes and joins the resulting lines with newline characters. That reconstructed text becomes the playback capture.

After playback, **RUN FORTRAN** compiles the reconstructed program. If Fortran is run before a deck has been played, the application falls back to the source editor text. If holes are edited after playback, play the deck again before running it so the playback capture reflects the latest punches.

## JSON export format

JavaScript Sets are converted into arrays when a deck is exported:

```json
{
  "format": "PUNCH80-DECK/1",
  "cards": [
    {
      "sequence": 1,
      "source": "A1",
      "holes": ["0:12", "0:1", "1:1"]
    }
  ]
}
```

The source field is included as useful metadata; `holes` is the virtual punched medium.

## How historically accurate is the display?

Accurate or structurally faithful:

- 80 columns and 12 punch rows.
- The row order `12`, `11`, `0`, `1`–`9`.
- Standard uppercase-letter and digit patterns described above.
- The visible holes exactly mirror the positions in the stored hole set.
- Reading those visible positions produces the reconstructed line.

Stylized or extended:

- Lowercase and most punctuation use the custom ASCII extension.
- The machine enclosure, lighting, animation, sounds, card color, typography, and proportions are retro-futuristic rather than a replica of one historical model.
- The scanner animation represents card reading but does not model the electronics or mechanics of a specific reader.
- The card does not currently reserve columns for sequence numbers or reproduce one specific IBM 026/029 print layout.

In short: **the virtual medium and round trip are real, the standard alphanumeric mapping is historically grounded, and the modern character support plus machine presentation are playful extensions.**
