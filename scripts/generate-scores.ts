/**
 * One-time helper: generates commonality scores for all OC-USDA and HAP items.
 * Scores based on "how likely is a Western home cook to look up this ingredient?"
 *
 * Rubric (refined to avoid top-heavy clustering):
 *   10: Universal pantry staple (all-purpose flour, granulated sugar, table salt, butter)
 *    9: Very common baking/cooking (brown sugar, honey, whole milk, vanilla extract, eggs)
 *    8: Common cooking (olive oil, baking soda/powder, cornstarch, sour cream, powdered sugar)
 *    7: Regular recipe use (peanut butter, maple syrup, chocolate chips, cocoa, cream cheese, cinnamon)
 *    6: Moderate use (molasses, yogurt, shortening, lemon juice, brown rice, oats, coconut oil)
 *    5: Occasional (almond flour, quinoa, chickpeas, tofu, miso, lentils, dried cranberries)
 *    4: Less common but known (buckwheat, teff, goat milk, edamame, tempeh, tapioca)
 *    3: Specialty/niche (carob, amaranth, lupin, arrowroot, spirulina)
 *    2: Obscure (mothbeans, breadnut seeds, pilinuts, jute)
 *    1: Very obscure/regional (abiyuch, eppaw, oheloberries)
 *
 * Usage: npx tsx scripts/generate-scores.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

const projectRoot = resolve(dirname(import.meta.url.replace('file://', '')), '..');
const db = JSON.parse(readFileSync(resolve(projectRoot, 'src/lib/data/food-density.json'), 'utf-8'));
const existingScores: Record<string, number> = JSON.parse(
	readFileSync(resolve(projectRoot, 'src/lib/data/commonality-scores.json'), 'utf-8')
);

// Only score OC-USDA and HAP items
const newItems = db.items.filter(
	(i: { source: string; id: string }) =>
		(i.source === 'OC-USDA' || i.source === 'HAP')
);

// Scoring rules: ordered from most specific to least. First match wins.
const rules: Array<{ pattern: RegExp; score: number }> = [
	// === 10: Universal staples ===
	{ pattern: /^flour-us-all-purpose$/, score: 10 },
	{ pattern: /^flour-wheat-white-all-purpose$/, score: 10 },
	{ pattern: /^butter-salted$/, score: 10 },

	// === 9: Very common ===
	{ pattern: /^butter-without-salt$/, score: 9 },
	{ pattern: /^honey$/, score: 9 },
	{ pattern: /^brown-sugar$/, score: 9 },
	{ pattern: /^milk-whole$/, score: 9 },
	{ pattern: /^vanilla-extract$/, score: 9 },
	{ pattern: /^egg-whole-cooked-scrambled$/, score: 9 },
	{ pattern: /^egg-white-raw-fresh$/, score: 9 },
	{ pattern: /^egg-yolk-raw-fresh$/, score: 9 },

	// === 8: Common cooking ===
	{ pattern: /^oil-olive/, score: 8 },
	{ pattern: /^cornstarch$/, score: 8 },
	{ pattern: /^baking-powder-average$/, score: 8 },
	{ pattern: /^baking-soda-sodium-bicarbonate-average$/, score: 8 },
	{ pattern: /^powdered-sugar$/, score: 8 },
	{ pattern: /^sugar-powdered-unsifted$/, score: 8 },
	{ pattern: /^sour-cream$/, score: 8 },
	{ pattern: /^cream-sour-cultured$/, score: 8 },
	{ pattern: /^milk-2-milkfat$/, score: 8 },
	{ pattern: /^lemon-juice$/, score: 8 },
	{ pattern: /^cream-fluid-half-and-half$/, score: 8 },
	{ pattern: /^flour-wheat-white-bread/, score: 8 },
	{ pattern: /^flour-wheat-whole-grain$/, score: 8 },
	{ pattern: /^cocoa-dry-powder$/, score: 8 },
	{ pattern: /^peanut-butter$/, score: 8 },

	// === 7: Regular recipe use ===
	{ pattern: /^chocolate-nestle-semi-sweet-morsels$/, score: 7 },
	{ pattern: /^syrups-maple$/, score: 7 },
	{ pattern: /^milk-1-milkfat$/, score: 7 },
	{ pattern: /^milk-nonfat$/, score: 7 },
	{ pattern: /^cheese-cream$/, score: 7 },
	{ pattern: /^cinnamon-ground$/, score: 7 },
	{ pattern: /^mayonnaise-dressing$/, score: 7 },
	{ pattern: /^vinegar-distilled$/, score: 7 },
	{ pattern: /^vinegar-cider$/, score: 7 },
	{ pattern: /^catsup$/, score: 7 },
	{ pattern: /^lime-juice$/, score: 7 },
	{ pattern: /^orange-juice-raw$/, score: 7 },
	{ pattern: /^apple-juice/, score: 7 },
	{ pattern: /^tomato-sauce$/, score: 7 },
	{ pattern: /^tomato-products-canned-paste$/, score: 7 },
	{ pattern: /^tomato-products-canned-sauce$/, score: 7 },
	{ pattern: /^rice-brown-long-grain-raw$/, score: 7 },
	{ pattern: /^oat-bran-raw$/, score: 7 },
	{ pattern: /^bread-crumbs-dry-grated-plain$/, score: 7 },
	{ pattern: /^cornmeal-whole-grain$/, score: 7 },
	{ pattern: /^margarine$/, score: 7 },
	{ pattern: /^shortening-vegetable-household$/, score: 7 },
	{ pattern: /^blueberries-raw$/, score: 7 },
	{ pattern: /^raspberries-raw$/, score: 7 },
	{ pattern: /^blackberries-raw$/, score: 7 },
	{ pattern: /^pumpkin-canned$/, score: 7 },
	{ pattern: /^spinach-raw$/, score: 7 },
	{ pattern: /^cocoa-powder$/, score: 7 },
	{ pattern: /^walnuts-chopped$/, score: 7 },
	{ pattern: /^walnuts-whole$/, score: 7 },
	{ pattern: /^almonds-whole$/, score: 7 },
	{ pattern: /^oil-corn-and-canola$/, score: 7 },
	{ pattern: /^water-bottled-generic$/, score: 7 },
	{ pattern: /^noodles-egg-dry$/, score: 7 },
	{ pattern: /^yogurt-plain-whole-milk$/, score: 7 },
	{ pattern: /^yogurt-plain-low-fat$/, score: 7 },
	{ pattern: /^butter-whipped/, score: 7 },

	// === 6: Moderate use ===
	{ pattern: /^molasses$/, score: 6 },
	{ pattern: /^lard$/, score: 6 },
	{ pattern: /^milk-buttermilk-fluid$/, score: 6 },
	{ pattern: /^milk-canned-condensed$/, score: 6 },
	{ pattern: /^milk-canned-evaporated$/, score: 6 },
	{ pattern: /^cheese-parmesan-grated$/, score: 6 },
	{ pattern: /^cheese-ricotta$/, score: 6 },
	{ pattern: /^almond-butter$/, score: 6 },
	{ pattern: /^cranberries-dried-sweetened$/, score: 6 },
	{ pattern: /^raisins/, score: 6 },
	{ pattern: /^oats$/, score: 6 },
	{ pattern: /^cornmeal-degermed$/, score: 6 },
	{ pattern: /^flour-rice$/, score: 6 },
	{ pattern: /^rice-brown-medium/, score: 6 },
	{ pattern: /^rice-wild-raw$/, score: 6 },
	{ pattern: /^wild-rice$/, score: 6 },
	{ pattern: /^semolina$/, score: 6 },
	{ pattern: /^applesauce-canned-unsweetened$/, score: 6 },
	{ pattern: /^applesauce-canned-sweetened$/, score: 6 },
	{ pattern: /^vinegar-balsamic$/, score: 6 },
	{ pattern: /^vinegar-red-wine$/, score: 6 },
	{ pattern: /^tomato-products-canned-puree$/, score: 6 },
	{ pattern: /^pumpkin-pie-mix-canned$/, score: 6 },
	{ pattern: /^cheese-cream-low-fat$/, score: 6 },
	{ pattern: /^cream-sour-reduced-fat/, score: 6 },
	{ pattern: /^cream-whipped/, score: 6 },
	{ pattern: /^sugar-powdered-sifted$/, score: 6 },
	{ pattern: /^sugar-turbinado$/, score: 6 },
	{ pattern: /^marmalade-orange$/, score: 6 },
	{ pattern: /^cocoa-nibs$/, score: 6 },
	{ pattern: /^chocolate-baking/, score: 6 },
	{ pattern: /^chocolate-syrup$/, score: 6 },
	{ pattern: /^chocolate-powder$/, score: 6 },
	{ pattern: /^cookies-chocolate-wafers/, score: 6 },
	{ pattern: /^nuts-mixed-nuts/, score: 6 },
	{ pattern: /^almonds-sliced$/, score: 6 },
	{ pattern: /^almonds-ground$/, score: 6 },
	{ pattern: /^pecan-halves$/, score: 6 },
	{ pattern: /^pecan-pieces$/, score: 6 },
	{ pattern: /^peanuts-all-types-raw$/, score: 6 },
	{ pattern: /^peanuts-chopped$/, score: 6 },
	{ pattern: /^coconut-flakes$/, score: 6 },
	{ pattern: /^seeds-sunflower-seed-kernels/, score: 6 },
	{ pattern: /^seeds-pumpkin-and-squash/, score: 6 },
	{ pattern: /^beets-raw$/, score: 6 },
	{ pattern: /^artichokes$/, score: 6 },
	{ pattern: /^asparagus-raw$/, score: 6 },
	{ pattern: /^broccoli-frozen/, score: 6 },
	{ pattern: /^brussels-sprouts-raw$/, score: 6 },
	{ pattern: /^corn-sweet-yellow-raw$/, score: 6 },
	{ pattern: /^mushrooms-chanterelle/, score: 6 },
	{ pattern: /^sauerkraut/, score: 6 },
	{ pattern: /^beans-black-mature-seeds-cooked$/, score: 6 },
	{ pattern: /^beans-kidney-canned$/, score: 6 },
	{ pattern: /^beans-pinto-canned$/, score: 6 },
	{ pattern: /^chickpeas/, score: 6 },
	{ pattern: /^lentils-raw$/, score: 6 },
	{ pattern: /^hummus$/, score: 6 },
	{ pattern: /^peas-green-raw$/, score: 6 },
	{ pattern: /^peas-split-mature/, score: 6 },
	{ pattern: /^baked-beans-canned$/, score: 6 },
	{ pattern: /^demerara-sugar$/, score: 6 },
	{ pattern: /^tapioca-pearl-dry$/, score: 6 },
	{ pattern: /^tapioca-starch$/, score: 6 },
	{ pattern: /^cracker-meal$/, score: 6 },
	{ pattern: /^bread-crumbs-dry-grated-seasoned$/, score: 6 },
	{ pattern: /^eggnog$/, score: 6 },
	{ pattern: /^garlic-raw$/, score: 6 },
	{ pattern: /^coriander-cilantro/, score: 6 },
	{ pattern: /^mustard-prepared-yellow$/, score: 6 },
	{ pattern: /^syrups-corn-high-fructose$/, score: 6 },
	{ pattern: /^syrups-corn-light$/, score: 6 },
	{ pattern: /^syrups-corn-dark$/, score: 6 },
	{ pattern: /^cheese-food-pasteurized-process-american$/, score: 6 },
	{ pattern: /^chocolate-chunk$/, score: 6 },
	{ pattern: /^chocolate-chips/, score: 6 },

	// === 5: Occasional ===
	{ pattern: /^quinoa/, score: 5 },
	{ pattern: /^bulgur/, score: 5 },
	{ pattern: /^couscous/, score: 5 },
	{ pattern: /^flour-chickpea/, score: 5 },
	{ pattern: /^flour-corn/, score: 5 },
	{ pattern: /^flour-buckwheat/, score: 5 },
	{ pattern: /^flour-rye/, score: 5 },
	{ pattern: /^flour-potato$/, score: 5 },
	{ pattern: /^flour-soy/, score: 5 },
	{ pattern: /^flour-barley/, score: 5 },
	{ pattern: /^flour-peanut/, score: 5 },
	{ pattern: /^cornmeal-self-rising/, score: 5 },
	{ pattern: /^soymilk/, score: 5 },
	{ pattern: /^tofu/, score: 5 },
	{ pattern: /^miso$/, score: 5 },
	{ pattern: /^sesame/, score: 5 },  // seeds-sesame
	{ pattern: /^soy-meal/, score: 5 },
	{ pattern: /^edamame/, score: 5 },
	{ pattern: /^beans-black-mature-seeds-raw$/, score: 5 },
	{ pattern: /^beans-kidney-cooked$/, score: 5 },
	{ pattern: /^beans-kidney-raw$/, score: 5 },
	{ pattern: /^beans-pinto-cooked$/, score: 5 },
	{ pattern: /^beans-pinto-raw$/, score: 5 },
	{ pattern: /^beans-navy-raw$/, score: 5 },
	{ pattern: /^beans-great-northern/, score: 5 },
	{ pattern: /^lima-beans/, score: 5 },
	{ pattern: /^beans-snap-green/, score: 5 },
	{ pattern: /^mung-beans-mature-seeds-raw$/, score: 5 },
	{ pattern: /^milk-dry/, score: 5 },
	{ pattern: /^milk-goat$/, score: 5 },
	{ pattern: /^cheese-cottage/, score: 5 },
	{ pattern: /^cheese-parmesan-dry-grated-reduced-fat$/, score: 5 },
	{ pattern: /^cream-substitute-powdered$/, score: 5 },
	{ pattern: /^barley-hulled$/, score: 5 },
	{ pattern: /^barley-pearled-raw$/, score: 5 },
	{ pattern: /^buckwheat$/, score: 5 },
	{ pattern: /^buckwheat-groats-roasted-dry$/, score: 5 },
	{ pattern: /^millet-raw$/, score: 5 },
	{ pattern: /^rice-bran-crude$/, score: 5 },
	{ pattern: /^wheat-germ-crude$/, score: 5 },
	{ pattern: /^wheat-bran-crude$/, score: 5 },
	{ pattern: /^wheat-durum/, score: 5 },
	{ pattern: /^figs-dried/, score: 5 },
	{ pattern: /^currants-zante-dried$/, score: 5 },
	{ pattern: /^apricots-dehydrated$/, score: 5 },
	{ pattern: /^prunes-dehydrated/, score: 5 },
	{ pattern: /^grapes-red-or-green/, score: 5 },
	{ pattern: /^guavas-common-raw$/, score: 5 },
	{ pattern: /^nuts-pine-nuts/, score: 5 },
	{ pattern: /^nuts-pistachio-nuts$/, score: 5 },
	{ pattern: /^nuts-almonds/, score: 5 },
	{ pattern: /^almonds-slivered$/, score: 5 },
	{ pattern: /^trail-mix-regular$/, score: 5 },
	{ pattern: /^coconut-chips$/, score: 5 },
	{ pattern: /^fish-oil$/, score: 5 },
	{ pattern: /^oil-almond/, score: 5 },
	{ pattern: /^vegetable-oil/, score: 5 },
	{ pattern: /^xanthan-gum$/, score: 5 },
	{ pattern: /^pectin$/, score: 5 },
	{ pattern: /^baking-powder-compacted$/, score: 5 },
	{ pattern: /^baking-soda.*compacted$/, score: 5 },
	{ pattern: /^baking-soda.*low-moisture$/, score: 5 },
	{ pattern: /^peppercorns$/, score: 5 },
	{ pattern: /^white-pepper$/, score: 5 },
	{ pattern: /^onions-dehydrated-flakes$/, score: 5 },
	{ pattern: /^pepper-banana-raw$/, score: 5 },
	{ pattern: /^shallots-freeze-dried$/, score: 5 },
	{ pattern: /^tomatoes-red-ripe-canned/, score: 5 },
	{ pattern: /^tomato-and-vegetable-juice$/, score: 5 },
	{ pattern: /^corn-white$/, score: 5 },
	{ pattern: /^corn-yellow$/, score: 5 },
	{ pattern: /^arugula-raw$/, score: 5 },
	{ pattern: /^okra-raw$/, score: 5 },
	{ pattern: /^leeks/, score: 5 },
	{ pattern: /^kohlrabi-raw$/, score: 5 },
	{ pattern: /^pumpkin-leaves-raw$/, score: 5 },
	{ pattern: /^chard-swiss-raw$/, score: 5 },
	{ pattern: /^asparagus-canned$/, score: 5 },
	{ pattern: /^cabbage-napa-cooked$/, score: 5 },
	{ pattern: /^cauliflower-green-raw$/, score: 5 },
	{ pattern: /^succotash/, score: 5 },
	{ pattern: /^beets-canned$/, score: 5 },
	{ pattern: /^croutons/, score: 5 },
	{ pattern: /^bread-stuffing/, score: 5 },
	{ pattern: /^syrups-table-blends/, score: 5 },
	{ pattern: /^sweeteners/, score: 5 },
	{ pattern: /^candies-m-ms/, score: 5 },
	{ pattern: /^candies-reeses/, score: 5 },
	{ pattern: /^candies-skittles/, score: 5 },
	{ pattern: /^candies-milk-chocolate/, score: 5 },
	{ pattern: /^cheese-fondue$/, score: 5 },
	{ pattern: /^cheese-limburger$/, score: 5 },
	{ pattern: /^cheese-mexican/, score: 5 },
	{ pattern: /^natto$/, score: 5 },
	{ pattern: /^beans-baked-canned$/, score: 6 },
	{ pattern: /^seeds-sesame-seeds-whole-dried$/, score: 5 },

	// === 4: Less common but known ===
	{ pattern: /^tempeh$/, score: 4 },
	{ pattern: /^flour-arrowroot$/, score: 4 },
	{ pattern: /^flour-barley-malt$/, score: 4 },
	{ pattern: /^flour-carob$/, score: 4 },
	{ pattern: /^flour-sorghum$/, score: 4 },
	{ pattern: /^flour-triticale/, score: 4 },
	{ pattern: /^flour-corn-masa$/, score: 4 },
	{ pattern: /^millet-flour$/, score: 4 },
	{ pattern: /^millet-cooked$/, score: 4 },
	{ pattern: /^spelt-uncooked$/, score: 4 },
	{ pattern: /^teff-uncooked$/, score: 4 },
	{ pattern: /^amaranth-uncooked$/, score: 4 },
	{ pattern: /^kamut/, score: 4 },
	{ pattern: /^sorghum$/, score: 4 },
	{ pattern: /^triticale$/, score: 4 },
	{ pattern: /^buckwheat-groats-roasted-cooked$/, score: 4 },
	{ pattern: /^hominy/, score: 4 },
	{ pattern: /^noodles-chinese/, score: 4 },
	{ pattern: /^noodles-flat-crunchy/, score: 4 },
	{ pattern: /^wheat-soft-red/, score: 4 },
	{ pattern: /^wheat-sprouted$/, score: 4 },
	{ pattern: /^beans-fava/, score: 4 },
	{ pattern: /^beans-french/, score: 4 },
	{ pattern: /^broadbeans/, score: 4 },
	{ pattern: /^mung-beans-mature-seeds-sprouted/, score: 4 },
	{ pattern: /^soybeans-green-raw$/, score: 4 },
	{ pattern: /^soybeans-mature-seeds-raw$/, score: 4 },
	{ pattern: /^vermicelli-made-from-soy$/, score: 4 },
	{ pattern: /^milk-sheep$/, score: 4 },
	{ pattern: /^milk-buttermilk-dried$/, score: 4 },
	{ pattern: /^tofu-yogurt$/, score: 4 },
	{ pattern: /^whey/, score: 4 },
	{ pattern: /^butter-oil-anhydrous$/, score: 4 },
	{ pattern: /^acerola/, score: 4 },
	{ pattern: /^apricot-nectar-canned$/, score: 4 },
	{ pattern: /^apricots-frozen-sweetened$/, score: 4 },
	{ pattern: /^apples-dehydrated$/, score: 4 },
	{ pattern: /^bananas-dehydrated/, score: 4 },
	{ pattern: /^currants-raw$/, score: 4 },
	{ pattern: /^elderberries/, score: 4 },
	{ pattern: /^gooseberries/, score: 4 },
	{ pattern: /^litchis-raw$/, score: 4 },
	{ pattern: /^mulberries/, score: 4 },
	{ pattern: /^tangerine-juice-raw$/, score: 4 },
	{ pattern: /^grapes-american/, score: 4 },
	{ pattern: /^mango-nectar-canned$/, score: 4 },
	{ pattern: /^oranges-raw-with-peel$/, score: 4 },
	{ pattern: /^peaches-dehydrated/, score: 4 },
	{ pattern: /^nuts-chestnuts-european/, score: 4 },
	{ pattern: /^nuts-pecans-oil-roasted$/, score: 4 },
	{ pattern: /^fat-animal-meat$/, score: 4 },
	{ pattern: /^oil-mustard/, score: 4 },
	{ pattern: /^tomatoes-green-raw$/, score: 4 },
	{ pattern: /^tomatoes-red-ripe-cooked$/, score: 4 },
	{ pattern: /^tomatoes-sun-dried$/, score: 4 },
	{ pattern: /^tomatoes-sun-dried-packed-in-oil/, score: 4 },
	{ pattern: /^carrot-dehydrated$/, score: 4 },
	{ pattern: /^corn-yellow-whole-kernel-frozen/, score: 4 },
	{ pattern: /^eggplant-pickled$/, score: 4 },
	{ pattern: /^hearts-of-palm-canned$/, score: 4 },
	{ pattern: /^mushrooms-morel/, score: 4 },
	{ pattern: /^cabbage-japanese/, score: 4 },
	{ pattern: /^cabbage-mustard/, score: 4 },
	{ pattern: /^celeriac-raw$/, score: 4 },
	{ pattern: /^yambean-jicama-raw$/, score: 4 },
	{ pattern: /^mollusks-oyster/, score: 4 },
	{ pattern: /^mollusks-mussel/, score: 4 },
	{ pattern: /^syrups-chocolate-fudge/, score: 4 },
	{ pattern: /^syrups-malt$/, score: 4 },
	{ pattern: /^syrups-dietetic$/, score: 4 },
	{ pattern: /^syrups-sorghum$/, score: 4 },
	{ pattern: /^candies-gum-drops/, score: 4 },
	{ pattern: /^chocolate-syrup-hersheys/, score: 4 },
	{ pattern: /^blueberries-wild-canned/, score: 4 },
	{ pattern: /^cherries-sweet-canned/, score: 4 },
	{ pattern: /^pears-canned/, score: 4 },
	{ pattern: /^mangosteen/, score: 4 },
	{ pattern: /^reddi-wip/, score: 4 },
	{ pattern: /^ensure-plus/, score: 4 },
	{ pattern: /^adobo-fresco$/, score: 4 },
	{ pattern: /^poi$/, score: 4 },
	{ pattern: /^applesauce-canned-sweetened-with-salt$/, score: 4 },
	{ pattern: /^cornmeal-self-rising-with-wheat/, score: 4 },

	// === 3: Specialty/niche ===
	{ pattern: /^amaranth-flakes$/, score: 3 },
	{ pattern: /^amaranth-leaves-raw$/, score: 3 },
	{ pattern: /^millet-puffed$/, score: 3 },
	{ pattern: /^seeds-cottonseed-flour/, score: 3 },
	{ pattern: /^seeds-sunflower-seed-flour/, score: 3 },
	{ pattern: /^breadfruit-raw$/, score: 3 },
	{ pattern: /^lemon-grass/, score: 3 },
	{ pattern: /^grape-leaves-raw$/, score: 3 },
	{ pattern: /^balsam-pear/, score: 3 },
	{ pattern: /^spinach-raw$/, score: 3 },  // (already scored 7 above, won't reach here)
	{ pattern: /^prickly-pears/, score: 3 },
	{ pattern: /^groundcherries/, score: 3 },
	{ pattern: /^guavas-strawberry/, score: 3 },
	{ pattern: /^java-plum/, score: 3 },
	{ pattern: /^nuts-butternuts/, score: 3 },
	{ pattern: /^nuts-chestnuts-japanese/, score: 3 },
	{ pattern: /^nuts-hickorynuts/, score: 3 },
	{ pattern: /^alfalfa-seeds-sprouted/, score: 3 },
	{ pattern: /^beans-navy-sprouted/, score: 3 },
	{ pattern: /^lentils-sprouted/, score: 3 },
	{ pattern: /^peas-mature-seeds-sprouted/, score: 3 },
	{ pattern: /^radish-seeds-sprouted/, score: 3 },
	{ pattern: /^soybeans-mature-seeds-sprouted/, score: 3 },
	{ pattern: /^seaweed-spirulina/, score: 3 },
	{ pattern: /^taro-leaves-raw$/, score: 3 },
	{ pattern: /^beet-greens-raw$/, score: 3 },
	{ pattern: /^chives-freeze-dried$/, score: 3 },
	{ pattern: /^cress-garden-raw$/, score: 3 },
	{ pattern: /^purslane-raw$/, score: 3 },
	{ pattern: /^jellyfish/, score: 3 },
	{ pattern: /^nuts-almond-butter$/, score: 3 },  // duplicate of almond-butter
	{ pattern: /^syrups-table-blends-pancake-with-butter$/, score: 3 },

	// === 2: Obscure ===
	{ pattern: /^hyacinth-beans/, score: 2 },
	{ pattern: /^winged-beans/, score: 2 },
	{ pattern: /^yardlong-beans/, score: 2 },
	{ pattern: /^mungo-beans/, score: 2 },
	{ pattern: /^lupins/, score: 2 },
	{ pattern: /^mothbeans/, score: 2 },
	{ pattern: /^nuts-pilinuts/, score: 2 },
	{ pattern: /^seeds-breadnut/, score: 2 },
	{ pattern: /^seeds-lotus/, score: 2 },
	{ pattern: /^seeds-sisymbrium/, score: 2 },
	{ pattern: /^seeds-watermelon/, score: 2 },
	{ pattern: /^fungi-cloud-ears/, score: 2 },
	{ pattern: /^kanpyo/, score: 2 },
	{ pattern: /^pepeao/, score: 2 },
	{ pattern: /^pokeberry/, score: 2 },
	{ pattern: /^jute-potherb/, score: 2 },
	{ pattern: /^butterbur/, score: 2 },
	{ pattern: /^rose-hips/, score: 2 },
	{ pattern: /^raspberries-wild/, score: 2 },
	{ pattern: /^blackberries-wild/, score: 2 },
	{ pattern: /^plums-wild/, score: 2 },
	{ pattern: /^horned-melon/, score: 2 },
	{ pattern: /^broadbeans-immature/, score: 2 },
	{ pattern: /^tofu-okara$/, score: 2 },

	// === 1: Very obscure/regional ===
	{ pattern: /^abiyuch/, score: 1 },
	{ pattern: /^chokecherries/, score: 1 },
	{ pattern: /^eppaw/, score: 1 },
	{ pattern: /^oheloberries/, score: 1 },
	{ pattern: /^rowal/, score: 1 },
];

interface ScoredItem {
	id: string;
	name: string;
	source: string;
	category: string;
	score: number;
	rule: string;
}

const scored: ScoredItem[] = [];
const unmatched: Array<{ id: string; name: string; category: string }> = [];

for (const item of newItems) {
	let matched = false;
	for (const rule of rules) {
		if (rule.pattern.test(item.id)) {
			scored.push({
				id: item.id,
				name: item.name,
				source: item.source,
				category: item.category,
				score: rule.score,
				rule: rule.pattern.toString()
			});
			matched = true;
			break;
		}
	}
	if (!matched) {
		unmatched.push({ id: item.id, name: item.name, category: item.category });
	}
}

// Distribution
const dist: Record<number, number> = {};
for (const item of scored) {
	dist[item.score] = (dist[item.score] || 0) + 1;
}
console.log('Score distribution for new items:');
for (let i = 1; i <= 10; i++) {
	console.log(`  ${i}: ${dist[i] || 0}`);
}
console.log(`\nScored: ${scored.length}`);
console.log(`Unmatched: ${unmatched.length}`);

if (unmatched.length > 0) {
	console.log('\nUnmatched items (will default to 3):');
	for (const item of unmatched) {
		console.log(`  ${item.category} | ${item.name} | ${item.id}`);
	}
}

// Merge into existing scores
const merged = { ...existingScores };

// First, remove the old hand-scored OC-USDA/HAP entries (they'll be replaced)
for (const item of newItems) {
	if (item.id in merged) {
		// Will be overwritten below
	}
}

for (const item of scored) {
	merged[item.id] = item.score;
}

// Sort keys for readability
const sorted: Record<string, number> = {};
for (const key of Object.keys(merged).sort()) {
	sorted[key] = merged[key];
}

const outPath = resolve(projectRoot, 'src/lib/data/commonality-scores.json');
writeFileSync(outPath, JSON.stringify(sorted, null, '\t') + '\n');
console.log(`\nWrote ${Object.keys(sorted).length} scores to ${outPath}`);
