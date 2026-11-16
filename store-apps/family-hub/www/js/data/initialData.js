// initialData.js - Pre-populated sample family data
export const INITIAL_DATA = {
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
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
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
      icon: "home",
      type: "channel",
      members: ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5", "mem-6", "mem-7"]
    },
    {
      id: "chan-parents",
      name: "Parents & Grandparents",
      description: "Coordination, budgets, and adult talks ☕",
      icon: "users",
      type: "channel",
      members: ["mem-1", "mem-2", "mem-3", "mem-4"]
    },
    {
      id: "chan-kids",
      name: "Kids Corner",
      description: "Maya, Leo & Uncle Marcus games and fun 🎮",
      icon: "smile",
      type: "channel",
      members: ["mem-5", "mem-6", "mem-7"]
    },
    {
      id: "chan-trip",
      name: "Summer Vacation 2026",
      description: "Planning our trip to Yellowstone National Park 🌲",
      icon: "compass",
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
      assignedTo: "mem-6", // Maya
      dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      completed: false,
      points: 15,
      frequency: "Weekly"
    },
    {
      id: "chore-2",
      title: "Take out recycling and trash bins",
      assignedTo: "mem-7", // Leo
      dueDate: new Date(Date.now()).toISOString().split("T")[0],
      completed: true,
      points: 10,
      frequency: "Weekly"
    },
    {
      id: "chore-3",
      title: "Clean garage and organize tools",
      assignedTo: "mem-3", // David
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      completed: false,
      points: 30,
      frequency: "Once"
    },
    {
      id: "chore-4",
      title: "Fold and put away clean laundry",
      assignedTo: "mem-4", // Sarah
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
