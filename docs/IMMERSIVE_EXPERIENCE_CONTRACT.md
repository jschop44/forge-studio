# Website experience contract

Website type is a user choice: Standard, Cinematic, Interactive 3D, or Full immersion. The builder initially selects Standard. The business theme guides composition and content without limiting the site to one subject. Preserve all supplied offerings, including food, people, spaces, events, merchandise, and community activities where relevant.

Cinematic uses subtle spatial layering and page transitions. Interactive 3D makes object parts into navigation: actual mesh picking must open corresponding supplied offerings. Turning an object must not activate its links. The same object navigation remains available across the four generated pages. Ordinary navigation and keyboard offering links remain available.

Object families must fit the explicit business niche and page purpose. Coffee is not an appropriate default object for baseball. A deliberately selected food page may use a relevant food or drink object. The initial implemented object families are a coffee cup (drinkware and coffee offerings) and baseball equipment (bats, balls, and gloves). Unrecognized niches are not assigned a generic object. Supporting arbitrary uploaded models and authoring their hotspots remains future work.

All object destinations must refer to actual offering anchors. Selecting a family does not remove other offerings or restrict every image to the primary product. Offering-image matching must avoid substring mistakes such as treating “team” as tea or “bathroom” as a bat.

The self-contained renderer requires no external model, renderer CDN, or paid API. It renders perspective geometry with depth testing, surface lighting, hover feedback, pointer rotation, mesh picking, and a short navigation transition. Reduced motion skips that transition. WebGL failure retains ordinary offering links. This is an initial procedural interaction implementation, not a claim of photorealistic art direction or general-purpose 3D authoring.

Acceptance requires real browser tests for mesh selection, drag cancellation, mobile bounds, niche-appropriate routing, keyboard links, reduced motion, and the Standard default. Source code and unit tests alone do not establish visual acceptance.

## Business identity and mode separation

Every mode uses the business industry, supplied offerings and brand direction. Standard uses an editorial page layout. Cinematic uses edge-to-edge photography, large story chapters, chapter navigation and progress. 3D navigation uses a matching interactive object or a spatial showroom of supplied offerings. The immersive option uses a relevant photographic panorama where available and a labeled spatial gallery elsewhere. No primitive diorama is marketed as a finished immersive environment.

The supported textured sports props are a baseball and a soccer ball, each assigned only to its matching niche. Soccer uses the inflated football asset; it must not receive baseball equipment. Coffee retains its cup-part navigation. Other niches use offering-specific showroom cards rather than an unrelated cup or sports prop.

## Panoramic and spatial environments

The panoramic renderer projects real equirectangular images through a WebGL camera. Dragging and arrow keys change the viewing direction; zoom changes field of view. Page hotspots and ordinary page links navigate to actual generated destinations. Read page reveals the complete ordinary page. Camera state is bounded, site-specific and separate from the removed diorama state. There is no automatic camera movement. Reduced-motion users retain user-directed controls. Print output and WebGL/texture failures restore ordinary content.

Baseball uses a baseball stadium panorama, soccer uses a separate soccer stadium, and coffee uses a cafe interior. These are clearly credited illustrative settings, not claims that the pictured venue belongs to the business. Cropped panoramas retain their crop metadata and a constrained vertical field of view. A photographic panorama does not provide walkable reconstructed geometry; arbitrary scene reconstruction remains unimplemented.

## Image relevance and provenance

Hero assets are reserved before selecting service photography. Image identity excludes crop/size URL parameters. Exhausted pools do not repeat images to fill slots; all offerings remain present. Hero photos are not reused as page backgrounds. Home pages use text offering summaries; detailed imagery is assigned to the service page.

Unknown niches do not receive office-photo defaults. Generic training does not mean fitness, medical gloves do not mean baseball, examination rooms do not mean hotel rooms, and home visits do not mean real estate. Salon and wellness imagery are separate. Bakery, medical, legal and other specialized niches cannot inherit broad but unrelated stock images.

The free Commons discovery endpoint retains only image files with source attribution, reusable license metadata and niche evidence. It excludes unrelated metadata, logos, maps, advertising and sensitive clinical imagery. If no suitable asset can be verified, the generator explains the gap and retains the business typography and colors; it must not substitute unrelated stock. Remote asset metadata is excluded from model prompts. Source/creator/license credits remain available in generated pages.

Acceptance includes business-specific desktop and mobile screenshots, actual texture/model loading, niche routing, duplicate-image checks, chapter navigation, camera persistence, fallback recovery and extracted-page routing. Passing structural tests alone does not establish visual quality.

## Reviewed asset sources

- Cafe panorama: Sergej Majboroda, Comfy Cafe, Poly Haven, CC0 — https://polyhaven.com/a/comfy_cafe
- Soccer panorama: Sergej Majboroda, Stadium 01, Poly Haven, CC0 — https://polyhaven.com/a/stadium_01
- Baseball panorama: Nesnad, Meiji Jingu Stadium, CC BY 4.0; resized for display — https://commons.wikimedia.org/wiki/File:Meiji_Jingu_Stadium_2024_April_23_-_360_panorama.jpeg
- Baseball model: Rico Cilliers, Baseball 01, Poly Haven, CC0 — https://polyhaven.com/a/baseball_01
- Soccer model: Amal Kumar, Football, Poly Haven, CC0 — https://polyhaven.com/a/football
- Baseball photos: https://unsplash.com/photos/8aE7REdS_rU, https://unsplash.com/photos/kJce0SXcrw0, https://unsplash.com/photos/wdInv4ZcZsM
- Salon photos: https://unsplash.com/photos/lK8oXGycy88 and https://unsplash.com/photos/JZxYImAay2Y

## Image detail and preview navigation

Generated stock images request 3840-pixel widths at quality 90; Commons discovery requests up to 3840 pixels, subject to original source size. Sports model textures use 4096-pixel assets. Panoramic textures retain up to 8192 pixels across (4096 pixels vertically for a full spherical image), constrained by the device GPU limit. No source image is enlarged in the texture upload. The renderer allows retina density up to 3 and a 3840 × 2160 framebuffer budget; devices below that capability may render at a lower resolution. A 4K source spanning a full sphere is not equivalent to a 4K photograph of the visible view. Source, texture and framebuffer dimensions are checked separately in browser evidence.

Builder previews install their navigation handler in the head before experience controllers. Filename, root-relative, extensionless and fragment links resolve against emitted pages; they never fall through into the Forge builder. Unknown internal destinations are prevented. External and contact links retain their explicit destinations. Preview tabs clear stale offering anchors. Downloaded pages retain normal portable HTML links without the preview bridge.

The builder gives generated sites a bounded viewport (78svh, between 360px and 900px), independently of the longer form column. Generation and page navigation reveal the preview, with clearance below the floating build-console link. This keeps fixed scene navigation reachable and avoids an oversized iframe stretching its scene beneath the builder.
