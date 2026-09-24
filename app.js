(function cleanupOldCache() {
  const CACHE_KEY = "solveit_clean_v1"; 

  if (!localStorage.getItem(CACHE_KEY)) {
    localStorage.clear(); 
    localStorage.setItem(CACHE_KEY, "done"); 
    console.log("problem needs to be solved");
  }
})();

let currentCategoryFilter = 'all';
let searchQuery = '';
let currentAuthMode = 'signin';
let activeReservingTicketId = null;

function initApp() {
  seedInitialData();
  checkUserSession();
  renderTickets();
  setupFormListeners();
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function handleRoute() {
  const hash = window.location.hash;
  const homeView = document.getElementById('homeView');
  const ticketView = document.getElementById('ticketPageView');
  if (!homeView || !ticketView) return;

  const ticketMatch = hash.match(/^#\/ticket\/(\d+)/);

  if (ticketMatch) {
    homeView.classList.add('hidden');
    ticketView.classList.remove('hidden');
    renderTicketPage(parseInt(ticketMatch[1], 10));
    window.scrollTo(0, 0);
  } else {
    ticketView.classList.add('hidden');
    homeView.classList.remove('hidden');
  }
}

function openDetailModal(id) {
  const target = '#/ticket/' + id;
  if (window.location.hash === target) {
    renderTicketPage(id);
  } else {
    window.location.hash = target;
  }
}

function closeDetailModal() {
  window.location.hash = '';
}

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
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sky-600 underline font-bold break-all">${url}</a>`;
  });
}

function formatTicketId(id) {
  const numericId = parseInt(id, 10) || 0;
  return String(numericId).padStart(3, '0');
}

function seedInitialData() {
  if (localStorage.getItem('solveit_tickets') === null) {
    localStorage.setItem('solveit_tickets', JSON.stringify([]));
  } else {
    const existingTickets = JSON.parse(localStorage.getItem('solveit_tickets')) || [];
    const updated = existingTickets.map(t => ({
      ...t,
      status: t.status || 'OPEN',
      urgent: t.urgent || false,
      image: t.image || null,
      approvedSolutionId: t.approvedSolutionId || null,
      upvotes: Array.isArray(t.upvotes) ? t.upvotes : []
    }));
    localStorage.setItem('solveit_tickets', JSON.stringify(updated));
  }

  if (!localStorage.getItem('solveit_users_db')) {
    localStorage.setItem('solveit_users_db', JSON.stringify({}));
  }
}

function checkUserSession() {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  const navAuthArea = document.getElementById('navAuthArea');
  if (!navAuthArea) return;

  if (user && user.username) {
    const notifications = JSON.parse(localStorage.getItem(`solveit_notifs_${user.username}`) || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;

    navAuthArea.innerHTML = `
      <div class="flex items-center gap-5 font-mono-ticket nav-text-lg">
        <button onclick="openYourProjectsModal()" class="text-slate-300 font-bold cursor-pointer">
          Your Projects
        </button>
        <button onclick="openNotificationsModal()" class="text-slate-300 font-bold cursor-pointer relative flex items-center gap-1.5">
          <span>Notifications</span>
          ${unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full leading-none">${unreadCount}</span>` : ''}
        </button>
        <button onclick="handleLogout()" class="text-slate-300 font-bold cursor-pointer relative flex items-center gap-1.5">
          Sign Out
        </button>
      </div>
    `;
  } else {
    navAuthArea.innerHTML = `
      <div class="flex items-center gap-4 font-mono-ticket nav-text-lg">
        <button onclick="openYourProjectsModal()" class="text-slate-300 font-bold cursor-pointer">
          Your Projects
        </button>
        <button onclick="openNotificationsModal()" class="text-slate-300 font-bold cursor-pointer">
          Notifications
        </button>
        <button onclick="openAuthModal('signin')" class="text-slate-300 font-bold cursor-pointer">
          Sign In
        </button>
        <button onclick="openAuthModal('signup')" class="text-white font-bold cursor-pointer">
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
  const errorMsg = document.getElementById('authErrorMsg');

  if (errorMsg) errorMsg.classList.add('hidden');
  const uInput = document.getElementById('authUsername');
  const pInput = document.getElementById('authPassword');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';

  if (mode === 'signup') {
    if (title) title.innerText = 'SIGN UP';
  } else {
    if (title) title.innerText = 'SIGN IN';
  }

  if (modal) modal.classList.remove('hidden');
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
        errorMsg.innerText = 'Ooops, this username seems to be taken by someone else. Try something unique!';
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
        errorMsg.innerText = 'We could not find you around here, try creating an account first.';
        errorMsg.classList.remove('hidden');
      }
      return;
    }
    if (usersDb[username] !== password) {
      if (errorMsg) {
        errorMsg.innerText = 'Incorrect password:(';
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

function escAttr(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderTickets() {
  const grid = document.getElementById('ticketGrid');
  if (!grid) return;

  const user = JSON.parse(localStorage.getItem('solveit_user'));
  const tickets = getTickets();
  grid.innerHTML = '';

  let filtered = tickets.filter(t => {
    if (currentCategoryFilter === 'resolved') {
      if (t.status !== 'RESOLVED') return false;
    } 
    else if (currentCategoryFilter === 'urgent') {
      if (t.status === 'RESOLVED') return false;
      if (t.urgent !== true) return false;
    } 
    else if (currentCategoryFilter === 'most_voted') {
      if (t.status === 'RESOLVED') return false;
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

  if (currentCategoryFilter === 'most_voted') {
    filtered.sort((a, b) => (b.upvotes ? b.upvotes.length : 0) - (a.upvotes ? a.upvotes.length : 0));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-slate-400 font-mono-ticket text-base mb-2">NO TICKETS FOUND.</p>
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
    const isUrgentCard = Boolean(t.urgent) && !isResolved;
    const upvotesList = t.upvotes || [];
    const hasUpvoted = user && upvotesList.includes(user.username);

    const isSelfClaimed = isReserved && t.reservedBy === t.issuer;

    const statusText = isResolved
       ? 'APPROVED SOLUTION'
       : (t.readme ? 'SOLUTION PUBLISHED' : (isSelfClaimed ? '' : (isReserved ? `APPROVED BY @${t.reservedBy}` : `${(t.solutions || []).length} SOLVER`)));

    card.className = `tk ${colorClass} ${isResolved ? 'tk--solved' : ''} ${isUrgentCard ? 'tk--urgent' : ''}`;

    card.innerHTML = `
      <div class="tk-hit" role="link" tabindex="0" aria-label="Open ticket ${formatTicketId(t.id)}" onclick="openDetailModal(${t.id})" onkeydown="if(event.key==='Enter'){openDetailModal(${t.id})}"></div>
      ${isResolved ? `<span class="tk-watermark">RESOLVED</span>` : ''}
      <h3 class="tk-title" title="${escAttr(t.title)}">${t.title}</h3>
      <p class="tk-desc">${t.description}</p>
      <span class="tk-cat">${t.category}</span>
      <span class="tk-status">${statusText}</span>
      <span class="tk-issuer">ISSUER: @${t.issuer}</span>
      <span class="tk-id">#${formatTicketId(t.id)}</span>

      <div class="tk-stub">
        <div class="tk-barcode barcode-lines"></div>
        <div class="tk-btns">
          <button onclick="openDetailModal(${t.id})" class="tk-btn tk-btn--inspect">INSPECT</button>
          ${!isResolved ? `
            <button onclick="toggleReserveTicket(event, ${t.id})" class="tk-btn ${isReserved ? 'tk-btn--red' : ''}">${isReserved ? 'RESERVED' : 'RESERVE'}</button>
          ` : `
            <div class="tk-btn tk-btn--static">APPROVED</div>
          `}
          ${isOwner ? `
            <button onclick="deleteTicket(event, ${t.id})" class="tk-btn tk-btn--red">DELETE</button>
          ` : `
            <button onclick="toggleUpvote(event, ${t.id})" class="tk-btn ${hasUpvoted ? 'is-on' : ''}" aria-pressed="${hasUpvoted ? 'true' : 'false'}">
              <span>SAME ISSUE</span><span class="tk-btn-count">${upvotesList.length}</span>
            </button>
          `}
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

function toggleUpvote(e, ticketId) {
  if (e) e.stopPropagation();
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) {
    openAuthModal('signin');
    return;
  }

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));
  if (!ticket) return;

  if (!Array.isArray(ticket.upvotes)) ticket.upvotes = [];

  const index = ticket.upvotes.indexOf(user.username);
  if (index > -1) {
    ticket.upvotes.splice(index, 1);
  } else {
    ticket.upvotes.push(user.username);
  }

  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));
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
    modal.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 font-mono-ticket';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="dm dm--reserve" role="dialog" aria-modal="true" aria-labelledby="reserveTitle">
      <h3 id="reserveTitle" class="dm-title">RESERVE TICKET#${formatTicketId(ticketId)}</h3>
      <button type="button" onclick="closeReservePlanModal()" class="dm-x" aria-label="Close"></button>
      <h4 class="r-ticket" title="${escAttr(title)}">${title}</h4>
      <p class="r-sub">Write a quick plan for <strong>@${issuer}</strong>:</p>
      <form onsubmit="submitReservePlan(event)">
        <div class="r-lab"><label for="reservePlanInput">DESCRIPTION</label><span id="planCounter" class="hidden">0/300</span></div>
        <textarea id="reservePlanInput" required maxlength="300" placeholder="explain how you plan to solve this issue..." class="dm-input r-text"></textarea>
        <button type="button" onclick="closeReservePlanModal()" class="dm-btn r-cancel">CANCEL</button>
        <button type="submit" class="dm-btn r-submit">RESERVE THIS TICKET</button>
      </form>
    </div>
  `;

  modal.classList.remove('hidden');

  const planInput = document.getElementById('reservePlanInput');
  const planCounter = document.getElementById('planCounter');
  if (planInput && planCounter) {
    planInput.addEventListener('input', () => {
      planCounter.innerText = `${planInput.value.length}/300`;
    });
  }
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
}

function renderTicketPage(id) {
  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(id, 10));
  const container = document.getElementById('ticketPageContainer');
  if (!container) return;

  if (!ticket) {
    container.innerHTML = `
      <div class="text-white font-mono-ticket text-center py-8">
        <button class="back-btn-plain mb-4" onclick="closeDetailModal()" aria-label="Back">← Back</button>
        <p class="text-base text-slate-400">This ticket doesn't exist (maybe it was deleted).</p>
      </div>
    `;
    return;
  }

  const user = JSON.parse(localStorage.getItem('solveit_user'));
  const isIssuer = user && user.username === ticket.issuer;
  const isResolved = ticket.status === 'RESOLVED';
  const solutionsList = ticket.solutions || [];

  container.innerHTML = `
    <div class="inspect-container font-mono-ticket">
      
      <button onclick="closeDetailModal()" class="inspect-back-btn" aria-label="Back to tickets"></button>

      <div class="inspect-meta-info">
        <span class="inspect-username">@${ticket.issuer}</span>
        <span class="inspect-ticket-id">TICKET #${formatTicketId(ticket.id)}</span>
      </div>

      <h1 class="inspect-title" title="${escAttr(ticket.title)}">
        ${ticket.title}
      </h1>

      <div class="inspect-desc-sec">
        <p class="whitespace-pre-wrap break-words">${makeLinksClickable(ticket.description)}</p>${ticket.image ? `
          <div class="mt-2">
            <a href="${ticket.image}" target="_blank" rel="noopener noreferrer">
              <img src="${ticket.image}" alt="Ticket Image" class="max-h-32 rounded border border-slate-400 object-contain" />
            </a>
          </div>
        ` : ''}
      </div>

      <div class="inspect-solutions-sec">
        <div class="inspect-solutions-title">SOLUTIONS & COMMENTS</div>

        <div class="inspect-solutions-list">
          ${isResolved ? `
            <div class="py-1">
              <div class="flex justify-between items-center mb-1">
                <span class="text-base font-extrabold text-emerald-800 uppercase">APPROVED SOLUTION</span>
                ${ticket.readme?.author || ticket.reservedBy ? `<span class="text-sm font-bold text-black">@${ticket.readme?.author || ticket.reservedBy}</span>` : ''}
              </div>
              ${ticket.readme ? `
                <p class="text-lg text-black whitespace-pre-wrap leading-relaxed">
                  ${makeLinksClickable(ticket.readme.content)}
                </p>
              ` : `
                <p class="text-sm text-slate-700 italic">This issue was marked as resolved.</p>
              `}
            </div>
          ` : (solutionsList.length === 0
            ? `<p class="text-lg text-slate-700 italic py-1">No comments or solutions yet.</p>`
            : solutionsList.map((s, index) => {
                const solId = s.id !== undefined ? s.id : index;
                const isCommentOwner = user && user.username === s.solver;

                return `
                  <div class="mb-3 pb-2 border-b border-slate-300 text-lg">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-black text-xl">@${s.solver}</span>
                      <div class="flex items-center gap-2">
                        ${(isIssuer && !isCommentOwner) ? `
                          <button onclick="approveSolution(${ticket.id},${solId})" class="inspect-approve-btn">
                            APPROVE
                          </button>
                        ` : ''}
                        ${isCommentOwner ? `
                          <button onclick="deleteSolution(${ticket.id},${solId})" class="text-sm text-red-700 font-bold">
                            DELETE
                          </button>
                        ` : ''}
                      </div>
                    </div>

                    <p class="text-black leading-snug pl-1 mt-1">${makeLinksClickable(s.text)}</p>

                    ${s.image ? `
                      <div class="mt-1">
                        <a href="${s.image}" target="_blank" rel="noopener noreferrer">
                          <img src="${s.image}" alt="Comment Image" class="max-h-24 rounded border border-slate-400 object-contain" />
                        </a>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')
          )}
        </div>
      </div>

      ${!isResolved ? `
        <form onsubmit="submitSolution(event, ${ticket.id})" class="inspect-form">
          <div class="inspect-action-bar">
            <label class="inspect-file-label">
              Choose File
              <input type="file" id="commentImageInput" accept="image/*" class="inspect-file-input">
            </label>
          </div>
          <div class="inspect-input-row">
            <input type="text" id="solutionInput" required maxlength="300" placeholder="leave a comment..." class="inspect-input">
            <button type="submit" class="inspect-send-btn">SEND</button>
          </div>
        </form>
      ` : ''}

    </div>
  `;
}

function approveDirectTicket(ticketId) {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) return;

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));

  if (!ticket || ticket.issuer !== user.username) return;

  ticket.status = 'RESOLVED';
  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));
  renderTicketPage(ticketId);
  renderTickets();
}

function approveSolution(ticketId, solId) {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) return;

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));

  if (!ticket || ticket.issuer !== user.username) return;

  const sol = ticket.solutions.find((s, index) => (s.id !== undefined ? s.id : index) === solId);
  if (sol && sol.solver === user.username) return;

  ticket.status = 'RESOLVED';
  ticket.approvedSolutionId = solId;

  if (sol && sol.solver !== user.username) {
    addNotification(
      sol.solver,
      ` @${user.username} approved your solution on ticket #${formatTicketId(ticket.id)}!`,
      ticket.id
    );
  }

  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));
  renderTicketPage(ticketId);
  renderTickets();
}

async function submitSolution(e, ticketId) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) {
    openAuthModal('signin');
    return;
  }

  const input = document.getElementById('solutionInput');
  const imageInput = document.getElementById('commentImageInput');
  const text = input ? input.value : '';

  let base64Image = null;
  if (imageInput && imageInput.files && imageInput.files[0]) {
    try {
      base64Image = await compressAndConvertToBase64(imageInput.files[0]);
    } catch (err) {
      console.error("Görsel yükleme hatası:", err);
    }
  }

  const tickets = getTickets();
  const ticket = tickets.find(t => parseInt(t.id, 10) === parseInt(ticketId, 10));
  if (!ticket || ticket.status === 'RESOLVED') return;

  if (!ticket.solutions) ticket.solutions = [];
  
  ticket.solutions.push({ 
    id: Date.now(), 
    solver: user.username, 
    text,
    image: base64Image
  });

  localStorage.setItem('solveit_tickets', JSON.stringify(tickets));

  if (ticket.issuer !== user.username) {
    addNotification(
      ticket.issuer,
      `@${user.username} commented on ticket #${formatTicketId(ticket.id)}: "${text}"`,
      ticket.id
    );
  }

  renderTicketPage(ticketId);
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
  renderTicketPage(ticketId);
  renderTickets();
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
  if (window.location.hash === '#/ticket/' + ticketId) {
    window.location.hash = '';
  }
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
    modal.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 font-mono-ticket';
    document.body.appendChild(modal);
  }

  const notifs = JSON.parse(localStorage.getItem(`solveit_notifs_${user.username}`) || '[]');

  const updatedNotifs = notifs.map(n => ({ ...n, read: true }));
  localStorage.setItem(`solveit_notifs_${user.username}`, JSON.stringify(updatedNotifs));
  checkUserSession();

  modal.innerHTML = `
    <div class="dm dm--notif" role="dialog" aria-modal="true" aria-labelledby="notifTitle">
      <h3 id="notifTitle" class="dm-title">NOTIFICATIONS (${notifs.length})</h3>
      <button type="button" onclick="closeNotificationsModal()" class="dm-x" aria-label="Close"></button>

      <div class="dm-list">
        ${notifs.length === 0 ? `
          <p class="dm-empty">No notifications found.</p>
        ` : notifs.map(n => `
          <div class="dm-row dm-row--notif">
            <div class="dm-row-text" onclick="closeNotificationsModal(); openDetailModal(${n.ticketId})" title="${escAttr(n.message)}">
              <p class="dm-row-msg">${n.message}</p>
              <span class="dm-row-meta">${n.timestamp}</span>
            </div>
            <button type="button" class="dm-row-btn dm-row-btn--white" onclick="closeNotificationsModal(); openDetailModal(${n.ticketId})">Inspect</button>
            <button type="button" class="dm-row-btn dm-row-btn--red" onclick="deleteNotification(${n.id})">Delete</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function deleteNotification(id) {
  const user = JSON.parse(localStorage.getItem('solveit_user'));
  if (!user) return;
  const key = `solveit_notifs_${user.username}`;
  const notifs = JSON.parse(localStorage.getItem(key) || '[]').filter(n => n.id !== id);
  localStorage.setItem(key, JSON.stringify(notifs));
  checkUserSession();
  openNotificationsModal();
}

function closeNotificationsModal() {
  const modal = document.getElementById('notificationsModal');
  if (modal) modal.classList.add('hidden');
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
    modal.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 font-mono-ticket';
    document.body.appendChild(modal);
  }

  const tickets = getTickets();
  const myIssued = tickets.filter(t => t.issuer === user.username);
  const myReserved = tickets.filter(t => t.reservedBy === user.username);

  const row = (t, redLabel, redAction) => `
    <div class="dm-row dm-row--proj">
      <div class="dm-row-text" onclick="closeYourProjectsModal(); openDetailModal(${t.id})" title="${escAttr(t.title)}">
        <p class="dm-row-msg"><strong>#${formatTicketId(t.id)}</strong> ${t.title}</p>
        ${t.status === 'RESOLVED' ? '<span class="dm-row-meta dm-row-ok">RESOLVED</span>' : ''}
      </div>
      <button type="button" class="dm-row-btn dm-row-btn--white" onclick="closeYourProjectsModal(); openDetailModal(${t.id})">Inspect</button>
      ${redAction
        ? `<button type="button" class="dm-row-btn dm-row-btn--red" onclick="${redAction}">${redLabel}</button>`
        : `<button type="button" class="dm-row-btn dm-row-btn--red">${redLabel}</button>`}
    </div>
  `;

  modal.innerHTML = `
    <div class="dm dm--proj" role="dialog" aria-modal="true" aria-labelledby="projTitle">
      <h3 id="projTitle" class="dm-title">YOUR PROJECTS</h3>
      <button type="button" onclick="closeYourProjectsModal()" class="dm-x" aria-label="Close"></button>

      <div class="dm-list">
        <h4 class="dm-sec dm-sec--issued">ISSUED BY YOU (${myIssued.length})</h4>
        ${myIssued.length === 0 ? '<p class="dm-empty">No projects issued.</p>' : myIssued.map(t => row(t, 'Delete', `deleteTicket(null, ${t.id}); openYourProjectsModal();`)).join('')}

        <h4 class="dm-sec dm-sec--reserved">RESERVED BY YOU (${myReserved.length})</h4>
        ${myReserved.length === 0 ? '<p class="dm-empty">No projects reserved.</p>' : myReserved.map(t => row(t, t.status === 'RESOLVED' ? 'Solved' : 'Release', t.status === 'RESOLVED' ? '' : `toggleReserveTicket(null, ${t.id}); openYourProjectsModal();`)).join('')}
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
  const titleInput = document.getElementById('ticketTitle');
  const titleCounter = document.getElementById('titleCounter');
  if (titleInput && titleCounter) {
    titleInput.addEventListener('input', () => {
      titleCounter.innerText = `${titleInput.value.length}/80`;
    });
  }

  const descInput = document.getElementById('ticketDesc');
  const descCounter = document.getElementById('descCounter');
  if (descInput && descCounter) {
    descInput.addEventListener('input', () => {
      descCounter.innerText = `${descInput.value.length}/500`;
    });
  }

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
        readme: null,
        upvotes: []
      };

      tickets.unshift(newTicket);
      localStorage.setItem('solveit_tickets', JSON.stringify(tickets));

      closePostModal();
      postForm.reset();
      if (titleCounter) titleCounter.innerText = '0/80';
      if (descCounter) descCounter.innerText = '0/500';
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
