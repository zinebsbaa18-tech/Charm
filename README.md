# Charm
Charm is an AI stylist that turns a single garment  or a single idea  into a complete, shoppable outfit. Upload a photo, describe an occasion, or just ask, and Charm reasons through color, texture, and fit the way a human stylist would.

---
## Problem Statement
 
Getting dressed well is a creative act, but most people don't have the tools to do it confidently. Two common scenarios:
 
- **The full closet, empty head problem** — people own plenty of clothes but don't know how to combine them into a finished look.
- **The single item problem** — someone has one garment (a dress for an event, a top they just bought) and no easy way to visualize what shoes, layers, or accessories complete it.
Existing styling content is generic and static — blog posts and mood boards that don't adapt to what a person actually owns, their body, or the occasion in front of them. The result is decision fatigue: people default to the same handful of outfits, feel creatively stuck, or buy pieces impulsively that never end up working together.

 ## Solution Description
 
Charm lets you snap a photo of any garment or describe it in text, and an AI stylist instantly generates 2-3 complete outfit suggestions with specific, shoppable items — including complementary tops, shoes, accessories, and outerwear — along with styling notes and product links to buy them. It's a free, instant, personalized fashion advisor in your browser.
 
**Core features:**
 
- **Garment-to-outfit generation** — upload a photo of one piece, and Charm builds the rest of the outfit around it (shoes, outerwear, accessories), explaining *why* each piece works (color harmony, texture contrast, occasion appropriateness).
- **Text-Based Styling** — Describes clothing via text when no photo is available
Free-Form Fashio
- **Conversational styling** — no filters or product grids to dig through. Users just ask naturally: *"smart casual ideas,"* *"what goes with mustard yellow?"*, *"I want a green dress for an event."*
- **My Closet** — a saved wardrobe that lets recommendations get more personalized the more it's used.
- **Persistent chat history** — past styling sessions are saved, so styling feels like an ongoing relationship with a stylist rather than a one-off search.
- **Shop the look** — every recommended item links directly to a shoppable product, closing the loop from inspiration to purchase.
## Selected Challenge Theme
 
**Reimagine Creative Industries with AI** — Charm treats personal styling as a creative discipline and positions AI as a *creative partner*, not just a content generator: it collaborates with the user's existing wardrobe and taste rather than producing generic, one-size-fits-all suggestions.

**Architecture**
<img width="1106" height="513" alt="diagram-export-7-30-2026-12_50_50-PM" src="https://github.com/user-attachments/assets/3c905bad-87cd-4115-952e-02d924b5c84e" />

*Key stack:*
- **Frontend:** React + Vite, Firebase Auth & Firestore, i18next
- **Backend:** Express.js (no Firebase Cloud Functions)
- **Chat/text LLM:** IBM watsonx — structured attribute extraction, styling reasoning, complement generation, general fashion chat
- **Vision LLM:** Groq Cloud — `qwen/qwen3.6-27b` for garment image analysis
- **Search enrichment:** Serper.dev (Google Search API) for product links and images
- **Auth:** Firebase (email/password + Google OAuth)
- **Development tools:** IBM Bob, used as the primary tool for planning, building, and debugging the app end-to-end
