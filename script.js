//script 1
const video = document.getElementById('video');
    const playBtn = document.getElementById('playBtn');
    const muteBtn = document.getElementById('muteBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const timelineBar = document.getElementById('timelineBar');
    const timelineFill = document.getElementById('timelineFill');
    const timelineBuffered = document.getElementById('timelineBuffered');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const pipBtn = document.getElementById('pipBtn');
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const channelList = document.getElementById('channelList');
    const infoChannel = document.getElementById('infoChannel');
    const infoClock = document.getElementById('infoClock');

    let previousVolume = 0.5;
    let hls = new Hls();
    let currentChannelUrl = ''; // Tambahkan variabel global
    let channels = [];

    function updateTokyoClock() {
      const now = new Date();
      const options = { timeZone: 'Asia/Tokyo' };
      const tokyo = new Date(now.toLocaleString('en-US', options));
      const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const h = hari[tokyo.getDay()];
      const tgl = tokyo.getDate().toString().padStart(2, '0');
      const bln = bulan[tokyo.getMonth()];
      const thn = tokyo.getFullYear().toString().slice(-2);
      const jam = tokyo.getHours().toString().padStart(2, '0');
      const menit = tokyo.getMinutes().toString().padStart(2, '0');
      const text = `Tokyo, ${h} ${tgl} ${bln} ${thn}, ${jam}:${menit}`;
      infoClock.textContent = text;
    }
    setInterval(updateTokyoClock, 1000);

    playBtn.addEventListener('click', () => {
      if (video.paused) {
        video.play().then(() => {
          document.querySelector('.icon-play').style.display = 'none';
          document.querySelector('.icon-pause').style.display = '';
        }).catch(() => {
          document.querySelector('.icon-play').style.display = '';
          document.querySelector('.icon-pause').style.display = 'none';
        });
      } else {
        video.pause();
        document.querySelector('.icon-play').style.display = '';
        document.querySelector('.icon-pause').style.display = 'none';
      }
    });

    muteBtn.addEventListener('click', () => {
      if (video.volume > 0) {
        previousVolume = video.volume;
        video.volume = 0;
        volumeSlider.value = 0;
        document.querySelector('.icon-unmute').style.display = 'none';
        document.querySelector('.icon-mute').style.display = '';
      } else {
        video.volume = previousVolume || 0.5;
        volumeSlider.value = previousVolume || 0.5;
        document.querySelector('.icon-unmute').style.display = '';
        document.querySelector('.icon-mute').style.display = 'none';
      }
    });

    volumeSlider.addEventListener('input', () => {
      video.volume = parseFloat(volumeSlider.value);
      if (video.volume === 0) {
        document.querySelector('.icon-unmute').style.display = 'none';
        document.querySelector('.icon-mute').style.display = '';
      } else {
        document.querySelector('.icon-unmute').style.display = '';
        document.querySelector('.icon-mute').style.display = 'none';
        previousVolume = video.volume;
      }
    });

    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        video.parentElement.requestFullscreen();
      }
    });

    pipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        console.error('Mini player gagal:', err);
      }
    });

    timelineBar.addEventListener('click', e => {
      const percent = e.offsetX / timelineBar.clientWidth;
      if (video.duration) video.currentTime = percent * video.duration;
    });

    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        const buffered = video.buffered;
        if (buffered.length) {
          const bufferedEnd = buffered.end(buffered.length - 1);
          timelineBuffered.style.width = (bufferedEnd / video.duration) * 100 + '%';
          // Jika posisi playhead (bar biru) mendekati akhir buffer (bar pink), paksa HLS.js lanjut load
          if (bufferedEnd - video.currentTime < 5 && hls && hls.media && video.readyState < 3) {
            hls.startLoad(); // Paksa permintaan segmen baru
          }
        }
        timelineFill.style.width = (video.currentTime / video.duration) * 100 + '%';
      }
    });

    // Paksa proses loading video baru saat bar biru mendekati akhir bar pink, tapi jangan terlalu sering
let lastForceLoad = 0;
video.addEventListener('timeupdate', () => {
  if (video.duration) {
    const buffered = video.buffered;
    if (buffered.length) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      timelineBuffered.style.width = (bufferedEnd / video.duration) * 100 + '%';
      // Jika posisi playhead (bar biru) mendekati akhir buffer (bar pink), paksa HLS.js lanjut load (maksimal 1x per detik)
      if (
        bufferedEnd - video.currentTime < 5 &&
        hls &&
        hls.media &&
        Date.now() - lastForceLoad > 1000
      ) {
        hls.startLoad();
        lastForceLoad = Date.now();
      }
    }
    timelineFill.style.width = (video.currentTime / video.duration) * 100 + '%';
  }
});

    window.addEventListener('keydown', e => {
      const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
      if (!isTyping) {
        if (e.code === 'Space') {
          e.preventDefault();
          if (video.paused) {
            video.play().then(() => {
              document.querySelector('.icon-play').style.display = 'none';
              document.querySelector('.icon-pause').style.display = '';
            });
          } else {
            video.pause();
            document.querySelector('.icon-play').style.display = '';
            document.querySelector('.icon-pause').style.display = 'none';
          }
        }
        if (e.code === 'ArrowRight') {
          e.preventDefault();
          if (video.duration) video.currentTime = Math.min(video.currentTime + 5, video.duration);
        }
        if (e.code === 'ArrowLeft') {
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 5, 0);
        }
        // Volume control dengan - dan =
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.05);
          volumeSlider.value = video.volume;
          if (video.volume === 0) {
            document.querySelector('.icon-unmute').style.display = 'none';
            document.querySelector('.icon-mute').style.display = '';
          } else {
            document.querySelector('.icon-unmute').style.display = '';
            document.querySelector('.icon-mute').style.display = 'none';
          }
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.05);
          volumeSlider.value = video.volume;
          if (video.volume === 0) {
            document.querySelector('.icon-unmute').style.display = 'none';
            document.querySelector('.icon-mute').style.display = '';
          } else {
            document.querySelector('.icon-unmute').style.display = '';
            document.querySelector('.icon-mute').style.display = 'none';
          }
        }
      }
    });

    //script 2
    async function loadPlaylist() {
      try {
        const res = await fetch('https://raw.githubusercontent.com/luongz/iptv-jp/main/jp.m3u');
        const text = await res.text();
        const lines = text.replace(/\r/g, '').split('\n');
        for (let i = 0; i < lines.length; i++) {
          const info = lines[i];
          const url = lines[i + 1]?.trim();
          if (info?.startsWith('#EXTINF') && url?.startsWith('http')) {
            const name = info.split(',')[1]?.trim() || 'Channel';
            const groupMatch = info.match(/group-title="(.*?)"/);
            if (groupMatch?.[1].toLowerCase() === 'information') continue;
            channels.push({ name, url });
          }
        }
        channels.sort((a, b) => a.name.localeCompare(b.name));
        updateChannelList(channels);
        const savedUrl = localStorage.getItem('lastChannelUrl');
        const savedChannel = channels.find(c => c.url === savedUrl);
        let first = savedChannel;
        if (!first) {
          // Cari channel TBS
          first = channels.find(c => c.name.toLowerCase() === 'tbs') || channels[0];
        }
        if (first) playStream(first.url, first.name);
      } catch (err) {
        infoChannel.textContent = 'Gagal memuat daftar channel';
        console.error('Playlist error:', err);
      }
    }

    // Fungsi untuk menambah error/history status
function addErrorHistory(msg) {
  const list = document.getElementById('errorHistoryList');
  const div = document.createElement('div');
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

// Tambahkan status pekerjaan ke error history
window.addEventListener('online', () => {
  addErrorHistory('Internet tersambung, mencoba lanjut loading video...');
});
window.addEventListener('offline', () => {
  addErrorHistory('Internet terputus, menunggu koneksi...');
});
video.addEventListener('waiting', () => {
  addErrorHistory('Sedang loading video...');
});
video.addEventListener('stalled', () => {
  addErrorHistory('Buffer video habis, mencoba lanjut...');
});

    function playStream(url, name = '') {
      currentChannelUrl = url; // Simpan url channel aktif
      updateUrlBox(url);
      video.classList.add('buffering');
      // Reset bar biru dan posisi video ke awal sebelum load
      video.pause();
      video.currentTime = 0;
      timelineFill.style.width = '0%';
      hls.detachMedia(); // Unbind previous events and detach
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.currentLevel = -1;
      // Remove previous canplay handler if any
      video.oncanplay = null;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Set ulang bar biru dan posisi video ke awal saat video siap
        video.oncanplay = () => {
          video.currentTime = 0;
          timelineFill.style.width = '0%';
          video.oncanplay = null;
          updateVideoResolution(); // update resolusi saat channel baru siap
        };
        video.muted = false;
        video.play().then(() => {
          document.querySelector('.icon-play').style.display = 'none';
          document.querySelector('.icon-pause').style.display = '';
        }).catch(() => {
          document.querySelector('.icon-play').style.display = '';
          document.querySelector('.icon-pause').style.display = 'none';
        });
        setTimeout(() => video.classList.remove('buffering'), 2500);
      });
      infoChannel.textContent = 'Channel: ' + name;
      localStorage.setItem('lastChannelUrl', url);
      localStorage.setItem('lastChannelName', name);
      addErrorHistory(`Memutar channel: ${name}`);
    }

    function updateChannelList(list) {
      channelList.innerHTML = '';
      list.forEach(c => {
        const item = document.createElement('div');
        item.className = 'channel-item';
        item.textContent = c.name;
        item.onclick = () => playStream(c.url, c.name);
        channelList.appendChild(item);
      });
      // Scroll ke atas setiap update
      channelList.scrollTop = 0;
    }

    searchInput.addEventListener('input', () => {
      clearBtn.style.display = searchInput.value ? 'block' : 'none';
      const keyword = searchInput.value.toLowerCase();
      const matched = channels.filter(c => c.name.toLowerCase().includes(keyword));
      const bsOnly = matched.filter(c => c.name.toLowerCase().startsWith('bs '));
      const nonBs = matched.filter(c => !c.name.toLowerCase().startsWith('bs '));
      updateChannelList([...nonBs, ...bsOnly]);
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      updateChannelList(channels);
    });


    // Saat internet kembali, lanjutkan load video (buffer pink akan bertambah)
    window.addEventListener('online', () => {
      if (hls && hls.media) {
        hls.startLoad();
      }
    });


    // Hilangkan interval auto-refresh video, biarkan HLS handle buffering sendiri

    // Saat buffering, tampilkan animasi, dan lanjutkan otomatis jika buffer sudah cukup
    video.addEventListener('waiting', () => {
      if (hls) hls.startLoad();
    });
    video.addEventListener('stalled', () => {
      if (hls) hls.startLoad();
    });
    video.addEventListener('playing', () => {
      video.classList.remove('buffering');
      document.querySelector('.icon-play').style.display = 'none';
      document.querySelector('.icon-pause').style.display = '';
    });

    window.addEventListener('load', () => {
      video.volume = parseFloat(volumeSlider.value || 0.5);
      previousVolume = video.volume;
      video.muted = false;
      if (video.volume === 0) {
        document.querySelector('.icon-unmute').style.display = 'none';
        document.querySelector('.icon-mute').style.display = '';
      } else {
        document.querySelector('.icon-unmute').style.display = '';
        document.querySelector('.icon-mute').style.display = 'none';
      }
      loadPlaylist();
    });

    // Fungsi refresh video player
function refreshVideoPlayer() {
  if (hls) {
    hls.destroy(); // Hapus instance lama
  }
  const video = document.getElementById('video');
  video.pause();
  video.currentTime = 0;
  video.src = '';
  video.load();

  // Inisialisasi ulang HLS.js dengan url channel aktif
  hls = new Hls();
  if (currentChannelUrl) {
    hls.loadSource(currentChannelUrl);
    hls.attachMedia(video);
    video.play();
  }
}

// Tombol refresh di info-bar
document.getElementById('refreshVideoBtn').addEventListener('click', refreshVideoPlayer);

// Keyboard shortcut: tekan "r" untuk refresh video
window.addEventListener('keydown', e => {
  const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
  if (!isTyping && (e.key === 'r' || e.key === 'R')) {
    e.preventDefault();
    refreshVideoPlayer();
  }
});

// Update resolusi video saat metadata tersedia
function updateVideoResolution() {
  document.getElementById('videoResolution').textContent =
    video.videoWidth && video.videoHeight
      ? `${video.videoWidth} x ${video.videoHeight}`
      : '-';

  // Update frame rate jika tersedia
  let fr = '-';
  if (video.getVideoPlaybackQuality) {
    const q = video.getVideoPlaybackQuality();
    if (q.totalVideoFrames && video.duration) {
      fr = Math.round(q.totalVideoFrames / video.duration);
    }
  } else if (video.webkitDecodedFrameCount && video.duration) {
    fr = Math.round(video.webkitDecodedFrameCount / video.duration);
  }
  document.getElementById('videoFramerate').textContent = fr;
}
video.addEventListener('loadedmetadata', updateVideoResolution);

// Pastikan update resolusi saat playStream dipanggil (ganti channel)
function playStream(url, name = '') {
  currentChannelUrl = url;
  updateUrlBox(url);
  video.classList.add('buffering');
  video.pause();
  video.currentTime = 0;
  timelineFill.style.width = '0%';
  hls.detachMedia();
  hls.loadSource(url);
  hls.attachMedia(video);
  hls.currentLevel = -1;
  video.oncanplay = null;
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    video.oncanplay = () => {
      video.currentTime = 0;
      timelineFill.style.width = '0%';
      video.oncanplay = null;
      updateVideoResolution(); // update resolusi saat channel baru siap
    };
    video.muted = false;
    video.play().then(() => {
      document.querySelector('.icon-play').style.display = 'none';
      document.querySelector('.icon-pause').style.display = '';
    }).catch(() => {
      document.querySelector('.icon-play').style.display = '';
      document.querySelector('.icon-pause').style.display = 'none';
    });
    setTimeout(() => video.classList.remove('buffering'), 2500);
  });
  infoChannel.textContent = 'Channel: ' + name;
  localStorage.setItem('lastChannelUrl', url);
  localStorage.setItem('lastChannelName', name);
  addErrorHistory(`Memutar channel: ${name}`);
}

// Contoh: tangkap error dari HLS.js dan video
if (window.Hls) {
  hls.on(Hls.Events.ERROR, function(event, data) {
    addErrorHistory(`HLS: ${data.type} - ${data.details || ''}`);
  });
}
video.addEventListener('error', () => {
  addErrorHistory('Video error: ' + (video.error ? video.error.message : 'Unknown'));
});

function updateUrlBox(url) {
  document.getElementById('currentUrlBox').textContent = url || '-';
}
document.getElementById('copyUrlBtn').addEventListener('click', () => {
  const url = document.getElementById('currentUrlBox').textContent;
  navigator.clipboard.writeText(url);
});

let lastFrameCount = 0;
let lastTime = Date.now();

function updateVideoFramerate() {
  let fr = '-';
  if (video.getVideoPlaybackQuality) {
    const q = video.getVideoPlaybackQuality();
    const now = Date.now();
    if (lastTime) {
      const deltaFrames = q.totalVideoFrames - lastFrameCount;
      const deltaTime = (now - lastTime) / 1000;
      if (deltaTime > 0) {
        fr = Math.round(deltaFrames / deltaTime);
      }
    }
    lastFrameCount = q.totalVideoFrames;
    lastTime = now;
  }
  document.getElementById('videoFramerate').textContent = fr;
}
setInterval(updateVideoFramerate, 1000);