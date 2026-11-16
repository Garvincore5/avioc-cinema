// chat.js - Real-time Family Chat System (Channels and Direct Messages)
import { store } from "../store.js";

export class ChatComponent {
  constructor(container) {
    this.container = container;
    this.activeChannelId = "chan-all";
    this.activeRecipientId = null; // if set, we are in a DM
    this.chatImageAttachment = null;
    this.init();
  }

  init() {
    this.render();
    store.subscribe((data, changeType) => {
      if (["NEW_MESSAGE", "MESSAGE_REACTION", "RESET", "STORAGE_RELOAD", "MEMBER_UPDATE"].includes(changeType) || changeType === "GENERAL") {
        this.renderMessages();
      }
    });
  }

  render() {
    const channels = store.data.chatChannels || [];
    const members = store.data.members || [];
    const activeMember = store.getActiveMember();
    const otherMembers = members.filter(m => m.id !== activeMember.id);

    this.container.innerHTML = `
      <div class="chat-container">
        <!-- Chat Sidebar -->
        <div class="chat-sidebar">
          <div class="chat-sidebar-header">
            <span>💬 Family Chats</span>
          </div>

          <div class="chat-list">
            <!-- Channels Section -->
            <div class="chat-section-label">Channels</div>
            <div id="channels-list">
              ${channels.map(c => `
                <div class="chat-item ${this.activeChannelId === c.id ? 'active' : ''}" data-channel-id="${c.id}">
                  <span style="font-size: 1.1rem;">#</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</div>
                  </div>
                </div>
              `).join("")}
            </div>

            <!-- Direct Messages Section -->
            <div class="chat-section-label" style="margin-top: 1rem;">Direct Messages</div>
            <div id="dm-list">
              ${otherMembers.map(m => `
                <div class="chat-item ${this.activeRecipientId === m.id ? 'active' : ''}" data-recipient-id="${m.id}">
                  <div class="avatar-wrapper" style="width: 32px; height: 32px;">
                    <img src="${m.avatar}" class="avatar-img" />
                    ${m.isOnline ? '<span class="online-dot" style="width: 8px; height: 8px;"></span>' : ''}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${m.role}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Chat Main Area -->
        <div class="chat-main">
          <div class="chat-header" id="chat-header">
            <!-- Populated dynamically in renderHeader() -->
          </div>

          <div class="chat-messages-area" id="chat-messages-area">
            <!-- Messages rendered here -->
          </div>

          <!-- Attachment Preview -->
          <div id="chat-attachment-preview" style="display:none; padding: 0.5rem 1.25rem; background: var(--border-light); border-top: 1px solid var(--border); display: flex; align-items: center; gap: 0.75rem;">
            <img id="chat-preview-img" src="" style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-sm);" />
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Image attached</span>
            <button id="clear-chat-img-btn" style="border:none; background:transparent; cursor:pointer; font-weight:bold; margin-left:auto;">✕</button>
          </div>

          <!-- Input Bar -->
          <div class="chat-input-bar">
            <button class="btn-icon" id="chat-attach-btn" title="Attach photo">📷</button>
            <input type="file" id="chat-file-input" accept="image/*" style="display:none;" />
            <input type="text" class="chat-input" id="chat-input-field" placeholder="Type a message to the family..." />
            <button class="btn-primary" id="chat-send-btn" style="border-radius: var(--radius-full); padding: 0.65rem 1.1rem;">
              <span>Send</span>
              <span>🚀</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderHeader();
    this.renderMessages();
  }

  renderHeader() {
    const header = this.container.querySelector("#chat-header");
    if (!header) return;

    if (this.activeRecipientId) {
      const recipient = store.getMember(this.activeRecipientId);
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="avatar-wrapper" style="width: 36px; height: 36px;">
            <img src="${recipient.avatar}" class="avatar-img" />
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.95rem;">${recipient.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${recipient.role} • ${recipient.isOnline ? 'Active now' : 'Away'}</div>
          </div>
        </div>
      `;
    } else {
      const channel = store.data.chatChannels.find(c => c.id === this.activeChannelId);
      header.innerHTML = `
        <div>
          <div style="font-weight: 700; font-size: 0.95rem;"># ${channel ? channel.name : 'Family Channel'}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${channel ? channel.description : ''}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">👥 ${channel?.members?.length || store.data.members.length} members</span>
        </div>
      `;
    }
  }

  renderMessages() {
    const area = this.container.querySelector("#chat-messages-area");
    if (!area) return;

    const activeMember = store.getActiveMember();
    let messages = store.data.messages || [];

    // Filter messages for current channel or DM
    if (this.activeRecipientId) {
      messages = messages.filter(m => 
        (m.senderId === activeMember.id && m.recipientId === this.activeRecipientId) ||
        (m.senderId === this.activeRecipientId && m.recipientId === activeMember.id)
      );
    } else {
      messages = messages.filter(m => m.channelId === this.activeChannelId);
    }

    if (messages.length === 0) {
      area.innerHTML = `
        <div style="text-align: center; margin: auto; padding: 2rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👋</div>
          <div style="font-weight: 600; font-size: 1rem;">No messages yet!</div>
          <div style="font-size: 0.85rem;">Say hello to start the conversation!</div>
        </div>
      `;
      return;
    }

    area.innerHTML = messages.map(msg => {
      const isOutgoing = msg.senderId === activeMember.id;
      const sender = store.getMember(msg.senderId) || { name: "Family Member", avatar: "" };
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="msg-row ${isOutgoing ? 'outgoing' : 'incoming'}">
          ${!isOutgoing ? `
            <img src="${sender.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; align-self: flex-end;" />
          ` : ''}

          <div class="msg-bubble">
            ${!isOutgoing ? `<div class="msg-sender-name">${sender.name}</div>` : ''}
            <div>${this.escapeHtml(msg.text)}</div>
            ${msg.image ? `<img src="${msg.image}" style="max-width: 250px; border-radius: var(--radius-sm); margin-top: 6px; display: block;" />` : ''}
            <div class="msg-time">${time}</div>
          </div>
        </div>
      `;
    }).join("");

    // Auto-scroll to bottom
    area.scrollTop = area.scrollHeight;
  }

  bindEvents() {
    // Channel selection
    this.container.querySelectorAll("[data-channel-id]").forEach(item => {
      item.addEventListener("click", () => {
        this.activeChannelId = item.getAttribute("data-channel-id");
        this.activeRecipientId = null;
        this.updateActiveItemStyles();
        this.renderHeader();
        this.renderMessages();
      });
    });

    // DM selection
    this.container.querySelectorAll("[data-recipient-id]").forEach(item => {
      item.addEventListener("click", () => {
        this.activeRecipientId = item.getAttribute("data-recipient-id");
        this.activeChannelId = null;
        this.updateActiveItemStyles();
        this.renderHeader();
        this.renderMessages();
      });
    });

    // Attachment
    const attachBtn = this.container.querySelector("#chat-attach-btn");
    const fileInput = this.container.querySelector("#chat-file-input");
    const previewBox = this.container.querySelector("#chat-attachment-preview");
    const previewImg = this.container.querySelector("#chat-preview-img");
    const clearImgBtn = this.container.querySelector("#clear-chat-img-btn");

    if (attachBtn && fileInput) {
      attachBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.chatImageAttachment = event.target.result;
            previewImg.src = this.chatImageAttachment;
            previewBox.style.display = "flex";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (clearImgBtn) {
      clearImgBtn.addEventListener("click", () => {
        this.chatImageAttachment = null;
        previewBox.style.display = "none";
        fileInput.value = "";
      });
    }

    // Send message
    const sendBtn = this.container.querySelector("#chat-send-btn");
    const input = this.container.querySelector("#chat-input-field");

    const doSend = () => {
      const text = input.value.trim();
      if (!text && !this.chatImageAttachment) return;

      store.sendMessage({
        channelId: this.activeChannelId,
        recipientId: this.activeRecipientId,
        text: text,
        image: this.chatImageAttachment
      });

      input.value = "";
      this.chatImageAttachment = null;
      if (previewBox) previewBox.style.display = "none";
      if (fileInput) fileInput.value = "";
      input.focus();
    };

    if (sendBtn) sendBtn.addEventListener("click", doSend);
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doSend();
      });
    }
  }

  updateActiveItemStyles() {
    this.container.querySelectorAll(".chat-item").forEach(item => {
      if (this.activeChannelId && item.getAttribute("data-channel-id") === this.activeChannelId) {
        item.classList.add("active");
      } else if (this.activeRecipientId && item.getAttribute("data-recipient-id") === this.activeRecipientId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
