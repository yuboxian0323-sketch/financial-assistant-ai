# FI AI

### AI Investment Research Assistant

> **From market noise to investment clarity.**

FI AI is an AI-powered investment research application designed to make stock research more **personalized, organized, and actionable**.

Instead of separating company data, market news, research notes, AI tools, and tasks across different platforms, FI AI brings them together into a unified research environment built around how each investor researches.

---

## Demo

[▶ Watch the FI AI Demo](https://drive.google.com/file/d/1t6pCjc9P64vpKWa7eiOWUKxk7XdUDoeK/view?usp=sharing)

---

## The Idea

Investment research is highly personal.

Some investors prioritize financial performance, while others focus on news, catalysts, competitors, valuation, or long-term industry trends. Yet most investment platforms provide everyone with essentially the same fixed interface.

FI AI explores a different approach:

> **Instead of adapting your research process to the platform, the platform adapts to your research process.**

The application combines company research with customizable workspaces, AI assistance, and structured research tasks.

---

## Core Features

### Company Research

FI AI organizes research around individual stocks rather than disconnected sources of information.

Each company page provides a centralized environment for accessing:

- Company information
- Financial data
- Market news
- Research notes
- Analysis
- Research tools

This allows users to move from discovering a company to researching it without constantly switching between different applications.

---

### Customizable Workspace

The workspace is one of FI AI's core features.

Instead of using a fixed dashboard, users can build their own research environment from reusable modules.

Users can:

- Add and remove research widgets
- Rearrange their workspace
- Save a preferred research layout
- Use the same structure when researching different stocks

The interface changes with the selected company while maintaining the investor's preferred research structure.

**Build your research process once. Use it across every company.**

---

### Research Tasks

FI AI integrates task management directly into investment research.

Rather than keeping research objectives in a separate to-do application, users can organize research tasks alongside the companies and information they are investigating.

This creates a workflow where investment research can move from:

**Question → Research → Task → Progress**

---

### AI Assistance

AI is designed as part of the research workflow rather than as a standalone chatbot.

FI AI explores using AI to help users organize research, interpret investment questions, and turn broader research objectives into structured tasks.

The goal is to make AI useful not only for answering questions, but also for helping investors manage **what they need to research next**.

---

## Tech Stack

### Application

- React Native
- TypeScript
- Expo
- Expo Router

### Data & State

- SQLite
- TanStack Query
- Zustand

### UI & Interaction

- React Native Reanimated
- React Native Gesture Handler

### Development & Quality

- Git / GitHub
- Jest
- ESLint
- Codex

---

## Technical Design

FI AI is designed as a modular mobile application with separate concerns for interface, application data, persistence, and client state.

### React Native + Expo

The application is built with React Native and TypeScript using Expo, allowing the product to be developed as a native mobile experience while maintaining a TypeScript-based codebase.

Expo Router handles navigation between application screens and company-specific views.

### SQLite

SQLite provides local persistence for application data that needs to remain available between sessions.

A local database also supports FI AI's broader local-first approach to user-specific research data and configuration.

### TanStack Query

TanStack Query is used for managing asynchronous data operations and caching, keeping data-related state separate from individual UI components.

### Zustand

Zustand handles lightweight client and interface state where persistent or asynchronous data management is unnecessary.

This separation prevents a single state-management system from becoming responsible for every type of application state.

> The architecture continues to evolve as FI AI expands its external financial-data and AI integrations.

---

## Architecture

FI AI uses a **modular, local-first architecture** designed around three core systems: company research, customizable workspaces, and research tasks.

The architecture separates **what the user is researching** from **how the user chooses to research it**, allowing the same workspace structure to adapt across different companies.

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       FI AI Mobile                          │
│                 React Native + TypeScript                   │
│                                                             │
│   ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│   │    Company     │  │   Workspace    │  │    Tasks     │ │
│   │    Research    │  │                │  │              │ │
│   │                │  │  Customizable  │  │  Research    │ │
│   │  Overview      │  │  research      │  │  workflows   │ │
│   │  News          │  │  modules       │  │              │ │
│   │  Financials    │  │                │  │              │ │
│   └────────────────┘  └────────────────┘  └──────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
│                                                             │
│       Expo Router · TanStack Query · Zustand                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│                                                             │
│                         SQLite                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────┐
              │    External Integrations    │
              │                             │
              │  Market · News · AI Data   │
              └─────────────────────────────┘
```

### Company-Centered Research

FI AI treats the **selected company as the active research context**.

Company information, financial data, news, notes, and research tools can therefore share the same interface structure while displaying stock-specific content.

This avoids building isolated research experiences for every company.

### Reusable Workspace Model

The Workspace separates the user's **research layout** from the **company data displayed inside it**.

```text
             Workspace Configuration
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
     Overview        News        Research
      Widget         Widget        Widget
        │             │             │
        └─────────────┼─────────────┘
                      │
              Selected Company
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
      NVDA          AAPL          MSFT
```

Users configure their preferred research modules once. When they switch companies, FI AI preserves the workspace structure while loading information relevant to the newly selected stock.

This allows the application to maintain a consistent research workflow without forcing every investor into a fixed dashboard.

### State & Persistence

Different types of application state are handled separately:

- **TanStack Query** manages asynchronous data operations and caching.
- **Zustand** manages lightweight client and interface state.
- **SQLite** provides persistent local storage for application data and user configuration.

Separating these responsibilities keeps temporary UI state, loaded research data, and persistent information from being managed as one global state.

### Extensibility

The modular structure allows FI AI to expand without redesigning the entire research interface.

New **research widgets, financial-data sources, news integrations, and AI capabilities** can be incorporated as the platform develops while preserving the same company-centered research model.

> The architecture continues to evolve alongside FI AI's financial-data and AI integrations.

---

## AI-Assisted Development

FI AI is also an experiment in **AI-assisted software engineering**.

I use Codex throughout the development process for:

- Prototyping
- Implementation
- Debugging
- Refactoring
- Testing
- Iteration

My role includes defining the product requirements, designing the user experience, specifying feature behavior, making architecture decisions, reviewing implementations, and validating the resulting application.

Rather than treating AI as a replacement for the development process, I use it as an engineering tool to shorten the cycle between:

**Idea → Specification → Implementation → Testing → Iteration**

This project has also given me experience designing requirements precise enough for an AI coding agent to reliably translate product ideas into working software.

---

## Project Status

FI AI is an **independent project under active development**.

The application currently serves as both a working mobile prototype and a platform for experimenting with investment research workflows, mobile architecture, and AI-assisted development.

Development continues around:

- Customizable research workspaces
- Research task workflows
- Financial and market-data integration
- AI-assisted research
- Additional company research modules
- UI/UX refinement

Some functionality described in this README represents features that are actively being developed and may not yet be production-ready.

---

## Roadmap

FI AI is continuing to evolve toward a more complete personalized investment research environment.

Future development will focus on deeper financial-data integration, expanded research modules, improved AI-assisted workflows, and continued refinement of the customizable workspace experience.

---

## Author

**Po-Hsien Yu**  
University of Washington  
Computer Science & Applied Mathematics

---

### FI AI

**From market noise to investment clarity.**
