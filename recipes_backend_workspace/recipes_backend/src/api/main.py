from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import uuid4, UUID

# App metadata for Swagger/OpenAPI
app = FastAPI(
    title="Recipes Explorer API",
    description=(
        "RESTful API for managing recipes, ingredients, and user collections "
        "in Recipe Explorer."
    ),
    version="1.0.0",
    openapi_tags=[
        {
            "name": "Recipes",
            "description": (
                "Operations for viewing, searching, creating, editing, and "
                "deleting recipes."
            ),
        },
        {
            "name": "Ingredients",
            "description": "Endpoints for managing and listing ingredients.",
        },
        {
            "name": "Collections",
            "description": (
                "Endpoints for user collections (favorite or custom recipe "
                "groups)."
            ),
        },
        {"name": "Health", "description": "Health and status endpoints."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==== DATA MODELS ====

class Ingredient(BaseModel):
    # PUBLIC_INTERFACE
    """A single ingredient in a recipe."""

    name: str = Field(
        ...,
        description="Name of the ingredient"
    )
    amount: Optional[str] = Field(
        None,
        description="Amount, e.g. '2 cups'"
    )


class RecipeBase(BaseModel):
    # PUBLIC_INTERFACE
    """Base fields for a recipe, used for creation and update."""

    title: str = Field(
        ...,
        description="Title of the recipe"
    )
    description: Optional[str] = Field(
        None,
        description="Short description of the recipe"
    )
    ingredients: List[Ingredient] = Field(
        default_factory=list,
        description="List of ingredients"
    )
    steps: List[str] = Field(
        default_factory=list,
        description="List of cooking instructions or steps"
    )
    tags: Optional[List[str]] = Field(
        default_factory=list,
        description="Tags or categories for the recipe"
    )
    image_url: Optional[str] = Field(
        None,
        description="Link to an image for the recipe"
    )


class RecipeCreate(RecipeBase):
    # PUBLIC_INTERFACE
    """Model for creating a new recipe."""
    pass


class RecipeUpdate(RecipeBase):
    # PUBLIC_INTERFACE
    """
    Model for updating an existing recipe. All fields optional for partial update.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[List[Ingredient]] = None
    steps: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None


class Recipe(RecipeBase):
    # PUBLIC_INTERFACE
    """Full recipe model including ID."""

    id: UUID = Field(
        ...,
        description="Unique identifier for the recipe"
    )

 
class UserCollection(BaseModel):
    # PUBLIC_INTERFACE
    """A collection of recipes created by a user."""

    id: UUID = Field(
        ...,
        description="Unique ID for this collection"
    )
    name: str = Field(
        ...,
        description="Name of the collection"
    )
    recipe_ids: List[UUID] = Field(
        default_factory=list,
        description="IDs of recipes in this collection"
    )
    description: Optional[str] = Field(
        None,
        description="Description of the collection"
    )


# ==== IN-MEMORY DATABASES (replace with a persistent DB in production) ====
recipes_db: dict[UUID, Recipe] = dict()
collections_db: dict[UUID, UserCollection] = dict()


# ==== ENDPOINTS ====


@app.get(
    "/",
    tags=["Health"],
    summary="Health check",
    description="Returns service health status."
)
def health_check():
    """Health endpoint for service liveness check."""
    return {"message": "Healthy"}


# === RECIPES CRUD ===


@app.get(
    "/recipes",
    response_model=List[Recipe],
    tags=["Recipes"],
    summary="List/Search recipes"
)
def list_recipes(
    search: Optional[str] = Query(
        None,
        description="Text to search in recipe title or description"
    ),
    tag: Optional[str] = Query(
        None,
        description="Filter recipes by tag/category"
    )
):
    """
    Get a list of recipes, optionally filtered by search and/or tag.
    """
    results = list(recipes_db.values())
    if search:
        search_lower = search.lower()
        results = [
            r for r in results if
            search_lower in r.title.lower() or (
                r.description and search_lower in r.description.lower()
            )
        ]
    if tag:
        tag_lower = tag.lower()
        results = [
            r for r in results
            if r.tags and tag_lower in [t.lower() for t in r.tags]
        ]
    return results


@app.get(
    "/recipes/{recipe_id}",
    response_model=Recipe,
    tags=["Recipes"],
    summary="Get recipe detail"
)
def get_recipe(recipe_id: UUID):
    """
    Fetch full details of a single recipe by ID.
    """
    recipe = recipes_db.get(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@app.post(
    "/recipes",
    response_model=Recipe,
    status_code=201,
    tags=["Recipes"],
    summary="Add new recipe"
)
def create_recipe(recipe_in: RecipeCreate):
    """
    Add a new recipe to the system.
    """
    recipe_id = uuid4()
    recipe = Recipe(id=recipe_id, **recipe_in.dict())
    recipes_db[recipe_id] = recipe
    return recipe


@app.put(
    "/recipes/{recipe_id}",
    response_model=Recipe,
    tags=["Recipes"],
    summary="Edit recipe"
)
def update_recipe(recipe_id: UUID, update_in: RecipeUpdate):
    """
    Update an existing recipe. Only provided fields will be updated.
    """
    existing = recipes_db.get(recipe_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")
    updated_data = existing.dict()
    # Update only the fields provided (None fields are skipped)
    for k, v in update_in.dict(exclude_unset=True).items():
        if v is not None:
            updated_data[k] = v
    updated_recipe = Recipe(**updated_data)
    recipes_db[recipe_id] = updated_recipe
    return updated_recipe


@app.delete(
    "/recipes/{recipe_id}",
    status_code=204,
    tags=["Recipes"],
    summary="Delete recipe"
)
def delete_recipe(recipe_id: UUID):
    """
    Remove a recipe by its ID.
    """
    if recipe_id not in recipes_db:
        raise HTTPException(status_code=404, detail="Recipe not found")
    del recipes_db[recipe_id]
    # Optionally remove recipe from all collections
    for collection in collections_db.values():
        if recipe_id in collection.recipe_ids:
            collection.recipe_ids.remove(recipe_id)
    return


# === INGREDIENTS ===


@app.get(
    "/ingredients",
    response_model=List[str],
    tags=["Ingredients"],
    summary="List all unique ingredients"
)
def list_ingredients():
    """
    Fetch all unique ingredient names from all recipes.
    """
    ingredients = set()
    for recipe in recipes_db.values():
        for ing in recipe.ingredients:
            ingredients.add(ing.name)
    return sorted(ingredients)


# === USER COLLECTIONS ===


@app.get(
    "/collections",
    response_model=List[UserCollection],
    tags=["Collections"],
    summary="List all collections"
)
def list_collections():
    """
    Get all user-created collections.
    """
    return list(collections_db.values())


@app.post(
    "/collections",
    response_model=UserCollection,
    status_code=201,
    tags=["Collections"],
    summary="Create a collection"
)
def create_collection(collection: UserCollection):
    """
    Add a new custom collection of recipes.
    """
    if collection.id in collections_db:
        raise HTTPException(status_code=400, detail="Collection ID already exists")
    # Ensure all recipe IDs exist
    for rid in collection.recipe_ids:
        if rid not in recipes_db:
            raise HTTPException(
                status_code=400,
                detail=f"Recipe with id {rid} does not exist."
            )
    collections_db[collection.id] = collection
    return collection


@app.put(
    "/collections/{collection_id}",
    response_model=UserCollection,
    tags=["Collections"],
    summary="Edit collection"
)
def update_collection(collection_id: UUID, update: UserCollection):
    """
    Update name, recipes, or description of a collection.
    """
    if collection_id not in collections_db:
        raise HTTPException(status_code=404, detail="Collection not found")
    # Validate new recipe ids
    for rid in update.recipe_ids:
        if rid not in recipes_db:
            raise HTTPException(
                status_code=400,
                detail=f"Recipe with id {rid} does not exist."
            )
    collections_db[collection_id] = update
    return update


@app.delete(
    "/collections/{collection_id}",
    status_code=204,
    tags=["Collections"],
    summary="Delete collection"
)
def delete_collection(collection_id: UUID):
    """
    Remove a collection by its ID.
    """
    if collection_id not in collections_db:
        raise HTTPException(status_code=404, detail="Collection not found")
    del collections_db[collection_id]
    return


# ==== NOTES ====
# - This backend uses an in-memory dict for data storage.
#   Use a DB for persistence in production.
# - Endpoints are grouped for easy frontend integration.
# - OpenAPI docs are available at /docs and /openapi.json.
