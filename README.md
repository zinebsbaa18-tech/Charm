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
- **Free-Form Fashion** — users just ask naturally: *"smart casual ideas,"* *"what goes with mustard yellow?"*, *"I want a green dress for an event."*
- **My Closet** — a saved wardrobe that lets recommendations get more personalized the more it's used.
- **Persistent chat history** — past styling sessions are saved, so styling feels like an ongoing relationship with a stylist rather than a one-off search.
- **Shop the look** — every recommended item links directly to a shoppable product, closing the loop from inspiration to purchase.
## Selected Challenge Theme
 
**Reimagine Creative Industries with AI** — Charm treats personal styling as a creative discipline and positions AI as a *creative partner*, not just a content generator: it collaborates with the user's existing wardrobe and taste rather than producing generic, one-size-fits-all suggestions.

**Architecture**
<img width="1106" height="507" alt="diagram-export-7-31-2026-7_47_12-AM" src="https://github.com/user-attachments/assets/2a492add-4bbf-4e2f-bb1b-48551153d9c5" />


*Key stack:*
- **Frontend:** React + Vite, Firebase Auth & Firestore, i18next
- **Backend:** Express.js (no Firebase Cloud Functions)
- **Chat/text LLM:** Groq Cloud — `llama-3.3-70b-versatile` for structured attribute extraction, styling reasoning, complement generation, general fashion chat
- **Vision LLM:** Groq Cloud — `qwen/qwen3.6-27b` for garment image analysis
- **Search enrichment:** Serper.dev (Google Search API) for product links and images
- **Auth:** Firebase (email/password + Google OAuth)
- **Development tools:** IBM Bob, used as the primary tool for planning, building, and debugging the app end-to-end

- **Selected challenge theme**
Reimagine Creative Industries with AI because Personal styling is a creative act — but most people lack the tools to do it confidently. Charm reimagines styling by making AI a creative partner rather than a static generator: it reasons through color, silhouette, and occasion the way a human stylist would, collaborating with what you own instead of replacing your taste.
- **How bob was used**
  Charm was built end-to-end using IBM Bob as our primary development tool. We used it to plan the application architecture — the chat interface, the closet data model, and the API routes — before writing any code. We used it to implement the core features directly: the image-upload and text-chat flows, the outfit and complement generation logic, the closet view, and the Serper-based product enrichment pipeline. We also relied on it heavily for debugging — tracing a chat-history persistence bug back to a stale state closure, and a UI flicker back to a Firestore sync race condition, both of which we fixed with its help. Bob was involved in essentially every stage of development, from architecture decisions through implementation to fixing the last bugs before submission.

  
## How to Run Locally
 
**Prerequisites:** Node.js (v18+) and npm installed. You'll also need free API keys for Groq, Serper.dev, and a Firebase project.
 
**1. Clone the repo**
```bash
git clone https://github.com/zinebsbaa18-tech/Charm.git
cd charm
```
 
**2. Install dependencies (first time only)**
```bash
npm install
cd server
npm install
cd ..
```
 
**3. Set up environment variables**
 
Copy the example env file and fill in your own keys:
```bash
cp .env.example .env
```
Then open `.env` and add your keys. You'll need:
- **Groq API key** — get one free at [console.groq.com](https://console.groq.com)
- **Serper.dev API key** — get one free at [serper.dev](https://serper.dev)
- **Firebase project config** — create a free project at [console.firebase.google.com](https://console.firebase.google.com), then copy your web app's config values
**4. Run — two terminals**
 
Terminal 1 (backend — port 4000):
```bash
cd server
node index.js
```
 
Terminal 2 (frontend — port 5173):
```bash
npm run dev
```
 
Then open **http://localhost:5173** in your browser, sign up or sign in, and start styling.
