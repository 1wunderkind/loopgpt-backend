/**
 * Chef Personalities for Journey 3
 * 
 * Three distinct chef personas with different cooking styles and chaos levels:
 * - Jamie Leftover (1-3): Simple, comforting, beginner-friendly
 * - Paul Leftovuse (4-7): Refined, technical, sophisticated
 * - Gordon Leftover-Slay (8-10): Wild, experimental, intense
 */

export type ChefName = "jamie" | "paul" | "gordon";

export interface ChefPersonality {
  name: string;
  fullName: string;
  chaosRange: [number, number];
  style: string;
  tone: string;
  targetAudience: string;
  emoji: string;
}

export const CHEF_PERSONALITIES: Record<ChefName, ChefPersonality> = {
  jamie: {
    name: "jamie",
    fullName: "Jamie Leftover",
    chaosRange: [1, 3],
    style: "Simple, accessible recipes with clear instructions",
    tone: "Warm, encouraging, practical",
    targetAudience: "Beginners, busy parents, comfort food lovers",
    emoji: "👨‍🍳",
  },
  paul: {
    name: "paul",
    fullName: "Paul Leftovuse",
    chaosRange: [4, 7],
    style: "Refined techniques with attention to detail",
    tone: "Precise, technical, sophisticated",
    targetAudience: "Intermediate cooks, food enthusiasts, technique learners",
    emoji: "👨‍🍳",
  },
  gordon: {
    name: "gordon",
    fullName: "Gordon Leftover-Slay",
    chaosRange: [8, 10],
    style: "Wild combinations, aggressive flavors, experimental",
    tone: "Intense, bold, unpredictable",
    targetAudience: "Adventurous eaters, experienced cooks, chaos seekers",
    emoji: "👨‍🍳",
  },
};

/**
 * Get chef personality intro based on chef name and chaos level
 */
export function getChefIntro(chef: ChefName, chaosLevel: number): string {
  const intros = {
    jamie: [
      "Right, lovely! Let's turn those leftovers into something proper tasty. This is dead simple, I promise - even if you've never cooked before, you'll smash this.",
      "Hello, hello! Look at these beautiful ingredients. We're going to make something absolutely delicious, and it's going to be so easy.",
      "Alright, let's get cooking! This is one of my favorite ways to use up leftovers - simple, quick, and absolutely delicious.",
    ],
    paul: [
      "Ah, magnifique! These ingredients present an opportunity for something truly special. We'll employ a classic technique with a modern twist - precision is key.",
      "Bonjour! What we have here is a chance to create something refined. Pay attention to the details, and we'll achieve perfection.",
      "Excellent. These ingredients deserve respect. We'll use proper technique to elevate them into something memorable.",
    ],
    gordon: [
      "RIGHT! Listen up - we're going to do something absolutely mental with these leftovers. Forget everything you know about cooking. This is going to be INSANE.",
      "COME ON! Look at these ingredients - most people would throw them away, but we're going to make something EXTRAORDINARY. Let's get creative, you donkey!",
      "LISTEN! We're not making boring food here. We're going to take these leftovers and turn them into something SPECTACULAR. Are you ready? LET'S GO!",
    ],
  };

  const chefIntros = intros[chef];
  const index = Math.min(Math.floor(chaosLevel / 4), chefIntros.length - 1);
  return chefIntros[index];
}

/**
 * Get chef tips based on chef name and chaos level
 */
export function getChefTips(chef: ChefName, chaosLevel: number): string[] {
  const tips = {
    jamie: [
      "Don't worry if it's not perfect - cooking is about having fun and making something tasty!",
      "Taste as you go and adjust the seasoning to your liking.",
      "If you don't have an ingredient, just use what you've got - cooking is flexible!",
      "This tastes even better the next day, so make extra for leftovers!",
    ],
    paul: [
      "Temperature control is crucial - use a thermometer for precision.",
      "Let your proteins rest after cooking to retain their juices.",
      "Season in layers - taste and adjust at each stage of cooking.",
      "Quality ingredients make a difference - choose the best you can afford.",
    ],
    gordon: [
      "Don't be scared - push the flavors to the edge!",
      "If it's not bold enough, you're not trying hard enough!",
      "Taste it! TASTE IT! How do you know if it's good if you don't taste it?",
      "This isn't for the faint of heart - commit to the chaos!",
    ],
  };

  const chefTips = tips[chef];
  const numTips = Math.min(chaosLevel <= 3 ? 2 : chaosLevel <= 7 ? 3 : 4, chefTips.length);
  return chefTips.slice(0, numTips);
}

/**
 * Get chef closing message based on chef name
 */
export function getChefClosing(chef: ChefName): string {
  const closings = {
    jamie: "There you go - lovely! Enjoy your meal, and remember, cooking should be fun. See you next time!",
    paul: "Voilà! A dish worthy of your effort. Bon appétit, and remember - perfection is in the details.",
    gordon: "DONE! Now that's how you cook with leftovers. Absolutely stunning. Now get in the kitchen and make it happen!",
  };

  return closings[chef];
}

/**
 * Validate chef name and chaos level
 */
export function validateChefAndChaos(chef: string, chaosLevel: number): {
  valid: boolean;
  error?: string;
  suggestedChef?: ChefName;
} {
  // Validate chef name
  if (!["jamie", "paul", "gordon"].includes(chef)) {
    return {
      valid: false,
      error: `Invalid chef name: ${chef}. Choose from: jamie, paul, gordon`,
    };
  }

  const chefName = chef as ChefName;
  const personality = CHEF_PERSONALITIES[chefName];

  // Validate chaos level
  if (chaosLevel < 1 || chaosLevel > 10) {
    return {
      valid: false,
      error: `Chaos level must be between 1 and 10. Got: ${chaosLevel}`,
    };
  }

  // Check if chaos level matches chef's range
  const [minChaos, maxChaos] = personality.chaosRange;
  if (chaosLevel < minChaos || chaosLevel > maxChaos) {
    // Suggest appropriate chef for this chaos level
    let suggestedChef: ChefName;
    if (chaosLevel <= 3) suggestedChef = "jamie";
    else if (chaosLevel <= 7) suggestedChef = "paul";
    else suggestedChef = "gordon";

    return {
      valid: false,
      error: `Chaos level ${chaosLevel} doesn't match ${personality.fullName}'s style (${minChaos}-${maxChaos}). Try ${CHEF_PERSONALITIES[suggestedChef].fullName} instead!`,
      suggestedChef,
    };
  }

  return { valid: true };
}

/**
 * Auto-select chef based on chaos level
 */
export function autoSelectChef(chaosLevel: number): ChefName {
  if (chaosLevel <= 3) return "jamie";
  if (chaosLevel <= 7) return "paul";
  return "gordon";
}

/**
 * Get recommended chaos level for a chef
 */
export function getRecommendedChaos(chef: ChefName): number {
  const ranges = {
    jamie: 2,
    paul: 5,
    gordon: 9,
  };
  return ranges[chef];
}

/**
 * Format chef presentation for response
 */
export function formatChefPresentation(chef: ChefName, recipeName: string): string {
  const personality = CHEF_PERSONALITIES[chef];
  return `# ${personality.emoji} ${personality.fullName} Presents: ${recipeName}`;
}

/**
 * Get chef-specific cooking instruction style
 */
export function styleInstruction(chef: ChefName, instruction: string, index: number): string {
  switch (chef) {
    case "jamie":
      // Simple, encouraging style
      return `${index + 1}. ${instruction}`;
    
    case "paul":
      // Precise, technical style
      return `${index + 1}. ${instruction} (Take your time with this step.)`;
    
    case "gordon":
      // Intense, commanding style
      return `${index + 1}. ${instruction.toUpperCase()}`;
    
    default:
      return `${index + 1}. ${instruction}`;
  }
}

/**
 * Get chef emoji for different contexts
 */
export function getChefEmoji(chef: ChefName, context: "intro" | "tip" | "ingredient" | "time"): string {
  const emojis = {
    jamie: {
      intro: "👨‍🍳",
      tip: "💡",
      ingredient: "🥘",
      time: "⏱️",
    },
    paul: {
      intro: "👨‍🍳",
      tip: "✨",
      ingredient: "🍽️",
      time: "⏰",
    },
    gordon: {
      intro: "👨‍🍳",
      tip: "🔥",
      ingredient: "💥",
      time: "⚡",
    },
  };

  return emojis[chef][context];
}
