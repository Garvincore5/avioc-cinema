// chores.js - Family Chores Wheel, Points Leaderboard, and Shared Shopping List
import { store } from "../store.js";

export class ChoresComponent {
  constructor(container) {
    this.container = container;
    this.activeSubTab = "chores"; // 'chores' | 'shopping'
    this.init();
  }

  init() {
    this.render();
    store.subscribe((data, changeType) => {
      if (["CHORE_UPDATE", "SHOPPING_UPDATE", "MEMBER_UPDATE", "RESET", "STORAGE_RELOAD"].includes(changeType) || changeType === "GENERAL") {
        this.renderChoresList();
        this.renderLeaderboard();
        this.renderShoppingList();
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <div>
        <!-- Sub-Tabs Switcher -->
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem;">
          <button class="btn-primary subtab-btn" data-subtab="chores" id="tab-chores-btn">
            <span>🧹 Family Chores</span>
          </button>
          <button class="btn-secondary subtab-btn" data-subtab="shopping" id="tab-shopping-btn">
            <span>🛒 Grocery & Shopping List</span>
          </button>
        </div>

        <!-- CHORES SECTION -->
        <div id="section-chores" style="display: block;">
          <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700;">Active Family Chores</h3>
                <button class="btn-primary" id="open-add-chore-btn">
                  <span>+ Assign Chore</span>
                </button>
              </div>

              <div id="chores-cards-list" class="chores-grid">
                <!-- Populated dynamically -->
              </div>
            </div>

            <!-- Chores Leaderboard -->
            <div>
              <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: var(--shadow-sm);">
                <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                  <span>⭐</span>
                  <span>Chore Points Leaderboard</span>
                </h3>
                <div id="chores-leaderboard" style="display: flex; flex-direction: column; gap: 0.75rem;">
                  <!-- Populated dynamically -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SHOPPING LIST SECTION -->
        <div id="section-shopping" style="display: none;">
          <div style="max-width: 700px; margin: 0 auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
            <div style="margin-bottom: 1.25rem;">
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem;">Shared Shopping List</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">Add groceries or household items. Anyone in the family can check them off at the store!</p>
            </div>

            <!-- Add Shopping Item Form -->
            <form id="add-shopping-form" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
              <input type="text" id="shop-input" class="form-input" placeholder="e.g. 2 Gallons Milk, Avocados, Dish Soap..." required style="flex: 1;" />
              <select id="shop-cat-select" class="form-select" style="width: 140px;">
                <option value="Produce">Produce 🥦</option>
                <option value="Dairy">Dairy 🥛</option>
                <option value="Meat">Meat 🥩</option>
                <option value="Bakery">Bakery 🍞</option>
                <option value="Snacks">Snacks 🍪</option>
                <option value="Household">Home 🧼</option>
                <option value="General">General 📦</option>
              </select>
              <button type="submit" class="btn-primary" style="white-space: nowrap;">+ Add</button>
            </form>

            <!-- Items List -->
            <div id="shopping-items-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
      </div>

      <!-- Add Chore Modal -->
      <div class="modal-backdrop" id="add-chore-modal" style="display: none;">
        <div class="modal-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 700;">Assign a Family Chore</h2>
            <button class="btn-icon" id="close-chore-modal-btn">✕</button>
          </div>

          <form id="add-chore-form">
            <div class="form-group">
              <label class="form-label">Chore Title *</label>
              <input type="text" id="chore-title-input" class="form-input" required placeholder="e.g. Take out the dog, Wash dishes" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Assign To *</label>
                <select id="chore-assignee-select" class="form-select">
                  ${store.data.members.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join("")}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Reward Points</label>
                <input type="number" id="chore-points-input" class="form-input" value="15" min="5" max="100" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" id="chore-date-input" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Frequency</label>
                <select id="chore-freq-select" class="form-select">
                  <option value="Daily">Daily</option>
                  <option value="Weekly" selected>Weekly</option>
                  <option value="Once">Once</option>
                </select>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
              <button type="button" class="btn-secondary" id="cancel-chore-btn">Cancel</button>
              <button type="submit" class="btn-primary">Assign Chore</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderChoresList();
    this.renderLeaderboard();
    this.renderShoppingList();
  }

  renderChoresList() {
    const list = this.container.querySelector("#chores-cards-list");
    if (!list) return;

    const chores = store.data.chores || [];
    if (chores.length === 0) {
      list.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">No chores assigned right now! ✨</div>`;
      return;
    }

    list.innerHTML = chores.map(c => {
      const assigned = store.getMember(c.assignedTo) || { name: "Family Member", avatar: "" };

      return `
        <div class="chore-card ${c.completed ? 'completed' : ''}">
          <input type="checkbox" class="chore-checkbox" data-chore-id="${c.id}" ${c.completed ? 'checked' : ''} />
          <div style="flex: 1; min-width: 0;">
            <div class="chore-title" style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 4px;">
              ${c.title}
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
              <span>📅 Due: ${c.dueDate}</span>
              <span>•</span>
              <span>${c.frequency}</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.65rem;">
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <img src="${assigned.avatar}" title="${assigned.name}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                <span style="font-size: 0.78rem; font-weight: 600;">${assigned.name.split(" ")[0]}</span>
              </div>
              <span style="font-size: 0.75rem; font-weight: 700; color: #f59e0b; background: #fef3c7; padding: 2px 7px; border-radius: var(--radius-sm);">
                ⭐ ${c.points} pts
              </span>
            </div>
          </div>
          <button class="delete-chore-btn btn-icon" data-chore-id="${c.id}" style="width: 24px; height: 24px; font-size: 0.7rem;">✕</button>
        </div>
      `;
    }).join("");

    // Bind checkboxes & delete
    list.querySelectorAll(".chore-checkbox").forEach(chk => {
      chk.addEventListener("change", () => {
        const choreId = chk.getAttribute("data-chore-id");
        store.toggleChore(choreId);
      });
    });

    list.querySelectorAll(".delete-chore-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const choreId = btn.getAttribute("data-chore-id");
        store.deleteChore(choreId);
      });
    });
  }

  renderLeaderboard() {
    const board = this.container.querySelector("#chores-leaderboard");
    if (!board) return;

    // Calculate completed points per member
    const pointsMap = {};
    store.data.members.forEach(m => pointsMap[m.id] = 0);

    (store.data.chores || []).forEach(c => {
      if (c.completed && pointsMap[c.assignedTo] !== undefined) {
        pointsMap[c.assignedTo] += (c.points || 10);
      }
    });

    const sortedMembers = [...store.data.members].sort((a, b) => (pointsMap[b.id] || 0) - (pointsMap[a.id] || 0));

    board.innerHTML = sortedMembers.map((m, idx) => {
      const medals = ["🥇", "🥈", "🥉"];
      const medal = medals[idx] || `#${idx + 1}`;
      const pts = pointsMap[m.id] || 0;

      return `
        <div style="display: flex; align-items: center; gap: 0.65rem; padding: 0.5rem; border-radius: var(--radius-md); background: var(--border-light);">
          <span style="font-weight: 700; width: 24px; text-align: center;">${medal}</span>
          <img src="${m.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${m.role}</div>
          </div>
          <span style="font-weight: 700; font-size: 0.85rem; color: var(--primary);">${pts} pts</span>
        </div>
      `;
    }).join("");
  }

  renderShoppingList() {
    const list = this.container.querySelector("#shopping-items-list");
    if (!list) return;

    const items = store.data.shoppingList || [];
    if (items.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">Shopping list is empty! All set! 🛒</div>`;
      return;
    }

    list.innerHTML = items.map(item => {
      const addedBy = store.getMember(item.addedBy);

      return `
        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border); background: ${item.completed ? 'var(--border-light)' : 'var(--bg-card)'};">
          <input type="checkbox" class="shop-check" data-shop-id="${item.id}" ${item.completed ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;" />
          <div style="flex: 1; min-width: 0;">
            <span style="font-weight: 500; font-size: 0.92rem; ${item.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${item.item}</span>
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              <span style="background: var(--border-light); padding: 1px 6px; border-radius: var(--radius-sm);">${item.category}</span>
              ${addedBy ? `<span>• Added by ${addedBy.name.split(" ")[0]}</span>` : ''}
            </div>
          </div>
          <button class="delete-shop-btn btn-icon" data-shop-id="${item.id}" style="width: 24px; height: 24px; font-size: 0.7rem;">✕</button>
        </div>
      `;
    }).join("");

    // Bind checkboxes & delete
    list.querySelectorAll(".shop-check").forEach(chk => {
      chk.addEventListener("change", () => {
        const id = chk.getAttribute("data-shop-id");
        store.toggleShoppingItem(id);
      });
    });

    list.querySelectorAll(".delete-shop-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-shop-id");
        store.deleteShoppingItem(id);
      });
    });
  }

  bindEvents() {
    // Sub-tab toggling
    const tabChores = this.container.querySelector("#tab-chores-btn");
    const tabShopping = this.container.querySelector("#tab-shopping-btn");
    const secChores = this.container.querySelector("#section-chores");
    const secShopping = this.container.querySelector("#section-shopping");

    tabChores?.addEventListener("click", () => {
      tabChores.className = "btn-primary subtab-btn";
      tabShopping.className = "btn-secondary subtab-btn";
      secChores.style.display = "block";
      secShopping.style.display = "none";
    });

    tabShopping?.addEventListener("click", () => {
      tabShopping.className = "btn-primary subtab-btn";
      tabChores.className = "btn-secondary subtab-btn";
      secShopping.style.display = "block";
      secChores.style.display = "none";
    });

    // Add Chore Modal
    const modal = this.container.querySelector("#add-chore-modal");
    const openBtn = this.container.querySelector("#open-add-chore-btn");
    const closeBtn = this.container.querySelector("#close-chore-modal-btn");
    const cancelBtn = this.container.querySelector("#cancel-chore-btn");
    const form = this.container.querySelector("#add-chore-form");

    if (openBtn && modal) {
      openBtn.addEventListener("click", () => {
        const dateInput = this.container.querySelector("#chore-date-input");
        if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
        modal.style.display = "flex";
      });
    }

    const closeModal = () => {
      if (modal) modal.style.display = "none";
      if (form) form.reset();
    };

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = this.container.querySelector("#chore-title-input").value;
        const assignedTo = this.container.querySelector("#chore-assignee-select").value;
        const points = this.container.querySelector("#chore-points-input").value;
        const dueDate = this.container.querySelector("#chore-date-input").value;
        const frequency = this.container.querySelector("#chore-freq-select").value;

        store.addChore({
          title,
          assignedTo,
          points,
          dueDate,
          frequency
        });

        closeModal();
      });
    }

    // Add Shopping Item form
    const shopForm = this.container.querySelector("#add-shopping-form");
    if (shopForm) {
      shopForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = this.container.querySelector("#shop-input");
        const cat = this.container.querySelector("#shop-cat-select");
        if (input && input.value.trim()) {
          store.addShoppingItem(input.value.trim(), cat.value);
          input.value = "";
        }
      });
    }
  }
}
