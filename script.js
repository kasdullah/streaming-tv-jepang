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
        video.play().then(() => playBtn.textContent = '⏸️').catch(() => playBtn.textContent = '▶️');
      } else {
        video.pause();
        playBtn.textContent = '▶️';
      }
    });

    muteBtn.addEventListener('click', () => {
      if (video.volume > 0) {
        previousVolume = video.volume;
        video.volume = 0;
        volumeSlider.value = 0;
        muteBtn.textContent = '🔇';
      } else {
        video.volume = previousVolume || 0.5;
        volumeSlider.value = previousVolume || 0.5;
        muteBtn.textContent = '🔊';
      }
    });

    volumeSlider.addEventListener('input', () => {
      video.volume = parseFloat(volumeSlider.value);
      muteBtn.textContent = video.volume === 0 ? '🔇' : '🔊';
      if (video.volume > 0) previousVolume = video.volume;
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
        }
        timelineFill.style.width = (video.currentTime / video.duration) * 100 + '%';
      }
    });

    window.addEventListener('keydown', e => {
      const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
      if (!isTyping) {
        if (e.code === 'Space') {
          e.preventDefault();
          video.paused
            ? video.play().then(() => playBtn.textContent = '⏸️')
            : (video.pause(), playBtn.textContent = '▶️');
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
          muteBtn.textContent = video.volume === 0 ? '🔇' : '🔊';
        }
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.05);
          volumeSlider.value = video.volume;
          muteBtn.textContent = video.volume === 0 ? '🔇' : '🔊';
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
          first = channels.find(c => c.name.toLowerCase().includes('tbs')) || channels[0];
        }
        if (first) playStream(first.url, first.name);
      } catch (err) {
        infoChannel.textContent = 'Gagal memuat daftar channel';
        console.error('Playlist error:', err);
      }
    }

    function playStream(url, name = '') {
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
        };
        video.muted = false;
        video.play().then(() => playBtn.textContent = '⏸️').catch(() => playBtn.textContent = '▶️');
        setTimeout(() => video.classList.remove('buffering'), 2500);
      });
      infoChannel.textContent = 'Channel: ' + name;
      localStorage.setItem('lastChannelUrl', url);
      localStorage.setItem('lastChannelName', name);
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
      if (hls) {
        hls.startLoad();
      }
    });


    // Hilangkan interval auto-refresh video, biarkan HLS handle buffering sendiri

    // Saat buffering, tampilkan animasi, dan lanjutkan otomatis jika buffer sudah cukup
    video.addEventListener('waiting', () => {
      video.classList.add('buffering');
    });
    video.addEventListener('playing', () => {
      video.classList.remove('buffering');
      playBtn.textContent = '⏸️';
    });

    window.addEventListener('load', () => {
      video.volume = parseFloat(volumeSlider.value || 0.5);
      previousVolume = video.volume;
      video.muted = false;
      muteBtn.textContent = video.volume === 0 ? '🔇' : '🔊';
      loadPlaylist();
    });