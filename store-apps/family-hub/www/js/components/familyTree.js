// familyTree.js - Interactive Visual Family Tree with Generational Hierarchy and Member Details
import { store } from "../store.js";

export class FamilyTreeComponent {
  constructor(container, onNavigateToChat) {
    this.container = container;
    this.onNavigateToChat = onNavigateToChat;
    this.selectedMember = null;
    this.searchQuery = "";
    this.init();
  }

  init() {
    this.render();
    store.subscribe((data, changeType) => {
      if (["MEMBER_UPDATE", "RESET", "STORAGE_RELOAD"].includes(changeType) || changeType === "GENERAL") {
        this.renderTree();
        if (this.selectedMember) {
          // Refresh selected member data
          this.selectedMember = store.getMember(this.selectedMember.id) || null;
          if (this.selectedMember) this.renderDrawerContent();
        }
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="tree-container">
        <!-- Tree Toolbar -->
        <div class="tree-toolbar">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <input type="text" id="tree-search-input" class="form-input" placeholder="🔍 Search family member..." style="width: 240px; padding: 0.45rem 0.85rem; font-size: 0.85rem;" />
            <span style="font-size: 0.82rem; color: var(--text-muted);">Total: <strong id="total-members-count">${store.data.members.length}</strong> members</span>
          </div>

          <button class="btn-primary" id="open-add-member-btn">
            <span>+ Add Family Member</span>
          </button>
        </div>

        <!-- Tree Canvas Viewport -->
        <div class="tree-viewport" id="tree-viewport">
          <!-- Generational levels rendered dynamically -->
        </div>

        <!-- Member Profile Drawer -->
        <div class="drawer-overlay" id="member-drawer-overlay">
          <div class="drawer-content" id="member-drawer-content">
            <!-- Rendered in renderDrawerContent() -->
          </div>
        </div>

        <!-- Add Member Modal -->
        <div class="modal-backdrop" id="add-member-modal" style="display:none;">
          <div class="modal-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.25rem; font-weight: 700;">Add Family Member</h2>
              <button class="btn-icon" id="close-add-modal-btn">✕</button>
            </div>

            <form id="add-member-form">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Full Name *</label>
                  <input type="text" id="m-name" class="form-input" required placeholder="e.g. Grandma Rose" />
                </div>
                <div class="form-group">
                  <label class="form-label">Role in Family *</label>
                  <input type="text" id="m-role" class="form-input" required placeholder="e.g. Aunt, Cousin, Grandson" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Generation *</label>
                  <select id="m-gen" class="form-select">
                    <option value="1">Generation 1 (Grandparents / Elders)</option>
                    <option value="2" selected>Generation 2 (Parents / Aunts / Uncles)</option>
                    <option value="3">Generation 3 (Children / Cousins)</option>
                    <option value="4">Generation 4 (Grandchildren)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Gender</label>
                  <select id="m-gender" class="form-select">
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Birth Date</label>
                  <input type="date" id="m-birth" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number</label>
                  <input type="text" id="m-phone" class="form-input" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Spouse / Partner</label>
                <select id="m-spouse" class="form-select">
                  <option value="">None / Not in tree</option>
                  ${store.data.members.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join("")}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Avatar Photo URL (or leave blank for avatar generator)</label>
                <input type="url" id="m-avatar" class="form-input" placeholder="https://example.com/photo.jpg" />
              </div>

              <div class="form-group">
                <label class="form-label">Bio & Story</label>
                <textarea id="m-bio" class="form-textarea" rows="2" placeholder="Tell something special about this family member..."></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Favorite Things / Hobbies</label>
                <input type="text" id="m-favs" class="form-input" placeholder="e.g. Fishing, Baking, Soccer, Video Games" />
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
                <button type="button" class="btn-secondary" id="cancel-add-btn">Cancel</button>
                <button type="submit" class="btn-primary">Save to Family Tree</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderTree();
  }

  renderTree() {
    const viewport = this.container.querySelector("#tree-viewport");
    if (!viewport) return;

    const countElem = this.container.querySelector("#total-members-count");
    if (countElem) countElem.textContent = store.data.members.length;

    // Group members by generation
    const generations = [1, 2, 3];
    const genTitles = {
      1: "1st Generation • Grandparents & Elders",
      2: "2nd Generation • Parents & Siblings",
      3: "3rd Generation • Children & Cousins"
    };

    let html = "";

    generations.forEach(gen => {
      let membersInGen = store.data.members.filter(m => m.generation === gen);

      if (this.searchQuery) {
        membersInGen = membersInGen.filter(m => 
          m.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          m.role.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      }

      if (membersInGen.length > 0) {
        html += `
          <div class="tree-level">
            <div class="tree-level-label">${genTitles[gen] || `Generation ${gen}`}</div>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; width: 100%;">
              ${membersInGen.map(m => this.renderMemberNode(m)).join("")}
            </div>
          </div>
        `;
      }
    });

    viewport.innerHTML = html || `
      <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
        No family members match your search "${this.searchQuery}".
      </div>
    `;

    // Attach node click handlers
    viewport.querySelectorAll(".tree-node-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-member-id");
        this.openMemberDrawer(id);
      });
    });
  }

  renderMemberNode(member) {
    const activeMember = store.getActiveMember();
    const isCurrentUser = member.id === activeMember.id;
    const spouse = member.spouseId ? store.getMember(member.spouseId) : null;

    return `
      <div class="tree-node-card ${isCurrentUser ? 'active-user' : ''}" data-member-id="${member.id}">
        <img src="${member.avatar}" alt="${member.name}" class="tree-node-avatar" />
        <div class="tree-node-name">${member.name}</div>
        <div class="tree-node-role">${member.role}</div>
        ${member.birthDate ? `<div class="tree-node-birth">🎂 ${member.birthDate}</div>` : ''}
        ${spouse ? `
          <div style="margin-top: 6px; font-size: 0.7rem; color: var(--primary); background: var(--border-light); padding: 2px 6px; border-radius: var(--radius-sm); display: inline-block;">
            ❤️ ${spouse.name.split(" ")[0]}
          </div>
        ` : ''}
        ${isCurrentUser ? '<div style="margin-top: 4px; font-size: 0.65rem; font-weight: 700; color: var(--primary);">YOU</div>' : ''}
      </div>
    `;
  }

  openMemberDrawer(memberId) {
    this.selectedMember = store.getMember(memberId);
    if (!this.selectedMember) return;

    this.renderDrawerContent();
    const overlay = this.container.querySelector("#member-drawer-overlay");
    if (overlay) overlay.classList.add("open");
  }

  closeMemberDrawer() {
    const overlay = this.container.querySelector("#member-drawer-overlay");
    if (overlay) overlay.classList.remove("open");
    this.selectedMember = null;
  }

  renderDrawerContent() {
    const content = this.container.querySelector("#member-drawer-content");
    if (!content || !this.selectedMember) return;

    const m = this.selectedMember;
    const spouse = m.spouseId ? store.getMember(m.spouseId) : null;
    const parents = (m.parentIds || []).map(id => store.getMember(id)).filter(Boolean);

    // Calculate age if birthdate available
    let ageText = "";
    if (m.birthDate) {
      const birth = new Date(m.birthDate);
      const diff = Date.now() - birth.getTime();
      const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
      ageText = ` (${age} years old)`;
    }

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">Family Profile</span>
        <button class="btn-icon" id="close-drawer-btn">✕</button>
      </div>

      <div style="text-align: center; margin-bottom: 1.5rem;">
        <img src="${m.avatar}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid var(--border); box-shadow: var(--shadow-lg); margin-bottom: 0.75rem;" />
        <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">${m.name}</h2>
        <div style="color: var(--primary); font-weight: 600; font-size: 0.9rem;">${m.role}</div>
      </div>

      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
        <button class="btn-primary" id="drawer-chat-btn" style="flex: 1; justify-content: center;">
          <span>💬 Chat with ${m.name.split(" ")[0]}</span>
        </button>
      </div>

      <!-- Information Details -->
      <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.9rem;">
        <div style="background: var(--border-light); padding: 0.85rem; border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">🎂 Birthday</div>
          <div style="font-weight: 600;">${m.birthDate || 'Not specified'}${ageText}</div>
        </div>

        ${spouse ? `
          <div style="background: var(--border-light); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">💍 Spouse / Partner</div>
            <div style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <img src="${spouse.avatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
              <span>${spouse.name}</span>
            </div>
          </div>
        ` : ''}

        ${parents.length > 0 ? `
          <div style="background: var(--border-light); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">👨‍👩‍👧 Parents</div>
            <div style="font-weight: 600; display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${parents.map(p => `
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                  <img src="${p.avatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />
                  ${p.name}
                </span>
              `).join(", ")}
            </div>
          </div>
        ` : ''}

        ${m.phone ? `
          <div style="background: var(--border-light); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">📞 Phone</div>
            <div><a href="tel:${m.phone}" style="color: var(--primary); text-decoration: none; font-weight: 600;">${m.phone}</a></div>
          </div>
        ` : ''}

        ${m.bio ? `
          <div style="background: var(--border-light); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">📖 Bio & Story</div>
            <p style="color: var(--text-secondary); line-height: 1.5;">${m.bio}</p>
          </div>
        ` : ''}

        ${m.favoriteThings ? `
          <div style="background: var(--border-light); padding: 0.85rem; border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">⭐ Favorite Things & Hobbies</div>
            <p style="color: var(--text-secondary); line-height: 1.5;">${m.favoriteThings}</p>
          </div>
        ` : ''}
      </div>

      <div style="margin-top: auto; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between;">
        <button class="btn-secondary" id="delete-member-btn" style="color: var(--danger); font-size: 0.85rem;">
          Remove Member
        </button>
      </div>
    `;

    // Bind drawer buttons
    content.querySelector("#close-drawer-btn")?.addEventListener("click", () => this.closeMemberDrawer());
    
    content.querySelector("#drawer-chat-btn")?.addEventListener("click", () => {
      this.closeMemberDrawer();
      if (this.onNavigateToChat) {
        this.onNavigateToChat(m.id);
      }
    });

    content.querySelector("#delete-member-btn")?.addEventListener("click", () => {
      if (confirm(`Are you sure you want to remove ${m.name} from the family tree?`)) {
        store.deleteMember(m.id);
        this.closeMemberDrawer();
      }
    });
  }

  bindEvents() {
    // Search
    const searchInput = this.container.querySelector("#tree-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderTree();
      });
    }

    // Add Member Modal toggle
    const addModal = this.container.querySelector("#add-member-modal");
    const openAddBtn = this.container.querySelector("#open-add-member-btn");
    const closeAddBtn = this.container.querySelector("#close-add-modal-btn");
    const cancelAddBtn = this.container.querySelector("#cancel-add-btn");
    const addForm = this.container.querySelector("#add-member-form");

    if (openAddBtn && addModal) {
      openAddBtn.addEventListener("click", () => {
        addModal.style.display = "flex";
      });
    }

    const closeAddModal = () => {
      if (addModal) addModal.style.display = "none";
      if (addForm) addForm.reset();
    };

    if (closeAddBtn) closeAddBtn.addEventListener("click", closeAddModal);
    if (cancelAddBtn) cancelAddBtn.addEventListener("click", closeAddModal);

    // Add Member Form submission
    if (addForm) {
      addForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = this.container.querySelector("#m-name").value;
        const role = this.container.querySelector("#m-role").value;
        const generation = this.container.querySelector("#m-gen").value;
        const gender = this.container.querySelector("#m-gender").value;
        const birthDate = this.container.querySelector("#m-birth").value;
        const phone = this.container.querySelector("#m-phone").value;
        const spouseId = this.container.querySelector("#m-spouse").value || null;
        const avatar = this.container.querySelector("#m-avatar").value;
        const bio = this.container.querySelector("#m-bio").value;
        const favoriteThings = this.container.querySelector("#m-favs").value;

        store.addMember({
          name,
          role,
          generation,
          gender,
          birthDate,
          phone,
          spouseId,
          avatar: avatar || undefined,
          bio,
          favoriteThings
        });

        closeAddModal();
      });
    }

    // Drawer backdrop click
    const drawerOverlay = this.container.querySelector("#member-drawer-overlay");
    if (drawerOverlay) {
      drawerOverlay.addEventListener("click", (e) => {
        if (e.target === drawerOverlay) {
          this.closeMemberDrawer();
        }
      });
    }
  }
}
