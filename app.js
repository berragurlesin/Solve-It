let currentCategoryFilter = 'all';
let searchQuery = '';
let currentAuthMode = 'signin';
let activeReservingTicketId = null;

document.addEventListener('DOMContentLoaded', () => {
  seedInitialData();
  checkUserSession();
  renderTickets();
  setupFormListeners();
});

function compressAndConvertToBase64(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function makeLinksClickable(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline font-bold break-all">${url}</a>`;
  });
}

function formatTicketId(id) {
  const numericId = parseInt(id, 10) || 0;
  return String(numericId).padStart(3, '0');
}

function seedInitialData() {
  const sampleTickets = [
    {
      id: 1,
      title: "Lack of Astrophysics Olympiad Resources for Studying",
      category: "Education",
      description: "Preparing for the Astrophysics Olympiad, but struggling to find structured problem sets and clear, step-by-step solutions.",
      issuer: "astro_fen",
      reservedBy: null,
      status: "OPEN",
      urgent: true,
      image: null,
      approvedSolutionId: null,
      solutions: [],
      readme: null
    },
    {
      id: 2,
      title: "Difficulty Finding Teammates for Projects & Competitions",
      category: "Community",
      description: "Looking for teammates who match my skill set, vision, and work ethic for technical competitions and hackathons.",
      issuer: "maker_06",
      reservedBy: null,
      status: "OPEN",
      urgent: false,
      image: null,
      approvedSolutionId: null,
      solutions: [],
      readme: null
    }
  ];

  const existingTickets = JSON.parse(localStorage.getItem('solveit_tickets'));
  if (!existingTickets || existingTickets.length === 0) {
    localStorage.setItem('solveit_tickets', JSON.stringify(sampleTickets));
  } else {
    const updated = existingTickets.map(t => ({
      ...t,
      status: t.status || 'OPEN',
      urgent: t.urgent || false,
      image: t.image || null,
      approvedSolutionId: t.approvedSolutionId || null
    }));
    localStorage.setItem('solveit_tickets', JSON.stringify(updated));
  }

  if (!localStorage.getItem('solveit_users_db')) {
    localStorage.setItem('solveit_users_db', JSON.stringify({}));
  }
}

/* YENİLENEN NAVİGASYON/PROFİL SİMGESİ GÖRÜNÜMÜ */
function checkUserSession() {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  const navAuthArea = document.getElementById('navAuthArea');
  if (!navAuthArea) return;

  if (user && user.username) {
    const notifications = JSON.parse(localStorage.getItem(`solveit_notifs_${user.username}`) || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;

    navAuthArea.innerHTML = `
      <div class="flex items-center gap-5 font-mono-ticket text-xs">
        <button onclick="openYourProjectsModal()" class="text-slate-300 hover:text-white font-bold transition cursor-pointer">
          Your Projects
        </button>
        <button onclick="openNotificationsModal()" class="text-slate-300 hover:text-white font-bold transition cursor-pointer relative flex items-center gap-1.5">
          <span>Notifications</span>
          ${unreadCount > 0 ? `<span class="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-none animate-pulse">${unreadCount}</span>` : ''}
        </button>
        <button onclick="openProfileModal('${user.username}')" class="text-slate-300 hover:text-white font-bold transition cursor-pointer rounded-full flex items-center gap-1">
          👤 @${user.username}
        </button>
        <button onclick="handleLogout()" class="text-slate-300 hover:text-white font-bold transition cursor-pointer relative flex items-center gap-1.5">
          Sign Out
        </button>
      </div>
    `;
  } else {
    navAuthArea.innerHTML = `
      <div class="flex items-center gap-4 font-mono-ticket text-xs">
        <button onclick="openYourProjectsModal()" class="text-slate-300 hover:text-white font-bold transition cursor-pointer">
          Your Projects
        </button>
        <button onclick="openNotificationsModal()" class="text-slate-300 hover:text-white font-bold transition cursor-pointer">
          Notifications
        </button>
        <button onclick="openAuthModal('signin')" class="text-slate-300 hover:text-white font-bold transition cursor-pointer">
          Sign In
        </button>
        <button onclick="openAuthModal('signup')" class="bg-white hover:bg-slate-200 text-black font-bold px-4 py-1.5 rounded-full transition cursor-pointer">
          Sign Up
        </button>
      </div>
    `;
  }
}

function openAuthModal(mode) {
  currentAuthMode = mode;
  const modal = document.getElementById('authModal');
  const title = document.getElementById('authModalTitle');
  const switchText = document.getElementById('authSwitchText');
  const switchBtn = document.getElementById('authSwitchBtn');
  const errorMsg = document.getElementById('authErrorMsg');

  if (errorMsg) errorMsg.classList.add('hidden');
  const uInput = document.getElementById('authUsername');
  const pInput = document.getElementById('authPassword');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';

  if (mode === 'signup') {
    if (title) title.innerText = 'CREATE ACCOUNT';
    if (switchText) switchText.innerText = 'Already have an account?';
    if (switchBtn) switchBtn.innerText = 'Sign In';
  } else {
    if (title) title.innerText = 'SIGN IN';
    if (switchText) switchText.innerText = "Don't have an account?";
    if (switchBtn) switchBtn.innerText = 'Sign Up';
  }

  if (modal) modal.classList.remove('hidden');
}

function switchAuthMode() {
  openAuthModal(currentAuthMode === 'signin' ? 'signup' : 'signin');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('authUsername').value.trim().toLowerCase();
  const password = document.getElementById('authPassword').value.trim();
  const errorMsg = document.getElementById('authErrorMsg');

  if (!username || !password) return;

  const usersDb = JSON.parse(localStorage.getItem('solveit_users_db')) || {};

  if (currentAuthMode === 'signup') {
    if (usersDb[username]) {
      if (errorMsg) {
        errorMsg.innerText = 'Username already taken. Try signing in.';
        errorMsg.classList.remove('hidden');
      }
      return;
    }
    usersDb[username] = password;
    localStorage.setItem('solveit_users_db', JSON.stringify(usersDb));
    localStorage.setItem('solveit_user', JSON.stringify({ username }));
    closeAuthModal();
    checkUserSession();
    renderTickets();
  } else {
    if (!usersDb[username]) {
      if (errorMsg) {
        errorMsg.innerText = 'User not found. Please sign up first.';
        errorMsg.classList.remove('hidden');
      }
      return;
    }
    if (usersDb[username] !== password) {
      if (errorMsg) {
        errorMsg.innerText = 'Incorrect password.';
        errorMsg.classList.remove('hidden');
      }
      return;
    }
    localStorage.setItem('solveit_user', JSON.stringify({ username }));
    closeAuthModal();
    checkUserSession();
    renderTickets();
  }
}

function handleLogout() {
  localStorage.removeItem('solveit_user');
  checkUserSession();
  renderTickets();
}

function getTickets() {
  return JSON.parse(localStorage.getItem('solveit_tickets')) || [];
}

function handleSearch() {
  const input = document.getElementById('searchInput');
  searchQuery = input ? input.value.toLowerCase().trim() : '';
  renderTickets();
}

function getCategoryClass(cat) {
  switch ((cat || '').toLowerCase()) {
    case 'education': return 'ticket-education';
    case 'software': return 'ticket-software';
    case 'technology': return 'ticket-technology';
    case 'transportation': return 'ticket-transportation';
    case 'community': return 'ticket-community';
    default: return 'ticket-other';
  }
}

function addNotification(targetUsername, message, ticketId) {
  if (!targetUsername) return;
  const notifs = JSON.parse(localStorage.getItem(`solveit_notifs_${targetUsername}`) || '[]');
  notifs.unshift({
    id: Date.now(),
    message,
    ticketId,
    read: false,
    timestamp: new Date().toLocaleString()
  });
  localStorage.setItem(`solveit_notifs_${targetUsername}`, JSON.stringify(notifs));
}

function renderTickets() {
  const grid = document.getElementById('ticketGrid');
  if (!grid) return;

  const user = JSON.parse(localStorage.getItem('solveit_user'));
  const tickets = getTickets();
  grid.innerHTML = '';

  const filtered = tickets.filter(t => {
    if (currentCategoryFilter === 'resolved') {
      if (t.status !== 'RESOLVED') return false;
    } 
    else if (currentCategoryFilter === 'urgent') {
      if (t.status === 'RESOLVED') return false;
      if (t.urgent !== true) return false;
    } 
    else {
      if (t.status === 'RESOLVED') return false;
      if (currentCategoryFilter !== 'all' && t.category.toLowerCase() !== currentCategoryFilter.toLowerCase()) {
        return false;
      }
    }

    const formattedId = formatTicketId(t.id);
    const matchesSearch = searchQuery === '' || 
      t.title.toLowerCase().includes(searchQuery) || 
      t.description.toLowerCase().includes(searchQuery) ||
      t.issuer.toLowerCase().includes(searchQuery) ||
      formattedId.includes(searchQuery);

    return matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-2 text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-[#121215]">
        <p class="text-slate-400 font-mono-ticket text-sm mb-2">NO MATCHING TICKETS FOUND.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(t => {
    const colorClass = getCategoryClass(t.category);
    const card = document.createElement('div');
    const isReserved = Boolean(t.reservedBy);
    const isOwner = user && user.username === t.issuer;
    const isResolved = t.status === 'RESOLVED';

    const statusText = isResolved
      ? '✓ SOLVED & APPROVED'
      : (t.readme ? 'SOLUTION PUBLISHED' : (isReserved ? `CLAIMED BY @${t.reservedBy}` : `${(t.solutions || []).length} SOLVER(S)`));

    card.className = `ticket-card ${colorClass} ${isResolved ? 'torn-ticket' : ''} flex overflow-hidden shadow-2xl transition hover:scale-[1.01] duration-200 h-64 relative`;

    card.innerHTML = `
      <div class="ticket-notch-top"></div>
      <div class="ticket-notch-bottom"></div>

      ${t.urgent && !isResolved ? `
        <div class="absolute top-0 left-0 z-20 overflow-hidden w-28 h-28 pointer-events-none">
          <div class="bg-red-600 text-white font-black text-[9px] uppercase tracking-widest flex items-center justify-center shadow-md -rotate-45 -translate-x-9 translate-y-5 w-36 h-5 border-b border-red-700">
            URGENT
          </div>
        </div>
      ` : ''}

      <div class="p-6 flex-1 flex flex-col justify-between border-r-2 border-dashed border-black/30 cursor-pointer relative" onclick="openDetailModal(${t.id})">
        ${isResolved ? `<div class="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center font-black text-emerald-800/20 text-4xl rotate-[-12deg] tracking-widest select-none">RESOLVED</div>` : ''}
        
        <div>
          <div class="flex justify-between items-center text-xs font-bold tracking-wider opacity-80 mb-3">
            <span class="${t.urgent && !isResolved ? 'pl-7' : ''}">TICKET #${formatTicketId(t.id)} ${isResolved ? '(STUB)' : ''}</span>
            <span class="uppercase font-extrabold">${t.category}</span>
          </div>

          <h3 class="text-xl font-bold leading-tight mb-3 text-black">${t.title}</h3>
          
          <div class="flex gap-3 items-start">
            <p class="text-xs opacity-80 line-clamp-3 leading-relaxed font-semibold flex-1">${t.description}</p>
          </div>
        </div>

        <div class="pt-3 border-t border-black/15 flex justify-between items-center text-xs font-bold">
          <span onclick="event.stopPropagation(); openProfileModal('${t.issuer}')" class="hover:underline cursor-pointer">ISSUER: @${t.issuer}</span>
          <span class="${isResolved ? 'text-emerald-950 font-black' : ''}">${statusText}</span>
        </div>
      </div>

      <div class="w-32 p-3 flex flex-col justify-between items-center bg-black/10 text-center z-10 relative">
        <span class="text-[9px] font-bold tracking-widest opacity-70">${isResolved ? 'USED STUB' : 'ADMIT ONE'}</span>
        
        <div class="w-full h-10 barcode-lines opacity-80 my-1"></div>
        
        <div class="w-full space-y-1">
          <button onclick="openDetailModal(${t.id})" class="w-full bg-black text-white text-[9px] font-bold py-1.5 rounded uppercase tracking-wider hover:opacity-80 transition">
            INSPECT
          </button>
          
          ${!isResolved ? `
            <button onclick="toggleReserveTicket(event, ${t.id})" class="w-full ${isReserved ? 'bg-red-600 text-white' : 'bg-[#18181b] text-[#facc15]'} border border-amber-400/20 text-[9px] font-bold py-1.5 rounded uppercase tracking-wider hover:opacity-90 transition">
              ${isReserved ? 'RESERVED' : 'RESERVE'}
            </button>
          ` : `
            <div class="w-full bg-emerald-900 text-emerald-100 text-[8px] font-bold py-1 rounded uppercase tracking-widest">
              APPROVED
            </div>
          `}

          ${isOwner ? `
            <button onclick="deleteTicket(event, ${t.id})" class="w-full bg-red-700 hover:bg-red-800 text-white text-[9px] font-bold py-1 rounded uppercase tracking-wider transition">
              DELETE
            </button>
          ` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterTickets(cat) {
  currentCategoryFilter = cat;
  renderTickets();
}

function toggleReserveTicket(e, ticketId) {
  if (e) e.stopPropagation();

  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) {
    openAuthModal('signin');
    return;
  }

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));
  if (!ticket || ticket.status === 'RESOLVED') return;

  if (ticket.reservedBy === user.username) {
    ticket.reservedBy = null;
    localStorage.setItem('solveit_tickets', JSON.stringify(tickets));
    renderTickets();
    checkUserSession();
    return;
  }

  if (ticket.reservedBy && ticket.reservedBy !== user.username) return;

  openReservePlanModal(ticketId, ticket.title, ticket.issuer);
}

function openReservePlanModal(ticketId, title, issuer) {
  activeReservingTicketId = ticketId;

  let modal = document.getElementById('reservePlanModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reservePlanModal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono-ticket';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-[#121215] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 relative text-white shadow-2xl">
      <div class="flex justify-between items-center mb-3 border-b border-slate-800 pb-3">
        <h3 class="text-xs font-bold text-amber-400 tracking-wider uppercase">RESERVE PROJECT #${formatTicketId(ticketId)}</h3>
        <button onclick="closeReservePlanModal()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <h4 class="text-base font-bold font-sans text-white mb-2 leading-tight">${title}</h4>
      <p class="text-xs text-slate-400 mb-4">Write a quick plan for <span class="text-slate-200 font-bold">@${issuer}</span>:</p>

      <form onsubmit="submitReservePlan(event)">
        <textarea id="reservePlanInput" required rows="3" placeholder="e.g. I can solve this using YOLOv8..." class="w-full bg-[#09090b] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 mb-4 resize-none"></textarea>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="closeReservePlanModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition uppercase">
            CANCEL
          </button>
          <button type="submit" class="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-lg transition uppercase">
            CONFIRM RESERVATION
          </button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeReservePlanModal() {
  const modal = document.getElementById('reservePlanModal');
  if (modal) modal.classList.add('hidden');
  activeReservingTicketId = null;
}

function submitReservePlan(e) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user || !activeReservingTicketId) return;

  const input = document.getElementById('reservePlanInput');
  const note = input ? input.value.trim() : '';

  if (!note) return;

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(activeReservingTicketId, 10));
  if (!ticket) return;

  ticket.reservedBy = user.username;
  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));

  if (ticket.issuer !== user.username) {
    addNotification(
      ticket.issuer,
      `@${user.username} reserved your ticket #${formatTicketId(ticket.id)} with plan: "${note}"`,
      ticket.id
    );
  }

  closeReservePlanModal();
  renderTickets();
  checkUserSession();

  openReadmeEditorModal(ticket.id);
}

function openReadmeEditorModal(ticketId) {
  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));
  if (!ticket) return;

  let modal = document.getElementById('readmeEditorModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'readmeEditorModal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono-ticket';
    document.body.appendChild(modal);
  }

  const existingReadme = ticket.readme || { title: '', content: '', links: [''], image: null };

  modal.innerHTML = `
    <div class="bg-[#121215] border border-emerald-500/40 rounded-2xl max-w-xl w-full p-6 relative text-white shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <h3 class="text-xs font-bold text-emerald-400 tracking-wider uppercase">PROJECT README & DETAILS (#${formatTicketId(ticketId)})</h3>
        <button onclick="closeReadmeEditorModal()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <form onsubmit="submitReadmeDetails(event, ${ticket.id})" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">README TITLE:</label>
          <input type="text" id="readmeTitleInput" required value="${existingReadme.title || ''}" placeholder="e.g. Astrophysics Problem Set Resource Drive" class="w-full bg-[#09090b] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">README CONTENT (Markdown / Text):</label>
          <textarea id="readmeContentInput" required rows="6" placeholder="Describe how your solution works, setup steps, or architecture details..." class="w-full bg-[#09090b] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 resize-none">${existingReadme.content || ''}</textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">RESOURCE LINK (GitHub, Drive, Video):</label>
          <input type="url" id="readmeLinkInput" value="${(existingReadme.links && existingReadme.links[0]) || ''}" placeholder="https://..." class="w-full bg-[#09090b] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">ATTACH README IMAGE:</label>
          <input type="file" id="readmeImageInput" accept="image/*" class="w-full bg-[#09090b] border border-slate-700 rounded-xl p-2 text-xs text-slate-400 focus:outline-none focus:border-emerald-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900 cursor-pointer">
          ${existingReadme.image ? `<p class="text-[10px] text-emerald-400 mt-1">✓ An image is already attached. Uploading a new one will replace it.</p>` : ''}
        </div>

        <div class="flex gap-2 justify-end pt-2">
          <button type="button" onclick="closeReadmeEditorModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition uppercase">
            SKIP / LATER
          </button>
          <button type="submit" class="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition uppercase">
            PUBLISH README
          </button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeReadmeEditorModal() {
  const modal = document.getElementById('readmeEditorModal');
  if (modal) modal.classList.add('hidden');
}

async function submitReadmeDetails(e, ticketId) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  const title = document.getElementById('readmeTitleInput').value.trim();
  const content = document.getElementById('readmeContentInput').value.trim();
  const link = document.getElementById('readmeLinkInput').value.trim();

  const imageInput = document.getElementById('readmeImageInput');
  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));
  if (!ticket) return;

  let base64Image = ticket.readme ? ticket.readme.image : null;

  if (imageInput && imageInput.files && imageInput.files[0]) {
    try {
      base64Image = await compressAndConvertToBase64(imageInput.files[0]);
    } catch (err) {
      console.error("Readme error:", err);
    }
  }

  ticket.readme = {
    title: title,
    content: content,
    author: user ? user.username : (ticket.reservedBy || 'anonymous'),
    links: link ? [link] : [],
    image: base64Image,
    publishedAt: new Date().toLocaleString()
  };

  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));

  if (user && ticket.issuer !== user.username) {
    addNotification(
      ticket.issuer,
      `@${user.username} published a solution Readme on ticket #${formatTicketId(ticket.id)}`,
      ticket.id
    );
  }

  closeReadmeEditorModal();
  renderTickets();
  openDetailModal(ticketId);
}

function openDetailModal(id) {
  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(id, 10));
  if (!ticket) return;

  const container = document.getElementById('detailCardContainer');
  if (!container) return;

  const user = JSON.parse(localStorage.getItem('solveit_user'));
  const isIssuer = user && user.username === ticket.issuer;
  const isResolved = ticket.status === 'RESOLVED';
  const solutionsList = ticket.solutions || [];

  container.innerHTML = `
    <div class="bg-[#121215] border border-slate-800 rounded-2xl p-6 sm:p-8 relative text-white font-mono-ticket max-h-[85vh] overflow-y-auto shadow-2xl w-full">
      <button onclick="closeDetailModal()" class="absolute top-5 right-5 text-slate-500 hover:text-white text-lg transition">✕</button>

      <div class="flex items-center gap-2 mb-3 text-xs text-slate-400">
        <span class="font-bold text-purple-400">#${formatTicketId(ticket.id)}</span>
        <span>•</span>
        <span class="uppercase font-semibold text-slate-300">${ticket.category || 'OTHER'}</span>
        <span>•</span>
        ${isResolved 
          ? `<span class="text-emerald-400 font-bold">RESOLVED</span>` 
          : (ticket.reservedBy ? `<span class="text-amber-400 font-medium">CLAIMED BY @${ticket.reservedBy}</span>` : `<span class="text-slate-500">OPEN</span>`)}
      </div>

      <h2 class="text-2xl font-bold mb-3 text-white tracking-tight">${ticket.title}</h2>
      
      <div class="text-slate-300 text-sm leading-relaxed mb-6 bg-[#09090b] p-4 rounded-xl border border-slate-800/80 space-y-4">
        <div>${makeLinksClickable(ticket.description)}</div>
        ${ticket.image ? `
          <div class="pt-2 border-t border-slate-800/60">
            <span class="text-[10px] text-slate-500 block mb-2 font-bold uppercase tracking-wider">ATTACHED IMAGE:</span>
            <a href="${ticket.image}" target="_blank" rel="noopener noreferrer">
              <img src="${ticket.image}" alt="Bilet Görseli" class="max-h-64 rounded-lg border border-slate-700 object-contain hover:opacity-90 transition" />
            </a>
          </div>
        ` : ''}
      </div>

      ${isResolved ? `
        <div class="p-5 bg-[#09090b] border border-emerald-500/30 rounded-xl">
          <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">APPROVED SOLUTION & README</span>
            ${ticket.readme?.author || ticket.reservedBy ? `<span class="text-[11px] text-slate-500 cursor-pointer hover:underline" onclick="closeDetailModal(); openProfileModal('${ticket.readme?.author || ticket.reservedBy}')">by @${ticket.readme?.author || ticket.reservedBy}</span>` : ''}
          </div>
          
          ${ticket.readme ? `
            <div class="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed mb-3">
              ${makeLinksClickable(ticket.readme.content)}
            </div>
            ${ticket.readme.image ? `
              <div class="my-3 pt-2 border-t border-slate-800/60">
                <span class="text-[10px] text-emerald-400 block mb-2 font-bold uppercase tracking-wider">README ATTACHMENT:</span>
                <a href="${ticket.readme.image}" target="_blank" rel="noopener noreferrer">
                  <img src="${ticket.readme.image}" alt="Readme Visual" class="max-h-64 rounded-lg border border-slate-700 object-contain hover:opacity-90 transition" />
                </a>
              </div>
            ` : ''}
            ${(ticket.readme.links && ticket.readme.links.length > 0) ? `
              <div class="flex flex-wrap gap-2 pt-3 border-t border-slate-800/60">
                ${ticket.readme.links.map(l => `
                  <a href="${l}" target="_blank" rel="noopener noreferrer" class="text-xs text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1">
                    ${l} ↗
                  </a>
                `).join('')}
              </div>
            ` : ''}
          ` : `
            <p class="text-xs text-slate-400 italic">This issue was marked as resolved.</p>
          `}
        </div>
      ` : `
        <div class="border-t border-slate-800/80 pt-5">
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-bold text-slate-400 tracking-wider uppercase">SOLUTIONS & COMMENTS (${solutionsList.length})</span>
            <button onclick="openReadmeEditorModal(${ticket.id})" class="text-xs text-purple-400 hover:text-purple-300 font-bold underline">
              + Attach Readme / Link
            </button>
          </div>

          <div class="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1">
            ${solutionsList.length === 0
              ? `<p class="text-xs text-slate-600 italic py-2">No solutions or comments submitted yet.</p>`
              : solutionsList.map((s, index) => {
                  const solId = s.id !== undefined ? s.id : index;
                  const isCommentOwner = user && user.username === s.solver;

                  return `
                    <div class="p-3.5 bg-[#09090b] border border-slate-800 rounded-lg text-xs space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-300 cursor-pointer hover:underline" onclick="closeDetailModal(); openProfileModal('${s.solver}')">@${s.solver}</span>
                        <div class="flex items-center gap-2">
                          ${isIssuer ? `
                            <button onclick="approveSolution(${ticket.id}, ${solId})" class="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded transition">
                              Approve
                            </button>
                          ` : ''}
                          ${isCommentOwner ? `
                            <button onclick="deleteSolution(${ticket.id}, ${solId})" class="text-[10px] text-slate-500 hover:text-red-400 transition">
                              ✕
                            </button>
                          ` : ''}
                        </div>
                      </div>

                      <div class="text-slate-400 leading-relaxed">${makeLinksClickable(s.text)}</div>

                      ${ticket.readme && (ticket.readme.author === s.solver || ticket.reservedBy === s.solver) ? `
                        <div class="mt-2 pt-2 border-t border-slate-800/60 text-slate-300 bg-slate-900/40 p-2.5 rounded">
                          <span class="text-[10px] font-bold text-purple-400 block mb-1">ATTACHED README:</span>
                          <p class="text-[11px] whitespace-pre-wrap">${makeLinksClickable(ticket.readme.content)}</p>
                          ${ticket.readme.image ? `
                            <div class="mt-2">
                              <a href="${ticket.readme.image}" target="_blank" rel="noopener noreferrer">
                                <img src="${ticket.readme.image}" alt="Readme Görseli" class="max-h-48 rounded border border-slate-700 object-contain hover:opacity-90 transition" />
                              </a>
                            </div>
                          ` : ''}
                          ${(ticket.readme.links && ticket.readme.links.length > 0) ? `
                            <div class="flex flex-wrap gap-2 mt-2">
                              ${ticket.readme.links.map(l => `
                                <a href="${l}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-purple-400 underline">
                                  ${l} ↗
                                </a>
                              `).join('')}
                            </div>
                          ` : ''}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
          </div>

          <form onsubmit="submitSolution(event, ${ticket.id})" class="flex gap-2">
            <input type="text" id="solutionInput" required placeholder="Suggest a solution or paste repo link..." class="flex-1 bg-[#09090b] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono-ticket">
            <button type="submit" class="bg-white hover:bg-slate-200 text-black font-bold px-4 py-2 rounded-lg text-xs transition">
              SEND
            </button>
          </form>
        </div>
      `}

    </div>
  `;

  const detailModal = document.getElementById('detailModal');
  if (detailModal) detailModal.classList.remove('hidden');
}

function approveSolution(ticketId, solId) {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) return;

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));

  if (!ticket || ticket.issuer !== user.username) return;

  ticket.status = 'RESOLVED';
  ticket.approvedSolutionId = solId;

  const sol = ticket.solutions.find((s, index) => (s.id !== undefined ? s.id : index) === solId);
  if (sol && sol.solver !== user.username) {
    addNotification(
      sol.solver,
      `🎉 @${user.username} approved your solution on ticket #${formatTicketId(ticket.id)}!`,
      ticket.id
    );
  }

  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));
  openDetailModal(ticketId);
  renderTickets();
}

function submitSolution(e, ticketId) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) {
    closeDetailModal();
    openAuthModal('signin');
    return;
  }

  const input = document.getElementById('solutionInput');
  const text = input ? input.value : '';

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));
  if (!ticket || ticket.status === 'RESOLVED') return;

  if (!ticket.solutions) ticket.solutions = [];
  
  ticket.solutions.push({ 
    id: Date.now(), 
    solver: user.username, 
    text 
  });

  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));

  if (ticket.issuer !== user.username) {
    addNotification(
      ticket.issuer,
      `@${user.username} commented/proposed a solution on ticket #${formatTicketId(ticket.id)}: "${text}"`,
      ticket.id
    );
  }

  openDetailModal(ticketId);
  renderTickets();
}

function deleteSolution(ticketId, solId) {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) return;

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));
  if (!ticket || !ticket.solutions) return;

  ticket.solutions = ticket.solutions.filter((s, index) => {
    const currentId = s.id !== undefined ? s.id : index;
    if (currentId === solId) {
      return s.solver !== user.username;
    }
    return true;
  });

  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));
  openDetailModal(ticketId);
  renderTickets();
}

function closeDetailModal() { 
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('hidden'); 
}

function deleteTicket(e, ticketId) {
  if (e) e.stopPropagation();
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) return;

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));

  if (!ticket || ticket.issuer !== user.username) return;

  const updatedTickets = tickets.filter(t => parseInt(t.id, 10) !== parseInt(ticketId, 10));
  localStorage.setItem('solveit_tickets', JSON.stringify(updatedTickets));
  closeDetailModal();
  renderTickets();
}

function openNotificationsModal() {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) {
    openAuthModal('signin');
    return;
  }

  let modal = document.getElementById('notificationsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'notificationsModal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono-ticket';
    document.body.appendChild(modal);
  }

  const notifs = JSON.parse(localStorage.getItem(`solveit_notifs_${user.username}`) || '[]');

  const updatedNotifs = notifs.map(n => ({ ...n, read: true }));
  localStorage.setItem(`solveit_notifs_${user.username}`, JSON.stringify(updatedNotifs));
  checkUserSession();

  modal.innerHTML = `
    <div class="bg-[#121215] border border-slate-800 rounded-2xl max-w-lg w-full p-6 relative text-white shadow-2xl">
      <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <h3 class="text-xs font-bold text-slate-300 tracking-wider uppercase">NOTIFICATIONS (${notifs.length})</h3>
        <button onclick="closeNotificationsModal()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <div class="space-y-3 max-h-80 overflow-y-auto mb-4">
        ${notifs.length === 0 ? `
          <p class="text-xs text-slate-500 text-center py-6">No notifications found.</p>
        ` : notifs.map(n => `
          <div onclick="closeNotificationsModal(); openDetailModal(${n.ticketId})" class="p-3 bg-[#09090b] border border-slate-800 rounded-xl cursor-pointer hover:border-slate-600 transition">
            <p class="text-xs text-slate-200 mb-1">${n.message}</p>
            <span class="text-[10px] text-slate-500">${n.timestamp}</span>
          </div>
        `).join('')}
      </div>

      ${notifs.length > 0 ? `
        <div class="flex justify-end">
          <button onclick="clearNotifications()" class="text-xs bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900 font-bold px-3 py-1.5 rounded-lg transition uppercase">
            Clear All
          </button>
        </div>
      ` : ''}
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeNotificationsModal() {
  const modal = document.getElementById('notificationsModal');
  if (modal) modal.classList.add('hidden');
}

function clearNotifications() {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) return;
  localStorage.removeItem(`solveit_notifs_${user.username}`);
  checkUserSession();
  openNotificationsModal();
}

function openYourProjectsModal() {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) {
    openAuthModal('signin');
    return;
  }

  let modal = document.getElementById('yourProjectsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'yourProjectsModal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono-ticket';
    document.body.appendChild(modal);
  }

  const tickets = getTickets();
  const myIssued = tickets.filter(t => t.issuer === user.username);
  const myReserved = tickets.filter(t => t.reservedBy === user.username);

  modal.innerHTML = `
    <div class="bg-[#121215] border border-slate-800 rounded-2xl max-w-xl w-full p-6 relative text-white shadow-2xl max-h-[85vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <h3 class="text-xs font-bold text-slate-300 tracking-wider uppercase">YOUR PROJECTS (@${user.username})</h3>
        <button onclick="closeYourProjectsModal()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <div class="space-y-6">
        <div>
          <h4 class="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider">ISSUED BY YOU (${myIssued.length})</h4>
          <div class="space-y-2">
            ${myIssued.length === 0 ? '<p class="text-xs text-slate-500">No projects issued yet.</p>' : myIssued.map(t => `
              <div class="p-3 bg-[#09090b] border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span class="text-slate-400 font-bold">#${formatTicketId(t.id)}</span>
                  <span class="font-bold text-slate-200 ml-2">${t.title}</span>
                  ${t.status === 'RESOLVED' ? '<span class="ml-2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded">RESOLVED</span>' : ''}
                </div>
                <div class="flex gap-2">
                  <button onclick="closeYourProjectsModal(); openDetailModal(${t.id})" class="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Inspect</button>
                  <button onclick="deleteTicket(null, ${t.id}); openYourProjectsModal();" class="bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 px-2 py-1 rounded text-[10px] font-bold uppercase">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">RESERVED BY YOU (${myReserved.length})</h4>
          <div class="space-y-2">
            ${myReserved.length === 0 ? '<p class="text-xs text-slate-500">No projects reserved yet.</p>' : myReserved.map(t => `
              <div class="p-3 bg-[#09090b] border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span class="text-slate-400 font-bold">#${formatTicketId(t.id)}</span>
                  <span class="font-bold text-slate-200 ml-2">${t.title}</span>
                </div>
                <div class="flex gap-2">
                  <button onclick="closeYourProjectsModal(); openDetailModal(${t.id})" class="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Inspect</button>
                  ${t.status !== 'RESOLVED' ? `
                    <button onclick="closeYourProjectsModal(); openReadmeEditorModal(${t.id})" class="bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 px-2 py-1 rounded text-[10px] font-bold uppercase">Edit Readme</button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeYourProjectsModal() {
  const modal = document.getElementById('yourProjectsModal');
  if (modal) modal.classList.add('hidden');
}

function setupFormListeners() {
  const postForm = document.getElementById('postForm');
  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = JSON.parse(localStorage.getItem('solveit_user'));
      if (!user) {
        closePostModal();
        openAuthModal('signin');
        return;
      }

      const title = document.getElementById('ticketTitle').value;
      const category = document.getElementById('ticketCategory').value;
      const description = document.getElementById('ticketDesc').value;
      const urgentInput = document.getElementById('ticketUrgent');
      const isUrgent = urgentInput ? urgentInput.checked : false;

      const imageInput = document.getElementById('ticketImage');
      let base64Image = null;

      if (imageInput && imageInput.files && imageInput.files[0]) {
        try {
          base64Image = await compressAndConvertToBase64(imageInput.files[0]);
        } catch (err) {
          console.error("Resim yüklenirken hata oluştu:", err);
        }
      }

      const tickets = getTickets();
      const maxId = tickets.reduce((max, t) => Math.max(max, parseInt(t.id, 10) || 0), 0);
      const nextId = maxId + 1;

      const newTicket = {
        id: nextId,
        title,
        category,
        description,
        issuer: user.username,
        reservedBy: null,
        status: 'OPEN',
        urgent: isUrgent,
        image: base64Image,
        approvedSolutionId: null,
        solutions: [],
        readme: null
      };

      tickets.unshift(newTicket);
      localStorage.setItem('solveit_tickets', JSON.stringify(tickets));

      closePostModal();
      postForm.reset();
      renderTickets();
    });
  }
}

function openPostModal() { 
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) {
    openAuthModal('signin');
    return;
  }
  const modal = document.getElementById('postModal');
  if (modal) modal.classList.remove('hidden'); 
}

function closePostModal() { 
  const modal = document.getElementById('postModal');
  if (modal) modal.classList.add('hidden');
}

let currentProfileUser = null;

function openProfileModal(username) {
  currentProfileUser = username;
  const modal = document.getElementById('profileModal');
  if (!modal) return;
  
  document.getElementById('profileUsername').innerText = `@${username}`;
  document.getElementById('profileAvatar').innerText = username.charAt(0).toUpperCase();

  const tickets = getTickets();
  const userTickets = tickets.filter(t => t.issuer === username);
  
  const userSolutions = [];
  tickets.forEach(t => {
    if (t.solutions && Array.isArray(t.solutions)) {
      t.solutions.forEach(s => {
        if (s.solver === username) {
          userSolutions.push({ ticketTitle: t.title, ticketId: t.id, solutionText: s.text });
        }
      });
    }
  });

  document.getElementById('countIssues').innerText = userTickets.length;
  document.getElementById('countSolutions').innerText = userSolutions.length;

  const issuesContainer = document.getElementById('profileIssuesList');
  if (userTickets.length === 0) {
    issuesContainer.innerHTML = `<p class="text-xs text-slate-500 font-mono-ticket py-4 text-center">// NO ISSUES PUBLISHED YET</p>`;
  } else {
    issuesContainer.innerHTML = userTickets.map(t => `
      <div onclick="closeProfileModal(); openDetailModal(${t.id})" class="p-3 bg-[#09090b] border border-slate-800 rounded-xl hover:border-purple-500/50 transition cursor-pointer flex justify-between items-center">
        <div>
          <span class="text-[10px] font-mono-ticket text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">${t.category}</span>
          <h4 class="text-sm font-bold text-white font-mono-ticket mt-1">${t.title}</h4>
        </div>
        <span class="text-xs font-mono-ticket text-slate-500">${t.status === 'RESOLVED' ? '✅ SOLVED' : '🔓 OPEN'}</span>
      </div>
    `).join('');
  }

  const solutionsContainer = document.getElementById('profileSolutionsList');
  if (userSolutions.length === 0) {
    solutionsContainer.innerHTML = `<p class="text-xs text-slate-500 font-mono-ticket py-4 text-center">// NO SOLUTIONS SUBMITTED YET</p>`;
  } else {
    solutionsContainer.innerHTML = userSolutions.map(s => `
      <div onclick="closeProfileModal(); openDetailModal(${s.ticketId})" class="p-3 bg-[#09090b] border border-slate-800 rounded-xl hover:border-emerald-500/50 transition cursor-pointer">
        <span class="text-[10px] font-mono-ticket text-slate-400">// ON TICKET: <strong class="text-white">${s.ticketTitle}</strong></span>
        <p class="text-xs text-slate-300 font-mono-ticket mt-1 line-clamp-2">"${s.solutionText}"</p>
      </div>
    `).join('');
  }

  switchProfileTab('issues');
  modal.classList.remove('hidden');
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.add('hidden');
}

function switchProfileTab(tab) {
  const issuesList = document.getElementById('profileIssuesList');
  const solutionsList = document.getElementById('profileSolutionsList');
  const btnIssues = document.getElementById('tabBtnIssues');
  const btnSolutions = document.getElementById('tabBtnSolutions');

  if (!issuesList || !solutionsList || !btnIssues || !btnSolutions) return;

  if (tab === 'issues') {
    issuesList.classList.remove('hidden');
    solutionsList.classList.add('hidden');
    btnIssues.className = "text-xs font-mono-ticket font-bold text-purple-400 border-b-2 border-purple-500 pb-1";
    btnSolutions.className = "text-xs font-mono-ticket font-bold text-slate-400 hover:text-slate-200 pb-1";
  } else {
    issuesList.classList.add('hidden');
    solutionsList.classList.remove('hidden');
    btnSolutions.className = "text-xs font-mono-ticket font-bold text-emerald-400 border-b-2 border-emerald-500 pb-1";
    btnIssues.className = "text-xs font-mono-ticket font-bold text-slate-400 hover:text-slate-200 pb-1";
  }
}