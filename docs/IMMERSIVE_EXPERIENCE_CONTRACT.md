# Website experience contract

Website type is a user choice: Standard, Cinematic, Interactive 3D, or Full immersion. The builder initially selects Standard. The business theme guides composition and content without limiting the site to one subject. Preserve all supplied offerings, including food, people, spaces, events, merchandise, and community activities where relevant.

Cinematic uses subtle spatial layering and page transitions. Interactive 3D makes object parts into navigation: actual mesh picking must open corresponding supplied offerings. Turning an object must not activate its links. The same object navigation remains available across the four generated pages. Ordinary navigation and keyboard offering links remain available.

Object families must fit the explicit business niche and page purpose. Coffee is not an appropriate default object for baseball. A deliberately selected food page may use a relevant food or drink object. The initial implemented object families are a coffee cup (drinkware and coffee offerings) and baseball equipment (bats, balls, and gloves). Unrecognized niches are not assigned a generic object. Supporting arbitrary uploaded models and authoring their hotspots remains future work.

All object destinations must refer to actual offering anchors. Selecting a family does not remove other offerings or restrict every image to the primary product. Offering-image matching must avoid substring mistakes such as treating “team” as tea or “bathroom” as a bat.

The self-contained renderer requires no external model, renderer CDN, or paid API. It renders perspective geometry with depth testing, surface lighting, hover feedback, pointer rotation, mesh picking, and a short navigation transition. Reduced motion skips that transition. WebGL failure retains ordinary offering links. This is an initial procedural interaction implementation, not a claim of photorealistic art direction or general-purpose 3D authoring.

Acceptance requires real browser tests for mesh selection, drag cancellation, mobile bounds, niche-appropriate routing, keyboard links, reduced motion, and the Standard default. Source code and unit tests alone do not establish visual acceptance.

## Full immersion

Full immersion is a separate optional experience. A full-viewport procedural WebGL environment is shared across core and extracted pages. The explicit industry selects cafe, dining, baseball, property, wellness, technology or gallery scenery; incidental services cannot switch the environment's niche. Lit foreground landmarks open actual generated page destinations. Ordinary links remain available, and a Read page control reveals the page's complete content. All supplied offerings are retained.

The environment renders only in response to interaction, resizing or visibility changes, with a 1.8-million-pixel rendering budget. Pointer dragging changes perspective without activating landmarks. Arrow keys orbit; accessible buttons control zoom and reset. Camera state is bounded and stored under a per-site session key. Mesh picking accounts for scene occlusion and perspective depth. There are no automatic camera animations. Reduced-motion users retain user-directed controls. Printing shows the ordinary page; WebGL failure or context loss restores it automatically. Without JavaScript, the ordinary page remains readable.

This is procedural scenery, not photorealistic environment reconstruction. Uploaded worlds, arbitrary model hotspots and client-specific art direction remain future work. Browser acceptance covers actual mesh navigation on desktop/mobile, drag cancellation, keyboard links, camera persistence, readable content, print output, failure recovery, and routing to extracted pages within the builder preview.
