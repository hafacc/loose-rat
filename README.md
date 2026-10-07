# Loose RAT

[![build](https://github.com/hafacc/loose-rat/actions/workflows/build.yml/badge.svg)](https://github.com/hafacc/loose-rat/actions/workflows/build.yml)

A helper for creating loose [RATs](https://en.wikipedia.org/wiki/Remote_Associates_Test), with selectable dialects for looser phonetic matching.

Live at [looserat.hafa.cc](https://looserat.hafa.cc/).

## Development

```sh
bun install
bun dev        # serve locally
bun lint       # type check, lint and format check
bun test
bun run build  # write the site to dist/
bun run data   # rebuild the word list from its sources
```

Pronunciations come from [ipa-dict](https://github.com/open-dict-data/ipa-dict)'s American English list and word order from Peter Norvig's [web unigram counts](https://norvig.com/ngrams/). Dialect rules are taken from Wikipedia's [sound correspondences between English accents](https://en.wikipedia.org/wiki/Sound_correspondences_between_English_accents).

The icon is adapted from the rat in Microsoft's [Fluent UI Emoji](https://github.com/microsoft/fluentui-emoji), used under the MIT license.

## ToDo

- [ ] fix keyboard scroll behavior on iOS - may not be possible
- [ ] add option to disable second part being a word
- [ ] let the second part be several words, and let the typed word sit in the middle of a longer one
- [ ] add better dictionary
