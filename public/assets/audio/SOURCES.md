# TaskFlow audio sources

These files are bundled locally for Focus Desk. They are not streamed from the source sites.

| Local file | Source | Creator | Notes |
| --- | --- | --- | --- |
| `lofi-01.mp3` | https://pixabay.com/music/beats-lofi-study-calm-peaceful-chill-hop-112191/ | FASSounds | Pixabay Content License |
| `lofi-02.mp3` | https://pixabay.com/music/beats-good-night-lofi-cozy-chill-music-160166/ | FASSounds | Pixabay Content License |
| `rain-01.mp3` | https://pixabay.com/sound-effects/nature-calming-rain-loop-398653/ | DRAGON-STUDIO | Pixabay Content License |
| `rain-02.mp3` | https://pixabay.com/sound-effects/nature-gentle-rain-01-437305/ | DRAGON-STUDIO | Pixabay Content License |

Downloaded on 2026-08-26. Check the source page and current Pixabay terms before redistributing the project.

## Re-encode

Aset audio di-encode ulang agar ukuran unduhan wajar untuk bunyi latar yang
diputar pada volume rendah. Sumber aslinya 256 kb/s stereo (total 32,8 MB).

- `lofi-01`, `lofi-02`: durasi penuh dipertahankan, 96 kb/s stereo 44,1 kHz.
  Musik tidak dipotong supaya frasanya tidak terputus di tengah.
- `rain-01`: durasi penuh, 56 kb/s mono. Hujan adalah derau broadband, jadi
  mono tidak terdengar berbeda sebagai bunyi latar.
- `rain-02`: dipangkas dari 10 menit ke 4 menit, 56 kb/s mono. `src/lib/audio.js`
  memang merotasi antar aset saat event `ended`, jadi variasinya tetap ada.

Total sekarang 6,2 MB.
