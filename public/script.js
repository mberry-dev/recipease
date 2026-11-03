// ============ GLOBAL VARIABLES ============
let allRecipes = [];
let ingredientCount = 1;
let instructionCount = 1;
let currentWeek = '';
let allRecipesForMealPlan = [];
let currentMealPlan = {}; 
let currentRecipeId = null; // For edit modal

// ============ INITIALIZATION ============
window.onload = function() {
    checkBackendConnection();
    setupNavigation();
    loadAllRecipes();
    setupEventListeners();
    updateSavedWeeksList();
};

// ============ EVENT LISTENERS SETUP ============
// Adds a listener only if the element exists (most buttons use inline onclick handlers instead)
function onElement(id, eventName, handler) {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventName, handler);
}

// Attaches event listeners to interactive elements
function setupEventListeners() {
    // Dashboard buttons
    onElement('view-all-recipes-btn', 'click', function() {
        loadRecipes();
        showTab('recipes');
    });
    
    onElement('add-new-recipe-btn', 'click', function() {
        showTab('add-recipe');
    });
    
    onElement('test-backend-btn', 'click', testBackend);
    
    // Caategory filter
    onElement('category-filter', 'change', function() {
        filterRecipes();
    });
    
    // Add Recipe section
    onElement('add-ingredient-btn', 'click', addIngredientField);
    onElement('add-instruction-btn', 'click', addInstructionField);
    onElement('save-recipe-btn', 'click', saveRecipe);
    onElement('clear-form-btn', 'click', clearRecipeForm);
    
    // Meal Plan section
    onElement('week-selector', 'change', function() {
        currentWeek = this.value; // Update current week
    });
    
    onElement('load-week-btn', 'click', loadMealPlan);
    onElement('save-plan-meal-btn', 'click', saveMealPlan);
    onElement('clear-week-btn', 'click', clearCurrentWeek);
    
    // Grocery List section
    onElement('generate-grocery-btn', 'click', generateGroceryList);
    onElement('print-grocery-btn', 'click', printGroceryList);
    onElement('mark-all-done-btn', 'click', markAllAsDone);
    onElement('reset-progress-btn', 'click', clearShoppingProgress);
    
    // Edit Modal
    onElement('close-edit-modal-btn', 'click', closeEditModal);
    onElement('cancel-edit-btn', 'click', closeEditModal);
    onElement('add-edit-ingredient-btn', 'click', addEditIngredientField);
    onElement('add-edit-instruction-btn', 'click', addEditInstructionField);
    onElement('update-recipe-btn', 'click', updateRecipe);
}

// ============ BACKEND CONNECTION ============
// Checks if backend server is running and accessible
function checkBackendConnection() {
    fetch('/api/health')
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(data => {
            // Update status box with success message
            document.getElementById('status-box').innerHTML = `
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                <strong>Connected to backend!</strong></p>
                <p>Service: ${data.service} v${data.version} | Recipes: ${data.total_recipes} | Database: ${data.database}</p>
            `;
            document.getElementById('total-recipes').textContent = data.total_recipes;
            document.getElementById('db-status').textContent = data.status;
        })
        .catch(error => {
            // Display error if backend is unreachable
            document.getElementById('status-box').innerHTML = `
                <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                <strong>Backend connection failed!</strong></p>
                <p>Error: ${error.message}</p>
                <p>Make sure the Recipease server is running (npm start)</p>
            `;
            document.getElementById('status-box').className = 'status-box error';
        });
}

// Tests backend connection with a simple API call
function testBackend() {
    fetch('/api/test')
        .then(response => response.json())
        .then(data => {
            alert(`✅ Backend Test Successful!\n\nMessage: ${data.message}\nStatus: ${data.status}`);
        })
        .catch(error => {
            alert(`❌ Backend Test Failed!\n\nError: ${error.message}`);
        });
}

// ============ NAVIGATION ============
// Sets up tab navigation functionality
function setupNavigation() {
    document.querySelectorAll('.nav-tabs a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            showTab(tab);
            
            // Update active state
            document.querySelectorAll('.nav-tabs a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show the selected tab and hides others
function showTab(tabId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// ============ DASHBOARD STATS ============
// Updates dashboard statistics with recipe data
function updateDashboardStats(recipes) {
    if (recipes.length === 0) return;
    
    // Total recipes
    document.getElementById('total-recipes').textContent = recipes.length;
    
    // Average prep time
    const avgPrep = Math.round(recipes.reduce((sum, recipe) => sum + (recipe.prep_time || 0), 0) / recipes.length);
    document.getElementById('avg-prep-time').textContent = avgPrep;
    
    // Number of categories
    const categories = [...new Set(recipes.map(recipe => recipe.category))];
    document.getElementById('categories').textContent = categories.length;
}

// ============ RECIPE MANAGEMENT ============
// Loads all recipes from backend and displays them
function loadAllRecipes() {
    const container = document.getElementById('recipes-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading recipes...</p>
        </div>
    `;
    
    fetch('/api/recipes')
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(recipes => {
            // Store all recipes
            allRecipes = recipes;
            
            // Sort all recipes alphabetically
            allRecipes.sort((a, b) => {
                const titleA = (a.title || '').trim().toLowerCase();
                const titleB = (b.title || '').trim().toLowerCase();
                return titleA.localeCompare(titleB);
            });
            
            // Display all recipes initially
            displayRecipes(allRecipes);
            updateDashboardStats(recipes);
            
            // Reset filter dropdown (but don't filter yet)
            document.getElementById('category-filter').value = '';
        })
        .catch(error => {
            container.innerHTML = `
                <div class="status-box error">
                    <p><i class="fas fa-exclamation-triangle"></i> Error loading recipes</p>
                    <p>${error.message}</p>
                </div>
            `;
        });
}

// Displays recipes in the recipes container
function displayRecipes(recipes) {
    const container = document.getElementById('recipes-container');
    const category = document.getElementById('category-filter').value;
    
    if (recipes.length === 0) {
        // Show empty state message
        container.innerHTML = `
            <div class="recipe-card">
                <div class="recipe-body" style="text-align: center; padding: 50px;">
                    <i class="fas fa-book-open" style="font-size: 3em; color: #ddd; margin-bottom: 20px;"></i>
                    <h3>No Recipes Found</h3>
                    ${category ? `
                        <p>No recipes found in "${category}" category</p>
                        <p>Try selecting a different category</p>
                        <button class="btn" onclick="clearFilters()" style="margin-top: 20px;">
                            <i class="fas fa-times"></i> Show All Recipes
                        </button>
                    ` : `
                        <p>Add your first recipe to get started!</p>
                        <button class="btn" onclick="showTab('add-recipe')" style="margin-top: 20px;">
                            <i class="fas fa-plus"></i> Add Recipe
                        </button>
                    `}
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Show which category is active (if any)
    if (category) {
        html += `
            <div style="margin-bottom: 20px; padding: 12px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h4 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-filter"></i>
                    Filter Active: "${category}"
                    <span style="background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 20px; font-size: 0.9em; margin-left: 10px;">
                        ${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}
                    </span>
                </h4>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.9em;">
                    Showing only ${category} recipes
                </p>
            </div>
        `;
    } else {
        html += `
            <div style="margin-bottom: 20px; padding: 12px 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4CAF50;">
                <h4 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-list"></i>
                    All Recipes (Sorted A-Z)
                    <span style="background: #e8f5e9; color: #2E7D32; padding: 2px 10px; border-radius: 20px; font-size: 0.9em; margin-left: 10px;">
                        ${recipes.length} total
                    </span>
                </h4>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 0.9em;">
                    Use the category filter above to show specific types of recipes
                </p>
            </div>
        `;
    }
    
    // Display recipes
    recipes.forEach(recipe => {
        const prepTime = recipe.prep_time || 0;
        const cookTime = recipe.cook_time || 0;
        const totalTime = prepTime + cookTime;
        
        // Highlight if it matches the active filter
        const isFiltered = category && recipe.category && 
                          recipe.category.toLowerCase() === category.toLowerCase();
        
        html += `
            <div class="recipe-card" ${isFiltered ? 'style="border-left: 4px solid #4CAF50;"' : ''}>
                <div class="recipe-header">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <div class="recipe-meta">
                        <span style="
                            background: ${isFiltered ? '#4CAF50' : '#6c757d'}; 
                            color: white; 
                            padding: 3px 10px; 
                            border-radius: 12px;
                            font-size: 0.85em;
                            display: inline-flex;
                            align-items: center;
                            gap: 5px;
                        ">
                            <i class="fas fa-tag"></i> ${recipe.category}
                            ${isFiltered ? '<i class="fas fa-check" style="font-size: 0.8em;"></i>' : ''}
                        </span>
                        <span><i class="fas fa-clock"></i> ${totalTime} min</span>
                        <span><i class="fas fa-users"></i> ${recipe.servings} servings</span>
                    </div>
                </div>
                <div class="recipe-body">
                    ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
                    
                    <div class="recipe-details">
                        <p><strong><i class="fas fa-carrot"></i> Ingredients (${recipe.ingredients.length})</strong></p>
                        <ul style="margin: 10px 0 10px 20px;">
                            ${recipe.ingredients.slice(0, 3).map(ing => `<li>${ing}</li>`).join('')}
                            ${recipe.ingredients.length > 3 ? '<li>... and ' + (recipe.ingredients.length - 3) + ' more</li>' : ''}
                        </ul>
                        
                        <p><strong><i class="fas fa-list-ol"></i> Instructions (${recipe.instructions.length})</strong></p>
                        <ol style="margin: 10px 0 10px 20px;">
                            ${recipe.instructions.slice(0, 2).map((inst, i) => `<li>${inst}</li>`).join('')}
                            ${recipe.instructions.length > 2 ? '<li>... and ' + (recipe.instructions.length - 2) + ' more steps</li>' : ''}
                        </ol>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn" onclick="viewRecipe(${recipe.id})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="btn btn-outline" onclick="openEditModal(${recipe.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Filters recipes by selected category
function filterRecipes() {
    const categorySelect = document.getElementById('category-filter');
    const category = categorySelect.value;
    
    // If no recipes loaded yet, load them first
    if (allRecipes.length === 0) {
        loadAllRecipes();
        return;
    }
    
    // If "All Categories" is selected, show all recipes
    if (!category || category === "") {
        // Show all recipes sorted alphabetically
        const sortedRecipes = [...allRecipes].sort((a, b) => {
            const titleA = (a.title || '').trim().toLowerCase();
            const titleB = (b.title || '').trim().toLowerCase();
            return titleA.localeCompare(titleB);
        });
        displayRecipes(sortedRecipes);
        return;
    }
    
    // Filter recipes by EXACT category match (case-insensitive)
    const filteredRecipes = allRecipes.filter(recipe => {
        if (!recipe.category) return false;
        
        // Normalize both for comparison
        const recipeCategory = recipe.category.trim().toLowerCase();
        const selectedCategory = category.trim().toLowerCase();
        
        // Return true ONLY if they match exactly
        return recipeCategory === selectedCategory;
    });
    
    // Sort filtered recipes alphabetically
    filteredRecipes.sort((a, b) => {
        const titleA = (a.title || '').trim().toLowerCase();
        const titleB = (b.title || '').trim().toLowerCase();
        return titleA.localeCompare(titleB);
    });
    
    // Display the filtered results
    displayRecipes(filteredRecipes);
}

// Applies filter and shows visual feedback
function applyFilter() {
    console.log("Apply Filter clicked");
    
    // Get the selected category
    const category = document.getElementById('category-filter').value;
    
    // If no category selected, show all
    if (!category) {
        // Show all recipes with visual feedback
        const sorted = [...allRecipes].sort((a, b) => 
            a.title.toLowerCase().localeCompare(b.title.toLowerCase())
        );
        displayRecipes(sorted);
        
        // Add visual feedback
        showFilterFeedback("Showing all recipes");
        return;
    }
    
    // Filter by category
    const filtered = allRecipes.filter(recipe => {
        if (!recipe.category) return false;
        return recipe.category.toLowerCase().trim() === category.toLowerCase().trim();
    });
    
    // Sort alphabetically
    filtered.sort((a, b) => 
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    
    // Display with visual feedback
    displayRecipes(filtered);
    
    // Show feedback message
    if (filtered.length === 0) {
        showFilterFeedback(`No recipes found in "${category}" category`);
    } else {
        showFilterFeedback(`Showing ${filtered.length} recipe(s) in "${category}"`);
    }
}

// Helper function to show visual feedback
function showFilterFeedback(message) {
    // Remove any existing feedback
    const existingFeedback = document.getElementById('filter-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Create new feedback element
    const feedback = document.createElement('div');
    feedback.id = 'filter-feedback';
    feedback.innerHTML = `
        <div style="
            margin: 10px 0;
            padding: 10px 15px;
            background: #4CAF50;
            color: white;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            animation: fadeIn 0.5s;
        ">
            <span><i class="fas fa-info-circle"></i> ${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
            ">&times;</button>
        </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    // Insert after the filter controls
    const controls = document.querySelector('.recipes-controls');
    if (controls) {
        controls.parentNode.insertBefore(feedback, controls.nextSibling);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 3000);
    }
}

// Clears all filters and shows all recipes
function clearFilters() {
    // Reset dropdown to "All Categories"
    document.getElementById('category-filter').value = '';
    
    // Show all recipes in alphabetical order
    const sortedRecipes = [...allRecipes].sort((a, b) => {
        const titleA = (a.title || '').trim().toLowerCase();
        const titleB = (b.title || '').trim().toLowerCase();
        return titleA.localeCompare(titleB);
    });
    
    displayRecipes(sortedRecipes);
}

// Opens modal to view full recipe details
function viewRecipe(id) {
    fetch(`/api/recipes/${id}`)
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(recipe => {
            // Create modal HTML
            const modalHTML = `
                <div id="recipe-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                    <div style="background: white; border-radius: 10px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 0;">
                        <div style="background: #4CAF50; color: white; padding: 20px; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0;">${recipe.title}</h3>
                            <button onclick="closeModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                        </div>
                        <div style="padding: 25px;">
                            <div style="display: flex; gap: 20px; margin-bottom: 20px; color: #666;">
                                <span><i class="fas fa-tag"></i> ${recipe.category}</span>
                                <span><i class="fas fa-clock"></i> Prep: ${recipe.prep_time}min | Cook: ${recipe.cook_time}min</span>
                                <span><i class="fas fa-users"></i> ${recipe.servings} servings</span>
                            </div>
                            
                            ${recipe.description ? `<p style="margin-bottom: 25px; line-height: 1.6;">${recipe.description}</p>` : ''}
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                                <div>
                                    <h4 style="color: #4CAF50; margin-bottom: 15px;"><i class="fas fa-carrot"></i> Ingredients</h4>
                                    <ul style="margin: 0; padding-left: 20px;">
                                        ${recipe.ingredients.map(ing => `<li style="margin-bottom: 8px;">${ing}</li>`).join('')}
                                    </ul>
                                </div>
                                <div>
                                    <h4 style="color: #4CAF50; margin-bottom: 15px;"><i class="fas fa-list-ol"></i> Instructions</h4>
                                    <ol style="margin: 0; padding-left: 20px;">
                                        ${recipe.instructions.map((inst, i) => `<li style="margin-bottom: 10px;">${inst}</li>`).join('')}
                                    </ol>
                                </div>
                            </div>
                            
                            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <p style="margin: 0; color: #666; font-size: 0.9em;">
                                    <i class="fas fa-calendar"></i> Added: ${new Date(recipe.created_at).toLocaleDateString()} at ${new Date(recipe.created_at).toLocaleTimeString()}
                                </p>
                            </div>
                            
                            <div style="display: flex; gap: 15px; margin-top: 30px;">
                                <button class="btn" onclick="openEditModal(${recipe.id})" style="flex: 1;">
                                    <i class="fas fa-edit"></i> Edit Recipe
                                </button>
                                <button class="btn btn-outline" onclick="closeModal()" style="flex: 1;">
                                    <i class="fas fa-times"></i> Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        })
        .catch(error => {
            alert('Error loading recipe: ' + error.message);
        });
}

// Closes the recipe view modal
function closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) modal.remove();
}

// ============ ADD RECIPE FORM ============
// Adds a new ingredient input field to the form
function addIngredientField() {
    const container = document.getElementById('ingredients-container');
    const div = document.createElement('div');
    div.className = 'ingredient-item';
    div.innerHTML = `
        <input type="text" class="ingredient-input" placeholder="e.g., 2 cups all-purpose flour" data-index="${ingredientCount}">
        <button type="button" class="remove-btn" onclick="removeIngredient(${ingredientCount})">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
    ingredientCount++;
}

// Removes an ingredient field from the form
function removeIngredient(index) {
    const input = document.querySelector(`.ingredient-input[data-index="${index}"]`);
    if (input) {
        const container = document.getElementById('ingredients-container');
        const inputs = container.querySelectorAll('.ingredient-input');
        if (inputs.length <= 1) {
            alert('At least one ingredient is required');
            return;
        }
        input.parentElement.remove();
    }
}

// Adds a new instruction textarea field to the form
function addInstructionField() {
    const container = document.getElementById('instructions-container');
    const div = document.createElement('div');
    div.className = 'instruction-item';
    div.innerHTML = `
        <textarea class="instruction-input" placeholder="Step..." data-index="${instructionCount}" rows="2"></textarea>
        <button type="button" class="remove-btn" onclick="removeInstruction(${instructionCount})">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
    instructionCount++;
}

// Removes an instruction field from the form
function removeInstruction(index) {
    const textarea = document.querySelector(`.instruction-input[data-index="${index}"]`);
    if (textarea) {
        const container = document.getElementById('instructions-container');
        const inputs = container.querySelectorAll('.instruction-input');
        if (inputs.length <= 1) {
            alert('At least one instruction step is required');
            return;
        }
        textarea.parentElement.remove();
    }
}

// Clears all fields in the recipe form
function clearRecipeForm() {
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('prep-time').value = '15';
    document.getElementById('cook-time').value = '30';
    document.getElementById('servings').value = '4';
    document.getElementById('category').value = 'dinner';
    
    document.getElementById('ingredients-container').innerHTML = `
        <div class="ingredient-item">
            <input type="text" class="ingredient-input" placeholder="e.g., 2 cups all-purpose flour" data-index="0">
            <button type="button" class="remove-btn" onclick="removeIngredient(0)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.getElementById('instructions-container').innerHTML = `
        <div class="instruction-item">
            <textarea class="instruction-input" placeholder="Step 1..." data-index="0" rows="2"></textarea>
            <button type="button" class="remove-btn" onclick="removeInstruction(0)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.getElementById('save-status').innerHTML = '';
    ingredientCount = 1;
    instructionCount = 1;
}

// Saves a new recipe or updates an existing one
function saveRecipe() {
    // Check if we're editing an existing recipe
    const statusDiv = document.getElementById('save-status');
    const isEditing = statusDiv.innerHTML.includes('Editing Recipe');
    let recipeId = null;
    
    if (isEditing && currentRecipeId) {
        recipeId = currentRecipeId;
    }
    
    // Collect form data
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const category = document.getElementById('category').value;
    const prepTime = parseInt(document.getElementById('prep-time').value) || 0;
    const cookTime = parseInt(document.getElementById('cook-time').value) || 0;
    const servings = parseInt(document.getElementById('servings').value) || 4;
    
    // Collect ingredients
    const ingredientInputs = document.querySelectorAll('.ingredient-input');
    const ingredients = Array.from(ingredientInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    // Collect instructions
    const instructionInputs = document.querySelectorAll('.instruction-input');
    const instructions = Array.from(instructionInputs)
        .map(textarea => textarea.value.trim())
        .filter(value => value !== '');
    
    // Validation
    if (!title) {
        alert('Please enter a recipe title');
        return;
    }
    
    if (ingredients.length === 0) {
        alert('Please add at least one ingredient');
        return;
    }
    
    if (instructions.length === 0) {
        alert('Please add at least one instruction');
        return;
    }
    
    // Prepare recipe object
    const recipe = {
        title: title,
        description: description,
        ingredients: ingredients,
        instructions: instructions,
        prep_time: prepTime,
        cook_time: cookTime,
        servings: servings,
        category: category
    };
    
    // Show saving status
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            ${isEditing ? 'Updating recipe...' : 'Saving recipe...'}
        </div>
    `;
    
    // Determine URL and method
    const url = recipeId ? `/api/recipes/${recipeId}` : '/api/recipes';
    const method = recipeId ? 'PUT' : 'POST';
    
    // Send to backend
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipe)
    })
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    })
    .then(data => {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                <strong>Recipe ${recipeId ? 'updated' : 'saved'} successfully!</strong></p>
                <p>Title: ${recipe.title} | ID: ${data.id || recipeId}</p>
                <p>${data.message}</p>
            </div>
        `;
        
        // Clear form if it was a new recipe
        if (!recipeId) {
            clearRecipeForm();
        } else {
            currentRecipeId = null;
        }
        
        // Reload recipes
        setTimeout(() => {
            loadRecipes();
            showTab('recipes');
        }, 1500);
    })
    .catch(error => {
        statusDiv.innerHTML = `
            <div class="status-box error">
                <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                <strong>Error ${recipeId ? 'updating' : 'saving'} recipe!</strong></p>
                <p>${error.message}</p>
            </div>
        `;
        console.error('Save error:', error);
    });
}

// ============ EDIT RECIPE MODAL ============
// Opens modal to edit an existing recipe
function openEditModal(recipeId) {
    currentRecipeId = recipeId;
    
    fetch(`/api/recipes/${recipeId}`)
        .then(response => response.json())
        .then(recipe => {
            // Populate the edit form
            document.getElementById('edit-title').value = recipe.title;
            document.getElementById('edit-description').value = recipe.description || '';
            document.getElementById('edit-category').value = recipe.category;
            document.getElementById('edit-prep-time').value = recipe.prep_time;
            document.getElementById('edit-cook-time').value = recipe.cook_time;
            document.getElementById('edit-servings').value = recipe.servings;
            
            // Clear and populate ingredients
            const ingredientsContainer = document.getElementById('edit-ingredients-container');
            ingredientsContainer.innerHTML = '';
            recipe.ingredients.forEach((ing, index) => {
                const div = document.createElement('div');
                div.className = 'ingredient-item';
                div.innerHTML = `
                    <input type="text" class="ingredient-input" value="${ing}" data-index="${index}">
                    <button type="button" class="remove-btn" onclick="removeEditIngredient(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                ingredientsContainer.appendChild(div);
            });
            
            // Clear and populate instructions
            const instructionsContainer = document.getElementById('edit-instructions-container');
            instructionsContainer.innerHTML = '';
            recipe.instructions.forEach((inst, index) => {
                const div = document.createElement('div');
                div.className = 'instruction-item';
                div.innerHTML = `
                    <textarea class="instruction-input" data-index="${index}" rows="2">${inst}</textarea>
                    <button type="button" class="remove-btn" onclick="removeEditInstruction(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                instructionsContainer.appendChild(div);
            });
            
            // Show modal
            document.getElementById('edit-recipe-modal').style.display = 'block';
            closeModal(); // Close view modal if open
        })
        .catch(error => {
            alert('Error loading recipe for editing: ' + error.message);
        });
}

// Closes the edit recipe modal
function closeEditModal() {
    document.getElementById('edit-recipe-modal').style.display = 'none';
    currentRecipeId = null;
}

// Adds a new ingredient field to the edit form
function addEditIngredientField() {
    const container = document.getElementById('edit-ingredients-container');
    const inputs = container.querySelectorAll('.ingredient-input');
    const index = inputs.length;
    
    const div = document.createElement('div');
    div.className = 'ingredient-item';
    div.innerHTML = `
        <input type="text" class="ingredient-input" placeholder="e.g., 2 cups all-purpose flour" data-index="${index}">
        <button type="button" class="remove-btn" onclick="removeEditIngredient(${index})">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

// Removes an ingredient field from the edit form
function removeEditIngredient(index) {
    const input = document.querySelector(`#edit-ingredients-container .ingredient-input[data-index="${index}"]`);
    if (input) {
        const container = document.getElementById('edit-ingredients-container');
        const inputs = container.querySelectorAll('.ingredient-input');
        if (inputs.length <= 1) {
            alert('At least one ingredient is required');
            return;
        }
        input.parentElement.remove();
    }
}

// Adds a new instruction field to the edit form
function addEditInstructionField() {
    const container = document.getElementById('edit-instructions-container');
    const inputs = container.querySelectorAll('.instruction-input');
    const index = inputs.length;
    
    const div = document.createElement('div');
    div.className = 'instruction-item';
    div.innerHTML = `
        <textarea class="instruction-input" placeholder="Step..." data-index="${index}" rows="2"></textarea>
        <button type="button" class="remove-btn" onclick="removeEditInstruction(${index})">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

// Removes an ingredient field from the edit form
function removeEditInstruction(index) {
    const textarea = document.querySelector(`#edit-instructions-container .instruction-input[data-index="${index}"]`);
    if (textarea) {
        const container = document.getElementById('edit-instructions-container');
        const inputs = container.querySelectorAll('.instruction-input');
        if (inputs.length <= 1) {
            alert('At least one instruction step is required');
            return;
        }
        textarea.parentElement.remove();
    }
}

// Updates an existing recipe with edited data
function updateRecipe() {
    if (!currentRecipeId) return;
    
    const statusDiv = document.getElementById('edit-save-status');
    
    // Collect form data
    const title = document.getElementById('edit-title').value.trim();
    const description = document.getElementById('edit-description').value.trim();
    const category = document.getElementById('edit-category').value;
    const prepTime = parseInt(document.getElementById('edit-prep-time').value) || 0;
    const cookTime = parseInt(document.getElementById('edit-cook-time').value) || 0;
    const servings = parseInt(document.getElementById('edit-servings').value) || 4;
    
    // Collect ingredients
    const ingredientInputs = document.querySelectorAll('#edit-ingredients-container .ingredient-input');
    const ingredients = Array.from(ingredientInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    // Collect instructions
    const instructionInputs = document.querySelectorAll('#edit-instructions-container .instruction-input');
    const instructions = Array.from(instructionInputs)
        .map(textarea => textarea.value.trim())
        .filter(value => value !== '');
    
    // Validation
    if (!title) {
        alert('Please enter a recipe title');
        return;
    }
    
    if (ingredients.length === 0) {
        alert('Please add at least one ingredient');
        return;
    }
    
    if (instructions.length === 0) {
        alert('Please add at least one instruction');
        return;
    }
    
    // Prepare recipe object
    const recipe = {
        title: title,
        description: description,
        ingredients: ingredients,
        instructions: instructions,
        prep_time: prepTime,
        cook_time: cookTime,
        servings: servings,
        category: category
    };
    
    // Show saving status
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Updating recipe...
        </div>
    `;
    
    // Send update request
    fetch(`/api/recipes/${currentRecipeId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipe)
    })
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    })
    .then(data => {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                <strong>Recipe updated successfully!</strong></p>
                <p>${data.message}</p>
            </div>
        `;
        
        // Close modal and refresh after delay
        setTimeout(() => {
            closeEditModal();
            loadAllRecipes();
            showTab('recipes');
            if (document.getElementById('recipe-modal')) {
                closeModal();
            }
        }, 1500);
    })
    .catch(error => {
        statusDiv.innerHTML = `
            <div class="status-box error">
                <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                <strong>Error updating recipe!</strong></p>
                <p>${error.message}</p>
            </div>
        `;
        console.error('Update error:', error);
    });
}

// Deletes a recipe by ID
function deleteRecipeById(id) {
    // Handle case where id might be undefined (if called from button without parameter)
    const recipeId = id || currentRecipeId;
    
    if (!recipeId) {
        alert('Error: No recipe selected for deletion');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
        return;
    }
    
    console.log("Deleting recipe ID:", recipeId);
    
    fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    })
    .then(data => {
        alert('✅ Recipe deleted successfully!');
        
        // Close all modals
        closeModal();
        closeEditModal();
        
        // Refresh recipes
        loadRecipes();
        
        // Go to recipes tab
        showTab('recipes');
    })
    .catch(error => {
        alert('Error deleting recipe: ' + error.message);
    });
}

// ============ MEAL PLANNER FUNCTIONS ============
// Loads meal plan for selected week
function loadMealPlan() {
    const weekInput = document.getElementById('week-selector');
    if (!weekInput.value) {
        alert('Please select a week first');
        return;
    }
    
    currentWeek = weekInput.value;
    const statusDiv = document.getElementById('meal-plan-status');
    
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Loading meal plan for week ${currentWeek}...
        </div>
    `;
    
    // Load recipes first
    fetch('/api/recipes')
        .then(response => response.json())
        .then(recipes => {
            allRecipesForMealPlan = recipes;
            
            // Try to load from backend first
            return fetch(`/api/meal-plan?week_start=${currentWeek}`)
                .then(response => {
                    if (!response.ok) throw new Error('Backend error');
                    return response.json();
                })
                .then(mealPlan => {
                    // Keep a local copy so the grocery list can use plans that were saved on the server
                    try {
                        const planned = mealPlan
                            .filter(entry => entry.recipe_id)
                            .map(entry => ({
                                day: entry.day,
                                meal_type: entry.meal_type,
                                recipe_id: entry.recipe_id,
                                recipe_title: entry.recipe_title
                            }));
                        if (planned.length > 0) {
                            localStorage.setItem(`mealplan-${currentWeek}`, JSON.stringify(planned));
                        }
                    } catch (storageError) {
                        // Local storage is optional
                    }
                    return mealPlan;
                })
                .catch(backendError => {
                    // Fall back to localStorage
                    const saved = localStorage.getItem(`mealplan-${currentWeek}`);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        // Convert localStorage format to match backend format
                        return parsed.map(entry => ({
                            day: entry.day,
                            meal_type: entry.meal_type,
                            recipe_id: entry.recipe_id,
                            recipe_title: entry.recipe_title
                        }));
                    }
                    
                    return []; // No saved data
                });
        })
        .then(mealPlan => {
            renderMealPlanner(mealPlan);
            
            // Show success message with count
            let message = `Meal plan loaded for week ${currentWeek}`;
            if (mealPlan && mealPlan.length > 0) {
                message += `<br><span style="font-size: 0.9em; color: #666;">Found ${mealPlan.length} saved meals</span>`;
            }
            
            statusDiv.innerHTML = `
                <div class="status-box">
                    <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                    ${message}</p>
                </div>
            `;
        })
        .catch(error => {
            statusDiv.innerHTML = `
                <div class="status-box error">
                    <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                    Error loading meal plan: ${error.message}</p>
                </div>
            `;
            renderMealPlanner([]);
        });
}

// Alias for loadAllRecipes - Loads recipes list
function loadRecipes() {
    loadAllRecipes();
}

/*function deleteRecipe(id) {
    if (!confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
        return;
    }
    
    fetch(`/api/recipes/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    })
    .then(data => {
        alert('✅ Recipe deleted successfully!');
        
        // Close modals
        closeModal();
        const editModal = document.getElementById('edit-recipe-modal');
        if (editModal) editModal.style.display = 'none';
        
        // Refresh recipes
        loadRecipes();
    })
    .catch(error => {
        alert('Error deleting recipe: ' + error.message);
    });
}*/

// Renders the meal planner calendar with recipes
function renderMealPlanner(mealPlan) {
    const container = document.getElementById('meal-plan-container');
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    
    // Group meal plan by day
    const mealPlanByDay = {};
    days.forEach(day => {
        mealPlanByDay[day] = {};
        mealTypes.forEach(type => {
            mealPlanByDay[day][type] = null;
        });
    });
    
    // Populate with actual data
    mealPlan.forEach(entry => {
        if (entry && entry.day && entry.meal_type) {
            // Normalize day name
            const normalizedDay = entry.day.charAt(0).toUpperCase() + entry.day.slice(1).toLowerCase();
            
            // Find the recipe
            let recipe = null;
            if (entry.recipe_id) {
                recipe = allRecipesForMealPlan.find(r => r.id === entry.recipe_id);
            } else if (entry.recipe_title) {
                recipe = allRecipesForMealPlan.find(r => r.title === entry.recipe_title);
            }
            
            if (recipe && mealPlanByDay[normalizedDay] && mealPlanByDay[normalizedDay][entry.meal_type] !== undefined) {
                mealPlanByDay[normalizedDay][entry.meal_type] = {
                    day: normalizedDay,
                    meal_type: entry.meal_type,
                    recipe_id: recipe.id,
                    recipe_title: recipe.title,
                    recipe: recipe
                };
            }
        }
    });
    
    // Create HTML table
    let html = `
        <div id="meal-calendar" style="display: grid; grid-template-columns: 120px repeat(${days.length}, 1fr); gap: 1px; background: #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
            <div style="background: #4CAF50; color: white; padding: 15px; font-weight: bold;">Meal Type</div>
    `;
    
    // Day headers
    days.forEach(day => {
        html += `<div style="background: #4CAF50; color: white; padding: 15px; text-align: center; font-weight: bold;">${day}</div>`;
    });
    
    // Meal rows
    mealTypes.forEach(mealType => {
        html += `<div style="background: #f5f5f5; padding: 15px; font-weight: bold; border-right: 1px solid #e0e0e0;">${mealType}</div>`;
        
        days.forEach(day => {
            const entry = mealPlanByDay[day][mealType];
            const slotId = `slot-${day}-${mealType}`;
            
            html += `
                <div id="${slotId}"
                    class="meal-slot"
                    data-day="${day}"
                    data-meal-type="${mealType}"
                    style="background: white; padding: 15px; min-height: 130px; border-right: 1px solid #e0e0e0; position: relative; cursor: pointer; transition: all 0.2s ease;"
                    ondragover="handleDragOver(event)"
                    ondragleave="handleDragLeave(event)"
                    ondrop="handleDrop(event)">
                    ${entry ? renderMealPlanEntry(entry) : renderEmptySlot(day, mealType)}
                </div>
            `;
        });
    });
    
    html += `</div>`;
    
    // Add recipe selection panel
    html += `
        <div style="margin-top: 20px;">
            <h3><i class="fas fa-book"></i> Available Recipes</h3>
            <p style="color: #666; margin-bottom: 15px;">
                <i class="fas fa-info-circle"></i> Drag recipes into the calendar slots above
            </p>
            <div id="recipe-drag-area" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-top: 10px;">
    `;
    
    if (allRecipesForMealPlan.length === 0) {
        html += `
            <div style="text-align: center; padding: 30px; color: #666;">
                <i class="fas fa-book-open" style="font-size: 3em; margin-bottom: 15px;"></i>
                <p>No recipes found. Add some recipes first!</p>
            </div>
        `;
    } else {
        allRecipesForMealPlan.forEach(recipe => {
            html += `
                <div class="recipe-card draggable-recipe"
                     draggable="true"
                     data-recipe-id="${recipe.id}"
                     data-recipe-title="${recipe.title}"
                     ondragstart="handleDragStart(event)"
                     style="cursor: grab;">
                    <div class="recipe-header" style="padding: 15px;">
                        <div class="recipe-title" style="font-size: 1.1em;">${recipe.title}</div>
                        <div class="recipe-meta">
                            <span>${recipe.category}</span>
                            <span>${(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Renders a meal plan entry in the calendar lsit
function renderMealPlanEntry(entry) {
    return `
        <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; height: 100%; position: relative;">
            <strong>${entry.recipe_title || 'No Recipe'}</strong>
            ${entry.recipe && entry.recipe.category ? 
                `<p style="margin: 5px 0; font-size: 0.9em; color: #666;">${entry.recipe.category}</p>` : ''}
            <div style="position: absolute; bottom: 10px; right: 10px;">
                <button onclick="removeFromMealPlan('${entry.day}', '${entry.meal_type}')" 
                        style="background: #f44336; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 12px;">
                    ✕
                </button>
            </div>
        </div>
    `;
}

// Renders an empty meal plan slot
function renderEmptySlot(day, mealType) {
    return `
        <div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 0.9em;">
            <div style="text-align: center;">
                <div>Drop recipe here</div>
                <div style="font-size: 0.8em;">${day} ${mealType}</div>
            </div>
        </div>
    `;
}

// ============ DRAG AND DROP FUNCTIONS ============
// Handles drag start event for reipe cards
function handleDragStart(event) {
    const recipeId = event.target.getAttribute('data-recipe-id');
    const recipeTitle = event.target.getAttribute('data-recipe-title');
    
    event.dataTransfer.setData('recipeId', recipeId);
    event.dataTransfer.setData('recipeTitle', recipeTitle);
    event.dataTransfer.setData('text/plain', recipeTitle);
    
    event.target.style.opacity = '0.6';
    
    // Add dragend listener to reset opacity
    event.target.addEventListener('dragend', function(e) {
        e.target.style.opacity = '1';
        
        // Also reset any slots that might still be highlighted
        document.querySelectorAll('.meal-slot').forEach(slot => {
            slot.style.backgroundColor = 'white';
            slot.style.border = 'none';
            slot.style.boxShadow = 'none';
        });
    }, { once: true }); // Only listen once
    
    console.log('Dragging:', recipeTitle, 'ID:', recipeId);
}

// Handles drag over event for meal slots
function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const slot = event.currentTarget;
    slot.style.backgroundColor = '#f0f8ff';
    slot.style.border = '2px dashed #4CAF50';
    slot.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.3)';
}

// Handles drag leave event for meal slots
function handleDragLeave(event) {
    event.preventDefault();
    
    // Only reset if we're leaving the actual slot, not entering a child element
    const relatedTarget = event.relatedTarget;
    const currentTarget = event.currentTarget;
    
    // Check if we're leaving the slot for real (not just moving between child elements)
    if (!currentTarget.contains(relatedTarget)) {
        currentTarget.style.backgroundColor = 'white';
        currentTarget.style.border = 'none';
        currentTarget.style.boxShadow = 'none';
    }
}

// Handles drop event for meal slots
function handleDrop(event) {
    event.preventDefault();
    
    const slot = event.currentTarget;
    slot.style.backgroundColor = 'white';
    slot.style.border = 'none';
    slot.style.boxShadow = 'none';
    
    const recipeId = event.dataTransfer.getData('recipeId');
    const recipeTitle = event.dataTransfer.getData('recipeTitle');
    const day = slot.getAttribute('data-day');
    const mealType = slot.getAttribute('data-meal-type');
    
    if (!recipeId) {
        alert('Error: Could not get recipe data. Please try dragging again.');
        return;
    }
    
    if (!currentWeek) {
        alert('Please select a week first');
        return;
    }
    
    // Show immediate feedback
    event.currentTarget.innerHTML = `
        <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; height: 100%;">
            <strong>${recipeTitle}</strong>
            <p style="margin: 5px 0; font-size: 0.9em; color: #666;">Adding to ${day} ${mealType}...</p>
        </div>
    `;
    
    // Make API call and auto-save after successful drop
    addRecipeToMealPlan(recipeId, recipeTitle, day, mealType);
}

// Adds a recipe to the meal plan via API
function addRecipeToMealPlan(recipeId, recipeTitle, day, mealType) {
    const statusDiv = document.getElementById('meal-plan-status');
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Adding ${recipeTitle} to ${day} ${mealType}...
        </div>
    `;
    
    // Keep recipe visible in slot
    const slotId = `slot-${day}-${mealType}`;
    const slot = document.getElementById(slotId);
    if (slot) {
        slot.innerHTML = `
            <div style="background: #e8f5e9; padding: 10px; border-radius: 5px; height: 100%; position: relative;">
                <strong>${recipeTitle}</strong>
                <div style="position: absolute; bottom: 10px; right: 10px;">
                    <button onclick="removeFromMealPlan('${day}', '${mealType}')" 
                            style="background: #f44336; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 12px;">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }
    
    // Make API call
    fetch('/api/meal-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            week_start: currentWeek,
            day: day,
            meal_type: mealType,
            recipe_id: parseInt(recipeId),
            notes: ''
        })
    })
    .then(response => response.json())
    .then(data => {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                ${recipeTitle} added to ${day} ${mealType}</p>
            </div>
        `;
        
        // AUTO-SAVE after adding
        autoSaveMealPlan();
    })
    .catch(error => {
        statusDiv.innerHTML = `
            <div class="status-box error">
                <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                Error: ${error.message}</p>
            </div>
        `;
    });
}

// Removes a recipe from the meal plan
function removeFromMealPlan(day, mealType) {
    if (!confirm(`Remove recipe from ${day} ${mealType}?`)) return;
    
    const statusDiv = document.getElementById('meal-plan-status');
    const slotId = `slot-${day}-${mealType}`;
    const slot = document.getElementById(slotId);
    
    // Clear the slot immediately
    if (slot) {
        slot.innerHTML = renderEmptySlot(day, mealType);
    }
    
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Removing recipe from ${day} ${mealType}...
        </div>
    `;
    
    // Try backend API first
    fetch('/api/meal-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            week_start: currentWeek,
            day: day,
            meal_type: mealType,
            recipe_id: null,
            notes: ''
        })
    })
    .then(response => response.json())
    .then(data => {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                Recipe removed from ${day} ${mealType}</p>
            </div>
        `;
        
        // AUTO-SAVE after removing
        autoSaveMealPlan();
    })
    .catch(error => {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                Recipe removed locally from ${day} ${mealType}</p>
                <p style="font-size: 0.9em; color: #666;">(Backend error: ${error.message})</p>
            </div>
        `;
        
        // Still auto-save locally
        autoSaveMealPlan();
    });
}

// Saves the current meal plan to backend and localStorage
function saveMealPlan() {
    if (!currentWeek) {
        alert('Please select a week first');
        return;
    }
    
    const statusDiv = document.getElementById('meal-plan-status');
    const entries = [];
    
    // Check each meal slot
    document.querySelectorAll('.meal-slot').forEach(slot => {
        const day = slot.getAttribute('data-day');
        const mealType = slot.getAttribute('data-meal-type');
        
        // Check if this slot has a recipe by looking for the recipe card structure
        const recipeCard = slot.querySelector('[style*="background: #e8f5e9"]');
        
        if (recipeCard) {
            const recipeTitleElement = recipeCard.querySelector('strong');
            
            if (recipeTitleElement) {
                const recipeTitle = recipeTitleElement.textContent;
                
                // Skip placeholder text
                if (recipeTitle.includes('Drop recipe here') || 
                    recipeTitle.includes('Drag recipe here') ||
                    recipeTitle === 'No Recipe') {
                    return;
                }
                
                // Find the recipe in our list
                const recipe = allRecipesForMealPlan.find(r => r.title === recipeTitle);
                
                if (recipe) {
                    entries.push({
                        day: day,
                        meal_type: mealType,
                        recipe_id: recipe.id,
                        recipe_title: recipe.title
                    });
                    console.log(`Found recipe: ${recipeTitle} for ${day} ${mealType}`);
                }
            }
        }
    });
    
    console.log('Collected entries:', entries);
    
    if (entries.length === 0) {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-info-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                No recipes found in calendar. Add some recipes first.</p>
            </div>
        `;
        return;
    }
    
    // Show saving status
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Saving ${entries.length} meals for week ${currentWeek}...
        </div>
    `;
    
    // Save to localStorage
    localStorage.setItem(`mealplan-${currentWeek}`, JSON.stringify(entries));
    
    // Also save to backend if you want
    fetch('/api/meal-plan/bulk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            week_start: currentWeek,
            meal_plan: entries
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Backend save response:', data);
        
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                Meal plan saved successfully!</p>
                <p>${entries.length} meals saved for week ${currentWeek}</p>
                <p style="margin-top: 5px; font-size: 0.9em;">
                    <i class="fas fa-shield-alt"></i> Your meal plan is now saved and will be remembered
                </p>
            </div>
        `;
        
        updateSavedWeeksList();
    })
    .catch(error => {
        console.error('Backend save error:', error);
        
        // Still show success for localStorage
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                Meal plan saved locally!</p>
                <p>${entries.length} meals saved for week ${currentWeek}</p>
                <p style="margin-top: 5px; font-size: 0.9em;">
                    <i class="fas fa-info-circle"></i> Saved to browser storage
                </p>
            </div>
        `;
        
        updateSavedWeeksList();
    });
}

// Automatically saves meal plan after changes
function autoSaveMealPlan() {
    if (!currentWeek) return;
    
    const entries = [];
    
    document.querySelectorAll('.meal-slot').forEach(slot => {
        const day = slot.getAttribute('data-day');
        const mealType = slot.getAttribute('data-meal-type');
        
        const recipeDiv = slot.querySelector('div[style*="background: #e8f5e9"]');
        
        if (recipeDiv) {
            const titleElement = recipeDiv.querySelector('strong');
            if (titleElement) {
                const recipeTitle = titleElement.textContent;
                
                // Skip placeholder text
                if (recipeTitle.includes('Drop recipe here') || 
                    recipeTitle.includes('Drag recipe here') ||
                    recipeTitle.includes('Adding to') ||
                    recipeTitle === 'No Recipe') {
                    return;
                }
                
                const recipe = allRecipesForMealPlan.find(r => r.title === recipeTitle);
                
                if (recipe) {
                    entries.push({
                        day: day,
                        meal_type: mealType,
                        recipe_id: recipe.id,
                        recipe_title: recipe.title
                    });
                }
            }
        }
    });
    
    // Save to localStorage ONLY if there are entries
    if (entries.length > 0) {
        localStorage.setItem(`mealplan-${currentWeek}`, JSON.stringify(entries));
    } else {
        // Remove empty weeks from localStorage
        localStorage.removeItem(`mealplan-${currentWeek}`);
    }
    
    // Update saved weeks dropdown
    updateSavedWeeksList();
}

// Clears all meals for the current week
function clearCurrentWeek() {
    if (!currentWeek) {
        alert('Please select a week first');
        return;
    }
    
    if (!confirm(`Clear all meals for week ${currentWeek}? This will remove it from Saved Weeks.`)) return;
    
    const statusDiv = document.getElementById('meal-plan-status');
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Clearing meal plan...
        </div>
    `;
    
    // Clear all meal slots
    document.querySelectorAll('.meal-slot').forEach(slot => {
        const day = slot.getAttribute('data-day');
        const mealType = slot.getAttribute('data-meal-type');
        slot.innerHTML = renderEmptySlot(day, mealType);
    });
    
    // Remove from localStorage
    localStorage.removeItem(`mealplan-${currentWeek}`);
    
    // Clear from backend too
    fetch(`/api/meal-plan/week?week_start=${currentWeek}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                Meal plan cleared for week ${currentWeek}</p>
            </div>
        `;
        
        // Update the saved weeks dropdown
        updateSavedWeeksList();
    })
    .catch(error => {
        statusDiv.innerHTML = `
            <div class="status-box">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                Local meal plan cleared for week ${currentWeek}</p>
            </div>
        `;
        
        // Still update saved weeks dropdown even if backend fails
        updateSavedWeeksList();
    });
}

// ============ SAVED WEEKS MANAGEMENT ============
// Updates the saved weeks dropdown with weeks from localStorage
function updateSavedWeeksList() {
    const savedWeeksSelect = document.getElementById('saved-weeks');
    if (!savedWeeksSelect) return;
    
    const currentSelection = savedWeeksSelect.value;
    savedWeeksSelect.innerHTML = '<option value="">Select saved week...</option>';
    
    const savedWeeks = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('mealplan-')) {
            const week = key.replace('mealplan-', '');
            
            try {
                const savedData = localStorage.getItem(key);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed && parsed.length > 0) {
                        savedWeeks.push(week);
                    }
                }
            } catch (e) {
                // Silent fail
            }
        }
    }
    
    savedWeeks.sort((a, b) => {
        const [yearA, weekA] = a.split('-W').map(Number);
        const [yearB, weekB] = b.split('-W').map(Number);
        
        if (yearA !== yearB) return yearB - yearA;
        return weekB - weekA;
    });
    
    savedWeeks.forEach(week => {
        const option = document.createElement('option');
        option.value = week;
        
        const [year, weekNum] = week.split('-W');
        option.textContent = `Week ${parseInt(weekNum)}, ${year}`;
        
        try {
            const savedData = localStorage.getItem(`mealplan-${week}`);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed && parsed.length > 0) {
                    option.textContent += ` (${parsed.length} meals)`;
                }
            }
        } catch (e) {
            // Silent fail
        }
        
        savedWeeksSelect.appendChild(option);
    });
    
    if (currentSelection && savedWeeks.includes(currentSelection)) {
        savedWeeksSelect.value = currentSelection;
    }
}

// Loads a saved week into the meal planner
function loadSavedWeek(week) {
    if (!week) return;
    
    // Set the week selector
    document.getElementById('week-selector').value = week;
    
    // Load the meal plan
    loadMealPlan();
}

// ============ GROCERY LIST FUNCTIONS ============
// Generates a grocery list from the meal plan
function generateGroceryList() {
    const weekInput = document.getElementById('grocery-week-selector');
    const desiredPeople = parseInt(document.getElementById('servings-multiplier').value);
    
    if (!weekInput.value) {
        alert('Please select a week first');
        return;
    }
    
    const week = weekInput.value;
    const statusDiv = document.getElementById('grocery-status');
    
    statusDiv.innerHTML = `
        <div class="status-box">
            <div class="spinner" style="width: 20px; height: 20px; display: inline-block; margin-right: 10px;"></div>
            Generating grocery list for week ${week}...
        </div>
    `;
    
    // First check if we have a meal plan for this week
    const savedMealPlan = localStorage.getItem(`mealplan-${week}`);
    if (!savedMealPlan) {
        statusDiv.innerHTML = `
            <div class="status-box error">
                <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                No meal plan found for week ${week}</p>
                <p>Please create a meal plan first in the "Weekly Meal Plan" section.</p>
            </div>
        `;
        return;
    }
    
    try {
        // Parse the saved meal plan
        const mealPlanEntries = JSON.parse(savedMealPlan);
        
        if (!mealPlanEntries.length) {
            statusDiv.innerHTML = `
                <div class="status-box">
                    <p><i class="fas fa-info-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                    Meal plan is empty for week ${week}</p>
                    <p>Add recipes to your meal plan first.</p>
                </div>
            `;
            return;
        }
        
        // Get all recipe IDs from the meal plan
        const recipeIds = mealPlanEntries.map(entry => entry.recipe_id);
        
        // Fetch all recipes from backend
        fetch('/api/recipes')
            .then(response => {
                if (!response.ok) throw new Error('Failed to load recipes');
                return response.json();
            })
            .then(allRecipes => {
                // Filter to only recipes in the meal plan
                const plannedRecipes = allRecipes.filter(recipe => 
                    recipeIds.includes(recipe.id)
                );
                
                if (plannedRecipes.length === 0) {
                    throw new Error('Could not find the recipes in your meal plan');
                }
                
                // Collect all ingredients with PROPER SCALING
                const ingredientMap = new Map();
                
                plannedRecipes.forEach(recipe => {
                    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                        const recipeServings = recipe.servings || 4; // Default to 4 if not specified
                        
                        // Calculate how much to scale this recipe
                        const scaleFactor = desiredPeople / recipeServings;
                        
                        recipe.ingredients.forEach(ingredient => {
                            const trimmedIngredient = ingredient.trim();
                            
                            // Apply scaling to quantities
                            let scaledIngredient = trimmedIngredient;
                            if (scaleFactor !== 1) {
                                scaledIngredient = scaleIngredientQuantity(trimmedIngredient, scaleFactor);
                            }
                            
                            // Track ingredient counts
                            if (ingredientMap.has(trimmedIngredient)) {
                                const existing = ingredientMap.get(trimmedIngredient);
                                existing.recipe_count += 1;
                                existing.scaled_quantity = scaledIngredient;
                            } else {
                                ingredientMap.set(trimmedIngredient, {
                                    ingredient: trimmedIngredient,
                                    raw: trimmedIngredient,
                                    scaled_quantity: scaledIngredient,
                                    recipe_count: 1,
                                    original_servings: recipeServings,
                                    desired_people: desiredPeople,
                                    scale_factor: scaleFactor.toFixed(2)
                                });
                            }
                        });
                    }
                });
                
                // Convert map to array
                const ingredients = Array.from(ingredientMap.values());
                
                // Create grocery list data structure
                const groceryData = {
                    week_start: week,
                    desired_people: desiredPeople,
                    ingredients: ingredients,
                    count: ingredients.length,
                    meal_plan_summary: mealPlanEntries
                };
                
                // Display the grocery list
                displayGroceryList(groceryData);
                
                // Load any saved progress after a short delay
                setTimeout(() => {
                    loadGroceryProgress();
                }, 100);
                
                // Show success message with clear explanation
                const scaleExplanation = ingredients.length > 0 && ingredients[0].scale_factor !== "1.00" 
                    ? ` (scaled ${ingredients[0].scale_factor}x from original recipe size)`
                    : '';
                
                statusDiv.innerHTML = `
                    <div class="status-box">
                        <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                        Grocery list generated successfully!</p>
                        <p>Found ${ingredients.length} items from ${plannedRecipes.length} recipes</p>
                        <p style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            <i class="fas fa-info-circle"></i> 
                            Shopping list for <strong>${desiredPeople} people</strong>${scaleExplanation}
                        </p>
                    </div>
                `;
                
            })
            .catch(error => {
                console.error('Error generating grocery list:', error);
                statusDiv.innerHTML = `
                    <div class="status-box error">
                        <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                        ${error.message}</p>
                        <p>Make sure you have recipes with ingredients saved.</p>
                    </div>
                `;
            });
            
    } catch (error) {
        console.error('Error parsing meal plan:', error);
        statusDiv.innerHTML = `
            <div class="status-box error">
                <p><i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 10px;"></i> 
                Error: ${error.message}</p>
            </div>
        `;
    }
}

// Helper function to scale ingredient quantities
function scaleIngredientQuantity(ingredient, scaleFactor) {
    // If no scaling needed
    if (scaleFactor === 1) {
        return ingredient;
    }
    
    // Try to find a quantity at the beginning of the ingredient
    const quantityMatch = ingredient.match(/^(\d+[\d\/\.\-]*\s*)/);
    
    if (quantityMatch) {
        const quantityStr = quantityMatch[1].trim();
        const restOfIngredient = ingredient.substring(quantityMatch[0].length);
        
        try {
            // Handle fractions like "1/2"
            let quantity = 0;
            if (quantityStr.includes('/')) {
                const [num, den] = quantityStr.split('/').map(Number);
                quantity = num / den;
            } else if (quantityStr.includes('-')) {
                // Handle ranges like "3-4"
                const [min, max] = quantityStr.split('-').map(Number);
                quantity = (min + max) / 2;
            } else {
                quantity = parseFloat(quantityStr);
            }
            
            // Apply scale factor
            const newQuantity = quantity * scaleFactor;
            
            // Format nicely
            let formattedQuantity = newQuantity;
            if (Number.isInteger(newQuantity)) {
                formattedQuantity = newQuantity.toString();
            } else if (newQuantity % 1 === 0.5) {
                formattedQuantity = `${Math.floor(newQuantity)} 1/2`;
            } else if (newQuantity % 1 === 0.25) {
                formattedQuantity = `${Math.floor(newQuantity)} 1/4`;
            } else if (newQuantity % 1 === 0.75) {
                formattedQuantity = `${Math.floor(newQuantity)} 3/4`;
            } else if (newQuantity % 1 === 0.33) {
                formattedQuantity = `${Math.floor(newQuantity)} 1/3`;
            } else if (newQuantity % 1 === 0.67) {
                formattedQuantity = `${Math.floor(newQuantity)} 2/3`;
            } else {
                formattedQuantity = newQuantity.toFixed(1).replace('.0', '');
            }
            
            return `${formattedQuantity} ${restOfIngredient}`;
            
        } catch (e) {
            return ingredient;
        }
    }
    
    return ingredient;
}

// Displays the generated grocery list
function displayGroceryList(data) {
    document.getElementById('grocery-container').style.display = 'block';
    document.getElementById('no-grocery-list').style.display = 'none';
    
    // Update headers
    document.getElementById('grocery-list-title').textContent = `Grocery List - Week of ${data.week_start}`;
    document.getElementById('grocery-week-display').textContent = `Week: ${data.week_start}`;
    document.getElementById('grocery-item-count').textContent = `${data.count} items`;
    
    const desiredPeople = data.desired_people || 4;
    document.getElementById('grocery-servings-info').textContent = `For ${desiredPeople} people`;
    
    // Display meal plan summary
    const summaryDiv = document.getElementById('meal-plan-summary');
    if (data.meal_plan_summary && data.meal_plan_summary.length > 0) {
        let summaryHtml = `
            <h4 style="color: #4CAF50; margin-bottom: 15px;">
                <i class="fas fa-utensils"></i> This Week's Meals
            </h4>
            <div style="
                display: flex; 
                flex-wrap: wrap; 
                gap: 10px; 
                margin-bottom: 20px;
                background: #f9f9f9; 
                padding: 15px; 
                border-radius: 8px;
            ">
        `;
        
        const groupedByDay = {};
        data.meal_plan_summary.forEach(meal => {
            if (!groupedByDay[meal.day]) {
                groupedByDay[meal.day] = [];
            }
            if (meal.recipe_title) {
                groupedByDay[meal.day].push(`${meal.meal_type}: ${meal.recipe_title}`);
            }
        });
        
        // Create compact day cards
        Object.keys(groupedByDay).forEach(day => {
            if (groupedByDay[day].length > 0) {
                summaryHtml += `
                    <div style="
                        flex: 1;
                        min-width: 180px;
                        background: white;
                        padding: 12px;
                        border-radius: 6px;
                        border-left: 4px solid #4CAF50;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    ">
                        <strong style="color: #4CAF50;">${day}</strong>
                `;
                
                groupedByDay[day].forEach(meal => {
                    summaryHtml += `
                        <div style="
                            margin: 6px 0; 
                            padding-left: 8px;
                            font-size: 0.9em;
                            color: #555;
                            border-left: 2px solid #e0e0e0;
                        ">
                            • ${meal}
                        </div>
                    `;
                });
                
                summaryHtml += `</div>`;
            }
        });
        
        summaryHtml += `</div>`;
        summaryDiv.innerHTML = summaryHtml;
    } else {
        summaryDiv.innerHTML = `<p style="color: #666; padding: 10px; background: #f9f9f9; border-radius: 5px;">No meals planned for this week.</p>`;
    }
    
    // Display grocery items
    const itemsDiv = document.getElementById('grocery-list-items');
    let itemsHtml = '';
    
    if (data.ingredients && data.ingredients.length > 0) {
        data.ingredients.forEach((item, index) => {
            const displayText = item.scaled_quantity ? 
                `${item.scaled_quantity} ${item.ingredient}`.trim() : 
                item.raw || item.ingredient;
            
            itemsHtml += `
                <div class="grocery-item-row" data-index="${index}" 
                     style="
                        padding: 12px 15px;
                        border-bottom: 1px solid #e0e0e0;
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        transition: all 0.2s;
                        margin: 2px 0;
                        border-radius: 6px;
                        background: white;
                     "
                     onmouseover="this.style.backgroundColor='#f8f9fa'; this.style.transform='translateX(2px)';"
                     onmouseout="this.style.backgroundColor='white'; this.style.transform='translateX(0)';">
                    
                    <input type="checkbox" 
                           id="grocery-item-${index}" 
                           class="grocery-checkbox"
                           onchange="handleGroceryItemChange(${index})"
                           style="
                               margin-right: 15px;
                               width: 20px;
                               height: 20px;
                               cursor: pointer;
                               flex-shrink: 0;
                               accent-color: #4CAF50;
                           ">
                    
                    <label for="grocery-item-${index}" 
                           style="
                               flex: 1;
                               cursor: pointer;
                               display: flex;
                               align-items: center;
                               justify-content: space-between;
                               margin: 0;
                               padding: 5px 0;
                               user-select: none;
                           ">
                        <span id="grocery-text-${index}" style="
                            font-size: 1.05em;
                            color: #333;
                            flex: 1;
                        ">${displayText}</span>
                        
                        ${item.recipe_count > 1 ? 
                            `<span style="
                                font-size: 0.85em; 
                                color: #2E7D32;
                                background: #e8f5e9;
                                padding: 3px 10px;
                                border-radius: 20px;
                                margin-left: 10px;
                                font-weight: 600;
                                white-space: nowrap;
                            ">
                                <i class="fas fa-utensils" style="margin-right: 4px;"></i>
                                ${item.recipe_count}
                            </span>` 
                            : ''}
                        
                        ${item.scale_factor && item.scale_factor !== "1.00" ? 
                            `<span style="
                                font-size: 0.8em; 
                                color: #FF9800;
                                background: #fff3e0;
                                padding: 2px 6px;
                                border-radius: 10px;
                                margin-left: 8px;
                                font-weight: 600;
                                white-space: nowrap;
                            ">
                                <i class="fas fa-exchange-alt"></i>
                                Scaled ${item.scale_factor}x
                            </span>` 
                            : ''}
                    </label>
                </div>
            `;
        });
    } else {
        itemsHtml = `
            <div style="
                text-align: center; 
                padding: 40px 20px; 
                color: #666;
                background: #f9f9f9;
                border-radius: 8px;
            ">
                <i class="fas fa-shopping-basket" style="font-size: 3em; color: #ddd; margin-bottom: 15px;"></i>
                <h4>No Ingredients Found</h4>
                <p>Add recipes to your meal plan first.</p>
            </div>
        `;
    }
    
    itemsDiv.innerHTML = itemsHtml;
    
    // Add event listeners to make entire row clickable
    setTimeout(() => {
        document.querySelectorAll('.grocery-item-row').forEach(row => {
            row.addEventListener('click', function(e) {
                // Don't trigger if clicking on the checkbox directly
                if (e.target.type !== 'checkbox') {
                    const checkbox = this.querySelector('.grocery-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        const index = this.dataset.index;
                        handleGroceryItemChange(index);
                    }
                }
            });
        });
    }, 100);
    
    // Initialize shopping progress
    updateShoppingProgress();
}

// Handles checkbox change for grocery items
function handleGroceryItemChange(index) {
    const checkbox = document.getElementById(`grocery-item-${index}`);
    if (!checkbox) return;
    
    const textElement = document.getElementById(`grocery-text-${index}`);
    const row = checkbox.closest('.grocery-item-row');
    
    if (checkbox.checked) {
        if (textElement) {
            textElement.style.textDecoration = 'line-through';
            textElement.style.color = '#888';
            textElement.style.opacity = '0.7';
        }
        if (row) {
            row.style.backgroundColor = '#f0f0f0';
        }
    } else {
        if (textElement) {
            textElement.style.textDecoration = 'none';
            textElement.style.color = '#333';
            textElement.style.opacity = '1';
        }
        if (row) {
            row.style.backgroundColor = 'white';
        }
    }
    
    // Update progress
    updateShoppingProgress();
    saveGroceryProgress();
}

// Updates shopping progress visualization
function updateShoppingProgress() {
    const checkboxes = document.querySelectorAll('#grocery-list-items input[type="checkbox"].grocery-checkbox');
    if (checkboxes.length === 0) return;
    
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    const total = checkboxes.length;
    const percentage = Math.round((checked / total) * 100);
    
    // Update progress display
    const progressElement = document.getElementById('shopping-progress');
    if (progressElement) progressElement.textContent = percentage;
    
    const progressBar = document.getElementById('shopping-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${percentage}%`;
    }
    
    // Update counts if elements exist
    const checkedCount = document.getElementById('checked-count');
    const totalCount = document.getElementById('total-count');
    if (checkedCount) checkedCount.textContent = checked;
    if (totalCount) totalCount.textContent = total;
    
    // Update status with different messages and colors
    let status = 'Not started';
    let statusColor = '#666';
    let statusIcon = 'fas fa-shopping-cart';
    
    if (percentage === 100) {
        status = 'Complete! 🎉';
        statusColor = '#4CAF50';
        statusIcon = 'fas fa-check-circle';
        
        // Show completion message if element exists
        const completionMsg = document.getElementById('completion-message');
        if (completionMsg) {
            completionMsg.style.display = 'flex';
            completionMsg.style.animation = 'pulse 2s infinite';
        }
    } else if (percentage >= 75) {
        status = 'Almost there!';
        statusColor = '#8BC34A';
        statusIcon = 'fas fa-tachometer-alt-fast';
    } else if (percentage >= 50) {
        status = 'Halfway there';
        statusColor = '#FF9800';
        statusIcon = 'fas fa-hourglass-half';
    } else if (percentage > 0) {
        status = 'In progress';
        statusColor = '#2196F3';
        statusIcon = 'fas fa-spinner';
    }
    
    // Hide completion message if not 100%
    if (percentage !== 100) {
        const completionMsg = document.getElementById('completion-message');
        if (completionMsg) completionMsg.style.display = 'none';
    }
    
    // Update status element
    const statusElement = document.getElementById('shopping-status');
    if (statusElement) {
        statusElement.innerHTML = `<i class="${statusIcon}" style="margin-right: 8px; color: ${statusColor};"></i> ${status}`;
        statusElement.style.color = statusColor;
    }
    
    // Update time if element exists
    const timeElement = document.querySelector('.fa-clock');
    if (timeElement && timeElement.parentElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        timeElement.parentElement.innerHTML = `<i class="fas fa-clock" style="color: #FF9800; margin-right: 5px;"></i> Updated: ${timeString}`;
    }
    
    // Save progress to localStorage
    saveGroceryProgress();
}

// Saves grocery shopping progress to localstorage
function saveGroceryProgress() {
    const week = document.getElementById('grocery-week-selector').value;
    if (!week) return;
    
    const checkboxes = document.querySelectorAll('#grocery-list-items input[type="checkbox"]');
    const progress = Array.from(checkboxes).map(cb => cb.checked);
    
    const progressData = {
        week: week,
        checkedItems: progress,
        lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(`grocery-progress-${week}`, JSON.stringify(progressData));
}

// Loads grocery shopping progress from localstorage
function loadGroceryProgress() {
    const week = document.getElementById('grocery-week-selector').value;
    if (!week) return;
    
    const savedProgress = localStorage.getItem(`grocery-progress-${week}`);
    if (savedProgress) {
        try {
            const progressData = JSON.parse(savedProgress);
            
            document.querySelectorAll('#grocery-list-items input[type="checkbox"]').forEach((checkbox, index) => {
                if (progressData.checkedItems && progressData.checkedItems[index] !== undefined) {
                    checkbox.checked = progressData.checkedItems[index];
                    
                    // Update visual state
                    if (typeof handleGroceryItemChange === 'function') {
                        handleGroceryItemChange(index);
                    }
                }
            });
            
            // Update the progress display
            updateShoppingProgress();
            
        } catch (error) {
            console.error('Error loading grocery progress:', error);
        }
    }
}

// Prints the grocery list to a new window
function printGroceryList() {
    const groceryContent = document.getElementById('grocery-container');
    if (!groceryContent || groceryContent.style.display === 'none') {
        alert('Please generate a grocery list first');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const title = document.getElementById('grocery-list-title').textContent;
    const week = document.getElementById('grocery-week-display').textContent;
    const itemsCount = document.getElementById('grocery-item-count').textContent;
    const servings = document.getElementById('grocery-servings-info').textContent;
    
    // FIX: Get grocery items correctly
    const groceryItems = [];
    document.querySelectorAll('#grocery-list-items .grocery-item-row').forEach(row => {
        const textSpan = row.querySelector('span[id^="grocery-text-"]');
        if (textSpan) {
            // Remove the checkmark/strikethrough if present
            let text = textSpan.textContent;
            // Remove any checkmark symbols
            text = text.replace(/✓|✔|☑/g, '').trim();
            // Remove leading/trailing spaces
            text = text.trim();
            if (text) {
                groceryItems.push(text);
            }
        }
    });
    
    // Get meal plan summary if available
    const mealSummary = document.getElementById('meal-plan-summary').innerHTML;
    
    // Build the grocery items HTML safely
    const groceryItemsHTML = groceryItems.map(item => 
        `<div class="ingredient-item">
            <span class="checkbox">☐</span>
            <span>${item.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
        </div>`
    ).join('');
    
    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                    line-height: 1.6;
                }
                h1 {
                    color: #4CAF50;
                    border-bottom: 2px solid #4CAF50;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .header-info {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 25px;
                }
                .header-info div {
                    margin: 5px 0;
                    color: #666;
                }
                .ingredient-list {
                    margin: 25px 0;
                }
                .ingredient-item {
                    margin: 10px 0;
                    padding: 10px 0;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    align-items: center;
                }
                .checkbox {
                    margin-right: 15px;
                    font-size: 1.2em;
                }
                .meal-summary {
                    background: #e8f5e9;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 25px 0;
                }
                .tips {
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                    margin-top: 30px;
                    font-size: 0.9em;
                }
                .print-buttons {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                }
                button {
                    padding: 10px 20px;
                    margin: 0 5px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                .print-btn {
                    background: #4CAF50;
                    color: white;
                }
                .close-btn {
                    background: #666;
                    color: white;
                }
                @media print {
                    .print-buttons {
                        display: none;
                    }
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            
            <div class="header-info">
                <div><strong>${week}</strong></div>
                <div><strong>${itemsCount}</strong></div>
                <div><strong>${servings}</strong></div>
            </div>
            
            ${mealSummary ? `<div class="meal-summary">${mealSummary}</div>` : ''}
            
            <h2>Ingredients to Buy:</h2>
            <div class="ingredient-list" id="print-items">
                ${groceryItemsHTML}
            </div>
            
            <div class="tips">
                <h3>Shopping Tips:</h3>
                <ul>
                    <li>Group items by store sections (produce, dairy, meat, etc.)</li>
                    <li>Check your pantry before shopping to avoid duplicates</li>
                    <li>Consider substituting ingredients based on availability</li>
                    <li>Buy in bulk for items you use frequently</li>
                </ul>
            </div>
            
            <div class="print-buttons">
                <button class="print-btn" onclick="window.print()">🖨️ Print List</button>
                <button class="close-btn" onclick="window.close()">✕ Close Window</button>
            </div>
            
            <script>
                // Auto-print after a short delay
                setTimeout(function() {
                    window.print();
                }, 500);
            <\/script>
        </body>
        </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
}

// Clears shopping progress (unchecks all items)
function clearShoppingProgress() {
    const checkboxes = document.querySelectorAll('#grocery-list-items input[type="checkbox"]');
    
    // Check if there are any checkboxes
    if (checkboxes.length === 0) {
        console.log('No checkboxes found to reset');
        return;
    }
    
    console.log(`Resetting ${checkboxes.length} items...`);
    
    // Reset all checkboxes and update visual state
    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = false;
        
        // Update visual state immediately
        const textElement = document.getElementById(`grocery-text-${index}`);
        const row = checkbox.closest('.grocery-item-row');
        
        if (textElement) {
            textElement.style.textDecoration = 'none';
            textElement.style.color = '#333';
            textElement.style.opacity = '1';
        }
        
        if (row) {
            row.style.backgroundColor = 'white';
        }
    });
    
    // Clear from localStorage
    const week = document.getElementById('grocery-week-selector').value;
    if (week) {
        localStorage.removeItem(`grocery-progress-${week}`);
        console.log(`Cleared localStorage for week ${week}`);
    }
    
    // Force update progress
    updateShoppingProgress();
    
    // Show success message
    const statusDiv = document.getElementById('grocery-status');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div class="status-box" style="margin: 10px 0; padding: 10px 15px; background: #d4edda; color: #155724; border-radius: 5px; border: 1px solid #c3e6cb;">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                Shopping progress cleared! All items unchecked.</p>
            </div>
        `;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    }
}

// Marks all grocery items as done (checks all checkboxes)
function markAllAsDone() {
    const checkboxes = document.querySelectorAll('#grocery-list-items input[type="checkbox"]');
    let allChecked = true;
    
    // Check if all are already checked
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            allChecked = false;
        }
    });
    
    // Toggle all checkboxes
    checkboxes.forEach((checkbox, index) => {
        if (allChecked) {
            // If all are checked, uncheck all
            checkbox.checked = false;
        } else {
            // Otherwise, check all
            checkbox.checked = true;
        }
        // Update visual state
        handleGroceryItemChange(index);
    });
    
    updateShoppingProgress();
    
    // Show message
    const statusDiv = document.getElementById('grocery-status');
    if (statusDiv) {
        const message = allChecked ? 'All items unchecked!' : 'All items marked as done! 🎉';
        statusDiv.innerHTML = `
            <div class="status-box" style="margin: 10px 0;">
                <p><i class="fas fa-check-circle" style="color: #4CAF50; margin-right: 10px;"></i> 
                ${message}</p>
            </div>
        `;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 3000);
    }
}

// Helper function for date formatting - converts date to ISO week format
function getWeekFromDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const week = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return d.getFullYear() + '-W' + String(week).padStart(2, '0');
}

// Temporary debug function to check sorting
function testAlphabeticalOrder() {
    console.log("Current recipe order:");
    allRecipes.forEach((recipe, index) => {
        console.log(`${index + 1}. ${recipe.title}`);
    });
}

// Debug function to check recipe categories
function checkRecipeCategories() {
    console.log("=== CHECKING RECIPE CATEGORIES ===");
    
    // Get all unique categories
    const categories = {};
    allRecipes.forEach(recipe => {
        const cat = recipe.category || "No Category";
        if (!categories[cat]) {
            categories[cat] = [];
        }
        categories[cat].push(recipe.title);
    });
    
    console.log("Categories found in recipes:");
    Object.keys(categories).forEach(cat => {
        console.log(`"${cat}": ${categories[cat].length} recipes`);
        console.log(`  Recipes: ${categories[cat].join(", ")}`);
    });
    
    // Check what's in the dropdown
    const dropdown = document.getElementById('category-filter');
    const dropdownOptions = Array.from(dropdown.options).map(opt => opt.value);
    console.log("Dropdown options:", dropdownOptions);
}