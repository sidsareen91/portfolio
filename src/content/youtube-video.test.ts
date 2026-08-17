import assert from 'node:assert/strict';
import test from 'node:test';
import {getYouTubePosterUrl, getYouTubeVideoId} from './youtube-video';

test('extracts supported YouTube video URL formats', () => {
  const id = 'dQw4w9WgXcQ';
  assert.equal(getYouTubeVideoId(`https://www.youtube.com/watch?v=${id}`), id);
  assert.equal(getYouTubeVideoId(`https://youtu.be/${id}?si=example`), id);
  assert.equal(getYouTubeVideoId(`https://www.youtube.com/shorts/${id}`), id);
  assert.equal(getYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${id}`), id);
  assert.equal(getYouTubeVideoId(`https://www.youtube.com/live/${id}`), id);
});

test('rejects non-YouTube and malformed video URLs', () => {
  assert.equal(getYouTubeVideoId('https://vimeo.com/123456'), undefined);
  assert.equal(getYouTubeVideoId('https://youtube.example/watch?v=dQw4w9WgXcQ'), undefined);
  assert.equal(getYouTubeVideoId('https://www.youtube.com/watch?v=too-short'), undefined);
  assert.equal(getYouTubeVideoId('not a URL'), undefined);
});

test('builds a poster URL for a valid YouTube id', () => {
  assert.equal(
    getYouTubePosterUrl('dQw4w9WgXcQ'),
    'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  );
});
