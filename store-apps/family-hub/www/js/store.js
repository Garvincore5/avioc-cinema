// store.js - Reactive state management and persistence for Family App
import { INITIAL_DATA } from "./data/initialData.js";
import { FamilySync } from "./sync.js";

const STORAGE_KEY = "family_app_data_v1";
const ACTIVE_MEMBER_KEY = "family_app_active_member_v1";

class FamilyStore {
  constructor() {
    this.listeners = new Set();
    this.data = this.loadData();
    this.activeMemberId = this.loadActiveMember();
    this.sync = new FamilySync(this);
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
    // Deep clone initial data
    const initial = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData(initial);
    return initial;
  }

  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data || this.data));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  }

  loadActiveMember() {
    try {
      const stored = localStorage.getItem(ACTIVE_MEMBER_KEY);
      if (stored && this.data.members.some(m => m.id === stored)) {
        return stored;
      }
    } catch (e) {
      console.error("Error loading active member:", e);
    }
    // Default to David Henderson (Dad, mem-3) or first member
    return this.data.members[2]?.id || this.data.members[0]?.id || "mem-3";
  }

  setActiveMember(memberId) {
    if (this.data.members.some(m => m.id === memberId)) {
      this.activeMemberId = memberId;
      try {
        localStorage.setItem(ACTIVE_MEMBER_KEY, memberId);
      } catch (e) {}
      this.notifyListeners();
    }
  }

  getActiveMember() {
    return this.data.members.find(m => m.id === this.activeMemberId) || this.data.members[0];
  }

  getMember(id) {
    return this.data.members.find(m => m.id === id);
  }

  // Subscriptions for UI reactivity
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(changeType = "GENERAL") {
    for (const listener of this.listeners) {
      try {
        listener(this.data, changeType);
      } catch (err) {
        console.error("Listener error:", err);
      }
    }
  }

  reloadFromStorage() {
    this.data = this.loadData();
    this.notifyListeners("STORAGE_RELOAD");
  }

  // --- POSTS / FEED METHODS ---
  addPost({ content, images = [], tag = "General", isPinned = false }) {
    const activeMember = this.getActiveMember();
    const newPost = {
      id: "post-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      authorId: activeMember.id,
      content: content.trim(),
      images: images,
      tag: tag || "General",
      isPinned: !!isPinned,
      timestamp: new Date().toISOString(),
      reactions: {},
      comments: []
    };

    // If pinned, insert at start
    this.data.posts.unshift(newPost);
    this.saveData();
    this.sync.broadcast("NEW_POST", newPost);
    this.notifyListeners("NEW_POST");
    return newPost;
  }

  togglePostReaction(postId, emoji) {
    const post = this.data.posts.find(p => p.id === postId);
    if (!post) return;

    if (!post.reactions) post.reactions = {};
    if (!post.reactions[emoji]) post.reactions[emoji] = [];

    const memberId = this.activeMemberId;
    const index = post.reactions[emoji].indexOf(memberId);

    if (index >= 0) {
      post.reactions[emoji].splice(index, 1);
      if (post.reactions[emoji].length === 0) {
        delete post.reactions[emoji];
      }
    } else {
      post.reactions[emoji].push(memberId);
    }

    this.saveData();
    const payload = { postId, emoji, memberId, hasReacted: index < 0 };
    this.sync.broadcast("POST_REACTION", payload);
    this.notifyListeners("POST_REACTION");
  }

  addComment(postId, text) {
    const post = this.data.posts.find(p => p.id === postId);
    if (!post || !text.trim()) return;

    if (!post.comments) post.comments = [];
    const newComment = {
      id: "c-" + Date.now(),
      authorId: this.activeMemberId,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    post.comments.push(newComment);
    this.saveData();
    this.sync.broadcast("POST_COMMENT", { postId, comment: newComment });
    this.notifyListeners("POST_COMMENT");
    return newComment;
  }

  deletePost(postId) {
    const index = this.data.posts.findIndex(p => p.id === postId);
    if (index >= 0) {
      this.data.posts.splice(index, 1);
      this.saveData();
      this.sync.broadcast("POST_DELETE", { postId });
      this.notifyListeners("POST_DELETE");
    }
  }

  // --- CHAT METHODS ---
  sendMessage({ channelId, recipientId, text, image = null }) {
    if (!text && !image) return;

    const newMsg = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      channelId: channelId || null,
      recipientId: recipientId || null,
      senderId: this.activeMemberId,
      text: text ? text.trim() : "",
      image: image,
      timestamp: new Date().toISOString(),
      reactions: {}
    };

    if (!this.data.messages) this.data.messages = [];
    this.data.messages.push(newMsg);
    this.saveData();
    this.sync.broadcast("NEW_MESSAGE", newMsg);
    this.notifyListeners("NEW_MESSAGE");
    return newMsg;
  }

  toggleMessageReaction(msgId, emoji) {
    const msg = this.data.messages?.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    const memberId = this.activeMemberId;
    const index = msg.reactions[emoji].indexOf(memberId);

    if (index >= 0) {
      msg.reactions[emoji].splice(index, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(memberId);
    }

    this.saveData();
    this.notifyListeners("MESSAGE_REACTION");
  }

  // --- FAMILY MEMBERS & TREE METHODS ---
  addMember(memberData) {
    const newMember = {
      id: "mem-" + Date.now(),
      name: memberData.name.trim(),
      role: memberData.role.trim() || "Family Member",
      generation: parseInt(memberData.generation) || 2,
      gender: memberData.gender || "other",
      avatar: memberData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(memberData.name)}`,
      birthDate: memberData.birthDate || "",
      phone: memberData.phone || "",
      email: memberData.email || "",
      bio: memberData.bio || "",
      favoriteThings: memberData.favoriteThings || "",
      spouseId: memberData.spouseId || null,
      parentIds: Array.isArray(memberData.parentIds) ? memberData.parentIds : [],
      isOnline: true
    };

    this.data.members.push(newMember);

    // If spouse linked, make sure reciprocal link is set
    if (newMember.spouseId) {
      const spouse = this.getMember(newMember.spouseId);
      if (spouse && !spouse.spouseId) {
        spouse.spouseId = newMember.id;
      }
    }

    this.saveData();
    this.sync.broadcast("MEMBER_UPDATE", { member: newMember, action: "ADD" });
    this.notifyListeners("MEMBER_UPDATE");
    return newMember;
  }

  updateMember(memberId, updates) {
    const member = this.getMember(memberId);
    if (!member) return;

    Object.assign(member, updates);
    this.saveData();
    this.sync.broadcast("MEMBER_UPDATE", { member, action: "UPDATE" });
    this.notifyListeners("MEMBER_UPDATE");
  }

  deleteMember(memberId) {
    // Don't delete if only 1 member left
    if (this.data.members.length <= 1) return false;

    this.data.members = this.data.members.filter(m => m.id !== memberId);
    // Cleanup spouse and parent links
    this.data.members.forEach(m => {
      if (m.spouseId === memberId) m.spouseId = null;
      if (m.parentIds) m.parentIds = m.parentIds.filter(id => id !== memberId);
    });

    if (this.activeMemberId === memberId) {
      this.activeMemberId = this.data.members[0].id;
    }

    this.saveData();
    this.sync.broadcast("MEMBER_UPDATE", { memberId, action: "DELETE" });
    this.notifyListeners("MEMBER_UPDATE");
    return true;
  }

  // --- CALENDAR & EVENTS METHODS ---
  addEvent(eventData) {
    const newEvent = {
      id: "evt-" + Date.now(),
      title: eventData.title.trim(),
      date: eventData.date,
      time: eventData.time || "12:00",
      location: eventData.location || "Home",
      description: eventData.description || "",
      category: eventData.category || "General",
      color: eventData.color || "#3b82f6",
      rsvps: { [this.activeMemberId]: "going" }
    };

    if (!this.data.events) this.data.events = [];
    this.data.events.push(newEvent);
    this.saveData();
    this.sync.broadcast("CALENDAR_EVENT", newEvent);
    this.notifyListeners("CALENDAR_EVENT");
    return newEvent;
  }

  setEventRsvp(eventId, status) {
    const event = this.data.events?.find(e => e.id === eventId);
    if (!event) return;

    if (!event.rsvps) event.rsvps = {};
    event.rsvps[this.activeMemberId] = status; // 'going', 'maybe', 'not_going'

    this.saveData();
    this.sync.broadcast("EVENT_RSVP", { eventId, memberId: this.activeMemberId, status });
    this.notifyListeners("EVENT_RSVP");
  }

  // --- CHORES & SHOPPING METHODS ---
  addChore(choreData) {
    const newChore = {
      id: "chore-" + Date.now(),
      title: choreData.title.trim(),
      assignedTo: choreData.assignedTo || this.activeMemberId,
      dueDate: choreData.dueDate || new Date().toISOString().split("T")[0],
      completed: false,
      points: parseInt(choreData.points) || 10,
      frequency: choreData.frequency || "Once"
    };

    if (!this.data.chores) this.data.chores = [];
    this.data.chores.push(newChore);
    this.saveData();
    this.notifyListeners("CHORE_UPDATE");
    return newChore;
  }

  toggleChore(choreId) {
    const chore = this.data.chores?.find(c => c.id === choreId);
    if (!chore) return;

    chore.completed = !chore.completed;
    this.saveData();
    this.sync.broadcast("CHORE_TOGGLE", { choreId, completed: chore.completed });
    this.notifyListeners("CHORE_UPDATE");
    return chore;
  }

  deleteChore(choreId) {
    if (!this.data.chores) return;
    this.data.chores = this.data.chores.filter(c => c.id !== choreId);
    this.saveData();
    this.notifyListeners("CHORE_UPDATE");
  }

  addShoppingItem(item, category = "General") {
    const newItem = {
      id: "shop-" + Date.now(),
      item: item.trim(),
      category: category || "General",
      completed: false,
      addedBy: this.activeMemberId
    };

    if (!this.data.shoppingList) this.data.shoppingList = [];
    this.data.shoppingList.push(newItem);
    this.saveData();
    this.notifyListeners("SHOPPING_UPDATE");
    return newItem;
  }

  toggleShoppingItem(itemId) {
    const item = this.data.shoppingList?.find(i => i.id === itemId);
    if (!item) return;

    item.completed = !item.completed;
    this.saveData();
    this.sync.broadcast("SHOPPING_TOGGLE", { itemId, completed: item.completed });
    this.notifyListeners("SHOPPING_UPDATE");
    return item;
  }

  deleteShoppingItem(itemId) {
    if (!this.data.shoppingList) return;
    this.data.shoppingList = this.data.shoppingList.filter(i => i.id !== itemId);
    this.saveData();
    this.notifyListeners("SHOPPING_UPDATE");
  }

  // --- RECIPES & VAULT METHODS ---
  addRecipe(recipeData) {
    const newRecipe = {
      id: "rec-" + Date.now(),
      title: recipeData.title.trim(),
      author: this.getActiveMember().name,
      authorId: this.activeMemberId,
      prepTime: recipeData.prepTime || "20 mins",
      cookTime: recipeData.cookTime || "30 mins",
      difficulty: recipeData.difficulty || "Easy",
      rating: 5,
      image: recipeData.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
      description: recipeData.description || "",
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [recipeData.ingredients],
      steps: Array.isArray(recipeData.steps) ? recipeData.steps : [recipeData.steps]
    };

    if (!this.data.recipes) this.data.recipes = [];
    this.data.recipes.unshift(newRecipe);
    this.saveData();
    this.notifyListeners("RECIPE_UPDATE");
    return newRecipe;
  }

  addVaultContact(contactData) {
    const newContact = {
      id: "con-" + Date.now(),
      name: contactData.name.trim(),
      category: contactData.category || "General",
      phone: contactData.phone || "",
      address: contactData.address || "",
      notes: contactData.notes || ""
    };

    if (!this.data.vaultContacts) this.data.vaultContacts = [];
    this.data.vaultContacts.push(newContact);
    this.saveData();
    this.notifyListeners("VAULT_UPDATE");
    return newContact;
  }

  // --- SYNC APPLY INCOMING HELPERS ---
  applyIncomingMessage(msg) {
    if (!this.data.messages) this.data.messages = [];
    if (!this.data.messages.some(m => m.id === msg.id)) {
      this.data.messages.push(msg);
      this.saveData();
      this.notifyListeners("NEW_MESSAGE");
    }
  }

  applyIncomingPost(post) {
    if (!this.data.posts) this.data.posts = [];
    if (!this.data.posts.some(p => p.id === post.id)) {
      this.data.posts.unshift(post);
      this.saveData();
      this.notifyListeners("NEW_POST");
    }
  }

  applyPostReaction({ postId, emoji, memberId, hasReacted }) {
    const post = this.data.posts?.find(p => p.id === postId);
    if (!post) return;
    if (!post.reactions) post.reactions = {};
    if (!post.reactions[emoji]) post.reactions[emoji] = [];

    const idx = post.reactions[emoji].indexOf(memberId);
    if (hasReacted && idx < 0) {
      post.reactions[emoji].push(memberId);
    } else if (!hasReacted && idx >= 0) {
      post.reactions[emoji].splice(idx, 1);
      if (post.reactions[emoji].length === 0) delete post.reactions[emoji];
    }
    this.saveData();
    this.notifyListeners("POST_REACTION");
  }

  applyPostComment({ postId, comment }) {
    const post = this.data.posts?.find(p => p.id === postId);
    if (!post) return;
    if (!post.comments) post.comments = [];
    if (!post.comments.some(c => c.id === comment.id)) {
      post.comments.push(comment);
      this.saveData();
      this.notifyListeners("POST_COMMENT");
    }
  }

  applyChoreToggle({ choreId, completed }) {
    const chore = this.data.chores?.find(c => c.id === choreId);
    if (chore) {
      chore.completed = completed;
      this.saveData();
      this.notifyListeners("CHORE_UPDATE");
    }
  }

  applyShoppingToggle({ itemId, completed }) {
    const item = this.data.shoppingList?.find(i => i.id === itemId);
    if (item) {
      item.completed = completed;
      this.saveData();
      this.notifyListeners("SHOPPING_UPDATE");
    }
  }

  applyCalendarEvent(event) {
    if (!this.data.events) this.data.events = [];
    if (!this.data.events.some(e => e.id === event.id)) {
      this.data.events.push(event);
      this.saveData();
      this.notifyListeners("CALENDAR_EVENT");
    }
  }

  applyEventRsvp({ eventId, memberId, status }) {
    const event = this.data.events?.find(e => e.id === eventId);
    if (event) {
      if (!event.rsvps) event.rsvps = {};
      event.rsvps[memberId] = status;
      this.saveData();
      this.notifyListeners("EVENT_RSVP");
    }
  }

  applyMemberUpdate({ member, memberId, action }) {
    if (action === "ADD" && member) {
      if (!this.data.members.some(m => m.id === member.id)) {
        this.data.members.push(member);
      }
    } else if (action === "UPDATE" && member) {
      const idx = this.data.members.findIndex(m => m.id === member.id);
      if (idx >= 0) this.data.members[idx] = member;
    } else if (action === "DELETE" && memberId) {
      this.data.members = this.data.members.filter(m => m.id !== memberId);
    }
    this.saveData();
    this.notifyListeners("MEMBER_UPDATE");
  }

  // Reset to original mock data
  resetToDemo() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveData();
    this.sync.broadcast("DATA_RESET", {});
    this.notifyListeners("RESET");
  }
}

export const store = new FamilyStore();
