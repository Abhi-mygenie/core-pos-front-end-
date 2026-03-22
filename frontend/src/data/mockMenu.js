// Mock Menu Categories and Items for Order Entry Screen
export const mockMenuCategories = [
  { id: "popular", name: "Popular" },
  { id: "starters", name: "Starters" },
  { id: "main", name: "Main Course" },
  { id: "bar", name: "Bar" },
  { id: "dessert", name: "Dessert" },
];

// NOTE: mockMenuSubCategories removed - was unused in the application

export const mockMenuItems = {
  popular: [
    {
      id: "pizza1",
      name: "Margherita Pizza",
      price: 299,
      type: "veg",
      glutenFree: false,
      jain: false,
      vegan: false,
      customizable: true,
      variantGroups: [
        {
          id: "crust",
          name: "Choice of Crust",
          required: true,
          options: [
            { id: "thin", name: "Thin Crust", price: 0 },
            { id: "thick", name: "Thick Crust", price: 30 },
            { id: "cheese-burst", name: "Cheese Burst", price: 80 },
            { id: "pan", name: "Pan Crust", price: 40 }
          ]
        },
        {
          id: "base",
          name: "Choice of Base",
          required: true,
          options: [
            { id: "wheat", name: "Wheat", price: 0 },
            { id: "regular", name: "Regular", price: 0 },
            { id: "multigrain", name: "Multigrain", price: 20 },
            { id: "gluten-free", name: "Gluten Free", price: 50 }
          ]
        },
        {
          id: "size",
          name: "Choose Size",
          required: true,
          options: [
            { id: "small", name: "Small (6\")", price: 0 },
            { id: "medium", name: "Medium (8\")", price: 80 },
            { id: "large", name: "Large (10\")", price: 150 },
            { id: "xl", name: "XL (12\")", price: 220 }
          ]
        },
        {
          id: "spice",
          name: "Spice Level",
          required: false,
          options: [
            { id: "mild", name: "Mild", price: 0 },
            { id: "medium-spice", name: "Medium", price: 0 },
            { id: "hot", name: "Hot", price: 0 },
            { id: "extra-hot", name: "Extra Hot", price: 0 }
          ]
        }
      ],
      addons: [
        { id: "cheese", name: "Extra Cheese", price: 40 },
        { id: "chilli", name: "Chilli Flakes", price: 10 },
        { id: "olives", name: "Olives", price: 30 },
        { id: "jalapeno", name: "Jalapeno", price: 25 },
        { id: "mushroom", name: "Mushroom", price: 35 },
        { id: "capsicum", name: "Capsicum", price: 20 },
        { id: "onion", name: "Onion", price: 15 },
        { id: "tomato", name: "Tomato", price: 15 },
        { id: "corn", name: "Sweet Corn", price: 25 },
        { id: "paneer", name: "Paneer", price: 45 },
        { id: "oregano", name: "Oregano", price: 10 },
        { id: "basil", name: "Fresh Basil", price: 20 }
      ]
    },
    { 
      id: "p1", 
      name: "Paneer Momo (Steam)", 
      price: 280, 
      type: "veg",
      glutenFree: false,
      jain: false,
      vegan: false,
      customizable: true,
      sizes: [
        { id: "half", name: "Half Plate", price: 180 },
        { id: "full", name: "Full Plate", price: 280 },
      ],
      addons: [
        { id: "mayo", name: "Mayonnaise", price: 20 },
        { id: "schezwan", name: "Schezwan Sauce", price: 15 },
        { id: "extra-chutney", name: "Extra Chutney", price: 10 },
      ],
    },
    { 
      id: "p2", 
      name: "Butter Chicken", 
      price: 420, 
      type: "nonveg",
      glutenFree: true,
      jain: false,
      vegan: false,
      customizable: true,
      sizes: [
        { id: "half", name: "Half", price: 280 },
        { id: "full", name: "Full", price: 420 },
      ],
      addons: [
        { id: "extra-gravy", name: "Extra Gravy", price: 50 },
        { id: "boneless", name: "Boneless", price: 80 },
        { id: "extra-butter", name: "Extra Butter", price: 30 },
      ],
    },
    { id: "p3", name: "Hakka Noodles", price: 220, type: "veg", glutenFree: false, jain: false, vegan: true, customizable: false },
    { 
      id: "p4", 
      name: "Gorgons Gin", 
      price: 300, 
      type: "veg",
      glutenFree: true,
      jain: true,
      vegan: true,
      customizable: true,
      sizes: [
        { id: "30ml", name: "30 ml", price: 300 },
        { id: "60ml", name: "60 ml", price: 600 },
      ],
      addons: [
        { id: "garlic", name: "Garlic", price: 20 },
        { id: "olive", name: "Olive", price: 10 },
        { id: "cheese", name: "Cheese", price: 10 },
      ],
    },
    { id: "p5", name: "Masala Maggie", price: 150, type: "veg", glutenFree: false, jain: false, vegan: false, customizable: false },
    { 
      id: "p6", 
      name: "Hazelnut Cold Coffee", 
      price: 180, 
      type: "veg",
      glutenFree: true,
      jain: true,
      vegan: false,
      customizable: true,
      sizes: [
        { id: "regular", name: "Regular", price: 180 },
        { id: "large", name: "Large", price: 250 },
      ],
      addons: [
        { id: "extra-shot", name: "Extra Shot", price: 40 },
        { id: "whipped-cream", name: "Whipped Cream", price: 30 },
        { id: "chocolate-syrup", name: "Chocolate Syrup", price: 25 },
      ],
    },
    { id: "p7", name: "Chilly Mushroom", price: 260, type: "veg", glutenFree: false, jain: false, vegan: true, customizable: false },
    { id: "p8", name: "Fish & Chips", price: 380, type: "nonveg", glutenFree: false, jain: false, vegan: false, customizable: false },
    { 
      id: "p9", 
      name: "Mojito", 
      price: 220, 
      type: "veg",
      glutenFree: true,
      jain: true,
      vegan: true,
      customizable: true,
      sizes: [
        { id: "regular", name: "Regular", price: 220 },
        { id: "pitcher", name: "Pitcher", price: 650 },
      ],
      addons: [
        { id: "extra-mint", name: "Extra Mint", price: 15 },
        { id: "extra-lime", name: "Extra Lime", price: 10 },
      ],
    },
    { id: "p10", name: "Beer Tower", price: 1200, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "p11", name: "Egg Fried Rice", price: 200, type: "egg", glutenFree: true, jain: false, vegan: false, customizable: false },
    { id: "p12", name: "Omelette", price: 120, type: "egg", glutenFree: true, jain: false, vegan: false, customizable: false },
  ],
  starters: [
    { id: "s1", name: "Paneer Tikka", price: 320, type: "veg", glutenFree: true, jain: false, vegan: false, customizable: true },
    { id: "s2", name: "Chicken 65", price: 350, type: "nonveg", glutenFree: false, jain: false, vegan: false, customizable: false },
    { id: "s3", name: "Spring Rolls", price: 180, type: "veg", glutenFree: false, jain: true, vegan: true, customizable: false },
    { id: "s4", name: "Crispy Corn", price: 200, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "s5", name: "Tandoori Prawns", price: 480, type: "nonveg", glutenFree: true, jain: false, vegan: false, customizable: true },
    { id: "s6", name: "Mushroom Manchurian", price: 240, type: "veg", glutenFree: false, jain: false, vegan: true, customizable: false },
    { id: "s7", name: "Chicken Wings", price: 320, type: "nonveg", glutenFree: true, jain: false, vegan: false, customizable: true },
    { id: "s8", name: "Veg Soup", price: 120, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "s9", name: "Egg Bhurji", price: 150, type: "egg", glutenFree: true, jain: false, vegan: false, customizable: false },
  ],
  main: [
    { id: "m1", name: "Dal Makhani", price: 280, type: "veg", glutenFree: true, jain: false, vegan: false, customizable: false },
    { id: "m2", name: "Paneer Butter Masala", price: 320, type: "veg", glutenFree: true, jain: false, vegan: false, customizable: true },
    { id: "m3", name: "Chicken Biryani", price: 380, type: "nonveg", glutenFree: true, jain: false, vegan: false, customizable: true },
    { id: "m4", name: "Veg Fried Rice", price: 220, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "m5", name: "Mutton Rogan Josh", price: 480, type: "nonveg", glutenFree: true, jain: false, vegan: false, customizable: true },
    { id: "m6", name: "Naan", price: 50, type: "veg", glutenFree: false, jain: true, vegan: false, customizable: false },
    { id: "m7", name: "Roti", price: 30, type: "veg", glutenFree: false, jain: true, vegan: true, customizable: false },
    { id: "m8", name: "Jeera Rice", price: 180, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "m9", name: "Egg Curry", price: 220, type: "egg", glutenFree: true, jain: false, vegan: false, customizable: false },
  ],
  bar: [
    { id: "b1", name: "Whiskey Sour", price: 450, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: true },
    { id: "b2", name: "Old Monk Rum", price: 280, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "b3", name: "Kingfisher Premium", price: 220, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "b4", name: "Blue Lagoon", price: 350, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: true },
    { id: "b5", name: "Virgin Mojito", price: 180, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
    { id: "b6", name: "Long Island Iced Tea", price: 520, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: true },
    { id: "b7", name: "Margarita", price: 420, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: true },
    { id: "b8", name: "Corona Beer", price: 380, type: "veg", glutenFree: true, jain: true, vegan: true, customizable: false },
  ],
  dessert: [
    { id: "d1", name: "Gulab Jamun", price: 120, type: "veg", glutenFree: false, jain: true, vegan: false, customizable: false },
    { id: "d2", name: "Brownie with Ice Cream", price: 220, type: "egg", glutenFree: false, jain: true, vegan: false, customizable: true },
    { id: "d3", name: "Rasmalai", price: 150, type: "veg", glutenFree: true, jain: true, vegan: false, customizable: false },
    { id: "d4", name: "Cheesecake", price: 280, type: "egg", glutenFree: false, jain: true, vegan: false, customizable: false },
    { id: "d5", name: "Kulfi", price: 100, type: "veg", glutenFree: true, jain: true, vegan: false, customizable: false },
    { id: "d6", name: "Tiramisu", price: 320, type: "egg", glutenFree: false, jain: false, vegan: false, customizable: false },
  ],
};
