// feed.js - Family Wall & Posting System
import { store } from "../store.js";

export class FeedComponent {
  constructor(container) {
    this.container = container;
    this.currentFilter = "all";
    this.selectedImage = null;
    this.init();
  }

  init() {
    this.render();
    store.subscribe((data, changeType) => {
      // Re-render feed on relevant changes
      if (["NEW_POST", "POST_REACTION", "POST_COMMENT", "POST_DELETE", "RESET", "STORAGE_RELOAD", "MEMBER_UPDATE"].includes(changeType) || changeType === "GENERAL") {
        this.renderPostsList();
      }
    });
  }

  render() {
    const activeMember = store.getActiveMember();

    this.container.innerHTML = `
      <div class="feed-layout">
        <!-- Main Feed Column -->
        <div class="feed-main">
          <!-- Create Post Card -->
          <div class="create-post-card">
            <div class="post-input-row">
              <div class="avatar-wrapper">
                <img src="${activeMember.avatar}" class="avatar-img" />
              </div>
              <textarea id="new-post-content" class="post-textarea" placeholder="Share a family update, milestone, memory, or photo with everyone..."></textarea>
            </div>

            <!-- Preview uploaded image if any -->
            <div id="post-image-preview-container" style="display:none; margin-top: 0.75rem; position: relative;">
              <img id="post-image-preview" src="" style="max-height: 200px; border-radius: var(--radius-md); object-fit: cover;" />
              <button id="remove-post-image-btn" style="position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer;">✕</button>
            </div>

            <div class="post-actions-row">
              <div class="post-tools">
                <!-- Photo Upload / URL Button -->
                <button class="btn-secondary" id="add-photo-btn" style="padding: 0.4rem 0.75rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem;">
                  <span>📷</span>
                  <span>Photo</span>
                </button>
                <input type="file" id="post-file-input" accept="image/*" style="display: none;" />

                <!-- Category Tag -->
                <select id="post-tag-select" class="tag-select">
                  <option value="General">🏷️ General</option>
                  <option value="Milestone">🏆 Milestone</option>
                  <option value="Memories">❤️ Memories</option>
                  <option value="Vacation">✈️ Vacation</option>
                  <option value="Dinner">🍲 Dinner</option>
                  <option value="Announcement">📢 Announcement</option>
                </select>

                <!-- Pin checkbox -->
                <label style="font-size: 0.8rem; display: flex; align-items: center; gap: 4px; color: var(--text-secondary); cursor: pointer;">
                  <input type="checkbox" id="post-is-pinned" />
                  <span>📌 Pin to top</span>
                </label>
              </div>

              <button class="btn-primary" id="submit-post-btn">
                <span>Post to Family</span>
                <span>✨</span>
              </button>
            </div>
          </div>

          <!-- Feed Filter Tabs -->
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; overflow-x: auto; padding-bottom: 4px;">
            <button class="btn-secondary feed-filter-btn active" data-filter="all" style="padding: 0.35rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-full);">All Updates</button>
            <button class="btn-secondary feed-filter-btn" data-filter="Milestone" style="padding: 0.35rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-full);">🏆 Milestones</button>
            <button class="btn-secondary feed-filter-btn" data-filter="Memories" style="padding: 0.35rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-full);">❤️ Memories</button>
            <button class="btn-secondary feed-filter-btn" data-filter="photos" style="padding: 0.35rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-full);">📷 Photos</button>
            <button class="btn-secondary feed-filter-btn" data-filter="Announcement" style="padding: 0.35rem 0.85rem; font-size: 0.82rem; border-radius: var(--radius-full);">📢 Announcements</button>
          </div>

          <!-- Posts Container -->
          <div id="posts-list-container"></div>
        </div>

        <!-- Sidebar Widgets Column -->
        <div class="feed-sidebar">
          <!-- Family Highlights Card -->
          <div class="create-post-card" style="margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">
              <span>💡</span>
              <span>Family Motto</span>
            </div>
            <p style="font-size: 0.88rem; font-style: italic; color: var(--text-secondary); line-height: 1.5;">
              "${store.data.familyInfo.motto}"
            </p>
          </div>

          <!-- Upcoming Birthdays Widget -->
          <div class="create-post-card" style="margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>🎂</span>
                <span>Family Birthdays</span>
              </div>
            </div>
            <div id="birthdays-widget-list" style="display: flex; flex-direction: column; gap: 0.65rem;">
              ${this.renderBirthdaysWidget()}
            </div>
          </div>

          <!-- Quick Chores Widget -->
          <div class="create-post-card">
            <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>✅</span>
                <span>Today's Chores</span>
              </div>
            </div>
            <div id="quick-chores-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${this.renderQuickChoresWidget()}
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderPostsList();
  }

  renderBirthdaysWidget() {
    const members = store.data.members.filter(m => m.birthDate);
    if (!members.length) return '<div style="font-size: 0.8rem; color: var(--text-muted);">No birthdays listed yet.</div>';

    return members.slice(0, 4).map(m => {
      const parts = m.birthDate.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dateStr = parts.length >= 3 ? `${monthNames[parseInt(parts[1]) - 1]} ${parts[2]}` : m.birthDate;

      return `
        <div style="display: flex; align-items: center; gap: 0.65rem; padding: 0.4rem; border-radius: var(--radius-md); background: var(--border-light);">
          <img src="${m.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${m.role}</div>
          </div>
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary); background: var(--bg-card); padding: 2px 7px; border-radius: var(--radius-sm);">${dateStr}</span>
        </div>
      `;
    }).join("");
  }

  renderQuickChoresWidget() {
    const chores = store.data.chores || [];
    if (!chores.length) return '<div style="font-size: 0.8rem; color: var(--text-muted);">No chores pending! 🎉</div>';

    return chores.slice(0, 3).map(c => {
      const assigned = store.getMember(c.assignedTo);
      return `
        <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.82rem; padding: 0.35rem 0;">
          <input type="checkbox" ${c.completed ? 'checked' : ''} class="quick-chore-check" data-chore-id="${c.id}" style="accent-color: var(--primary); cursor: pointer;" />
          <span style="flex: 1; ${c.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${c.title}</span>
          ${assigned ? `<img src="${assigned.avatar}" title="${assigned.name}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />` : ''}
        </div>
      `;
    }).join("");
  }

  bindEvents() {
    // Submit Post
    const submitBtn = this.container.querySelector("#submit-post-btn");
    const textarea = this.container.querySelector("#new-post-content");
    const tagSelect = this.container.querySelector("#post-tag-select");
    const pinCheck = this.container.querySelector("#post-is-pinned");
    const fileInput = this.container.querySelector("#post-file-input");
    const addPhotoBtn = this.container.querySelector("#add-photo-btn");
    const previewContainer = this.container.querySelector("#post-image-preview-container");
    const previewImg = this.container.querySelector("#post-image-preview");
    const removeImgBtn = this.container.querySelector("#remove-post-image-btn");

    if (addPhotoBtn && fileInput) {
      addPhotoBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.selectedImage = event.target.result;
            previewImg.src = this.selectedImage;
            previewContainer.style.display = "block";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (removeImgBtn) {
      removeImgBtn.addEventListener("click", () => {
        this.selectedImage = null;
        previewContainer.style.display = "none";
        fileInput.value = "";
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const text = textarea.value.trim();
        if (!text && !this.selectedImage) {
          alert("Please write something or attach a photo before posting!");
          return;
        }

        const images = this.selectedImage ? [this.selectedImage] : [];
        store.addPost({
          content: text,
          images: images,
          tag: tagSelect.value,
          isPinned: pinCheck.checked
        });

        // Reset form
        textarea.value = "";
        this.selectedImage = null;
        if (previewContainer) previewContainer.style.display = "none";
        if (fileInput) fileInput.value = "";
        pinCheck.checked = false;
      });
    }

    // Filter clicks
    this.container.querySelectorAll(".feed-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.container.querySelectorAll(".feed-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentFilter = btn.getAttribute("data-filter");
        this.renderPostsList();
      });
    });

    // Quick chore checks
    this.container.addEventListener("change", (e) => {
      if (e.target.classList.contains("quick-chore-check")) {
        const choreId = e.target.getAttribute("data-chore-id");
        store.toggleChore(choreId);
      }
    });
  }

  renderPostsList() {
    const listContainer = this.container.querySelector("#posts-list-container");
    if (!listContainer) return;

    let posts = [...store.data.posts];

    // Filter posts
    if (this.currentFilter === "photos") {
      posts = posts.filter(p => p.images && p.images.length > 0);
    } else if (this.currentFilter !== "all") {
      posts = posts.filter(p => p.tag === this.currentFilter);
    }

    // Sort: pinned first, then chronological
    posts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    if (posts.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📸</div>
          <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem;">No family posts in this category yet!</div>
          <div style="color: var(--text-muted); font-size: 0.9rem;">Be the first one to share an update with the family!</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = posts.map(post => this.renderSinglePost(post)).join("");
    this.bindPostInteractions(listContainer);
  }

  renderSinglePost(post) {
    const author = store.getMember(post.authorId) || { name: "Family Member", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=user", role: "Family" };
    const activeMember = store.getActiveMember();
    const timeAgo = this.formatTimeAgo(post.timestamp);

    const commonEmojis = ["❤️", "👏", "🎉", "😂", "😋", "🌟"];

    return `
      <div class="post-card" id="post-${post.id}">
        <div class="post-header">
          <div class="post-author">
            <div class="avatar-wrapper">
              <img src="${author.avatar}" class="avatar-img" />
            </div>
            <div>
              <div class="post-author-name">${author.name}</div>
              <div class="post-meta">
                <span>${author.role}</span> • <span>${timeAgo}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${post.isPinned ? '<span style="font-size: 0.72rem; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: var(--radius-full); display: flex; align-items: center; gap: 3px;">📌 Pinned</span>' : ''}
            <span class="post-tag">${post.tag}</span>
            ${post.authorId === activeMember.id ? `
              <button class="delete-post-btn btn-icon" data-post-id="${post.id}" title="Delete Post" style="width: 28px; height: 28px; font-size: 0.75rem;">
                ✕
              </button>
            ` : ''}
          </div>
        </div>

        <div class="post-content">${this.escapeHtml(post.content)}</div>

        ${post.images && post.images.length > 0 ? `
          <div class="post-images-grid">
            ${post.images.map(img => `<img src="${img}" class="post-image" alt="Post attachment" />`).join("")}
          </div>
        ` : ''}

        <!-- Reaction Pills -->
        <div class="post-reactions-bar">
          ${commonEmojis.map(emoji => {
            const reactors = post.reactions?.[emoji] || [];
            const hasReacted = reactors.includes(activeMember.id);
            return `
              <button class="reaction-pill ${hasReacted ? 'reacted' : ''}" data-post-id="${post.id}" data-emoji="${emoji}" title="${reactors.length > 0 ? reactors.map(id => store.getMember(id)?.name || 'Someone').join(', ') : 'React with ' + emoji}">
                <span>${emoji}</span>
                ${reactors.length > 0 ? `<span>${reactors.length}</span>` : ''}
              </button>
            `;
          }).join("")}
        </div>

        <!-- Comments Section -->
        <div class="post-comments-section">
          <div class="comments-list" id="comments-list-${post.id}">
            ${(post.comments || []).map(comment => {
              const cAuthor = store.getMember(comment.authorId) || { name: "Family Member", avatar: "" };
              return `
                <div class="comment-item">
                  <img src="${cAuthor.avatar}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
                  <div class="comment-bubble">
                    <div class="comment-author">${cAuthor.name}</div>
                    <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Add Comment Input -->
          <div class="comment-input-row">
            <img src="${activeMember.avatar}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
            <input type="text" class="comment-input" placeholder="Write a heartwarming reply..." data-post-id="${post.id}" />
            <button class="btn-primary submit-comment-btn" data-post-id="${post.id}" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;">Reply</button>
          </div>
        </div>
      </div>
    `;
  }

  bindPostInteractions(container) {
    // Reactions
    container.querySelectorAll(".reaction-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const postId = pill.getAttribute("data-post-id");
        const emoji = pill.getAttribute("data-emoji");
        store.togglePostReaction(postId, emoji);
      });
    });

    // Delete post
    container.querySelectorAll(".delete-post-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const postId = btn.getAttribute("data-post-id");
        if (confirm("Delete this family post?")) {
          store.deletePost(postId);
        }
      });
    });

    // Submit comment button
    container.querySelectorAll(".submit-comment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const postId = btn.getAttribute("data-post-id");
        const input = container.querySelector(`input.comment-input[data-post-id="${postId}"]`);
        if (input && input.value.trim()) {
          store.addComment(postId, input.value.trim());
          input.value = "";
        }
      });
    });

    // Submit comment on Enter
    container.querySelectorAll(".comment-input").forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const postId = input.getAttribute("data-post-id");
          if (input.value.trim()) {
            store.addComment(postId, input.value.trim());
            input.value = "";
          }
        }
      });
    });
  }

  formatTimeAgo(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return "just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
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
