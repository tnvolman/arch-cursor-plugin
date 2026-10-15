/**
 * Offline King James Version lookup.
 * No network, no API key, no charge.
 * Verse text: server/data/kjv.json (public domain; see README).
 */

import { readFileSync } from "node:fs";

const data = JSON.parse(
  readFileSync(new URL("./data/kjv.json", import.meta.url), "utf8")
);

if (!data || !Array.isArray(data.books) || data.books.length !== 66) {
  throw new Error("Bundled KJV data is invalid.");
}

const books = data.books;

const ALIASES = {
  Genesis: ["gen", "ge", "gn"],
  Exodus: ["exod", "exo", "ex"],
  Leviticus: ["lev", "le", "lv"],
  Numbers: ["num", "nu", "nm"],
  Deuteronomy: ["deut", "deu", "dt"],
  Joshua: ["josh", "jos", "jsh"],
  Judges: ["judg", "jdg", "jg", "jdgs"],
  Ruth: ["ruth", "rut", "ru", "rth"],
  "1 Samuel": ["1sam", "1sa", "1sm"],
  "2 Samuel": ["2sam", "2sa", "2sm"],
  "1 Kings": ["1kgs", "1ki", "1kg"],
  "2 Kings": ["2kgs", "2ki", "2kg"],
  "1 Chronicles": ["1chr", "1ch", "1chron"],
  "2 Chronicles": ["2chr", "2ch", "2chron"],
  Ezra: ["ezr"],
  Nehemiah: ["neh", "ne"],
  Esther: ["esth", "est", "es"],
  Job: ["job", "jb"],
  Psalms: ["psalm", "psalms", "ps", "psa", "psm", "pss"],
  Proverbs: ["prov", "pro", "pr", "prv"],
  Ecclesiastes: ["eccl", "ecc", "ec"],
  "Song of Solomon": [
    "song of solomon",
    "song of songs",
    "solomon's song",
    "song",
    "sng",
    "sos",
    "so",
    "canticles",
    "cant",
  ],
  Isaiah: ["isa", "is"],
  Jeremiah: ["jer", "je", "jr"],
  Lamentations: ["lam", "la"],
  Ezekiel: ["ezek", "eze", "ezk"],
  Daniel: ["dan", "da", "dn"],
  Hosea: ["hos", "ho"],
  Joel: ["joel", "joe", "jol", "jl"],
  Amos: ["amos", "amo", "am"],
  Obadiah: ["obad", "oba", "ob"],
  Jonah: ["jonah", "jon", "jnh"],
  Micah: ["mic", "mi"],
  Nahum: ["nah", "nam", "na"],
  Habakkuk: ["hab"],
  Zephaniah: ["zeph", "zep"],
  Haggai: ["hag", "hg"],
  Zechariah: ["zech", "zec"],
  Malachi: ["mal", "ml"],
  Matthew: ["matt", "mat", "mt"],
  Mark: ["mark", "mk", "mrk", "mr"],
  Luke: ["luke", "luk", "lk"],
  John: ["jn", "jhn", "joh", "jno"],
  Acts: ["act", "ac"],
  Romans: ["rom", "rm"],
  "1 Corinthians": ["1cor", "1co"],
  "2 Corinthians": ["2cor", "2co"],
  Galatians: ["gal", "ga"],
  Ephesians: ["eph"],
  Philippians: ["phil", "php", "phi"],
  Colossians: ["col"],
  "1 Thessalonians": ["1thess", "1th", "1thes"],
  "2 Thessalonians": ["2thess", "2th", "2thes"],
  "1 Timothy": ["1tim", "1ti"],
  "2 Timothy": ["2tim", "2ti"],
  Titus: ["tit"],
  Philemon: ["phlm", "phm", "philem"],
  Hebrews: ["heb"],
  James: ["jas", "jam"],
  "1 Peter": ["1pet", "1pe", "1pt"],
  "2 Peter": ["2pet", "2pe", "2pt"],
  "1 John": ["1jn", "1jo", "1joh", "1jhn"],
  "2 John": ["2jn", "2jo", "2joh", "2jhn"],
  "3 John": ["3jn", "3jo", "3joh", "3jhn"],
  Jude: ["jud"],
  Revelation: ["rev", "rv"],
};

const aliasToIndex = new Map();

function register(label, index) {
  const key = normalizeBook(label);
  if (!key) return;
  const existing = aliasToIndex.get(key);
  if (existing !== undefined && existing !== index) {
    throw new Error(
      'Book alias "' +
        label +
        '" matches both ' +
        books[existing].name +
        " and " +
        books[index].name
    );
  }
  aliasToIndex.set(key, index);
}

const nameToIndex = new Map();
for (let i = 0; i < books.length; i++) {
  if (!books[i] || typeof books[i].name !== "string" || !Array.isArray(books[i].chapters)) {
    throw new Error("Bundled KJV book entry is invalid at index " + i);
  }
  nameToIndex.set(books[i].name, i);
  register(books[i].name, i);
}

for (const [name, extras] of Object.entries(ALIASES)) {
  const index = nameToIndex.get(name);
  if (index === undefined) {
    throw new Error("Alias table names an unknown book: " + name);
  }
  for (const alias of extras) register(alias, index);
}

export function normalizeBook(raw) {
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/\./g, " ");
  s = s.replace(/^(1st|first)\b/, "1");
  s = s.replace(/^(2nd|second)\b/, "2");
  s = s.replace(/^(3rd|third)\b/, "3");
  s = s.replace(/^iii\b/, "3");
  s = s.replace(/^ii\b/, "2");
  s = s.replace(/^i\b/, "1");
  s = s.replace(/[^a-z0-9]/g, "");
  return s;
}

function tidyBook(book) {
  let s = book.trim();
  s = s.replace(/^(?:the\s+)?book\s+of\s+/i, "");
  s = s.replace(/^the\s+/i, "");
  return s.trim();
}

function prepareRef(input) {
  let s = String(input).trim();
  s = s.replace(
    /\s*[\(\[]\s*(?:kjv|king james(?: version)?)\s*[\)\]]\s*$/i,
    ""
  );
  s = s.replace(/\s+(?:kjv|king james(?: version)?)\s*$/i, "");
  s = s.replace(/[.,;]+$/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

const REF_RE = /^(.*?)(?:\s+)(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?\s*$/;

function fail(error) {
  return { ok: false, error };
}

function formatReference(book, chapter, start, end) {
  if (start === end) return book + " " + chapter + ":" + start;
  return book + " " + chapter + ":" + start + "-" + end;
}

/**
 * Look up a verse or same-chapter range.
 * @param {string} ref
 * @returns {{ ok: true, result: object } | { ok: false, error: string }}
 */
export function lookupKjv(ref) {
  if (typeof ref !== "string" || ref.trim() === "") {
    return fail(
      'kjv_lookup requires ref (string), for example "John 3:16" or "Romans 8:28-30".'
    );
  }

  const prepared = prepareRef(ref);
  const match = REF_RE.exec(prepared);
  if (!match || !match[1].trim()) {
    return fail(
      'Could not read "' +
        ref.trim() +
        '" as a Bible reference. Use one chapter and verse, for example "John 3:16" or "Romans 8:28-30".'
    );
  }

  const bookLabel = tidyBook(match[1]);
  const chapter = Number(match[2]);
  const verseStart = Number(match[3]);
  const verseEnd = match[4] === undefined ? verseStart : Number(match[4]);
  const key = normalizeBook(bookLabel);
  const index = aliasToIndex.get(key);

  if (index === undefined) {
    return fail(
      'Unknown book "' +
        bookLabel +
        '". Use a King James book name or a common abbreviation such as Jn, Rom, Ps, or 1 Cor.'
    );
  }

  const book = books[index];
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters.length) {
    return fail(
      book.name +
        " has no chapter " +
        match[2] +
        ". " +
        book.name +
        " has " +
        book.chapters.length +
        (book.chapters.length === 1 ? " chapter." : " chapters.")
    );
  }

  const verses = book.chapters[chapter - 1];
  if (!Array.isArray(verses) || verses.length === 0) {
    return fail(book.name + " " + chapter + " has no verses in the bundled text.");
  }

  if (!Number.isInteger(verseStart) || verseStart < 1 || verseStart > verses.length) {
    return fail(
      book.name +
        " " +
        chapter +
        " has no verse " +
        match[3] +
        ". " +
        book.name +
        " " +
        chapter +
        " has " +
        verses.length +
        (verses.length === 1 ? " verse." : " verses.")
    );
  }

  if (!Number.isInteger(verseEnd) || verseEnd < verseStart) {
    return fail(
      formatReference(book.name, chapter, verseStart, verseEnd) +
        " is not a valid range. The end verse must be the same as or after the start verse."
    );
  }

  if (verseEnd > verses.length) {
    return fail(
      book.name +
        " " +
        chapter +
        " has no verse " +
        match[4] +
        ". " +
        book.name +
        " " +
        chapter +
        " has " +
        verses.length +
        " verses."
    );
  }

  const picked = [];
  for (let verse = verseStart; verse <= verseEnd; verse++) {
    picked.push({ verse, text: verses[verse - 1] });
  }

  return {
    ok: true,
    result: {
      reference: formatReference(book.name, chapter, verseStart, verseEnd),
      translation: "KJV",
      edition: "1769",
      book: book.name,
      chapter,
      verse_start: verseStart,
      verse_end: verseEnd,
      verses: picked,
    },
  };
}
