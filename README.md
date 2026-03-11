# 🪶 The Amanuensis

The Amanuensis is a self-hosted, AI-powered resume builder designed to forge ATS-optimized, executive-grade PDF scrolls. Built for complete data privacy, it keeps your personal history securely locked in a local SQLite vault while leveraging cutting-edge LLMs to tailor your experience to specific job descriptions.

## ✨ Features

* **AI Counsel (OpenRouter / Qwen):** Automatically optimize bullet points, fix grammar, and aggressively tailor your skills to match pasted job descriptions.
* **Flawless ATS PDFs:** Powered by `@react-pdf/renderer` to generate clean, highlightable, and machine-readable A4 PDFs.
* **The Scribe's Ledger:** A dynamic, drag-and-drop workspace that instantly mirrors your data entry onto a live, unbreakable Web Canvas.
* **Local-First Architecture:** Your data never sits on a third-party cloud. The SQLite database lives exclusively on your local machine or self-hosted server.
* **Dockerized Forge:** A highly optimized, multi-stage Docker build utilizing Debian `bookworm-slim` for native SQLite C++ driver support.

## 🛠️ Tech Stack

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Database:** SQLite via Prisma ORM (Prisma 7)
* **Styling:** Tailwind CSS & Lucide Icons
* **PDF Engine:** React-PDF
* **AI Integration:** OpenRouter API (Configured for Qwen Models)
* **Deployment:** Docker & Docker Compose

## 🚀 Getting Started

To spin up the Amanuensis on your local network, you will need [Docker](https://www.docker.com/) installed.

### 1. Clone the Archives
\`\`\`bash
git clone https://github.com/yourusername/amanuensis.git
cd amanuensis
\`\`\`

### 2. Configure the Vault Keys
Create a `.env` file in the root directory and provide your OpenRouter API key and preferred security credentials:
\`\`\`env
# AI Provider
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Security
ADMIN_PASSWORD=your_secure_password
NEXTAUTH_SECRET=generate_a_random_string_here
\`\`\`

### 3. Ignite the Forge
Run the Docker Compose command to build the image, install the Linux binaries, and spin up the container:
\`\`\`bash
docker-compose up -d --build
\`\`\`

The Scribe is now awake. Visit `http://localhost:3000` to begin drafting your parchment.

## ⚠️ Notices of the Realm
* **Active Development:** This sanctuary is an active forge. You may encounter errant ink spills or UI shifts as features are added.
* **Verify Thy Parchment:** The AI Counsel is a faithful servant, but alas, only a machine. Always verify the accuracy and tone of the generated ink before presenting your scroll to future employers.

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).