// Profile avatar configurations
export interface ProfileAvatar {
  id: string;
  name: string;
  filename: string;
  path: string; // Local path from public/profiles
  category: 'animals' | 'disney' | 'netflix' | 'prime-video' | 'realistic-faces';
}

// Helper function to convert filename to name
const filenameToName = (filename: string): string => {
  return filename
    .replace(/\.jpg$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// Animals category avatars
const animalAvatars: ProfileAvatar[] = [
  { id: 'adventurous-frog', name: 'The Adventurous Frog', filename: 'The_Adventurous_Frog.jpg', path: '/profiles/Animals/The_Adventurous_Frog.jpg', category: 'animals' },
  { id: 'baby-dragon', name: 'The Baby Dragon', filename: 'The_Baby_Dragon.jpg', path: '/profiles/Animals/The_Baby_Dragon.jpg', category: 'animals' },
  { id: 'beautiful-zebra', name: 'The Beautiful Zebra', filename: 'The_Beautiful_Zebra.jpg', path: '/profiles/Animals/The_Beautiful_Zebra.jpg', category: 'animals' },
  { id: 'calm-tortoise', name: 'The Calm Tortoise', filename: 'The_Calm_Tortoise.jpg', path: '/profiles/Animals/The_Calm_Tortoise.jpg', category: 'animals' },
  { id: 'charming-goat-kid', name: 'The Charming Goat Kid', filename: 'The_Charming_Goat_Kid.jpg', path: '/profiles/Animals/The_Charming_Goat_Kid.jpg', category: 'animals' },
  { id: 'cheerful-chick', name: 'The Cheerful Chick', filename: 'The_Cheerful_Chick.jpg', path: '/profiles/Animals/The_Cheerful_Chick.jpg', category: 'animals' },
  { id: 'clever-fox', name: 'The Clever Fox', filename: 'The_Clever_Fox.jpg', path: '/profiles/Animals/The_Clever_Fox.jpg', category: 'animals' },
  { id: 'cool-orca', name: 'The Cool Orca', filename: 'The_Cool_Orca.jpg', path: '/profiles/Animals/The_Cool_Orca.jpg', category: 'animals' },
  { id: 'cuddly-bear-cub', name: 'The Cuddly Bear Cub', filename: 'The_Cuddly_Bear_Cub.jpg', path: '/profiles/Animals/The_Cuddly_Bear_Cub.jpg', category: 'animals' },
  { id: 'curious-giraffe', name: 'The Curious Giraffe', filename: 'The_Curious_Giraffe.jpg', path: '/profiles/Animals/The_Curious_Giraffe.jpg', category: 'animals' },
  { id: 'curious-raccoon', name: 'The Curious Raccoon', filename: 'The_Curious_Raccoon.jpg', path: '/profiles/Animals/The_Curious_Raccoon.jpg', category: 'animals' },
  { id: 'dapper-penguin', name: 'The Dapper Penguin', filename: 'The_Dapper_Penguin.jpg', path: '/profiles/Animals/The_Dapper_Penguin.jpg', category: 'animals' },
  { id: 'elegant-cat', name: 'The Elegant Cat', filename: 'The_Elegant_Cat.jpg', path: '/profiles/Animals/The_Elegant_Cat.jpg', category: 'animals' },
  { id: 'elegant-elephant-calf', name: 'The Elegant Elephant Calf', filename: 'The_Elegant_Elephant_Calf.jpg', path: '/profiles/Animals/The_Elegant_Elephant_Calf.jpg', category: 'animals' },
  { id: 'energetic-monkey', name: 'The Energetic Monkey', filename: 'The_Energetic_Monkey.jpg', path: '/profiles/Animals/The_Energetic_Monkey.jpg', category: 'animals' },
  { id: 'fierce-tiger-cub', name: 'The Fierce Tiger Cub', filename: 'The_Fierce_Tiger_Cub.jpg', path: '/profiles/Animals/The_Fierce_Tiger_Cub.jpg', category: 'animals' },
  { id: 'friendly-shark-pup', name: 'The Friendly Shark Pup', filename: 'The_Friendly_Shark_Pup.jpg', path: '/profiles/Animals/The_Friendly_Shark_Pup.jpg', category: 'animals' },
  { id: 'gentle-bunny', name: 'The Gentle Bunny', filename: 'The_GentleBunny.jpg', path: '/profiles/Animals/The_GentleBunny.jpg', category: 'animals' },
  { id: 'gentle-elephant-calf', name: 'The Gentle Elephant Calf', filename: 'The_Gentle_Elephant_Calf.jpg', path: '/profiles/Animals/The_Gentle_Elephant_Calf.jpg', category: 'animals' },
  { id: 'goofy-goat-kid', name: 'The Goofy Goat Kid', filename: 'The_Goofy_Goat_Kid.jpg', path: '/profiles/Animals/The_Goofy_Goat_Kid.jpg', category: 'animals' },
  { id: 'graceful-fawn', name: 'The Graceful Fawn', filename: 'The_Graceful_Fawn.jpg', path: '/profiles/Animals/The_Graceful_Fawn.jpg', category: 'animals' },
  { id: 'grumpy-pufferfish', name: 'The Grumpy Pufferfish', filename: 'The_Grumpy_Pufferfish.jpg', path: '/profiles/Animals/The_Grumpy_Pufferfish.jpg', category: 'animals' },
  { id: 'loyal-dog', name: 'The Loyal Dog', filename: 'The_Loyal_Dog.jpg', path: '/profiles/Animals/The_Loyal_Dog.jpg', category: 'animals' },
  { id: 'magical-unicorn-foal', name: 'The Magical Unicorn Foal', filename: 'The_Magical_Unicorn_Foal.jpg', path: '/profiles/Animals/The_Magical_Unicorn_Foal.jpg', category: 'animals' },
  { id: 'mischievous-monkey', name: 'The Mischievous Monkey', filename: 'The_Mischievous_Monkey.jpg', path: '/profiles/Animals/The_Mischievous_Monkey.jpg', category: 'animals' },
  { id: 'playful-panda-cub', name: 'The Playful Panda Cub', filename: 'The_Playful_Panda_Cub.jpg', path: '/profiles/Animals/The_Playful_Panda_Cub.jpg', category: 'animals' },
  { id: 'quirky-owl', name: 'The Quirky Owl', filename: 'The_Quirky_Owl.jpg', path: '/profiles/Animals/The_Quirky_Owl.jpg', category: 'animals' },
  { id: 'regal-lion-cub', name: 'The Regal Lion Cub', filename: 'The_Regal_Lion_Cub.jpg', path: '/profiles/Animals/The_Regal_Lion_Cub.jpg', category: 'animals' },
  { id: 'sassy-parrot', name: 'The Sassy Parrot', filename: 'The_Sassy_Parrot.jpg', path: '/profiles/Animals/The_Sassy_Parrot.jpg', category: 'animals' },
  { id: 'sleepy-bear-cub', name: 'The Sleepy Bear Cub', filename: 'The_Sleepy_Bear_Cub.jpg', path: '/profiles/Animals/The_Sleepy_Bear_Cub.jpg', category: 'animals' },
  { id: 'stylish-zebra-foal', name: 'The Stylish Zebra Foal', filename: 'The_Stylish_Zebra_Foal.jpg', path: '/profiles/Animals/The_Stylish_Zebra_Foal.jpg', category: 'animals' },
  { id: 'wily-fox', name: 'The Wily Fox', filename: 'The_Wily_Fox.jpg', path: '/profiles/Animals/The_Wily_Fox.jpg', category: 'animals' },
  { id: 'wise-owl', name: 'The Wise Owl', filename: 'The_Wise_Owl.jpg', path: '/profiles/Animals/The_Wise_Owl.jpg', category: 'animals' },
  { id: 'witty-wolf-pup', name: 'The Witty Wolf Pup', filename: 'The_Witty_Wolf_Pup.jpg', path: '/profiles/Animals/The_Witty_Wolf_Pup.jpg', category: 'animals' },
  { id: 'young-black-bear', name: 'The Young Black Bear', filename: 'The_Young_Black_Bear.jpg', path: '/profiles/Animals/The_Young_Black_Bear.jpg', category: 'animals' },
  { id: 'youthful-fawn', name: 'The Youthful Fawn', filename: 'The_Youthful_Fawn.jpg', path: '/profiles/Animals/The_Youthful_Fawn.jpg', category: 'animals' },
];

// Disney category avatars
const disneyAvatars: ProfileAvatar[] = [
  { id: 'clockwork-princess', name: 'Clockwork Princess', filename: 'Clockwork_Princess.jpg', path: '/profiles/Disney-style/Clockwork_Princess.jpg', category: 'disney' },
  { id: 'desert-bloom-prince', name: 'Desert Bloom Prince', filename: 'Desert_Bloom_Prince.jpg', path: '/profiles/Disney-style/Desert_Bloom_Prince.jpg', category: 'disney' },
  { id: 'desert-prince', name: 'Desert Prince', filename: 'Desert_Prince.jpg', path: '/profiles/Disney-style/Desert_Prince.jpg', category: 'disney' },
  { id: 'forest-princess', name: 'Forest Princess', filename: 'Forest_Princess.jpg', path: '/profiles/Disney-style/Forest_Princess.jpg', category: 'disney' },
  { id: 'harvest-prince', name: 'Harvest Prince', filename: 'Harvest_Prince.jpg', path: '/profiles/Disney-style/Harvest_Prince.jpg', category: 'disney' },
  { id: 'ice-dance-prince', name: 'Ice Dance Prince', filename: 'Ice_Dance_Prince.jpg', path: '/profiles/Disney-style/Ice_Dance_Prince.jpg', category: 'disney' },
  { id: 'icy-kingdom-princess', name: 'Icy Kingdom Princess', filename: 'Icy_Kingdom_Princess.jpg', path: '/profiles/Disney-style/Icy_Kingdom_Princess.jpg', category: 'disney' },
  { id: 'mariner-princess', name: 'Mariner Princess', filename: 'Mariner_Princess.jpg', path: '/profiles/Disney-style/Mariner_Princess.jpg', category: 'disney' },
  { id: 'music-prince', name: 'Music Prince', filename: 'Music_Prince.jpg', path: '/profiles/Disney-style/Music_Prince.jpg', category: 'disney' },
  { id: 'musical-princess', name: 'Musical Princess', filename: 'Musical_Princess.jpg', path: '/profiles/Disney-style/Musical_Princess.jpg', category: 'disney' },
  { id: 'ocean-prince', name: 'Ocean Prince', filename: 'Ocean_Prince.jpg', path: '/profiles/Disney-style/Ocean_Prince.jpg', category: 'disney' },
  { id: 'royal-guard-princess', name: 'Royal Guard Princess', filename: 'Royal_Guard_Princess.jpg', path: '/profiles/Disney-style/Royal_Guard_Princess.jpg', category: 'disney' },
  { id: 'scholar-princess', name: 'Scholar Princess', filename: 'Scholar_Princess.jpg', path: '/profiles/Disney-style/Scholar_Princess.jpg', category: 'disney' },
  { id: 'shadow-lands-princess', name: 'Shadow Lands Princess', filename: 'Shadow_Lands_Princess.jpg', path: '/profiles/Disney-style/Shadow_Lands_Princess.jpg', category: 'disney' },
  { id: 'sky-captain-princess', name: 'Sky Captain Princess', filename: 'Sky_Captain_Princess.jpg', path: '/profiles/Disney-style/Sky_Captain_Princess.jpg', category: 'disney' },
  { id: 'snow-mountain-prince', name: 'Snow Mountain Prince', filename: 'Snow_Mountain_Prince.jpg', path: '/profiles/Disney-style/Snow_Mountain_Prince.jpg', category: 'disney' },
  { id: 'star-prince', name: 'Star Prince', filename: 'Star_Prince.jpg', path: '/profiles/Disney-style/Star_Prince.jpg', category: 'disney' },
  { id: 'sun-prince', name: 'Sun Prince', filename: 'Sun_Prince.jpg', path: '/profiles/Disney-style/Sun_Prince.jpg', category: 'disney' },
  { id: 'swamp-princess', name: 'Swamp Princess', filename: 'Swamp_Princess.jpg', path: '/profiles/Disney-style/Swamp_Princess.jpg', category: 'disney' },
  { id: 'the-clockwork-prince', name: 'The Clockwork Prince', filename: 'The_Clockwork_Prince.jpg', path: '/profiles/Disney-style/The_Clockwork_Prince.jpg', category: 'disney' },
  { id: 'the-curious-mermaid-princess', name: 'The Curious Mermaid Princess', filename: 'The_Curious_Mermaid_Princess.jpg', path: '/profiles/Disney-style/The_Curious_Mermaid_Princess.jpg', category: 'disney' },
  { id: 'the-curious-merman-prince', name: 'The Curious Merman Prince', filename: 'The_Curious_Merman_Prince.jpg', path: '/profiles/Disney-style/The_Curious_Merman_Prince.jpg', category: 'disney' },
  { id: 'the-desert-bloom-princess', name: 'The Desert Bloom Princess', filename: 'The_Desert_Bloom_Princess.jpg', path: '/profiles/Disney-style/The_Desert_Bloom_Princess.jpg', category: 'disney' },
  { id: 'the-desert-rose-princess', name: 'The Desert Rose Princess', filename: 'The_Desert_Rose_Princess.jpg', path: '/profiles/Disney-style/The_Desert_Rose_Princess.jpg', category: 'disney' },
  { id: 'the-forest-prince', name: 'The Forest Prince', filename: 'The_Forest_Prince.jpg', path: '/profiles/Disney-style/The_Forest_Prince.jpg', category: 'disney' },
  { id: 'the-harvest-princess', name: 'The Harvest Princess', filename: 'The_Harvest_Princess.jpg', path: '/profiles/Disney-style/The_Harvest_Princess.jpg', category: 'disney' },
  { id: 'the-hidden-swamp-prince', name: 'The Hidden Swamp Prince', filename: 'The_Hidden_Swamp_Prince.jpg', path: '/profiles/Disney-style/The_Hidden_Swamp_Prince.jpg', category: 'disney' },
  { id: 'the-ice-skating-princess', name: 'The Ice Skating Princess', filename: 'The_Ice_Skating_Princess.jpg', path: '/profiles/Disney-style/The_Ice_Skating_Princess.jpg', category: 'disney' },
  { id: 'the-icy-kingdom-prince', name: 'The Icy Kingdom Prince', filename: 'The_Icy_Kingdom_Prince.jpg', path: '/profiles/Disney-style/The_Icy_Kingdom_Prince.jpg', category: 'disney' },
  { id: 'the-kindhearted-prince', name: 'The Kindhearted Prince', filename: 'The_Kindhearted_Prince.jpg', path: '/profiles/Disney-style/The_Kindhearted_Prince.jpg', category: 'disney' },
  { id: 'the-kindhearted-princess', name: 'The Kindhearted Princess', filename: 'The_Kindhearted_Princess.jpg', path: '/profiles/Disney-style/The_Kindhearted_Princess.jpg', category: 'disney' },
  { id: 'the-mariner-prince', name: 'The Mariner Prince', filename: 'The_Mariner_Prince.jpg', path: '/profiles/Disney-style/The_Mariner_Prince.jpg', category: 'disney' },
  { id: 'the-musical-prince', name: 'The Musical Prince', filename: 'The_Musical_Prince.jpg', path: '/profiles/Disney-style/The_Musical_Prince.jpg', category: 'disney' },
  { id: 'the-nightingale-princess', name: 'The Nightingale Princess', filename: 'The_Nightingale_Princess.jpg', path: '/profiles/Disney-style/The_Nightingale_Princess.jpg', category: 'disney' },
  { id: 'the-ocean-princess', name: 'The Ocean Princess', filename: 'The_Ocean_Princess.jpg', path: '/profiles/Disney-style/The_Ocean_Princess.jpg', category: 'disney' },
  { id: 'the-royal-guard-prince', name: 'The Royal Guard Prince', filename: 'The_Royal_Guard_Prince.jpg', path: '/profiles/Disney-style/The_Royal_Guard_Prince.jpg', category: 'disney' },
  { id: 'the-scholar-prince', name: 'The Scholar Prince', filename: 'The_Scholar_Prince.jpg', path: '/profiles/Disney-style/The_Scholar_Prince.jpg', category: 'disney' },
  { id: 'the-shadow-lands-prince', name: 'The Shadow Lands Prince', filename: 'The_Shadow_Lands_Prince.jpg', path: '/profiles/Disney-style/The_Shadow_Lands_Prince.jpg', category: 'disney' },
  { id: 'the-sky-captain-prince', name: 'The Sky Captain Prince', filename: 'The_Sky_Captain_Prince.jpg', path: '/profiles/Disney-style/The_Sky_Captain_Prince.jpg', category: 'disney' },
  { id: 'the-snowy-mountain-princess', name: 'The Snowy Mountain Princess', filename: 'The_Snowy_Mountain_Princess.jpg', path: '/profiles/Disney-style/The_Snowy_Mountain_Princess.jpg', category: 'disney' },
  { id: 'the-stargazer-princess', name: 'The Stargazer Princess', filename: 'The_Stargazer_Princess.jpg', path: '/profiles/Disney-style/The_Stargazer_Princess.jpg', category: 'disney' },
  { id: 'the-sunstone-princess', name: 'The Sunstone Princess', filename: 'The_Sunstone_Princess.jpg', path: '/profiles/Disney-style/The_Sunstone_Princess.jpg', category: 'disney' },
  { id: 'the-warrior-princess', name: 'The Warrior Princess', filename: 'The_Warrior_Princess.jpg', path: '/profiles/Disney-style/The_Warrior_Princess.jpg', category: 'disney' },
  { id: 'the-whimsical-fairy-sprite', name: 'The Whimsical Fairy Sprite', filename: 'The_Whimsical_Fairy_Sprite.jpg', path: '/profiles/Disney-style/The_Whimsical_Fairy_Sprite.jpg', category: 'disney' },
  { id: 'the-whimsical-fairy-sprite-prince', name: 'The Whimsical Fairy Sprite Prince', filename: 'The_Whimsical_Fairy_Sprite_Princ.jpg', path: '/profiles/Disney-style/The_Whimsical_Fairy_Sprite_Princ.jpg', category: 'disney' },
  { id: 'the-young-wizard-apprentice-female', name: 'The Young Wizard Apprentice Female', filename: 'The_Young_Wizard_Apprentice_Female.jpg', path: '/profiles/Disney-style/The_Young_Wizard_Apprentice_Female.jpg', category: 'disney' },
  { id: 'the-young-wizard-apprentice-male', name: 'The Young Wizard Apprentice Male', filename: 'The_Young_Wizard_Apprentice_male.jpg', path: '/profiles/Disney-style/The_Young_Wizard_Apprentice_male.jpg', category: 'disney' },
  { id: 'warrior-prince', name: 'Warrior Prince', filename: 'Warrior_Prince.jpg', path: '/profiles/Disney-style/Warrior_Prince.jpg', category: 'disney' },
  { id: 'image-fx-76', name: 'Image FX 76', filename: 'Image_fx (76).jpg', path: '/profiles/Disney-style/Image_fx (76).jpg', category: 'disney' },
  { id: 'the-dragon-rider', name: 'The Dragon Rider', filename: 'The_Dragon_Rider.jpg', path: '/profiles/Disney-style/The_Dragon_Rider.jpg', category: 'disney' },
  { id: 'the-fantasy-knight-commander', name: 'The Fantasy Knight Commander', filename: 'The_Fantasy_Knight_Commander.jpg', path: '/profiles/Disney-style/The_Fantasy_Knight_Commander.jpg', category: 'disney' },
  { id: 'the-magical-seeker', name: 'The Magical Seeker', filename: 'The_Magical_Seeker.jpg', path: '/profiles/Disney-style/The_Magical_Seeker.jpg', category: 'disney' },
  { id: 'the-medieval-rogue', name: 'The Medieval Rogue', filename: 'The_Medieval_Rogue.jpg', path: '/profiles/Disney-style/The_Medieval_Rogue.jpg', category: 'disney' },
  { id: 'the-mischievous-yokai', name: 'The Mischievous Yokai', filename: 'The_Mischievous_Yokai.jpg', path: '/profiles/Disney-style/The_Mischievous_Yokai.jpg', category: 'disney' },
  { id: 'the-post-apocalyptic-survivor', name: 'The Post Apocalyptic Survivor', filename: 'The_Post_Apocalyptic_Survivor.jpg', path: '/profiles/Disney-style/The_Post_Apocalyptic_Survivor.jpg', category: 'disney' },
  { id: 'the-young-arcane-scientist', name: 'The Young Arcane Scientist', filename: 'The_Young_Arcane_Scientist.jpg', path: '/profiles/Disney-style/The_Young_Arcane_Scientist.jpg', category: 'disney' },
];

// Netflix category avatars
const netflixAvatars: ProfileAvatar[] = [
  { id: 'futuristic-tech-warrior', name: 'Futuristic Tech Warrior', filename: '20251112_0202_Futuristic Tech Warrior_simple_compose_F_01k9vdyrx2fz09eg41b2ecja00.png', path: '/profiles/Netflix/20251112_0202_Futuristic Tech Warrior_simple_compose_F_01k9vdyrx2fz09eg41b2ecja00.png', category: 'netflix' },
  { id: 'fierce-determined-warrior', name: 'Fierce Determined Warrior', filename: '20251112_0204_Fierce Determined Warrior_simple_compose_F_01k9ve1dc1fwq908ax3wgjvv9n.png', path: '/profiles/Netflix/20251112_0204_Fierce Determined Warrior_simple_compose_F_01k9ve1dc1fwq908ax3wgjvv9n.png', category: 'netflix' },
  { id: 'warriors-intense-gaze', name: 'Warrior\'s Intense Gaze', filename: '20251112_0204_Warrior\'s Intense Gaze_simple_compose_M_01k9ve16khe6atyga25wqyewq8.png', path: '/profiles/Netflix/20251112_0204_Warrior\'s Intense Gaze_simple_compose_M_01k9ve16khe6atyga25wqyewq8.png', category: 'netflix' },
  { id: 'rebel-in-shadows', name: 'Rebel in Shadows', filename: '20251112_0205_Rebel in Shadows_simple_compose_F_01k9ve3t79ecz88j8ax76zsgze.png', path: '/profiles/Netflix/20251112_0205_Rebel in Shadows_simple_compose_F_01k9ve3t79ecz88j8ax76zsgze.png', category: 'netflix' },
  { id: 'sophisticated-urban-elegance', name: 'Sophisticated Urban Elegance', filename: '20251112_0205_Sophisticated Urban Elegance_M_simple_compose_01k9ve3kpcef49dvyeaahjbx7x.png', path: '/profiles/Netflix/20251112_0205_Sophisticated Urban Elegance_M_simple_compose_01k9ve3kpcef49dvyeaahjbx7x.png', category: 'netflix' },
  { id: 'intense-focused-gaze', name: 'Intense Focused Gaze', filename: '20251112_0206_Intense Focused Gaze_simple_compose_F_01k9ve62v2f76aeebvh63swwp6.png', path: '/profiles/Netflix/20251112_0206_Intense Focused Gaze_simple_compose_F_01k9ve62v2f76aeebvh63swwp6.png', category: 'netflix' },
  { id: 'regal-military-portrait', name: 'Regal Military Portrait', filename: '20251112_0206_Regal Military Portrait_simple_compose_M_01k9ve5v7se2vb8tsa0n2qefa3.png', path: '/profiles/Netflix/20251112_0206_Regal Military Portrait_simple_compose_M_01k9ve5v7se2vb8tsa0n2qefa3.png', category: 'netflix' },
  { id: 'neon-glamour-portrait', name: 'Neon Glamour Portrait', filename: '20251112_0207_Neon Glamour Portrait_simple_compose_F_01k9ve7m5fe49tdkjmnr1t9eqs.png', path: '/profiles/Netflix/20251112_0207_Neon Glamour Portrait_simple_compose_F_01k9ve7m5fe49tdkjmnr1t9eqs.png', category: 'netflix' },
  { id: 'ethereal-forest-sorceress', name: 'Ethereal Forest Sorceress', filename: '20251112_0208_Ethereal Forest Sorceress_simple_compose_F_01k9ve78wcff9bf73me6gymzb0.png', path: '/profiles/Netflix/20251112_0208_Ethereal Forest Sorceress_simple_compose_F_01k9ve78wcff9bf73me6gymzb0.png', category: 'netflix' },
  { id: 'rugged-warrior-portrait', name: 'Rugged Warrior Portrait', filename: '20251112_0208_Rugged Warrior Portrait_simple_compose_M_01k9ve93vqf35bj323hbh3y1mn.png', path: '/profiles/Netflix/20251112_0208_Rugged Warrior Portrait_simple_compose_M_01k9ve93vqf35bj323hbh3y1mn.png', category: 'netflix' },
  { id: 'cynical-empathy-portrait', name: 'Cynical Empathy Portrait', filename: '20251112_0210_Cynical Empathy Portrait_simple_compose_M_01k9ved5eme9zbyeg4bvs485za.png', path: '/profiles/Netflix/20251112_0210_Cynical Empathy Portrait_simple_compose_M_01k9ved5eme9zbyeg4bvs485za.png', category: 'netflix' },
  { id: 'focused-medical-professional', name: 'Focused Medical Professional', filename: '20251112_0210_Focused Medical Professional_simple_compose_F_01k9vecwyaevzaxwevqway3xeg.png', path: '/profiles/Netflix/20251112_0210_Focused Medical Professional_simple_compose_F_01k9vecwyaevzaxwevqway3xeg.png', category: 'netflix' },
  { id: 'stoic-martial-artist', name: 'Stoic Martial Artist', filename: '20251112_0211_Stoic Martial Artist_simple_compose_F_01k9vee98pexmvwdfc0agnesn3.png', path: '/profiles/Netflix/20251112_0211_Stoic Martial Artist_simple_compose_F_01k9vee98pexmvwdfc0agnesn3.png', category: 'netflix' },
  { id: 'viking-warrior-portrait', name: 'Viking Warrior Portrait', filename: '20251112_0211_Viking Warrior Portrait_simple_compose_M_01k9veem5sf5n8zrjf9sbn2b00.png', path: '/profiles/Netflix/20251112_0211_Viking Warrior Portrait_simple_compose_M_01k9veem5sf5n8zrjf9sbn2b00.png', category: 'netflix' },
  { id: 'intellectual-mystery-portrait', name: 'Intellectual Mystery Portrait', filename: '20251112_0212_Intellectual Mystery Portrait_simple_compose_M_01k9vegqg2evpask0m4dk423xq.png', path: '/profiles/Netflix/20251112_0212_Intellectual Mystery Portrait_simple_compose_M_01k9vegqg2evpask0m4dk423xq.png', category: 'netflix' },
  { id: 'resourceful-starship-mechanic', name: 'Resourceful Starship Mechanic', filename: '20251112_0212_Resourceful Starship Mechanic_simple_compose_F_01k9vefq59fdbrfdzrtk9t0sqk.png', path: '/profiles/Netflix/20251112_0212_Resourceful Starship Mechanic_simple_compose_F_01k9vefq59fdbrfdzrtk9t0sqk.png', category: 'netflix' },
  { id: 'determined-night-stakeout', name: 'Determined Night Stakeout', filename: '20251112_0213_Determined Night Stakeout_simple_compose_F_01k9vejdvqe318k0dz013zsmc1.png', path: '/profiles/Netflix/20251112_0213_Determined Night Stakeout_simple_compose_F_01k9vejdvqe318k0dz013zsmc1.png', category: 'netflix' },
  { id: 'primal-intensity-portrait', name: 'Primal Intensity Portrait', filename: '20251112_0213_Primal Intensity Portrait_simple_compose_M_01k9vejsmbedbtqchv3gja9y2f.png', path: '/profiles/Netflix/20251112_0213_Primal Intensity Portrait_simple_compose_M_01k9vejsmbedbtqchv3gja9y2f.png', category: 'netflix' },
  { id: 'dignified-elder-portrait', name: 'Dignified Elder Portrait', filename: '20251112_0214_Dignified Elder Portrait_simple_compose_F_01k9vemc3efcs85xy4p0sycewc.png', path: '/profiles/Netflix/20251112_0214_Dignified Elder Portrait_simple_compose_F_01k9vemc3efcs85xy4p0sycewc.png', category: 'netflix' },
  { id: 'cybernetic-warrior-portrait', name: 'Cybernetic Warrior Portrait', filename: '20251112_0215_Cybernetic Warrior Portrait_simple_compose_F_01k9vep56tfg8ravj5apezmk4v.png', path: '/profiles/Netflix/20251112_0215_Cybernetic Warrior Portrait_simple_compose_F_01k9vep56tfg8ravj5apezmk4v.png', category: 'netflix' },
  { id: 'cybernetic-intensity', name: 'Cybernetic Intensity', filename: '20251112_0225_Cybernetic Intensity_simple_compose_F_01k9vf77x1ebc9xgyt5eyy9hn5.png', path: '/profiles/Netflix/20251112_0225_Cybernetic Intensity_simple_compose_F_01k9vf77x1ebc9xgyt5eyy9hn5.png', category: 'netflix' },
  { id: 'cynical-determination', name: 'Cynical Determination', filename: '20251112_1432_Cynical Determination_simple_compose_F01k9wrw2z4eb09nybhzx1mz2cr.png', path: '/profiles/Netflix/20251112_1432_Cynical Determination_simple_compose_F01k9wrw2z4eb09nybhzx1mz2cr.png', category: 'netflix' },
  { id: 'rebellious-rockstar-portrait', name: 'Rebellious Rockstar Portrait', filename: '20251112_1433_Rebellious Rockstar Portrait_simple_compose_M01k9wrwn6xfs88y4r8pnf07y82.png', path: '/profiles/Netflix/20251112_1433_Rebellious Rockstar Portrait_simple_compose_M01k9wrwn6xfs88y4r8pnf07y82.png', category: 'netflix' },
  { id: 'ancient-mystic-power', name: 'Ancient Mystic Power', filename: '20251112_1435_Ancient Mystic Power_simple_compose_M_01k9ws0k1he1t9hrjqvfvjnsc3.png', path: '/profiles/Netflix/20251112_1435_Ancient Mystic Power_simple_compose_M_01k9ws0k1he1t9hrjqvfvjnsc3.png', category: 'netflix' },
  { id: 'elegant-cunning-portrait', name: 'Elegant Cunning Portrait', filename: '20251112_1435_Elegant Cunning Portrait_simple_compose_F_01k9ws0rk5fy4ry074yszf2p71.png', path: '/profiles/Netflix/20251112_1435_Elegant Cunning Portrait_simple_compose_F_01k9ws0rk5fy4ry074yszf2p71.png', category: 'netflix' },
  { id: 'rugged-determination-scene', name: 'Rugged Determination Scene', filename: '20251112_1435_Rugged Determination Scene_simple_compose_M_01k9ws17z9fas9x2wq8ta7bn9w.png', path: '/profiles/Netflix/20251112_1435_Rugged Determination Scene_simple_compose_M_01k9ws17z9fas9x2wq8ta7bn9w.png', category: 'netflix' },
  { id: 'galactic-explorers-wonder', name: 'Galactic Explorer\'s Wonder', filename: '20251112_1436_Galactic Explorer\'s Wonder_simple_compose_F_01k9ws2mcjfbt85p6cdtqkdq0k.png', path: '/profiles/Netflix/20251112_1436_Galactic Explorer\'s Wonder_simple_compose_F_01k9ws2mcjfbt85p6cdtqkdq0k.png', category: 'netflix' },
  { id: 'stealthy-intensity', name: 'Stealthy Intensity', filename: '20251112_1436_Stealthy Intensity_simple_compose_M_01k9ws2ccyfbzb4wx4j542ht6e.png', path: '/profiles/Netflix/20251112_1436_Stealthy Intensity_simple_compose_M_01k9ws2ccyfbzb4wx4j542ht6e.png', category: 'netflix' },
  { id: 'wisdom-in-tranquility', name: 'Wisdom in Tranquility', filename: '20251112_1436_Wisdom in Tranquility_simple_compose_F_01k9ws34q6eqyr4ed3ch9gga2w.png', path: '/profiles/Netflix/20251112_1436_Wisdom in Tranquility_simple_compose_F_01k9ws34q6eqyr4ed3ch9gga2w.png', category: 'netflix' },
];

// Prime Video category avatars
const primeVideoAvatars: ProfileAvatar[] = [
  { id: 'mysterious-victorian-detective-prime', name: 'Mysterious Victorian Detective', filename: '20251112_1438_Mysterious Victorian Detective_simple_compose_F_01k9ws66b3et68th3rfdh0mp73.png', path: '/profiles/Prime-Video-Style/20251112_1438_Mysterious Victorian Detective_simple_compose_F_01k9ws66b3et68th3rfdh0mp73.png', category: 'prime-video' },
  { id: 'arcane-majesty-unveiled', name: 'Arcane Majesty Unveiled', filename: '20251112_1442_Arcane Majesty Unveiled_simple_compose_01k9wsca99e439m32g40w1r9jt.png', path: '/profiles/Prime-Video-Style/20251112_1442_Arcane Majesty Unveiled_simple_compose_01k9wsca99e439m32g40w1r9jt.png', category: 'prime-video' },
  { id: 'determined-space-commander', name: 'Determined Space Commander', filename: '20251112_1442_Determined Space Commander_simple_compose_01k9wscq4xecwb9my6verwwe49.png', path: '/profiles/Prime-Video-Style/20251112_1442_Determined Space Commander_simple_compose_01k9wscq4xecwb9my6verwwe49.png', category: 'prime-video' },
  { id: 'stoic-warrior-portrait-prime', name: 'Stoic Warrior Portrait', filename: '20251112_1442_Stoic Warrior Portrait_simple_compose_01k9wscyw4fzvvkd1t0hdb8zqg.png', path: '/profiles/Prime-Video-Style/20251112_1442_Stoic Warrior Portrait_simple_compose_01k9wscyw4fzvvkd1t0hdb8zqg.png', category: 'prime-video' },
  { id: 'defiant-survivor-portrait', name: 'Defiant Survivor Portrait', filename: '20251112_1443_Defiant Survivor Portrait_simple_compose_01k9wses1sek8r9bq8zmyps38s.png', path: '/profiles/Prime-Video-Style/20251112_1443_Defiant Survivor Portrait_simple_compose_01k9wses1sek8r9bq8zmyps38s.png', category: 'prime-video' },
  { id: 'intimidating-elegance', name: 'Intimidating Elegance', filename: '20251112_1443_Intimidating Elegance_simple_compose_01k9wsf0fafkabkz2rfkw27swd.png', path: '/profiles/Prime-Video-Style/20251112_1443_Intimidating Elegance_simple_compose_01k9wsf0fafkabkz2rfkw27swd.png', category: 'prime-video' },
  { id: 'mystical-victorian-elegance', name: 'Mystical Victorian Elegance', filename: '20251112_1443_Mystical Victorian Elegance_simple_compose_01k9wsfj4yf4ra6a0zr3xcnaqb.png', path: '/profiles/Prime-Video-Style/20251112_1443_Mystical Victorian Elegance_simple_compose_01k9wsfj4yf4ra6a0zr3xcnaqb.png', category: 'prime-video' },
  { id: 'determined-amidst-danger', name: 'Determined Amidst Danger', filename: '20251112_1444_Determined Amidst Danger_simple_compose_01k9wshf4hevya0d18p8rws6hq.png', path: '/profiles/Prime-Video-Style/20251112_1444_Determined Amidst Danger_simple_compose_01k9wshf4hevya0d18p8rws6hq.png', category: 'prime-video' },
  { id: 'ethereal-shadowed-entity', name: 'Ethereal Shadowed Entity', filename: '20251112_1444_Ethereal Shadowed Entity_simple_compose_01k9wsgw1zey5tnfjrx713t7rc.png', path: '/profiles/Prime-Video-Style/20251112_1444_Ethereal Shadowed Entity_simple_compose_01k9wsgw1zey5tnfjrx713t7rc.png', category: 'prime-video' },
  { id: 'watchful-prairie-archer', name: 'Watchful Prairie Archer', filename: '20251112_1444_Watchful Prairie Archer_simple_compose_01k9wsgpj1en1a9p7yjje37ms7.png', path: '/profiles/Prime-Video-Style/20251112_1444_Watchful Prairie Archer_simple_compose_01k9wsgpj1en1a9p7yjje37ms7.png', category: 'prime-video' },
  { id: 'cynical-superhero-portrait', name: 'Cynical Superhero Portrait', filename: '20251112_1447_Cynical Superhero Portrait_simple_compose_01k9wspycsez8s4561wkz63he3.png', path: '/profiles/Prime-Video-Style/20251112_1447_Cynical Superhero Portrait_simple_compose_01k9wspycsez8s4561wkz63he3.png', category: 'prime-video' },
  { id: 'elegant-power-portrait', name: 'Elegant Power Portrait', filename: '20251112_1448_Elegant Power Portrait_simple_compose_01k9wsr0ddesgajw3w5qwtxz6k.png', path: '/profiles/Prime-Video-Style/20251112_1448_Elegant Power Portrait_simple_compose_01k9wsr0ddesgajw3w5qwtxz6k.png', category: 'prime-video' },
  { id: 'rebellious-aristocrat-portrait', name: 'Rebellious Aristocrat Portrait', filename: '20251112_1448_Rebellious Aristocrat Portrait_simple_compose_01k9wssawhe2f8n7scj6cpg9sj.png', path: '/profiles/Prime-Video-Style/20251112_1448_Rebellious Aristocrat Portrait_simple_compose_01k9wssawhe2f8n7scj6cpg9sj.png', category: 'prime-video' },
  { id: 'celestial-serenity-portrait', name: 'Celestial Serenity Portrait', filename: '20251112_1449_Celestial Serenity Portrait_simple_compose_01k9wstqdefwdrxrmhd964p7et.png', path: '/profiles/Prime-Video-Style/20251112_1449_Celestial Serenity Portrait_simple_compose_01k9wstqdefwdrxrmhd964p7et.png', category: 'prime-video' },
  { id: 'eccentric-scientists-lair', name: 'Eccentric Scientist\'s Lair', filename: '20251112_1449_Eccentric Scientist\'s Lair_simple_compose_01k9wst228f2prg0yeargg1agy.png', path: '/profiles/Prime-Video-Style/20251112_1449_Eccentric Scientist\'s Lair_simple_compose_01k9wst228f2prg0yeargg1agy.png', category: 'prime-video' },
  { id: 'stoic-noir-reflection', name: 'Stoic Noir Reflection', filename: '20251112_1449_Stoic Noir Reflection_simple_compose_01k9wsv0p9ffksfvd450j8km9z.png', path: '/profiles/Prime-Video-Style/20251112_1449_Stoic Noir Reflection_simple_compose_01k9wsv0p9ffksfvd450j8km9z.png', category: 'prime-video' },
  { id: 'powerful-throne-portrait', name: 'Powerful Throne Portrait', filename: '20251112_1450_Powerful Throne Portrait_simple_compose_01k9wswt4wfkjr7nagm06z366z.png', path: '/profiles/Prime-Video-Style/20251112_1450_Powerful Throne Portrait_simple_compose_01k9wswt4wfkjr7nagm06z366z.png', category: 'prime-video' },
  { id: 'sentient-robot-portrait', name: 'Sentient Robot Portrait', filename: '20251112_1450_Sentient Robot Portrait_simple_compose_01k9wsvjm1eaaadzvxdxx7zzdx.png', path: '/profiles/Prime-Video-Style/20251112_1450_Sentient Robot Portrait_simple_compose_01k9wsvjm1eaaadzvxdxx7zzdx.png', category: 'prime-video' },
  { id: 'wise-forest-guardian', name: 'Wise Forest Guardian', filename: '20251112_1450_Wise Forest Guardian_simple_compose_01k9wswp65fgmbcw07c1jra1wq.png', path: '/profiles/Prime-Video-Style/20251112_1450_Wise Forest Guardian_simple_compose_01k9wswp65fgmbcw07c1jra1wq.png', category: 'prime-video' },
  { id: 'melancholic-musician-portrait', name: 'Melancholic Musician Portrait', filename: '20251112_1451_Melancholic Musician Portrait_simple_compose_01k9wsx84pey8rcm2zr35a6p7m.png', path: '/profiles/Prime-Video-Style/20251112_1451_Melancholic Musician Portrait_simple_compose_01k9wsx84pey8rcm2zr35a6p7m.png', category: 'prime-video' },
];

// Realistic Faces category avatars
const realisticFacesAvatars: ProfileAvatar[] = [
  { id: 'artistic-woman-dark-skin', name: 'Artistic Woman (Dark Skin)', filename: 'Artistic Woman (Dark Skin).png', path: '/profiles/Realistic-Faces/Artistic Woman (Dark Skin).png', category: 'realistic-faces' },
  { id: 'artistic-woman', name: 'Artistic Woman', filename: 'Artistic Woman.png', path: '/profiles/Realistic-Faces/Artistic Woman.png', category: 'realistic-faces' },
  { id: 'bold-man-dark-skin', name: 'Bold Man (Dark Skin)', filename: 'Bold Man (Dark Skin).png', path: '/profiles/Realistic-Faces/Bold Man (Dark Skin).png', category: 'realistic-faces' },
  { id: 'calm-man-brown-skin', name: 'Calm Man (Brown Skin)', filename: 'Calm Man (Brown Skin).png', path: '/profiles/Realistic-Faces/Calm Man (Brown Skin).png', category: 'realistic-faces' },
  { id: 'calm-man', name: 'Calm Man', filename: 'Calm Man.png', path: '/profiles/Realistic-Faces/Calm Man.png', category: 'realistic-faces' },
  { id: 'charming-man-brown-skin', name: 'Charming Man (Brown Skin)', filename: 'Charming Man (Brown Skin).png', path: '/profiles/Realistic-Faces/Charming Man (Brown Skin).png', category: 'realistic-faces' },
  { id: 'charming-man', name: 'Charming Man', filename: 'Charming Man.png', path: '/profiles/Realistic-Faces/Charming Man.png', category: 'realistic-faces' },
  { id: 'confident-indian-man', name: 'Confident Indian Man', filename: 'Confident Indian Man.png', path: '/profiles/Realistic-Faces/Confident Indian Man.png', category: 'realistic-faces' },
  { id: 'confident-woman-dark-skin', name: 'Confident Woman (Dark Skin)', filename: 'Confident Woman (Dark Skin).png', path: '/profiles/Realistic-Faces/Confident Woman (Dark Skin).png', category: 'realistic-faces' },
  { id: 'confident-woman', name: 'Confident Woman', filename: 'Confident Woman.png', path: '/profiles/Realistic-Faces/Confident Woman.png', category: 'realistic-faces' },
  { id: 'creative-east-asian-man', name: 'Creative East Asian Man', filename: 'Creative East Asian Man.png', path: '/profiles/Realistic-Faces/Creative East Asian Man.png', category: 'realistic-faces' },
  { id: 'creative-man-dark-skin', name: 'Creative Man (Dark Skin)', filename: 'Creative Man (Dark Skin).png', path: '/profiles/Realistic-Faces/Creative Man (Dark Skin).png', category: 'realistic-faces' },
  { id: 'creative-man', name: 'Creative Man', filename: 'Creative Man.png', path: '/profiles/Realistic-Faces/Creative Man.png', category: 'realistic-faces' },
  { id: 'distinguished-indian-man', name: 'Distinguished Indian Man', filename: 'Distinguished Indian Man.png', path: '/profiles/Realistic-Faces/Distinguished Indian Man.png', category: 'realistic-faces' },
  { id: 'dynamic-east-asian-man', name: 'Dynamic East Asian Man', filename: 'Dynamic East Asian Man.png', path: '/profiles/Realistic-Faces/Dynamic East Asian Man.png', category: 'realistic-faces' },
  { id: 'dynamic-man-dark-skin', name: 'Dynamic Man (Dark Skin)', filename: 'Dynamic Man (Dark Skin).png', path: '/profiles/Realistic-Faces/Dynamic Man (Dark Skin).png', category: 'realistic-faces' },
  { id: 'dynamic-man', name: 'Dynamic Man', filename: 'Dynamic Man.png', path: '/profiles/Realistic-Faces/Dynamic Man.png', category: 'realistic-faces' },
  { id: 'dynamic-woman-dark-skin', name: 'Dynamic Woman (Dark Skin)', filename: 'Dynamic Woman (Dark Skin).png', path: '/profiles/Realistic-Faces/Dynamic Woman (Dark Skin).png', category: 'realistic-faces' },
  { id: 'dynamic-woman', name: 'Dynamic Woman', filename: 'Dynamic Woman.png', path: '/profiles/Realistic-Faces/Dynamic Woman.png', category: 'realistic-faces' },
  { id: 'elegant-east-asian-woman', name: 'Elegant East Asian Woman', filename: 'Elegant East Asian Woman.png', path: '/profiles/Realistic-Faces/Elegant East Asian Woman.png', category: 'realistic-faces' },
  { id: 'elegant-indian-woman', name: 'Elegant Indian Woman', filename: 'Elegant Indian Woman.png', path: '/profiles/Realistic-Faces/Elegant Indian Woman.png', category: 'realistic-faces' },
  { id: 'elegant-woman', name: 'Elegant Woman', filename: 'Elegant Woman.png', path: '/profiles/Realistic-Faces/Elegant Woman.png', category: 'realistic-faces' },
  { id: 'energetic-man-dark-skin', name: 'Energetic Man (Dark Skin)', filename: 'Energetic Man (Dark Skin).png', path: '/profiles/Realistic-Faces/Energetic Man (Dark Skin).png', category: 'realistic-faces' },
  { id: 'energetic-man', name: 'Energetic Man', filename: 'Energetic Man.png', path: '/profiles/Realistic-Faces/Energetic Man.png', category: 'realistic-faces' },
  { id: 'enigmatic-woman-dark-skin', name: 'Enigmatic Woman (Dark Skin)', filename: 'Enigmatic Woman (Dark Skin).png', path: '/profiles/Realistic-Faces/Enigmatic Woman (Dark Skin).png', category: 'realistic-faces' },
  { id: 'enigmatic-woman', name: 'Enigmatic Woman', filename: 'Enigmatic Woman.png', path: '/profiles/Realistic-Faces/Enigmatic Woman.png', category: 'realistic-faces' },
  { id: 'expressive-indian-man', name: 'Expressive Indian Man', filename: 'Expressive Indian Man.png', path: '/profiles/Realistic-Faces/Expressive Indian Man.png', category: 'realistic-faces' },
  { id: 'focused-east-asian-man', name: 'Focused East Asian Man', filename: 'Focused East Asian Man.png', path: '/profiles/Realistic-Faces/Focused East Asian Man.png', category: 'realistic-faces' },
  { id: 'friendly-east-asian-woman', name: 'Friendly East Asian Woman', filename: 'Friendly East Asian Woman.png', path: '/profiles/Realistic-Faces/Friendly East Asian Woman.png', category: 'realistic-faces' },
  { id: 'friendly-man-brown-skin', name: 'Friendly Man (Brown Skin)', filename: 'Friendly Man (Brown Skin).png', path: '/profiles/Realistic-Faces/Friendly Man (Brown Skin).png', category: 'realistic-faces' },
  { id: 'friendly-man', name: 'Friendly Man', filename: 'Friendly Man.png', path: '/profiles/Realistic-Faces/Friendly Man.png', category: 'realistic-faces' },
  { id: 'graceful-indian-woman', name: 'Graceful Indian Woman', filename: 'Graceful Indian Woman.png', path: '/profiles/Realistic-Faces/Graceful Indian Woman.png', category: 'realistic-faces' },
  { id: 'insightful-indian-man', name: 'Insightful Indian Man', filename: 'Insightful Indian Man.png', path: '/profiles/Realistic-Faces/Insightful Indian Man.png', category: 'realistic-faces' },
  { id: 'insightful-man-dark-skin', name: 'Insightful Man (Dark Skin)', filename: 'Insightful Man (Dark Skin).png', path: '/profiles/Realistic-Faces/Insightful Man (Dark Skin).png', category: 'realistic-faces' },
  { id: 'intense-man-dark-skin', name: 'Intense Man (Dark Skin)', filename: 'Intense Man (Dark Skin).png', path: '/profiles/Realistic-Faces/Intense Man (Dark Skin).png', category: 'realistic-faces' },
  { id: 'intense-man', name: 'Intense Man', filename: 'Intense Man.png', path: '/profiles/Realistic-Faces/Intense Man.png', category: 'realistic-faces' },
  { id: 'joyful-woman-dark-skin', name: 'Joyful Woman (Dark Skin)', filename: 'Joyful Woman (Dark Skin).png', path: '/profiles/Realistic-Faces/Joyful Woman (Dark Skin).png', category: 'realistic-faces' },
  { id: 'modern-east-asian-man', name: 'Modern East Asian Man', filename: 'Modern East Asian Man.png', path: '/profiles/Realistic-Faces/Modern East Asian Man.png', category: 'realistic-faces' },
  { id: 'modern-indian-woman', name: 'Modern Indian Woman', filename: 'Modern Indian Woman.png', path: '/profiles/Realistic-Faces/Modern Indian Woman.png', category: 'realistic-faces' },
  { id: 'mysterious-indian-woman', name: 'Mysterious Indian Woman', filename: 'Mysterious Indian Woman.png', path: '/profiles/Realistic-Faces/Mysterious Indian Woman.png', category: 'realistic-faces' },
  { id: 'mysterious-man-dark-skin', name: 'Mysterious Man (Dark Skin)', filename: 'Mysterious Man (Dark Skin).png', path: '/profiles/Realistic-Faces/Mysterious Man (Dark Skin).png', category: 'realistic-faces' },
  { id: 'mysterious-man', name: 'Mysterious Man', filename: 'Mysterious Man.png', path: '/profiles/Realistic-Faces/Mysterious Man.png', category: 'realistic-faces' },
  { id: 'poised-east-asian-woman', name: 'Poised East Asian Woman', filename: 'Poised East Asian Woman.png', path: '/profiles/Realistic-Faces/Poised East Asian Woman.png', category: 'realistic-faces' },
  { id: 'radiant-woman-brown-skin', name: 'Radiant Woman (Brown Skin)', filename: 'Radiant Woman (Brown Skin).png', path: '/profiles/Realistic-Faces/Radiant Woman (Brown Skin).png', category: 'realistic-faces' },
  { id: 'refined-man-brown-skin', name: 'Refined Man (Brown Skin)', filename: 'Refined Man (Brown Skin).png', path: '/profiles/Realistic-Faces/Refined Man (Brown Skin).png', category: 'realistic-faces' },
  { id: 'refined-man', name: 'Refined Man', filename: 'Refined Man.png', path: '/profiles/Realistic-Faces/Refined Man.png', category: 'realistic-faces' },
  { id: 'reflective-indian-man', name: 'Reflective Indian Man', filename: 'Reflective Indian Man.png', path: '/profiles/Realistic-Faces/Reflective Indian Man.png', category: 'realistic-faces' },
  { id: 'regal-woman-dark-skin', name: 'Regal Woman (Dark Skin)', filename: 'Regal Woman (Dark Skin).png', path: '/profiles/Realistic-Faces/Regal Woman (Dark Skin).png', category: 'realistic-faces' },
  { id: 'serene-east-asian-woman', name: 'Serene East Asian Woman', filename: 'Serene East Asian Woman.png', path: '/profiles/Realistic-Faces/Serene East Asian Woman.png', category: 'realistic-faces' },
  { id: 'serene-woman-blonde', name: 'Serene Woman (Blonde)', filename: 'Serene Woman (Blonde).png', path: '/profiles/Realistic-Faces/Serene Woman (Blonde).png', category: 'realistic-faces' },
  { id: 'serene-woman-brown-skin', name: 'Serene Woman (Brown Skin)', filename: 'Serene Woman (Brown Skin).png', path: '/profiles/Realistic-Faces/Serene Woman (Brown Skin).png', category: 'realistic-faces' },
  { id: 'serene-woman', name: 'Serene Woman', filename: 'Serene Woman.png', path: '/profiles/Realistic-Faces/Serene Woman.png', category: 'realistic-faces' },
  { id: 'thoughtful-east-asian-man', name: 'Thoughtful East Asian Man', filename: 'Thoughtful East Asian Man.png', path: '/profiles/Realistic-Faces/Thoughtful East Asian Man.png', category: 'realistic-faces' },
  { id: 'thoughtful-man-brown-skin', name: 'Thoughtful Man (Brown Skin)', filename: 'Thoughtful Man (Brown Skin).png', path: '/profiles/Realistic-Faces/Thoughtful Man (Brown Skin).png', category: 'realistic-faces' },
  { id: 'thoughtful-man', name: 'Thoughtful Man', filename: 'Thoughtful Man.png', path: '/profiles/Realistic-Faces/Thoughtful Man.png', category: 'realistic-faces' },
  { id: 'thoughtful-woman-brown-skin', name: 'Thoughtful Woman (Brown Skin)', filename: 'Thoughtful Woman (Brown Skin).png', path: '/profiles/Realistic-Faces/Thoughtful Woman (Brown Skin).png', category: 'realistic-faces' },
  { id: 'thoughtful-woman', name: 'Thoughtful Woman', filename: 'Thoughtful Woman.png', path: '/profiles/Realistic-Faces/Thoughtful Woman.png', category: 'realistic-faces' },
  { id: 'vibrant-east-asian-woman', name: 'Vibrant East Asian Woman', filename: 'Vibrant East Asian Woman.png', path: '/profiles/Realistic-Faces/Vibrant East Asian Woman.png', category: 'realistic-faces' },
  { id: 'vibrant-indian-woman', name: 'Vibrant Indian Woman', filename: 'Vibrant Indian Woman.png', path: '/profiles/Realistic-Faces/Vibrant Indian Woman.png', category: 'realistic-faces' },
  { id: 'vibrant-woman-dark-skin', name: 'Vibrant Woman (Dark Skin)', filename: 'Vibrant Woman (Dark Skin).png', path: '/profiles/Realistic-Faces/Vibrant Woman (Dark Skin).png', category: 'realistic-faces' },
  { id: 'vibrant-woman', name: 'Vibrant Woman', filename: 'Vibrant Woman.png', path: '/profiles/Realistic-Faces/Vibrant Woman.png', category: 'realistic-faces' },
  { id: 'warm-woman-brown-skin', name: 'Warm Woman (Brown Skin)', filename: 'Warm Woman (Brown Skin).png', path: '/profiles/Realistic-Faces/Warm Woman (Brown Skin).png', category: 'realistic-faces' },
  { id: 'warm-woman', name: 'Warm Woman', filename: 'Warm Woman.png', path: '/profiles/Realistic-Faces/Warm Woman.png', category: 'realistic-faces' },
];

// Combined avatars array
export const profileAvatars: ProfileAvatar[] = [
  ...animalAvatars,
  ...disneyAvatars,
  ...netflixAvatars,
  ...primeVideoAvatars,
  ...realisticFacesAvatars,
];

// Avatar categories
export type AvatarCategory = 'animals' | 'disney' | 'netflix' | 'prime-video' | 'realistic-faces';

export const avatarCategories: { id: AvatarCategory; name: string }[] = [
  { id: 'animals', name: 'Animals' },
  { id: 'disney', name: 'Disney Style' },
  { id: 'netflix', name: 'Netflix Style' },
  { id: 'prime-video', name: 'Prime Video Style' },
  { id: 'realistic-faces', name: 'Realistic Faces' },
];

// Get avatars by category with sorting
export const getAvatarsByCategory = (category: AvatarCategory): ProfileAvatar[] => {
  const avatars = profileAvatars.filter(avatar => avatar.category === category);
  
  if (category === 'disney') {
    // Sort Disney avatars: Princes and Princesses first, then others
    return avatars.sort((a, b) => {
      const aIsRoyal = a.name.toLowerCase().includes('prince') || a.name.toLowerCase().includes('princess');
      const bIsRoyal = b.name.toLowerCase().includes('prince') || b.name.toLowerCase().includes('princess');
      
      // If both are royal (prince/princess), sort alphabetically
      if (aIsRoyal && bIsRoyal) {
        return a.name.localeCompare(b.name);
      }
      
      // If only a is royal, a comes first
      if (aIsRoyal && !bIsRoyal) {
        return -1;
      }
      
      // If only b is royal, b comes first
      if (!aIsRoyal && bIsRoyal) {
        return 1;
      }
      
      // If neither is royal, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }
  
  // For other categories, return as is
  return avatars;
};

// Get a random avatar for new users (only from animal avatars)
export const getRandomAvatar = (): ProfileAvatar => {
  const randomIndex = Math.floor(Math.random() * animalAvatars.length);
  return animalAvatars[randomIndex];
};

// Find avatar by ID
export const getAvatarById = (id: string): ProfileAvatar | undefined => {
  return profileAvatars.find(avatar => avatar.id === id);
};

// Get avatar path by ID (with fallback) - Returns local path from public/profiles
// URL encodes the path to handle spaces and special characters in filenames
export const getAvatarPath = (avatarId?: string): string => {
  let path: string;
  
  if (!avatarId) {
    const defaultAvatar = profileAvatars[0];
    path = defaultAvatar.path;
  } else {
    const avatar = getAvatarById(avatarId);
    if (!avatar) {
      const defaultAvatar = profileAvatars[0];
      path = defaultAvatar.path;
    } else {
      path = avatar.path;
    }
  }
  
  // Split path and encode each segment (except empty first part from leading /)
  // This handles spaces and special characters in folder and file names
  const pathParts = path.split('/');
  const encodedPath = pathParts.map((part, index) => {
    // Keep the first empty part (from leading /) and the base path parts as-is
    // Only encode the parts that might have special characters (folder names and filenames)
    if (index === 0 || part === 'profiles') {
      return part;
    }
    // Encode folder names and filenames that may contain spaces or special chars
    return encodeURIComponent(part);
  }).join('/');
  
  return encodedPath;
};

// Get avatar name by ID
export const getAvatarName = (avatarId?: string): string => {
  if (!avatarId) return profileAvatars[0].name;
  const avatar = getAvatarById(avatarId);
  return avatar?.name || profileAvatars[0].name;
};
