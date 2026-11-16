// app.js - Main Application Orchestrator
import { NavbarComponent } from "./components/navbar.js";
import { FeedComponent } from "./components/feed.js";
import { ChatComponent } from "./components/chat.js";
import { FamilyTreeComponent } from "./components/familyTree.js";
import { CalendarComponent } from "./components/calendar.js";
import { ChoresComponent } from "./components/chores.js";
import { RecipesComponent } from "./components/recipes.js";
import { VaultComponent } from "./components/vault.js";

class FamilyApp {
  constructor() {
    this.currentView = "feed";
    this.components = {};
    this.init();
  }

  init() {
    // Containers for each view
    const mainArea = document.getElementById("main-view-container");
    if (!mainArea) return;

    // Create view sub-containers
    const views = ["feed", "chat", "tree", "calendar", "chores", "recipes", "vault"];
    views.forEach(v => {
      const container = document.createElement("div");
      container.id = `view-${v}`;
      container.style.display = v === "feed" ? "block" : "none";
      mainArea.appendChild(container);
    });

    // Initialize Navbar
    this.navbar = new NavbarComponent((view) => this.switchView(view));

    // Initialize View Components
    this.components.feed = new FeedComponent(document.getElementById("view-feed"));
    this.components.chat = new ChatComponent(document.getElementById("view-chat"));
    this.components.tree = new FamilyTreeComponent(
      document.getElementById("view-tree"),
      (targetMemberId) => {
        // Callback when user clicks "Chat with member" in Family Tree
        this.navbar.navigateTo("chat");
        this.components.chat.activeRecipientId = targetMemberId;
        this.components.chat.activeChannelId = null;
        this.components.chat.updateActiveItemStyles();
        this.components.chat.renderHeader();
        this.components.chat.renderMessages();
      }
    );
    this.components.calendar = new CalendarComponent(document.getElementById("view-calendar"));
    this.components.chores = new ChoresComponent(document.getElementById("view-chores"));
    this.components.recipes = new RecipesComponent(document.getElementById("view-recipes"));
    this.components.vault = new VaultComponent(document.getElementById("view-vault"));

    console.log("Family App initialized successfully! 🏡");
  }

  switchView(view) {
    this.currentView = view;
    const views = ["feed", "chat", "tree", "calendar", "chores", "recipes", "vault"];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = v === view ? "block" : "none";
    });

    // If switching to chat, scroll messages down
    if (view === "chat") {
      const chatArea = document.getElementById("chat-messages-area");
      if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FamilyApp();
});
