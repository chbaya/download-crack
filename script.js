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
  updateDoc,
  doc,
  increment,
  setDoc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import {
  getFunctions,
  httpsCallable,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js';

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
  visitCount: 0,
  aiChatHistory: [],
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
  addModalTitle: document.getElementById('add-modal-title'),
  closeAdd: document.getElementById('close-add'),
  addGameForm: document.getElementById('add-game-form'),
  chatBox: document.getElementById('chat-box'),
  chatMessage: document.getElementById('chat-message'),
  sendChat: document.getElementById('send-chat'),
  navButtons: document.querySelectorAll('.nav-btn'),
  visitCountValue: document.getElementById('visit-count-value'),
  aiChatBox: document.getElementById('ai-chat-box'),
  aiMessage: document.getElementById('ai-message'),
  sendAiMessage: document.getElementById('send-ai-message'),
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
    const editButton = state.isAdmin
      ? `<button class="secondary-btn edit-btn" data-id="${game.id}">Edit</button>`
      : '';

    const card = document.createElement('article');
    card.className = 'game-card';
    const downloadCount = game.downloads || 0;
    card.innerHTML = `
      <img src="${game.image}" alt="${game.title}">
      <div class="card-body">
        <h3>${game.title}</h3>
        <p>${game.description || 'No description available.'}</p>
        <div class="card-actions">
          <a class="primary-btn download-btn" href="${game.download}" target="_blank" rel="noreferrer" data-id="${game.id}" data-url="${game.download}">Download</a>
          <a class="secondary-btn" href="${game.steam}" target="_blank" rel="noreferrer">View on Steam</a>
          ${editButton}
          ${deleteButton}
        </div>
        <div class="download-meta">
          <span class="download-count">${downloadCount} downloads</span>
        </div>
      </div>
    `;
    selectors.gameList.appendChild(card);
  });

  selectors.gameList.querySelectorAll('.download-btn').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const gameId = link.dataset.id;
      const url = link.dataset.url;
      if (!gameId) {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      try {
        await updateDoc(doc(db, 'games', gameId), {
          downloads: increment(1),
        });

        const game = state.games.find((item) => item.id === gameId);
        if (game) {
          game.downloads = (game.downloads || 0) + 1;
          const countEl = link.closest('.card-body')?.querySelector('.download-count');
          if (countEl) {
            countEl.textContent = `${game.downloads} downloads`;
          }
        }
      } catch (error) {
        console.error('Download counter update failed:', error);
      }

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
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
    // Edit button handlers
    selectors.gameList.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const gameId = button.dataset.id;
        if (!gameId) return;
        const game = state.games.find((g) => g.id === gameId);
        if (!game) return;
        // populate form
        document.getElementById('game-title').value = game.title || '';
        document.getElementById('game-download').value = game.download || '';
        document.getElementById('game-steam').value = game.steam || '';
        document.getElementById('game-image').value = game.image || '';
        document.getElementById('game-description').value = game.description || '';
        // mark form as editing
        selectors.addGameForm.dataset.editId = gameId;
        selectors.addModalTitle.textContent = 'Edit Game';
        toggleModal(selectors.addModal, true);
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
  if (show) {
    // When showing modal, move focus to first input
    setTimeout(() => {
      const firstInput = modal.querySelector('input, button');
      if (firstInput) firstInput.focus();
    }, 0);
  } else {
    // When hiding modal, blur active element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}

function updateVisitCount(value) {
  if (selectors.visitCountValue) {
    selectors.visitCountValue.textContent = value;
  }
}

async function recordVisit() {
  try {
    const statsRef = doc(db, 'stats', 'overview');
    await setDoc(statsRef, { visits: increment(1) }, { merge: true });
    const snapshot = await getDoc(statsRef);
    state.visitCount = snapshot.exists() ? snapshot.data().visits || 0 : 0;
    updateVisitCount(state.visitCount);
  } catch (error) {
    console.error('Visit counter update failed:', error);
  }
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

  const editId = selectors.addGameForm.dataset.editId;

  if (editId) {
    // update existing game
    try {
      await updateDoc(doc(db, 'games', editId), {
        title,
        download,
        steam,
        image,
        description,
        updatedAt: serverTimestamp(),
      });
      selectors.addGameForm.removeAttribute('data-edit-id');
      selectors.addModalTitle.textContent = 'Add Game';
      selectors.addGameForm.reset();
      toggleModal(selectors.addModal, false);
      loadGames();
      return;
    } catch (err) {
      alert(`Update failed: ${err.message}`);
      return;
    }
  }

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

function renderAiChat() {
  selectors.aiChatBox.innerHTML = '';
  if (!state.aiChatHistory.length) {
    const intro = document.createElement('div');
    intro.className = 'ai-message assistant';
    intro.textContent = "Hi! I'm your AI Game Advisor. Ask me about your gaming preferences, and I'll recommend games from our collection!";
    selectors.aiChatBox.appendChild(intro);
    return;
  }
  state.aiChatHistory.forEach((item) => {
    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${item.role}`;
    messageEl.textContent = item.text;
    selectors.aiChatBox.appendChild(messageEl);
  });
  selectors.aiChatBox.scrollTop = selectors.aiChatBox.scrollHeight;
}

async function handleAiMessage() {
  const text = selectors.aiMessage.value.trim();
  if (!text) return;

  state.aiChatHistory.push({ role: 'user', text });
  renderAiChat();
  selectors.aiMessage.value = '';

  try {
    // Call Firebase Cloud Function for real AI response
    const response = await firebase.functions().httpsCallable('getAiResponse')({
      userMessage: text,
      games: state.games,
    });

    const aiResponse = response.data.response || 'I couldn\'t generate a response. Try again!';
    state.aiChatHistory.push({ role: 'assistant', text: aiResponse });
    renderAiChat();
  } catch (error) {
    console.error('AI response error:', error);
    state.aiChatHistory.push({
      role: 'assistant',
      text: 'Sorry, I encountered an error. Please try again later.',
    });
    renderAiChat();
  }
}

function generateAiRecommendation(userMessage, gamesList) {
  const message = userMessage.toLowerCase();
  
  if (!state.games.length) {
    return 'No games available yet. Check back soon!';
  }

  // Action/Combat games
  if (message.includes('action') || message.includes('fight') || message.includes('combat') || message.includes('shooter')) {
    const actionGames = state.games.filter(g => g.description.toLowerCase().includes('action') || g.description.toLowerCase().includes('combat'));
    if (actionGames.length) {
      return `I recommend: ${actionGames[0].title}. ${actionGames[0].description || 'A great action game!'}`;
    }
  }

  // Puzzle games
  if (message.includes('puzzle') || message.includes('brain') || message.includes('logic') || message.includes('strategy')) {
    const puzzleGames = state.games.filter(g => g.description.toLowerCase().includes('puzzle') || g.description.toLowerCase().includes('strategy'));
    if (puzzleGames.length) {
      return `I recommend: ${puzzleGames[0].title}. ${puzzleGames[0].description || 'Perfect for puzzle lovers!'}`;
    }
  }

  // Adventure/RPG games
  if (message.includes('adventure') || message.includes('explore') || message.includes('story') || message.includes('rpg')) {
    const adventureGames = state.games.filter(g => g.description.toLowerCase().includes('adventure') || g.description.toLowerCase().includes('story'));
    if (adventureGames.length) {
      return `I recommend: ${adventureGames[0].title}. ${adventureGames[0].description || 'Great for adventure lovers!'}`;
    }
  }

  // Free games
  if (message.includes('free') || message.includes('cost') || message.includes('price')) {
    const freeGames = state.games.slice(0, 2);
    return `All our games are free! Try ${freeGames[0].title} or ${freeGames[1]?.title || 'another from our collection'}!`;
  }

  // Popular/Best
  if (message.includes('popular') || message.includes('best') || message.includes('top') || message.includes('recommend')) {
    const topGames = state.games.slice(0, 2);
    return `Our popular games: ${topGames[0].title} and ${topGames[1]?.title || 'more coming soon'}. Both are excellent choices!`;
  }

  // Download count recommendation
  if (message.includes('download') || message.includes('most played')) {
    const mostDownloaded = state.games.reduce((prev, current) => 
      (prev.downloads || 0) > (current.downloads || 0) ? prev : current
    );
    return `${mostDownloaded.title} is our most downloaded game with ${mostDownloaded.downloads || 0} downloads. Great choice!`;
  }

  // Generic fallback with better variety
  const randomGame = state.games[Math.floor(Math.random() * state.games.length)];
  const suggestions = [
    `Try ${randomGame.title}! It's a great game to start with.`,
    `Have you considered ${randomGame.title}? Many players love it!`,
    `${randomGame.title} is worth checking out based on our collection.`,
    `I think you'd enjoy ${randomGame.title}. Want to know more?`,
  ];
  
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

selectors.searchBtn.addEventListener('click', () => filterGames(selectors.searchInput.value));
selectors.searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    filterGames(selectors.searchInput.value);
  }
});
selectors.openLogin.addEventListener('click', () => toggleModal(selectors.loginModal, true));
selectors.closeLogin.addEventListener('click', () => toggleModal(selectors.loginModal, false));
selectors.openAddGame.addEventListener('click', () => {
  delete selectors.addGameForm.dataset.editId;
  selectors.addModalTitle.textContent = 'Add Game';
  selectors.addGameForm.reset();
  toggleModal(selectors.addModal, true);
});
selectors.closeAdd.addEventListener('click', () => {
  delete selectors.addGameForm.dataset.editId;
  selectors.addModalTitle.textContent = 'Add Game';
  selectors.addGameForm.reset();
  toggleModal(selectors.addModal, false);
});
selectors.loginForm.addEventListener('submit', handleLogin);
selectors.googleLoginBtn.addEventListener('click', handleGoogleLogin);
selectors.addGameForm.addEventListener('submit', handleAddGame);
selectors.sendChat.addEventListener('click', handleSendChat);
selectors.sendAiMessage.addEventListener('click', handleAiMessage);
selectors.aiMessage.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleAiMessage();
});
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

recordVisit();
loadGames();
loadChat();
filterGames('');
renderChat([]);
renderAiChat();
