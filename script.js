import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDvT3ZSvLkht8Ozd2xSV5An6LMDKKrMiGU',
  authDomain: 'web-free-game.firebaseapp.com',
  projectId: 'web-free-game',
  storageBucket: 'web-free-game.firebasestorage.app',
  messagingSenderId: '904052109962',
  appId: '1:904052109962:web:824a0e08989b57057b7373',
};

const adminEmail = 'youssefkaroui204@gmail.com';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  isAdmin: false,
  isLoggedIn: false,
  userName: 'Guest',
  games: [],
  chatMessages: [],
};

const selectors = {
  gameList: document.getElementById('game-list'),
  searchInput: document.getElementById('search'),
  searchBtn: document.getElementById('search-btn'),
  openLogin: document.getElementById('open-login'),
  logoutBtn: document.getElementById('logout-btn'),
  loginModal: document.getElementById('login-modal'),
  closeLogin: document.getElementById('close-login'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  rememberMe: document.getElementById('remember-me'),
  userLabel: document.getElementById('user-label'),
  googleLoginBtn: document.getElementById('google-login'),
  openAddGame: document.getElementById('open-add-game'),
  addModal: document.getElementById('add-modal'),
  closeAdd: document.getElementById('close-add'),
  addGameForm: document.getElementById('add-game-form'),
  chatBox: document.getElementById('chat-box'),
  chatMessage: document.getElementById('chat-message'),
  sendChat: document.getElementById('send-chat'),
  navButtons: document.querySelectorAll('.nav-btn'),
};

function renderGames(list) {
  selectors.gameList.innerHTML = '';
  if (!list.length) {
    selectors.gameList.innerHTML = '<p>No games found.</p>';
    return;
  }

  list.forEach((game) => {
    const deleteButton = state.isAdmin
      ? `<button class="secondary-btn delete-btn" data-id="${game.id}">Delete</button>`
      : '';

    const card = document.createElement('article');
    card.className = 'game-card';
    card.innerHTML = `
      <img src="${game.image}" alt="${game.title}">
      <div class="card-body">
        <h3>${game.title}</h3>
        <p>${game.description || 'No description available.'}</p>
        <div class="card-actions">
          <a class="primary-btn" href="${game.download}" target="_blank" rel="noreferrer">Download</a>
          <a class="secondary-btn" href="${game.steam}" target="_blank" rel="noreferrer">View on Steam</a>
          ${deleteButton}
        </div>
      </div>
    `;
    selectors.gameList.appendChild(card);
  });

  if (state.isAdmin) {
    selectors.gameList.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const gameId = button.dataset.id;
        if (!gameId) return;
        if (!confirm('Delete this game?')) return;
        await deleteDoc(doc(db, 'games', gameId));
        loadGames();
      });
    });
  }
}

function renderChat(messages) {
  selectors.chatBox.innerHTML = '';
  if (!messages.length) {
    selectors.chatBox.innerHTML = '<p>No messages yet.</p>';
    return;
  }
  messages.forEach((item) => {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.innerHTML = `<strong>${item.author}</strong><span>${item.message}</span>`;
    selectors.chatBox.appendChild(chatItem);
  });
  selectors.chatBox.scrollTop = selectors.chatBox.scrollHeight;
}

function setUserLabel() {
  selectors.userLabel.textContent = state.userName;
  selectors.openAddGame.classList.toggle('hidden', !state.isAdmin);
  selectors.logoutBtn.classList.toggle('hidden', !state.isLoggedIn);
  selectors.openLogin.classList.toggle('hidden', state.isLoggedIn);
  selectors.chatMessage.placeholder = state.isLoggedIn
    ? 'Write a message...'
    : 'You can chat as Guest';
}

function toggleModal(modal, show) {
  modal.classList.toggle('hidden', !show);
}

function showSection(id) {
  document.querySelectorAll('.section').forEach((section) => {
    section.classList.toggle('hidden', section.id !== id);
    section.classList.toggle('active-section', section.id === id);
  });
}

async function loadGames() {
  const q = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  state.games = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderGames(state.games);
}

async function loadChat() {
  const q = query(collection(db, 'chatMessages'), orderBy('createdAt', 'asc'));
  onSnapshot(q, (snapshot) => {
    state.chatMessages = snapshot.docs.map((doc) => doc.data());
    renderChat(state.chatMessages);
  });
}

function filterGames(term) {
  if (!term) {
    renderGames(state.games);
    return;
  }
  const filtered = state.games.filter((game) =>
    game.title.toLowerCase().includes(term.toLowerCase())
  );
  renderGames(filtered);
}

async function handleLogin(event) {
  event.preventDefault();
  const email = selectors.loginEmail.value.trim();
  const password = selectors.loginPassword.value;
  const remember = selectors.rememberMe.checked;

  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    alert('Email/password login is for the admin only. Other users should use Google or continue as guest.');
    return;
  }

  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toggleModal(selectors.loginModal, false);
  } catch (error) {
    alert(`Email login failed: ${error.message}`);
  }
}

async function handleGoogleLogin() {
  await setPersistence(auth, browserSessionPersistence);
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    toggleModal(selectors.loginModal, false);
  } catch (error) {
    alert(`Google login failed: ${error.message}`);
  }
}

async function handleLogout() {
  await signOut(auth);
}

async function handleAddGame(event) {
  event.preventDefault();
  if (!state.isAdmin) {
    alert('You must login as admin to add a game.');
    return;
  }

  const title = document.getElementById('game-title').value.trim();
  const download = document.getElementById('game-download').value.trim();
  const steam = document.getElementById('game-steam').value.trim();
  const image = document.getElementById('game-image').value.trim();
  const description = document.getElementById('game-description').value.trim();

  await addDoc(collection(db, 'games'), {
    title,
    download,
    steam,
    image,
    description,
    createdAt: serverTimestamp(),
  });

  selectors.addGameForm.reset();
  toggleModal(selectors.addModal, false);
  loadGames();
}

async function handleSendChat() {
  const text = selectors.chatMessage.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, 'chatMessages'), {
      author: state.userName || 'Guest',
      message: text,
      createdAt: serverTimestamp(),
    });
    selectors.chatMessage.value = '';
  } catch (error) {
    alert(`Send failed: ${error.message}`);
    console.error('Chat send error:', error);
  }
}

selectors.searchBtn.addEventListener('click', () => filterGames(selectors.searchInput.value));
selectors.openLogin.addEventListener('click', () => toggleModal(selectors.loginModal, true));
selectors.closeLogin.addEventListener('click', () => toggleModal(selectors.loginModal, false));
selectors.openAddGame.addEventListener('click', () => toggleModal(selectors.addModal, true));
selectors.closeAdd.addEventListener('click', () => toggleModal(selectors.addModal, false));
selectors.loginForm.addEventListener('submit', handleLogin);
selectors.googleLoginBtn.addEventListener('click', handleGoogleLogin);
selectors.addGameForm.addEventListener('submit', handleAddGame);
selectors.sendChat.addEventListener('click', handleSendChat);
selectors.logoutBtn.addEventListener('click', handleLogout);
selectors.chatMessage.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleSendChat();
});
selectors.navButtons.forEach((button) => {
  button.addEventListener('click', () => showSection(button.dataset.target));
});

onAuthStateChanged(auth, (user) => {
  state.isLoggedIn = !!user;
  if (user) {
    state.userName = user.email || 'Admin';
    state.isAdmin = user.email === adminEmail;
  } else {
    state.userName = 'Guest';
    state.isAdmin = false;
  }
  setUserLabel();
  renderGames(state.games);
});

loadGames();
loadChat();
filterGames('');
renderChat([]);
