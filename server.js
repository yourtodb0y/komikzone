const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer((req, res) => {
    // ... isi kode request handler kamu ...
});

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4'
};

const ADMIN_USER = "admin";
const ADMIN_PASS = "komik123";

// Path Database File JSON Permanen
const KOMIK_DB_PATH = path.join(__dirname, 'komik.json');
const VIDEOS_DB_PATH = path.join(__dirname, 'videos.json');

// Buat folder uploads otomatis jika belum ada
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Inisialisasi/Load Database Komik
let listKomikPopuler = [
  {
    id: "1",
    t: "One Piece",
    g: "Action",
    c: "Ch.1115",
    b: "hot",
    r: "9.8",
    img: "/uploads/sample_cover.jpg",
    bg: "#ff6348,#ff4757",
    chapters: [
      { id: "ch1", nama: "Ch.1115", info: "Rilis terbaru", lembar: [] }
    ]
  }
];
if (fs.existsSync(KOMIK_DB_PATH)) {
  try {
    listKomikPopuler = JSON.parse(fs.readFileSync(KOMIK_DB_PATH, 'utf8'));
  } catch (e) {
    console.log("Gagal membaca database komik, pakai data default.");
  }
} else {
  fs.writeFileSync(KOMIK_DB_PATH, JSON.stringify(listKomikPopuler, null, 2));
}

// Inisialisasi/Load Database Video
let listVideos = [
  {
    id: "v1",
    judul: "Cara Mudah Bore Up Beat Karbu 130cc",
    thumbnail: "/uploads/default_thumb.jpg",
    kategori: "Modifikasi",
    views: 0,
    url: "/uploads/sample_video.mp4"
  }
];
if (fs.existsSync(VIDEOS_DB_PATH)) {
  try {
    listVideos = JSON.parse(fs.readFileSync(VIDEOS_DB_PATH, 'utf8'));
  } catch (e) {
    console.log("Gagal membaca database video, pakai data default.");
  }
} else {
  fs.writeFileSync(VIDEOS_DB_PATH, JSON.stringify(listVideos, null, 2));
}

// Fungsi bantu simpan data otomatis
function simpanDataKomik() {
  fs.writeFileSync(KOMIK_DB_PATH, JSON.stringify(listKomikPopuler, null, 2));
}
function simpanDataVideo() {
  fs.writeFileSync(VIDEOS_DB_PATH, JSON.stringify(listVideos, null, 2));
}

function isAdminLoggedIn(req) {
  const cookies = req.headers.cookie || '';
  return cookies.includes('isAdmin=true');
}

// Fungsi pemproses form multipart native
function parseMultipart(req, callback) {
  let body = Buffer.alloc(0);
  req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
  req.on('end', () => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('boundary=')) {
      return callback({ fields: {}, files: [] });
    }
    const boundary = '--' + contentType.split('boundary=')[1];
    const parts = body.toString('binary').split(boundary);
    const result = { fields: {}, files: [] };

    parts.forEach(part => {
      if (!part.includes('Content-Disposition')) return;

      const rawHeader = part.split('\r\n\r\n')[0];
      const rawData = part.split('\r\n\r\n').slice(1).join('\r\n\r\n');
      const data = rawData.substring(0, rawData.length - 2);

      const nameMatch = rawHeader.match(/name="([^"]+)"/);
      const filenameMatch = rawHeader.match(/filename="([^"]+)"/);

      if (filenameMatch && filenameMatch[1]) {
        const filename = Date.now() + '_' + filenameMatch[1].replace(/\s+/g, '_');
        const filepath = path.join(__dirname, 'uploads', filename);
        fs.writeFileSync(filepath, data, 'binary');
        result.files.push({
          fieldName: nameMatch[1],
          filename: filename,
          url: '/uploads/' + filename
        });
      } else if (nameMatch) {
        result.fields[nameMatch[1]] = data.trim();
      }
    });
    callback(result);
  });
}

http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  // 1. API AMBIL DATA KOMIK
  if (url === '/api/komik' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listKomikPopuler));
    return;
  }

  // 2. API AMBIL DATA VIDEO
  if (url === '/api/videos' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listVideos));
    return;
  }

  // 3. API REALTIME VIEWS HITTER (+1 VIEW VIA POST)
  const viewRouteMatch = url.match(/^\/api\/videos\/([^\/]+)\/view$/);
  if (viewRouteMatch && method === 'POST') {
    const videoId = viewRouteMatch[1];
    const video = listVideos.find(v => v.id === videoId);

    if (video) {
      let currentViews = parseInt(video.views) || 0;
      currentViews += 1;
      video.views = currentViews;
      
      simpanDataVideo(); // Amankan data views ke JSON

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, views: video.views }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Video tidak ditemukan" }));
    }
    return;
  }

  // 4. PROSES LOGIN ADMIN
  if (url === '/api/login' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.username === ADMIN_USER && data.password === ADMIN_PASS) {
          res.writeHead(200, { 'Set-Cookie': 'isAdmin=true; Path=/; HttpOnly; Max-Age=3600', 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false }));
        }
      } catch(e) {
        res.writeHead(400); res.end('Bad Request');
      }
    });
    return;
  }

  if (url === '/api/logout' && method === 'POST') {
    res.writeHead(200, { 'Set-Cookie': 'isAdmin=false; Path=/; HttpOnly; Max-Age=0', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Perlindungan API Admin
  if (url.startsWith('/api/') && method !== 'GET') {
    if (!isAdminLoggedIn(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: "Akses ditolak!" }));
      return;
    }
  }

  // 5. API UPLOAD KOMIK BARU
  if (url === '/api/komik/tambah' && method === 'POST') {
    parseMultipart(req, (result) => {
      const fields = result.fields;
      const fileCover = result.files.find(f => f.fieldName === 'cover');
      const colors = ["#ff6348,#ff4757", "#2f3542,#747d8c", "#d63031,#e17055", "#6c5ce7,#a29bfe"];

      const komikBaru = {
        id: Date.now().toString(),
        t: fields.judul,
        g: fields.genre,
        c: fields.chapter,
        r: fields.rating,
        b: fields.badge,
        img: fileCover ? fileCover.url : '/uploads/default.jpg',
        bg: colors[Math.floor(Math.random() * colors.length)],
        chapters: [{ id: "ch_" + Date.now(), nama: fields.chapter, info: "Chapter awal", lembar: [] }]
      };

      listKomikPopuler.unshift(komikBaru);
      simpanDataKomik(); // Simpan permanen

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: "Komik & Sampul Berhasil Diupload!" }));
    });
    return;
  }

  // 6. API UPLOAD CHAPTER BARU
  if (url === '/api/chapter/tambah' && method === 'POST') {
    parseMultipart(req, (result) => {
      const fields = result.fields;
      const komik = listKomikPopuler.find(k => k.id === fields.komikId);

      if (komik) {
        const isiHalaman = result.files.filter(f => f.fieldName === 'isiChapter').map(f => f.url);
        komik.chapters.unshift({
          id: "ch_" + Date.now(),
          nama: fields.namaChapter,
          info: "Update",
          lembar: isiHalaman
        });
        komik.c = fields.namaChapter;
        
        simpanDataKomik(); // Simpan permanen

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: "Chapter & Isi Komik Berhasil Rilis!" }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: "Komik tidak ditemukan!" }));
      }
    });
    return;
  }

  // 7. API EDIT CHAPTER
  if (url === '/api/chapter/edit' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const data = JSON.parse(body);
      const komik = listKomikPopuler.find(k => k.id === data.komikId);
      if (komik && komik.chapters) {
        const chap = komik.chapters.find(c => c.id === data.chapterId);
        if (chap) {
          chap.nama = data.namaBaru;
          simpanDataKomik(); // Simpan permanen
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: "Nama chapter berhasil diubah!" }));
          return;
        }
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: "Chapter tidak ditemukan!" }));
    });
    return;
  }

  // 8. API HAPUS CHAPTER
  if (url === '/api/chapter/hapus' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const data = JSON.parse(body);
      const komik = listKomikPopuler.find(k => k.id === data.komikId);
      if (komik && komik.chapters) {
        komik.chapters = komik.chapters.filter(c => c.id !== data.chapterId);
        if (komik.chapters.length > 0) {
          komik.c = komik.chapters[0].nama;
        }
        simpanDataKomik(); // Simpan permanen
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: "Chapter berhasil dihapus!" }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: "Komik/Chapter tidak ditemukan!" }));
    });
    return;
  }

  // 9. API HAPUS KOMIK
  if (url === '/api/komik/hapus' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const data = JSON.parse(body);
      listKomikPopuler = listKomikPopuler.filter(k => k.id !== data.komikId);
      simpanDataKomik(); // Simpan permanen
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: "Komik dihapus!" }));
    });
    return;
  }

  // 10. API UPLOAD VIDEO BARU
  if (url === '/api/video/tambah' && method === 'POST') {
    parseMultipart(req, (result) => {
      const fields = result.fields;
      const fileVideo = result.files.find(f => f.fieldName === 'videoFile');
      const fileThumb = result.files.find(f => f.fieldName === 'videoThumb');

      const videoBaru = {
        id: "v_" + Date.now(),
        judul: fields.judulVideo,
        kategori: fields.kategoriVideo,
        views: 0,
        url: fileVideo ? fileVideo.url : '',
        thumbnail: fileThumb ? fileThumb.url : '/uploads/default_thumb.jpg'
      };

      listVideos.unshift(videoBaru);
      simpanDataVideo(); // Simpan permanen

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: "Video & Thumbnail Berhasil Diupload!" }));
    });
    return;
  }

  // 11. API HAPUS VIDEO
  if (url === '/api/video/hapus' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      const data = JSON.parse(body);
      listVideos = listVideos.filter(v => v.id !== data.videoId);
      simpanDataVideo(); // Simpan permanen
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: "Video berhasil dihapus!" }));
    });
    return;
  }

  // ROUTE FILE STATIC & UPLOADS
  if (url.startsWith('/uploads/')) {
    let filePath = path.join(__dirname, url);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('File Hilang'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'image/jpeg' });
      res.end(data);
    });
    return;
  }

  if (url === '/admin') {
    const fileTarget = isAdminLoggedIn(req) ? 'admin.html' : 'login.html';
    fs.readFile(path.join(__dirname, fileTarget), (err, data) => {
      if (err) { res.writeHead(404); res.end('File Hilang'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data);
    });
    return;
  }


  // --- PERBAIKAN: Potong URL agar parameter tidak terbawa ke nama file ---
  let urlBersih = url.split('?')[0]; 
  let f = path.join(__dirname, urlBersih === '/' ? 'index.html' : urlBersih);
  
    // --- BAGIAN PENUTUP FILE ---
  fs.readFile(f, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File Tidak Ditemukan');
      return;
    }
    const ext = path.extname(f);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}); // <--- INI ADALAH PENUTUP DARI server.on('request', ...)

// --- BAGIAN SERVER LISTENING ---
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Proses dihentikan');
  });
});
