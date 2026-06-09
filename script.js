const BL = { new: "badge-new", hot: "badge-hot", end: "badge-end", update: "badge-update" };
const BN = { new: "New", hot: "🔥Hot", end: "Tamat", update: "Update" };
let currentMode = "komik";
let globalData = [];
let globalVideos = [];

let isLoggedIn = localStorage.getItem('uz_logged_in') === 'true';
let currentUser = localStorage.getItem('uz_active_user') || "";
let userLevel = parseInt(localStorage.getItem('uz_level')) || 1;
let userExp = parseInt(localStorage.getItem('uz_exp')) || 0;

function hitungMaxExp(lvl) { return lvl * 100; }

// Kembalikan menu lengkap termasuk Settings di Dropdown Navbar
function renderNavbarMenu() {
    const dropdown = document.getElementById("myDropdown");
    if (!dropdown) return;

    if (!isLoggedIn) {
        dropdown.innerHTML = `
            <a href="auth.html">🔐 Login / Register</a>
            <a href="#" onclick="openSettings()">⚙️ Settings</a>
        `;
    } else {
        dropdown.innerHTML = `
            <a href="profile.html">👤 Profile (${currentUser})</a>
            <a href="#" onclick="alert('Fitur Genre Segera Hadir!')">🏷️ Genre</a>
            <a href="#" onclick="openSettings()">⚙️ Settings</a>
            <a href="profile.html" style="color: var(--accent); border-top: 1px dashed var(--ink);">🚪 Logout</a>
        `;
    }
}

// Fungsi Modal Settings
function openSettings() {
    document.getElementById("myDropdown").classList.remove("show");
    document.getElementById("settingsModal").style.display = "flex";
}
function closeSettings() {
    document.getElementById("settingsModal").style.display = "none";
}

function cekAksesUser() {
    if (!isLoggedIn) {
        window.location.href = "auth.html?blocked=true";
        return false;
    }
    return true;
}

function tambahExp(jumlah) {
    if (!isLoggedIn) return;
    userExp += jumlah;
    let maxExp = hitungMaxExp(userLevel);
    let naikLevel = false;

    while (userExp >= maxExp) {
        userExp -= maxExp;
        userLevel += 1;
        maxExp = hitungMaxExp(userLevel);
        naikLevel = true;
    }

    localStorage.setItem('uz_level', userLevel);
    localStorage.setItem('uz_exp', userExp);

    if (naikLevel) {
        const toast = document.getElementById('lvlToast');
        if(toast) {
            toast.textContent = `🎉 LEVEL UP KE LV. ${userLevel}!`;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2500);
        }
    }
}

function toggleDropdown() {
    document.getElementById("myDropdown").classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.menu-btn')) {
        const dropdown = document.getElementById("myDropdown");
        if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
    const setModal = document.getElementById("settingsModal");
    if (event.target === setModal) closeSettings();
}

function rc(k) {
    return `<div class="comic-card" onclick="openModal('${k.id}')">
        <div class="comic-thumb">
            <img src="${k.img}" alt="${k.t}" />
            <div class="comic-badge ${BL[k.b] || 'badge-new'}">${BN[k.b] || 'New'}</div>
            <div class="comic-rating">⭐${k.r || '9.5'}</div>
        </div>
        <div class="comic-info">
            <h3>${k.t}</h3>
            <div class="comic-meta"><span class="comic-genre">${k.g}</span><span class="comic-chapter">${k.c}</span></div>
        </div>
    </div>`;
}

function ru(k) {
    return `<div class="update-item" onclick="openModal('${k.id}')">
        <img src="${k.img}" class="update-thumb" alt="${k.t}" />
        <div class="update-details">
            <div class="update-title">${k.t}</div>
            <div class="update-ch">${k.c} rilis</div>
        </div>
    </div>`;
}

// Merender Card Video Lengkap dengan counter Views yang dinamis
function rv(v) {
    let localViews = localStorage.getItem(`uz_video_views_${v.id}`);
    if (!localViews) {
        localViews = v.views || Math.floor(Math.random() * 150) + 50;
        localStorage.setItem(`uz_video_views_${v.id}`, localViews);
    }

    return `<div class="comic-card" onclick="openVideoModal('${v.id}')">
        <div class="comic-thumb">
            <img src="${v.thumbnail}" alt="${v.judul}" />
            <div class="comic-badge badge-hot">VIDEO</div>
            <div class="comic-rating">👁️ <span id="v-views-${v.id}">${localViews}</span></div>
        </div>
        <div class="comic-info">
            <h3>${v.judul}</h3>
            <div class="comic-meta"><span class="comic-genre">${v.kategori}</span><span class="comic-chapter" style="color:var(--accent3)">▶ Putar</span></div>
        </div>
    </div>`;
}

// FIX UTAMA: GABUNGKAN DATA API SERVER + DATA LOCALSTORAGE HASIL UPLOAD ADMIN
function muatDataHalamanUtama() {
    // Ambil data autosave upload admin dari localStorage
    let dbKontenLocal = JSON.parse(localStorage.getItem('uz_custom_konten')) || [];
    
    // Pisahkan data local menjadi tipe komik dan video, lalu balik urutannya (yang baru di paling atas)
    let localComics = dbKontenLocal.filter(item => item.tipe === 'komik').reverse().map(item => {
        return {
            id: 'local_' + item.id, // Kasih prefix unique ID biar ga tabrakan dengan API
            t: item.judul,
            img: item.thumbnail,
            b: 'new',
            r: '9.8',
            g: item.genre || 'Modifikasi',
            c: 'Ch. 01',
            chapters: [{ nama: "Chapter 01", lembar: [item.thumbnail] }] // Menggunakan thumbnail sebagai isi default
        };
    });

    let localVideos = dbKontenLocal.filter(item => item.tipe === 'video').reverse().map(item => {
        return {
            id: 'local_' + item.id,
            judul: item.judul,
            thumbnail: item.thumbnail,
            kategori: item.genre || 'Tutorial',
            url: item.thumbnail, // Menggunakan file video lokal base64 atau thumbnail preview
            views: 0
        };
    });

    // 1. Ambil data Komik dari API Server
    fetch('/api/komik')
        .then(res => res.json())
        .then(data => {
            // Gabungkan Komik Lokal Admin di posisi paling depan, lalu disusul data API Server
            globalData = [...localComics, ...data];
            
            document.getElementById('gp').innerHTML = globalData.map(rc).join('');
            document.getElementById('lu').innerHTML = globalData.slice(0, 4).map(ru).join('');
        }).catch(e => {
            console.log("Peringatan API Server Offline, memuat data lokal admin saja.", e);
            globalData = localComics;
            document.getElementById('gp').innerHTML = globalData.map(rc).join('');
            document.getElementById('lu').innerHTML = globalData.slice(0, 4).map(ru).join('');
        });

    // 2. Ambil data Video dari API Server
    fetch('/api/videos')
        .then(res => res.json())
        .then(vData => {
            // Gabungkan Video Lokal Admin di posisi paling depan, lalu disusul data API Server
            globalVideos = [...localVideos, ...vData];
            document.getElementById('gvp').innerHTML = globalVideos.map(rv).join('');
        }).catch(e => {
            console.log("Peringatan API Video Offline, memuat data lokal admin saja.", e);
            globalVideos = localVideos;
            document.getElementById('gvp').innerHTML = globalVideos.map(rv).join('');
        });
}

function toggleZone() {
    const switcher = document.getElementById('zoneSwitcher');
    const label = document.getElementById('zoneLabel');
    const komikSec = document.getElementById('komikSection');
    const videoSec = document.getElementById('videoSection');

    if (currentMode === "komik") {
        currentMode = "video";
        label.textContent = "KOMIK ZONE";
        komikSec.classList.add('hidden-zone');
        videoSec.classList.remove('hidden-zone');
    } else {
        currentMode = "komik";
        label.textContent = "VIDEO ZONE";
        videoSec.classList.add('hidden-zone');
        komikSec.classList.remove('hidden-zone');
    }
}

function openModal(id) {
    if (!cekAksesUser()) return;

    const k = globalData.find(item => item.id === id);
    if (!k) return;

    tambahExp(20);
    document.getElementById('mt').textContent = '📖 ' + k.t;
    document.getElementById('modalChapterSel').innerHTML = k.chapters.map(ch => `<option>${ch.nama}</option>`).join('');

    let listGambarHtml = k.chapters[0]?.lembar?.map(imgUrl => `<img src="${imgUrl}" style="width:100%; max-width:600px; margin-bottom:8px;" />`).join('') || '<p>Kosong</p>';
    document.querySelector('.modal-content').innerHTML = listGambarHtml;
    document.getElementById('modal').classList.add('open');
}

function openVideoModal(id) {
    if (!cekAksesUser()) return;

    const v = globalVideos.find(item => item.id === id);
    if (!v) return;

    tambahExp(20);

    let currentViews = parseInt(localStorage.getItem(`uz_video_views_${id}`)) || 0;
    currentViews += 1;
    localStorage.setItem(`uz_video_views_${id}`, currentViews);

    const viewSpan = document.getElementById(`v-views-${id}`);
    if (viewSpan) viewSpan.textContent = currentViews;

    // Jika id adalah data lokal admin, kita tidak perlu hit API backend agar tidak error 404
    if (!id.toString().startsWith('local_')) {
        fetch(`/api/videos/${id}/view`, { method: 'POST' }).catch(err => console.log("Backend offline, views tersimpan lokal"));
    }

    document.getElementById('mt').textContent = '🎬 ' + v.judul;
    document.querySelector('.modal-content').innerHTML = `<video src="${v.url}" controls autoplay style="width:100%; max-width:720px; background:#000;"></video>`;
    document.getElementById('modal').classList.add('open');
}

function closeModal() {
    const v = document.querySelector('.modal-content video');
    if (v) { v.pause(); v.src = ""; }
    document.getElementById('modal').classList.remove('open');
}

renderNavbarMenu();
muatDataHalamanUtama();
