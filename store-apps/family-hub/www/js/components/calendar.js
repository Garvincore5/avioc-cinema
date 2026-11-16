// calendar.js - Shared Family Calendar, Event RSVPs, and Auto Birthday Reminders
import { store } from "../store.js";

export class CalendarComponent {
  constructor(container) {
    this.container = container;
    this.currentDate = new Date();
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
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem;">
        <!-- Calendar Grid Area -->
        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <h2 id="calendar-month-year" style="font-size: 1.25rem; font-weight: 700;">Month Year</h2>
              <div style="display: flex; gap: 4px;">
                <button class="btn-icon" id="cal-prev-month-btn" style="width: 32px; height: 32px;">◀</button>
                <button class="btn-icon" id="cal-next-month-btn" style="width: 32px; height: 32px;">▶</button>
              </div>
            </div>

            <button class="btn-primary" id="open-add-event-btn">
              <span>+ Add Family Event</span>
            </button>
          </div>

          <!-- Days Header -->
          <div class="calendar-grid" style="margin-top: 0;">
            <div class="calendar-header-day">Sun</div>
            <div class="calendar-header-day">Mon</div>
            <div class="calendar-header-day">Tue</div>
            <div class="calendar-header-day">Wed</div>
            <div class="calendar-header-day">Thu</div>
            <div class="calendar-header-day">Fri</div>
            <div class="calendar-header-day">Sat</div>
          </div>

          <!-- Days Cells -->
          <div class="calendar-grid" id="calendar-cells-container"></div>
        </div>

        <!-- Upcoming Events & RSVPs Column -->
        <div>
          <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: var(--shadow-sm);">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>🎉</span>
              <span>Upcoming Family Events</span>
            </h3>

            <div id="upcoming-events-list" style="display: flex; flex-direction: column; gap: 0.85rem;">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
      </div>

      <!-- Add Event Modal -->
      <div class="modal-backdrop" id="add-event-modal" style="display: none;">
        <div class="modal-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 700;">Create Family Event</h2>
            <button class="btn-icon" id="close-event-modal-btn">✕</button>
          </div>

          <form id="add-event-form">
            <div class="form-group">
              <label class="form-label">Event Title *</label>
              <input type="text" id="ev-title" class="form-input" required placeholder="e.g. Sunday Family Dinner, Movie Night" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Date *</label>
                <input type="date" id="ev-date" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Time</label>
                <input type="time" id="ev-time" class="form-input" value="18:00" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
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

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
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

    // Automatically generate birthday events for the current year from family members
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

    // Empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
      cellsHtml += `<div class="calendar-cell" style="opacity: 0.3; background: var(--border-light);"></div>`;
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && today.getDate() === day;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = allEvents.filter(e => e.date === dateStr);

      cellsHtml += `
        <div class="calendar-cell ${isToday ? 'today' : ''}">
          <div class="calendar-date-number">${day}</div>
          <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
            ${dayEvents.slice(0, 3).map(e => `
              <div class="calendar-event-tag" style="background: ${e.color || 'var(--primary)'};" title="${e.title} (${e.time || ''})">
                ${e.title}
              </div>
            `).join("")}
            ${dayEvents.length > 3 ? `<div style="font-size: 0.65rem; color: var(--text-muted);">+${dayEvents.length - 3} more</div>` : ''}
          </div>
        </div>
      `;
    }

    container.innerHTML = cellsHtml;
  }

  renderEventsList() {
    const list = this.container.querySelector("#upcoming-events-list");
    if (!list) return;

    const allEvents = this.getAllEvents();
    const activeMember = store.getActiveMember();

    // Sort upcoming events
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (allEvents.length === 0) {
      list.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">No upcoming events!</div>`;
      return;
    }

    list.innerHTML = allEvents.slice(0, 6).map(evt => {
      const myRsvp = evt.rsvps?.[activeMember.id] || "none";
      const goingMembers = Object.entries(evt.rsvps || {})
        .filter(([_, status]) => status === "going")
        .map(([id]) => store.getMember(id))
        .filter(Boolean);

      return `
        <div style="border: 1px solid var(--border); border-left: 4px solid ${evt.color || 'var(--primary)'}; border-radius: var(--radius-md); padding: 0.85rem; background: var(--bg-card);">
          <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary); margin-bottom: 2px;">
            ${evt.title}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            📅 ${evt.date} • ⏰ ${evt.time || 'All Day'} • 📍 ${evt.location || 'Home'}
          </div>
          ${evt.description ? `<p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.65rem;">${evt.description}</p>` : ''}

          <!-- RSVP controls (for non-birthday events) -->
          ${!evt.isBirthday ? `
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 0.5rem; margin-top: 0.5rem;">
              <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">Your RSVP:</span>
              <div style="display: flex; gap: 4px;">
                <button class="rsvp-btn ${myRsvp === 'going' ? 'active-rsvp' : ''}" data-event-id="${evt.id}" data-status="going" style="padding: 2px 8px; font-size: 0.72rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: ${myRsvp === 'going' ? 'var(--success-light)' : 'transparent'}; color: ${myRsvp === 'going' ? 'var(--success)' : 'var(--text-secondary)'}; font-weight: 600; cursor: pointer;">
                  ✓ Going
                </button>
                <button class="rsvp-btn ${myRsvp === 'maybe' ? 'active-rsvp' : ''}" data-event-id="${evt.id}" data-status="maybe" style="padding: 2px 8px; font-size: 0.72rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: ${myRsvp === 'maybe' ? 'var(--primary-light)' : 'transparent'}; color: ${myRsvp === 'maybe' ? 'var(--primary)' : 'var(--text-secondary)'}; font-weight: 600; cursor: pointer;">
                  ? Maybe
                </button>
              </div>
            </div>

            <!-- Attendees Avatars -->
            ${goingMembers.length > 0 ? `
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 0.5rem;">
                <span style="font-size: 0.7rem; color: var(--text-muted); margin-right: 4px;">Attending:</span>
                ${goingMembers.map(m => `
                  <img src="${m.avatar}" title="${m.name}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" />
                `).join("")}
              </div>
            ` : ''}
          ` : ''}
        </div>
      `;
    }).join("");

    // RSVP button interactions
    list.querySelectorAll(".rsvp-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const eventId = btn.getAttribute("data-event-id");
        const status = btn.getAttribute("data-status");
        store.setEventRsvp(eventId, status);
      });
    });
  }

  bindEvents() {
    // Next/Prev Month
    this.container.querySelector("#cal-prev-month-btn")?.addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendarGrid();
    });

    this.container.querySelector("#cal-next-month-btn")?.addEventListener("click", () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendarGrid();
    });

    // Add Event Modal
    const modal = this.container.querySelector("#add-event-modal");
    const openBtn = this.container.querySelector("#open-add-event-btn");
    const closeBtn = this.container.querySelector("#close-event-modal-btn");
    const cancelBtn = this.container.querySelector("#cancel-event-btn");
    const form = this.container.querySelector("#add-event-form");

    if (openBtn && modal) {
      openBtn.addEventListener("click", () => {
        // Default date to today
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
