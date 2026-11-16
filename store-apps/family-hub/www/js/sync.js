// sync.js - Real-time cross-tab and cross-window synchronization via BroadcastChannel
export class FamilySync {
  constructor(store) {
    this.store = store;
    this.channelName = "family_app_sync_v1";
    this.channel = null;
    this.init();
  }

  init() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn("BroadcastChannel not supported or disabled:", err);
      }
    }

    // Fallback: listen to window 'storage' events for changes
    window.addEventListener("storage", (e) => {
      if (e.key && e.key.startsWith("family_app_")) {
        this.store.reloadFromStorage();
      }
    });
  }

  // Broadcast a message/event to other tabs
  broadcast(action, payload) {
    if (this.channel) {
      this.channel.postMessage({
        action,
        payload,
        timestamp: Date.now()
      });
    }
  }

  handleIncomingMessage(data) {
    if (!data || !data.action) return;
    
    console.log("[Sync] Received event:", data.action, data.payload);
    switch (data.action) {
      case "NEW_MESSAGE":
        this.store.applyIncomingMessage(data.payload);
        break;
      case "NEW_POST":
        this.store.applyIncomingPost(data.payload);
        break;
      case "POST_REACTION":
        this.store.applyPostReaction(data.payload);
        break;
      case "POST_COMMENT":
        this.store.applyPostComment(data.payload);
        break;
      case "CHORE_TOGGLE":
        this.store.applyChoreToggle(data.payload);
        break;
      case "SHOPPING_TOGGLE":
        this.store.applyShoppingToggle(data.payload);
        break;
      case "CALENDAR_EVENT":
        this.store.applyCalendarEvent(data.payload);
        break;
      case "EVENT_RSVP":
        this.store.applyEventRsvp(data.payload);
        break;
      case "MEMBER_UPDATE":
        this.store.applyMemberUpdate(data.payload);
        break;
      case "DATA_RESET":
        this.store.reloadFromStorage();
        break;
      default:
        this.store.notifyListeners();
    }
  }
}
