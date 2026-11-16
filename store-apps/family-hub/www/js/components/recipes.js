// recipes.js - Family Recipe Book
import { store } from "../store.js";

export class RecipesComponent {
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 700;">Secret Family Recipes 🍲</h2>
            <p style="font-size: 0.88rem; color: var(--text-muted);">Treasured family dishes, grandma's secrets, and holiday classics passed down through generations.</p>
          </div>
          <button class="btn-primary" id="open-add-recipe-btn">
            <span>+ Share Recipe</span>
          </button>
        </div>

        <!-- Recipe Grid -->
        <div id="recipe-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Recipe Detail Modal -->
      <div class="modal-backdrop" id="recipe-detail-modal" style="display: none;">
        <div class="modal-box" style="width: 650px;" id="recipe-modal-content">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Add Recipe Modal -->
      <div class="modal-backdrop" id="add-recipe-modal" style="display: none;">
        <div class="modal-box" style="width: 600px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.25rem; font-weight: 700;">Add a Family Recipe</h2>
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
                  <option value="Hard">Hard / Advanced</option>
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

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
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
        <div class="recipe-card" data-recipe-id="${r.id}" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); cursor: pointer; transition: var(--transition);">
          <div style="height: 180px; overflow: hidden; position: relative;">
            <img src="${r.image}" alt="${r.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" />
            <span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.65); color: white; padding: 3px 8px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600;">
              ${r.difficulty}
            </span>
          </div>

          <div style="padding: 1.25rem;">
            <h3 style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.4rem; color: var(--text-primary);">${r.title}</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.85rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${r.description}
            </p>

            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 0.75rem; font-size: 0.78rem; color: var(--text-muted);">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <img src="${author.avatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" />
                <span style="font-weight: 600; color: var(--text-primary);">${author.name.split(" ")[0]}</span>
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

    // Click recipe to open modal
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

    const author = store.getMember(r.authorId) || { name: r.author, avatar: "" };

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">${r.title}</h2>
          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
            <span>By ${r.author}</span> • <span>Prep: ${r.prepTime}</span> • <span>Cook: ${r.cookTime}</span>
          </div>
        </div>
        <button class="btn-icon" id="close-detail-recipe-btn">✕</button>
      </div>

      <img src="${r.image}" style="width: 100%; height: 220px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 1.25rem;" />

      <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem; font-style: italic;">
        "${r.description}"
      </p>

      <!-- Ingredients checklist -->
      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.65rem;">🛒 Ingredients (Check off as you cook)</h4>
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${(r.ingredients || []).map(ing => `
            <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer;">
              <input type="checkbox" style="accent-color: var(--primary);" />
              <span>${ing}</span>
            </label>
          `).join("")}
        </div>
      </div>

      <!-- Preparation Steps -->
      <div>
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.65rem;">👩‍🍳 Step-by-Step Directions</h4>
        <ol style="padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-primary);">
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
