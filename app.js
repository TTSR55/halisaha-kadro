// --- Veri yapısı ---
// const schema = { K:1, D:3, O:2, F:1 };         // pozisyon kotası
const teams  = {
  home: { color:'#44aaff', list:[] },
  away: { color:'#ff5555', list:[] }
};
// --- Çoklu kayıt deposu ---
let rosters = JSON.parse(localStorage.getItem('rosters') || '{}');
// --- O anki açık kayıt anahtarı ---
let currentSave = null;

// --- Sayfa açılışında boş kadro göster ---
['home','away'].forEach(t => { renderRoster(t); drawPitch(t); });

// --- Form olayları ---
document.querySelectorAll('.player-form').forEach(form=>{
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const teamKey = form.dataset.team;
    const name = form.elements['name'].value.trim();
    const pos  = form.elements['pos'].value;
    const msg  = form.querySelector('.msg');

    const ok = canAddPlayer(teamKey,pos);
    if(!ok){ msg.textContent = 'Bu mevkide kota dolu!'; return; }
    msg.textContent = '';

    teams[teamKey].list.push({name,pos});

    form.reset();
    renderRoster(teamKey);
    drawPitch(teamKey);
  });
});

// --- Kota kontrolü ---
function canAddPlayer(teamKey,pos){
  const schema = getSchema(teamKey);
  const current = teams[teamKey].list.filter(p=>p.pos===pos).length;
  const maxPlayers = schema.D + schema.O + schema.F + 1;
  return current < schema[pos] && teams[teamKey].list.length < maxPlayers;
}

// --- Listeyi yazdır ---
function renderRoster(team){
  const ul = document.getElementById(team+'List');
  ul.innerHTML = teams[team].list.map((p,i)=>`
      <li>
        ${p.name} – ${fullPos(p.pos)}
        <span class="del" data-team="${team}" data-idx="${i}"
              style="color:#f55;cursor:pointer;">🗑️</span>
      </li>`).join('');
}

// --- Oyuncu silme ---
document.addEventListener('click', e=>{
  if(!e.target.matches('.del')) return;
  const team = e.target.dataset.team;
  const idx  = +e.target.dataset.idx;
  teams[team].list.splice(idx,1);
  renderRoster(team); drawPitch(team);
});

// --- Saha çizgileri ---
function drawLines(ctx, w, h){
  ctx.strokeStyle = '#99ff99';
  ctx.lineWidth   = 2;

  // Dış sınır
  ctx.strokeRect(10, 10, w - 20, h - 20);

  // Orta saha çizgisi
  ctx.beginPath();
  ctx.moveTo(10, h / 2);
  ctx.lineTo(w - 10, h / 2);
  ctx.stroke();

  // Orta yuvarlak
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
  ctx.stroke();

  // Ceza sahaları (üst & alt)
  const boxW = 180;       // genişlik
  const boxH = 60;        // uzunluk
  const x0   = (w - boxW) / 2;

  // Üst ceza sahası
  ctx.strokeRect(x0, 10, boxW, boxH);

  // Alt ceza sahası
  ctx.strokeRect(x0, h - 10 - boxH, boxW, boxH);

  // Penaltı noktaları
  ctx.beginPath();
  ctx.arc(w / 2, 10 + boxH - 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, h - 10 - boxH + 12, 3, 0, Math.PI * 2);
  ctx.fill();
}

// --- Sahayı çiz ve oyuncuları dinamik ortala ---
function drawPitch(team){
  const cvs = document.getElementById(team + 'Pitch');
  const ctx = cvs.getContext('2d');
  // Temizle
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  // Saha çizgilerini çiz
  drawLines(ctx, cvs.width, cvs.height);

  // Oyuncuları pozisyona göre gruplandır
  const playersByPos = {
    K: teams[team].list.filter(p => p.pos === 'K'),
    D: teams[team].list.filter(p => p.pos === 'D'),
    O: teams[team].list.filter(p => p.pos === 'O'),
    F: teams[team].list.filter(p => p.pos === 'F'),
  };

  // Y koordinatları (yüzde)
  const yPositions = { K: 0.93, D: 0.75, O: 0.55, F: 0.30 };

  // Her pozisyon için dinamik x/y hesapla
  Object.keys(playersByPos).forEach(pos => {
    const list = playersByPos[pos];
    const n = list.length;
    list.forEach((p, i) => {
      // x fraksiyon: (i+1)/(n+1)
      const x = ((i + 1) / (n + 1)) * cvs.width;
      const y = yPositions[pos] * cvs.height;
      drawPlayer(ctx, x, y, p.name, teams[team].color);
    });
  });
}

function drawPlayer(ctx,x,y,name,color){
  ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='12px sans-serif'; ctx.textAlign='center';
  ctx.fillText(name.split(' ')[0],x,y+4);
}

function fullPos(p){ return {K:'Kaleci',D:'Defans',O:'Orta',F:'Forvet'}[p]; }

// --- Kaydet / Yükle yardımcıları ---

function refreshSaves(){
  if(!savesList) return;
  savesList.innerHTML = Object.keys(rosters)
    .map(k => `<li data-save="${k}">${k}</li>`).join('');
}

// Yan panel öğeleri
const saveNameEl = document.getElementById('saveName');
const createBtn  = document.getElementById('createBtn');
const updateBtn  = document.getElementById('updateBtn');
const savesList  = document.getElementById('savesList');

const newMatchBtn = document.getElementById('newMatchBtn');

// --- Takım bazlı formation selects ---
const formationHomeSelect = document.getElementById('formationHome');
const formationAwaySelect = document.getElementById('formationAway');

function getSchema(teamKey) {
  const val = teamKey === 'home'
    ? formationHomeSelect.value
    : formationAwaySelect.value;
  const [d, o, f] = val.split('-').map(n => parseInt(n, 10));
  return { K: 1, D: d, O: o, F: f };
}

// Taktik değişince o takımı sıfırla
formationHomeSelect.addEventListener('change', () => {
  teams.home.list = []; renderRoster('home'); drawPitch('home');
});
formationAwaySelect.addEventListener('change', () => {
  teams.away.list = []; renderRoster('away'); drawPitch('away');
});

// --- Her takımın tümünü sil butonları ---
document.querySelectorAll('.clear-all-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const team = btn.dataset.team;     // 'home' veya 'away'
    teams[team].list = [];             // diziyi tamamen boşalt
    renderRoster(team);                // listeyi güncelle
    drawPitch(team);                   // saha görüntüsünü güncelle
  });
});

// --- Kayıt yönetimi: Yeni Kayıt, Güncelle, Yeni Maç, Yükle ---
// Yeni Kayıt
createBtn.onclick = () => {
  const name = saveNameEl.value.trim();
  if (!name) return alert('Kayıt adı boş olamaz!');
  rosters[name] = JSON.parse(JSON.stringify(teams));
  localStorage.setItem('rosters', JSON.stringify(rosters));
  refreshSaves();
  currentSave = name;
  createBtn.style.display = 'none';
  updateBtn.style.display = 'inline-block';
};

// Güncelle
updateBtn.onclick = () => {
  if (!currentSave) return;
  rosters[currentSave] = JSON.parse(JSON.stringify(teams));
  localStorage.setItem('rosters', JSON.stringify(rosters));
  refreshSaves();
  alert(`'${currentSave}' güncellendi.`);
};

// Yeni Maç
newMatchBtn.onclick = () => {
  teams.home.list = [];
  teams.away.list = [];
  ['home','away'].forEach(t => { renderRoster(t); drawPitch(t); });
  currentSave = null;
  saveNameEl.value = '';
  createBtn.style.display = 'inline-block';
  updateBtn.style.display = 'none';
};

// Kayıt Listesinden Yükle
savesList.addEventListener('click', e => {
  const key = e.target.dataset.save;
  if (!key) return;
  Object.assign(teams, JSON.parse(JSON.stringify(rosters[key])));
  ['home','away'].forEach(t => { renderRoster(t); drawPitch(t); });
  currentSave = key;
  saveNameEl.value = key;
  createBtn.style.display = 'none';
  updateBtn.style.display = 'inline-block';
});

// İlk sefer listeyi doldur
refreshSaves();