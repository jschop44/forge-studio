# Website experience contract

Website type is a user choice: Standard, Cinematic, or Interactive 3D. The builder initially selects Standard. The business theme guides composition and content without limiting the site to one subject. Preserve all supplied offerings, including food, people, spaces, events, merchandise, and community activities where relevant.

Cinematic uses subtle spatial layering and page transitions. Interactive 3D makes object parts into navigation: actual mesh picking must open corresponding supplied offerings. Turning an object must not activate its links. The same object navigation remains available across the four generated pages. Ordinary navigation and keyboard offering links remain available.

Object families must fit the explicit business niche and page purpose. Coffee is not an appropriate default object for baseball. A deliberately selected food page may use a relevant food or drink object. The initial implemented object families are a coffee cup (drinkware and coffee offerings) and baseball equipment (bats, balls, and gloves). Unrecognized niches are not assigned a generic object. Supporting arbitrary uploaded models and authoring their hotspots remains future work.

All object destinations must refer to actual offering anchors. Selecting a family does not remove other offerings or restrict every image to the primary product. Offering-image matching must avoid substring mistakes such as treating “team” as tea or “bathroom” as a bat.

The self-contained renderer requires no external model, renderer CDN, or paid API. It renders perspective geometry with depth testing, surface lighting, hover feedback, pointer rotation, mesh picking, and a short navigation transition. Reduced motion skips that transition. WebGL failure retains ordinary offering links. This is an initial procedural interaction implementation, not a claim of photorealistic art direction or general-purpose 3D authoring.

Acceptance requires real browser tests for mesh selection, drag cancellation, mobile bounds, niche-appropriate routing, keyboard links, reduced motion, and the Standard default. Source code and unit tests alone do not establish visual acceptance.
