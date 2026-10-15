import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupKjv } from "../server/kjv.mjs";

const JOHN_3_16 =
  "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";

test("single verse: John 3:16", () => {
  const found = lookupKjv("John 3:16");
  assert.equal(found.ok, true);
  assert.equal(found.result.reference, "John 3:16");
  assert.equal(found.result.translation, "KJV");
  assert.equal(found.result.book, "John");
  assert.equal(found.result.chapter, 3);
  assert.equal(found.result.verse_start, 16);
  assert.equal(found.result.verse_end, 16);
  assert.deepEqual(found.result.verses, [{ verse: 16, text: JOHN_3_16 }]);
});

test("range: Romans 8:28-30", () => {
  const found = lookupKjv("Romans 8:28-30");
  assert.equal(found.ok, true);
  assert.equal(found.result.reference, "Romans 8:28-30");
  assert.equal(found.result.book, "Romans");
  assert.equal(found.result.chapter, 8);
  assert.equal(found.result.verse_start, 28);
  assert.equal(found.result.verse_end, 30);
  assert.deepEqual(
    found.result.verses.map((verse) => verse.verse),
    [28, 29, 30]
  );
  assert.equal(
    found.result.verses[0].text,
    "And we know that all things work together for good to them that love God, to them who are the called according to [his] purpose."
  );
  assert.equal(
    found.result.verses[1].text,
    "For whom he did foreknow, he also did predestinate [to be] conformed to the image of his Son, that he might be the firstborn among many brethren."
  );
  assert.equal(
    found.result.verses[2].text,
    "Moreover whom he did predestinate, them he also called: and whom he called, them he also justified: and whom he justified, them he also glorified."
  );
});

test("numbered book: 1 John 4:8", () => {
  const found = lookupKjv("1 John 4:8");
  assert.equal(found.ok, true);
  assert.equal(found.result.reference, "1 John 4:8");
  assert.equal(found.result.book, "1 John");
  assert.deepEqual(found.result.verses, [
    { verse: 8, text: "He that loveth not knoweth not God; for God is love." },
  ]);

  const abbreviated = lookupKjv("1 Jn 4:8");
  assert.equal(abbreviated.ok, true);
  assert.equal(abbreviated.result.reference, "1 John 4:8");
  assert.deepEqual(abbreviated.result.verses, found.result.verses);
});

test("common abbreviation: Jn 3:16", () => {
  const found = lookupKjv("Jn 3:16");
  assert.equal(found.ok, true);
  assert.equal(found.result.reference, "John 3:16");
  assert.equal(found.result.verses[0].text, JOHN_3_16);
});

test("bad book", () => {
  const found = lookupKjv("Hezekiah 1:1");
  assert.equal(found.ok, false);
  assert.match(found.error, /Unknown book "Hezekiah"/);
  assert.equal(found.result, undefined);
});

test("bad chapter and bad verse", () => {
  const chapter = lookupKjv("John 99:1");
  assert.equal(chapter.ok, false);
  assert.match(chapter.error, /John has no chapter 99/);
  assert.match(chapter.error, /John has 21 chapters/);

  const verse = lookupKjv("John 3:99");
  assert.equal(verse.ok, false);
  assert.match(verse.error, /John 3 has no verse 99/);
  assert.match(verse.error, /John 3 has 36 verses/);
});
