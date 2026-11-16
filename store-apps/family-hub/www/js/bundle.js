// bundle.js - Complete Self-Contained Family Hub Application (Screen-Size Smart Edition)
// Runs directly with zero server: just double-click index.html!

(function () {
  "use strict";

  // ==========================================
  // 1. INITIAL DEMO DATA
  // ==========================================
  const INITIAL_DATA = {
    familyInfo: {
      familyName: "The Henderson Family",
      motto: "Stronger together, full of love and laughter ❤️",
      homeAddress: "742 Evergreen Terrace, Springfield",
      wifiName: "Henderson_Home_5G",
      wifiPassword: "familyfirst2026",
    },

    members: [
      {
        id: "mem-1",
        name: "Arthur Henderson",
        role: "Grandfather",
        generation: 1,
        gender: "male",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        birthDate: "1952-04-12",
        phone: "+1 (555) 234-5678",
        email: "arthur.h@example.com",
        bio: "Woodworking enthusiast, keeper of family history, and master storyteller.",
        favoriteThings: "Fishing, jazz records, classic woodworking, cherry pie",
        spouseId: "mem-2",
        parentIds: [],
        isOnline: true
      },
      {
        id: "mem-2",
        name: "Martha Henderson",
        role: "Grandmother",
        generation: 1,
        gender: "female",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        birthDate: "1955-08-23",
        phone: "+1 (555) 234-5679",
        email: "martha.h@example.com",
        bio: "World's best baker, rose garden champion, and gentle matriarch.",
        favoriteThings: "Baking apple pies, knitting sweaters, gardening, tea parties",
        spouseId: "mem-1",
        parentIds: [],
        isOnline: false
      },
      {
        id: "mem-3",
        name: "David Henderson",
        role: "Father",
        generation: 2,
        gender: "male",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        birthDate: "1980-11-15",
        phone: "+1 (555) 345-6789",
        email: "david.h@example.com",
        bio: "Software engineer by day, backyard BBQ grill-master by weekend.",
        favoriteThings: "Barbecue ribs, cycling, sci-fi movies, board games",
        spouseId: "mem-4",
        parentIds: ["mem-1", "mem-2"],
        isOnline: true
      },
      {
        id: "mem-4",
        name: "Sarah Henderson",
        role: "Mother",
        generation: 2,
        gender: "female",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        birthDate: "1983-03-29",
        phone: "+1 (555) 345-6790",
        email: "sarah.h@example.com",
        bio: "Pediatric nurse, plant mom, and organizing wizard of our home.",
        favoriteThings: "Coffee, hiking trails, indoor plants, mystery novels",
        spouseId: "mem-3",
        parentIds: [],
        isOnline: true
      },
      {
        id: "mem-5",
        name: "Marcus Henderson",
        role: "Uncle",
        generation: 2,
        gender: "male",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        birthDate: "1985-07-04",
        phone: "+1 (555) 456-7890",
        email: "marcus.h@example.com",
        bio: "The fun uncle! Graphic designer, world traveler, and photography nerd.",
        favoriteThings: "Travel photography, spicy tacos, drone flying, indie rock",
        spouseId: null,
        parentIds: ["mem-1", "mem-2"],
        isOnline: false
      },
      {
        id: "mem-6",
        name: "Maya Henderson",
        role: "Daughter (Age 15)",
        generation: 3,
        gender: "female",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        birthDate: "2011-06-18",
        phone: "+1 (555) 567-8901",
        email: "maya.h@example.com",
        bio: "High school sophomore, robotics club captain, and art doodler.",
        favoriteThings: "Coding robots, digital drawing, boba tea, Taylor Swift",
        spouseId: null,
        parentIds: ["mem-3", "mem-4"],
        isOnline: true
      },
      {
        id: "mem-7",
        name: "Leo Henderson",
        role: "Son (Age 10)",
        generation: 3,
        gender: "male",
        avatar: "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=150&auto=format&fit=crop&q=80",
        birthDate: "2016-09-02",
        phone: "+1 (555) 567-8902",
        email: "leo.h@example.com",
        bio: "5th grader, dinosaur expert, and soccer superstar!",
        favoriteThings: "Soccer, building Lego spaceships, chocolate chip cookies",
        spouseId: null,
        parentIds: ["mem-3", "mem-4"],
        isOnline: true
      }
    ],

    posts: [
      {
        id: "post-1",
        authorId: "mem-4",
        content: "🎉 Maya just won 1st place in the State Robotics Competition today! So incredibly proud of all the long hours and hard work she put into her team! Way to go Maya! 🤖✨",
        images: [
          "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80"
        ],
        tag: "Milestone",
        isPinned: true,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        reactions: {
          "❤️": ["mem-1", "mem-2", "mem-3", "mem-5", "mem-7"],
          "🎉": ["mem-3", "mem-5"],
          "👏": ["mem-1", "mem-2"]
        },
        comments: [
          {
            id: "c-1",
            authorId: "mem-1",
            text: "That's my granddaughter! Congratulations Maya, grandpa is making a wooden trophy stand for you!",
            timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
          },
          {
            id: "c-2",
            authorId: "mem-6",
            text: "Thank you so much Grandpa & Mom! Couldn't have done it without Dad helping me solder the wires last night haha ❤️",
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ]
      },
      {
        id: "post-2",
        authorId: "mem-3",
        content: "Backyard barbecue is officially fired up! Smoked brisket and sweet corn ready by 6:30 PM. Who's coming over? Don't forget to bring your appetite! 🥩🌽🔥",
        images: [
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80"
        ],
        tag: "Dinner",
        isPinned: false,
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        reactions: {
          "❤️": ["mem-4", "mem-7"],
          "😋": ["mem-5", "mem-7", "mem-1"]
        },
        comments: [
          {
            id: "c-3",
            authorId: "mem-5",
            text: "I'm already on my way! Bringing some craft soda and chips!",
            timestamp: new Date(Date.now() - 3600000 * 7).toISOString()
          },
          {
            id: "c-4",
            authorId: "mem-7",
            text: "Can we roast marshmallows after dinner please dad?! 🍫",
            timestamp: new Date(Date.now() - 3600000 * 6).toISOString()
          }
        ]
      },
      {
        id: "post-3",
        authorId: "mem-2",
        content: "Found this throwback photo of our Lake Tahoe camping trip from 10 years ago! Look how small David and Marcus were! Such precious memories. ❤️🏕️",
        images: [
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"
        ],
        tag: "Memories",
        isPinned: false,
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        reactions: {
          "❤️": ["mem-3", "mem-4", "mem-5"],
          "😂": ["mem-3", "mem-5"]
        },
        comments: [
          {
            id: "c-5",
            authorId: "mem-3",
            text: "Haha mom! My hair was so wild back then!",
            timestamp: new Date(Date.now() - 3600000 * 20).toISOString()
          }
        ]
      }
    ],

    chatChannels: [
      {
        id: "chan-all",
        name: "Family Living Room",
        description: "Main group chat for everyone in the family 🏡",
        icon: "🏡",
        type: "channel",
        members: ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5", "mem-6", "mem-7"]
      },
      {
        id: "chan-parents",
        name: "Parents & Grandparents",
        description: "Coordination, budgets, and adult talks ☕",
        icon: "☕",
        type: "channel",
        members: ["mem-1", "mem-2", "mem-3", "mem-4"]
      },
      {
        id: "chan-kids",
        name: "Kids Corner",
        description: "Maya, Leo & Uncle Marcus games and fun 🎮",
        icon: "🎮",
        type: "channel",
        members: ["mem-5", "mem-6", "mem-7"]
      },
      {
        id: "chan-trip",
        name: "Summer Vacation 2026",
        description: "Planning our trip to Yellowstone National Park 🌲",
        icon: "✈️",
        type: "channel",
        members: ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5", "mem-6", "mem-7"]
      }
    ],

    messages: [
      {
        id: "msg-1",
        channelId: "chan-all",
        senderId: "mem-4",
        text: "Good morning everyone! Don't forget Leo's soccer game is at 10 AM Saturday! ⚽",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        reactions: { "👍": ["mem-3", "mem-1"] }
      },
      {
        id: "msg-2",
        channelId: "chan-all",
        senderId: "mem-1",
        text: "Grandma and I will be in the front row with warm cider! 🧣",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        reactions: { "❤️": ["mem-4", "mem-7"] }
      },
      {
        id: "msg-3",
        channelId: "chan-all",
        senderId: "mem-7",
        text: "I'm going to score a hat-trick for you Grandpa!! 🥅⚡",
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        reactions: { "🔥": ["mem-3", "mem-5", "mem-6"] }
      },
      {
        id: "msg-4",
        channelId: "chan-trip",
        senderId: "mem-5",
        text: "Hey guys, I found an awesome cabin near the lake that sleeps 10 people! Sending the link now.",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        reactions: { "🎉": ["mem-3", "mem-4"] }
      }
    ],

    events: [
      {
        id: "evt-1",
        title: "Family Sunday Dinner & BBQ",
        date: new Date(Date.now() + 86400000 * 1).toISOString().split("T")[0],
        time: "18:00",
        location: "David & Sarah's Backyard",
        description: "Weekly family get-together with smoked brisket, grilled veggies, and desserts.",
        category: "Dinner",
        color: "#f97316",
        rsvps: {
          "mem-1": "going",
          "mem-2": "going",
          "mem-3": "going",
          "mem-4": "going",
          "mem-5": "going",
          "mem-6": "going",
          "mem-7": "going"
        }
      },
      {
        id: "evt-2",
        title: "Leo's Soccer Championship Match",
        date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        time: "10:00",
        location: "Westside Community Sports Park, Field 4",
        description: "Semi-finals match against the Red Tigers. Wear blue shirts to support Leo!",
        category: "Sports",
        color: "#3b82f6",
        rsvps: {
          "mem-1": "going",
          "mem-2": "going",
          "mem-3": "going",
          "mem-4": "going",
          "mem-6": "going",
          "mem-7": "going"
        }
      },
      {
        id: "evt-3",
        title: "Grandpa Arthur's 74th Birthday",
        date: "2026-04-12",
        time: "17:00",
        location: "Henderson Homestead",
        description: "Celebration with homemade carrot cake and family photo album review.",
        category: "Birthday",
        color: "#ec4899",
        rsvps: {
          "mem-1": "going",
          "mem-2": "going",
          "mem-3": "going",
          "mem-4": "going"
        }
      }
    ],

    chores: [
      {
        id: "chore-1",
        title: "Water the indoor plants & garden roses",
        assignedTo: "mem-6",
        dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        completed: false,
        points: 15,
        frequency: "Weekly"
      },
      {
        id: "chore-2",
        title: "Take out recycling and trash bins",
        assignedTo: "mem-7",
        dueDate: new Date(Date.now()).toISOString().split("T")[0],
        completed: true,
        points: 10,
        frequency: "Weekly"
      },
      {
        id: "chore-3",
        title: "Clean garage and organize tools",
        assignedTo: "mem-3",
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        completed: false,
        points: 30,
        frequency: "Once"
      },
      {
        id: "chore-4",
        title: "Fold and put away clean laundry",
        assignedTo: "mem-4",
        dueDate: new Date(Date.now()).toISOString().split("T")[0],
        completed: false,
        points: 20,
        frequency: "Daily"
      }
    ],

    shoppingList: [
      { id: "shop-1", item: "Organic Whole Milk (2 Gallons)", category: "Dairy", completed: false, addedBy: "mem-4" },
      { id: "shop-2", item: "Honeycrisp Apples (1 bag)", category: "Produce", completed: true, addedBy: "mem-2" },
      { id: "shop-3", item: "Bacon & Barbecue Sauce", category: "Meat", completed: false, addedBy: "mem-3" },
      { id: "shop-4", item: "Cheddar Cheese Goldfish", category: "Snacks", completed: true, addedBy: "mem-7" },
      { id: "shop-5", item: "Fresh Rosemary & Garlic", category: "Produce", completed: false, addedBy: "mem-4" }
    ],

    recipes: [
      {
        id: "rec-1",
        title: "Grandma Martha's Famous Apple Pie",
        author: "Martha Henderson",
        authorId: "mem-2",
        prepTime: "25 mins",
        cookTime: "50 mins",
        difficulty: "Medium",
        rating: 5,
        image: "https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=800&auto=format&fit=crop&q=80",
        description: "The multi-generational secret recipe passed down from Great-Grandma Clara. Crispy flaky crust with cinnamon-caramelized Granny Smith apples.",
        ingredients: [
          "2 1/2 cups All-Purpose Flour",
          "1 cup Unsalted Butter (chilled & diced)",
          "6 large Granny Smith Apples (peeled and sliced)",
          "3/4 cup Granulated Sugar",
          "2 tbsp Ground Cinnamon",
          "1 tbsp Fresh Lemon Juice",
          "1 Egg for egg wash"
        ],
        steps: [
          "Prepare the pie crust by cutting cold butter into flour until pea-sized crumbs form. Add ice water, shape into two discs, and chill for 1 hour.",
          "Toss sliced apples with sugar, cinnamon, flour, and lemon juice in a large bowl.",
          "Roll out bottom crust and fit into 9-inch pie dish. Fill with spiced apples.",
          "Roll out top crust, create lattice design or vent slits. Crimp the edges tightly.",
          "Brush with egg wash and sprinkle coarse sugar on top.",
          "Bake at 375°F (190°C) for 50 minutes until crust is golden brown and juices are bubbling. Cool before serving with vanilla ice cream!"
        ]
      },
      {
        id: "rec-2",
        title: "Dad's Secret Hickory Smoked Ribs",
        author: "David Henderson",
        authorId: "mem-3",
        prepTime: "20 mins",
        cookTime: "4 hours",
        difficulty: "Easy",
        rating: 5,
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
        description: "Fall-off-the-bone tender pork ribs with brown sugar dry rub and homemade tangy glaze.",
        ingredients: [
          "2 racks St. Louis style pork ribs",
          "1/4 cup Brown Sugar",
          "2 tbsp Smoked Paprika",
          "1 tbsp Garlic powder & Onion powder",
          "1 tbsp Black pepper & Kosher salt",
          "1 cup Sweet & Smoky BBQ sauce",
          "2 tbsp Apple Cider Vinegar"
        ],
        steps: [
          "Remove membrane from back of ribs using a paper towel.",
          "Mix all dry spices together and massage generously over both sides of ribs.",
          "Set smoker to 225°F with hickory wood chunks.",
          "Smoke ribs for 3 hours uncovered, then wrap tightly in aluminum foil with apple cider vinegar for 1 hour.",
          "Unwrap, brush with BBQ sauce, and smoke for 20 final minutes until sauce caramelizes."
        ]
      }
    ],

    vaultContacts: [
      {
        id: "con-1",
        name: "Dr. Evelyn Reed (Pediatrician)",
        category: "Medical",
        phone: "+1 (555) 911-2040",
        address: "Springfield Children's Clinic, Suite 300",
        notes: "Kids medical records on file. Maya allergic to Penicillin."
      },
      {
        id: "con-2",
        name: "All-Hours Plumber (Mike Ross)",
        category: "Home Maintenance",
        phone: "+1 (555) 321-7788",
        address: "Local emergency plumbing",
        notes: "Main water shutoff valve is located in the basement south wall."
      },
      {
        id: "con-3",
        name: "Oakridge Veterinary Hospital",
        category: "Pets",
        phone: "+1 (555) 888-3456",
        address: "120 Oakridge Way",
        notes: "Barnaby's vet. Vaccines up to date until October 2026."
      },
      {
        id: "con-4",
        name: "Mrs. Higgins (Trusted Neighbor)",
        category: "Neighbor",
        phone: "+1 (555) 444-1234",
        address: "744 Evergreen Terrace (Next door)",
        notes: "Has spare house key and feeds Barnaby when we travel."
      }
    ]
  };

  // ==========================================
  // 2. REAL-TIME SYNC
  // ==========================================
  class FamilySync {
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
          console.warn("BroadcastChannel error:", err);
        }
      }

      window.addEventListener("storage", (e) => {
        if (e.key && e.key.startsWith("family_app_")) {
          this.store.reloadFromStorage();
        }
      });
    }

    broadcast(action, payload) {
      if (this.channel) {
        try {
          this.channel.postMessage({ action, payload, timestamp: Date.now() });
        } catch (e) {}
      }
    }

    handleIncomingMessage(data) {
      if (!data || !data.action) return;
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

  // ==========================================
  // 3. PERSISTENT STATE STORE
  // ==========================================
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
        console.warn("Storage read error:", e);
      }
      const initial = JSON.parse(JSON.stringify(INITIAL_DATA));
      this.saveData(initial);
      return initial;
    }

    saveData(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data || this.data));
      } catch (e) {
        console.warn("Storage write error:", e);
      }
    }

    loadActiveMember() {
      try {
        const stored = localStorage.getItem(ACTIVE_MEMBER_KEY);
        if (stored && this.data.members.some(m => m.id === stored)) {
          return stored;
        }
      } catch (e) {}
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
        if (post.reactions[emoji].length === 0) delete post.reactions[emoji];
      } else {
        post.reactions[emoji].push(memberId);
      }

      this.saveData();
      this.sync.broadcast("POST_REACTION", { postId, emoji, memberId, hasReacted: index < 0 });
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

      if (newMember.spouseId) {
        const spouse = this.getMember(newMember.spouseId);
        if (spouse && !spouse.spouseId) spouse.spouseId = newMember.id;
      }

      this.saveData();
      this.sync.broadcast("MEMBER_UPDATE", { member: newMember, action: "ADD" });
      this.notifyListeners("MEMBER_UPDATE");
      return newMember;
    }

    deleteMember(memberId) {
      if (this.data.members.length <= 1) return false;

      this.data.members = this.data.members.filter(m => m.id !== memberId);
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
      event.rsvps[this.activeMemberId] = status;

      this.saveData();
      this.sync.broadcast("EVENT_RSVP", { eventId, memberId: this.activeMemberId, status });
      this.notifyListeners("EVENT_RSVP");
    }

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

    resetToDemo() {
      this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
      this.saveData();
      this.sync.broadcast("DATA_RESET", {});
      this.notifyListeners("RESET");
    }
  }

  const store = new FamilyStore();

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // 4. NAVBAR COMPONENT
  // ==========================================
  class NavbarComponent {
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

      store.subscribe(() => {
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
          <button class="nav-item ${this.currentView === 'feed' ? 'active' : ''}" data-view="feed" title="Family Wall">
            <span class="nav-icon">📰</span>
            <span>Family Wall</span>
          </button>
          <button class="nav-item ${this.currentView === 'chat' ? 'active' : ''}" data-view="chat" title="Family Chat">
            <span class="nav-icon">💬</span>
            <span>Family Chat</span>
          </button>
          <button class="nav-item ${this.currentView === 'tree' ? 'active' : ''}" data-view="tree" title="Family Tree">
            <span class="nav-icon">🌳</span>
            <span>Family Tree</span>
          </button>
          <button class="nav-item ${this.currentView === 'calendar' ? 'active' : ''}" data-view="calendar" title="Calendar & Events">
            <span class="nav-icon">📅</span>
            <span>Calendar & Events</span>
          </button>
          <button class="nav-item ${this.currentView === 'chores' ? 'active' : ''}" data-view="chores" title="Chores & Lists">
            <span class="nav-icon">✅</span>
            <span>Chores & Lists</span>
          </button>
          <button class="nav-item ${this.currentView === 'recipes' ? 'active' : ''}" data-view="recipes" title="Family Recipes">
            <span class="nav-icon">🍲</span>
            <span>Family Recipes</span>
          </button>
          <button class="nav-item ${this.currentView === 'vault' ? 'active' : ''}" data-view="vault" title="Emergency Vault">
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
            <span style="font-size: 0.85rem; color: var(--text-muted); margin-left: auto;">🔄</span>
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

          <button class="btn-primary" id="header-switch-member-btn" title="Switch profile" style="font-size: 0.88rem; padding: 0.45rem 1rem; gap: 0.45rem;">
            <img src="${activeMember.avatar}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 1.5px solid white; flex-shrink:0;" />
            <span id="header-active-name">${activeMember.name.split(" ")[0]}</span>
            <span style="font-size: 0.72rem; opacity: 0.85;">▼</span>
          </button>
        </div>
      `;
    }

    renderBottomNav() {
      const bottomNav = document.getElementById("bottom-nav");
      if (!bottomNav) return;

      bottomNav.innerHTML = `
        <button class="nav-item ${this.currentView === 'feed' ? 'active' : ''}" data-view="feed">
          <span class="nav-icon">📰</span>
          <span>Wall</span>
        </button>
        <button class="nav-item ${this.currentView === 'chat' ? 'active' : ''}" data-view="chat">
          <span class="nav-icon">💬</span>
          <span>Chat</span>
        </button>
        <button class="nav-item ${this.currentView === 'tree' ? 'active' : ''}" data-view="tree">
          <span class="nav-icon">🌳</span>
          <span>Tree</span>
        </button>
        <button class="nav-item ${this.currentView === 'calendar' ? 'active' : ''}" data-view="calendar">
          <span class="nav-icon">📅</span>
          <span>Events</span>
        </button>
        <button class="nav-item ${this.currentView === 'chores' ? 'active' : ''}" data-view="chores">
          <span class="nav-icon">✅</span>
          <span>Chores</span>
        </button>
        <button class="nav-item ${this.currentView === 'recipes' ? 'active' : ''}" data-view="recipes">
          <span class="nav-icon">🍲</span>
          <span>Recipes</span>
        </button>
      `;
    }

    bindEvents() {
      document.addEventListener("click", (e) => {
        const navBtn = e.target.closest("[data-view]");
        if (navBtn) {
          const view = navBtn.getAttribute("data-view");
          this.navigateTo(view);
        }

        if (e.target.closest("#profile-switcher-btn") || e.target.closest("#header-switch-member-btn")) {
          this.openProfileSwitcherModal();
        }

        if (e.target.closest("#theme-toggle-btn")) {
          this.toggleTheme();
        }
      });
    }

    navigateTo(view) {
      this.currentView = view;
      document.querySelectorAll("[data-view]").forEach(btn => {
        if (btn.getAttribute("data-view") === view) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

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

      if (this.onNavigate) this.onNavigate(view);
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
            <h2 style="font-size: 1.35rem; font-weight: 800;">Switch Family Profile</h2>
            <button id="close-profile-modal-btn" class="btn-icon">✕</button>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.92rem; margin-bottom: 1.5rem; line-height: 1.5;">
            Select who is currently using the Family App. Posts, messages, reactions, and chores will be attributed to this person.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
            ${members.map(m => `
              <div class="member-select-card" data-member-id="${m.id}" 
                   style="border: 2px solid ${m.id === activeId ? 'var(--primary)' : 'var(--border)'}; 
                          background: ${m.id === activeId ? 'var(--primary-light)' : 'var(--bg-card)'}; 
                          padding: 1.1rem 0.75rem; border-radius: var(--radius-lg); text-align: center; cursor: pointer; transition: var(--transition);
                          box-shadow: ${m.id === activeId ? 'var(--primary-glow)' : 'var(--shadow-xs)'};">
                <div style="position: relative; width: 60px; height: 60px; margin: 0 auto 0.65rem;">
                  <img src="${m.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2.5px solid white; box-shadow: var(--shadow-sm);" />
                  ${m.isOnline ? '<span class="online-dot" style="bottom: 2px; right: 2px;"></span>' : ''}
                </div>
                <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary); margin-bottom: 2px;">${m.name}</div>
                <div style="font-size: 0.74rem; color: var(--text-muted); font-weight: 500;">${m.role}</div>
                ${m.id === activeId ? '<span style="display:inline-block; font-size: 0.72rem; font-weight: 800; color: var(--primary); margin-top: 6px; background: white; padding: 2px 8px; border-radius: var(--radius-full);">Active</span>' : ''}
              </div>
            `).join("")}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 1.25rem;">
            <button class="btn-secondary" id="reset-demo-btn" style="font-size: 0.82rem; color: var(--primary); border-color: rgba(255, 87, 34, 0.3);">
              🔄 Reset Demo Data
            </button>
            <button class="btn-primary" id="done-profile-btn">Done</button>
          </div>
        </div>
      `;

      modal.style.display = "flex";

      modal.querySelectorAll("[data-member-id]").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.getAttribute("data-member-id");
          store.setActiveMember(id);
          modal.style.display = "none";
        });
      });

      modal.querySelector("#close-profile-modal-btn")?.addEventListener("click", () => {
        modal.style.display = "none";
      });
      modal.querySelector("#done-profile-btn")?.addEventListener("click", () => {
        modal.style.display = "none";
      });

      modal.querySelector("#reset-demo-btn")?.addEventListener("click", () => {
        if (confirm("Reset all family data back to initial demo state?")) {
          store.resetToDemo();
          modal.style.display = "none";
        }
      });

      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });
    }
  }

  // ==========================================
  // 5. FEED COMPONENT
  // ==========================================
  class FeedComponent {
    constructor(container) {
      this.container = container;
      this.currentFilter = "all";
      this.selectedImage = null;
      this.init();
    }

    init() {
      this.render();
      store.subscribe((data, changeType) => {
        if (["NEW_POST", "POST_REACTION", "POST_COMMENT", "POST_DELETE", "RESET", "STORAGE_RELOAD", "MEMBER_UPDATE"].includes(changeType) || changeType === "GENERAL") {
          this.renderPostsList();
          this.updateWidgets();
        }
      });
    }

    render() {
      const activeMember = store.getActiveMember();
      const members = store.data.members;

      this.container.innerHTML = `
        <div class="family-stories-bar">
          ${members.map(m => `
            <div class="story-item" data-member-story="${m.id}">
              <div class="story-ring">
                <img src="${m.avatar}" class="story-avatar" alt="${m.name}" />
              </div>
              <span class="story-name">${m.name.split(" ")[0]}</span>
            </div>
          `).join("")}
        </div>

        <div class="feed-layout">
          <div class="feed-main">
            <div class="create-post-card">
              <div class="post-input-row">
                <div class="avatar-wrapper">
                  <img src="${activeMember.avatar}" class="avatar-img" />
                </div>
                <textarea id="new-post-content" class="post-textarea" placeholder="Share an update, photo, achievement, or heartwarming moment with the family..."></textarea>
              </div>

              <div id="post-image-preview-container" style="display:none; margin-top: 1rem; position: relative;">
                <img id="post-image-preview" src="" style="max-height: 220px; border-radius: var(--radius-lg); object-fit: cover; box-shadow: var(--shadow-sm);" />
                <button id="remove-post-image-btn" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.65); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-weight: bold;">✕</button>
              </div>

              <div class="post-actions-row">
                <div class="post-tools">
                  <button class="btn-secondary" id="add-photo-btn" style="padding: 0.45rem 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
                    <span>📷</span>
                    <span>Add Photo</span>
                  </button>
                  <input type="file" id="post-file-input" accept="image/*" style="display: none;" />

                  <select id="post-tag-select" class="tag-select">
                    <option value="General">🏷️ General</option>
                    <option value="Milestone">🏆 Milestone</option>
                    <option value="Memories">❤️ Memories</option>
                    <option value="Vacation">✈️ Vacation</option>
                    <option value="Dinner">🍲 Dinner</option>
                    <option value="Announcement">📢 Announcement</option>
                  </select>

                  <label style="font-size: 0.82rem; font-weight: 600; display: flex; align-items: center; gap: 6px; color: var(--text-secondary); cursor: pointer;">
                    <input type="checkbox" id="post-is-pinned" style="accent-color: var(--primary);" />
                    <span>📌 Pin to top</span>
                  </label>
                </div>

                <button class="btn-primary" id="submit-post-btn">
                  <span>Post to Family</span>
                  <span>✨</span>
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 0.6rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
              <button class="btn-secondary feed-filter-btn active" data-filter="all" style="padding: 0.45rem 1.1rem; font-size: 0.85rem; border-radius: var(--radius-full);">All Updates</button>
              <button class="btn-secondary feed-filter-btn" data-filter="Milestone" style="padding: 0.45rem 1.1rem; font-size: 0.85rem; border-radius: var(--radius-full);">🏆 Milestones</button>
              <button class="btn-secondary feed-filter-btn" data-filter="Memories" style="padding: 0.45rem 1.1rem; font-size: 0.85rem; border-radius: var(--radius-full);">❤️ Memories</button>
              <button class="btn-secondary feed-filter-btn" data-filter="photos" style="padding: 0.45rem 1.1rem; font-size: 0.85rem; border-radius: var(--radius-full);">📷 Photos</button>
              <button class="btn-secondary feed-filter-btn" data-filter="Announcement" style="padding: 0.45rem 1.1rem; font-size: 0.85rem; border-radius: var(--radius-full);">📢 Announcements</button>
            </div>

            <div id="posts-list-container"></div>
          </div>

          <div class="feed-sidebar">
            <div class="create-post-card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(255,87,34,0.06), rgba(255,255,255,0.8)); border-color: rgba(255,87,34,0.2);">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; margin-bottom: 0.75rem; color: var(--primary);">
                <span>✨</span>
                <span>Family Motto</span>
              </div>
              <p style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.5; font-style: italic;">
                "${store.data.familyInfo.motto}"
              </p>
            </div>

            <div class="create-post-card" style="margin-bottom: 1.5rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 800; margin-bottom: 1rem; color: var(--text-primary);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span>🎂</span>
                  <span>Upcoming Birthdays</span>
                </div>
              </div>
              <div id="birthdays-widget-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${this.renderBirthdaysWidget()}
              </div>
            </div>

            <div class="create-post-card">
              <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 800; margin-bottom: 1rem; color: var(--text-primary);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span>✅</span>
                  <span>Today's Chores</span>
                </div>
              </div>
              <div id="quick-chores-list" style="display: flex; flex-direction: column; gap: 0.6rem;">
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
      if (!members.length) return '<div style="font-size: 0.82rem; color: var(--text-muted);">No birthdays listed yet.</div>';

      return members.slice(0, 4).map(m => {
        const parts = m.birthDate.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dateStr = parts.length >= 3 ? `${monthNames[parseInt(parts[1]) - 1]} ${parts[2]}` : m.birthDate;

        return `
          <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); background: var(--bg-surface);">
            <img src="${m.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${m.role}</div>
            </div>
            <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary); background: var(--bg-card); padding: 3px 9px; border-radius: var(--radius-full); box-shadow: var(--shadow-xs);">${dateStr}</span>
          </div>
        `;
      }).join("");
    }

    renderQuickChoresWidget() {
      const chores = store.data.chores || [];
      if (!chores.length) return '<div style="font-size: 0.82rem; color: var(--text-muted);">No chores pending! 🎉</div>';

      return chores.slice(0, 3).map(c => {
        const assigned = store.getMember(c.assignedTo);
        return `
          <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.88rem; padding: 0.4rem 0;">
            <input type="checkbox" ${c.completed ? 'checked' : ''} class="quick-chore-check" data-chore-id="${c.id}" style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;" />
            <span style="flex: 1; font-weight: 500; ${c.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${c.title}</span>
            ${assigned ? `<img src="${assigned.avatar}" title="${assigned.name}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" />` : ''}
          </div>
        `;
      }).join("");
    }

    updateWidgets() {
      const bdays = this.container.querySelector("#birthdays-widget-list");
      if (bdays) bdays.innerHTML = this.renderBirthdaysWidget();
      const chores = this.container.querySelector("#quick-chores-list");
      if (chores) chores.innerHTML = this.renderQuickChoresWidget();
    }

    bindEvents() {
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

          textarea.value = "";
          this.selectedImage = null;
          if (previewContainer) previewContainer.style.display = "none";
          if (fileInput) fileInput.value = "";
          pinCheck.checked = false;
        });
      }

      this.container.querySelectorAll(".feed-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.container.querySelectorAll(".feed-filter-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentFilter = btn.getAttribute("data-filter");
          this.renderPostsList();
        });
      });

      this.container.addEventListener("change", (e) => {
        if (e.target.classList.contains("quick-chore-check")) {
          const choreId = e.target.getAttribute("data-chore-id");
          store.toggleChore(choreId);
        }
      });

      this.container.querySelectorAll(".story-item").forEach(item => {
        item.addEventListener("click", () => {
          const memId = item.getAttribute("data-member-story");
          const member = store.getMember(memId);
          if (member) {
            alert(`📸 ${member.name}'s Family Highlight:\n"${member.bio || 'Happy to be with family!'}"`);
          }
        });
      });
    }

    renderPostsList() {
      const listContainer = this.container.querySelector("#posts-list-container");
      if (!listContainer) return;

      let posts = [...store.data.posts];

      if (this.currentFilter === "photos") {
        posts = posts.filter(p => p.images && p.images.length > 0);
      } else if (this.currentFilter !== "all") {
        posts = posts.filter(p => p.tag === this.currentFilter);
      }

      posts.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      if (posts.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 3.5rem 2rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border);">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">📸</div>
            <div style="font-weight: 800; font-size: 1.2rem; margin-bottom: 0.35rem;">No family posts in this category yet!</div>
            <div style="color: var(--text-muted); font-size: 0.95rem;">Be the first one to share a heartwarming memory with everyone!</div>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = posts.map(post => this.renderSinglePost(post)).join("");
      this.bindPostInteractions(listContainer);
    }

    renderSinglePost(post) {
      const author = store.getMember(post.authorId) || { name: "Family Member", avatar: "", role: "Family" };
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

            <div style="display: flex; align-items: center; gap: 0.6rem;">
              ${post.isPinned ? '<span style="font-size: 0.75rem; font-weight: 800; background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: var(--radius-full); display: flex; align-items: center; gap: 3px;">📌 Pinned</span>' : ''}
              <span class="post-tag">${post.tag}</span>
              ${post.authorId === activeMember.id ? `
                <button class="delete-post-btn btn-icon" data-post-id="${post.id}" title="Delete Post" style="width: 32px; height: 32px; font-size: 0.8rem;">
                  ✕
                </button>
              ` : ''}
            </div>
          </div>

          <div class="post-content">${escapeHtml(post.content)}</div>

          ${post.images && post.images.length > 0 ? `
            <div class="post-images-grid">
              ${post.images.map(img => `<img src="${img}" class="post-image" alt="Post attachment" />`).join("")}
            </div>
          ` : ''}

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

          <div class="post-comments-section">
            <div class="comments-list" id="comments-list-${post.id}">
              ${(post.comments || []).map(comment => {
                const cAuthor = store.getMember(comment.authorId) || { name: "Family Member", avatar: "" };
                return `
                  <div class="comment-item">
                    <img src="${cAuthor.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
                    <div class="comment-bubble">
                      <div class="comment-author">${cAuthor.name}</div>
                      <div class="comment-text">${escapeHtml(comment.text)}</div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>

            <div class="comment-input-row">
              <img src="${activeMember.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
              <input type="text" class="comment-input" placeholder="Write a reply..." data-post-id="${post.id}" />
              <button class="btn-primary submit-comment-btn" data-post-id="${post.id}" style="padding: 0.5rem 1.1rem; font-size: 0.85rem;">Reply</button>
            </div>
          </div>
        </div>
      `;
    }

    bindPostInteractions(container) {
      container.querySelectorAll(".reaction-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          const postId = pill.getAttribute("data-post-id");
          const emoji = pill.getAttribute("data-emoji");
          store.togglePostReaction(postId, emoji);
        });
      });

      container.querySelectorAll(".delete-post-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const postId = btn.getAttribute("data-post-id");
          if (confirm("Delete this family post?")) {
            store.deletePost(postId);
          }
        });
      });

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
  }

  // ==========================================
  // 6. CHAT COMPONENT (Screen-Size Smart with Mobile Back Button)
  // ==========================================
  class ChatComponent {
    constructor(container) {
      this.container = container;
      this.activeChannelId = "chan-all";
      this.activeRecipientId = null;
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
        <div class="chat-container ${window.innerWidth < 768 ? '' : 'in-conversation'}" id="chat-wrapper">
          <div class="chat-sidebar">
            <div class="chat-sidebar-header">
              <span>💬 Family Chats</span>
            </div>

            <div class="chat-list">
              <div class="chat-section-label">Channels</div>
              <div id="channels-list">
                ${channels.map(c => `
                  <div class="chat-item ${this.activeChannelId === c.id ? 'active' : ''}" data-channel-id="${c.id}">
                    <span style="font-size: 1.25rem;">${c.icon || '💬'}</span>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 700; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</div>
                      <div style="font-size: 0.74rem; color: var(--text-muted);">${c.members?.length || members.length} members</div>
                    </div>
                  </div>
                `).join("")}
              </div>

              <div class="chat-section-label" style="margin-top: 1.25rem;">Direct Messages</div>
              <div id="dm-list">
                ${otherMembers.map(m => `
                  <div class="chat-item ${this.activeRecipientId === m.id ? 'active' : ''}" data-recipient-id="${m.id}">
                    <div class="avatar-wrapper" style="width: 36px; height: 36px;">
                      <img src="${m.avatar}" class="avatar-img" />
                      ${m.isOnline ? '<span class="online-dot" style="width: 10px; height: 10px;"></span>' : ''}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 700; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
                      <div style="font-size: 0.74rem; color: var(--text-muted);">${m.role}</div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="chat-main">
            <div class="chat-header" id="chat-header"></div>
            <div class="chat-messages-area" id="chat-messages-area"></div>

            <div id="chat-attachment-preview" style="display:none; padding: 0.75rem 1.5rem; background: var(--bg-surface); border-top: 1px solid var(--border); display: flex; align-items: center; gap: 0.85rem;">
              <img id="chat-preview-img" src="" style="width: 55px; height: 55px; object-fit: cover; border-radius: var(--radius-sm);" />
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Image ready to send</span>
              <button id="clear-chat-img-btn" style="border:none; background:transparent; cursor:pointer; font-weight:bold; margin-left:auto; font-size: 1rem;">✕</button>
            </div>

            <div class="chat-input-bar">
              <button class="btn-icon" id="chat-attach-btn" title="Attach photo">📷</button>
              <input type="file" id="chat-file-input" accept="image/*" style="display:none;" />
              <input type="text" class="chat-input" id="chat-input-field" placeholder="Type a message to the family..." />
              <button class="btn-primary" id="chat-send-btn" style="padding: 0.75rem 1.35rem;">
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
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
            <button class="chat-mobile-back-btn" id="chat-back-btn" title="Back to Chats">←</button>
            <div class="avatar-wrapper" style="width: 40px; height: 40px;">
              <img src="${recipient.avatar}" class="avatar-img" />
              ${recipient.isOnline ? '<span class="online-dot"></span>' : ''}
            </div>
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${recipient.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${recipient.role} • ${recipient.isOnline ? 'Online now' : 'Away'}</div>
            </div>
          </div>
        `;
      } else {
        const channel = store.data.chatChannels.find(c => c.id === this.activeChannelId);
        header.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
            <button class="chat-mobile-back-btn" id="chat-back-btn" title="Back to Chats">←</button>
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 1rem; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <span>${channel?.icon || '💬'}</span>
                <span>${channel ? channel.name : 'Family Channel'}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${channel ? channel.description : ''}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
            <span style="font-size: 0.78rem; color: var(--text-secondary); font-weight: 700; background: var(--bg-surface); padding: 4px 10px; border-radius: var(--radius-full);">
              👥 ${channel?.members?.length || store.data.members.length}
            </span>
          </div>
        `;
      }

      // Bind mobile back button
      header.querySelector("#chat-back-btn")?.addEventListener("click", () => {
        const wrapper = this.container.querySelector("#chat-wrapper");
        if (wrapper) wrapper.classList.remove("in-conversation");
      });
    }

    renderMessages() {
      const area = this.container.querySelector("#chat-messages-area");
      if (!area) return;

      const activeMember = store.getActiveMember();
      let messages = store.data.messages || [];

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
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">💬</div>
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary);">No messages here yet!</div>
            <div style="font-size: 0.9rem;">Send a friendly greeting to start chatting!</div>
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
              <img src="${sender.avatar}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; align-self: flex-end; flex-shrink: 0;" />
            ` : ''}

            <div class="msg-bubble">
              ${!isOutgoing ? `<div class="msg-sender-name">${sender.name}</div>` : ''}
              <div>${escapeHtml(msg.text)}</div>
              ${msg.image ? `<img src="${msg.image}" style="max-width: 100%; border-radius: var(--radius-md); margin-top: 8px; display: block;" />` : ''}
              <div class="msg-time">${time}</div>
            </div>
          </div>
        `;
      }).join("");

      area.scrollTop = area.scrollHeight;
    }

    bindEvents() {
      const wrapper = this.container.querySelector("#chat-wrapper");

      this.container.querySelectorAll("[data-channel-id]").forEach(item => {
        item.addEventListener("click", () => {
          this.activeChannelId = item.getAttribute("data-channel-id");
          this.activeRecipientId = null;
          if (wrapper) wrapper.classList.add("in-conversation");
          this.updateActiveItemStyles();
          this.renderHeader();
          this.renderMessages();
        });
      });

      this.container.querySelectorAll("[data-recipient-id]").forEach(item => {
        item.addEventListener("click", () => {
          this.activeRecipientId = item.getAttribute("data-recipient-id");
          this.activeChannelId = null;
          if (wrapper) wrapper.classList.add("in-conversation");
          this.updateActiveItemStyles();
          this.renderHeader();
          this.renderMessages();
        });
      });

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
  }

  // ==========================================
  // 7. FAMILY TREE COMPONENT (Zoom Controls & Touch Scroll)
  // ==========================================
  class FamilyTreeComponent {
    constructor(container, onNavigateToChat) {
      this.container = container;
      this.onNavigateToChat = onNavigateToChat;
      this.selectedMember = null;
      this.searchQuery = "";
      this.zoomScale = 1;
      this.init();
    }

    init() {
      this.render();
      store.subscribe((data, changeType) => {
        if (["MEMBER_UPDATE", "RESET", "STORAGE_RELOAD"].includes(changeType) || changeType === "GENERAL") {
          this.renderTree();
          if (this.selectedMember) {
            this.selectedMember = store.getMember(this.selectedMember.id) || null;
            if (this.selectedMember) this.renderDrawerContent();
          }
        }
      });
    }

    render() {
      this.container.innerHTML = `
        <div class="tree-container">
          <div class="tree-toolbar">
            <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
              <input type="text" id="tree-search-input" class="form-input" placeholder="🔍 Search family member..." style="width: 240px; padding: 0.5rem 0.95rem; font-size: 0.88rem;" />
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Total: <strong id="total-members-count" style="color: var(--primary);">${store.data.members.length}</strong></span>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="display: flex; gap: 4px; background: var(--bg-surface); padding: 3px; border-radius: var(--radius-full); border: 1px solid var(--border);">
                <button class="btn-icon" id="tree-zoom-out" title="Zoom Out" style="width: 32px; height: 32px; font-size: 0.85rem;">−</button>
                <button class="btn-icon" id="tree-zoom-reset" title="Reset Zoom" style="width: 32px; height: 32px; font-size: 0.75rem; font-weight: bold;">1x</button>
                <button class="btn-icon" id="tree-zoom-in" title="Zoom In" style="width: 32px; height: 32px; font-size: 0.85rem;">+</button>
              </div>
              <button class="btn-primary" id="open-add-member-btn" style="padding: 0.55rem 1.1rem;">
                <span>+ Add</span>
              </button>
            </div>
          </div>

          <div class="tree-viewport" id="tree-viewport">
            <div id="tree-content-scale" style="transform-origin: top center; transition: transform 0.2s ease; width: 100%;"></div>
          </div>

          <div class="drawer-overlay" id="member-drawer-overlay">
            <div class="drawer-content" id="member-drawer-content"></div>
          </div>

          <div class="modal-backdrop" id="add-member-modal" style="display:none;">
            <div class="modal-box">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.35rem; font-weight: 800;">Add Family Member</h2>
                <button class="btn-icon" id="close-add-modal-btn">✕</button>
              </div>

              <form id="add-member-form">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                  <div class="form-group">
                    <label class="form-label">Full Name *</label>
                    <input type="text" id="m-name" class="form-input" required placeholder="e.g. Grandma Rose" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Role in Family *</label>
                    <input type="text" id="m-role" class="form-input" required placeholder="e.g. Aunt, Cousin, Grandson" />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
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

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
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
                  <label class="form-label">Avatar Photo URL</label>
                  <input type="url" id="m-avatar" class="form-input" placeholder="https://images.unsplash.com/..." />
                </div>

                <div class="form-group">
                  <label class="form-label">Bio & Story</label>
                  <textarea id="m-bio" class="form-textarea" rows="2" placeholder="Tell something special about this family member..."></textarea>
                </div>

                <div class="form-group">
                  <label class="form-label">Favorite Things / Hobbies</label>
                  <input type="text" id="m-favs" class="form-input" placeholder="e.g. Fishing, Baking, Soccer, Video Games" />
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.85rem; margin-top: 1.5rem;">
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
      const container = this.container.querySelector("#tree-content-scale");
      if (!container) return;

      const countElem = this.container.querySelector("#total-members-count");
      if (countElem) countElem.textContent = store.data.members.length;

      const generations = [1, 2, 3];
      const genTitles = {
        1: "1st Generation • Grandparents & Elders",
        2: "2nd Generation • Parents, Aunts & Uncles",
        3: "3rd Generation • Children & Next Generation"
      };

      let html = "";

      generations.forEach((gen, idx) => {
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
              
              <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(1rem, 2.5vw, 2.5rem); width: 100%; position: relative;">
                ${membersInGen.map(m => this.renderMemberNode(m)).join("")}
              </div>

              ${idx < generations.length - 1 ? `
                <div style="width: 2px; height: 30px; background: linear-gradient(to bottom, var(--border), var(--primary)); margin: 1.25rem auto 0; opacity: 0.6;"></div>
              ` : ''}
            </div>
          `;
        }
      });

      container.innerHTML = html || `
        <div style="text-align:center; padding: 3rem; color: var(--text-muted);">
          No family members match your search "${this.searchQuery}".
        </div>
      `;

      container.querySelectorAll(".tree-node-card").forEach(card => {
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
          <div class="tree-node-avatar-wrapper">
            <img src="${member.avatar}" alt="${member.name}" class="tree-node-avatar" />
            ${member.isOnline ? '<span class="online-dot"></span>' : ''}
          </div>
          <div class="tree-node-name">${member.name}</div>
          <div class="tree-node-role">${member.role}</div>
          ${member.birthDate ? `<div class="tree-node-birth">🎂 ${member.birthDate}</div>` : ''}
          ${spouse ? `
            <div style="margin-top: 6px; font-size: 0.72rem; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 2px 7px; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 4px;">
              <span>❤️</span>
              <span>${spouse.name.split(" ")[0]}</span>
            </div>
          ` : ''}
          ${isCurrentUser ? '<div style="margin-top: 4px; font-size: 0.68rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">● YOU</div>' : ''}
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

      let ageText = "";
      if (m.birthDate) {
        const birth = new Date(m.birthDate);
        const diff = Date.now() - birth.getTime();
        const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
        ageText = ` (${age} years old)`;
      }

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
          <span style="font-size: 0.78rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; background: var(--primary-light); padding: 4px 12px; border-radius: var(--radius-full);">Family Profile</span>
          <button class="btn-icon" id="close-drawer-btn">✕</button>
        </div>

        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="position: relative; width: 96px; height: 96px; margin: 0 auto 0.75rem;">
            <img src="${m.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid var(--border); box-shadow: var(--shadow-md);" />
            ${m.isOnline ? '<span class="online-dot" style="width: 14px; height: 14px;"></span>' : ''}
          </div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">${m.name}</h2>
          <div style="color: var(--primary); font-weight: 700; font-size: 0.9rem; margin-top: 2px;">${m.role}</div>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
          <button class="btn-primary" id="drawer-chat-btn" style="flex: 1; justify-content: center; padding: 0.65rem 1.2rem;">
            <span>💬 Send Message</span>
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.9rem;">
          <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px;">🎂 Birthday</div>
            <div style="font-weight: 700;">${m.birthDate || 'Not specified'}${ageText}</div>
          </div>

          ${spouse ? `
            <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px;">💍 Spouse / Partner</div>
              <div style="font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
                <img src="${spouse.avatar}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                <span>${spouse.name}</span>
              </div>
            </div>
          ` : ''}

          ${parents.length > 0 ? `
            <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px;">👨‍👩‍👧 Parents</div>
              <div style="font-weight: 700; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${parents.map(p => `
                  <span style="display: inline-flex; align-items: center; gap: 5px;">
                    <img src="${p.avatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" />
                    ${p.name}
                  </span>
                `).join(", ")}
              </div>
            </div>
          ` : ''}

          ${m.phone ? `
            <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px;">📞 Phone</div>
              <div><a href="tel:${m.phone}" style="color: var(--primary); text-decoration: none; font-weight: 700;">${m.phone}</a></div>
            </div>
          ` : ''}

          ${m.bio ? `
            <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px;">📖 Bio & Story</div>
              <p style="color: var(--text-secondary); line-height: 1.5;">${m.bio}</p>
            </div>
          ` : ''}

          ${m.favoriteThings ? `
            <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px;">⭐ Favorite Things & Hobbies</div>
              <p style="color: var(--text-secondary); line-height: 1.5;">${m.favoriteThings}</p>
            </div>
          ` : ''}
        </div>

        <div style="margin-top: auto; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between;">
          <button class="btn-secondary" id="delete-member-btn" style="color: var(--primary); font-size: 0.82rem; border-color: rgba(255,87,34,0.3);">
            Remove Member
          </button>
        </div>
      `;

      content.querySelector("#close-drawer-btn")?.addEventListener("click", () => this.closeMemberDrawer());
      content.querySelector("#drawer-chat-btn")?.addEventListener("click", () => {
        this.closeMemberDrawer();
        if (this.onNavigateToChat) this.onNavigateToChat(m.id);
      });
      content.querySelector("#delete-member-btn")?.addEventListener("click", () => {
        if (confirm(`Are you sure you want to remove ${m.name} from the family tree?`)) {
          store.deleteMember(m.id);
          this.closeMemberDrawer();
        }
      });
    }

    bindEvents() {
      const searchInput = this.container.querySelector("#tree-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          this.searchQuery = e.target.value;
          this.renderTree();
        });
      }

      // Zoom Controls
      const contentScale = this.container.querySelector("#tree-content-scale");
      this.container.querySelector("#tree-zoom-in")?.addEventListener("click", () => {
        this.zoomScale = Math.min(this.zoomScale + 0.15, 1.5);
        if (contentScale) contentScale.style.transform = `scale(${this.zoomScale})`;
      });
      this.container.querySelector("#tree-zoom-out")?.addEventListener("click", () => {
        this.zoomScale = Math.max(this.zoomScale - 0.15, 0.65);
        if (contentScale) contentScale.style.transform = `scale(${this.zoomScale})`;
      });
      this.container.querySelector("#tree-zoom-reset")?.addEventListener("click", () => {
        this.zoomScale = 1;
        if (contentScale) contentScale.style.transform = `scale(1)`;
      });

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

      const drawerOverlay = this.container.querySelector("#member-drawer-overlay");
      if (drawerOverlay) {
        drawerOverlay.addEventListener("click", (e) => {
          if (e.target === drawerOverlay) this.closeMemberDrawer();
        });
      }
    }
  }

  // ==========================================
  // 8. CALENDAR COMPONENT (Screen-Size Smart)
  // ==========================================
  class CalendarComponent {
    constructor(container) {
      this.container = container;
      this.currentDate = new Date();
      this.selectedDateStr = new Date().toISOString().split("T")[0];
      this.init();
    }

    init() {
      this.render();
      store.subscribe((data, changeType) => {
        if (["CALENDAR_EVENT", "EVENT_RSVP", "MEMBER_UPDATE", "RESET", "STORAGE_RELOAD"].includes(changeType) || changeType === "GENERAL") {
          this.renderCalendarGrid();
          this.renderEventsList();
        }
      });
    }

    render() {
      this.container.innerHTML = `
        <div class="calendar-layout">
          <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: clamp(1rem, 2vw, 1.5rem); box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <h2 id="calendar-month-year" style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em;">Month Year</h2>
                <div style="display: flex; gap: 4px;">
                  <button class="btn-icon" id="cal-prev-month-btn" style="width: 34px; height: 34px;">◀</button>
                  <button class="btn-icon" id="cal-next-month-btn" style="width: 34px; height: 34px;">▶</button>
                </div>
              </div>

              <button class="btn-primary" id="open-add-event-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                <span>+ Event</span>
              </button>
            </div>

            <div class="calendar-grid" style="margin-top: 0;">
              <div class="calendar-header-day">Sun</div>
              <div class="calendar-header-day">Mon</div>
              <div class="calendar-header-day">Tue</div>
              <div class="calendar-header-day">Wed</div>
              <div class="calendar-header-day">Thu</div>
              <div class="calendar-header-day">Fri</div>
              <div class="calendar-header-day">Sat</div>
            </div>

            <div class="calendar-grid" id="calendar-cells-container"></div>
          </div>

          <div>
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.5rem; box-shadow: var(--shadow-sm);">
              <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>🎉</span>
                <span>Upcoming Family Events</span>
              </h3>
              <div id="upcoming-events-list" style="display: flex; flex-direction: column; gap: 0.85rem;"></div>
            </div>
          </div>
        </div>

        <div class="modal-backdrop" id="add-event-modal" style="display: none;">
          <div class="modal-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h2 style="font-size: 1.35rem; font-weight: 800;">Create Family Event</h2>
              <button class="btn-icon" id="close-event-modal-btn">✕</button>
            </div>

            <form id="add-event-form">
              <div class="form-group">
                <label class="form-label">Event Title *</label>
                <input type="text" id="ev-title" class="form-input" required placeholder="e.g. Sunday Family Dinner, Movie Night" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                <div class="form-group">
                  <label class="form-label">Date *</label>
                  <input type="date" id="ev-date" class="form-input" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Time</label>
                  <input type="time" id="ev-time" class="form-input" value="18:00" />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
                <div class="form-group">
                  <label class="form-label">Category</label>
                  <select id="ev-category" class="form-select">
                    <option value="Dinner">🍲 Dinner / BBQ</option>
                    <option value="Birthday">🎂 Birthday</option>
                    <option value="Sports">⚽ Sports / School</option>
                    <option value="Trip">✈️ Vacation / Trip</option>
                    <option value="Doctor">🩺 Doctor / Health</option>
                    <option value="General">📅 General</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Color Theme</label>
                  <select id="ev-color" class="form-select">
                    <option value="#f97316">Orange</option>
                    <option value="#3b82f6">Blue</option>
                    <option value="#10b981">Green</option>
                    <option value="#ec4899">Pink</option>
                    <option value="#8b5cf6">Purple</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Location</label>
                <input type="text" id="ev-location" class="form-input" placeholder="e.g. Backyard, Living Room, Downtown" />
              </div>

              <div class="form-group">
                <label class="form-label">Description / Notes</label>
                <textarea id="ev-desc" class="form-textarea" rows="2" placeholder="What to bring, plan details, etc..."></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.85rem; margin-top: 1.5rem;">
                <button type="button" class="btn-secondary" id="cancel-event-btn">Cancel</button>
                <button type="submit" class="btn-primary">Add Event</button>
              </div>
            </form>
          </div>
        </div>
      `;

      this.bindEvents();
      this.renderCalendarGrid();
      this.renderEventsList();
    }

    getAllEvents() {
      const events = [...(store.data.events || [])];
      const year = this.currentDate.getFullYear();
      store.data.members.forEach(m => {
        if (m.birthDate) {
          const parts = m.birthDate.split("-");
          if (parts.length >= 3) {
            const bDate = `${year}-${parts[1]}-${parts[2]}`;
            events.push({
              id: `bday-${m.id}-${year}`,
              title: `🎂 ${m.name}'s Birthday!`,
              date: bDate,
              time: "All Day",
              location: "Family Celebration",
              description: `Wish ${m.name} a very happy birthday!`,
              category: "Birthday",
              color: "#ec4899",
              isBirthday: true
            });
          }
        }
      });
      return events;
    }

    renderCalendarGrid() {
      const monthYear = this.container.querySelector("#calendar-month-year");
      const container = this.container.querySelector("#calendar-cells-container");
      if (!monthYear || !container) return;

      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      monthYear.textContent = `${monthNames[month]} ${year}`;

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const allEvents = this.getAllEvents();
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

      let cellsHtml = "";
      for (let i = 0; i < firstDay; i++) {
        cellsHtml += `<div class="calendar-cell" style="opacity: 0.3; background: var(--bg-surface);"></div>`;
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const isToday = isCurrentMonth && today.getDate() === day;
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayEvents = allEvents.filter(e => e.date === dateStr);

        cellsHtml += `
          <div class="calendar-cell ${isToday ? 'today' : ''}" data-day-date="${dateStr}">
            <div class="calendar-date-number">${day}</div>
            <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
              ${dayEvents.slice(0, 2).map(e => `
                <div class="calendar-event-tag" style="background: ${e.color || 'var(--primary)'};" title="${e.title} (${e.time || ''})">
                  ${e.title}
                </div>
              `).join("")}
              ${dayEvents.length > 2 ? `<div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 800;">+${dayEvents.length - 2}</div>` : ''}
            </div>
          </div>
        `;
      }

      container.innerHTML = cellsHtml;

      // Click cell to view
      container.querySelectorAll(".calendar-cell[data-day-date]").forEach(cell => {
        cell.addEventListener("click", () => {
          this.selectedDateStr = cell.getAttribute("data-day-date");
          this.renderEventsList();
        });
      });
    }

    renderEventsList() {
      const list = this.container.querySelector("#upcoming-events-list");
      if (!list) return;

      const allEvents = this.getAllEvents();
      const activeMember = store.getActiveMember();
      allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (allEvents.length === 0) {
        list.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 0.88rem; padding: 1.5rem;">No upcoming events!</div>`;
        return;
      }

      list.innerHTML = allEvents.slice(0, 6).map(evt => {
        const myRsvp = evt.rsvps?.[activeMember.id] || "none";
        const goingMembers = Object.entries(evt.rsvps || {})
          .filter(([_, status]) => status === "going")
          .map(([id]) => store.getMember(id))
          .filter(Boolean);

        return `
          <div style="border: 1px solid var(--border); border-left: 4px solid ${evt.color || 'var(--primary)'}; border-radius: var(--radius-lg); padding: 0.9rem; background: var(--bg-card); box-shadow: var(--shadow-xs);">
            <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-primary); margin-bottom: 2px;">
              ${evt.title}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 600;">
              📅 ${evt.date} • ⏰ ${evt.time || 'All Day'} • 📍 ${evt.location || 'Home'}
            </div>
            ${evt.description ? `<p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.65rem; line-height: 1.5;">${evt.description}</p>` : ''}

            ${!evt.isBirthday ? `
              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
                <span style="font-size: 0.74rem; font-weight: 700; color: var(--text-secondary);">Your RSVP:</span>
                <div style="display: flex; gap: 6px;">
                  <button class="rsvp-btn ${myRsvp === 'going' ? 'active-rsvp' : ''}" data-event-id="${evt.id}" data-status="going" style="padding: 3px 9px; font-size: 0.72rem; border-radius: var(--radius-full); border: 1px solid var(--border); background: ${myRsvp === 'going' ? 'var(--accent-green-light)' : 'transparent'}; color: ${myRsvp === 'going' ? 'var(--accent-green)' : 'var(--text-secondary)'}; font-weight: 700; cursor: pointer;">
                    ✓ Going
                  </button>
                  <button class="rsvp-btn ${myRsvp === 'maybe' ? 'active-rsvp' : ''}" data-event-id="${evt.id}" data-status="maybe" style="padding: 3px 9px; font-size: 0.72rem; border-radius: var(--radius-full); border: 1px solid var(--border); background: ${myRsvp === 'maybe' ? 'var(--primary-light)' : 'transparent'}; color: ${myRsvp === 'maybe' ? 'var(--primary)' : 'var(--text-secondary)'}; font-weight: 700; cursor: pointer;">
                    ? Maybe
                  </button>
                </div>
              </div>

              ${goingMembers.length > 0 ? `
                <div style="display: flex; align-items: center; gap: 4px; margin-top: 0.5rem;">
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; margin-right: 4px;">Attending:</span>
                  ${goingMembers.map(m => `
                    <img src="${m.avatar}" title="${m.name}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1.5px solid white;" />
                  `).join("")}
                </div>
              ` : ''}
            ` : ''}
          </div>
        `;
      }).join("");

      list.querySelectorAll(".rsvp-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const eventId = btn.getAttribute("data-event-id");
          const status = btn.getAttribute("data-status");
          store.setEventRsvp(eventId, status);
        });
      });
    }

    bindEvents() {
      this.container.querySelector("#cal-prev-month-btn")?.addEventListener("click", () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendarGrid();
      });

      this.container.querySelector("#cal-next-month-btn")?.addEventListener("click", () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendarGrid();
      });

      const modal = this.container.querySelector("#add-event-modal");
      const openBtn = this.container.querySelector("#open-add-event-btn");
      const closeBtn = this.container.querySelector("#close-event-modal-btn");
      const cancelBtn = this.container.querySelector("#cancel-event-btn");
      const form = this.container.querySelector("#add-event-form");

      if (openBtn && modal) {
        openBtn.addEventListener("click", () => {
          const dateInput = this.container.querySelector("#ev-date");
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
          const title = this.container.querySelector("#ev-title").value;
          const date = this.container.querySelector("#ev-date").value;
          const time = this.container.querySelector("#ev-time").value;
          const category = this.container.querySelector("#ev-category").value;
          const color = this.container.querySelector("#ev-color").value;
          const location = this.container.querySelector("#ev-location").value;
          const description = this.container.querySelector("#ev-desc").value;

          store.addEvent({
            title,
            date,
            time,
            category,
            color,
            location,
            description
          });

          closeModal();
        });
      }
    }
  }

  // ==========================================
  // 9. CHORES COMPONENT
  // ==========================================
  class ChoresComponent {
    constructor(container) {
      this.container = container;
      this.init();
    }

    init() {
      this.render();
      store.subscribe((data, changeType) => {
        if (["CHORE_UPDATE", "SHOPPING_UPDATE", "MEMBER_UPDATE", "RESET", "STORAGE_RELOAD"].includes(changeType) || changeType === "GENERAL") {
          this.renderChoresList();
          this.renderLeaderboard();
          this.renderShoppingList();
          this.updateProgressMeter();
        }
      });
    }

    render() {
      this.container.innerHTML = `
        <div>
          <div style="display: flex; gap: 0.75rem; margin-bottom: 1.75rem;">
            <button class="btn-primary subtab-btn" data-subtab="chores" id="tab-chores-btn">
              <span>🧹 Family Chores</span>
            </button>
            <button class="btn-secondary subtab-btn" data-subtab="shopping" id="tab-shopping-btn">
              <span>🛒 Grocery List</span>
            </button>
          </div>

          <div id="section-chores" style="display: block;">
            <div id="chore-progress-banner" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; box-shadow: var(--shadow-sm);"></div>

            <div class="chores-layout">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                  <h3 style="font-size: 1.15rem; font-weight: 800;">Active Family Chores</h3>
                  <button class="btn-primary" id="open-add-chore-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                    <span>+ Assign</span>
                  </button>
                </div>
                <div id="chores-cards-list" class="chores-grid"></div>
              </div>

              <div>
                <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.25rem; box-shadow: var(--shadow-sm);">
                  <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>⭐</span>
                    <span>Points Leaderboard</span>
                  </h3>
                  <div id="chores-leaderboard" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
                </div>
              </div>
            </div>
          </div>

          <div id="section-shopping" style="display: none;">
            <div style="max-width: 720px; margin: 0 auto; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: clamp(1.25rem, 3vw, 2rem); box-shadow: var(--shadow-sm);">
              <div style="margin-bottom: 1.25rem;">
                <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.25rem;">Shared Shopping List</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Add groceries or household items. Anyone can check them off at the store!</p>
              </div>

              <form id="add-shopping-form" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <input type="text" id="shop-input" class="form-input" placeholder="e.g. 2 Gallons Milk, Avocados, Dish Soap..." required style="flex: 1; min-width: 200px;" />
                <select id="shop-cat-select" class="form-select" style="width: 130px;">
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

              <div id="shopping-items-list" style="display: flex; flex-direction: column; gap: 0.55rem;"></div>
            </div>
          </div>
        </div>

        <div class="modal-backdrop" id="add-chore-modal" style="display: none;">
          <div class="modal-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h2 style="font-size: 1.35rem; font-weight: 800;">Assign a Family Chore</h2>
              <button class="btn-icon" id="close-chore-modal-btn">✕</button>
            </div>

            <form id="add-chore-form">
              <div class="form-group">
                <label class="form-label">Chore Title *</label>
                <input type="text" id="chore-title-input" class="form-input" required placeholder="e.g. Take out the dog, Wash dishes" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
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

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
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

              <div style="display: flex; justify-content: flex-end; gap: 0.85rem; margin-top: 1.5rem;">
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
      this.updateProgressMeter();
    }

    updateProgressMeter() {
      const banner = this.container.querySelector("#chore-progress-banner");
      if (!banner) return;

      const chores = store.data.chores || [];
      const total = chores.length;
      const completed = chores.filter(c => c.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 100;

      banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
          <div>
            <h4 style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);">Family Chore Goal</h4>
            <p style="font-size: 0.82rem; color: var(--text-muted);">${completed} of ${total} completed</p>
          </div>
          <span style="font-weight: 800; font-size: 1.25rem; color: var(--primary);">${pct}%</span>
        </div>
        <div style="height: 9px; background: var(--bg-surface); border-radius: var(--radius-full); overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: var(--primary-gradient); border-radius: var(--radius-full); transition: width 0.4s ease;"></div>
        </div>
      `;
    }

    renderChoresList() {
      const list = this.container.querySelector("#chores-cards-list");
      if (!list) return;

      const chores = store.data.chores || [];
      if (chores.length === 0) {
        list.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2.5rem; color: var(--text-muted);">No chores assigned right now! ✨</div>`;
        return;
      }

      list.innerHTML = chores.map(c => {
        const assigned = store.getMember(c.assignedTo) || { name: "Family Member", avatar: "" };

        return `
          <div class="chore-card ${c.completed ? 'completed' : ''}">
            <input type="checkbox" class="chore-checkbox" data-chore-id="${c.id}" ${c.completed ? 'checked' : ''} />
            <div style="flex: 1; min-width: 0;">
              <div class="chore-title" style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 4px;">
                ${c.title}
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.76rem; color: var(--text-muted); font-weight: 500;">
                <span>📅 Due: ${c.dueDate}</span>
                <span>•</span>
                <span>${c.frequency}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.65rem;">
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <img src="${assigned.avatar}" title="${assigned.name}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />
                  <span style="font-size: 0.8rem; font-weight: 700;">${assigned.name.split(" ")[0]}</span>
                </div>
                <span style="font-size: 0.75rem; font-weight: 800; color: #f59e0b; background: #fef3c7; padding: 2px 7px; border-radius: var(--radius-full);">
                  ⭐ ${c.points} pts
                </span>
              </div>
            </div>
            <button class="delete-chore-btn btn-icon" data-chore-id="${c.id}" style="width: 26px; height: 26px; font-size: 0.72rem;">✕</button>
          </div>
        `;
      }).join("");

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
          <div style="display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem; border-radius: var(--radius-lg); background: var(--bg-surface);">
            <span style="font-weight: 800; width: 22px; text-align: center; font-size: 1rem;">${medal}</span>
            <img src="${m.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${m.role}</div>
            </div>
            <span style="font-weight: 800; font-size: 0.88rem; color: var(--primary);">${pts} pts</span>
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
          <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem; border-radius: var(--radius-lg); border: 1px solid var(--border); background: ${item.completed ? 'var(--bg-surface)' : 'var(--bg-card)'};">
            <input type="checkbox" class="shop-check" data-shop-id="${item.id}" ${item.completed ? 'checked' : ''} style="width: 19px; height: 19px; accent-color: var(--primary); cursor: pointer;" />
            <div style="flex: 1; min-width: 0;">
              <span style="font-weight: 600; font-size: 0.92rem; ${item.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${item.item}</span>
              <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 5px; margin-top: 2px;">
                <span style="background: var(--bg-surface); padding: 1px 7px; border-radius: var(--radius-full); font-weight: 600;">${item.category}</span>
                ${addedBy ? `<span>• Added by ${addedBy.name.split(" ")[0]}</span>` : ''}
              </div>
            </div>
            <button class="delete-shop-btn btn-icon" data-shop-id="${item.id}" style="width: 26px; height: 26px; font-size: 0.7rem;">✕</button>
          </div>
        `;
      }).join("");

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

  // ==========================================
  // 10. RECIPES COMPONENT
  // ==========================================
  class RecipesComponent {
    constructor(container) {
      this.container = container;
      this.selectedRecipe = null;
      this.init();
    }

    init() {
      this.render();
      store.subscribe((data, changeType) => {
        if (["RECIPE_UPDATE", "RESET", "STORAGE_RELOAD"].includes(changeType) || changeType === "GENERAL") {
          this.renderRecipeGrid();
        }
      });
    }

    render() {
      this.container.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em;">Secret Family Recipes 🍲</h2>
              <p style="font-size: 0.88rem; color: var(--text-muted);">Treasured family dishes passed down through generations.</p>
            </div>
            <button class="btn-primary" id="open-add-recipe-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
              <span>+ Share Recipe</span>
            </button>
          </div>

          <div id="recipe-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.5rem;"></div>
        </div>

        <div class="modal-backdrop" id="recipe-detail-modal" style="display: none;">
          <div class="modal-box" style="width: 660px;" id="recipe-modal-content"></div>
        </div>

        <div class="modal-backdrop" id="add-recipe-modal" style="display: none;">
          <div class="modal-box" style="width: 600px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h2 style="font-size: 1.35rem; font-weight: 800;">Add a Family Recipe</h2>
              <button class="btn-icon" id="close-add-recipe-btn">✕</button>
            </div>

            <form id="add-recipe-form">
              <div class="form-group">
                <label class="form-label">Recipe Title *</label>
                <input type="text" id="rec-title" class="form-input" required placeholder="e.g. Aunt Mary's Cinnamon Rolls" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Prep Time</label>
                  <input type="text" id="rec-prep" class="form-input" placeholder="e.g. 20 mins" />
                </div>
                <div class="form-group">
                  <label class="form-label">Cook Time</label>
                  <input type="text" id="rec-cook" class="form-input" placeholder="e.g. 45 mins" />
                </div>
                <div class="form-group">
                  <label class="form-label">Difficulty</label>
                  <select id="rec-diff" class="form-select">
                    <option value="Easy">Easy</option>
                    <option value="Medium" selected>Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Food Photo URL</label>
                <input type="url" id="rec-img" class="form-input" placeholder="https://images.unsplash.com/..." />
              </div>

              <div class="form-group">
                <label class="form-label">Description / Family Story</label>
                <textarea id="rec-desc" class="form-textarea" rows="2" placeholder="Where did this recipe come from? What makes it special?"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Ingredients (one per line) *</label>
                <textarea id="rec-ingredients" class="form-textarea" rows="4" required placeholder="2 cups Flour&#10;1 cup Sugar&#10;1 tsp Cinnamon"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Preparation Steps (one step per line) *</label>
                <textarea id="rec-steps" class="form-textarea" rows="4" required placeholder="Preheat oven to 375°F.&#10;Mix dry ingredients in a large bowl.&#10;Bake for 35 minutes until golden."></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.85rem; margin-top: 1.5rem;">
                <button type="button" class="btn-secondary" id="cancel-recipe-btn">Cancel</button>
                <button type="submit" class="btn-primary">Save Recipe</button>
              </div>
            </form>
          </div>
        </div>
      `;

      this.bindEvents();
      this.renderRecipeGrid();
    }

    renderRecipeGrid() {
      const grid = this.container.querySelector("#recipe-grid-container");
      if (!grid) return;

      const recipes = store.data.recipes || [];
      if (recipes.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding: 3rem; color: var(--text-muted); grid-column: 1/-1;">No recipes added yet. Share a family classic!</div>`;
        return;
      }

      grid.innerHTML = recipes.map(r => {
        const author = store.getMember(r.authorId) || { name: r.author, avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=chef" };

        return `
          <div class="recipe-card" data-recipe-id="${r.id}" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden; box-shadow: var(--shadow-sm); cursor: pointer; transition: var(--transition);">
            <div style="height: 180px; overflow: hidden; position: relative;">
              <img src="${r.image}" alt="${r.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" />
              <span style="position: absolute; top: 10px; right: 10px; background: rgba(15,23,42,0.7); backdrop-filter: blur(8px); color: white; padding: 3px 9px; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 700;">
                ${r.difficulty}
              </span>
            </div>

            <div style="padding: 1.25rem;">
              <h3 style="font-weight: 800; font-size: 1.1rem; margin-bottom: 0.35rem; color: var(--text-primary); letter-spacing: -0.01em;">${r.title}</h3>
              <p style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.85rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${r.description}
              </p>

              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <img src="${author.avatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" />
                  <span style="color: var(--text-primary);">${author.name.split(" ")[0]}</span>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                  <span>⏱️ ${r.prepTime}</span>
                  <span>🔥 ${r.cookTime}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("");

      grid.querySelectorAll(".recipe-card").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.getAttribute("data-recipe-id");
          this.openRecipeDetail(id);
        });
      });
    }

    openRecipeDetail(recipeId) {
      const r = (store.data.recipes || []).find(rec => rec.id === recipeId);
      if (!r) return;

      const modal = this.container.querySelector("#recipe-detail-modal");
      const content = this.container.querySelector("#recipe-modal-content");
      if (!modal || !content) return;

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">${r.title}</h2>
            <div style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.82rem; color: var(--text-muted); margin-top: 3px; font-weight: 600;">
              <span>By ${r.author}</span> • <span>Prep: ${r.prepTime}</span> • <span>Cook: ${r.cookTime}</span>
            </div>
          </div>
          <button class="btn-icon" id="close-detail-recipe-btn">✕</button>
        </div>

        <img src="${r.image}" style="width: 100%; height: 220px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: 1.25rem; box-shadow: var(--shadow-sm);" />

        <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.25rem; font-style: italic;">
          "${r.description}"
        </p>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.65rem;">🛒 Ingredients</h4>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${(r.ingredients || []).map(ing => `
              <label style="display: flex; align-items: center; gap: 0.65rem; font-size: 0.88rem; cursor: pointer; padding: 0.25rem 0;">
                <input type="checkbox" style="width: 18px; height: 18px; accent-color: var(--primary);" />
                <span>${ing}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div>
          <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.65rem;">👩‍🍳 Directions</h4>
          <ol style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.88rem; line-height: 1.6; color: var(--text-primary);">
            ${(r.steps || []).map(step => `<li>${step}</li>`).join("")}
          </ol>
        </div>
      `;

      modal.style.display = "flex";
      content.querySelector("#close-detail-recipe-btn")?.addEventListener("click", () => {
        modal.style.display = "none";
      });
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });
    }

    bindEvents() {
      const addModal = this.container.querySelector("#add-recipe-modal");
      const openBtn = this.container.querySelector("#open-add-recipe-btn");
      const closeBtn = this.container.querySelector("#close-add-recipe-btn");
      const cancelBtn = this.container.querySelector("#cancel-recipe-btn");
      const form = this.container.querySelector("#add-recipe-form");

      if (openBtn && addModal) {
        openBtn.addEventListener("click", () => {
          addModal.style.display = "flex";
        });
      }

      const closeAddModal = () => {
        if (addModal) addModal.style.display = "none";
        if (form) form.reset();
      };

      if (closeBtn) closeBtn.addEventListener("click", closeAddModal);
      if (cancelBtn) cancelBtn.addEventListener("click", closeAddModal);

      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const title = this.container.querySelector("#rec-title").value;
          const prepTime = this.container.querySelector("#rec-prep").value;
          const cookTime = this.container.querySelector("#rec-cook").value;
          const difficulty = this.container.querySelector("#rec-diff").value;
          const image = this.container.querySelector("#rec-img").value;
          const description = this.container.querySelector("#rec-desc").value;
          const ingredients = this.container.querySelector("#rec-ingredients").value.split("\n").map(s => s.trim()).filter(Boolean);
          const steps = this.container.querySelector("#rec-steps").value.split("\n").map(s => s.trim()).filter(Boolean);

          store.addRecipe({
            title,
            prepTime,
            cookTime,
            difficulty,
            image: image || undefined,
            description,
            ingredients,
            steps
          });

          closeAddModal();
        });
      }
    }
  }

  // ==========================================
  // 11. VAULT COMPONENT
  // ==========================================
  class VaultComponent {
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
            <h2 style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em;">Emergency & Family Vault 🛡️</h2>
            <p style="font-size: 0.88rem; color: var(--text-muted);">Quick-access emergency numbers, pediatrician info, trusted neighbors, and essential home details.</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.25rem; box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">📍 Home Address</div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); margin-bottom: 0.5rem;" id="vault-address">${familyInfo.homeAddress}</div>
              <button class="btn-secondary copy-text-btn" data-copy="${familyInfo.homeAddress}" style="padding: 0.35rem 0.85rem; font-size: 0.75rem;">📋 Copy Address</button>
            </div>

            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.25rem; box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">📶 Home Wi-Fi Network</div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">${familyInfo.wifiName}</div>
              <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Password: <code style="background: var(--bg-surface); padding: 2px 7px; border-radius: 5px; font-weight: 700;">${familyInfo.wifiPassword}</code></div>
              <button class="btn-secondary copy-text-btn" data-copy="${familyInfo.wifiPassword}" style="padding: 0.35rem 0.85rem; font-size: 0.75rem;">📋 Copy Wi-Fi Password</button>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-xl); padding: 1.25rem; box-shadow: var(--shadow-sm);">
              <div style="font-size: 0.72rem; font-weight: 800; color: #dc2626; text-transform: uppercase; margin-bottom: 4px;">🚨 Life-Threatening Emergency</div>
              <div style="font-weight: 900; font-size: 1.5rem; color: #991b1b; margin-bottom: 0.2rem;">Call 911</div>
              <div style="font-size: 0.78rem; font-weight: 700; color: #b91c1c;">Poison Control: 1-800-222-1222</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.15rem; font-weight: 800;">Important Family Contacts</h3>
            <button class="btn-primary" id="open-add-contact-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
              <span>+ Contact</span>
            </button>
          </div>

          <div id="vault-contacts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem;"></div>
        </div>

        <div class="modal-backdrop" id="add-contact-modal" style="display: none;">
          <div class="modal-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
              <h2 style="font-size: 1.35rem; font-weight: 800;">Add Important Contact</h2>
              <button class="btn-icon" id="close-contact-modal-btn">✕</button>
            </div>

            <form id="add-contact-form">
              <div class="form-group">
                <label class="form-label">Contact Name / Service *</label>
                <input type="text" id="con-name" class="form-input" required placeholder="e.g. Dr. Reed (Pediatrician), Aunt Clara" />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem;">
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

              <div style="display: flex; justify-content: flex-end; gap: 0.85rem; margin-top: 1.5rem;">
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
        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 1.25rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem;">
            <h4 style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">${c.name}</h4>
            <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full); background: var(--bg-surface); color: var(--text-secondary);">${c.category}</span>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <a href="tel:${c.phone}" style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 800; color: var(--primary); text-decoration: none; font-size: 0.95rem;">
              <span>📞</span>
              <span>${c.phone}</span>
            </a>
          </div>

          ${c.address ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 500;">📍 ${c.address}</div>` : ''}
          ${c.notes ? `<p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-top: auto; padding-top: 0.65rem; border-top: 1px solid var(--border-subtle); font-style: italic;">📝 ${c.notes}</p>` : ''}
        </div>
      `).join("");

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

  // ==========================================
  // 12. APP BOOTSTRAP
  // ==========================================
  class FamilyApp {
    constructor() {
      this.currentView = "feed";
      this.components = {};
      this.init();
    }

    init() {
      const mainArea = document.getElementById("main-view-container");
      if (!mainArea) return;

      const views = ["feed", "chat", "tree", "calendar", "chores", "recipes", "vault"];
      views.forEach(v => {
        const container = document.createElement("div");
        container.id = `view-${v}`;
        container.style.display = v === "feed" ? "block" : "none";
        mainArea.appendChild(container);
      });

      this.navbar = new NavbarComponent((view) => this.switchView(view));

      this.components.feed = new FeedComponent(document.getElementById("view-feed"));
      this.components.chat = new ChatComponent(document.getElementById("view-chat"));
      this.components.tree = new FamilyTreeComponent(
        document.getElementById("view-tree"),
        (targetMemberId) => {
          this.navbar.navigateTo("chat");
          this.components.chat.activeRecipientId = targetMemberId;
          this.components.chat.activeChannelId = null;
          const wrapper = document.getElementById("chat-wrapper");
          if (wrapper) wrapper.classList.add("in-conversation");
          this.components.chat.updateActiveItemStyles();
          this.components.chat.renderHeader();
          this.components.chat.renderMessages();
        }
      );
      this.components.calendar = new CalendarComponent(document.getElementById("view-calendar"));
      this.components.chores = new ChoresComponent(document.getElementById("view-chores"));
      this.components.recipes = new RecipesComponent(document.getElementById("view-recipes"));
      this.components.vault = new VaultComponent(document.getElementById("view-vault"));

      console.log("Family App running screen-size smart! 🏡📱💻");
    }

    switchView(view) {
      this.currentView = view;
      const views = ["feed", "chat", "tree", "calendar", "chores", "recipes", "vault"];
      views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.style.display = v === view ? "block" : "none";
      });

      if (view === "chat") {
        const chatArea = document.getElementById("chat-messages-area");
        if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new FamilyApp());
  } else {
    new FamilyApp();
  }
})();
