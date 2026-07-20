package com.example

/**
 * The creator Ads flow deliberately uses a closed catalogue.  It prevents
 * arbitrary category, location and interest strings from being stored in an
 * ad campaign, which keeps audience matching and reporting predictable.
 *
 * Keep the ids in sync with the Social API.  Labels are presentation only;
 * API requests must send the ids/target values defined here.
 */
internal enum class AdCatalogIcon {
    TARGET,
    MESSAGE,
    PHONE,
    HEART,
    PLAY,
    PERSON,
    GRID,
    PIN,
    CALENDAR,
    GROUPS,
    CROSSHAIR,
    SHOPPING_BAG,
    FOOD,
    BEAUTY,
    HEALTH,
    SCHOOL,
    BUSINESS,
    DEVICE,
    PLANE,
    HOME,
    CAR,
    FILM,
    BUILDING,
    MORE
}

internal data class AdCatalogOption(
    val id: String,
    val title: String,
    val subtitle: String = "",
    val icon: AdCatalogIcon
)

internal data class AdAgeRange(
    val id: String,
    val title: String,
    val minAge: Int,
    val maxAge: Int
)

/**
 * Fixed values used by every creator-facing selector in Payments & Ads.
 * This is intentionally not populated from free-form text fields.
 */
internal object TiwiAdCampaignCatalog {
    val objectives = listOf(
        AdCatalogOption("sales", "Sales", "Encourage purchases", AdCatalogIcon.TARGET),
        AdCatalogOption("traffic", "Website visits", "Send people to your website", AdCatalogIcon.TARGET),
        AdCatalogOption("messages", "Messages", "Start conversations", AdCatalogIcon.MESSAGE),
        AdCatalogOption("calls", "Calls", "Get more phone calls", AdCatalogIcon.PHONE),
        AdCatalogOption("engagement", "Engagement", "Get reactions and comments", AdCatalogIcon.HEART),
        AdCatalogOption("video_views", "Video views", "Reach people likely to watch", AdCatalogIcon.PLAY),
        AdCatalogOption("profile_visits", "Profile visits", "Grow your profile audience", AdCatalogIcon.PERSON)
    )

    val categories = listOf(
        AdCatalogOption("clothing_apparel", "Clothing & apparel", "Fashion, accessories and footwear", AdCatalogIcon.SHOPPING_BAG),
        AdCatalogOption("shopping_retail", "Shopping & retail", "Products and local stores", AdCatalogIcon.SHOPPING_BAG),
        AdCatalogOption("food_beverage", "Food & beverage", "Restaurants, food and drinks", AdCatalogIcon.FOOD),
        AdCatalogOption("beauty_personal_care", "Beauty & personal care", "Beauty, grooming and cosmetics", AdCatalogIcon.BEAUTY),
        AdCatalogOption("health_wellness", "Health & wellness", "Fitness, health and wellbeing", AdCatalogIcon.HEALTH),
        AdCatalogOption("education_training", "Education & training", "Courses, schools and learning", AdCatalogIcon.SCHOOL),
        AdCatalogOption("business_services", "Business services", "Professional services", AdCatalogIcon.BUSINESS),
        AdCatalogOption("technology", "Technology", "Apps, software and electronics", AdCatalogIcon.DEVICE),
        AdCatalogOption("travel_hospitality", "Travel & hospitality", "Travel, hotels and experiences", AdCatalogIcon.PLANE),
        AdCatalogOption("home_living", "Home & living", "Home, furniture and lifestyle", AdCatalogIcon.HOME),
        AdCatalogOption("automotive", "Automotive", "Vehicles and transport", AdCatalogIcon.CAR),
        AdCatalogOption("entertainment_media", "Entertainment & media", "Entertainment, music and media", AdCatalogIcon.FILM),
        AdCatalogOption("real_estate", "Real estate", "Property and accommodation", AdCatalogIcon.BUILDING),
        AdCatalogOption("other", "Other", "Another permitted business category", AdCatalogIcon.MORE)
    )

    /** targetValue is what the API saves in targeting.locations. */
    val locations = listOf(
        AdCatalogOption("worldwide", "All locations", "Worldwide", AdCatalogIcon.PIN),
        AdCatalogOption("bangladesh", "Bangladesh", "People in Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("dhaka", "Dhaka", "Dhaka, Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("chattogram", "Chattogram", "Chattogram, Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("rajshahi", "Rajshahi", "Rajshahi, Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("khulna", "Khulna", "Khulna, Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("sylhet", "Sylhet", "Sylhet, Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("barishal", "Barishal", "Barishal, Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("rangpur", "Rangpur", "Rangpur, Bangladesh", AdCatalogIcon.PIN),
        AdCatalogOption("mymensingh", "Mymensingh", "Mymensingh, Bangladesh", AdCatalogIcon.PIN)
    )

    val ageRanges = listOf(
        AdAgeRange("18_65", "18 – 65+", 18, 65),
        AdAgeRange("18_24", "18 – 24", 18, 24),
        AdAgeRange("25_34", "25 – 34", 25, 34),
        AdAgeRange("35_44", "35 – 44", 35, 44),
        AdAgeRange("45_54", "45 – 54", 45, 54),
        AdAgeRange("55_65", "55 – 65+", 55, 65)
    )

    val interests = listOf(
        AdCatalogOption("all", "All interests and behaviors", "Expand your reach", AdCatalogIcon.CROSSHAIR),
        AdCatalogOption("shopping", "Shopping", "People interested in shopping", AdCatalogIcon.SHOPPING_BAG),
        AdCatalogOption("business", "Business", "Entrepreneurs and business interests", AdCatalogIcon.BUSINESS),
        AdCatalogOption("technology", "Technology", "Apps, devices and technology", AdCatalogIcon.DEVICE),
        AdCatalogOption("education", "Education", "Learning and education", AdCatalogIcon.SCHOOL),
        AdCatalogOption("travel", "Travel", "Travel and tourism", AdCatalogIcon.PLANE),
        AdCatalogOption("food", "Food & beverage", "Food and restaurant interests", AdCatalogIcon.FOOD),
        AdCatalogOption("beauty", "Beauty & fashion", "Beauty and fashion interests", AdCatalogIcon.BEAUTY),
        AdCatalogOption("fitness", "Fitness & wellness", "Fitness and wellness interests", AdCatalogIcon.HEALTH),
        AdCatalogOption("entertainment", "Entertainment", "Movies, music and entertainment", AdCatalogIcon.FILM)
    )

    val genders = listOf(
        AdCatalogOption("all", "All", "", AdCatalogIcon.GROUPS),
        AdCatalogOption("male", "Male", "", AdCatalogIcon.PERSON),
        AdCatalogOption("female", "Female", "", AdCatalogIcon.PERSON)
    )

    val budgetTypes = listOf(
        AdCatalogOption("daily", "Daily Budget", "Spend up to a set amount per day", AdCatalogIcon.CALENDAR),
        AdCatalogOption("lifetime", "Lifetime Budget", "Spend a total amount over time", AdCatalogIcon.CALENDAR)
    )

    fun objective(id: String) = objectives.firstOrNull { it.id == id }
    fun category(id: String) = categories.firstOrNull { it.id == id }
    fun location(id: String) = locations.firstOrNull { it.id == id }
    fun interest(id: String) = interests.firstOrNull { it.id == id }
    fun ageRange(id: String) = ageRanges.firstOrNull { it.id == id }

    /** Returns only ids the server accepts; unknown/manual values are removed. */
    fun canonicalInterestIds(values: Collection<String>): List<String> =
        values.map { it.trim().lowercase() }
            .filter { candidate -> interests.any { it.id == candidate } && candidate != "all" }
            .distinct()
            .take(10)

    /**
     * A small pre-flight validator.  The API repeats this validation because
     * clients can be modified, but this stops an invalid request at the UI.
     */
    fun validate(
        campaignName: String,
        objectiveId: String,
        categoryId: String,
        locationId: String,
        ageRangeId: String,
        genderId: String,
        interestIds: Collection<String>,
        budgetTypeId: String,
        budgetAmount: Double,
        ctaType: String,
        destination: String,
        hasMedia: Boolean
    ): List<String> {
        val errors = mutableListOf<String>()
        if (campaignName.trim().length < 2) errors += "Enter a campaign name"
        if (objective(objectiveId) == null) errors += "Choose an ad objective"
        if (category(categoryId) == null) errors += "Choose an ad category"
        if (location(locationId) == null) errors += "Choose a location"
        if (ageRange(ageRangeId) == null) errors += "Choose an age range"
        if (genders.none { it.id == genderId }) errors += "Choose an audience gender"
        if (interestIds.any { it != "all" && interest(it) == null }) errors += "Choose interests from the list"
        if (budgetTypes.none { it.id == budgetTypeId }) errors += "Choose a budget type"
        if (!budgetAmount.isFinite() || budgetAmount <= 0.0) errors += "Enter a budget greater than zero"
        if (!hasMedia) errors += "Choose an existing post or upload image/video media"
        if (ctaType !in setOf("website", "call", "whatsapp", "visit")) errors += "Choose an action"
        if (ctaType != "visit" && destination.isBlank()) errors += "Enter a destination for this action"
        return errors
    }
}
