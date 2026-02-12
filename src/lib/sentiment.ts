// Comprehensive list of negative / inappropriate words that should be blocked.
// We block negative words and only allow positive or neutral ones through.
const NEGATIVE_WORDS = new Set([
  // Insults & slurs
  "stupid", "idiot", "dumb", "moron", "fool", "foolish", "loser", "pathetic",
  "worthless", "useless", "incompetent", "ignorant", "brainless", "clueless",
  "dimwit", "halfwit", "nitwit", "twit", "dunce", "blockhead", "numbskull",
  "simpleton", "airhead", "bonehead", "dunderhead", "knucklehead", "lamebrain",
  "birdbrain", "scatterbrain", "imbecile", "cretin", "buffoon", "clown",
  "joke", "disgrace", "embarrassment", "disappointment", "failure",

  // Negative traits
  "lazy", "selfish", "greedy", "arrogant", "rude", "mean", "cruel", "nasty",
  "toxic", "manipulative", "deceitful", "dishonest", "untrustworthy",
  "unreliable", "irresponsible", "careless", "sloppy", "messy", "chaotic",
  "disorganized", "unprofessional", "immature", "childish", "petty",
  "vindictive", "spiteful", "malicious", "hostile", "aggressive", "abusive",
  "obnoxious", "annoying", "irritating", "infuriating", "unbearable",
  "intolerable", "insufferable", "repulsive", "disgusting", "revolting",
  "vile", "despicable", "contemptible", "deplorable", "abominable",
  "detestable", "loathsome", "reprehensible", "inexcusable", "unforgivable",
  "coward", "cowardly", "weak", "spineless", "gutless", "timid",
  "submissive", "passive", "doormat", "pushover", "boring", "dull",
  "tedious", "monotonous", "bland", "mediocre", "average", "ordinary",
  "forgettable", "insignificant", "irrelevant", "unimportant", "negligible",

  // Profanity / vulgar
  "damn", "hell", "crap", "crap", "crapoy", "cruddy", "cruddy",
  "ass", "asshole", "bastard", "bitch", "shit", "shitty", "fuck",
  "fucking", "fucker", "dick", "dickhead", "prick", "douche", "douchebag",
  "scum", "scumbag", "trash", "garbage", "jerk", "jackass", "wanker",
  "tosser", "twat", "slut", "whore", "skank", "hoe",

  // Negative emotions / states
  "hate", "hatred", "loathe", "despise", "detest", "abhor", "resent",
  "anger", "angry", "furious", "enraged", "livid", "seething",
  "bitter", "resentful", "jealous", "envious", "paranoid",
  "anxious", "depressed", "miserable", "wretched", "hopeless",
  "helpless", "powerless", "defeated", "broken", "damaged",
  "terrible", "horrible", "awful", "dreadful", "atrocious",
  "appalling", "ghastly", "horrendous", "nightmarish", "catastrophic",

  // Workplace negative
  "fired", "terminated", "demoted", "replaceable", "expendable",
  "deadweight", "freeloader", "slacker", "quitter", "backstabber",
  "brownnoser", "suck-up", "kiss-up", "tattletale", "snitch",
  "micromanager", "tyrant", "bully", "harasser", "predator",
  "fraud", "faker", "phony", "pretender", "impostor",
  "saboteur", "underminer", "gossip", "troublemaker", "instigator",

  // Negative descriptors
  "ugly", "fat", "skinny", "short", "old", "slow", "bad",
  "worst", "terrible", "poor", "inferior", "subpar", "lacking",
  "deficient", "inadequate", "insufficient", "unqualified",
  "inept", "clumsy", "awkward", "weird", "strange", "odd",
  "bizarre", "freaky", "creepy", "scary", "threatening",
  "dangerous", "harmful", "destructive", "disruptive",
  "negative", "pessimistic", "cynical", "sarcastic", "condescending",
  "patronizing", "dismissive", "disrespectful", "ungrateful",
  "unappreciative", "thankless",

  // Racial / discriminatory - broad catches
  "racist", "sexist", "bigot", "bigoted", "prejudiced", "discriminatory",

  // Violence-related
  "kill", "die", "dead", "death", "murder", "violent", "fight",
  "punch", "hit", "slap", "kick", "stab", "shoot", "attack",
  "destroy", "ruin", "wreck", "demolish", "annihilate", "obliterate",

  // Additional negative
  "never", "nobody", "nothing", "nowhere", "pointless", "meaningless",
  "senseless", "absurd", "ridiculous", "ludicrous", "preposterous",
  "outrageous", "unacceptable", "intolerable", "lame", "sucks",
  "stinks", "reeks", "blows", "bombs", "tanks", "flops",
  "cringe", "cringy", "crappy", "lousy", "rubbish",
]);

/**
 * Checks if a single word is considered positive/neutral (i.e. NOT negative).
 * Returns true if the word is allowed, false if it should be blocked.
 */
export function isPositiveWord(word: string): boolean {
  const normalized = word.toLowerCase().trim();

  // Must be a single word (no spaces)
  if (normalized.includes(" ") || normalized.length === 0) {
    return false;
  }

  // Must be only letters (no numbers, special chars)
  if (!/^[a-zA-Z]+$/.test(normalized)) {
    return false;
  }

  // Must be at least 2 characters
  if (normalized.length < 2) {
    return false;
  }

  // Check against negative words list
  if (NEGATIVE_WORDS.has(normalized)) {
    return false;
  }

  return true;
}

