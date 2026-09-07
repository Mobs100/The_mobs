// ======================================================
// MOBS ADMIN PANEL
// SUPABASE + MENU MANAGEMENT
// ======================================================


// ======================================================
// SUPABASE SETTINGS
// ======================================================

const SUPABASE_URL =
    "https://pcundfmldniuemtbjnop.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_hQy6k4JCxvq6UVf7Lzf_ow_a45kiq_O";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ======================================================
// RESTAURANT
// ======================================================

const RESTAURANT_ID =
    "81561a5d-c8e6-41b8-b6fd-5f582bc7e97a";


// ======================================================
// GLOBAL STATE
// ======================================================

let categoriesCache = [];
let productsCache = [];


// ======================================================
// HTML SECURITY
// ======================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ======================================================
// PAGE NAVIGATION
// ======================================================

function showSection(sectionName) {

    console.log(
        "Opening section:",
        sectionName
    );

    document
        .querySelectorAll(".section")
        .forEach(section => {

            section.classList.add("hidden");

        });


    const selectedSection =
        document.getElementById(sectionName);


    if (!selectedSection) {

        console.error(
            "Section not found:",
            sectionName
        );

        return;
    }


    selectedSection.classList.remove("hidden");


    // Dashboard

    if (sectionName === "dashboard") {

        loadDashboard();

    }


    // Categories

    if (sectionName === "categories") {

        loadCategories();

    }


    // Products

    if (sectionName === "products") {

        loadProductCategories();

        loadProducts();

    }
}


// ======================================================
// DASHBOARD
// ======================================================

async function loadDashboard() {

    console.log(
        "Loading dashboard..."
    );


    try {

        // ----------------------------------------------
        // RESTAURANT
        // ----------------------------------------------

        const {
            data: restaurant,
            error: restaurantError
        } = await supabaseClient

            .from("restaurants")

            .select("id,name")

            .eq(
                "id",
                RESTAURANT_ID
            )

            .maybeSingle();


        if (restaurantError) {

            console.error(
                "Restaurant error:",
                restaurantError
            );

        }


        // ----------------------------------------------
        // CATEGORIES
        // ----------------------------------------------

        const {
            count: categoriesCount,
            error: categoriesError
        } = await supabaseClient

            .from("menu_categories")

            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (categoriesError) {

            console.error(
                "Categories dashboard error:",
                categoriesError
            );

        }


        // ----------------------------------------------
        // PRODUCTS
        // ----------------------------------------------

        const {
            count: productsCount,
            error: productsError
        } = await supabaseClient

            .from("products")

            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (productsError) {

            console.error(
                "Products dashboard error:",
                productsError
            );

        }


        // ----------------------------------------------
        // AVAILABLE PRODUCTS
        // ----------------------------------------------

        const {
            count: availableProductsCount,
            error: availableError
        } = await supabaseClient

            .from("products")

            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            )

            .eq(
                "is_available",
                true
            );


        if (availableError) {

            console.error(
                "Available products error:",
                availableError
            );

        }


        console.log(
            "Dashboard:",
            {
                restaurant,
                categoriesCount,
                productsCount,
                availableProductsCount
            }
        );


        // ----------------------------------------------
        // UPDATE UI
        // ----------------------------------------------

        const restaurantElement =
            document.getElementById(
                "restaurantsCount"
            );


        if (restaurantElement) {

            restaurantElement.textContent =
                restaurant ? "1" : "0";

        }


        const categoriesElement =
            document.getElementById(
                "categoriesCount"
            );


        if (categoriesElement) {

            categoriesElement.textContent =
                categoriesCount ?? 0;

        }


        const productsElement =
            document.getElementById(
                "productsCount"
            );


        if (productsElement) {

            productsElement.textContent =
                productsCount ?? 0;

        }


        const availableElement =
            document.getElementById(
                "availableProductsCount"
            );


        if (availableElement) {

            availableElement.textContent =
                availableProductsCount ?? 0;

        }

    }

    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }
}


// ======================================================
// CATEGORIES
// ======================================================

async function loadCategories() {

    const list =
        document.getElementById(
            "categoriesList"
        );


    if (!list) {

        console.warn(
            "categoriesList not found"
        );

        return;
    }


    list.innerHTML =
        "<p>Loading categories...</p>";


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("menu_categories")

            .select(`
                id,
                restaurant_id,
                name,
                description,
                image_url,
                sort_order,
                is_active,
                created_at
            `)

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            )

            .order(
                "sort_order",
                {
                    ascending: true
                }
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


        if (error) {

            throw error;

        }


        categoriesCache =
            data || [];


        console.log(
            "Categories loaded:",
            categoriesCache
        );


        if (
            !categoriesCache ||
            categoriesCache.length === 0
        ) {

            list.innerHTML = `
                <div class="empty-state">
                    <p>No categories found.</p>
                </div>
            `;

            return;
        }


        list.innerHTML = "";


        categoriesCache.forEach(
            category => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "category-item";


                item.innerHTML = `

                    <div class="category-info">

                        ${
                            category.image_url
                                ? `
                                    <img
                                        src="${escapeHTML(category.image_url)}"
                                        alt="${escapeHTML(category.name)}"
                                        style="
                                            width:70px;
                                            height:70px;
                                            object-fit:cover;
                                            border-radius:10px;
                                            margin-bottom:10px;
                                        "
                                    >
                                `
                                : ""
                        }

                        <strong>
                            ${escapeHTML(
                                category.name
                            )}
                        </strong>

                        ${
                            category.description
                                ? `
                                    <p>
                                        ${escapeHTML(
                                            category.description
                                        )}
                                    </p>
                                `
                                : ""
                        }

                        <div>
                            Sort Order:
                            ${category.sort_order ?? 0}
                        </div>

                        <div>
                            Status:
                            ${
                                category.is_active
                                    ? "Active ✅"
                                    : "Inactive ❌"
                            }
                        </div>

                        <div>
                            ID:
                            ${escapeHTML(
                                category.id
                            )}
                        </div>

                        <div>
                            Created:
                            ${
                                category.created_at
                                    ? new Date(
                                        category.created_at
                                    ).toLocaleString()
                                    : "-"
                            }
                        </div>

                    </div>


                    <div class="category-actions">

                        <button
                            type="button"
                            onclick="editCategory('${category.id}')"
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            onclick="
                                toggleCategory(
                                    '${category.id}',
                                    ${category.is_active}
                                )
                            "
                        >
                            ${
                                category.is_active
                                    ? "Disable"
                                    : "Enable"
                            }
                        </button>


                        <button
                            type="button"
                            onclick="
                                deleteCategory(
                                    '${category.id}'
                                )
                            "
                        >
                            Delete
                        </button>

                    </div>

                `;


                list.appendChild(
                    item
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Categories error:",
            error
        );


        list.innerHTML = `

            <div style="color:red;">

                <strong>
                    Error loading categories
                </strong>

                <br><br>

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }
}


// ======================================================
// CATEGORY FORM
// ======================================================

function openCategoryForm() {

    console.log(
        "Opening category form..."
    );


    const section =
        document.getElementById(
            "categories"
        );


    if (!section) {

        console.error(
            "Categories section not found"
        );

        return;
    }


    // Remove existing form

    const existing =
        document.getElementById(
            "categoryManagementForm"
        );


    if (existing) {

        existing.remove();

        return;
    }


    const list =
        document.getElementById(
            "categoriesList"
        );


    const form =
        document.createElement(
            "div"
        );


    form.id =
        "categoryManagementForm";


    form.innerHTML = `

        <div
            style="
                background:#f5f5f5;
                padding:20px;
                margin-bottom:20px;
                border-radius:12px;
            "
        >

            <h2>
                Add Category
            </h2>


            <input
                id="categoryName"
                type="text"
                placeholder="Category name"
                autocomplete="off"
            >


            <textarea
                id="categoryDescription"
                placeholder="Description"
            ></textarea>


            <input
                id="categoryImage"
                type="text"
                placeholder="Image URL"
            >


            <input
                id="categorySortOrder"
                type="number"
                value="0"
                min="0"
                placeholder="Sort order"
            >


            <label>

                <input
                    id="categoryActive"
                    type="checkbox"
                    checked
                >

                Active

            </label>


            <br><br>


            <button
                type="button"
                onclick="addCategory()"
            >
                Save Category
            </button>


            <button
                type="button"
                onclick="closeCategoryForm()"
            >
                Cancel
            </button>

        </div>

    `;


    if (list) {

        section.insertBefore(
            form,
            list
        );

    }

    else {

        section.appendChild(
            form
        );

    }


    setTimeout(
        () => {

            const input =
                document.getElementById(
                    "categoryName"
                );


            if (input) {

                input.focus();

            }

        },
        100
    );
}


// ======================================================
// CLOSE CATEGORY FORM
// ======================================================

function closeCategoryForm() {

    const form =
        document.getElementById(
            "categoryManagementForm"
        );


    if (form) {

        form.remove();

    }
}


// ======================================================
// ADD CATEGORY
// ======================================================

async function addCategory() {

    console.log(
        "addCategory() started"
    );


    const nameInput =
        document.getElementById(
            "categoryName"
        );


    if (!nameInput) {

        alert(
            "Category name field not found."
        );

        console.error(
            "categoryName not found"
        );

        return;
    }


    const name =
        nameInput.value.trim();


    console.log(
        "Category name:",
        name
    );


    if (!name) {

        alert(
            "Enter category name."
        );

        nameInput.focus();

        return;
    }


    const descriptionInput =
        document.getElementById(
            "categoryDescription"
        );


    const imageInput =
        document.getElementById(
            "categoryImage"
        );


    const sortInput =
        document.getElementById(
            "categorySortOrder"
        );


    const activeInput =
        document.getElementById(
            "categoryActive"
        );


    const description =
        descriptionInput
            ? descriptionInput.value.trim()
            : "";


    const image_url =
        imageInput
            ? imageInput.value.trim()
            : "";


    let sort_order =
        sortInput &&
        sortInput.value.trim() !== ""
            ? parseInt(
                sortInput.value
            )
            : 0;


    if (isNaN(sort_order)) {

        sort_order = 0;

    }


    const is_active =
        activeInput
            ? activeInput.checked
            : true;


    // IMPORTANT:
    // restaurant_id is required
    // in your Supabase table.

    const categoryData = {

        restaurant_id:
            RESTAURANT_ID,

        name:
            name,

        description:
            description || null,

        image_url:
            image_url || null,

        sort_order:
            sort_order,

        is_active:
            is_active

    };


    console.log(
        "Category data:",
        categoryData
    );


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("menu_categories")

            .insert(
                categoryData
            )

            .select()
            
            .single();


        if (error) {

            console.error(
                "Supabase category insert error:",
                error
            );

            throw error;

        }


        console.log(
            "Category created:",
            data
        );


        closeCategoryForm();


        await loadCategories();


        await loadProductCategories();


        await loadDashboard();


        alert(
            "Category added successfully ✅"
        );

    }

    catch (error) {

        console.error(
            "Add category error:",
            error
        );


        alert(
            "Failed to add category ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// EDIT CATEGORY
// ======================================================

async function editCategory(id) {

    try {

        const {
            data: category,
            error
        } = await supabaseClient

            .from("menu_categories")

            .select("*")

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            )

            .single();


        if (error) {

            throw error;

        }


        const name =
            prompt(
                "Category name:",
                category.name || ""
            );


        if (name === null) {

            return;

        }


        if (!name.trim()) {

            alert(
                "Category name cannot be empty."
            );

            return;

        }


        const description =
            prompt(
                "Description:",
                category.description || ""
            );


        if (description === null) {

            return;

        }


        const image_url =
            prompt(
                "Image URL:",
                category.image_url || ""
            );


        if (image_url === null) {

            return;

        }


        const sort =
            prompt(
                "Sort order:",
                category.sort_order ?? 0
            );


        if (sort === null) {

            return;

        }


        let sort_order =
            parseInt(sort);


        if (isNaN(sort_order)) {

            sort_order = 0;

        }


        const {
            error: updateError
        } = await supabaseClient

            .from("menu_categories")

            .update({

                name:
                    name.trim(),

                description:
                    description.trim() || null,

                image_url:
                    image_url.trim() || null,

                sort_order:
                    sort_order

            })

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (updateError) {

            throw updateError;

        }


        await loadCategories();


        await loadProductCategories();


        alert(
            "Category updated successfully ✅"
        );

    }

    catch (error) {

        console.error(
            "Edit category error:",
            error
        );


        alert(
            "Failed to update category ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// TOGGLE CATEGORY
// ======================================================

async function toggleCategory(
    id,
    currentStatus
) {

    try {

        const {
            error
        } = await supabaseClient

            .from("menu_categories")

            .update({

                is_active:
                    !currentStatus

            })

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (error) {

            throw error;

        }


        await loadCategories();


        await loadProductCategories();


    }

    catch (error) {

        console.error(
            "Toggle category error:",
            error
        );


        alert(
            "Failed to change category status ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// DELETE CATEGORY
// ======================================================

async function deleteCategory(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this category?"
        );


    if (!confirmed) {

        return;

    }


    try {

        // Check products using category

        const {
            data: products,
            error: productsError
        } = await supabaseClient

            .from("products")

            .select("id,name")

            .eq(
                "category_id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (productsError) {

            throw productsError;

        }


        if (
            products &&
            products.length > 0
        ) {

            const names =
                products
                    .map(
                        product =>
                            product.name
                    )
                    .join(", ");


            alert(
                "Cannot delete this category because products are using it.\n\n" +
                names +
                "\n\nChange their category first."
            );


            return;
        }


        const {
            error
        } = await supabaseClient

            .from("menu_categories")

            .delete()

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (error) {

            throw error;

        }


        await loadCategories();


        await loadProductCategories();


        await loadDashboard();


        alert(
            "Category deleted successfully ✅"
        );

    }

    catch (error) {

        console.error(
            "Delete category error:",
            error
        );


        alert(
            "Failed to delete category ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// PRODUCT CATEGORIES DROPDOWN
// ======================================================

async function loadProductCategories() {

    const select =
        document.getElementById(
            "productCategory"
        );


    if (!select) {

        console.warn(
            "productCategory select not found"
        );

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("menu_categories")

            .select(`
                id,
                name,
                sort_order,
                is_active
            `)

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            )

            .order(
                "sort_order",
                {
                    ascending: true
                }
            )

            .order(
                "name",
                {
                    ascending: true
                }
            );


        if (error) {

            throw error;

        }


        console.log(
            "Product category options:",
            data
        );


        select.innerHTML = "";


        const defaultOption =
            document.createElement(
                "option"
            );


        defaultOption.value =
            "";


        defaultOption.textContent =
            "Select Category";


        select.appendChild(
            defaultOption
        );


        if (
            data &&
            data.length > 0
        ) {

            data.forEach(
                category => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        category.id;


                    option.textContent =
                        category.name;


                    select.appendChild(
                        option
                    );

                }
            );

        }


        console.log(
            "Final category options:",
            select.options.length
        );

    }

    catch (error) {

        console.error(
            "Product categories error:",
            error
        );


        select.innerHTML = `

            <option value="">
                Failed to load categories
            </option>

        `;

    }
}


// ======================================================
// PRODUCTS
// ======================================================

async function loadProducts() {

    const list =
        document.getElementById(
            "productsList"
        );


    if (!list) {

        console.warn(
            "productsList not found"
        );

        return;

    }


    list.innerHTML =
        "<p>Loading products...</p>";


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("products")

            .select(`
                id,
                restaurant_id,
                name,
                description,
                image_url,
                price,
                category_id,
                is_available,
                is_featured,
                sort_order,
                created_at,
                updated_at,
                menu_categories (
                    id,
                    name
                )
            `)

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            )

            .order(
                "sort_order",
                {
                    ascending: true
                }
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


        if (error) {

            throw error;

        }


        productsCache =
            data || [];


        console.log(
            "Products loaded:",
            productsCache
        );


        if (
            !productsCache ||
            productsCache.length === 0
        ) {

            list.innerHTML = `

                <div class="empty-state">

                    <p>
                        No products found.
                    </p>

                </div>

            `;

            return;

        }


        list.innerHTML = "";


        productsCache.forEach(
            product => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "product-item";


                const categoryName =
                    product.menu_categories?.name ||
                    "No Category";


                const available =
                    product.is_available !== false;


                const featured =
                    product.is_featured === true;


                item.innerHTML = `

                    <div class="product-info">

                        ${
                            product.image_url
                                ? `
                                    <img
                                        src="${escapeHTML(product.image_url)}"
                                        alt="${escapeHTML(product.name)}"
                                        style="
                                            width:80px;
                                            height:80px;
                                            object-fit:cover;
                                            border-radius:10px;
                                            margin-bottom:10px;
                                        "
                                    >
                                `
                                : ""
                        }


                        <div>

                            <strong>
                                ${escapeHTML(
                                    product.name
                                )}
                            </strong>


                            ${
                                product.description
                                    ? `
                                        <p>
                                            ${escapeHTML(
                                                product.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }


                            <div>
                                <strong>
                                    ${Number(
                                        product.price ?? 0
                                    ).toFixed(2)}
                                    SAR
                                </strong>
                            </div>


                            <div>
                                Category:
                                ${escapeHTML(
                                    categoryName
                                )}
                            </div>


                            <div>
                                Sort Order:
                                ${product.sort_order ?? 0}
                            </div>


                            <div>
                                Status:
                                ${
                                    available
                                        ? "Available ✅"
                                        : "Hidden ❌"
                                }
                            </div>


                            ${
                                featured
                                    ? `
                                        <div>
                                            ⭐ Featured
                                        </div>
                                    `
                                    : ""
                            }


                            <div>
                                ID:
                                ${escapeHTML(
                                    product.id
                                )}
                            </div>


                        </div>

                    </div>


                    <div class="product-actions">

                        <button
                            type="button"
                            onclick="
                                editProduct(
                                    '${product.id}'
                                )
                            "
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            onclick="
                                toggleProductAvailability(
                                    '${product.id}',
                                    ${available}
                                )
                            "
                        >
                            ${
                                available
                                    ? "Hide"
                                    : "Show"
                            }
                        </button>


                        <button
                            type="button"
                            onclick="
                                deleteProduct(
                                    '${product.id}'
                                )
                            "
                        >
                            Delete
                        </button>

                    </div>

                `;


                list.appendChild(
                    item
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Products error:",
            error
        );


        list.innerHTML = `

            <div style="color:red;">

                <strong>
                    Error loading products
                </strong>

                <br><br>

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

    }
}


// ======================================================
// PRODUCT FORM
// ======================================================

function openProductForm() {

    console.log(
        "Opening product form..."
    );


    const section =
        document.getElementById(
            "products"
        );


    if (!section) {

        console.error(
            "Products section not found"
        );

        return;

    }


    const existing =
        document.getElementById(
            "productManagementForm"
        );


    if (existing) {

        existing.remove();

        return;

    }


    const list =
        document.getElementById(
            "productsList"
        );


    const form =
        document.createElement(
            "div"
        );


    form.id =
        "productManagementForm";


    form.innerHTML = `

        <div
            style="
                background:#f5f5f5;
                padding:20px;
                margin-bottom:20px;
                border-radius:12px;
            "
        >

            <h2>
                Add Product
            </h2>


            <input
                id="productName"
                type="text"
                placeholder="Product name"
                autocomplete="off"
            >


            <textarea
                id="productDescription"
                placeholder="Description"
            ></textarea>


            <input
                id="productPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="Price"
            >


            <input
                id="productImage"
                type="text"
                placeholder="Image URL"
            >


            <select
                id="productCategory"
            >

                <option value="">
                    Select Category
                </option>

            </select>


            <input
                id="productSortOrder"
                type="number"
                value="0"
                min="0"
                placeholder="Sort order"
            >


            <label>

                <input
                    id="productAvailable"
                    type="checkbox"
                    checked
                >

                Available

            </label>


            <label>

                <input
                    id="productFeatured"
                    type="checkbox"
                >

                Featured

            </label>


            <br><br>


            <button
                type="button"
                onclick="addProduct()"
            >
                Save Product
            </button>


            <button
                type="button"
                onclick="closeProductForm()"
            >
                Cancel
            </button>

        </div>

    `;


    if (list) {

        section.insertBefore(
            form,
            list
        );

    }

    else {

        section.appendChild(
            form
        );

    }


    loadProductCategories();


    setTimeout(
        () => {

            const input =
                document.getElementById(
                    "productName"
                );


            if (input) {

                input.focus();

            }

        },
        100
    );
}


// ======================================================
// CLOSE PRODUCT FORM
// ======================================================

function closeProductForm() {

    const form =
        document.getElementById(
            "productManagementForm"
        );


    if (form) {

        form.remove();

    }
}


// ======================================================
// ADD PRODUCT
// ======================================================

async function addProduct() {

    console.log(
        "addProduct() started"
    );


    const nameInput =
        document.getElementById(
            "productName"
        );


    const descriptionInput =
        document.getElementById(
            "productDescription"
        );


    const priceInput =
        document.getElementById(
            "productPrice"
        );


    const imageInput =
        document.getElementById(
            "productImage"
        );


    const categoryInput =
        document.getElementById(
            "productCategory"
        );


    const sortInput =
        document.getElementById(
            "productSortOrder"
        );


    const availableInput =
        document.getElementById(
            "productAvailable"
        );


    const featuredInput =
        document.getElementById(
            "productFeatured"
        );


    if (!nameInput) {

        alert(
            "Product name field not found."
        );

        return;

    }


    const name =
        nameInput.value.trim();


    if (!name) {

        alert(
            "Enter product name."
        );

        nameInput.focus();

        return;

    }


    let price = 0;


    if (
        priceInput &&
        priceInput.value.trim() !== ""
    ) {

        price =
            parseFloat(
                priceInput.value
            );

    }


    if (
        isNaN(price) ||
        price < 0
    ) {

        alert(
            "Enter a valid price."
        );

        if (priceInput) {

            priceInput.focus();

        }

        return;

    }


    let sort_order = 0;


    if (
        sortInput &&
        sortInput.value.trim() !== ""
    ) {

        sort_order =
            parseInt(
                sortInput.value
            );

    }


    if (isNaN(sort_order)) {

        sort_order = 0;

    }


    const category_id =
        categoryInput &&
        categoryInput.value
            ? categoryInput.value
            : null;


    const is_available =
        availableInput
            ? availableInput.checked
            : true;


    const is_featured =
        featuredInput
            ? featuredInput.checked
            : false;


    const productData = {

        restaurant_id:
            RESTAURANT_ID,

        name:
            name,

        description:
            descriptionInput
                ? descriptionInput.value.trim() || null
                : null,

        image_url:
            imageInput
                ? imageInput.value.trim() || null
                : null,

        price:
            price,

        category_id:
            category_id,

        is_available:
            is_available,

        is_featured:
            is_featured,

        sort_order:
            sort_order

    };


    console.log(
        "Product data:",
        productData
    );


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("products")

            .insert(
                productData
            )

            .select()

            .single();


        if (error) {

            console.error(
                "Supabase product insert error:",
                error
            );

            throw error;

        }


        console.log(
            "Product created:",
            data
        );


        closeProductForm();


        await loadProducts();


        await loadDashboard();


        alert(
            "Product added successfully ✅"
        );

    }

    catch (error) {

        console.error(
            "Add product error:",
            error
        );


        alert(
            "Failed to add product ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// EDIT PRODUCT
// ======================================================

async function editProduct(id) {

    try {

        const {
            data: product,
            error
        } = await supabaseClient

            .from("products")

            .select("*")

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            )

            .single();


        if (error) {

            throw error;

        }


        const name =
            prompt(
                "Product name:",
                product.name || ""
            );


        if (name === null) {

            return;

        }


        if (!name.trim()) {

            alert(
                "Product name cannot be empty."
            );

            return;

        }


        const description =
            prompt(
                "Description:",
                product.description || ""
            );


        if (description === null) {

            return;

        }


        const price =
            prompt(
                "Price:",
                product.price ?? 0
            );


        if (price === null) {

            return;

        }


        const parsedPrice =
            parseFloat(price);


        if (
            isNaN(parsedPrice) ||
            parsedPrice < 0
        ) {

            alert(
                "Invalid price."
            );

            return;

        }


        const image_url =
            prompt(
                "Image URL:",
                product.image_url || ""
            );


        if (image_url === null) {

            return;

        }


        const sort =
            prompt(
                "Sort order:",
                product.sort_order ?? 0
            );


        if (sort === null) {

            return;

        }


        let sort_order =
            parseInt(sort);


        if (isNaN(sort_order)) {

            sort_order = 0;

        }


        const {
            error: updateError
        } = await supabaseClient

            .from("products")

            .update({

                name:
                    name.trim(),

                description:
                    description.trim() || null,

                price:
                    parsedPrice,

                image_url:
                    image_url.trim() || null,

                sort_order:
                    sort_order,

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (updateError) {

            throw updateError;

        }


        await loadProducts();


        alert(
            "Product updated successfully ✅"
        );

    }

    catch (error) {

        console.error(
            "Edit product error:",
            error
        );


        alert(
            "Failed to update product ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// TOGGLE PRODUCT AVAILABILITY
// ======================================================

async function toggleProductAvailability(
    id,
    currentStatus
) {

    try {

        const {
            error
        } = await supabaseClient

            .from("products")

            .update({

                is_available:
                    !currentStatus,

                updated_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (error) {

            throw error;

        }


        await loadProducts();


        await loadDashboard();

    }

    catch (error) {

        console.error(
            "Toggle availability error:",
            error
        );


        alert(
            "Failed to change product status ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// DELETE PRODUCT
// ======================================================

async function deleteProduct(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const {
            error
        } = await supabaseClient

            .from("products")

            .delete()

            .eq(
                "id",
                id
            )

            .eq(
                "restaurant_id",
                RESTAURANT_ID
            );


        if (error) {

            throw error;

        }


        await loadProducts();


        await loadDashboard();


        alert(
            "Product deleted successfully ✅"
        );

    }

    catch (error) {

        console.error(
            "Delete product error:",
            error
        );


        alert(
            "Failed to delete product ❌\n\n" +
            error.message
        );

    }
}


// ======================================================
// SUPABASE CONNECTION TEST
// ======================================================

async function testConnection() {

    console.log(
        "Testing Supabase connection..."
    );


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("restaurants")

            .select(
                "id,name"
            )

            .eq(
                "id",
                RESTAURANT_ID
            )

            .limit(1);


        if (error) {

            console.error(
                "Supabase connection error:",
                error
            );

            return;

        }


        console.log(
            "Supabase connected successfully:",
            data
        );

    }

    catch (error) {

        console.error(
            "Connection error:",
            error
        );

    }
}


// ======================================================
// LOGOUT
// ======================================================

function setupLogout() {

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutButton) {

        console.log(
            "logoutBtn not found"
        );

        return;

    }


    // Prevent duplicate listener

    if (
        logoutButton.dataset.logoutReady ===
        "true"
    ) {

        return;

    }


    logoutButton.dataset.logoutReady =
        "true";


    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                const {
                    error
                } = await supabaseClient
                    .auth
                    .signOut();


                if (error) {

                    throw error;

                }


                alert(
                    "Logged out successfully."
                );


            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                alert(
                    "Logout failed ❌\n\n" +
                    error.message
                );

            }

        }
    );
}


// ======================================================
// AUTO CONNECT BUTTONS
// ======================================================

function setupButtons() {

    console.log(
        "Setting up buttons..."
    );


    // ----------------------------------------------
    // ADD CATEGORY
    // ----------------------------------------------

    const categoryButtons =
        document.querySelectorAll(
            '[onclick*="addCategory"], [onclick*="openCategoryForm"]'
        );


    categoryButtons.forEach(
        button => {

            const onclick =
                button.getAttribute(
                    "onclick"
                );


            // Old HTML button:
            // onclick="openCategoryForm()"

            if (
                onclick &&
                onclick.includes(
                    "openCategoryForm"
                )
            ) {

                return;

            }

        }
    );


    // ----------------------------------------------
    // ADD PRODUCT
    // ----------------------------------------------

    const productButtons =
        document.querySelectorAll(
            '[onclick*="openProductForm"]'
        );


    productButtons.forEach(
        button => {

            button.onclick =
                openProductForm;

        }
    );


    // ----------------------------------------------
    // CATEGORY BUTTON
    // ----------------------------------------------

    const addCategoryButtons =
        document.querySelectorAll(
            'button'
        );


    addCategoryButtons.forEach(
        button => {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            if (
                text.includes(
                    "add category"
                )
            ) {

                button.onclick =
                    openCategoryForm;

            }


            if (
                text.includes(
                    "add product"
                )
            ) {

                button.onclick =
                    openProductForm;

            }

        }
    );
}


// ======================================================
// START APPLICATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "================================"
        );

        console.log(
            "MOBS Admin loaded."
        );

        console.log(
            "Restaurant ID:",
            RESTAURANT_ID
        );

        console.log(
            "================================"
        );


        // Buttons

        setupButtons();


        // Logout

        setupLogout();


        // Connection

        await testConnection();


        // Load categories

        await loadCategories();


        // Load product categories

        await loadProductCategories();


        // Load products

        await loadProducts();


        // Dashboard

        await loadDashboard();


        // Open dashboard initially

        showSection(
            "dashboard"
        );

    }
);