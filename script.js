const screens = [...document.querySelectorAll('.screen')];
const envelope = document.getElementById('envelope');
const splash = document.getElementById('birthdaySplash');
const backgroundMusic = document.getElementById('backgroundMusic');
const birthdaySong = document.getElementById('birthdaySong');
const voiceMessage = document.getElementById('voiceMessage');
let currentScreen = 'welcome';
let carouselTimer;

// Soft interface sounds are synthesized locally (no extra audio file needed).
let audioContext;
function softChime(kind = 'tap') {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc = audioContext.createOscillator(); const gain = audioContext.createGain();
    osc.type = 'sine'; osc.frequency.value = kind === 'success' ? 740 : 520;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === 'success' ? 0.055 : 0.025, audioContext.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + 0.24);
  } catch (_) {}
}
function petalTransition() { burstFlowers(9); softChime('tap'); }


// The greeting fades away before the envelope is opened.
window.setTimeout(() => splash.classList.add('fade-away'), 2400);
window.setTimeout(() => splash.remove(), 3300);

function playBackground() {
  if (!backgroundMusic) return;
  backgroundMusic.volume = 0.38;
  const promise = backgroundMusic.play();
  if (promise && typeof promise.catch === 'function') promise.catch(() => {});
}
function pauseOtherAudio(activeAudio) {
  [backgroundMusic, birthdaySong, voiceMessage].forEach(audio => {
    if (audio && audio !== activeAudio) audio.pause();
  });
}
function resumeBackground() {
  if (currentScreen !== 'welcome' && backgroundMusic && birthdaySong.paused && voiceMessage.paused) playBackground();
}

function goTo(id) {
  const target = document.getElementById(id);
  if (!target) return;
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  currentScreen = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id !== 'song' && birthdaySong && !birthdaySong.paused) birthdaySong.pause();
  if (id !== 'finale' && voiceMessage && !voiceMessage.paused) voiceMessage.pause();
  if (id === 'finale') burstFlowers(22);
  if (id === 'letter') revealLetter();
  if (id !== 'welcome') petalTransition();
  if (id !== 'welcome') playBackground();
}

document.getElementById('openLetter').addEventListener('click', () => {
  envelope.classList.add('open');
  burstFlowers(22);
  playBackground();
  window.setTimeout(() => goTo('gallery'), 650);
});
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => goTo(button.dataset.go)));

// Handwritten-style paragraph reveal, once each time the letter is entered.
let letterRevealed = false;
function revealLetter() {
  const paragraphs = [...document.querySelectorAll('.long-letter > p.arabic')];
  if (letterRevealed) { paragraphs.forEach(p => p.classList.add('written')); return; }
  letterRevealed = true;
  paragraphs.forEach((p, i) => { p.classList.remove('written'); p.style.animationDelay = `${i * 0.75}s`; window.setTimeout(() => p.classList.add('written'), i * 750 + 80); });
}

document.getElementById('startAgain').addEventListener('click', () => {
  [backgroundMusic, birthdaySong, voiceMessage].forEach(audio => { if (audio) { audio.pause(); audio.currentTime = 0; } });
  envelope.classList.remove('open');
  document.getElementById('finalContent').classList.add('hidden');
  document.getElementById('passwordGate').classList.remove('hidden');
  document.getElementById('passwordSuccess').classList.add('hidden');
  document.getElementById('passwordForm').classList.remove('hidden');
  document.getElementById('pagePassword').value = '';
  document.getElementById('passwordError').textContent = '';
  goTo('welcome');
});

function connectPhoto(image, placeholder) {
  if (!image || !placeholder) return;
  const update = () => placeholder.classList.toggle('hidden', image.complete && image.naturalWidth > 0);
  image.addEventListener('load', update);
  image.addEventListener('error', () => placeholder.classList.remove('hidden'));
  if (image.complete) update();
}
document.querySelectorAll('.memory-card').forEach(card => connectPhoto(card.querySelector('img'), card.querySelector('.gallery-placeholder')));
connectPhoto(document.getElementById('eyesPhoto'), document.getElementById('eyesPlaceholder'));
connectPhoto(document.getElementById('smilePhoto'), document.getElementById('smilePlaceholder'));

// One audio at a time: background music yields to the selected song or voice recording.
[birthdaySong, voiceMessage].forEach(audio => {
  if (!audio) return;
  audio.addEventListener('play', () => pauseOtherAudio(audio));
  audio.addEventListener('pause', resumeBackground);
  audio.addEventListener('ended', resumeBackground);
});

// Vinyl spins only while the featured song is playing.
const vinylRecord = document.getElementById('vinylRecord');
if (birthdaySong && vinylRecord) {
  birthdaySong.addEventListener('play', () => vinylRecord.classList.add('is-playing'));
  ['pause','ended'].forEach(evt => birthdaySong.addEventListener(evt, () => vinylRecord.classList.remove('is-playing')));
}

// A small collection of warm, non-repetitive compliments.
const compliments = [
  'فيكي هدوء كده يخلي وجودك مريح، حتى من غير كلام كتير. ♡',
  'ضحكتك من التفاصيل اللي بتخلي اليوم ألطف بكتير. 🌹',
  'ملامحك ليها طابعها الخاص، وجمالها مش محتاج أي مبالغة.',
  'طريقتك وتفاصيلك الصغيرة هما اللي بيخلّوكي مميزة.',
  'أتمنى تشوفي في نفسك كل الحاجات الحلوة اللي اللي حواليكي ممكن يلاحظوها.'
];
const complimentButton = document.getElementById('complimentButton');
if (complimentButton) complimentButton.addEventListener('click', () => {
  const box = document.getElementById('randomCompliment');
  let next = compliments[Math.floor(Math.random() * compliments.length)];
  if (box.textContent === next) next = compliments[(compliments.indexOf(next) + 1) % compliments.length];
  box.classList.remove('compliment-pop'); void box.offsetWidth; box.textContent = next; box.classList.add('compliment-pop');
  softChime('success'); burstFlowers(5);
});

// Export the long letter or final message. Image export uses html2canvas when online; print works offline.
async function saveAsImage(element, filename) {
  if (!element) return;
  if (!window.html2canvas) { alert('لحفظها كصورة، افتحي الموقع مع الإنترنت لتحميل أداة حفظ الصورة، أو استخدمي Save as PDF / Print.'); return; }
  try {
    const canvas = await window.html2canvas(element, {backgroundColor: null, scale: 2, useCORS: true});
    const link = document.createElement('a'); link.download = filename; link.href = canvas.toDataURL('image/png'); link.click();
  } catch (error) { alert('حصلت مشكلة في تجهيز الصورة. جربي Save as PDF / Print.'); }
}
function printElement(element) {
  if (!element) return;
  document.querySelectorAll('.screen').forEach(s => s.dataset.wasActive = s.classList.contains('active') ? 'yes' : 'no');
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('print-target', s.contains(element)));
  window.print();
  document.querySelectorAll('.screen').forEach(s => { s.classList.remove('print-target'); delete s.dataset.wasActive; });
}
document.getElementById('saveLetterImage')?.addEventListener('click', () => saveAsImage(document.querySelector('.long-letter'), 'a-letter-for-you.png'));
document.getElementById('saveFinalImage')?.addEventListener('click', () => saveAsImage(document.getElementById('finalContent'), 'the-special-message.png'));
document.getElementById('saveLetterPdf')?.addEventListener('click', () => printElement(document.querySelector('.long-letter')));
document.getElementById('saveFinalPdf')?.addEventListener('click', () => printElement(document.getElementById('finalContent')));

const passwordForm = document.getElementById('passwordForm');
passwordForm.addEventListener('submit', event => {
  event.preventDefault();
  const entered = document.getElementById('pagePassword').value.trim();
  const error = document.getElementById('passwordError');
  const success = document.getElementById('passwordSuccess');
  if (entered === '312026') {
    error.textContent = '';
    passwordForm.classList.add('hidden');
    success.classList.remove('hidden');
    burstFlowers(18);
  } else {
    error.textContent = 'لا الباسورد غلط يا أختي.';
    document.getElementById('pagePassword').focus();
  }
});

document.getElementById('revealFinal').addEventListener('click', () => {
  document.getElementById('passwordGate').classList.add('hidden');
  document.getElementById('finalContent').classList.remove('hidden');
  burstFlowers(30);
  playBackground();
});

function burstFlowers(amount) {
  const symbols = ['🌹', '🌸', '🌷', '♡', '✿'];
  for (let i = 0; i < amount; i++) {
    const item = document.createElement('span');
    item.className = 'burst-item'; item.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    item.style.left = `${Math.random() * 100}vw`;
    item.style.setProperty('--drift', `${(Math.random() - 0.5) * 180}px`);
    item.style.setProperty('--duration', `${2.8 + Math.random() * 2.2}s`);
    item.style.fontSize = `${18 + Math.random() * 20}px`;
    document.body.appendChild(item);
    window.setTimeout(() => item.remove(), 5300);
  }
}
