import type { CatalogFood } from './indianFoods';

// Recipe models, not measured nutrition or copied IFCT laboratory records.
// Each preparation has an explicit reference portion and ingredient additions.
type Nutrients = [number, number, number, number, number]; // kcal, protein, carbs, fat, fibre
type Ingredient = [string, Nutrients, string?];
const foods: CatalogFood[] = [];
const sum = (a: Nutrients, b: Nutrients): Nutrients => a.map((n, i) => Math.round((n + b[i]) * 10) / 10) as Nutrients;
const scale = (a: Nutrients, factor: number): Nutrients => a.map(n => Math.round(n * factor * 10) / 10) as Nutrients;
function add(name: string, portion: string, n: Nutrients, region: string, aliases: string[] = [], veg = true) {
  foods.push({ name, portion, calories: n[0], proteinG: n[1], carbsG: n[2], fatG: n[3], fibreG: n[4], region, veg, aliases,
    notes: 'Recipe estimate. Check the portion and adjust for oil, ingredients and cooking method; not a measured nutrition value.' });
}

// Approximate edible-ingredient profiles per 100 g. Preparation totals below
// include oil, coconut, lentils or sauce rather than assigning one value to all dishes.
const vegetables: Ingredient[] = [
  ['Potato', [77, 2, 17, 0.1, 2.2], 'aloo urulai bangaladumpa'],
  ['Sweet potato', [86, 1.6, 20, 0.1, 3], 'shakarkandi sakkaravalli'],
  ['Carrot', [41, 0.9, 10, 0.2, 2.8], 'gajar'],
  ['Beetroot', [43, 1.6, 10, 0.2, 2.8], 'beet'],
  ['Cauliflower', [25, 1.9, 5, 0.3, 2], 'gobi phool gobi'],
  ['Cabbage', [25, 1.3, 6, 0.1, 2.5], 'patta gobi muttaikose'],
  ['Red cabbage', [31, 1.4, 7, 0.2, 2.1]],
  ['Broccoli', [34, 2.8, 7, 0.4, 2.6]],
  ['French beans', [31, 1.8, 7, 0.2, 2.7], 'green beans'],
  ['Cluster beans', [35, 3.2, 6, 0.2, 4], 'guar kothavarangai'],
  ['Broad beans', [48, 3, 8, 0.4, 4], 'avarakkai sem'],
  ['Flat beans', [35, 2.5, 6, 0.3, 3], 'papdi chikkudukaya'],
  ['Green peas', [81, 5.4, 14, 0.4, 5.7], 'matar pattani'],
  ['Brinjal', [25, 1, 6, 0.2, 3], 'eggplant baingan kathirikai vankaya'],
  ['Okra', [33, 1.9, 7, 0.2, 3.2], 'bhindi vendakkai bendakaya'],
  ['Bottle gourd', [14, 0.6, 3.4, 0.1, 1], 'lauki sorakkai sorakaya'],
  ['Ridge gourd', [20, 1, 4, 0.2, 1.5], 'turai peerkangai beerakaya'],
  ['Snake gourd', [18, 0.8, 4, 0.2, 1.5], 'pudalangai potlakaya'],
  ['Ash gourd', [13, 0.4, 3, 0.1, 1], 'white pumpkin poosanikai'],
  ['Bitter gourd', [17, 1, 4, 0.2, 2.8], 'karela pavakkai kakarakaya'],
  ['Ivy gourd', [21, 1.4, 4, 0.2, 1.6], 'tindora kovakkai dondakaya'],
  ['Pointed gourd', [24, 1.4, 4.5, 0.3, 2], 'parwal potol'],
  ['Pumpkin', [26, 1, 6.5, 0.1, 0.5], 'kaddu parangikkai'],
  ['Chayote', [19, 0.8, 4.5, 0.1, 1.7], 'chow chow'],
  ['Drumstick pods', [37, 2.1, 8.5, 0.2, 3.2], 'moringa murungakkai'],
  ['Raw banana', [122, 1.3, 32, 0.4, 2.3], 'plantain vazhakkai'],
  ['Elephant foot yam', [79, 1.2, 18, 0.2, 3], 'suran senai kanda'],
  ['Taro', [112, 1.5, 26, 0.2, 4.1], 'arbi seppankizhangu'],
  ['Cassava', [160, 1.4, 38, 0.3, 1.8], 'tapioca kappa maravalli'],
  ['Turnip', [28, 0.9, 6, 0.1, 1.8], 'shalgam'],
  ['Radish', [16, 0.7, 3.4, 0.1, 1.6], 'mooli mullangi'],
  ['Capsicum', [26, 1, 6, 0.3, 2], 'bell pepper shimla mirch'],
  ['Mushroom', [22, 3.1, 3.3, 0.3, 1]],
  ['Baby corn', [26, 1.7, 5, 0.3, 2]],
  ['Zucchini', [17, 1.2, 3.1, 0.3, 1]],
  ['Green papaya', [32, 0.6, 8, 0.1, 1.8], 'raw papaya'],
  ['Green jackfruit', [94, 1.7, 23, 0.6, 2.6], 'kathal raw jackfruit'],
  ['Lotus stem', [74, 2.6, 17, 0.1, 4.9], 'kamal kakdi nadru'],
  ['Banana stem', [20, 0.6, 4, 0.1, 2], 'vazhaithandu'],
  ['Banana flower', [51, 1.6, 10, 0.6, 5], 'vazhaipoo'],
  ['Onion', [40, 1.1, 9.3, 0.1, 1.7], 'pyaz vengayam'],
  ['Tomato', [18, 0.9, 3.9, 0.2, 1.2], 'tamatar thakkali'],
];
for (const [name, n, alias] of vegetables) {
  const a = alias ? [alias] : [];
  add(`${name}, steamed`, '100 g cooked edible portion', n, 'Pan-India', a);
  add(`${name} dry sabzi`, '1 katori / 150 g', sum(scale(n, 1.2), [63, 0.5, 4, 5, 0.5]), 'North', a);
  add(`${name} poriyal`, '1 katori / 150 g', sum(scale(n, 1.2), [90, 1, 4, 8, 1.5]), 'Tamil Nadu', a);
  add(`${name} thoran`, '1 katori / 150 g', sum(scale(n, 1.2), [110, 1.5, 4, 10, 2]), 'Kerala', a);
  add(`${name} sambar`, '1 katori / 200 g', sum(scale(n, 0.7), [110, 5, 16, 3, 4]), 'South', a);
  add(`${name} kootu`, '1 katori / 180 g', sum(n, [145, 7, 18, 5, 5]), 'Tamil Nadu', a);
}
const greens: Ingredient[] = [
  ['Spinach', [23, 2.9, 3.6, 0.4, 2.2], 'palak pasalai'],
  ['Amaranth greens', [23, 2.5, 4, 0.3, 2.5], 'chaulai arai keerai thotakura'],
  ['Red amaranth greens', [25, 2.5, 4.5, 0.4, 2.6], 'lal saag'],
  ['Fenugreek leaves', [49, 4.4, 6, 0.9, 4], 'methi vendhaya keerai'],
  ['Mustard greens', [27, 2.9, 4.7, 0.4, 3.2], 'sarson'],
  ['Moringa leaves', [64, 9, 8, 1.4, 2], 'drumstick murungai keerai'],
  ['Gongura leaves', [29, 2, 5, 0.5, 3], 'sorrel pulicha keerai'],
  ['Malabar spinach', [19, 1.8, 3.4, 0.3, 2], 'basella pui bachali'],
  ['Radish leaves', [28, 2.5, 4, 0.5, 3], 'mooli patta'],
  ['Beet greens', [22, 2.2, 4.3, 0.1, 3.7]],
  ['Colocasia leaves', [42, 5, 6.7, 0.7, 3.7], 'arbi patta chembu'],
  ['Dill leaves', [43, 3.5, 7, 1, 2.1], 'suva shepu'],
  ['Bathua leaves', [43, 4.2, 7, 0.8, 4]],
  ['Agathi leaves', [93, 8, 11, 1.5, 7]],
  ['Manathakkali greens', [35, 3, 5, 0.6, 3]],
  ['Ponnanganni greens', [30, 3, 4.5, 0.5, 3]],
  ['Water spinach', [19, 2.6, 3, 0.2, 2.1], 'kalmi saag'],
  ['Turnip greens', [32, 1.5, 7, 0.3, 3.2]],
  ['Spring onion greens', [32, 1.8, 7, 0.2, 2.6]],
  ['Kale', [35, 2.9, 4.4, 1.5, 4.1]],
];
for (const [name, n, alias] of greens) {
  const a = alias ? [alias] : [];
  add(`${name} sabzi`, '1 katori / 150 g', sum(scale(n, 1.2), [63, 0.5, 4, 5, 0.5]), 'North', a);
  add(`${name} dal`, '1 katori / 200 g', sum(scale(n, 0.7), [160, 8, 22, 4, 5]), 'Pan-India', a);
  add(`${name} poriyal`, '1 katori / 150 g', sum(scale(n, 1.2), [90, 1, 4, 8, 1.5]), 'Tamil Nadu', a);
  add(`${name} thoran`, '1 katori / 150 g', sum(scale(n, 1.2), [110, 1.5, 4, 10, 2]), 'Kerala', a);
}
const pulses: Ingredient[] = [
  ['Kabuli chickpeas', [164, 8.9, 27, 2.6, 7.6], 'chole white chana'],
  ['Black chickpeas', [165, 9, 27, 2.5, 8], 'kala chana kondakadalai'],
  ['Green chickpeas', [150, 8, 24, 2, 6], 'hara chana'],
  ['Red kidney beans', [127, 8.7, 23, 0.5, 6.4], 'rajma'],
  ['White kidney beans', [140, 9.7, 26, 0.4, 6.3]],
  ['Black-eyed peas', [116, 7.7, 21, 0.5, 6.5], 'lobia karamani'],
  ['Whole green gram', [105, 7, 19, 0.4, 7.6], 'moong pachai payaru'],
  ['Split green gram', [105, 7, 19, 0.4, 4], 'moong dal'],
  ['Whole black gram', [116, 7.5, 20, 0.6, 6], 'sabut urad'],
  ['Split black gram', [116, 7.5, 20, 0.6, 4], 'urad dal ulundhu'],
  ['Pigeon peas', [121, 6.8, 23, 0.4, 6.7], 'toor arhar thuvaram'],
  ['Split red lentils', [116, 9, 20, 0.4, 4], 'masoor dal'],
  ['Whole brown lentils', [116, 9, 20, 0.4, 7.9]],
  ['Chana dal', [130, 8, 22, 1.8, 5], 'bengal gram kadalai paruppu'],
  ['Horse gram', [115, 8, 20, 0.5, 6], 'kulthi kollu ulavalu'],
  ['Moth beans', [117, 8, 21, 0.6, 5], 'matki'],
  ['Field beans', [110, 7, 20, 0.6, 5], 'mochai avarekalu'],
  ['Butter beans', [115, 7.8, 21, 0.4, 7]],
  ['Soybeans', [172, 18, 8, 9, 6], 'soya'],
  ['White peas', [118, 8, 21, 0.4, 6], 'safed vatana'],
  ['Green dried peas', [118, 8, 21, 0.4, 6]],
  ['Black beans', [132, 8.9, 24, 0.5, 8.7]],
];
for (const [name, n, alias] of pulses) {
  const a = alias ? [alias] : [];
  add(`${name}, boiled`, '100 g cooked', n, 'Pan-India', a);
  add(`${name} masala curry`, '1 katori / 200 g', sum(scale(n, 1.3), [85, 1, 9, 5, 1.5]), 'North', a);
  add(`${name} sundal`, '1 katori / 150 g', sum(scale(n, 1.2), [75, 1, 3, 6.5, 1]), 'Tamil Nadu', a);
  add(`${name} chaat`, '1 bowl / 180 g', sum(scale(n, 1.2), [45, 1, 10, 0.2, 2]), 'Pan-India', a);
  add(`${name} soup`, '1 bowl / 250 ml', sum(n, [45, 1, 5, 2.5, 1]), 'Pan-India', a);
}
const grains: Ingredient[] = [
  ['White rice', [130, 2.7, 28, 0.3, 0.4], 'chawal sadam'],
  ['Brown rice', [123, 2.7, 26, 1, 1.6]],
  ['Red rice', [125, 3, 26, 0.8, 2]],
  ['Black rice', [145, 3.5, 30, 1, 2]],
  ['Basmati rice', [130, 3, 28, 0.3, 0.5]],
  ['Parboiled rice', [123, 2.9, 26, 0.4, 1]],
  ['Seeraga samba rice', [130, 3, 28, 0.3, 0.5]],
  ['Foxtail millet', [119, 3.5, 24, 1, 2], 'thinai korralu'],
  ['Little millet', [120, 3.5, 24, 1, 2], 'samai sama'],
  ['Kodo millet', [118, 3, 24, 0.8, 2.5], 'varagu'],
  ['Barnyard millet', [115, 3.5, 23, 1, 2.5], 'kuthiraivali sanwa'],
  ['Proso millet', [119, 3.5, 24, 1, 2], 'panivaragu'],
  ['Pearl millet', [125, 3.8, 24, 1.5, 3], 'bajra kambu'],
  ['Finger millet', [120, 3, 25, 0.7, 3], 'ragi kezhvaragu'],
  ['Sorghum', [125, 3.5, 26, 1, 2.5], 'jowar cholam'],
  ['Broken wheat', [83, 3.1, 19, 0.2, 4.5], 'dalia godhumai rava'],
  ['Rolled oats', [71, 2.5, 12, 1.5, 1.7]],
  ['Barley', [123, 2.3, 28, 0.4, 3.8], 'jau'],
  ['Quinoa', [120, 4.4, 21, 1.9, 2.8]],
  ['Buckwheat', [92, 3.4, 20, 0.6, 2.7], 'kuttu'],
];
for (const [name, n, alias] of grains) {
  const a = alias ? [alias] : [];
  add(`${name}, cooked plain`, '100 g cooked', n, 'Pan-India', a);
  add(`${name} vegetable pulao`, '1 bowl / 250 g', sum(scale(n, 1.8), [100, 2, 10, 6, 3]), 'Pan-India', a);
  add(`${name} moong khichdi`, '1 bowl / 250 g', sum(scale(n, 1.3), [150, 7, 21, 4, 4]), 'Pan-India', a);
  add(`${name} curd bowl`, '1 bowl / 250 g', sum(scale(n, 1.3), [100, 4, 7, 6, 1]), 'South', a);
  add(`${name} coconut porridge`, '1 bowl / 250 ml', sum(n, [110, 2, 6, 9, 2]), 'South', a);
}
const fillings: Ingredient[] = [
  ['Aloo', [85, 2, 19, 0.2, 2], 'potato'], ['Gobi', [25, 2, 5, 0.3, 2], 'cauliflower'],
  ['Paneer', [265, 18, 3, 20, 0]], ['Methi', [49, 4.4, 6, 0.9, 4], 'fenugreek'],
  ['Palak', [23, 2.9, 3.6, 0.4, 2.2], 'spinach'], ['Mooli', [16, 0.7, 3.4, 0.1, 1.6], 'radish'],
  ['Beetroot', [43, 1.6, 10, 0.2, 2.8]], ['Carrot', [41, 0.9, 10, 0.2, 2.8]],
  ['Green peas', [81, 5.4, 14, 0.4, 5.7], 'matar'], ['Onion', [40, 1.1, 9.3, 0.1, 1.7], 'pyaz'],
  ['Capsicum', [26, 1, 6, 0.3, 2]], ['Mushroom', [22, 3.1, 3.3, 0.3, 1]],
  ['Sweet corn', [96, 3.4, 21, 1.5, 2.4]], ['Cheese', [350, 22, 4, 28, 0]],
  ['Soya mince', [150, 20, 12, 2, 5]], ['Tofu', [120, 13, 3, 7, 1]],
  ['Mixed vegetables', [55, 2.5, 11, 0.4, 3]], ['Chana dal', [130, 8, 22, 1.8, 5]],
  ['Moong dal', [105, 7, 19, 0.4, 4]], ['Rajma', [127, 8.7, 23, 0.5, 6.4]],
  ['Chickpea', [164, 8.9, 27, 2.6, 7.6]], ['Cabbage', [25, 1.3, 6, 0.1, 2.5]],
  ['Broccoli', [34, 2.8, 7, 0.4, 2.6]], ['Lauki', [14, 0.6, 3.4, 0.1, 1], 'bottle gourd'],
  ['Sweet potato', [86, 1.6, 20, 0.1, 3]], ['Spring onion', [32, 1.8, 7, 0.2, 2.6]],
];
for (const [name, n, alias] of fillings) {
  const a = alias ? [alias] : [];
  add(`${name} stuffed paratha`, '1 medium / 120 g', sum(scale(n, 0.6), [205, 5, 32, 7, 4]), 'North', a);
  add(`${name} stuffed kulcha`, '1 medium / 140 g', sum(scale(n, 0.6), [260, 7, 44, 6, 2]), 'Punjab', a);
  add(`${name} grilled sandwich`, '1 sandwich / 160 g', sum(scale(n, 0.7), [220, 7, 30, 8, 2]), 'Hostel', a);
  add(`${name} roti wrap`, '1 roll / 180 g', sum(scale(n, 0.8), [225, 6, 36, 6, 4]), 'Street food', a);
}
const fruits: Ingredient[] = [
  ['Apple', [52, 0.3, 14, 0.2, 2.4]], ['Banana', [89, 1.1, 23, 0.3, 2.6]],
  ['Mango', [60, 0.8, 15, 0.4, 1.6]], ['Papaya', [43, 0.5, 11, 0.3, 1.7]],
  ['Guava', [68, 2.6, 14, 1, 5.4]], ['Pineapple', [50, 0.5, 13, 0.1, 1.4]],
  ['Watermelon', [30, 0.6, 8, 0.2, 0.4]], ['Muskmelon', [34, 0.8, 8, 0.2, 0.9]],
  ['Orange', [47, 0.9, 12, 0.1, 2.4]], ['Sweet lime', [43, 0.8, 10, 0.2, 1.5], 'mosambi'],
  ['Pomegranate', [83, 1.7, 19, 1.2, 4]], ['Green grapes', [69, 0.7, 18, 0.2, 0.9]],
  ['Black grapes', [69, 0.7, 18, 0.2, 0.9]], ['Pear', [57, 0.4, 15, 0.1, 3.1]],
  ['Peach', [39, 0.9, 10, 0.3, 1.5]], ['Plum', [46, 0.7, 11, 0.3, 1.4]],
  ['Apricot', [48, 1.4, 11, 0.4, 2]], ['Strawberry', [32, 0.7, 8, 0.3, 2]],
  ['Blueberry', [57, 0.7, 14, 0.3, 2.4]], ['Raspberry', [52, 1.2, 12, 0.7, 6.5]],
  ['Kiwi', [61, 1.1, 15, 0.5, 3]], ['Dragon fruit', [57, 1.2, 13, 0.2, 3]],
  ['Chikoo', [83, 0.4, 20, 1.1, 5.3], 'sapota sapodilla'],
  ['Custard apple', [94, 2.1, 24, 0.3, 4.4], 'sitaphal'],
  ['Jackfruit', [95, 1.7, 23, 0.6, 1.5]], ['Lychee', [66, 0.8, 17, 0.4, 1.3]],
  ['Jamun', [60, 0.7, 14, 0.2, 0.6], 'java plum'], ['Amla', [44, 0.9, 10, 0.6, 4.3]],
  ['Fresh fig', [74, 0.8, 19, 0.3, 2.9]], ['Fresh dates', [142, 1.8, 37, 0.2, 4]],
  ['Persimmon', [70, 0.6, 19, 0.2, 3.6]], ['Pomelo', [38, 0.8, 10, 0, 1]],
  ['Star fruit', [31, 1, 7, 0.3, 2.8]], ['Rambutan', [68, 0.9, 16, 0.2, 1]],
  ['Passion fruit', [97, 2.2, 23, 0.7, 10.4]],
];
for (const [name, n, alias] of fruits) {
  add(`${name}, fresh edible portion`, '100 g without peel or seeds where inedible', n, 'Fruits', alias ? [alias] : []);
  add(`${name} yogurt bowl`, '1 bowl / 250 g', sum(scale(n, 1.2), [80, 5, 7, 3.5, 0]), 'Hostel', alias ? [alias] : []);
}

// Specific regional dishes with explicit recipe-style portion estimates.
// Groups share a preparation family, and rows supply individual macro profiles.
type Dish = [string, string, Nutrients, string?];
const regional: [string, Dish[]][] = [
  ['Tamil Nadu', [
    ['Kari dosa', '1 large', [460, 22, 40, 23, 3]], ['Kal dosa', '2 medium', [290, 7, 51, 6, 2]],
    ['Podi uthappam', '1 large', [340, 9, 46, 13, 4]], ['Karupatti paniyaram', '4 pieces', [270, 5, 49, 7, 2]],
    ['Sodhi kuzhambu', '1 katori / 200 g', [240, 4, 18, 18, 3]], ['Mor kali', '1 bowl / 200 g', [260, 6, 41, 8, 2]],
    ['Arisi upma', '1 bowl / 200 g', [300, 6, 52, 8, 3]], ['Aval pongal', '1 bowl / 220 g', [330, 9, 50, 10, 4]],
    ['Kothamalli rice', '1 bowl / 200 g', [310, 6, 49, 10, 3]], ['Kariveppilai rice', '1 bowl / 200 g', [320, 7, 48, 11, 4]],
    ['Ellu rice', '1 bowl / 200 g', [350, 8, 48, 14, 4]], ['Milagu rice', '1 bowl / 200 g', [310, 6, 49, 10, 2]],
    ['Vathal kuzhambu', '1 katori / 150 g', [160, 3, 18, 9, 3]], ['Ennai kathirikai kuzhambu', '1 katori / 200 g', [250, 6, 18, 17, 5]],
    ['Paruppu usili', '1 katori / 150 g', [220, 10, 23, 10, 6]], ['Vazhaipoo vadai', '3 pieces', [290, 8, 28, 16, 5]],
    ['Kara kozhukattai', '4 pieces', [220, 5, 41, 4, 2]], ['Paal kozhukattai', '1 bowl / 180 g', [320, 6, 52, 10, 2]],
    ['Kavuni arisi sweet', '1 bowl / 150 g', [330, 5, 62, 8, 3]], ['Tirunelveli halwa', '50 g', [220, 2, 35, 9, 1]],
  ]],
  ['Kerala', [
    ['Palappam', '2 medium', [250, 4, 48, 5, 2]], ['Vellayappam', '2 medium', [260, 5, 49, 5, 2]],
    ['Kallappam', '2 medium', [270, 5, 50, 6, 2]], ['Ragi puttu', '1 cylinder / 200 g', [350, 8, 65, 8, 8]],
    ['Chiratta puttu', '1 portion / 150 g', [280, 6, 51, 7, 4]], ['Erachi puttu', '1 portion / 250 g', [470, 23, 55, 18, 4]],
    ['Kappa vevichathu', '1 bowl / 200 g', [340, 4, 69, 7, 4]], ['Kappa biryani', '1 plate / 300 g', [600, 24, 65, 28, 5]],
    ['Chakka puzhukku', '1 bowl / 200 g', [280, 5, 47, 9, 5]], ['Mathanga erissery', '1 katori / 200 g', [230, 7, 29, 10, 6]],
    ['Kalan', '1 katori / 150 g', [190, 5, 17, 12, 3]], ['Olan with cowpeas', '1 katori / 200 g', [210, 7, 23, 10, 5]],
    ['Theeyal', '1 katori / 150 g', [220, 4, 16, 16, 4]], ['Inji puli', '2 tbsp / 30 g', [75, 0.5, 13, 2.5, 1]],
    ['Kozhi varutharachathu', '1 bowl / 200 g', [390, 29, 14, 26, 3]], ['Karimeen pollichathu', '1 fish / 180 g', [340, 30, 8, 21, 1]],
    ['Meen peera', '1 katori / 150 g', [280, 22, 8, 18, 2]], ['Kozhukatta', '2 medium', [270, 4, 48, 8, 3]],
    ['Vattayappam', '1 slice / 80 g', [180, 3, 34, 4, 1]], ['Unnakaya', '2 pieces', [300, 5, 42, 13, 3]],
  ]],
  ['Karnataka', [
    ['Benne masala dosa', '1 large', [580, 11, 65, 31, 5]], ['Khali dosa', '2 medium', [300, 7, 55, 5, 2]],
    ['Sagu dosa', '1 large', [390, 9, 56, 14, 5]], ['Ragi rotti with onion', '2 medium', [320, 8, 59, 7, 8]],
    ['Akki rotti with vegetables', '2 medium', [350, 7, 64, 8, 4]], ['Jolada rotti', '2 medium', [280, 8, 56, 3, 6]],
    ['Avarekalu saaru', '1 bowl / 200 g', [230, 11, 29, 8, 7]], ['Avarekalu uppittu', '1 bowl / 220 g', [350, 11, 49, 12, 6]],
    ['Bassaru', '1 bowl / 200 ml', [140, 6, 15, 6, 3]], ['Menthya soppu palya', '1 katori / 150 g', [140, 5, 12, 8, 5]],
    ['Majjige huli', '1 katori / 200 g', [170, 6, 14, 10, 2]], ['Nuchinunde', '3 pieces', [230, 12, 35, 5, 7]],
    ['Kadubu steamed rice dumplings', '3 pieces', [250, 5, 52, 2, 2]], ['Maddur vada', '2 pieces', [320, 6, 35, 18, 3]],
    ['Chiroti', '1 piece', [260, 3, 31, 14, 1]], ['Dharwad peda', '2 pieces / 50 g', [220, 6, 28, 9, 0]],
    ['Mangalore buns', '2 medium', [380, 6, 55, 15, 2]], ['Goli baje', '5 pieces', [350, 6, 39, 19, 2]],
    ['Kori gassi', '1 bowl / 200 g', [390, 28, 12, 27, 3]], ['Neer dosa with coconut', '3 medium', [280, 5, 48, 8, 2]],
  ]],
  ['Andhra/Telangana', [
    ['Upma pesarattu', '1 large', [430, 14, 63, 13, 7]], ['Dibba rotti', '1 wedge / 150 g', [330, 8, 49, 11, 3]],
    ['Atukula upma', '1 bowl / 200 g', [290, 6, 49, 9, 4]], ['Uggani', '1 bowl / 180 g', [270, 5, 44, 9, 3]],
    ['Punugulu', '6 pieces', [300, 6, 38, 14, 3]], ['Ponganalu with onion', '6 pieces', [280, 7, 41, 9, 3]],
    ['Sajja rotti', '2 medium', [300, 9, 56, 5, 7]], ['Jonna rotte', '2 medium', [280, 8, 56, 3, 6]],
    ['Dosakaya pappu', '1 katori / 200 g', [210, 10, 28, 7, 6]], ['Tomato pappu', '1 katori / 200 g', [220, 10, 29, 7, 6]],
    ['Bachali kura pappu', '1 katori / 200 g', [220, 11, 28, 7, 7]], ['Gongura mutton', '1 bowl / 200 g', [400, 28, 10, 28, 3]],
    ['Natu kodi pulusu', '1 bowl / 200 g', [340, 29, 12, 20, 2]], ['Royyala iguru', '1 katori / 180 g', [290, 26, 11, 16, 2]],
    ['Chepala pulusu', '1 bowl / 200 g', [310, 27, 12, 17, 2]], ['Gutti vankaya kura', '1 katori / 180 g', [280, 7, 18, 21, 5]],
    ['Bendakaya vepudu', '1 katori / 150 g', [210, 4, 17, 14, 5]], ['Ariselu', '2 pieces', [320, 4, 50, 13, 2]],
    ['Pootharekulu', '2 pieces', [250, 2, 37, 11, 0]], ['Kajjikayalu', '2 pieces', [330, 5, 41, 17, 3]],
  ]],
  ['Punjab', [
    ['Amritsari aloo kulcha', '1 large', [390, 9, 61, 12, 4]], ['Amritsari paneer kulcha', '1 large', [460, 16, 55, 20, 3]],
    ['Chur chur naan', '1 large', [450, 10, 56, 21, 3]], ['Lachha paratha', '1 medium', [300, 6, 41, 13, 3]],
    ['Amritsari fish fry', '4 pieces / 180 g', [390, 30, 24, 19, 2]], ['Punjabi kadhi pakora', '1 bowl / 250 g', [330, 11, 29, 19, 4]],
    ['Pindi chole', '1 katori / 200 g', [320, 13, 40, 12, 10]], ['Chole kulche', '1 plate / 350 g', [620, 20, 98, 17, 10]],
    ['Dal maharani', '1 katori / 200 g', [320, 13, 32, 16, 7]], ['Rajma chawal bowl', '1 bowl / 350 g', [480, 15, 84, 9, 9]],
    ['Punjabi pinni', '1 piece / 50 g', [240, 5, 26, 14, 3]], ['Panjiri', '50 g', [250, 5, 27, 15, 3]],
  ]],
  ['Gujarat', [
    ['Surti locho', '1 plate / 180 g', [290, 11, 35, 12, 5]], ['Khaman dhokla', '4 pieces / 120 g', [240, 9, 32, 9, 4]],
    ['Rava dhokla', '4 pieces / 120 g', [230, 6, 35, 8, 2]], ['Khatta dhokla', '4 pieces / 120 g', [220, 6, 37, 6, 2]],
    ['Patra steamed', '4 slices / 120 g', [190, 7, 29, 5, 5]], ['Sev tameta nu shaak', '1 katori / 180 g', [310, 7, 28, 20, 4]],
    ['Ringan no olo', '1 katori / 180 g', [170, 3, 15, 11, 5]], ['Gujarati dal dhokli', '1 bowl / 300 g', [390, 14, 58, 11, 8]],
    ['Handvo mixed lentil cake', '1 slice / 150 g', [300, 11, 36, 13, 5]], ['Khichu rice flour', '1 bowl / 180 g', [260, 4, 47, 7, 1]],
    ['Bajra rotla with ghee', '1 large', [280, 7, 45, 9, 6]], ['Dudhi muthiya', '5 pieces / 150 g', [250, 8, 35, 9, 5]],
  ]],
  ['Maharashtra', [
    ['Kanda pohe', '1 bowl / 200 g', [300, 6, 49, 10, 4]], ['Dadpe pohe', '1 bowl / 200 g', [310, 6, 46, 12, 4]],
    ['Tarri poha', '1 plate / 250 g', [410, 10, 57, 16, 6]], ['Thalipeeth with curd', '2 medium + curd', [400, 13, 54, 15, 8]],
    ['Zunka', '1 katori / 150 g', [270, 12, 25, 14, 6]], ['Pithla', '1 katori / 180 g', [240, 10, 25, 11, 5]],
    ['Bharli vangi', '1 katori / 180 g', [290, 7, 20, 22, 6]], ['Batata rassa', '1 bowl / 200 g', [220, 4, 29, 10, 4]],
    ['Kolhapuri tambda rassa', '1 bowl / 200 g', [330, 24, 10, 22, 2]], ['Kolhapuri pandhra rassa', '1 bowl / 200 g', [300, 18, 9, 23, 2]],
    ['Sol kadhi', '1 glass / 200 ml', [150, 2, 9, 13, 1]], ['Kothimbir vadi', '4 pieces / 100 g', [250, 8, 27, 12, 4]],
    ['Suran vadi', '4 pieces / 100 g', [250, 5, 31, 12, 4]], ['Ukadiche modak', '2 medium', [310, 4, 53, 10, 3]],
    ['Fried modak', '2 medium', [380, 5, 47, 20, 2]], ['Shankarpali', '50 g', [240, 3, 32, 12, 1]],
  ]],
  ['Rajasthan', [
    ['Ker sangri', '1 katori / 150 g', [230, 7, 23, 13, 8]], ['Papad ki sabzi', '1 katori / 180 g', [250, 8, 24, 14, 3]],
    ['Gatte ka pulao', '1 bowl / 250 g', [420, 13, 62, 14, 5]], ['Bajra khichda', '1 bowl / 250 g', [370, 12, 56, 12, 8]],
    ['Panchmel dal', '1 katori / 200 g', [260, 13, 34, 9, 9]], ['Laal maas', '1 bowl / 200 g', [430, 29, 8, 31, 2]],
    ['Safed maas', '1 bowl / 200 g', [470, 29, 13, 34, 2]], ['Mawa kachori', '1 large', [480, 8, 55, 26, 2]],
    ['Ghevar plain', '1 piece / 80 g', [360, 4, 47, 18, 1]], ['Rabri ghevar', '1 piece / 100 g', [430, 7, 53, 21, 1]],
  ]],
  ['West Bengal', [
    ['Luchi', '2 medium', [220, 4, 28, 11, 1]], ['Cholar dal with coconut', '1 katori / 200 g', [300, 12, 36, 13, 7]],
    ['Aloo posto', '1 katori / 180 g', [310, 6, 30, 19, 5]], ['Begun bhaja', '2 slices / 100 g', [190, 2, 9, 17, 3]],
    ['Shukto', '1 katori / 200 g', [200, 5, 22, 11, 5]], ['Mochar ghonto', '1 katori / 180 g', [230, 6, 22, 14, 6]],
    ['Dhokar dalna', '1 katori / 200 g', [330, 13, 31, 17, 6]], ['Chingri malai curry', '1 bowl / 200 g', [390, 26, 12, 27, 2]],
    ['Ilish bhapa', '1 piece / 150 g', [350, 25, 5, 27, 1]], ['Muri ghonto', '1 bowl / 200 g', [330, 19, 35, 13, 2]],
    ['Kosha mangsho', '1 bowl / 200 g', [450, 30, 12, 31, 2]], ['Mishti pulao', '1 bowl / 200 g', [360, 6, 62, 11, 2]],
    ['Nolen gur payesh', '1 bowl / 150 g', [280, 6, 45, 9, 0]], ['Patishapta', '2 pieces', [330, 6, 51, 12, 2]],
    ['Chomchom', '2 pieces / 80 g', [250, 6, 42, 7, 0]], ['Langcha', '2 pieces / 80 g', [310, 5, 43, 14, 0]],
  ]],
  ['Odisha', [
    ['Dahi pakhala', '1 bowl / 300 g', [290, 7, 54, 5, 1]], ['Badi chura', '40 g', [170, 7, 14, 10, 3]],
    ['Santula', '1 bowl / 200 g', [140, 4, 20, 5, 5]], ['Dalma with vegetables', '1 bowl / 250 g', [290, 13, 39, 9, 9]],
    ['Chhena poda', '1 slice / 80 g', [250, 9, 29, 11, 0]], ['Chhena gaja', '2 pieces / 70 g', [280, 7, 34, 13, 0]],
    ['Enduri pitha', '2 pieces', [270, 6, 47, 7, 3]], ['Chakuli pitha', '2 medium', [260, 7, 48, 4, 2]],
  ]],
  ['Bihar/Jharkhand', [
    ['Sattu paratha', '1 medium', [310, 11, 43, 11, 7]], ['Litti plain', '2 medium', [340, 12, 55, 8, 8]],
    ['Baingan chokha', '1 katori / 150 g', [110, 2, 12, 6, 4]], ['Aloo chokha', '1 katori / 150 g', [190, 4, 30, 6, 3]],
    ['Thekua', '2 pieces / 60 g', [280, 4, 37, 14, 2]], ['Dhuska', '3 pieces', [330, 8, 43, 14, 4]],
    ['Chilka roti', '2 medium', [250, 7, 45, 5, 3]], ['Tilkut', '40 g', [200, 5, 20, 12, 2]],
  ]],
  ['Kashmir', [
    ['Nadru yakhni', '1 bowl / 200 g', [250, 7, 28, 13, 5]], ['Kashmiri dum aloo', '1 katori / 200 g', [330, 6, 35, 19, 4]],
    ['Haak saag', '1 katori / 150 g', [120, 4, 9, 8, 4]], ['Modur pulao', '1 bowl / 200 g', [390, 7, 66, 12, 2]],
    ['Gushtaba', '2 pieces with gravy / 200 g', [450, 28, 11, 33, 1]], ['Rista', '2 pieces with gravy / 200 g', [430, 27, 10, 31, 1]],
    ['Kashmiri noon chai', '1 cup / 200 ml', [110, 4, 8, 7, 0]], ['Kahwa unsweetened', '1 cup / 200 ml', [20, 0.5, 1, 1.5, 0]],
  ]],
  ['North-East', [
    ['Assamese khar', '1 bowl / 200 g', [150, 4, 20, 6, 5]], ['Masor tenga', '1 bowl / 200 g', [240, 24, 10, 12, 2]],
    ['Aloo pitika', '1 katori / 150 g', [200, 4, 30, 7, 3]], ['Jolpan with curd', '1 bowl / 250 g', [340, 9, 60, 8, 2]],
    ['Jadoh', '1 bowl / 250 g', [460, 20, 52, 19, 2]], ['Dohneiiong', '1 bowl / 200 g', [450, 27, 9, 34, 2]],
    ['Eromba', '1 bowl / 200 g', [190, 7, 29, 5, 5]], ['Chamthong', '1 bowl / 250 g', [120, 5, 18, 3, 4]],
    ['Bamboo shoot pork curry', '1 bowl / 200 g', [410, 25, 8, 30, 3]], ['Thukpa vegetable', '1 bowl / 350 g', [300, 9, 47, 9, 5]],
    ['Thukpa chicken', '1 bowl / 350 g', [390, 24, 47, 12, 4]], ['Sel roti', '2 rings', [340, 5, 53, 12, 1]],
  ]],
  ['Western', [
    ['Hummus plain', '50 g', [120, 4, 9, 8, 3]], ['Falafel', '3 pieces', [260, 9, 25, 14, 5]],
    ['Pita bread', '1 medium / 60 g', [165, 5, 33, 1, 2]], ['Couscous cooked', '100 g cooked', [112, 3.8, 23, 0.2, 1.4]],
    ['Spaghetti tomato sauce', '1 bowl / 250 g', [350, 11, 62, 8, 5]], ['Pasta pesto', '1 bowl / 250 g', [490, 13, 58, 23, 4]],
    ['Pasta arrabbiata', '1 bowl / 250 g', [370, 11, 62, 10, 5]], ['Lasagna vegetable', '1 slice / 250 g', [430, 18, 44, 21, 5]],
    ['Risotto mushroom', '1 bowl / 250 g', [420, 10, 58, 17, 3]], ['Baked potato with cheese', '1 large / 250 g', [360, 12, 49, 13, 5]],
    ['Burrito bean', '1 large / 300 g', [540, 18, 78, 17, 12]], ['Quesadilla cheese', '2 wedges / 180 g', [460, 19, 39, 25, 3]],
    ['Taco bean', '2 medium', [340, 13, 44, 14, 8]], ['Taco chicken', '2 medium', [370, 24, 36, 14, 4]],
    ['Avocado toast', '2 slices / 160 g', [330, 8, 34, 19, 9]], ['Overnight oats plain', '1 jar / 250 g', [290, 12, 42, 9, 5]],
    ['Chia pudding', '1 bowl / 200 g', [240, 8, 21, 14, 10]], ['Greek yogurt plain', '150 g', [110, 15, 6, 3, 0]],
    ['Bagel plain', '1 medium / 90 g', [250, 9, 49, 2, 2]], ['Croissant plain', '1 medium / 60 g', [245, 5, 27, 13, 1]],
    ['Waffle plain', '1 medium / 100 g', [290, 7, 35, 14, 1]], ['Pancakes plain', '2 medium / 100 g', [230, 6, 29, 10, 1]],
    ['French toast', '2 slices / 150 g', [330, 12, 38, 14, 2]], ['Granola dry', '40 g', [180, 4, 26, 7, 3]],
    ['Muesli dry', '40 g', [150, 4, 27, 3, 4]], ['Oatmeal with peanut butter', '1 bowl / 250 g', [340, 13, 40, 15, 6]],
    ['Chicken Caesar salad', '1 bowl / 250 g', [420, 28, 18, 27, 4]], ['Greek salad', '1 bowl / 250 g', [260, 9, 17, 19, 5]],
    ['Minestrone soup', '1 bowl / 300 ml', [180, 7, 28, 5, 6]], ['Tomato basil soup', '1 bowl / 250 ml', [130, 3, 18, 5, 3]],
    ['Grilled salmon', '150 g cooked', [310, 33, 0, 19, 0]], ['Grilled chicken breast', '150 g cooked', [250, 46, 0, 6, 0]],
    ['Scrambled eggs with milk', '2 eggs / 150 g', [230, 15, 4, 17, 0]], ['Tuna sandwich', '1 sandwich / 180 g', [350, 25, 32, 13, 3]],
    ['Cheesecake plain', '1 slice / 100 g', [330, 6, 26, 23, 0]], ['Brownie chocolate', '1 piece / 60 g', [260, 4, 34, 13, 2]],
    ['Chocolate muffin', '1 medium / 80 g', [320, 5, 43, 15, 2]], ['Apple pie', '1 slice / 120 g', [330, 3, 46, 15, 3]],
    ['Vanilla ice cream', '100 g', [210, 4, 24, 11, 0]], ['Frozen yogurt plain', '100 g', [160, 4, 25, 4, 0]],
  ]],
];
const meat = /kari dosa|erachi|biryani|kozhi|karimeen|meen peera|kori|mutton|kodi|royyala|chepala|fish|maas|chingri|ilish|muri ghonto|mangsho|gushtaba|rista|masor|jadoh|dohneiiong|pork|chicken|salmon|eggs|tuna/i;
for (const [region, dishes] of regional) {
  for (const [name, portion, n, alias] of dishes) add(name, portion, n, region, alias ? [alias] : [], !meat.test(name));
}
export const EXPANDED_FOODS = foods;
