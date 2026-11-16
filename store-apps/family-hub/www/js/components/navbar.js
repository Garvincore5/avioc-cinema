// navbar.js - Sidebar navigation, top header, and family profile switcher
import { store } from "../store.js";

export class NavbarComponent {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.currentView = "feed";
    this.init();
  }

  init() {
    this.renderSidebar();
    this.renderTopNav();
    this.renderBottomNav();
    this.bindEvents();

    store.subscribe((data, changeType) => {
      this.updateActiveProfileUI();
    });
  }

  renderSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    const activeMember = store.getActiveMember();
    const familyInfo = store.data.familyInfo;

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <div class="family-logo-icon">🏡</div>
        <div class="family-title-group">
          <div class="family-title">${familyInfo.familyName}</div>
          <div class="family-subtitle">Family Hub</div>
        </div>
      </div>

      <nav class="nav-links">
        <button class="nav-item ${this.currentView === 'feed' ? 'active' : ''}" data-view="feed">
          <span class="nav-icon">📰</span>
          <span>Family Wall</span>
        </button>
        <button class="nav-item ${this.currentView === 'chat' ? 'active' : ''}" data-view="chat">
          <span class="nav-icon">💬</span>
          <span>Family Chat</span>
          <span class="nav-badge" id="chat-unread-badge" style="display:none">1</span>
        </button>
        <button class="nav-item ${this.currentView === 'tree' ? 'active' : ''}" data-view="tree">
          <span class="nav-icon">🌳</span>
          <span>Family Tree</span>
        </button>
        <button class="nav-item ${this.currentView === 'calendar' ? 'active' : ''}" data-view="calendar">
          <span class="nav-icon">📅</span>
          <span>Calendar & Events</span>
        </button>
        <button class="nav-item ${this.currentView === 'chores' ? 'active' : ''}" data-view="chores">
          <span class="nav-icon">✅</span>
          <span>Chores & Lists</span>
        </button>
        <button class="nav-item ${this.currentView === 'recipes' ? 'active' : ''}" data-view="recipes">
          <span class="nav-icon">🍲</span>
          <span>Family Recipes</span>
        </button>
        <button class="nav-item ${this.currentView === 'vault' ? 'active' : ''}" data-view="vault">
          <span class="nav-icon">🛡️</span>
          <span>Emergency Vault</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="active-profile-card" id="profile-switcher-btn" title="Click to switch family profile">
          <div class="avatar-wrapper">
            <img src="${activeMember.avatar}" alt="${activeMember.name}" class="avatar-img" id="sidebar-avatar">
            <span class="online-dot"></span>
          </div>
          <div class="profile-info">
            <div class="profile-name" id="sidebar-profile-name">${activeMember.name}</div>
            <div class="profile-role" id="sidebar-profile-role">${activeMember.role}</div>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">🔄</span>
        </div>
      </div>
    `;
  }

  renderTopNav() {
    const topNav = document.getElementById("top-nav");
    if (!topNav) return;

    const activeMember = store.getActiveMember();

    topNav.innerHTML = `
      <div class="top-left-title">
        <h1 class="page-title" id="page-title">Family Wall</h1>
      </div>

      <div class="top-actions">
        <button class="btn-icon" id="theme-toggle-btn" title="Toggle dark/light mode">
          <span id="theme-icon">🌙</span>
        </button>

        <button class="btn-primary" id="header-switch-member-btn" style="font-size: 0.85rem; padding: 0.45rem 0.9rem;">
          <img src="${activeMember.avatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; margin-right: 4px;" />
          <span id="header-active-name">${activeMember.name.split(" ")[0]}</span>
          <span style="font-size: 0.75rem; opacity: 0.8;">▼</span>
        </button>
      </div>
    `;
  }

  renderBottomNav() {
    const bottomNav = document.getElementById("bottom-nav");
    if (!bottomNav) return;

    bottomNav.innerHTML = `
      <button class="nav-item ${this.currentView === 'feed' ? 'active' : ''}" data-view="feed" style="flex-direction:column; gap:2px; padding:6px; font-size:0.7rem; justify-content:center;">
        <span style="font-size: 1.2rem;">📰</span>
        <span>Wall</span>
      </button>
      <button class="nav-item ${this.currentView === 'chat' ? 'active' : ''}" data-view="chat" style="flex-direction:column; gap:2px; padding:6px; font-size:0.7rem; justify-content:center;">
        <span style="font-size: 1.2rem;">💬</span>
        <span>Chat</span>
      </button>
      <button class="nav-item ${this.currentView === 'tree' ? 'active' : ''}" data-view="tree" style="flex-direction:column; gap:2px; padding:6px; font-size:0.7rem; justify-content:center;">
        <span style="font-size: 1.2rem;">🌳</span>
        <span>Tree</span>
      </button>
      <button class="nav-item ${this.currentView === 'calendar' ? 'active' : ''}" data-view="calendar" style="flex-direction:column; gap:2px; padding:6px; font-size:0.7rem; justify-content:center;">
        <span style="font-size: 1.2rem;">📅</span>
        <span>Events</span>
      </button>
      <button class="nav-item ${this.currentView === 'chores' ? 'active' : ''}" data-view="chores" style="flex-direction:column; gap:2px; padding:6px; font-size:0.7rem; justify-content:center;">
        <span style="font-size: 1.2rem;">✅</span>
        <span>Chores</span>
      </button>
    `;
  }

  bindEvents() {
    // Navigation clicks
    document.addEventListener("click", (e) => {
      const navBtn = e.target.closest("[data-view]");
      if (navBtn) {
        const view = navBtn.getAttribute("data-view");
        this.navigateTo(view);
      }

      // Profile Switcher click
      if (e.target.closest("#profile-switcher-btn") || e.target.closest("#header-switch-member-btn")) {
        this.openProfileSwitcherModal();
      }

      // Theme toggle click
      if (e.target.closest("#theme-toggle-btn")) {
        this.toggleTheme();
      }
    });
  }

  navigateTo(view) {
    this.currentView = view;
    
    // Update active nav items
    document.querySelectorAll("[data-view]").forEach(btn => {
      if (btn.getAttribute("data-view") === view) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Update page title
    const titles = {
      feed: "Family Wall & Updates",
      chat: "Family Chat & Messages",
      tree: "Interactive Family Tree",
      calendar: "Shared Family Calendar",
      chores: "Chores & Shopping Lists",
      recipes: "Family Recipe Book",
      vault: "Emergency Contacts & Vault"
    };

    const titleElem = document.getElementById("page-title");
    if (titleElem) titleElem.textContent = titles[view] || "Family Hub";

    if (this.onNavigate) {
      this.onNavigate(view);
    }
  }

  updateActiveProfileUI() {
    const active = store.getActiveMember();
    const avatarElem = document.getElementById("sidebar-avatar");
    const nameElem = document.getElementById("sidebar-profile-name");
    const roleElem = document.getElementById("sidebar-profile-role");
    const headerName = document.getElementById("header-active-name");

    if (avatarElem) avatarElem.src = active.avatar;
    if (nameElem) nameElem.textContent = active.name;
    if (roleElem) roleElem.textContent = active.role;
    if (headerName) headerName.textContent = active.name.split(" ")[0];
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    const icon = document.getElementById("theme-icon");
    if (icon) icon.textContent = next === "dark" ? "☀️" : "🌙";
  }

  openProfileSwitcherModal() {
    let modal = document.getElementById("profile-switcher-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "profile-switcher-modal";
      modal.className = "modal-backdrop";
      document.body.appendChild(modal);
    }

    const members = store.data.members;
    const activeId = store.activeMemberId;

    modal.innerHTML = `
      <div class="modal-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">Switch Family Profile</h2>
          <button id="close-profile-modal-btn" class="btn-icon">✕</button>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.25rem;">
          Select who is currently using the Family App. Posts, messages, reactions, and chores will be attributed to this person.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.85rem; margin-bottom: 1.5rem;">
          ${members.map(m => `
            <div class="member-select-card ${m.id === activeId ? 'active-member-selected' : ''}" data-member-id="${m.id}" 
                 style="border: 2px solid ${m.id === activeId ? 'var(--primary)' : 'var(--border)'}; 
                        background: ${m.id === activeId ? 'var(--primary-light)' : 'var(--bg-card)'}; 
                        padding: 1rem; border-radius: var(--radius-md); text-align: center; cursor: pointer; transition: var(--transition);">
              <img src="${m.avatar}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; margin-bottom: 0.5rem; border: 2px solid white; box-shadow: var(--shadow-sm);" />
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${m.name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${m.role}</div>
              ${m.id === activeId ? '<span style="display:inline-block; font-size: 0.7rem; font-weight: 700; color: var(--primary); margin-top: 4px;">● Active</span>' : ''}
            </div>
          `).join("")}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 1rem;">
          <button class="btn-secondary" id="reset-demo-btn" style="font-size: 0.8rem; color: var(--danger);">
            🔄 Reset Demo Data
          </button>
          <button class="btn-primary" id="done-profile-btn">
            Done
          </button>
        </div>
      </div>
    `;

    modal.style.display = "flex";

    // Handle member selection
    modal.querySelectorAll("[data-member-id]").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-member-id");
        store.setActiveMember(id);
        modal.style.display = "none";
      });
    });

    // Close button
    modal.querySelector("#close-profile-modal-btn")?.addEventListener("click", () => {
      modal.style.display = "none";
    });
    modal.querySelector("#done-profile-btn")?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    // Reset demo data
    modal.querySelector("#reset-demo-btn")?.addEventListener("click", () => {
      if (confirm("Reset all family data back to initial demo state?")) {
        store.resetToDemo();
        modal.style.display = "none";
      }
    });

    // Backdrop click close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }
}
