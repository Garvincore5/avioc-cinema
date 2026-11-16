// vault.js - Emergency Contacts & Family Safety Vault
import { store } from "../store.js";

export class VaultComponent {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.render();
    store.subscribe((data, changeType) => {
      if (["VAULT_UPDATE", "RESET", "STORAGE_RELOAD"].includes(changeType) || changeType === "GENERAL") {
        this.renderContacts();
      }
    });
  }

  render() {
    const familyInfo = store.data.familyInfo;

    this.container.innerHTML = `
      <div>
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.35rem; font-weight: 700;">Emergency & Family Vault 🛡️</h2>
          <p style="font-size: 0.88rem; color: var(--text-muted);">Quick-access emergency numbers, pediatrician info, trusted neighbors, and essential home details for the entire family.</p>
        </div>

        <!-- Quick Household Info Bar -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <!-- Home Address -->
          <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">📍 Home Address</div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 0.5rem;" id="vault-address">${familyInfo.homeAddress}</div>
            <button class="btn-secondary copy-text-btn" data-copy="${familyInfo.homeAddress}" style="padding: 0.3rem 0.75rem; font-size: 0.75rem;">📋 Copy Address</button>
          </div>

          <!-- Home Wi-Fi -->
          <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">📶 Home Wi-Fi Network</div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${familyInfo.wifiName}</div>
            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Password: <code style="background: var(--border-light); padding: 2px 6px; border-radius: 4px;">${familyInfo.wifiPassword}</code></div>
            <button class="btn-secondary copy-text-btn" data-copy="${familyInfo.wifiPassword}" style="padding: 0.3rem 0.75rem; font-size: 0.75rem;">📋 Copy Wi-Fi Password</button>
          </div>

          <!-- National Emergency -->
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 700; color: #dc2626; text-transform: uppercase; margin-bottom: 4px;">🚨 Life-Threatening Emergency</div>
            <div style="font-weight: 900; font-size: 1.4rem; color: #991b1b; margin-bottom: 0.25rem;">Call 911</div>
            <div style="font-size: 0.75rem; color: #b91c1c;">Poison Control: 1-800-222-1222</div>
          </div>
        </div>

        <!-- Contacts Section Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700;">Important Family Contacts</h3>
          <button class="btn-primary" id="open-add-contact-btn">
            <span>+ Add Contact</span>
          </button>
        </div>

        <!-- Contacts Grid -->
        <div id="vault-contacts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Add Contact Modal -->
      <div class="modal-backdrop" id="add-contact-modal" style="display: none;">
        <div class="modal-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 700;">Add Important Contact</h2>
            <button class="btn-icon" id="close-contact-modal-btn">✕</button>
          </div>

          <form id="add-contact-form">
            <div class="form-group">
              <label class="form-label">Contact Name / Service *</label>
              <input type="text" id="con-name" class="form-input" required placeholder="e.g. Dr. Reed (Pediatrician), Aunt Clara" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select id="con-category" class="form-select">
                  <option value="Medical">🩺 Medical / Doctor</option>
                  <option value="Home Maintenance">🔧 Home Maintenance</option>
                  <option value="Pets">🐾 Pets / Vet</option>
                  <option value="Neighbor">🏡 Neighbor</option>
                  <option value="School">🏫 School / Daycare</option>
                  <option value="General">📞 General</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number *</label>
                <input type="tel" id="con-phone" class="form-input" required placeholder="+1 (555) 000-0000" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Address / Location</label>
              <input type="text" id="con-addr" class="form-input" placeholder="e.g. 123 Main St, Suite 400" />
            </div>

            <div class="form-group">
              <label class="form-label">Notes & Instructions</label>
              <textarea id="con-notes" class="form-textarea" rows="2" placeholder="e.g. Account number, spare key location, allergies..."></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
              <button type="button" class="btn-secondary" id="cancel-contact-btn">Cancel</button>
              <button type="submit" class="btn-primary">Save Contact</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderContacts();
  }

  renderContacts() {
    const grid = this.container.querySelector("#vault-contacts-grid");
    if (!grid) return;

    const contacts = store.data.vaultContacts || [];

    grid.innerHTML = contacts.map(c => `
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h4 style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${c.name}</h4>
          <span style="font-size: 0.7rem; font-weight: 600; padding: 2px 7px; border-radius: var(--radius-full); background: var(--border-light); color: var(--text-secondary);">${c.category}</span>
        </div>

        <div style="margin-bottom: 0.75rem;">
          <a href="tel:${c.phone}" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; color: var(--primary); text-decoration: none; font-size: 0.95rem;">
            <span>📞</span>
            <span>${c.phone}</span>
          </a>
        </div>

        ${c.address ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">📍 ${c.address}</div>` : ''}
        ${c.notes ? `<p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; margin-top: auto; padding-top: 0.5rem; border-top: 1px solid var(--border-light); font-style: italic;">📝 ${c.notes}</p>` : ''}
      </div>
    `).join("");

    // Bind copy buttons
    this.container.querySelectorAll(".copy-text-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-copy");
        navigator.clipboard?.writeText(text);
        const original = btn.textContent;
        btn.textContent = "✓ Copied!";
        setTimeout(() => btn.textContent = original, 2000);
      });
    });
  }

  bindEvents() {
    const modal = this.container.querySelector("#add-contact-modal");
    const openBtn = this.container.querySelector("#open-add-contact-btn");
    const closeBtn = this.container.querySelector("#close-contact-modal-btn");
    const cancelBtn = this.container.querySelector("#cancel-contact-btn");
    const form = this.container.querySelector("#add-contact-form");

    if (openBtn && modal) {
      openBtn.addEventListener("click", () => {
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
        const name = this.container.querySelector("#con-name").value;
        const category = this.container.querySelector("#con-category").value;
        const phone = this.container.querySelector("#con-phone").value;
        const address = this.container.querySelector("#con-addr").value;
        const notes = this.container.querySelector("#con-notes").value;

        store.addVaultContact({
          name,
          category,
          phone,
          address,
          notes
        });

        closeModal();
      });
    }
  }
}
