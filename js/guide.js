// The in-app guide: making the zine, printing it at home, and building it by hand.
'use strict';
Z.GUIDE_HTML = `
<nav class="gnav">
  <a href="#g-start">Getting started</a><a href="#g-photos">Photos</a><a href="#g-devices">Phone &amp; sync</a><a href="#g-supplies">Supplies</a><a href="#g-paper">Paper</a>
  <a href="#g-sizes">Sizes</a><a href="#g-print">Printing</a><a href="#g-pocket">Pocket booklet</a><a href="#g-mini">Mini zine</a><a href="#g-manual">No duplex?</a><a href="#g-fold">Folding</a><a href="#g-staple">Stapling</a>
  <a href="#g-trim">Trimming</a><a href="#g-finish">Finishing</a><a href="#g-trouble">Problems</a>
</nav>

<h2 id="g-start">Getting started</h2>
<ol>
  <li><b>The zine is already set up</b> for the size you picked: a booklet has a cover, an intro page, January to December (an opener and two photo pages each) and a back cover; mini zines are twelve little 8-page books, one per month. Rename, reorder, add or delete chapters in the left column (✎ ↑ ↓ + ✕ next to each name; double-click a name to rename).</li>
  <li><b>Add photos</b> in the Photos tab (right). They go to the chapter of the page you're on, or tick "Sort each photo into its month" to file them by the date they were taken.</li>
  <li><b>Fill the pages:</b> drag photos onto frames, or press "Auto-fill" to place a whole month at once, adding pages as needed.</li>
  <li><b>Try layouts:</b> the Layouts tab swaps the frames on the current page. Your photos follow, so you can flick through templates freely.</li>
  <li><b>Make it yours:</b> the Add tab has handwriting, typewriter and ransom-note text, stickers, tape, torn paper and a pen to draw with. The Page tab changes the paper.</li>
  <li><b>Click</b> to select, <b>drag</b> to move, corner squares to resize, the round handle to rotate. <b>Double-click a photo</b> to crop it (drag inside the frame, scroll to zoom, Esc when done). <b>Double-click text</b> to edit it.</li>
  <li><b>Your work saves itself</b> in this browser as you go. Also press <b>Save file</b> now and then: it makes one <code>.zine</code> file with everything in it, your backup. If you clear the browser's data, only that file (or Sync) brings your zine back. To work on your phone too, turn on <b>Sync</b> (see Phone &amp; sync).</li>
</ol>
<p class="tip">The blue dashed line is the safe margin: keep faces and words inside it. The pink band on the outer edges is where home printers can't print. You will trim it off at the end, so let backgrounds and full-bleed photos run into it, but nothing important.</p>

<h2 id="g-photos">Getting your photos</h2>
<ul>
  <li>Use the original files where you can (not screenshots or photos sent through chat apps, which are made smaller). A photo needs about 1,800 pixels on its long side to fill a whole page sharply; the editor warns you when a photo is stretched too far.</li>
  <li><b>On the iPhone itself</b>, Add photos opens your photo library and the photos arrive as JPEG by themselves.</li>
  <li><b>iPhone photos on the computer</b> are often HEIC files, which the browser can't open. Either AirDrop/email them (they arrive as JPEG when you choose "Most Compatible"), export from the Photos app as JPEG, or set <i>Settings → Camera → Formats → Most Compatible</i> before taking new ones. Google Photos downloads are JPEG already.</li>
  <li>The photos stay on your devices: the editor makes resized copies inside the browser. Only if you turn on Sync are they uploaded, and then encrypted first, to your own private repository.</li>
</ul>

<h2 id="g-devices">On your phone, and syncing between devices</h2>
<ul>
  <li><b>Install it as an app:</b> open the editor's web address. On an iPhone, in Safari tap <i>Share → Add to Home Screen</i>. On Android, in Chrome tap <i>⋮ → Install app</i>. On a computer, Chrome shows an install button in the address bar. Once opened, it also works without internet.</li>
  <li><b>On a phone:</b> the tabs at the bottom open the tools (tap the same tab again to fold them away), ☰ shows all pages. Pinch to zoom, move around with two fingers. Double-tap a photo to crop it (drag to move it, pinch to zoom it, tap outside when done); double-tap text to edit it.</li>
  <li><b>Sync</b> (button at the top) keeps the same zine on your computer and your phone. You need a <b>private</b> GitHub repository and a token that can use only that repository; the Sync window walks you through it. You choose a passphrase on the first device and type it once on each other device.</li>
  <li>Everything is <b>encrypted on the device</b> before it is uploaded, so nobody else, not even GitHub, can see your pages or photos. <b>Write the passphrase down</b>: nobody can reset it.</li>
  <li>It syncs by itself when you open the app, a few seconds after each change, and when you switch away. Work on one device at a time and give it a moment to say "Synced" before you switch. If both devices changed the zine, it asks which version to keep.</li>
  <li>The first upload of many photos takes a while; if it is interrupted it carries on next time. Print from the computer: exporting the PDF on a phone works but is slow.
</ul>

<h2 id="g-supplies">What you need</h2>
<ul>
  <li>A printer that prints in colour (inkjet is fine; laser is fine).</li>
  <li>Paper for the inside pages, and ideally slightly thicker paper or thin card for the cover sheet (see below).</li>
  <li>A <b>long-reach stapler</b> (a "booklet stapler", about 15–25 € / $15–25), or a normal stapler plus a cork board or thick eraser (trick below), or a needle and thread.</li>
  <li>A <b>metal ruler</b>, a <b>craft knife</b> (a sharp new blade) and a <b>cutting mat</b> or a thick piece of cardboard to cut on.</li>
  <li>A <b>bone folder</b>, or the back of a spoon, to make sharp folds.</li>
  <li>Some heavy books to press the finished zine overnight. Optional: a pencil, bulldog clips, ribbon or twine.</li>
</ul>

<h2 id="g-paper">Which paper</h2>
<ul>
  <li><b>Inside pages: 100–120 g/m² matte paper</b> (about 27–32 lb). Normal 80 g/m² office paper works, but photos show through from the other side and inkjet ink can make it wavy. For an inkjet printer, "double-sided matte photo paper" or "inkjet presentation paper" around 120 g/m² looks great.</li>
  <li><b>Don't use glossy photo paper</b> for the inside: it only takes ink on one side, and it cracks when folded.</li>
  <li><b>Cover sheet: 160–200 g/m²</b> matte card (60–80 lb cover), if your printer takes it (check its manual for the maximum weight; feeding thick paper through the rear or manual slot usually helps). Tick "Put the cover sheet in its own file" when exporting to print it separately.</li>
  <li><b>Thickness limit:</b> a long-reach stapler closes about 12 sheets of 120 g/m² paper (48 pages) comfortably, and up to about 20 sheets of thin paper. The editor's default zine is 40 pages = 10 sheets, which is ideal. Much more than that: sew it instead, or make two volumes.</li>
  <li>Buy a few extra sheets. Plan for one test sheet and at least one reprint.</li>
</ul>

<h2 id="g-sizes">Which size?</h2>
<ul>
  <li><b>A6 pocket booklet (10.5 × 14.8 cm, postcard size):</b> one stapled book with all the months. A4 sheets are printed on both sides, cut in half, folded and nested. Small, cosy, and photos still look good. A good pick for a year of photos.</li>
  <li><b>Mini zines (7.4 × 10.5 cm):</b> the classic one-sheet zine. One A4 sheet, printed on one side, folded and cut once, makes an 8-page booklet with no staples. Pages are tiny, so one photo per page works best. Twelve of them (one per month) tied with a ribbon or in a little box make a lovely set.</li>
  <li><b>A5 booklet (14.8 × 21 cm):</b> the biggest photos. A4 sheets folded in half.</li>
  <li>US Letter has the same three: quarter-letter pocket booklet, mini zines on Letter, and half-letter booklet.</li>
  <li>You can switch between the booklet sizes any time in the Page tab (everything is scaled). Mini zines are built differently, so for those start a New zine.</li>
</ul>

<h2 id="g-print">Printing (printer with two-sided printing)</h2>
<p>This section is for the A5 / half-letter booklet. For the pocket booklet see <a href="#g-pocket">Pocket booklet</a>, for mini zines <a href="#g-mini">Mini zine</a>.</p>
<ol>
  <li><b>Export</b> with "Booklet for a printer that prints both sides" at 300 dpi.</li>
  <li><b>Print a test first:</b> export again with "Only the first sheet" ticked, and print that one sheet on cheap paper.</li>
  <li>In the print window choose:
    <ul>
      <li><b>Paper size:</b> A4 (or Letter for a half-letter zine). <b>Orientation:</b> landscape (most viewers pick it automatically).</li>
      <li><b>Two-sided: "Flip on short edge"</b> (also called "short-edge binding" or "tumble"). This matters: with "long edge" the back side comes out upside down.</li>
      <li><b>Scale: "Actual size" / 100%</b>, not "Fit to page". The printer will leave its blank margin where the pink band is; you'll trim that off. (If you prefer not to trim, choose "Fit to printable area" instead: everything shrinks about 4% and gets a thin white border, and the fold stays in the middle.)</li>
      <li><b>Quality:</b> high / best, and the paper type that matches your paper (for example "matte photo paper"). Colour, not greyscale.</li>
    </ul>
  </li>
  <li><b>Check the test sheet:</b> fold it in half. The cover should be on the right of the outside, page 2 on the back of the cover, and the last page number at the back. Hold it up to a window: the two sides should line up. If the back is upside down, switch between "short edge" and "long edge".</li>
  <li><b>Print the whole booklet.</b> Let inkjet prints dry for at least 15–30 minutes (an hour for heavy ink) before folding, laid out flat, not stacked.</li>
  <li>If you print the cover sheet on card, print the "cover-sheet" file on the card and the "inside-sheets" file on your normal paper.</li>
</ol>

<h2 id="g-pocket">Pocket booklet (A6 / quarter-letter): print, cut, fold</h2>
<ol>
  <li><b>Export</b> with "Booklet for a printer that prints both sides". Each sheet of paper carries two small sheets, one above the other (8 pages).</li>
  <li><b>Test first</b> with "Only the first sheet" ticked.</li>
  <li>In the print window: <b>portrait</b>, <b>two-sided, "Flip on long edge"</b> (the usual setting), <b>Actual size / 100%</b>, best quality, the right paper type.</li>
  <li><b>Check the test:</b> cut it across the middle and fold the top half: the cover should be on the right of the outside, page 2 on the back of the cover. Hold the sheet up to a window: both sides line up. If the back is upside down, switch to "flip on short edge".</li>
  <li>Print everything and let it dry.</li>
  <li><b>Cut every sheet in half across the middle</b> (the long way, so you get two half-sheets of 14.8 × 21 cm). Use a metal ruler and craft knife on a cutting mat, or a paper trimmer. You can cut a few sheets at once if your knife is sharp.</li>
  <li>Keep two piles: <b>top halves</b> and <b>bottom halves</b>, each in the order they came out of the printer.</li>
  <li><b>Fold each half-sheet</b> in half on its own (bone folder or spoon).</li>
  <li><b>Nest:</b> the top halves in order (the first one, with the covers, outside), then put the whole bottom-half pile, in order, inside the middle of them. The export window shows a picture of which page is where. Flip through and check the numbers run in order.</li>
  <li><b>Staple</b> through the fold (see <a href="#g-staple">Stapling</a>). A small booklet like this closes fine with the open-stapler trick, or sew it.</li>
  <li><b>Trim</b> the three open edges by 4–5 mm if you want clean edges (see <a href="#g-trim">Trimming</a>).</li>
</ol>

<h2 id="g-mini">Mini zine (one sheet, one cut, 8 pages)</h2>
<p>Each mini zine is one sheet. The PDF has one page per mini zine; the top row is printed upside down on purpose.</p>
<ol>
  <li><b>Print on one side only</b>, landscape, Actual size, best quality. Test with one first. Normal 80–100 g/m² paper folds best; thick paper gets bulky.</li>
  <li>Lay the sheet <b>printed side up</b>, landscape. You see two rows of four pages.</li>
  <li>Fold it in half <b>top to bottom</b> (long edges together), crease hard, unfold.</li>
  <li>Fold it in half <b>left to right</b>, crease, unfold. Then fold each short edge in to that middle crease, crease, unfold. You now have 8 panels.</li>
  <li><b>Cut the slit:</b> fold it in half left to right again (short edges together). From the folded edge, cut along the middle horizontal crease, stopping halfway: exactly up to the next vertical crease, one panel long. Unfold. There is now a slit through the middle two panels only.</li>
  <li>Fold the sheet in half along the long horizontal crease, <b>with the upside-down row going to the back</b>, so the printing is on the outside and every page is the right way up.</li>
  <li>Hold the two short ends and <b>push them toward each other</b>. The slit opens into a diamond and then a plus shape (four "wings").</li>
  <li>Flatten it by wrapping the wings around until the <b>cover (page 1)</b> is on top and the pages run 1 to 8. Crease the spine firmly.</li>
  <li>Press it under a book. No staples needed; a thin ribbon or a dab of glue stick inside the spine keeps it closed if you like.</li>
</ol>
<p class="tip">Make one on plain paper first, writing 1–8 on the panels as in the export window's picture: it makes the folding click in your hands before you use the real prints.</p>

<h2 id="g-manual">Printer without two-sided printing</h2>
<ol>
  <li>Export with "Booklet, printing the second side by hand". You get two files: <i>1-fronts</i> and <i>2-backs</i>.</li>
  <li><b>Find how your printer flips paper (do this once):</b> draw a small arrow pointing into the printer on the top of a blank sheet, put it in the tray, and print one page. See whether the print landed on the side with the arrow or the other side, and at which end. Now you know which side up and which end first to put sheets back in.</li>
  <li>Print the fronts file. Keep the pages in the order they come out.</li>
  <li>Put the stack back in so the blank sides get printed, with the top of the page going in the same way as the test told you. Print the backs file.</li>
  <li>If the backs come out upside down, rotate the stack and reprint. If they come out in the wrong order (sheet 1's back on sheet 10), reverse the stack, or use "Reverse pages" / "Reverse order" in the print window.</li>
  <li>Test with the first two sheets before printing everything.</li>
</ol>

<h2 id="g-fold">Folding</h2>
<ol>
  <li>Keep the sheets in order: <b>sheet 1</b> (the one with the front and back covers) goes on the outside, and the <b>last sheet</b> is the centre of the zine. The export window shows which pages are on each sheet.</li>
  <li><b>Fold each sheet on its own</b>, never the whole stack at once (a stack folds badly and the inside pages poke out).</li>
  <li>For each sheet: put it face down, bring the short edges together, line up the corners exactly, hold them with one hand, and press the fold flat from the middle outwards. Then run a bone folder or the back of a spoon firmly along the fold.</li>
  <li><b>Card (cover sheet):</b> score it first so it doesn't crack. Lay the ruler along the middle line (148.5 mm from the edge on A4, 139.7 mm on Letter) and run a blunt point along it (an empty ballpoint pen or the back of the knife), on the outside of the fold, then fold.</li>
  <li><b>Nest the sheets</b> one inside the other: the last sheet in the very middle, sheet 1 outside. Flip through and check the page numbers run in order.</li>
  <li>Tap the zine on the table, spine down and then head down, so the folds sit snugly inside each other. Hold it with two bulldog clips on the top and bottom edges (with a scrap of card under each clip so it doesn't dent the paper).</li>
</ol>

<h2 id="g-staple">Stapling (or sewing)</h2>
<p><b>With a long-reach stapler:</b></p>
<ol>
  <li>Open the zine flat at the centre pages, face down, so the fold is a valley.</li>
  <li>Mark two points on the fold with a light pencil dot, each about a quarter of the height in from the top and bottom (about 50 mm from each end on an A5 zine).</li>
  <li>Slide the zine in until the fold is under the stapler's head at your mark, and staple straight through the fold. Do the second mark.</li>
  <li>Check inside the centre spread that both staple legs are folded flat. Press any that aren't with the back of a spoon.</li>
</ol>
<p><b>With a normal stapler</b> (the "open stapler" trick):</p>
<ol>
  <li>Open the zine at the centre spread and lay it face down on a cork board, a thick eraser or a folded towel on top of cardboard.</li>
  <li>Open the stapler fully (most swing open past 90°) and push a staple through the fold from the outside at each mark, so the legs sink into the cork.</li>
  <li>Lift the zine, and on the inside fold each staple leg flat towards the centre with a butter knife or your thumb.</li>
</ol>
<p><b>Sewn (prettier, and works for thicker zines):</b> a 3-hole pamphlet stitch.</p>
<ol>
  <li>Open the zine at the centre spread. Make 3 holes along the fold with a pushpin or needle: the middle, and about 25 mm from top and bottom.</li>
  <li>Thread a needle with about 3× the zine's height of embroidery thread or waxed thread. From the <b>inside</b>, push it out through the middle hole, leaving a 5 cm tail inside.</li>
  <li>On the outside, go back in through the top hole. Inside, run the thread along the fold past the middle and go out through the bottom hole. On the outside, come back in through the middle hole.</li>
  <li>Both ends are now inside, one on each side of the long stitch. Pull snug (not tight enough to tear the paper) and tie a double knot around the long stitch. Trim the ends, or leave them long as a little bow in the centre spread.</li>
</ol>

<h2 id="g-trim">Trimming (cutting)</h2>
<p>Trimming gives clean, full-bleed edges (no white printer margin) and evens out the inside pages, which stick out a little further at the open edge the more sheets there are ("creep"). It is optional, but it makes it look bought.</p>
<ol>
  <li>Do it <b>after stapling</b>, on the closed zine, on a cutting mat.</li>
  <li>Measure 5 mm in from the <b>open edge</b> (opposite the spine) at the top and the bottom, and lightly mark with a pencil. Do the same 5 mm in from the <b>top</b> and the <b>bottom</b> edges. Never cut the spine.</li>
  <li>Line the metal ruler up with the marks and press it down hard with your fingers spread flat (keep your fingers away from the cutting edge). Put the ruler on the zine side so if the knife slips it goes into the scrap.</li>
  <li>Cut with a new, sharp blade, <b>many light strokes</b> rather than one hard one: let the first stroke just score the cover, and keep going through a few sheets at a time. Don't move the ruler until you're through every sheet.</li>
  <li>Cut the open edge first, then the top and bottom.</li>
  <li>Your A5 zine ends up about 138 × 200 mm. Everything inside the safe margin is untouched.</li>
</ol>
<p class="tip">No craft knife? A guillotine or rotary paper trimmer can cut a thin zine, but most office trimmers struggle beyond 10 sheets; trim the cover and the inside pages in a couple of goes if you must, or simply skip trimming and use "Fit to printable area" when printing.</p>

<h2 id="g-finish">Finishing touches</h2>
<ul>
  <li>Press the finished zine under heavy books overnight: the folds settle and it stays closed.</li>
  <li>Round the corners with nail scissors or a corner punch for a softer feel.</li>
  <li>Tie it with ribbon or twine, tuck in a real printed photo or a ticket from a day you spent together, and wrap it in kraft paper.</li>
  <li>Sign and date the inside of the back cover by hand: ink on paper is the best part of a zine.</li>
  <li>Print two: one to give, one to keep (or a spare in case a sheet goes wrong).</li>
</ul>

<h2 id="g-trouble">If something goes wrong</h2>
<ul>
  <li><b>Pages in the wrong order after folding:</b> the sheets were nested in the wrong order, or a sheet was printed with the back flipped. Check the sheet table in the export window.</li>
  <li><b>Back side upside down:</b> switch "flip on short edge" and "flip on long edge".</li>
  <li><b>Everything slightly smaller with a white border:</b> the print window used "Fit to page". Choose "Actual size".</li>
  <li><b>Colours darker than on screen:</b> normal for home printers (the screen glows, paper doesn't). Add some Brightness to photos (select one, then Look → Brightness, and "Same look for the whole zine"), and print a test page first.</li>
  <li><b>Paper curls or is wavy:</b> too much ink for thin paper. Use thicker paper, lighter page backgrounds, or press the sheets under books when dry.</li>
  <li><b>A photo looks blurry:</b> it is too small for its frame. Use the original file, or make the frame smaller.</li>
  <li><b>Fonts look plain:</b> the editor's font files are in its <code>fonts</code> folder. Keep the whole folder together when you move it.</li>
</ul>
`;
